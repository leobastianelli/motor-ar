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
        Datos: Jolpica-F1, Wikipedia, ACTC y APAT.
      </p>
      <nav aria-label="Pie de página">
        <Link href="/calendario">Calendario</Link>
        <Link href="/sistema">Sistema visual</Link>
      </nav>
    </footer>
  );
}
