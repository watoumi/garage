"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { formatPrice, fuelLabel } from "@/lib/format";
import type { Car, FuelType, Transmission } from "@/lib/types";
import { useAuthGuard } from "@/lib/useAuthGuard";

const MAX_IMAGES = 8;
const FUELS: FuelType[] = ["petrol", "diesel", "hybrid", "electric", "lpg"];

const emptyForm = {
  brand: "",
  model: "",
  year: "",
  mileage: "",
  fuel_type: "diesel" as FuelType,
  transmission: "manual" as Transmission,
  price: "",
  description: "",
};

export default function ManageListingPage({ params }: { params: { id: string } }) {
  const ready = useAuthGuard("garage");
  const router = useRouter();
  const carId = Number(params.id);

  const [car, setCar] = useState<Car | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function hydrate(c: Car) {
    setCar(c);
    setForm({
      brand: c.brand,
      model: c.model,
      year: String(c.year),
      mileage: String(c.mileage),
      fuel_type: c.fuel_type,
      transmission: c.transmission,
      price: String(c.price),
      description: c.description || "",
    });
  }

  function update(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!car) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await api.updateCar(car.id, {
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        mileage: Number(form.mileage),
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        price: Number(form.price),
        description: form.description || undefined,
      });
      setCar({ ...updated, images: car.images });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function load() {
    setLoading(true);
    try {
      // Use the owner listing endpoint so it works even before approval.
      const mine = await api.myCars();
      const found = mine.find((c) => c.id === carId) || null;
      if (found) hydrate(found);
      else setError("Annonce introuvable.");
    } catch {
      setError("Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  async function onAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0 || !car) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.uploadImages(car.id, files);
      setCar(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Échec du téléversement.");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function removePhoto(imageId: number) {
    if (!car) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteImage(car.id, imageId);
      setCar({ ...car, images: car.images.filter((im) => im.id !== imageId) });
    } catch {
      setError("Échec de la suppression.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (loading) return <p className="py-20 text-center text-muted">Chargement…</p>;

  if (!car) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">{error || "Annonce introuvable."}</p>
        <Link href="/garage/dashboard" className="btn-primary mt-6">
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const remaining = MAX_IMAGES - car.images.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/garage/dashboard" className="eyebrow inline-flex hover:brightness-110">
        ← Tableau de bord
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="eyebrow">Gérer l&apos;annonce</span>
          <h1 className="font-display mt-1 text-3xl font-bold uppercase tracking-wide">
            {car.brand} {car.model} · <span className="num">{car.year}</span>
          </h1>
          <p className="num mt-1 text-sm text-faint">{formatPrice(car.price)}</p>
        </div>
        <Link href={`/car/${car.id}`} className="btn-outline text-sm">
          Voir l&apos;annonce
        </Link>
      </div>

      {/* ---------- Edit details ---------- */}
      <form onSubmit={saveDetails} className="card grid grid-cols-1 gap-4 p-6 sm:grid-cols-2">
        <p className="label !mb-0 sm:col-span-2">Détails du véhicule</p>
        <div>
          <label className="label">Marque</label>
          <input className="input" required value={form.brand} onChange={(e) => update("brand", e.target.value)} />
        </div>
        <div>
          <label className="label">Modèle</label>
          <input className="input" required value={form.model} onChange={(e) => update("model", e.target.value)} />
        </div>
        <div>
          <label className="label">Année</label>
          <input className="input" type="number" min={1950} max={2100} required value={form.year} onChange={(e) => update("year", e.target.value)} />
        </div>
        <div>
          <label className="label">Kilométrage (km)</label>
          <input className="input" type="number" min={0} required value={form.mileage} onChange={(e) => update("mileage", e.target.value)} />
        </div>
        <div>
          <label className="label">Carburant</label>
          <select className="input" value={form.fuel_type} onChange={(e) => update("fuel_type", e.target.value)}>
            {FUELS.map((f) => <option key={f} value={f}>{fuelLabel(f)}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Boîte de vitesses</label>
          <select className="input" value={form.transmission} onChange={(e) => update("transmission", e.target.value)}>
            <option value="manual">Manuelle</option>
            <option value="automatic">Automatique</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">Prix (MAD)</label>
          <input className="input" type="number" min={0} required value={form.price} onChange={(e) => update("price", e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Description</label>
          <textarea className="input" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer les modifications"}
          </button>
          {saved && <span className="text-sm text-teal">✓ Modifications enregistrées.</span>}
        </div>
      </form>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="label !mb-0">
            Photos · <span className="num">{car.images.length}/{MAX_IMAGES}</span>
          </p>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy || remaining <= 0}
            className="btn-primary text-sm"
          >
            {busy ? "…" : remaining <= 0 ? "Limite atteinte" : "+ Ajouter des photos"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,.heic,.heif"
            multiple
            className="hidden"
            onChange={onAdd}
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {car.images.length === 0 ? (
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="mt-4 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-strong)] py-12 text-faint transition hover:border-brand hover:text-saffron"
          >
            <span className="text-4xl">⬡</span>
            <span className="text-sm">Cliquez pour ajouter plusieurs photos</span>
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {car.images.map((img, i) => (
              <div
                key={img.id}
                className="group relative aspect-[4/3] overflow-hidden rounded-xl border hair"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                {i === 0 && (
                  <span className="absolute left-2 top-2 rounded-md bg-brand px-2 py-0.5 text-xs font-semibold text-[#1a130a]">
                    Couverture
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(img.id)}
                  disabled={busy}
                  title="Supprimer"
                  className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition hover:bg-red-600 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-faint">
          La première photo sert de couverture. Formats téléphone acceptés (iPhone
          HEIC inclus), optimisés automatiquement.
        </p>
      </div>
    </div>
  );
}
