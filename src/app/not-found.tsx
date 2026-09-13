import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <p className="font-display text-7xl font-bold text-faint">DNF</p>
      <h1 className="text-xl font-medium">Esta página abandonó en la primera vuelta</h1>
      <Link href="/" className="rounded-full border border-line px-4 py-2 text-sm hover:bg-surface">
        Volver al inicio
      </Link>
    </div>
  );
}
