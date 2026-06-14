"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { saveAuth } from "@/lib/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const expired = useSearchParams().get("expired");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(email, password);
      saveAuth(res.access_token, res.role);
      router.push(res.role === "admin" ? "/admin/dashboard" : "/garage/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="card reveal p-7">
        <span className="eyebrow">Espace pro</span>
        <h1 className="font-display mt-2 text-3xl font-bold uppercase tracking-wide">
          Connexion
        </h1>
        <p className="mt-1 text-sm text-muted">Garages et administration.</p>

        {expired && (
          <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Votre session a expiré. Reconnectez-vous pour continuer.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input
              className="input"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-faint">
          Pas encore de compte ?{" "}
          <Link href="/garage/register" className="text-saffron hover:underline">
            Inscrire mon garage
          </Link>
        </p>
      </div>
    </div>
  );
}
