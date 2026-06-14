"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CarCard from "@/components/CarCard";
import VerifiedGarageCard from "@/components/VerifiedGarageCard";
import { api } from "@/lib/api";
import type { Car, GarageCard } from "@/lib/types";

export default function HomePage() {
  const [featured, setFeatured] = useState<Car[]>([]);
  const [garages, setGarages] = useState<GarageCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.listCars({ page_size: 8 }).then((r) => setFeatured(r.items)).catch(() => {}).finally(() => setLoading(false));
    api.listGarages(8).then(setGarages).catch(() => {});
  }, []);

  return (
    <div className="space-y-14">
      {/* ============ HERO + SEARCH ============ */}
      <section className="relative overflow-hidden rounded-3xl border hair px-5 py-12 sm:px-10 sm:py-16">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-50 blur-3xl" style={{ background: "radial-gradient(circle, var(--saffron), transparent 70%)" }} />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, var(--teal), transparent 70%)" }} />

        <div className="reveal flex items-center gap-2" style={{ animationDelay: "0ms" }}>
          <span className="badge-verified">✦ 100% garages vérifiés</span>
        </div>
        <h1 className="reveal mt-4 max-w-3xl text-4xl font-extrabold uppercase leading-[0.92] tracking-tight sm:text-6xl" style={{ animationDelay: "70ms" }}>
          Achetez votre voiture
          <br />
          <span className="text-saffron">auprès de vrais professionnels.</span>
        </h1>
        <p className="reveal mt-4 max-w-xl text-base text-muted sm:text-lg" style={{ animationDelay: "140ms" }}>
          Repérez les garages vérifiés autour de vous, parcourez leur inventaire et
          contactez-les directement sur WhatsApp. Pas de particuliers, pas d&apos;arnaques.
        </p>

        <div className="reveal mt-7 flex flex-wrap gap-3" style={{ animationDelay: "210ms" }}>
          <Link href="/search" className="btn-primary text-base">
            📍 Trouver les garages près de moi
          </Link>
          <Link href="/search" className="btn-outline text-base">
            Explorer la carte 🗺
          </Link>
        </div>
      </section>

      {/* ============ FEATURED ============ */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="eyebrow">Sélection</span>
            <h2 className="font-display text-2xl uppercase tracking-wide">Véhicules en vedette</h2>
          </div>
          <Link href="/search" className="text-sm text-saffron hover:underline">Tout voir →</Link>
        </div>
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="card aspect-[4/5] animate-pulse opacity-50" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((car, i) => (
              <div key={car.id} className="reveal" style={{ animationDelay: `${Math.min(i * 50, 500)}ms` }}>
                <CarCard car={car} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============ VERIFIED GARAGES ============ */}
      {garages.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="eyebrow">Le réseau</span>
              <h2 className="font-display text-2xl uppercase tracking-wide">Garages vérifiés</h2>
            </div>
            <Link href="/search" className="text-sm text-saffron hover:underline">Sur la carte →</Link>
          </div>
          <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {garages.map((g) => <VerifiedGarageCard key={g.id} garage={g} />)}
          </div>
        </section>
      )}

      {/* ============ WHY TRUST ============ */}
      <section className="space-y-6 rounded-3xl border hair bg-[var(--surface)] p-6 sm:p-10">
        <div className="text-center">
          <span className="eyebrow">Pourquoi Garage.ma</span>
          <h2 className="font-display mt-1 text-3xl uppercase tracking-wide">La confiance, par défaut</h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Trust icon="✓" title="Garages vérifiés" text="Chaque vendeur est un professionnel approuvé manuellement par notre équipe." />
          <Trust icon="◈" title="Zéro arnaque" text="Pas de particuliers ni de fausses annonces. Que de l'inventaire réel de concessionnaires." />
          <Trust icon="💬" title="Contact direct" text="Une seule étape : discutez avec le garage sur WhatsApp. Sans intermédiaire." />
        </div>
      </section>

      {/* ============ GARAGE CTA ============ */}
      <section className="flex flex-col items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-brand to-brand-dark p-8 text-center text-[#1a130a] sm:flex-row sm:text-left">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Vous gérez un garage ?</h2>
          <p className="mt-1 text-sm opacity-80">Publiez votre inventaire et recevez des leads WhatsApp qualifiés.</p>
        </div>
        <Link href="/garage/register" className="rounded-lg bg-[#1a130a] px-6 py-3 font-semibold text-[var(--saffron)] transition hover:scale-105">
          Inscrire mon garage →
        </Link>
      </section>
    </div>
  );
}

function Trust({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-dark text-xl text-[#1a130a] sm:mx-0">{icon}</div>
      <h3 className="font-display mt-3 text-lg tracking-wide">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
