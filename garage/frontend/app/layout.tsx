import type { Metadata } from "next";

import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Garage.ma — Showroom d'occasion vérifié",
  description:
    "La marketplace de voitures d'occasion réservée aux garages vérifiés au Maroc. Contactez le vendeur directement sur WhatsApp.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t hair">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 sm:flex-row sm:items-center">
            <div>
              <p className="font-display text-2xl font-bold tracking-wide">
                GARAGE<span className="text-saffron">.MA</span>
              </p>
              <p className="mt-1 text-sm text-faint">
                Uniquement des garages vérifiés · La confiance d&apos;abord.
              </p>
            </div>
            <p className="eyebrow">Casablanca · Rabat · Agadir</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
