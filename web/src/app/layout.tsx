import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alpha Copilot — Moonfare",
  description:
    "Moonfare's private-markets co-pilot. Understand, shape and act on your portfolio.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper text-ink">
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-navy px-5 py-3 text-white">
          <img
            src="/assets/moonfare_logo_white.png"
            alt="Moonfare"
            className="h-5 opacity-95"
          />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            Alpha Copilot
          </span>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
