"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { formatMileage, formatPrice, fuelLabel, transmissionLabel } from "@/lib/format";
import type { FuelType, Transmission } from "@/lib/types";
import { useAuthGuard } from "@/lib/useAuthGuard";

const FUELS: FuelType[] = ["petrol", "diesel", "hybrid", "electric", "lpg"];
const STEPS = ["Détails", "Caractéristiques", "Photos", "Publication"];

export default function AddCarWizard() {
  const ready = useAuthGuard("garage");
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
    price: "",
    mileage: "",
    fuel_type: "diesel" as FuelType,
    transmission: "manual" as Transmission,
    description: "",
  });
  const [files, setFiles] = useState<File[]>([]);

  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  function update(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  const stepValid = (() => {
    if (step === 0) return form.brand && form.model && form.year && form.price;
    if (step === 1) return form.mileage !== "";
    return true;
  })();

  function next() {
    if (!stepValid) {
      setError("Veuillez remplir les champs requis.");
      return;
    }
    setError("");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 8));
  }
  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function publish() {
    setLoading(true);
    setError("");
    try {
      const car = await api.createCar({
        brand: form.brand,
        model: form.model,
        year: Number(form.year),
        mileage: Number(form.mileage),
        fuel_type: form.fuel_type,
        transmission: form.transmission,
        price: Number(form.price),
        description: form.description || undefined,
      });
      if (files.length > 0) await api.uploadImages(car.id, files);
      router.push("/garage/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Publication impossible");
      setLoading(false);
    }
  }

  if (!ready) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <span className="eyebrow">Nouvelle annonce</span>
      <h1 className="font-display mt-1 text-3xl font-bold uppercase tracking-wide">
        Ajouter une voiture
      </h1>

      {/* Stepper */}
      <div className="mt-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-full text-sm font-bold transition ${
                  i < step
                    ? "bg-teal text-white"
                    : i === step
                    ? "bg-gradient-to-br from-brand to-brand-dark text-[#1a130a]"
                    : "bg-black/5 text-faint"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              <span className={`hidden text-xs font-semibold uppercase tracking-wider sm:block ${i === step ? "text-[var(--text)]" : "text-faint"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 ${i < step ? "bg-teal" : "bg-[var(--border)]"}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card mt-5 p-6">
        {/* Step 0 — Details */}
        {step === 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Marque *">
              <input className="input" value={form.brand} onChange={(e) => update("brand", e.target.value)} placeholder="Volkswagen" />
            </Field>
            <Field label="Modèle *">
              <input className="input" value={form.model} onChange={(e) => update("model", e.target.value)} placeholder="Golf 7" />
            </Field>
            <Field label="Année *">
              <input className="input" type="number" min={1950} max={2100} value={form.year} onChange={(e) => update("year", e.target.value)} placeholder="2019" />
            </Field>
            <Field label="Prix (MAD) *">
              <input className="input" type="number" min={0} value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="165000" />
            </Field>
          </div>
        )}

        {/* Step 1 — Specs */}
        {step === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Kilométrage (km) *">
              <input className="input" type="number" min={0} value={form.mileage} onChange={(e) => update("mileage", e.target.value)} placeholder="78000" />
            </Field>
            <Field label="Carburant">
              <select className="input" value={form.fuel_type} onChange={(e) => update("fuel_type", e.target.value)}>
                {FUELS.map((f) => <option key={f} value={f}>{fuelLabel(f)}</option>)}
              </select>
            </Field>
            <Field label="Boîte de vitesses">
              <select className="input" value={form.transmission} onChange={(e) => update("transmission", e.target.value)}>
                <option value="manual">Manuelle</option>
                <option value="automatic">Automatique</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description">
                <textarea className="input" rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Première main, carnet d'entretien complet…" />
              </Field>
            </div>
          </div>
        )}

        {/* Step 2 — Photos */}
        {step === 2 && (
          <div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-[var(--border-strong)] py-10 text-center text-faint transition hover:border-brand hover:text-saffron">
              <input type="file" accept="image/*,.heic,.heif" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
              <span className="block text-4xl">⬡</span>
              <span className="mt-2 block text-sm">Cliquez pour ajouter des photos ({files.length}/8)</span>
              <span className="mt-1 block text-xs">iPhone HEIC accepté · optimisé automatiquement</span>
            </label>
            {previews.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {previews.map((url, i) => (
                  <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-xl border hair">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-[#1a130a]">Couverture</span>}
                    <button type="button" onClick={() => removeFile(i)} className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Review */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border hair">
              {previews[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previews[0]} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="flex aspect-[16/9] items-center justify-center bg-black/[0.04] text-5xl text-faint">⬡</div>
              )}
            </div>
            <div>
              <p className="eyebrow">{form.brand}</p>
              <h2 className="font-display text-2xl uppercase tracking-wide">{form.brand} {form.model}</h2>
              <p className="price mt-1 text-2xl font-bold">{formatPrice(Number(form.price || 0))}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <Review label="Année" value={form.year} />
              <Review label="Km" value={formatMileage(Number(form.mileage || 0))} />
              <Review label="Carburant" value={fuelLabel(form.fuel_type)} />
              <Review label="Boîte" value={transmissionLabel(form.transmission)} />
            </div>
            <p className="text-sm text-faint">{files.length} photo{files.length > 1 ? "s" : ""} · {form.description ? "Description fournie" : "Sans description"}</p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {/* Nav */}
        <div className="mt-6 flex items-center justify-between gap-2">
          <button type="button" onClick={back} disabled={step === 0} className="btn-outline disabled:opacity-40">← Retour</button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary">Continuer →</button>
          ) : (
            <button type="button" onClick={publish} disabled={loading} className="btn-primary">
              {loading ? "Publication…" : "🚀 Publier l'annonce"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--surface-2)] p-3">
      <p className="text-xs uppercase tracking-wider text-faint">{label}</p>
      <p className="num mt-0.5 font-semibold">{value}</p>
    </div>
  );
}
