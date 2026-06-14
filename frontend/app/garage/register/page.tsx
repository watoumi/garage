"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { LocationValue } from "@/components/LocationField";
import { api, ApiError } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

const LocationField = dynamic(() => import("@/components/LocationField"), {
  ssr: false,
  loading: () => <div className="grid h-64 place-items-center rounded-xl bg-[var(--bg-2)] text-faint">Carte…</div>,
});

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    city: "",
    address: "",
    description: "",
  });
  const [loc, setLoc] = useState<LocationValue>({ lat: null, lng: null, address: "", city: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function onLocation(v: LocationValue) {
    setLoc(v);
    setForm((p) => ({ ...p, address: v.address || p.address, city: v.city || p.city }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (loc.lat == null || loc.lng == null) {
      setError("Veuillez localiser votre garage sur la carte (recherche d'adresse).");
      return;
    }
    setLoading(true);
    try {
      const res = await api.register({ ...form, latitude: loc.lat, longitude: loc.lng });
      saveAuth(res.access_token, res.role);
      router.push("/garage/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Inscription impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="card reveal p-7">
        <span className="eyebrow">Rejoindre le réseau</span>
        <h1 className="font-display mt-2 text-3xl font-bold uppercase tracking-wide">
          Inscrire mon garage
        </h1>
        <p className="mt-1 text-sm text-muted">
          Recherchez l&apos;adresse de votre garage et ajustez le marqueur — c&apos;est
          ce point exact qui apparaîtra sur la carte.
        </p>

        <form onSubmit={onSubmit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label">Nom du garage *</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              className="input"
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Mot de passe *</label>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
            />
          </div>
          <div>
            <label className="label">WhatsApp (ex: 2126XXXXXXXX) *</label>
            <input
              className="input"
              required
              placeholder="212661112233"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Emplacement du garage *</label>
            <LocationField value={loc} onChange={onLocation} />
          </div>
          <div>
            <label className="label">Ville *</label>
            <input
              className="input"
              required
              value={form.city}
              placeholder="Auto-rempli depuis l'adresse"
              onChange={(e) => update("city", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Adresse *</label>
            <input
              className="input"
              required
              value={form.address}
              placeholder="Auto-rempli depuis la recherche"
              onChange={(e) => update("address", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description (optionnel)</label>
            <textarea
              className="input"
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="btn-primary sm:col-span-2"
            disabled={loading}
          >
            {loading ? "Création..." : "Créer mon compte garage"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-faint">
          Déjà inscrit ?{" "}
          <Link href="/garage/login" className="text-saffron hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
