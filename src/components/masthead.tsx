"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Logo } from "./logo";

const NAV = [
  { href: "/", label: "Este finde" },
  { href: "/horarios", label: "Horarios" },
  { href: "/calendario", label: "Calendario" },
  { href: "/pilotos", label: "Pilotos" },
  { href: "/categorias", label: "Categorías" },
  { href: "/notas", label: "Notas" },
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
  const header = useRef<HTMLElement>(null);

  // Con el menú abierto: se cierra tocando fuera de la cabecera o con Escape.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // El velo está dentro de la cabecera, pero tocarlo cuenta como tocar afuera.
      if (target.classList?.contains("nav-backdrop") || (header.current && !header.current.contains(target))) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <header className="masthead" ref={header}>
      <Link className="brand" href="/" aria-label="Fierros, inicio" onClick={() => setOpen(false)}>
        <Logo />
      </Link>
      <div className="clock">
        <span>Hora argentina</span>
        <strong>{time}</strong>
      </div>
      <button className="menu-toggle" aria-expanded={open} aria-controls="site-nav" aria-label={open ? "Cerrar menú" : "Abrir menú"} onClick={() => setOpen((o) => !o)}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false">
          {open ? (
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          ) : (
            <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          )}
        </svg>
      </button>
      {open && <div className="nav-backdrop" aria-hidden="true" />}
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
