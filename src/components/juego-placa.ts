// Placa del resultado para compartir: una imagen 1080×1350 (entra en el feed de Instagram, en historias y en WhatsApp)
// dibujada en el navegador con canvas. Nunca lleva el nombre del piloto: sólo el número del juego, el marcador, la grilla y la racha.

type Estado = "verde" | "amarillo" | "gris";

export interface DatosPlaca {
  numero: number;
  acerto: boolean;
  intentos: number;
  maximo: number;
  filas: Estado[][];
  racha: number;
  url: string;
  nombreJuego: string;
}

const C = {
  fondo: "#0b0d0f",
  panel: "#15181b",
  panel2: "#1c2024",
  texto: "#f4f6f5",
  suave: "#a3abb0",
  celeste: "#75bee9",
  verde: "#3ccf7f",
  amarillo: "#f5c640",
  gris: "#2a3035",
};
const COLOR: Record<Estado, string> = { verde: C.verde, amarillo: C.amarillo, gris: C.gris };

// Logotipo de Fierros (src/components/logo.tsx), en sus coordenadas originales (viewBox 0 8 428 80).
const LOGO_CUADRO = "M0 8h80v80H0z";
const LOGO_BARRAS = "M18 21h17v15H18zm17 0h29v15H35zM18 41h17v15H18zm17 0h23v15H35zM18 61h17v15H18z";
const LOGO_F = "M0 0h44v10H14v13h24v10H14v23H0z";
const LOGO_IERROS =
  "M50 0h14v56H50zM70 0h44v10H84v13h24v10H84v13h30v10H70zM120 0h32l10 10v18l-9 8 12 20h-16l-10-17h-5v17h-14V0zm14 10v19h14V10h-14zM171 0h32l10 10v18l-9 8 12 20h-16l-10-17h-5v17h-14V0zm14 10v19h14V10h-14zM230 0h30l10 10v36l-10 10h-30l-10-10V10l10-10zm4 10v36h22V10h-22zM284 0h38v10h-28v12h20l10 10v14l-10 10h-40V46h30V34h-20l-10-10V10z";

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function logo(ctx: CanvasRenderingContext2D, x: number, y: number, alto: number) {
  const k = alto / 80;
  ctx.save();
  ctx.translate(x, y - 8 * k);
  ctx.scale(k, k);
  ctx.fillStyle = C.texto;
  ctx.fill(new Path2D(LOGO_CUADRO));
  ctx.fillStyle = C.celeste;
  ctx.fill(new Path2D(LOGO_BARRAS));
  ctx.translate(104, 20);
  ctx.fill(new Path2D(LOGO_F));
  ctx.fillStyle = C.texto;
  ctx.fill(new Path2D(LOGO_IERROS), "evenodd");
  ctx.restore();
}

/** Bandera a cuadros a lo ancho, arriba de la placa. */
function cuadros(ctx: CanvasRenderingContext2D, ancho: number, alto: number, lado: number) {
  for (let fila = 0; fila * lado < alto; fila++) {
    for (let col = 0; col * lado < ancho; col++) {
      ctx.fillStyle = (fila + col) % 2 ? C.fondo : C.texto;
      ctx.fillRect(col * lado, fila * lado, lado, lado);
    }
  }
}

export async function dibujarPlaca(d: DatosPlaca): Promise<Blob> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Sin canvas");

  // La misma tipografía del sitio (Archivo, cargada con next/font): se toma la familia que usa la página.
  try {
    await document.fonts.ready;
  } catch {
    // Si no se puede esperar a las fuentes, se dibuja igual con la de respaldo.
  }
  const familia = getComputedStyle(document.body).fontFamily || "Arial, sans-serif";
  const fuente = (peso: number, px: number) => `${peso} ${px}px ${familia}`;
  const condensada = (on: boolean) => {
    if ("fontStretch" in ctx) (ctx as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = on ? "condensed" : "normal";
  };

  ctx.fillStyle = C.fondo;
  ctx.fillRect(0, 0, W, H);
  if (d.acerto) cuadros(ctx, W, 36, 18);
  else {
    ctx.fillStyle = "#3a4148";
    ctx.fillRect(0, 0, W, 12);
  }

  const M = 80;
  logo(ctx, M, 84, 56);

  // Marcador grande arriba a la derecha, a la altura del logo
  const marcador = d.acerto ? `${d.intentos}/${d.maximo}` : `X/${d.maximo}`;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "right";
  condensada(true);
  ctx.fillStyle = d.acerto ? C.verde : C.suave;
  ctx.font = fuente(900, 150);
  ctx.fillText(marcador, W - M, 200);
  condensada(false);
  ctx.font = fuente(800, 30);
  ctx.fillStyle = C.suave;
  ctx.fillText(d.acerto ? (d.intentos === 1 ? "¡A la primera!" : "¡Lo saqué!") : "Hoy se me escapó", W - M, 246);
  ctx.textAlign = "left";

  // Nombre del juego (se achica si no entra) y número
  condensada(true);
  ctx.fillStyle = C.texto;
  let px = 96;
  ctx.font = fuente(900, px);
  while (ctx.measureText(d.nombreJuego).width > W - 2 * M && px > 48) ctx.font = fuente(900, (px -= 4));
  ctx.fillText(d.nombreJuego, M, 340);
  ctx.fillStyle = C.celeste;
  ctx.font = fuente(900, 52);
  ctx.fillText(`#${d.numero}`, M, 404);
  condensada(false);

  // Grilla: una fila por intento, cinco datos por fila
  const top = 460;
  const gap = 14;
  const filas = d.filas.length;
  const altoDisponible = H - top - 230;
  const lado = Math.min(118, (W - 2 * M - 4 * gap) / 5, (altoDisponible - (filas - 1) * gap) / Math.max(filas, 1));
  const anchoGrilla = 5 * lado + 4 * gap;
  const x0 = (W - anchoGrilla) / 2;
  d.filas.forEach((fila, i) => {
    fila.forEach((estado, j) => rect(ctx, x0 + j * (lado + gap), top + i * (lado + gap), lado, lado, Math.round(lado * 0.14), COLOR[estado]));
  });

  // Pie: luces usadas, racha y link
  const yPie = H - 150;
  ctx.fillStyle = C.panel;
  ctx.fillRect(0, yPie - 40, W, H - yPie + 40);
  const r = 13;
  for (let i = 0; i < d.maximo; i++) {
    const usada = i < d.intentos;
    ctx.fillStyle = d.acerto && i === d.intentos - 1 ? C.verde : usada ? "#30363b" : C.celeste;
    ctx.beginPath();
    ctx.arc(M + r + i * (2 * r + 14), yPie + 18, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = "right";
  ctx.fillStyle = C.amarillo;
  ctx.font = fuente(900, 40);
  ctx.fillText(`Racha ${d.racha}`, W - M, yPie + 32);
  ctx.textAlign = "left";
  ctx.fillStyle = C.texto;
  ctx.font = fuente(800, 40);
  ctx.fillText(d.url, M, H - 50);
  ctx.textAlign = "right";
  ctx.fillStyle = C.suave;
  ctx.font = fuente(600, 28);
  ctx.fillText("¿Vos lo sacás?", W - M, H - 52);

  return await new Promise<Blob>((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo crear la imagen"))), "image/png"));
}
