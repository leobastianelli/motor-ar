// Arma un PDF mínimo con fragmentos de texto en posiciones dadas, para probar la lectura de planillas sin guardar PDF reales (pesan ~150 KB
// por los logos y las fuentes). Imita lo que escribe cada generador de las planillas del Nuevo Car Show:
//   · "gs9"  — Ghostscript 9: objetos sueltos, fuente de un byte con tabla ToUnicode (los glifos van numerados, no en ASCII);
//   · "gs10" — Ghostscript 10: igual pero los diccionarios van dentro de un ObjStm comprimido;
//   · "creator" — PDF Creator Pilot (fecha 1): fuente WinAnsi sin ToUnicode, contenido sin comprimir.
import zlib from "node:zlib";

const esc = (s) => s.replace(/[\\()]/g, (c) => `\\${c}`);

/** @param lines [{ y, runs: [{ x, size, text }] }]  @param mode "gs9" | "gs10" | "creator" */
export function buildPdf(lines, mode = "gs9") {
  const runs = lines.flatMap((l) => l.runs.map((r) => ({ ...r, y: l.y })));
  const winAnsi = mode === "creator";
  const chars = [...new Set(runs.flatMap((r) => [...r.text]))];
  const code = winAnsi ? (c) => Buffer.from(c, "latin1")[0] : (c) => chars.indexOf(c) + 1;
  const content = runs
    .map((r) => {
      const bytes = [...r.text].map((c) => String.fromCharCode(code(c))).join("");
      return `BT /F1 ${r.size} Tf 1 0 0 1 ${r.x} ${r.y} Tm [(${esc(bytes)})]TJ ET`;
    })
    .join("\n");
  const cmap = `/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n1 begincodespacerange\n<00><ff>\nendcodespacerange\n${chars.length} beginbfchar\n${chars
    .map((c, i) => `<${(i + 1).toString(16).padStart(2, "0")}> <${c.codePointAt(0).toString(16).padStart(4, "0")}>`)
    .join("\n")}\nendbfchar\nendcmap\nend end`;

  const fontDict = winAnsi ? "<< /Type /Font /Subtype /TrueType /BaseFont /Tahoma /Encoding /WinAnsiEncoding >>" : "<< /Type /Font /Subtype /TrueType /BaseFont /ABCDEF+Tahoma /ToUnicode 6 0 R >>";
  const dicts = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    5: fontDict,
  };
  const comprimir = mode !== "creator";
  const stream = (s) => (comprimir ? zlib.deflateSync(Buffer.from(s, "latin1")) : Buffer.from(s, "latin1"));
  const sd = (len) => `<< ${comprimir ? "/Filter /FlateDecode " : ""}/Length ${len} >>`;
  const body = [];
  const emit = (num, dict, data) => {
    body.push(Buffer.from(`${num} 0 obj\n${dict}\n`, "latin1"));
    if (data) body.push(Buffer.from("stream\n", "latin1"), data, Buffer.from("\nendstream\n", "latin1"));
    body.push(Buffer.from("endobj\n", "latin1"));
  };
  if (mode === "gs10") {
    // Los diccionarios 1, 2, 3 y 5 viajan dentro del objeto 7 (ObjStm).
    const nums = [1, 2, 3, 5];
    let offset = 0;
    const header = [];
    const parts = [];
    for (const n of nums) {
      header.push(`${n} ${offset}`);
      parts.push(dicts[n]);
      offset += dicts[n].length + 1;
    }
    const head = `${header.join(" ")}\n`;
    const data = zlib.deflateSync(Buffer.from(head + parts.join("\n"), "latin1"));
    emit(7, `<< /Type /ObjStm /N ${nums.length} /First ${head.length} /Filter /FlateDecode /Length ${data.length} >>`, data);
  } else {
    for (const n of [1, 2, 3, 5]) emit(n, dicts[n]);
  }
  const c = stream(content);
  emit(4, sd(c.length), c);
  if (!winAnsi) {
    const u = stream(cmap);
    emit(6, sd(u.length), u);
  }
  return Buffer.concat([Buffer.from("%PDF-1.7\n", "latin1"), ...body, Buffer.from("%%EOF\n", "latin1")]);
}
