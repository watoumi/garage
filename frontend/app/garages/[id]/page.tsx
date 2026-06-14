"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import CarCard from "@/components/CarCard";
import GarageAvatar from "@/components/GarageAvatar";
import { api } from "@/lib/api";
import { getRole } from "@/lib/auth";
import type { GarageProfilePublic } from "@/lib/types";

export default function GaragePublicPage({ params }: { params: { id: string } }) {
  const [garage, setGarage] = useState<GarageProfilePublic | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getGarage(params.id)
      .then(setGarage)
      .catch(() => setError("Garage introuvable ou indisponible."));

    // If a garage owner is viewing their own public profile, offer an edit shortcut.
    if (getRole() === "garage") {
      api
        .myGarage()
        .then((g) => setIsOwner(g.id === Number(params.id)))
        .catch(() => {});
    }
  }, [params.id]);

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

  if (!garage) {
    return <p className="py-20 text-center text-muted">Chargement…</p>;
  }

  const waPhone = garage.phone.replace(/[^0-9]/g, "");

  return (
    <div className="space-y-8">
      <Link href="/" className="eyebrow inline-flex hover:brightness-125">
        ← Toutes les annonces
      </Link>

      {/* ---------- Garage header ---------- */}
      <section className="card reveal relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--saffron), transparent 70%)" }}
        />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <GarageAvatar name={garage.name} logoUrl={garage.logo_url} size={88} />
          <div className="min-w-0 flex-1">
            <span className="badge-verified">✦ Garage vérifié</span>
            <h1 className="font-display mt-2 text-4xl font-bold uppercase leading-none tracking-wide">
              {garage.name}
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              {garage.address}, {garage.city}
            </p>
            {garage.description && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                {garage.description}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 self-start sm:self-center">
            <a
              href={`https://wa.me/${waPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-whatsapp"
            >
              💬 WhatsApp
            </a>
            {isOwner && (
              <Link href="/garage/profile" className="btn-outline">
                ✎ Modifier mon profil
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- Inventory ---------- */}
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-2xl uppercase tracking-wide">Inventaire</h2>
        <span className="eyebrow">
          {garage.cars.length} véhicule{garage.cars.length > 1 ? "s" : ""}
        </span>
      </div>

      {garage.cars.length === 0 ? (
        <p className="py-12 text-center text-muted">
          Ce garage n&apos;a aucune annonce active pour le moment.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {garage.cars.map((car, i) => (
            <div
              key={car.id}
              className="reveal"
              style={{ animationDelay: `${Math.min(i * 60, 600)}ms` }}
            >
              <CarCard car={car} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
