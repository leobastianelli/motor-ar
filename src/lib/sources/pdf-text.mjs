// Texto de un PDF con la posición de cada fragmento, sin dependencias (sólo zlib). A diferencia de `pdfText` (actc-official.mjs, pensado
// para los PDF de Word de la ACTC, que guardan el texto casi tal cual), éste lee los PDF que genera el sistema de cronometraje de la
// ACTC / Nuevo Car Show (Ghostscript): fuentes con subconjunto de glifos, cuyo texto real sólo está en la tabla ToUnicode de cada fuente.
//
// Alcance a propósito acotado: fuentes simples de un byte por carácter con ToUnicode (bfchar / bfrange), operadores de texto habituales
// (BT, Tf, Tm, Td, TD, T*, TL, Tj, TJ, ', ") y la matriz de transformación (cm, q, Q). Todo lo que no se entiende se ignora: lo peor que
// puede pasar es que no salga texto, y el que llama trata un PDF sin texto como "ilegible" (no inventa filas).
import zlib from "node:zlib";

/** Objetos del PDF: número → { dict, stream (Buffer, descomprimido) }. Soporta objetos sueltos; no los comprimidos en ObjStm. */
function parseObjects(buf) {
  const raw = buf.toString("latin1");
  const objects = new Map();
  const re = /(\d+) \d+ obj\b/g;
  let m;
  while ((m = re.exec(raw))) {
    const num = Number(m[1]);
    const start = m.index + m[0].length;
    const end = raw.indexOf("endobj", start);
    if (end === -1) break;
    const body = raw.slice(start, end);
    const streamAt = body.indexOf("stream");
    const dict = streamAt === -1 ? body : body.slice(0, streamAt);
    let stream;
    if (streamAt !== -1) {
      let s = start + streamAt + 6;
      if (raw[s] === "\r") s++;
      if (raw[s] === "\n") s++;
      const e = raw.lastIndexOf("endstream", end);
      const bytes = buf.subarray(s, e === -1 ? end : e);
      try {
        stream = /FlateDecode/.test(dict) ? zlib.inflateSync(bytes) : bytes;
      } catch {
        stream = undefined;
      }
    }
    objects.set(num, { dict, stream });
    re.lastIndex = end + 6;
  }
  // Objetos comprimidos (ObjStm, Ghostscript 10): "N1 off1 N2 off2 …" y a continuación los objetos.
  for (const obj of [...objects.values()]) {
    if (!/\/Type\s*\/ObjStm/.test(obj.dict) || !obj.stream) continue;
    const count = Number(obj.dict.match(/\/N\s+(\d+)/)?.[1] ?? 0);
    const first = Number(obj.dict.match(/\/First\s+(\d+)/)?.[1] ?? 0);
    const body = obj.stream.toString("latin1");
    const pairs = (body.slice(0, first).match(/\d+/g) ?? []).map(Number);
    for (let i = 0; i < count; i++) {
      const at = first + pairs[2 * i + 1];
      const to = i + 1 < count ? first + pairs[2 * i + 3] : body.length;
      if (!objects.has(pairs[2 * i])) objects.set(pairs[2 * i], { dict: body.slice(at, to) });
    }
  }
  return objects;
}

const ref = (dict, key) => {
  const m = dict.match(new RegExp(`/${key}\\s+(\\d+) \\d+ R`));
  return m ? Number(m[1]) : null;
};

/** Tabla ToUnicode → Map(código → texto). */
function parseToUnicode(text) {
  const map = new Map();
  const hex = (h) => String.fromCodePoint(...(h.match(/.{4}/g) ?? []).map((x) => parseInt(x, 16)));
  for (const block of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, src, dst] of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) map.set(parseInt(src, 16), hex(dst.padStart(4, "0")));
  }
  for (const block of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    for (const [, a, b, dst] of block[1].matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) {
      const from = parseInt(a, 16);
      const to = parseInt(b, 16);
      const base = parseInt(dst, 16);
      for (let c = from; c <= to && c - from < 512; c++) map.set(c, String.fromCodePoint(base + c - from));
    }
  }
  return map;
}

/** Fuentes sin ToUnicode (PDF Creator Pilot): codificación WinAnsi, o sea Windows-1252. */
const WIN_ANSI = new Map(Array.from({ length: 224 }, (_, i) => [i + 32, new TextDecoder("windows-1252").decode(Uint8Array.of(i + 32))]));

/** Fuentes de una página: nombre ("R7") → mapa ToUnicode. */
function pageFonts(objects, pageDict) {
  const fonts = new Map();
  let fontDict = pageDict.match(/\/Font\s*<<([\s\S]*?)>>/)?.[1];
  if (!fontDict) {
    const n = ref(pageDict, "Font") ?? ref(pageDict.match(/\/Resources\s*(\d+ \d+ R)/)?.[1] ?? "", "Font");
    fontDict = n ? objects.get(n)?.dict : undefined;
  }
  for (const [, name, n] of (fontDict ?? "").matchAll(/\/(\S+?)\s+(\d+) \d+ R/g)) {
    const font = objects.get(Number(n));
    const uni = font ? ref(font.dict, "ToUnicode") : null;
    const stream = uni ? objects.get(uni)?.stream : null;
    fonts.set(name, stream ? parseToUnicode(stream.toString("latin1")) : WIN_ANSI);
  }
  return fonts;
}

/** Cadena literal PDF "(...)" desde la posición `i` (que apunta al paréntesis de apertura) → [bytes, posición siguiente]. */
function readLiteral(s, i) {
  const out = [];
  let depth = 1;
  i++;
  while (i < s.length && depth > 0) {
    const c = s[i];
    if (c === "\\") {
      const n = s[i + 1];
      if (/[0-7]/.test(n)) {
        const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0];
        out.push(parseInt(oct, 8) & 255);
        i += 1 + oct.length;
        continue;
      }
      const esc = { n: 10, r: 13, t: 9, b: 8, f: 12 }[n];
      if (n === "\n") {
        i += 2;
        continue;
      }
      out.push(esc ?? n.charCodeAt(0));
      i += 2;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")" && --depth === 0) break;
    out.push(s.charCodeAt(i) & 255);
    i++;
  }
  return [out, i + 1];
}

const mul = (m, n) => [
  m[0] * n[0] + m[1] * n[2],
  m[0] * n[1] + m[1] * n[3],
  m[2] * n[0] + m[3] * n[2],
  m[2] * n[1] + m[3] * n[3],
  m[4] * n[0] + m[5] * n[2] + n[4],
  m[4] * n[1] + m[5] * n[3] + n[5],
];

/** Tokens del contenido de una página: números, nombres, cadenas, arreglos y operadores. */
function* tokens(s) {
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c <= " ") {
      i++;
    } else if (c === "(") {
      const [bytes, next] = readLiteral(s, i);
      yield { t: "str", v: bytes };
      i = next;
    } else if (c === "[") {
      const items = [];
      i++;
      while (i < s.length && s[i] !== "]") {
        if (s[i] === "(") {
          const [bytes, next] = readLiteral(s, i);
          items.push(bytes);
          i = next;
        } else if (s[i] === "<" && s[i + 1] !== "<") {
          const end = s.indexOf(">", i);
          const h = s.slice(i + 1, end).replace(/\s/g, "");
          items.push((h.match(/../g) ?? []).map((x) => parseInt(x, 16)));
          i = end + 1;
        } else if (/[-+.\d]/.test(s[i])) {
          const m = s.slice(i).match(/^[-+]?\d*\.?\d+/);
          items.push(Number(m[0]));
          i += m[0].length;
        } else {
          i++;
        }
      }
      i++;
      yield { t: "arr", v: items };
    } else if (c === "<" && s[i + 1] === "<") {
      const end = s.indexOf(">>", i);
      i = end === -1 ? s.length : end + 2;
    } else if (c === "/") {
      const m = s.slice(i + 1).match(/^[^\s/[\]()<>]*/)[0];
      yield { t: "name", v: m };
      i += 1 + m.length;
    } else if (/[-+.\d]/.test(c)) {
      const m = s.slice(i).match(/^[-+]?\d*\.?\d*/)[0];
      yield { t: "num", v: Number(m) };
      i += Math.max(1, m.length);
    } else {
      const m = s.slice(i).match(/^[A-Za-z*'"]+/)?.[0];
      if (!m) {
        i++;
        continue;
      }
      yield { t: "op", v: m };
      i += m.length;
    }
  }
}

/**
 * Fragmentos de texto de un PDF: { page, x, y, size, text }, con (x, y) en puntos del origen de la página (y crece hacia arriba).
 * Un fragmento es lo que el PDF dibuja de una vez (una celda de la tabla, normalmente). Un salto grande dentro de un TJ separa palabras.
 */
export function pdfRuns(buf) {
  const objects = parseObjects(Buffer.from(buf));
  const runs = [];
  let pageNo = 0;
  for (const [, obj] of objects) {
    if (!/\/Type\s*\/Page\b(?!s)/.test(obj.dict) || !/\/Contents/.test(obj.dict)) continue;
    pageNo++;
    const fonts = pageFonts(objects, obj.dict);
    const contentRefs = [...(obj.dict.match(/\/Contents\s*(\[[^\]]*\]|\d+ \d+ R)/)?.[1] ?? "").matchAll(/(\d+) \d+ R/g)].map((m) => Number(m[1]));
    const content = contentRefs.map((n) => objects.get(n)?.stream?.toString("latin1") ?? "").join("\n");
    let ctm = [1, 0, 0, 1, 0, 0];
    const stack = [];
    let lm = [1, 0, 0, 1, 0, 0];
    let font = new Map();
    let size = 0;
    let leading = 0;
    let args = [];
    const emit = (items) => {
      let text = "";
      for (const it of items) {
        if (typeof it === "number") {
          if (it <= -250) text += " ";
          continue;
        }
        for (const code of it) text += font.get(code) ?? (code === 32 ? " " : "");
      }
      text = text.replace(/\s+/g, " ").trim();
      if (!text) return;
      const m = mul(lm, ctm);
      runs.push({ page: pageNo, x: Math.round(m[4] * 100) / 100, y: Math.round(m[5] * 100) / 100, size: Math.round(size * Math.hypot(m[2], m[3]) * 100) / 100, text });
    };
    const nextLine = () => {
      lm = mul([1, 0, 0, 1, 0, -leading], lm);
    };
    for (const tk of tokens(content)) {
      if (tk.t !== "op") {
        args.push(tk);
        continue;
      }
      const nums = args.filter((a) => a.t === "num").map((a) => a.v);
      switch (tk.v) {
        case "q":
          stack.push(ctm);
          break;
        case "Q":
          ctm = stack.pop() ?? ctm;
          break;
        case "cm":
          if (nums.length === 6) ctm = mul(nums, ctm);
          break;
        case "BT":
          lm = [1, 0, 0, 1, 0, 0];
          break;
        case "Tf": {
          const name = args.find((a) => a.t === "name")?.v;
          font = fonts.get(name) ?? new Map();
          size = nums.at(-1) ?? size;
          break;
        }
        case "TL":
          leading = nums[0] ?? leading;
          break;
        case "Tm":
          if (nums.length === 6) lm = nums;
          break;
        case "Td":
          if (nums.length === 2) lm = mul([1, 0, 0, 1, nums[0], nums[1]], lm);
          break;
        case "TD":
          if (nums.length === 2) {
            leading = -nums[1];
            lm = mul([1, 0, 0, 1, nums[0], nums[1]], lm);
          }
          break;
        case "T*":
          nextLine();
          break;
        case "Tj":
          emit([args.find((a) => a.t === "str")?.v ?? []]);
          break;
        case "TJ":
          emit(args.find((a) => a.t === "arr")?.v ?? []);
          break;
        case "'":
          nextLine();
          emit([args.find((a) => a.t === "str")?.v ?? []]);
          break;
        case '"':
          nextLine();
          emit([args.find((a) => a.t === "str")?.v ?? []]);
          break;
        default:
      }
      args = [];
    }
  }
  return runs;
}

/**
 * Líneas de texto: los fragmentos con casi la misma altura (`tolerance` puntos) se juntan, de izquierda a derecha, y las líneas van de
 * arriba hacia abajo. Cada línea conserva sus fragmentos con la posición (para leer tablas por columna).
 */
export function pdfLines(buf, { tolerance = 2 } = {}) {
  const runs = pdfRuns(buf).sort((a, b) => a.page - b.page || b.y - a.y || a.x - b.x);
  const lines = [];
  for (const r of runs) {
    const last = lines.at(-1);
    if (last && last.page === r.page && Math.abs(last.y - r.y) <= tolerance) last.runs.push(r);
    else lines.push({ page: r.page, y: r.y, runs: [r] });
  }
  for (const l of lines) l.runs.sort((a, b) => a.x - b.x);
  return lines;
}
