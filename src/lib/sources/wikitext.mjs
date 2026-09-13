// Lectura mínima de wikitext de Wikipedia: secciones, tablas (con rowspan/colspan) y limpieza de marcado.

const EMPTY_TEMPLATES = new Set([
  "bandera",
  "flagicon",
  "flagicon image",
  "color box",
  "efn",
  "refn",
  "notelist",
  "n/a",
  "sfn",
  "cn",
  "citation needed",
  "reflist",
  "clear",
]);

function expandTemplate(inner) {
  const parts = inner.split("|").map((p) => p.trim());
  const name = parts[0].toLowerCase();
  const args = parts.slice(1).filter((a) => !/^[a-z_ -]+=/i.test(a));
  if (EMPTY_TEMPLATES.has(name)) return "";
  switch (name) {
    case "fecha": {
      const [d, m, y] = args;
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    case "sortname":
      return `${args[0]} ${args[1]}`;
    case "tooltip":
    case "abbr":
    case "abreviatura":
    case "small":
    case "nowrap":
    case "nobr":
      return args[0] ?? "";
    case "sort":
      return args[1] ?? args[0] ?? "";
    case "f1":
    case "f2":
    case "fiaf3":
      return args[0] ?? "";
    default:
      return "";
  }
}

/** Convierte wikitext en texto plano. */
export function clean(raw) {
  let s = String(raw);
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<ref[^>]*\/>/gi, "").replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  s = s.replace(/<sup[^>]*>[\s\S]*?<\/sup>/gi, "").replace(/<span[^>]*>[\s\S]*?<\/span>/gi, "");
  s = s.replace(/\[\[(?:Archivo|File|Imagen|Image):[^\]]*\]\]/gi, "");
  s = s.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1");
  let prev;
  do {
    prev = s;
    s = s.replace(/\{\{([^{}]*)\}\}/g, (_, inner) => expandTemplate(inner));
  } while (s !== prev);
  s = s.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, "$1");
  s = s.replace(/'{2,}/g, "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
  return s.replace(/\s+/g, " ").trim();
}

/** Texto de una sección (hasta el próximo título de igual o mayor nivel). */
export function section(text, title) {
  const lines = text.split("\n");
  const heading = (line) => line.match(/^(=+)\s*(.+?)\s*\1\s*$/);
  const start = lines.findIndex((l) => heading(l)?.[2].toLowerCase() === title.toLowerCase());
  if (start === -1) throw new Error(`Sección no encontrada: ${title}`);
  const level = heading(lines[start])[1].length;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    const h = heading(lines[i]);
    if (h && h[1].length <= level) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function splitTop(str, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (let i = 0; i < str.length; i++) {
    const two = str.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      cur += two;
      i++;
    } else if (two === "}}" || two === "]]") {
      depth = Math.max(0, depth - 1);
      cur += two;
      i++;
    } else if (depth === 0 && two === sep) {
      out.push(cur);
      cur = "";
      i++;
    } else {
      cur += str[i];
    }
  }
  out.push(cur);
  return out;
}

const ATTR = /^\s*(?:[a-z-]+\s*=|.*\b(?:style|rowspan|colspan|align|class|scope|nowrap|width|valign)\b)/i;

function splitAttrs(cell) {
  let depth = 0;
  for (let i = 0; i < cell.length; i++) {
    const two = cell.slice(i, i + 2);
    if (two === "{{" || two === "[[") {
      depth++;
      i++;
    } else if (two === "}}" || two === "]]") {
      depth = Math.max(0, depth - 1);
      i++;
    } else if (depth === 0 && cell[i] === "|") {
      const left = cell.slice(0, i);
      return ATTR.test(left) && !/\[\[|\{\{/.test(left) ? { attrs: left, content: cell.slice(i + 1) } : { attrs: "", content: cell };
    }
  }
  return { attrs: "", content: cell };
}

function finishRow(t) {
  if (!t.current?.length) {
    t.current = null;
    return;
  }
  const out = [];
  let col = 0;
  const takePending = () => {
    while (t.pending[col]?.remaining > 0) {
      out.push(t.pending[col].cell);
      t.pending[col].remaining--;
      col++;
    }
  };
  for (const c of t.current) {
    takePending();
    for (let k = 0; k < c.colspan; k++) {
      const cell = { text: clean(c.raw), raw: c.raw, header: c.header };
      out.push(cell);
      if (c.rowspan > 1) t.pending[col] = { cell, remaining: c.rowspan - 1 };
      col++;
    }
  }
  takePending();
  t.rows.push({ cells: out });
  t.current = null;
}

/** Todas las tablas del texto, incluidas las anidadas, con filas ya expandidas. */
export function tables(text) {
  const result = [];
  const stack = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trimStart();
    if (line.startsWith("{|")) {
      stack.push({ caption: "", rows: [], current: null, pending: [], lastCell: null });
      continue;
    }
    const t = stack.at(-1);
    if (!t) continue;
    if (line.startsWith("|}")) {
      finishRow(t);
      stack.pop();
      result.push({ caption: t.caption, rows: t.rows });
      continue;
    }
    if (line.startsWith("|+")) {
      t.caption = clean(line.slice(2));
      continue;
    }
    if (line.startsWith("|-")) {
      finishRow(t);
      continue;
    }
    if (line.startsWith("!") || line.startsWith("|")) {
      t.current ??= [];
      const header = line.startsWith("!");
      const body = line.slice(1);
      const parts = header ? splitTop(body, "!!").flatMap((p) => splitTop(p, "||")) : splitTop(body, "||");
      for (const part of parts) {
        const { attrs, content } = splitAttrs(part);
        const cell = {
          raw: content,
          header,
          rowspan: Number(attrs.match(/rowspan\s*=\s*"?(\d+)/i)?.[1] ?? 1),
          colspan: Number(attrs.match(/colspan\s*=\s*"?(\d+)/i)?.[1] ?? 1),
        };
        t.current.push(cell);
        t.lastCell = cell;
      }
      continue;
    }
    if (t.lastCell && t.current) t.lastCell.raw += `\n${rawLine}`;
  }
  return result;
}

export const texts = (row) => row.cells.map((c) => c.text);
export const intOf = (s) => {
  const m = String(s ?? "").match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
};
export const biggest = (list) => [...list].sort((a, b) => b.rows.length - a.rows.length)[0];
export const flagOf = (raw) => raw.match(/flagicon\|([A-Z]{2,3})/i)?.[1]?.toUpperCase() ?? null;
