"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Inicio", icon: "M3 11.5 12 4l9 7.5M5.5 9.5V20h13V9.5" },
  { href: "/calendario", label: "Calendario", icon: "M4 6.5h16V20H4zM4 10.5h16M8.5 3.5v5M15.5 3.5v5" },
  { href: "/categorias", label: "Categorías", icon: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z" },
  { href: "/pilotos", label: "Pilotos", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" },
  { href: "/historicos", label: "Históricos", icon: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span aria-hidden className="grid grid-cols-2 gap-0.5">
            <span className="size-1.5 bg-ink" />
            <span className="size-1.5" />
            <span className="size-1.5" />
            <span className="size-1.5 bg-celeste" />
          </span>
          <span className="font-display text-xl font-bold tracking-wide uppercase">Parrilla</span>
        </Link>
        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? "page" : undefined}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium tracking-wide text-faint uppercase">
          Demo · datos ficticios
        </span>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${active ? "text-ink" : "text-faint hover:text-muted"}`}
              >
                <Icon d={item.icon} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
