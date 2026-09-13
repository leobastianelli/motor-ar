// Páginas de Wikipedia usadas por las fuentes de temporada y el archivo histórico.
export const WIKI_PAGES = {
  "es-tc": ["es", "Turismo_Carretera"],
  "es-tc2000": ["es", "Turismo_Competición_2000"],
  "es-tn": ["es", "Turismo_Nacional"],
  "es-tc-2026": ["es", "Anexo:Temporada_2026_de_Turismo_Carretera"],
  "es-tc2000-2026": ["es", "Anexo:Temporada_2026_de_TC2000"],
  "en-f2": ["en", "FIA_Formula_2_Championship"],
  "en-f2-2026": ["en", "2026_Formula_2_Championship"],
};

export function wikiRawUrl(key) {
  const page = WIKI_PAGES[key];
  if (!page) throw new Error(`Página de Wikipedia desconocida: ${key}`);
  return `https://${page[0]}.wikipedia.org/w/index.php?title=${encodeURIComponent(page[1])}&action=raw`;
}
