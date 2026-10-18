"use client";

import { useEffect, useId, useRef, useState } from "react";
import { trackEvent } from "@/lib/analytics";
import { buscar, rachaVigente, registrarResultado, textoCompartir } from "@/lib/juego/cliente.mjs";
import { FALLOS_PARA_PISTA, JUEGO_NOMBRE, MAX_INTENTOS } from "@/lib/juego/config.mjs";
import { dia, sumarDias } from "@/lib/juego/dia.mjs";

const ATRIBUTOS = ["nacio", "provincia", "categorias", "titulos", "corre2026"] as const; // mismo orden que ATRIBUTOS en comparar.mjs
type Estado = "verde" | "amarillo" | "gris";
type Comparacion = Record<(typeof ATRIBUTOS)[number], { estado: Estado; flecha: "arriba" | "abajo" | null }>;
interface Fila {
  slug: string;
  nombre: string;
  nacio: number;
  provincia: string;
  categorias: string[];
  titulos: number;
  corre2026: boolean;
  acerto: boolean;
  comparacion: Comparacion;
}
interface Pista {
  n: number;
  texto: string;
  fuente: string;
}
interface PilotoFinal {
  slug: string;
  nombre: string;
  nacio: number;
  provincia: string;
  categorias: string[];
  titulos: number;
  corre2026: boolean;
  fuentes: { wikidata?: string; wikipedia?: string; campeones?: string[] };
}
interface Partida {
  fecha: string;
  numero: number;
  filas: Fila[];
  pistas: Pista[];
  respuesta: PilotoFinal | null;
  contada: boolean;
}
export interface PilotoLista {
  slug: string;
  nombre: string;
}

const CLAVE_PARTIDA = "fierros-juego-partida";
const CLAVE_STATS = "fierros-juego-stats";

// Todo el almacenamiento del navegador va con try/catch: si falla (modo privado, bloqueado), el juego anda igual, sólo que no recuerda nada.
function leer<T>(clave: string): T | null {
  try {
    const v = window.localStorage.getItem(clave);
    return v ? (JSON.parse(v) as T) : null;
  } catch {
    return null;
  }
}
function guardar(clave: string, valor: unknown) {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // No se guarda, pero se sigue jugando.
  }
}

async function pedir<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    const e = (await r.json().catch(() => null)) as { error?: string } | null;
    throw new Error(e?.error ?? `Error ${r.status}`);
  }
  return (await r.json()) as T;
}

const terminada = (p: Partida) => p.filas.some((f) => f.acerto) || p.filas.length >= MAX_INTENTOS;
const fallos = (p: Partida) => p.filas.filter((f) => !f.acerto);

/** Pide lo que le falta a la partida: las pistas que ya corresponden y, si terminó, el piloto del día. */
async function completar(p: Partida): Promise<Partida> {
  let sig = p;
  const falladosSlugs = fallos(p).map((f) => f.slug).join(",");
  if (!terminada(p)) {
    for (const n of [1, 2]) {
      if (fallos(p).length >= FALLOS_PARA_PISTA[n - 1] && !sig.pistas.some((x) => x.n === n)) {
        const r = await pedir<Pista>(`/api/juego/pista?fecha=${p.fecha}&n=${n}&fallados=${falladosSlugs}`);
        sig = { ...sig, pistas: [...sig.pistas, { n, texto: r.texto, fuente: r.fuente }] };
      }
    }
  } else if (!sig.respuesta) {
    const r = await pedir<{ piloto: PilotoFinal }>(`/api/juego/respuesta?fecha=${p.fecha}&intentos=${p.filas.map((f) => f.slug).join(",")}`);
    sig = { ...sig, respuesta: r.piloto };
  }
  return sig;
}

const ETIQUETAS: Record<(typeof ATRIBUTOS)[number], string> = { nacio: "Nació", provincia: "Provincia", categorias: "Categorías", titulos: "Títulos", corre2026: "Corre 2026" };
const MARCAS: Record<Estado, string> = { verde: "✓", amarillo: "~", gris: "✗" };
const EXPLICACION: Record<Estado, string> = { verde: "coincide", amarillo: "cerca", gris: "no coincide" };

function valor(f: Fila, a: (typeof ATRIBUTOS)[number]): string {
  if (a === "categorias") return f.categorias.join(", ") || "Ninguna";
  if (a === "corre2026") return f.corre2026 ? "Sí" : "No";
  return String(f[a]);
}

/** "https://es.wikipedia.org/wiki/Turismo_Carretera" → "Campeones de Turismo Carretera". */
function nombreFuente(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("wikipedia.org")) return `Campeones de ${decodeURIComponent(u.pathname.split("/").pop() ?? "").replace(/_/g, " ")}`;
    if (u.hostname.includes("jolpi")) return "Campeones de Fórmula 1";
    return `Campeones (${u.hostname})`;
  } catch {
    return "Campeones";
  }
}

function textoFlecha(a: (typeof ATRIBUTOS)[number], flecha: "arriba" | "abajo"): string {
  if (a === "nacio") return flecha === "arriba" ? "el piloto del día nació después" : "el piloto del día nació antes";
  return flecha === "arriba" ? "el piloto del día tiene más" : "el piloto del día tiene menos";
}

function Buscador({ pilotos, usados, deshabilitado, onElegir }: { pilotos: PilotoLista[]; usados: string[]; deshabilitado: boolean; onElegir: (slug: string) => void }) {
  const id = useId();
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const opciones = buscar(pilotos, texto, usados) as PilotoLista[];
  const visible = abierto && opciones.length > 0;
  const idOpcion = (i: number) => `${id}-op-${i}`;

  const elegir = (slug: string) => {
    onElegir(slug);
    setTexto("");
    setAbierto(false);
    setActivo(0);
    inputRef.current?.focus();
  };
  const enviar = () => {
    const o = opciones[Math.min(activo, opciones.length - 1)];
    if (o) elegir(o.slug);
  };

  return (
    <form
      className="jg-form"
      onSubmit={(e) => {
        e.preventDefault();
        enviar();
      }}
    >
      <label className="jg-sr" htmlFor={`${id}-in`}>
        Nombre del piloto
      </label>
      <input
        id={`${id}-in`}
        ref={inputRef}
        className="jg-input"
        type="text"
        role="combobox"
        aria-expanded={visible}
        aria-controls={`${id}-lista`}
        aria-autocomplete="list"
        aria-activedescendant={visible ? idOpcion(activo) : undefined}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Escribí un apellido"
        disabled={deshabilitado}
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setAbierto(true);
          setActivo(0);
        }}
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && opciones.length) {
            e.preventDefault();
            setAbierto(true);
            setActivo((a) => (a + 1) % opciones.length);
          } else if (e.key === "ArrowUp" && opciones.length) {
            e.preventDefault();
            setAbierto(true);
            setActivo((a) => (a - 1 + opciones.length) % opciones.length);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
      />
      <button type="submit" className="jg-boton" disabled={deshabilitado || opciones.length === 0}>
        Probar
      </button>
      <ul id={`${id}-lista`} role="listbox" aria-label="Pilotos" className="jg-lista" hidden={!visible}>
        {opciones.map((o, i) => (
          <li
            key={o.slug}
            id={idOpcion(i)}
            role="option"
            aria-selected={i === activo}
            className="jg-opcion"
            // mousedown y no click: el input pierde el foco (y cierra la lista) antes de que llegue el click.
            onMouseDown={(e) => {
              e.preventDefault();
              elegir(o.slug);
            }}
          >
            {o.nombre}
          </li>
        ))}
      </ul>
      <p className="jg-sr" role="status" aria-live="polite">
        {visible ? `${opciones.length} pilotos. Usá las flechas para elegir.` : ""}
      </p>
    </form>
  );
}

function Fin({ partida, hoyJuego }: { partida: Partida; hoyJuego: boolean }) {
  const [aviso, setAviso] = useState("");
  const gano = partida.filas.some((f) => f.acerto);
  const p = partida.respuesta;

  async function compartir() {
    const texto = textoCompartir({ numero: partida.numero, acerto: gano, comparaciones: partida.filas.map((f) => f.comparacion) });
    trackEvent("juego_compartir", { numero: partida.numero, acerto: gano });
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: texto });
        return;
      }
      await navigator.clipboard.writeText(texto);
      setAviso("Resultado copiado. Pegalo donde quieras.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // Cerró el menú de compartir.
      setAviso("No pudimos copiarlo. Sacale una captura a la grilla.");
    }
  }

  return (
    <section className={`jg-final ${gano ? "gano" : ""}`} aria-labelledby="jg-final-t">
      <h2 id="jg-final-t">{gano ? `¡Lo sacaste en ${partida.filas.length}!` : "Se acabaron los intentos"}</h2>
      {p ? (
        <>
          <p>
            {gano ? "Era" : "El piloto de hoy era"} <strong>{p.nombre}</strong>.
          </p>
          <dl>
            <dt>Nació</dt>
            <dd>{p.nacio}, {p.provincia}</dd>
            <dt>Categorías</dt>
            <dd>{p.categorias.join(", ") || "Ninguna"}</dd>
            <dt>Títulos</dt>
            <dd>{p.titulos}</dd>
            <dt>Corre en 2026</dt>
            <dd>{p.corre2026 ? "Sí" : "No"}</dd>
          </dl>
          <p className="jg-fuentes">
            {p.fuentes.wikipedia && <a href={p.fuentes.wikipedia} target="_blank" rel="noreferrer">Wikipedia</a>}
            {p.fuentes.wikidata && <a href={p.fuentes.wikidata} target="_blank" rel="noreferrer">Wikidata</a>}
            {(p.fuentes.campeones ?? []).map((u) => (
              <a key={u} href={u} target="_blank" rel="noreferrer">
                {nombreFuente(u)}
              </a>
            ))}
          </p>
        </>
      ) : (
        <p>Estamos buscando al piloto del día…</p>
      )}
      <div className="jg-acciones">
        <button type="button" className="jg-boton" onClick={compartir}>
          Compartir
        </button>
        <span role="status" aria-live="polite">{aviso}</span>
      </div>
      {hoyJuego && <p style={{ marginTop: 12 }}>El próximo juego empieza a las 00:00, hora argentina.</p>}
    </section>
  );
}

export function Juego({ pilotos, inicio, hayBase }: { pilotos: PilotoLista[]; inicio: string; hayBase: boolean }) {
  const [listo, setListo] = useState(false);
  const [hoy, setHoy] = useState({ fecha: "", numero: 0 });
  const [partida, setPartida] = useState<Partida | null>(null);
  const [stats, setStats] = useState<ReturnType<typeof registrarResultado> | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const h = dia(new Date(), inicio);
    const guardada = leer<Partida>(CLAVE_PARTIDA);
    const vigente = guardada && guardada.fecha === h.fecha && Array.isArray(guardada.filas) ? guardada : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- el navegador es la única fuente del día y del progreso guardado; no se puede leer en el servidor
    setHoy(h);
    setPartida(vigente ?? { fecha: h.fecha, numero: h.numero, filas: [], pistas: [], respuesta: null, contada: false });
    setStats(leer(CLAVE_STATS));
    setListo(true);
    // Si la partida quedó a medias (se cortó la red antes de traer una pista o la respuesta), la completa.
    if (vigente) {
      completar(vigente)
        .then((p) => {
          if (p !== vigente) {
            setPartida(p);
            guardar(CLAVE_PARTIDA, p);
          }
        })
        .catch(() => {});
    }
  }, [inicio]);

  async function elegir(slug: string) {
    if (!partida || ocupado || terminada(partida) || partida.filas.some((f) => f.slug === slug)) return;
    setOcupado(true);
    setError("");
    try {
      const r = await pedir<{ acerto: boolean; intento: Omit<Fila, "acerto" | "comparacion">; comparacion: Comparacion }>(`/api/juego/intento?fecha=${partida.fecha}&slug=${slug}`);
      if (partida.filas.length === 0) trackEvent("juego_inicio", { numero: partida.numero });
      let sig: Partida = { ...partida, filas: [...partida.filas, { ...r.intento, acerto: r.acerto, comparacion: r.comparacion }] };
      // Primero se anota el intento (y la racha, si terminó): si después falla una pista, el intento ya está guardado.
      if (terminada(sig) && !sig.contada) {
        const gano = sig.filas.some((f) => f.acerto);
        const nuevas = registrarResultado(stats, { fecha: sig.fecha, acerto: gano, ayer: sumarDias(sig.fecha, -1) });
        setStats(nuevas);
        guardar(CLAVE_STATS, nuevas);
        trackEvent("juego_fin", { acerto: gano, intentos: sig.filas.length });
        sig = { ...sig, contada: true };
      }
      setPartida(sig);
      guardar(CLAVE_PARTIDA, sig);
      try {
        const completa = await completar(sig);
        setPartida(completa);
        guardar(CLAVE_PARTIDA, completa);
      } catch {
        setError("No pudimos traer la pista. Probá de nuevo en un rato: tu intento ya quedó anotado.");
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? `No pudimos comprobar el intento (${e.message}).` : "No pudimos comprobar el intento. Probá de nuevo.");
    } finally {
      setOcupado(false);
    }
  }

  async function reintentar() {
    if (!partida) return;
    setError("");
    try {
      const completa = await completar(partida);
      setPartida(completa);
      guardar(CLAVE_PARTIDA, completa);
    } catch {
      setError("Seguimos sin poder traerlo. Probá de nuevo en un rato.");
    }
  }

  if (!hayBase || (listo && hoy.numero < 1)) {
    return (
      <section className="jg" aria-labelledby="jg-pronto-t">
        <div className="jg-pronto">
          <h2 id="jg-pronto-t">Muy pronto</h2>
          <p>
            El juego del piloto argentino del día todavía no empezó. Cuando arranque, vas a tener {MAX_INTENTOS} intentos por día.
          </p>
        </div>
      </section>
    );
  }
  if (!listo || !partida) {
    return (
      <section className="jg" aria-busy="true">
        <p className="jg-msg">Cargando el juego de hoy…</p>
      </section>
    );
  }

  const fin = terminada(partida);
  const racha = rachaVigente(stats, hoy.fecha, sumarDias(hoy.fecha, -1));
  const quedan = MAX_INTENTOS - partida.filas.length;
  const faltaAlgo = fin ? !partida.respuesta : fallos(partida).length >= FALLOS_PARA_PISTA[1] ? partida.pistas.length < 2 : fallos(partida).length >= FALLOS_PARA_PISTA[0] ? partida.pistas.length < 1 : false;

  return (
    <section className="jg" aria-label={`${JUEGO_NOMBRE} #${hoy.numero}`}>
      <p className="jg-estado">
        <b>
          {JUEGO_NOMBRE} #{partida.numero}
        </b>
        <b aria-live="polite">
          Intento {Math.min(partida.filas.length + (fin ? 0 : 1), MAX_INTENTOS)} de {MAX_INTENTOS}
        </b>
        <span>
          Racha {racha} · Máxima {stats?.maxima ?? 0}
        </span>
      </p>

      {/* Arriba de los intentos: en el celular, con 8 filas, abajo de todo no se ve. */}
      {fin && <Fin partida={partida} hoyJuego />}
      {!fin && <Buscador pilotos={pilotos} usados={partida.filas.map((f) => f.slug)} deshabilitado={ocupado} onElegir={elegir} />}
      {!fin && partida.filas.length === 0 && <p className="jg-msg">Elegí cualquier piloto argentino para empezar. Te quedan {quedan} intentos.</p>}
      {error && (
        <p className="jg-msg error" role="alert">
          {error} {faltaAlgo && <button type="button" className="jg-boton sec" onClick={reintentar}>Reintentar</button>}
        </p>
      )}
      {!error && faltaAlgo && (
        <p className="jg-msg">
          Falta traer {fin ? "al piloto del día" : "una pista"}. <button type="button" className="jg-boton sec" onClick={reintentar}>Reintentar</button>
        </p>
      )}

      {partida.pistas.length > 0 && (
        <ul className="jg-pistas" aria-label="Pistas">
          {partida.pistas.map((p) => (
            <li key={p.n} className="jg-pista">
              <b>Pista {p.n}</b>
              {p.texto}{" "}
              <a href={p.fuente} target="_blank" rel="noreferrer">
                Fuente
              </a>
            </li>
          ))}
        </ul>
      )}

      {partida.filas.length > 0 && (
        <ol className="jg-filas" aria-label="Tus intentos">
          {partida.filas.map((f, i) => (
            <li key={f.slug}>
              <p className="jg-nombre">
                {i + 1}. {f.nombre}
              </p>
              <div className="jg-celdas">
                {ATRIBUTOS.map((a) => {
                  const c = f.comparacion[a];
                  return (
                    <div key={a} className={`jg-celda ${c.estado}`}>
                      <span className="jg-etq">{ETIQUETAS[a]}</span>
                      <span className="jg-val">
                        {valor(f, a)}
                        {c.flecha && <span aria-hidden="true"> {c.flecha === "arriba" ? "↑" : "↓"}</span>}
                      </span>
                      <span className="jg-marca" aria-hidden="true">
                        {MARCAS[c.estado]}
                      </span>
                      <span className="jg-sr">
                        {`: ${EXPLICACION[c.estado]}${c.flecha ? `, ${textoFlecha(a, c.flecha)}` : ""}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </li>
          ))}
        </ol>
      )}

    </section>
  );
}
