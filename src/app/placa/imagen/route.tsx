import { imagenPlaca } from "../finde/placa";

export const revalidate = 1800;

// Dirección vieja de la placa del finde (la adjuntaban los borradores de Telegram anteriores): ahora es la primera placa de «Horarios del finde» en
// formato feed (ver /placa/finde/[formato]/[n]).
export async function GET() {
  return (await imagenPlaca("feed", 1))!;
}
