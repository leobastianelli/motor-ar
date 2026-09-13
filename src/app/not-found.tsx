import Link from "next/link";

export default function NotFound() {
  return (
    <section className="weekend-head">
      <div>
        <h1>DNF</h1>
      </div>
      <p className="lede">
        Esta página abandonó en la primera vuelta. <Link href="/">Volver a este finde</Link>
      </p>
    </section>
  );
}
