"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import GarageAvatar from "@/components/GarageAvatar";
import { DashboardShell, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { formatMileage, formatPrice } from "@/lib/format";
import type { Car, Garage, GarageAnalytics, Lead } from "@/lib/types";
import { useAuthGuard } from "@/lib/useAuthGuard";

type Tab = "inventory" | "leads";

const NAV = [
  { href: "/garage/dashboard", label: "Inventaire", icon: "🚗" },
  { href: "/garage/analytics", label: "Statistiques", icon: "📊" },
  { href: "/garage/profile", label: "Profil", icon: "🏢" },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

export default function GarageDashboard() {
  const ready = useAuthGuard("garage");
  const [garage, setGarage] = useState<Garage | null>(null);
  const [cars, setCars] = useState<Car[]>([]);
  const [stats, setStats] = useState<GarageAnalytics | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<Tab>("inventory");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  async function reload() {
    setLoading(true);
    try {
      const [g, c, a, l] = await Promise.all([
        api.myGarage(),
        api.myCars(),
        api.analytics(),
        api.leads(),
      ]);
      setGarage(g);
      setCars(c);
      setStats(a);
      setLeads(l);
    } catch {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function remove(id: number) {
    if (!confirm("Supprimer cette annonce ?")) return;
    await api.deleteCar(id);
    setCars((prev) => prev.filter((c) => c.id !== id));
  }
  async function toggleActive(car: Car) {
    const updated = await api.updateCar(car.id, { is_active: !car.is_active });
    setCars((prev) => prev.map((c) => (c.id === car.id ? updated : c)));
  }
  async function onLogoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    try {
      setGarage(await api.uploadLogo(file));
    } finally {
      setLogoBusy(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  if (!ready) return null;

  return (
    <DashboardShell
      nav={NAV}
      eyebrow="Mon espace"
      title={garage?.name || "Tableau de bord"}
      actions={
        <>
          <Link href="/garage/profile" className="btn-outline">Modifier le profil</Link>
          <Link href="/garage/add-car" className="btn-primary">+ Ajouter une voiture</Link>
        </>
      }
    >
      <div className="space-y-6">
        {/* Identity + approval state */}
        <div className="flex items-center gap-4">
          {garage && (
            <div className="relative">
              <GarageAvatar name={garage.name} logoUrl={garage.logo_url} size={56} />
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                disabled={logoBusy}
                title="Changer le logo"
                className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border border-[var(--bg)] bg-gradient-to-br from-brand to-brand-dark text-white shadow transition hover:scale-110 disabled:opacity-50"
              >
                {logoBusy ? "…" : "✎"}
              </button>
              <input ref={logoInput} type="file" accept="image/*,.heic,.heif" className="hidden" onChange={onLogoPicked} />
            </div>
          )}
          {garage && <p className="num text-sm text-faint">{garage.city} · {garage.phone}</p>}
        </div>

        {garage && !garage.is_approved && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
            ⏳ Votre garage est <b>en attente de validation</b>. Vos annonces ne seront visibles
            publiquement qu&apos;après approbation par un administrateur.
          </div>
        )}
        {garage?.is_disabled && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            🚫 Votre garage a été désactivé. Contactez l&apos;administration.
          </div>
        )}

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <StatCard label="Annonces actives" value={stats ? `${stats.active_listings}/${stats.total_listings}` : "—"} icon="🚗" />
          <StatCard label="Vues totales" value={stats?.total_views ?? "—"} icon="👁" />
          <StatCard label="Leads WhatsApp" value={stats?.total_leads ?? "—"} icon="💬" />
          <StatCard
            label="Leads (7 j)"
            value={stats?.leads_last_7d ?? "—"}
            icon="⚡"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between border-b hair">
          <div className="flex gap-1">
            <TabBtn active={tab === "inventory"} onClick={() => setTab("inventory")}>Inventaire</TabBtn>
            <TabBtn active={tab === "leads"} onClick={() => setTab("leads")}>
              Leads{leads.length ? ` (${leads.length})` : ""}
            </TabBtn>
          </div>
          <Link href="/garage/analytics" className="pb-2 text-xs font-semibold text-muted transition hover:text-accent">
            Voir les statistiques détaillées →
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-muted">Chargement…</p>
        ) : tab === "inventory" ? (
          <InventoryTab cars={cars} onToggle={toggleActive} onRemove={remove} />
        ) : (
          <LeadsTab leads={leads} />
        )}
      </div>
    </DashboardShell>
  );
}

/* ---------------- Tabs ---------------- */
function InventoryTab({
  cars,
  onToggle,
  onRemove,
}: {
  cars: Car[];
  onToggle: (c: Car) => void;
  onRemove: (id: number) => void;
}) {
  if (cars.length === 0) {
    return (
      <div className="card p-12 text-center text-muted">
        Vous n&apos;avez pas encore d&apos;annonce.{" "}
        <Link href="/garage/add-car" className="text-saffron hover:underline">Ajoutez votre première voiture</Link>.
      </div>
    );
  }
  return (
    <div className="card overflow-hidden">
      {cars.map((car) => (
        <div key={car.id} className="flex items-center gap-4 p-4 [&:not(:first-child)]:border-t [&:not(:first-child)]:hair">
          <div className="h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-black/[0.04]">
            {car.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={car.images[0].url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl text-faint">⬡</div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-display truncate text-lg tracking-tight">
              {car.brand} {car.model} · <span className="num">{car.year}</span>
            </p>
            <p className="num text-sm text-muted">{formatPrice(car.price)} · {formatMileage(car.mileage)}</p>
            <div className="mt-1 flex items-center gap-2 text-xs">
              <span className={`rounded-md px-2 py-0.5 ${car.is_active ? "bg-success/15 text-teal" : "bg-black/5 text-faint"}`}>
                {car.is_active ? "● Active" : "○ Masquée"}
              </span>
              <span className="num text-faint">👁 {car.views}</span>
            </div>
          </div>
          <div className="flex flex-shrink-0 flex-wrap justify-end gap-2">
            <Link href={`/garage/cars/${car.id}`} className="btn-outline text-sm">✏️ Modifier · {car.images.length} 📷</Link>
            <button onClick={() => onToggle(car)} className="btn-outline text-sm">{car.is_active ? "Masquer" : "Publier"}</button>
            <button onClick={() => onRemove(car.id)} className="btn-danger text-sm">Supprimer</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadsTab({ leads }: { leads: Lead[] }) {
  if (leads.length === 0) {
    return (
      <p className="card p-10 text-center text-muted">
        Aucun lead pour le moment. Chaque clic sur « Contacter sur WhatsApp » apparaîtra ici.
      </p>
    );
  }
  return (
    <div className="card overflow-hidden">
      {leads.map((l) => (
        <Link
          key={l.id}
          href={`/car/${l.car_id}`}
          className="flex items-center gap-3 p-4 transition hover:bg-[var(--bg-2)] [&:not(:first-child)]:border-t [&:not(:first-child)]:hair"
        >
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[#25d366]/15 text-[#1faf52]">💬</span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">Contact WhatsApp</p>
            <p className="truncate text-sm text-faint">{l.car_label}</p>
          </div>
          <span className="num flex-shrink-0 text-xs text-faint">{timeAgo(l.created_at)}</span>
        </Link>
      ))}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition ${
        active ? "border-accent text-accent" : "border-transparent text-faint hover:text-[var(--text)]"
      }`}
    >
      {children}
    </button>
  );
}
