"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { trackEvent } from "@/lib/analytics";
import { buscar, rachaVigente, registrarResultado, textoCompartir } from "@/lib/juego/cliente.mjs";
import { FALLOS_PARA_PISTA, JUEGO_NOMBRE, JUEGO_URL_CORTA, MAX_INTENTOS } from "@/lib/juego/config.mjs";
import { dia, sumarDias } from "@/lib/juego/dia.mjs";
import { Cartel, Radio } from "./juego-efectos";
import { dibujarPlaca } from "./juego-placa";

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
        sig = { ...sig, pistas: [...sig.pistas, { n, texto: r.texto }] };
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
        placeholder="Escribí un piloto…"
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

/** Las 8 luces de intentos: encendidas las que quedan, apagadas las usadas, verde la del acierto. */
function Luces({ usados, acerto }: { usados: number; acerto: boolean }) {
  return (
    <ol className="jg-luces" aria-label={`${usados} de ${MAX_INTENTOS} intentos usados`}>
      {Array.from({ length: MAX_INTENTOS }, (_, i) => {
        const estado = acerto && i === usados - 1 ? "acierto" : i < usados ? "usada" : "viva";
        return <li key={i} className={`jg-luz ${estado}`} aria-hidden="true" />;
      })}
    </ol>
  );
}

function Fin({ partida, animar, racha }: { partida: Partida; animar: boolean; racha: number }) {
  const [aviso, setAviso] = useState("");
  const [placa, setPlaca] = useState<{ blob: Blob; url: string } | null>(null);
  const gano = partida.filas.some((f) => f.acerto);
  const p = partida.respuesta;
  const texto = textoCompartir({ numero: partida.numero, acerto: gano, comparaciones: partida.filas.map((f) => f.comparacion) });
  const archivo = `fierros-adivina-el-piloto-${partida.numero}.png`;

  // La placa se dibuja una vez al terminar y se muestra en miniatura: así se ve lo que se va a compartir.
  useEffect(() => {
    let url = "";
    let vivo = true;
    dibujarPlaca({
      numero: partida.numero,
      acerto: gano,
      intentos: partida.filas.length,
      maximo: MAX_INTENTOS,
      filas: partida.filas.map((f) => ATRIBUTOS.map((a) => f.comparacion[a].estado)),
      racha,
      url: JUEGO_URL_CORTA,
      nombreJuego: JUEGO_NOMBRE,
    })
      .then((blob) => {
        if (!vivo) return;
        url = URL.createObjectURL(blob);
        setPlaca({ blob, url });
      })
      .catch(() => {});
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [partida.numero, partida.filas, gano, racha]);

  function descargar() {
    if (!placa) return;
    const enlace = document.createElement("a");
    enlace.href = placa.url;
    enlace.download = archivo;
    enlace.click();
  }

  async function compartir() {
    trackEvent("juego_compartir", { numero: partida.numero, acerto: gano, imagen: !!placa });
    try {
      const file = placa ? new File([placa.blob], archivo, { type: "image/png" }) : null;
      // En el celular: la imagen con el texto, al menú de compartir del teléfono.
      if (file && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: texto });
        return;
      }
      if (!placa && typeof navigator.share === "function") {
        await navigator.share({ text: texto });
        return;
      }
      // En la computadora: se baja la imagen y se copia el texto.
      if (placa) descargar();
      await navigator.clipboard.writeText(texto);
      setAviso(placa ? "Imagen descargada y texto copiado. ¡A mandarlo al grupo!" : "¡Copiado! Pegalo en el grupo.");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return; // Cerró el menú de compartir.
      setAviso(placa ? "No pudimos compartirla: usá «Descargar imagen»." : "No pudimos copiarlo. Sacale una captura al tablero.");
    }
  }

  return (
    <section className={`jg-final ${gano ? "gano" : "perdio"} ${animar ? "entra" : ""}`} aria-labelledby="jg-final-t">
      <p className="jg-final-sello">{gano ? "Bandera a cuadros" : "Fin de la carrera"}</p>
      <h2 id="jg-final-t">{gano ? (partida.filas.length === 1 ? "¡A la primera! Pole position." : `¡Lo sacaste en ${partida.filas.length}!`) : "Hoy se te escapó"}</h2>
      {p ? (
        <>
          <dl className="jg-ficha-final">
            <div>
              <dt>Nació</dt>
              <dd>{p.nacio}</dd>
            </div>
            <div>
              <dt>Provincia</dt>
              <dd>{p.provincia}</dd>
            </div>
            <div>
              <dt>Títulos</dt>
              <dd>{p.titulos}</dd>
            </div>
            <div>
              <dt>Corre 2026</dt>
              <dd>{p.corre2026 ? "Sí" : "No"}</dd>
            </div>
            <div className="ancha">
              <dt>Categorías</dt>
              <dd>{p.categorias.join(" · ") || "Ninguna"}</dd>
            </div>
          </dl>
          <p className="jg-fuentes">
            <span>Fuentes:</span>
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
        <p>Destapando al piloto del día…</p>
      )}
      {placa && (
        // eslint-disable-next-line @next/next/no-img-element -- imagen generada en el navegador (blob:), no pasa por next/image
        <img
          className="jg-placa"
          src={placa.url}
          width={1080}
          height={1350}
          alt={`Placa del resultado: ${gano ? `lo sacaste en ${partida.filas.length} de ${MAX_INTENTOS}` : "no lo sacaste"}, racha ${racha}`}
        />
      )}
      <div className="jg-acciones">
        <button type="button" className="jg-boton grande" onClick={compartir}>
          Compartir resultado
        </button>
        {placa && (
          <button type="button" className="jg-boton sec" onClick={descargar}>
            Descargar imagen
          </button>
        )}
        <span role="status" aria-live="polite">{aviso}</span>
      </div>
      <p className="jg-proximo">Mañana a las 00:00 hay otro piloto.</p>
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
  // Qué se animó en esta visita: la fila recién respondida, las pistas nuevas y el final. Lo que vino guardado aparece quieto.
  const [filaNueva, setFilaNueva] = useState<string | null>(null);
  const [pistasNuevas, setPistasNuevas] = useState<number[]>([]);
  const [finEnVivo, setFinEnVivo] = useState(false);
  const [sacudir, setSacudir] = useState(false);

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
      setFilaNueva(slug);
      if (!r.acerto) setSacudir(true);
      // Primero se anota el intento (y la racha, si terminó): si después falla una pista, el intento ya está guardado.
      if (terminada(sig) && !sig.contada) {
        const gano = sig.filas.some((f) => f.acerto);
        const nuevas = registrarResultado(stats, { fecha: sig.fecha, acerto: gano, ayer: sumarDias(sig.fecha, -1) });
        setStats(nuevas);
        guardar(CLAVE_STATS, nuevas);
        trackEvent("juego_fin", { acerto: gano, intentos: sig.filas.length });
        sig = { ...sig, contada: true };
        setFinEnVivo(true);
      }
      setPartida(sig);
      guardar(CLAVE_PARTIDA, sig);
      try {
        const completa = await completar(sig);
        setPistasNuevas(completa.pistas.filter((x) => !sig.pistas.some((y) => y.n === x.n)).map((x) => x.n));
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
        <div className="jg-tablero">
          <p className="jg-kicker">Piloto del día</p>
          <Cartel texto="" revelado={false} animar={false} />
          <h2 id="jg-pronto-t" className="jg-pronto-t">
            Muy pronto
          </h2>
          <p className="jg-pronto-p">Un piloto argentino misterioso por día y {MAX_INTENTOS} intentos para sacarlo.</p>
        </div>
      </section>
    );
  }
  if (!listo || !partida) {
    return (
      <section className="jg" aria-busy="true">
        <div className="jg-tablero">
          <p className="jg-kicker">Cargando el piloto de hoy…</p>
          <Cartel texto="" revelado={false} animar={false} />
        </div>
      </section>
    );
  }

  const fin = terminada(partida);
  const gano = partida.filas.some((f) => f.acerto);
  const racha = rachaVigente(stats, hoy.fecha, sumarDias(hoy.fecha, -1));
  const quedan = MAX_INTENTOS - partida.filas.length;
  const faltaAlgo = fin ? !partida.respuesta : fallos(partida).length >= FALLOS_PARA_PISTA[1] ? partida.pistas.length < 2 : fallos(partida).length >= FALLOS_PARA_PISTA[0] ? partida.pistas.length < 1 : false;
  const proximaPista = FALLOS_PARA_PISTA.find((n) => fallos(partida).length < n);
  const filas = [...partida.filas].map((f, i) => ({ f, i })).reverse(); // la última arriba: en el celular se ve sin bajar

  return (
    <section className={`jg ${fin ? (gano ? "gano" : "perdio") : ""} ${finEnVivo ? "en-vivo" : ""}`} aria-label={`${JUEGO_NOMBRE} #${hoy.numero}`}>
      <div className="jg-tablero">
        <div className="jg-top">
          <p className="jg-kicker">
            <span>Piloto del día</span>
            <b>#{partida.numero}</b>
          </p>
          <p className="jg-racha" aria-label={`Racha ${racha}, máxima ${stats?.maxima ?? 0}`}>
            <b>{racha}</b>
            <span>racha</span>
            <b>{stats?.maxima ?? 0}</b>
            <span>máx.</span>
          </p>
        </div>

        <Cartel texto={partida.respuesta?.nombre ?? ""} revelado={fin && !!partida.respuesta} animar={finEnVivo} />
        <Luces usados={partida.filas.length} acerto={gano} />
        <p className="jg-quedan" aria-live="polite">
          {fin ? (gano ? "¡Adentro!" : "Sin intentos") : quedan === MAX_INTENTOS ? `${MAX_INTENTOS} intentos. Arrancá con cualquier piloto argentino.` : `Quedan ${quedan}${proximaPista ? ` · pista por radio en ${proximaPista - fallos(partida).length}` : ""}`}
        </p>

        {fin ? (
          <Fin partida={partida} animar={finEnVivo} racha={racha} />
        ) : (
          <div className={sacudir ? "jg-sacude" : ""} onAnimationEnd={(e) => e.target === e.currentTarget && setSacudir(false)}>
            <Buscador pilotos={pilotos} usados={partida.filas.map((f) => f.slug)} deshabilitado={ocupado} onElegir={elegir} />
          </div>
        )}

        {error && !ocupado && (
          <p className="jg-msg error" role="alert">
            {error} {faltaAlgo && <button type="button" className="jg-boton sec" onClick={reintentar}>Reintentar</button>}
          </p>
        )}
        {!error && !ocupado && faltaAlgo && (
          <p className="jg-msg">
            Falta traer {fin ? "al piloto del día" : "una pista"}. <button type="button" className="jg-boton sec" onClick={reintentar}>Reintentar</button>
          </p>
        )}

        {partida.pistas.length > 0 && (
          <ul className="jg-pistas" aria-label="Pistas">
            {[...partida.pistas].reverse().map((p) => (
              <li key={p.n} className={`jg-pista ${pistasNuevas.includes(p.n) ? "entra" : ""}`}>
                <b>
                  <span className="jg-onda" aria-hidden="true" /> Radio de boxes · pista {p.n}
                </b>
                <p>
                  <Radio texto={p.texto} animar={pistasNuevas.includes(p.n)} />
                </p>
              </li>
            ))}
          </ul>
        )}

        {filas.length > 0 && (
          <ol className="jg-filas" aria-label="Tus intentos">
            {filas.map(({ f, i }) => (
              <li key={f.slug} className={`jg-fila ${f.acerto ? "acierto" : ""} ${filaNueva === f.slug ? "nueva" : ""}`} value={i + 1}>
                <p className="jg-nombre">
                  <span className="jg-num">{i + 1}</span>
                  {f.nombre}
                </p>
                <div className="jg-celdas">
                  {ATRIBUTOS.map((a, k) => {
                    const c = f.comparacion[a];
                    return (
                      <div key={a} className={`jg-celda ${c.estado}`} style={{ "--d": `${k * 140}ms` } as CSSProperties}>
                        <span className="jg-etq">{ETIQUETAS[a]}</span>
                        <span className="jg-val">
                          {valor(f, a)}
                          {c.flecha && (
                            <span className={`jg-flecha ${c.flecha}`} aria-hidden="true">
                              {c.flecha === "arriba" ? "▲" : "▼"}
                            </span>
                          )}
                        </span>
                        <span className="jg-marca" aria-hidden="true">
                          {MARCAS[c.estado]}
                        </span>
                        <span className="jg-sr">{`: ${EXPLICACION[c.estado]}${c.flecha ? `, ${textoFlecha(a, c.flecha)}` : ""}`}</span>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
