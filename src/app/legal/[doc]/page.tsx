import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicShell } from "@/components/site-chrome";
import { LEGAL_DOCS } from "@/content/legal";
import { LEGAL_VERSION } from "@/lib/plans";
import { Markdown } from "@/lib/markdown";

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  return { title: LEGAL_DOCS[doc]?.title ?? "Документ" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[doc]">) {
  const { doc } = await params;
  const d = LEGAL_DOCS[doc];
  if (!d) notFound();
  return (
    <PublicShell>
      <article className="mx-auto flex max-w-[820px] flex-col gap-6 px-4 py-14 md:px-6">
        <p className="rounded-2xl border border-amber/50 bg-[#2a2414] px-5 py-4 text-amber">
          ЧЕРНЕТКА. Перед запуском оплат цей документ має перевірити юрист. Дані у квадратних дужках — замінити реальними.
        </p>
        <h1 className="font-display text-3xl font-bold md:text-4xl">{d.title}</h1>
        <p className="text-muted">Редакція від {LEGAL_VERSION}</p>
        <Markdown source={d.body} />
      </article>
    </PublicShell>
  );
}
