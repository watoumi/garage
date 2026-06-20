"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card, CardBody, CardHeader, CardTitle, DashboardShell, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import type { GarageAnalytics } from "@/lib/types";
import { useAuthGuard } from "@/lib/useAuthGuard";

const NAV = [
  { href: "/garage/dashboard", label: "Inventaire", icon: "🚗" },
  { href: "/garage/analytics", label: "Statistiques", icon: "📊" },
  { href: "/garage/profile", label: "Profil", icon: "🏢" },
];

export default function AnalyticsPage() {
  const ready = useAuthGuard("garage");
  const [stats, setStats] = useState<GarageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    api.analytics().then(setStats).catch(() => setStats(null)).finally(() => setLoading(false));
  }, [ready]);

  if (!ready) return null;

  const conversion = stats && stats.total_views > 0 ? (stats.total_leads / stats.total_views) * 100 : 0;
  const maxViews = stats ? Math.max(...stats.per_car.map((c) => c.views), 1) : 1;

  return (
    <DashboardShell
      nav={NAV}
      eyebrow="Mon espace"
      title="Statistiques"
      actions={<Link href="/garage/add-car" className="btn-primary">+ Ajouter une voiture</Link>}
    >
      {loading ? (
        <p className="text-muted">Chargement…</p>
      ) : !stats ? (
        <p className="card p-10 text-center text-muted">Statistiques indisponibles.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Annonces actives"
              value={`${stats.active_listings}/${stats.total_listings}`}
              icon="🚗"
            />
            <StatCard label="Vues totales" value={stats.total_views.toLocaleString("fr-FR")} icon="👁" />
            <StatCard
              label="Leads WhatsApp"
              value={stats.total_leads}
              delta={{ value: `${stats.leads_last_7d} cette semaine`, positive: true }}
              icon="💬"
            />
            <StatCard label="Taux de conversion" value={`${conversion.toFixed(1)}%`} icon="⚡" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance par véhicule</CardTitle>
              <span className="text-xs text-faint">Vues &amp; leads WhatsApp</span>
            </CardHeader>
            <CardBody className="space-y-4">
              {stats.per_car.length === 0 ? (
                <p className="py-6 text-center text-muted">Pas encore de données. Publiez une annonce pour commencer à mesurer la demande.</p>
              ) : (
                stats.per_car.map((c) => (
                  <div key={c.car_id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <Link href={`/car/${c.car_id}`} className="font-display truncate tracking-tight hover:text-accent">
                        {c.label}
                      </Link>
                      <span className="num shrink-0 text-faint">
                        {c.views} vues · <span className="font-semibold text-accent-deep">{c.leads} leads</span>
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-deep"
                        style={{ width: `${(c.views / maxViews) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
