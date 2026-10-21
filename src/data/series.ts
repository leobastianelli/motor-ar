import { CLASES } from "../lib/sources/cordoba-pista-clases.mjs";
import { CLASES as CLASES_RALLY } from "../lib/sources/rally-argentino-clases.mjs";
import { CLASES as CLASES_NCS } from "../lib/sources/nuevo-car-show-clases.mjs";
import type { Series } from "@/lib/types";

// Identidad propia por categoría: código corto + color. Nunca logos oficiales.
// Paleta: F1 en rojo; F2 y TC en azul profundo, TN en ocre, GT en violeta, zonales en verde.
export const series: Series[] = [
  { id: "f1", name: "Fórmula 1", short: "F1", code: "F1", org: "FIA", orgUrl: "https://www.fia.com", scope: "internacional", color: "#dc3e25", founded: 1950 },
  { id: "f2", name: "Fórmula 2", short: "F2", code: "F2", org: "FIA", orgUrl: "https://www.fia.com", scope: "internacional", color: "#16658f", founded: 2017 },
  { id: "tc", name: "Turismo Carretera", short: "TC", code: "TC", org: "ACTC", orgUrl: "https://actc.org.ar", scope: "nacional", color: "#16658f", founded: 1937 },
  { id: "tc-pista", name: "TC Pista", short: "TC Pista", code: "TCP", org: "ACTC", orgUrl: "https://actc.org.ar", scope: "nacional", color: "#16658f" },
  { id: "tc-mouras", name: "TC Mouras", short: "TC Mouras", code: "TCM", org: "ACTC", orgUrl: "https://actc.org.ar", scope: "nacional", color: "#0e7c7b" },
  { id: "tc-pista-mouras", name: "TC Pista Mouras", short: "TCP Mouras", code: "TCPM", org: "ACTC", orgUrl: "https://actc.org.ar", scope: "nacional", color: "#0e7c7b" },
  { id: "tc-pick-up", name: "TC Pick Up", short: "TC Pick Up", code: "TCPK", org: "ACTC", orgUrl: "https://actc.org.ar", scope: "nacional", color: "#4f6d7a" },
  { id: "tc-pista-pick-up", name: "TC Pista Pick Up", short: "TCP Pick Up", code: "TCPPK", org: "ACTC", orgUrl: "https://actc.org.ar", scope: "nacional", color: "#4f6d7a" },
  { id: "tc2000", name: "TC2000", short: "TC2000", code: "TC2K", org: "CDA del ACA", orgUrl: "https://www.tc2000.com.ar", scope: "nacional", color: "#101213", founded: 1979 },
  { id: "tn", name: "TN APAT", short: "TN", code: "TN", org: "APAT", orgUrl: "https://apat.org.ar", scope: "nacional", color: "#b47805", founded: 1961 },
  { id: "gt3", name: "GT World Challenge Europe", short: "GTWC", code: "GT3", org: "SRO", orgUrl: "https://www.gt-world-challenge-europe.com", scope: "internacional", color: "#6b3d83", founded: 2011 },
  { id: "tcr-sa", name: "TCR South America", short: "TCR SA", code: "TCR", org: "TCR South America", orgUrl: "https://southamerica.tcr-series.com", scope: "internacional", color: "#4338ca", founded: 2021 },
  // Fórmula 2 Argentina (ACTC): no es la F2 de la FIA (`f2`). Verde oliva, que no usa ninguna otra categoría nacional.
  { id: "f2-arg", name: "Fórmula 2 Argentina", short: "F2 Arg", code: "F2A", org: "ACTC", orgUrl: "https://formula2.com.ar", scope: "nacional", color: "#3b6d11" },
  // Sin fuente automática todavía (ver docs/fuentes-de-datos.md): calendario, horarios y resultados quedan
  // "sin datos" hasta que exista un adaptador, igual que Procar4000.
  { id: "wec", name: "FIA WEC", short: "WEC", code: "WEC", org: "FIA/ACO", orgUrl: "https://www.fiawec.com", scope: "internacional", color: "#8a3f1f", founded: 2012 },
  { id: "imsa", name: "IMSA WeatherTech SportsCar Championship", short: "IMSA", code: "IMSA", org: "IMSA", orgUrl: "https://www.imsa.com", scope: "internacional", color: "#a3202f", founded: 1969, partialResults: "Por ahora sólo cargamos el Petit Le Mans (10 Horas de Atlanta), donde corre Nico Varrone: el resto de la temporada no está en Fierros." },
  { id: "f3", name: "FIA Fórmula 3", short: "F3", code: "F3", org: "FIA", orgUrl: "https://www.fiaformula3.com", scope: "internacional", color: "#4a6fa5", founded: 2019 },
  { id: "f4-italia", name: "Fórmula 4 Italiana", short: "F4 Italia", code: "F4I", org: "ACI Sport", orgUrl: "https://www.acisport.it/en/f4/home", scope: "internacional", color: "#7a8f3c", founded: 2014 },
  { id: "ligier-jfc", name: "Ligier JFC Junior Formula Championship", short: "Ligier JFC", code: "JFC", org: "Parella Motorsports Holdings", orgUrl: "https://ligierjuniorformulachampionship.com", scope: "internacional", color: "#b3285a", founded: 2024, partialResults: "Por ahora sólo cargamos las carreras del fin de semana de VIR: el resto de la temporada todavía no tiene resultados en Fierros." },
  // Córdoba Pista: una categoría con siete clases (src/lib/sources/cordoba-pista-clases.mjs). La organiza APICER y la fiscaliza la FRAD.
  { id: "cordoba-pista", name: "Córdoba Pista", short: "Córdoba Pista", code: "CP", org: "APICER", orgUrl: "https://cordobapista.com", scope: "zonal", color: "#287e58", classes: CLASES },
  // Rally Argentino: campeonato de la CDA del ACA que dirige la Asociación Civil Rally Argentino (ACRA, según rallyargentino.com/acerca-de.php); siete clases.
  { id: "rally-argentino", name: "Rally Argentino", short: "Rally Arg", code: "RA", org: "ACRA (CDA del ACA)", orgUrl: "https://www.rallyargentino.com", scope: "nacional", color: "#b0510e", classes: CLASES_RALLY },
  // Nuevo Car Show: una categoría con cinco clases (src/lib/sources/nuevo-car-show-clases.mjs). Lo organiza el Club de Automóviles de Pista Santa Fe (ACAPSFE).
  { id: "nuevo-car-show", name: "Nuevo Car Show", short: "Car Show", code: "NCS", org: "ACAPSFE", orgUrl: "https://nuevocarshow.com.ar", scope: "nacional", color: "#a21caf", classes: CLASES_NCS },
  // Sin sitio oficial propio verificado: se deja sin orgUrl en vez de inventar uno.
  { id: "zonal-bsas", name: "Procar4000", short: "Procar", code: "ZL", org: "Zonal", scope: "zonal", color: "#287e58" },
];

export const seriesById = Object.fromEntries(series.map((s) => [s.id, s]));
