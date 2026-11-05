import Link from "next/link";
import { Mascot } from "@/components/mascot";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-3 md:p-6">
      <div className="card flex w-full max-w-[640px] flex-col items-center gap-5 px-6 pt-4 pb-10 text-center sm:px-12">
        <Mascot className="h-[240px] w-[300px]" sizes="300px" />
        <span className="rounded-full bg-text px-3 py-1 font-mono text-sm font-bold text-white">404</span>
        <h1 className="font-display text-4xl font-extrabold">Такої сторінки немає</h1>
        <p className="text-muted">Можливо, посилання застаріло. Повернімося до навчання!</p>
        <Link href="/" className="btn-primary">На головну</Link>
      </div>
    </div>
  );
}
