import type { Series } from "@/lib/types";

// Identidad propia por categoría: código corto + color. Nunca logos oficiales.
// Paleta: F1 en rojo; F2 y TC en azul profundo, TN en ocre, GT en violeta, zonales en verde.
export const series: Series[] = [
  { id: "f1", name: "Fórmula 1", short: "F1", code: "F1", org: "FIA", scope: "internacional", color: "#dc3e25", founded: 1950 },
  { id: "f2", name: "Fórmula 2", short: "F2", code: "F2", org: "FIA", scope: "internacional", color: "#16658f", founded: 2017 },
  { id: "tc", name: "Turismo Carretera", short: "TC", code: "TC", org: "ACTC", scope: "nacional", color: "#16658f", founded: 1937 },
  { id: "tc-pista", name: "TC Pista", short: "TC Pista", code: "TCP", org: "ACTC", scope: "nacional", color: "#16658f" },
  { id: "tc-mouras", name: "TC Mouras", short: "TC Mouras", code: "TCM", org: "ACTC", scope: "nacional", color: "#0e7c7b" },
  { id: "tc-pista-mouras", name: "TC Pista Mouras", short: "TCP Mouras", code: "TCPM", org: "ACTC", scope: "nacional", color: "#0e7c7b" },
  { id: "tc-pick-up", name: "TC Pick Up", short: "TC Pick Up", code: "TCPK", org: "ACTC", scope: "nacional", color: "#4f6d7a" },
  { id: "tc-pista-pick-up", name: "TC Pista Pick Up", short: "TCP Pick Up", code: "TCPPK", org: "ACTC", scope: "nacional", color: "#4f6d7a" },
  { id: "tc2000", name: "TC2000", short: "TC2000", code: "T2K", org: "CDA del ACA", scope: "nacional", color: "#101213", founded: 1979 },
  { id: "tn", name: "TN APAT", short: "TN", code: "TN", org: "APAT", scope: "nacional", color: "#b47805", founded: 1961 },
  { id: "gt3", name: "GT World Challenge Europe", short: "GTWC", code: "GT3", org: "SRO", scope: "internacional", color: "#6b3d83", founded: 2011 },
  { id: "zonal-bsas", name: "Procar4000", short: "Procar", code: "ZL", org: "Zonal", scope: "zonal", color: "#287e58" },
];

export const seriesById = Object.fromEntries(series.map((s) => [s.id, s]));
