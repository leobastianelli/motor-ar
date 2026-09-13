import Link from "next/link";

export function Footer() {
  return (
    <footer className="footer">
      <Link className="brand" href="/">
        <span>Pis</span>
        <b>ta</b>
      </Link>
      <p>
        Automovilismo en hora argentina.
        <br />
        Agenda y resultados de muestra; datos de Colapinto verificados.
      </p>
      <nav aria-label="Pie de página">
        <Link href="/calendario">Calendario</Link>
        <Link href="/sistema">Sistema visual</Link>
      </nav>
    </footer>
  );
}
