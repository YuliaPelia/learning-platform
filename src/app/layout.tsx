import type { Metadata } from "next";
import "./globals.css";
import { Preloader } from "@/components/preloader";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: "ITCodeCraft — IT-школа онлайн для дітей 9–17 років", template: "%s · ITCodeCraft" },
  description:
    "Програмування, дизайн і геймдев для дітей 9–17 років: уроки крок за кроком, домашки з нагадуваннями, рівні та бейджі. Перші 2 уроки безкоштовно.",
  openGraph: {
    type: "website",
    siteName: "ITCodeCraft",
    locale: "uk_UA",
    title: "ITCodeCraft — IT-школа онлайн для дітей 9–17 років",
    description: "Програмування, дизайн і геймдев онлайн: уроки крок за кроком, домашки з нагадуваннями, рівні та бейджі. Перші 2 уроки безкоштовно.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700&family=Onest:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
        />
      </head>
      <body className="min-h-screen bg-ink text-text">
        <Preloader />
        {children}
      </body>
    </html>
  );
}
