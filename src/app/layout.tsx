import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "ITCodeCraft — IT-школа онлайн для дітей 9–17 років", template: "%s · ITCodeCraft" },
  description:
    "Програмування, дизайн і геймдев для дітей 9–17 років: уроки крок за кроком, домашки з нагадуваннями, рівні та бейджі. Перші 2 уроки безкоштовно.",
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
      <body className="min-h-screen bg-ink text-text">{children}</body>
    </html>
  );
}
