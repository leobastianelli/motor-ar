import type { Series } from "@/lib/types";

export const series: Series[] = [
  { id: "f1", name: "Fórmula 1", short: "F1", org: "FIA", scope: "internacional", color: "#E8002D" },
  { id: "f2", name: "Fórmula 2", short: "F2", org: "FIA", scope: "internacional", color: "#0090D0" },
  { id: "tc", name: "Turismo Carretera", short: "TC", org: "ACTC", scope: "nacional", color: "#F2B705" },
  { id: "tc-pista", name: "TC Pista", short: "TCP", org: "ACTC", scope: "nacional", color: "#D98E04" },
  { id: "tc2000", name: "TC2000", short: "TC2000", org: "CDA", scope: "nacional", color: "#2BB673" },
  { id: "tn", name: "Turismo Nacional", short: "TN", org: "CDA", scope: "nacional", color: "#7B61FF" },
  { id: "indycar", name: "IndyCar", short: "Indy", org: "IndyCar", scope: "internacional", color: "#9AA5B1" },
  { id: "nascar", name: "NASCAR Cup", short: "NASCAR", org: "NASCAR", scope: "internacional", color: "#FF6B35" },
  { id: "gt3", name: "GT World Challenge", short: "GT3", org: "SRO", scope: "internacional", color: "#C9A227" },
  { id: "zonal-bsas", name: "Procar4000", short: "Procar", org: "Zonal", scope: "zonal", color: "#6CB4EE" },
];

export const seriesById = Object.fromEntries(series.map((s) => [s.id, s]));
