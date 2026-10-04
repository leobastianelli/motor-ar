/**
 * Id de una sesión: `<fecha>-<tipo>-<nombre sin acentos ni separadores>`, p. ej. "tcp-2026-12-clasificacion-clasificacion" o "tc-2026-12-serie-serie1".
 * Lo usan el cronograma y el cronometraje de la ACTC: la misma sesión sale con el mismo id venga de donde venga.
 * (Antes el cronograma usaba `\W`, que borra las letras con tilde: "Clasificación" quedaba "clasificacin".)
 */
export function sessionId(eventId, kind, name) {
  const folded = String(name).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return `${eventId}-${kind}-${folded.replace(/[^a-z0-9]+/g, "")}`;
}
