"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CarCard from "@/components/CarCard";
import CarGallery from "@/components/CarGallery";
import GarageAvatar from "@/components/GarageAvatar";
import { api } from "@/lib/api";
import {
  formatMileage,
  formatPrice,
  fuelLabel,
  transmissionLabel,
  whatsappLink,
} from "@/lib/format";
import type { Car } from "@/lib/types";

export default function CarDetailPage({ params }: { params: { id: string } }) {
  const [car, setCar] = useState<Car | null>(null);
  const [similar, setSimilar] = useState<Car[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getCar(params.id)
      .then(setCar)
      .catch(() => setError("Annonce introuvable ou indisponible."));
  }, [params.id]);

  useEffect(() => {
    if (!car) return;
    api
      .listCars({ brand: car.brand, page_size: 6 })
      .then((res) => setSimilar(res.items.filter((c) => c.id !== car.id).slice(0, 4)))
      .catch(() => {});
  }, [car]);

  if (error) {
    return (
      <div className="py-20 text-center">
        <p className="font-display text-3xl">404</p>
        <p className="mt-2 text-muted">{error}</p>
        <Link href="/" className="btn-primary mt-6">
          Retour aux annonces
        </Link>
      </div>
    );
  }

  if (!car) {
    return <p className="py-20 text-center text-muted">Chargement…</p>;
  }

  return (
    <div className="space-y-6">
      <Link href="/" className="eyebrow inline-flex hover:brightness-125">
        ← Toutes les annonces
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ---------- Gallery ---------- */}
        <div className="space-y-4 lg:col-span-2">
          <div className="reveal">
            <CarGallery
              images={car.images}
              alt={`${car.brand} ${car.model}`}
              year={car.year}
            />
          </div>

          {car.description && (
            <div className="card reveal p-6" style={{ animationDelay: "80ms" }}>
              <h2 className="font-display text-xl tracking-wide">Description</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted">
                {car.description}
              </p>
            </div>
          )}
        </div>

        {/* ---------- Summary + contact ---------- */}
        <div className="space-y-4">
          <div className="card reveal p-6" style={{ animationDelay: "60ms" }}>
            <span className="eyebrow">{car.brand}</span>
            <h1 className="font-display mt-1 text-3xl font-bold uppercase leading-none tracking-wide">
              {car.brand} {car.model}
            </h1>
            <p className="price mt-3 text-3xl font-bold">{formatPrice(car.price)}</p>

            <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border hair bg-[var(--border)]">
              <Spec label="Année" value={String(car.year)} />
              <Spec label="Kilométrage" value={formatMileage(car.mileage)} />
              <Spec label="Carburant" value={fuelLabel(car.fuel_type)} />
              <Spec label="Boîte" value={transmissionLabel(car.transmission)} />
            </dl>
          </div>

          <div className="card reveal p-6" style={{ animationDelay: "140ms" }}>
            <div className="flex items-center justify-between">
              <span className="eyebrow">Vendu par</span>
              <span className="badge-verified">✦ Vérifié</span>
            </div>
            <Link
              href={`/garages/${car.garage.id}`}
              className="mt-3 flex items-center gap-3 rounded-xl border hair p-3 transition hover:border-[var(--border-strong)]"
            >
              <GarageAvatar name={car.garage.name} logoUrl={car.garage.logo_url} size={52} />
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-xl leading-tight tracking-wide">
                  {car.garage.name}
                </p>
                <p className="truncate text-sm text-faint">
                  {car.garage.address}, {car.garage.city}
                </p>
              </div>
              <span className="text-saffron">→</span>
            </Link>
            <p className="mt-2 text-center text-xs text-faint">
              Voir tout l&apos;inventaire de ce garage
            </p>

            <a
              href={whatsappLink(car)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => api.recordLead(car.id)}
              className="btn-whatsapp mt-5 w-full text-base"
            >
              <span className="text-lg">💬</span> Contacter sur WhatsApp
            </a>
            <p className="mt-3 text-center text-xs text-faint">
              La transaction se fait directement avec le garage.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- Similar vehicles ---------- */}
      {similar.length > 0 && (
        <section className="space-y-5 pt-2">
          <h2 className="font-display text-2xl uppercase tracking-wide">
            Véhicules similaires
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((c) => (
              <CarCard key={c.id} car={c} />
            ))}
          </div>
        </section>
      )}

      {/* Spacer so the sticky mobile bar never covers content */}
      <div className="h-20 lg:hidden" />

      {/* ---------- Sticky mobile WhatsApp CTA ---------- */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t hair bg-[var(--surface)]/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="price text-lg font-bold leading-none">{formatPrice(car.price)}</p>
            <p className="truncate text-xs text-faint">
              {car.brand} {car.model}
            </p>
          </div>
          <a
            href={whatsappLink(car)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => api.recordLead(car.id)}
            className="btn-whatsapp ml-auto flex-shrink-0"
          >
            💬 WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface)] p-3.5">
      <dt className="text-xs uppercase tracking-wider text-faint">{label}</dt>
      <dd className="num mt-0.5 font-semibold text-[var(--text)]">{value}</dd>
    </div>
  );
}
