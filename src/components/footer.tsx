import Link from "next/link";
import { Logo } from "./logo";

export function Footer() {
  return (
    <footer className="footer">
      <Link className="brand" href="/" aria-label="Fierros, inicio">
        <Logo />
      </Link>
      <p>
        Automovilismo en hora argentina.
        <br />
        Datos de ACTC, APAT, FIA, Jolpica-F1, OpenF1 y Wikipedia.
        <br />
        Desarrollado por{" "}
        <a href="https://leobastianelli.dev" target="_blank" rel="noreferrer author">
          Leo Bastianelli
        </a>
      </p>
      <nav aria-label="Pie de página">
        <Link href="/calendario">Calendario</Link>
        <Link href="/horarios">Horarios</Link>
        <Link href="/fuentes">Fuentes</Link>
        <Link href="/acerca">Acerca de</Link>
        <Link href="/terminos">Términos</Link>
        <Link href="/privacidad">Privacidad</Link>
      </nav>
    </footer>
  );
}
