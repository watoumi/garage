"use client";

import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Car, Garage } from "@/lib/types";
import { useAuthGuard } from "@/lib/useAuthGuard";

type Tab = "garages" | "cars";

export default function AdminDashboard() {
  const ready = useAuthGuard("admin");
  const [tab, setTab] = useState<Tab>("garages");
  const [garages, setGarages] = useState<Garage[]>([]);
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const [g, c] = await Promise.all([api.adminGarages(), api.adminCars()]);
    setGarages(g);
    setCars(c);
    setLoading(false);
  }

  useEffect(() => {
    if (ready) reload();
  }, [ready]);

  async function approve(g: Garage, value: boolean) {
    const updated = await api.approveGarage(g.id, value);
    setGarages((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
  }
  async function disable(g: Garage, value: boolean) {
    const updated = await api.disableGarage(g.id, value);
    setGarages((prev) => prev.map((x) => (x.id === g.id ? updated : x)));
  }
  async function deleteCar(id: number) {
    if (!confirm("Supprimer définitivement cette annonce ?")) return;
    await api.adminDeleteCar(id);
    setCars((prev) => prev.filter((c) => c.id !== id));
  }

  if (!ready) return null;

  const pending = garages.filter((g) => !g.is_approved).length;

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow">Console</span>
        <h1 className="font-display mt-1 text-4xl font-bold uppercase tracking-wide">
          Administration
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Garages" value={garages.length} />
        <Stat label="En attente" value={pending} highlight={pending > 0} />
        <Stat label="Annonces" value={cars.length} />
      </div>

      <div className="flex gap-1 border-b hair">
        <TabButton active={tab === "garages"} onClick={() => setTab("garages")}>
          Garages
        </TabButton>
        <TabButton active={tab === "cars"} onClick={() => setTab("cars")}>
          Annonces
        </TabButton>
      </div>

      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : tab === "garages" ? (
        <div className="card overflow-hidden">
          {garages.map((g) => (
            <div
              key={g.id}
              className="flex flex-wrap items-center gap-3 p-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:hair"
            >
              <div className="min-w-0 flex-1">
                <p className="font-display text-lg tracking-wide">
                  {g.name}{" "}
                  {g.is_disabled && (
                    <span className="ml-1 rounded-md bg-red-100 px-2 py-0.5 text-xs text-red-700">
                      désactivé
                    </span>
                  )}
                </p>
                <p className="num text-sm text-faint">
                  {g.city} · {g.phone} · {g.address}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  g.is_approved
                    ? "bg-teal-50 text-teal"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {g.is_approved ? "✦ Approuvé" : "● En attente"}
              </span>
              <div className="flex gap-2">
                {g.is_approved ? (
                  <button onClick={() => approve(g, false)} className="btn-outline text-sm">
                    Révoquer
                  </button>
                ) : (
                  <button onClick={() => approve(g, true)} className="btn-primary text-sm">
                    Approuver
                  </button>
                )}
                {g.is_disabled ? (
                  <button onClick={() => disable(g, false)} className="btn-outline text-sm">
                    Réactiver
                  </button>
                ) : (
                  <button onClick={() => disable(g, true)} className="btn-danger text-sm">
                    Désactiver
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {cars.map((car) => (
            <div
              key={car.id}
              className="flex items-center gap-4 p-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:hair"
            >
              <div className="h-14 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-black/[0.04]">
                {car.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={car.images[0].url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl text-faint">
                    ⬡
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg tracking-wide">
                  {car.brand} {car.model} · <span className="num">{car.year}</span>
                </p>
                <p className="num text-sm text-faint">
                  {formatPrice(car.price)} · {car.garage.name} ({car.garage.city})
                </p>
              </div>
              <button onClick={() => deleteCar(car.id)} className="btn-danger text-sm">
                Supprimer
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="card p-5 text-center">
      <p className={`num text-3xl font-bold ${highlight ? "text-saffron" : "text-[var(--text)]"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wider text-faint">{label}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition ${
        active
          ? "border-brand text-saffron"
          : "border-transparent text-faint hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
