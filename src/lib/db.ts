import { neon } from "@neondatabase/serverless";

// Inicialización perezosa: si se llamara al armar el módulo, rompería `next build` en el primer deploy
// (antes de que exista DATABASE_URL). Nunca envolver esto en un Proxy (rompe librerías que inspeccionan el objeto).
let _sql: ReturnType<typeof neon> | null = null;

export function sql() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("Falta DATABASE_URL (Neon, provisto por Vercel Marketplace)");
    _sql = neon(url);
  }
  return _sql;
}
