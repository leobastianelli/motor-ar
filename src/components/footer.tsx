import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <Link className="brand" href="/">
        <span>Fie</span>
        <b>rros</b>
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
