"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

const NAV = [
  { href: "/", label: "Este finde" },
  { href: "/calendario", label: "Calendario" },
  { href: "/pilotos", label: "Pilotos" },
  { href: "/categorias", label: "Categorías" },
  { href: "/historicos", label: "Historias" },
];

const clockFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 1000);
  return () => clearInterval(id);
}

function useArgentinaClock() {
  return useSyncExternalStore(
    subscribe,
    () => clockFmt.format(new Date()),
    () => "--:--:--",
  );
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Masthead() {
  const pathname = usePathname();
  const time = useArgentinaClock();
  const [open, setOpen] = useState(false);

  return (
    <header className="masthead">
      <Link className="brand" href="/" aria-label="Pista, inicio">
        <span>Pis</span>
        <b>ta</b>
      </Link>
      <div className="clock">
        <span>Hora argentina</span>
        <strong>{time}</strong>
      </div>
      <button className="menu-toggle" aria-expanded={open} aria-controls="site-nav" onClick={() => setOpen((o) => !o)}>
        Secciones
      </button>
      <nav id="site-nav" className={`site-nav${open ? " open" : ""}`} aria-label="Principal">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : undefined}
              aria-current={active ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
