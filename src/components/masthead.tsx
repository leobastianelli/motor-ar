"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { MenuItem } from "@/lib/menu";
import { Logo } from "./logo";
import { Code } from "./pista";

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

/** Un enlace que sólo cambia el #hash de la página en la que ya estás no dispara "hashchange": se avisa a mano (lo escucha el calendario). */
function nudgeHash(href: string) {
  if (href.includes("#")) setTimeout(() => window.dispatchEvent(new HashChangeEvent("hashchange")), 60);
}

const slug = (href: string) => (href === "/" ? "inicio" : href.replace(/^\//, ""));

export function Masthead({ menu }: { menu: MenuItem[] }) {
  const pathname = usePathname();
  const time = useArgentinaClock();
  const [open, setOpen] = useState(false);
  // Qué submenú está abierto (por dirección del ítem): con el mouse al pasar por encima, y con el teclado o el dedo desde la flecha.
  const [sub, setSub] = useState<string | null>(null);
  const header = useRef<HTMLElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeAll = () => {
    setOpen(false);
    setSub(null);
  };

  // Con el menú o un submenú abierto: se cierra tocando fuera de la cabecera o con Escape.
  useEffect(() => {
    if (!open && !sub) return;
    const outside = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      // El velo está dentro de la cabecera, pero tocarlo cuenta como tocar afuera.
      if (target.classList?.contains("nav-backdrop") || (header.current && !header.current.contains(target))) {
        setOpen(false);
        setSub(null);
      }
    };
    const escape = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSub(null);
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open, sub]);

  const hoverIn = (href: string) => (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer.current);
    setSub(href);
  };
  // Un instante de gracia al salir: cruzar el hueco entre el ítem y el panel no lo cierra.
  const hoverOut = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setSub(null), 160);
  };
  const escapeToToggle = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key !== "Escape" || !sub) return;
    setSub(null);
    e.currentTarget.querySelector<HTMLButtonElement>(".nav-toggle")?.focus();
  };

  return (
    <header className="masthead" ref={header}>
      <Link className="brand" href="/" aria-label="Fierros, inicio" onClick={closeAll}>
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
        <ul className="nav-list">
          {menu.map((item) => {
            const active = isActive(pathname, item.href);
            const expanded = sub === item.href;
            const panelId = `submenu-${slug(item.href)}`;
            const hasSub = item.groups.length > 0;
            return (
              <li
                key={item.href}
                className={`nav-item${hasSub ? " has-sub" : ""}${expanded ? " is-open" : ""}`}
                onPointerEnter={hasSub ? hoverIn(item.href) : undefined}
                onPointerLeave={hasSub ? hoverOut : undefined}
                onKeyDown={hasSub ? escapeToToggle : undefined}
                onBlur={hasSub ? (e) => !e.currentTarget.contains(e.relatedTarget) && setSub((s) => (s === item.href ? null : s)) : undefined}
              >
                <Link href={item.href} className={active ? "active" : undefined} aria-current={active ? "page" : undefined} onClick={closeAll}>
                  {item.label}
                </Link>
                {hasSub && (
                  <button
                    type="button"
                    className="nav-toggle"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    aria-label={`${expanded ? "Cerrar" : "Abrir"} el submenú de ${item.label}`}
                    onClick={() => setSub(expanded ? null : item.href)}
                  >
                    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" focusable="false">
                      <path d="M2 4.5l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </button>
                )}
                {hasSub && (
                  <div id={panelId} className="nav-panel" hidden={!expanded}>
                    <div className="nav-panel-inner">
                      {item.groups.map((group, i) => (
                        <div key={group.label ?? i} className={`nav-group${group.links.length > 8 ? " wide" : ""}`}>
                          {group.label && <h3>{group.label}</h3>}
                          <ul>
                            {group.links.map((link) => (
                              <li key={link.href}>
                                <Link
                                  href={link.href}
                                  onClick={() => {
                                    closeAll();
                                    nudgeHash(link.href);
                                  }}
                                >
                                  {link.code && link.color && <Code series={{ code: link.code, color: link.color, name: link.label }} />}
                                  <span className="nav-link-text">
                                    <b>{link.label}</b>
                                    {link.hint && <small>{link.hint}</small>}
                                  </span>
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                      {item.all && (
                        <div className="nav-all">
                          <Link href={item.all.href} onClick={closeAll}>
                            {item.all.label} <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
