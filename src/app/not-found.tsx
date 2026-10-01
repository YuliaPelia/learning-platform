import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-4 text-center">
      <span className="font-mono text-accent">404</span>
      <h1 className="font-display text-4xl font-bold">Такої сторінки немає</h1>
      <p className="text-soft">Можливо, посилання застаріло. Повернімося до навчання!</p>
      <Link href="/" className="btn-primary">На головну</Link>
    </div>
  );
}
