"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import GarageAvatar from "@/components/GarageAvatar";
import { api, ApiError } from "@/lib/api";
import type { Garage } from "@/lib/types";
import { useAuthGuard } from "@/lib/useAuthGuard";

const LocationField = dynamic(() => import("@/components/LocationField"), {
  ssr: false,
  loading: () => <div className="grid h-64 place-items-center rounded-xl bg-[var(--bg-2)] text-faint">Carte…</div>,
});

export default function GarageProfilePage() {
  const ready = useAuthGuard("garage");
  const [garage, setGarage] = useState<Garage | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    description: "",
  });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  function hydrate(g: Garage) {
    setGarage(g);
    setForm({
      name: g.name,
      phone: g.phone,
      city: g.city,
      address: g.address,
      description: g.description || "",
    });
    setCoords({ lat: g.latitude ?? null, lng: g.longitude ?? null });
  }

  useEffect(() => {
    if (!ready) return;
    api
      .myGarage()
      .then(hydrate)
      .catch(() => setError("Erreur de chargement."))
      .finally(() => setLoading(false));
  }, [ready]);

  function update(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api.updateGarage({
        name: form.name,
        phone: form.phone,
        city: form.city,
        address: form.address,
        description: form.description,
        ...(coords.lat != null && coords.lng != null
          ? { latitude: coords.lat, longitude: coords.lng }
          : {}),
      });
      hydrate(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function onLogoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoBusy(true);
    setError("");
    try {
      const updated = await api.uploadLogo(file);
      setGarage(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec du téléversement du logo.");
    } finally {
      setLogoBusy(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  }

  if (!ready) return null;
  if (loading) return <p className="py-20 text-center text-muted">Chargement…</p>;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link href="/garage/dashboard" className="eyebrow inline-flex hover:brightness-110">
        ← Tableau de bord
      </Link>

      <div>
        <span className="eyebrow">Profil du garage</span>
        <h1 className="font-display mt-1 text-3xl font-bold uppercase tracking-wide">
          Modifier mon profil
        </h1>
      </div>

      {/* ---------- Logo ---------- */}
      <div className="card flex items-center gap-4 p-5">
        <div className="relative">
          <GarageAvatar name={garage?.name || "?"} logoUrl={garage?.logo_url} size={72} />
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            disabled={logoBusy}
            title="Changer le logo"
            className="absolute -bottom-1.5 -right-1.5 grid h-7 w-7 place-items-center rounded-full border border-[var(--bg)] bg-gradient-to-br from-brand to-brand-dark text-[#1a130a] shadow transition hover:scale-110 disabled:opacity-50"
          >
            {logoBusy ? "…" : "✎"}
          </button>
          <input
            ref={logoInput}
            type="file"
            accept="image/*,.heic,.heif"
            className="hidden"
            onChange={onLogoPicked}
          />
        </div>
        <div>
          <p className="font-semibold">Logo du garage</p>
          <p className="text-sm text-faint">
            Cliquez sur ✎ pour téléverser ou remplacer votre logo (iPhone HEIC inclus).
          </p>
        </div>
      </div>

      {/* ---------- Location ---------- */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="font-semibold">Emplacement sur la carte</p>
            <p className="text-sm text-faint">
              Cliquez sur la carte pour situer votre garage — il apparaîtra aux acheteurs.
            </p>
          </div>
          <span className="num text-xs text-faint">
            {coords.lat != null && coords.lng != null
              ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`
              : "Non défini"}
          </span>
        </div>
        <LocationField
          value={{ lat: coords.lat, lng: coords.lng, address: form.address, city: form.city }}
          onChange={(v) => {
            setCoords({ lat: v.lat, lng: v.lng });
            setForm((p) => ({ ...p, address: v.address || p.address, city: v.city || p.city }));
            setSaved(false);
          }}
        />
      </div>

      {/* ---------- Details ---------- */}
      <form onSubmit={onSave} className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">Nom du garage</label>
          <input
            className="input"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
          />
        </div>
        <div>
          <label className="label">WhatsApp / Téléphone</label>
          <input
            className="input"
            required
            placeholder="212661112233"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ville</label>
          <input
            className="input"
            required
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Adresse</label>
          <input
            className="input"
            required
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea
            className="input"
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>

        {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
        {saved && (
          <p className="sm:col-span-2 text-sm text-teal">✓ Profil enregistré.</p>
        )}

        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          {garage && (
            <Link href={`/garages/${garage.id}`} className="btn-outline">
              Voir mon profil public
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
