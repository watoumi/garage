"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import AddressAutocomplete from "@/components/AddressAutocomplete";
import GarageAvatar from "@/components/GarageAvatar";
import type { MapGarage } from "@/components/NearbyMap";
import { api } from "@/lib/api";
import { haversineKm } from "@/lib/geo";
import { cityCoords, POPULAR_CITIES } from "@/lib/morocco";

const NearbyMap = dynamic(() => import("@/components/NearbyMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center bg-[var(--bg-2)] text-faint">Chargement de la carte…</div>
  ),
});

const RADII = [5, 10, 25, 50];
type Mode = "nearby" | "all";

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

export default function GarageFinder() {
  const [mode, setMode] = useState<Mode>("nearby");
  const [user, setUser] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(true);
  const [denied, setDenied] = useState(false);
  const [radius, setRadius] = useState(10);
  const [garages, setGarages] = useState<MapGarage[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const locate = useCallback(() => {
    setLocating(true);
    setDenied(false);
    if (!("geolocation" in navigator)) {
      setLocating(false);
      setDenied(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUser([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        setLocating(false);
        setDenied(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    locate();
  }, [locate]);

  // Load garages whenever the mode, location, or radius changes (no reloads).
  useEffect(() => {
    if (mode === "nearby") {
      if (!user) return;
      setLoading(true);
      api
        .nearbyGarages(user[0], user[1], radius)
        .then(setGarages)
        .catch(() => setGarages([]))
        .finally(() => setLoading(false));
    } else {
      setLoading(true);
      api
        .listGarages(100)
        .then((list) => {
          let g: MapGarage[] = list.filter((x) => x.latitude != null && x.longitude != null);
          if (user) {
            g = g
              .map((x) => ({ ...x, distance_km: haversineKm(user[0], user[1], x.latitude!, x.longitude!) }))
              .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));
          } else {
            g = [...g].sort((a, b) => b.car_count - a.car_count);
          }
          setGarages(g);
        })
        .catch(() => setGarages([]))
        .finally(() => setLoading(false));
    }
  }, [mode, user, radius]);

  useEffect(() => {
    if (activeId != null) itemRefs.current[activeId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activeId]);

  function goNearby() {
    setMode("nearby");
    if (!user) locate();
  }

  // ---------- Location gate (nearby mode, no fix yet) ----------
  if (mode === "nearby" && !user) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <div className="card p-7 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-dark text-2xl text-[#1a130a]">📍</div>
          <h1 className="font-display mt-4 text-2xl uppercase tracking-wide">
            {locating ? "Localisation en cours…" : "Trouvez les garages près de vous"}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {denied
              ? "Accès à la localisation refusé. Cherchez votre ville, ou parcourez tout le Maroc."
              : "Autorisez l'accès à votre position pour découvrir les garages vérifiés autour de vous."}
          </p>
          {!locating && (
            <>
              {!denied && (
                <button onClick={locate} className="btn-primary mt-5">Activer ma localisation</button>
              )}
              <div className="mt-5">
                <AddressAutocomplete placeholder="Chercher une ville ou une adresse…" onSelect={(r) => setUser([r.lat, r.lng])} />
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {POPULAR_CITIES.slice(0, 4).map((c) => {
                  const cc = cityCoords(c);
                  return cc ? (
                    <button key={c} onClick={() => setUser(cc)} className="chip hover:border-[var(--saffron)]">📍 {c}</button>
                  ) : null;
                })}
              </div>
              <div className="mt-5 border-t hair pt-4">
                <button onClick={() => setMode("all")} className="btn-outline">
                  🗺 Parcourir tout le Maroc
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const headline =
    mode === "nearby"
      ? `${garages.length} garage${garages.length > 1 ? "s" : ""} à ${radius} km`
      : `${garages.length} garage${garages.length > 1 ? "s" : ""} au Maroc`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">{mode === "nearby" ? "Près de vous" : "Tout le Maroc"}</span>
          <h1 className="font-display text-2xl uppercase tracking-wide">{loading ? "Recherche…" : headline}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Mode toggle */}
          <div className="flex overflow-hidden rounded-lg border hair">
            <button onClick={goNearby} className={`px-3 py-2 text-sm font-semibold transition ${mode === "nearby" ? "bg-brand text-[#1a130a]" : "text-muted hover:bg-[var(--bg-2)]"}`}>
              📍 Près de moi
            </button>
            <button onClick={() => setMode("all")} className={`px-3 py-2 text-sm font-semibold transition ${mode === "all" ? "bg-brand text-[#1a130a]" : "text-muted hover:bg-[var(--bg-2)]"}`}>
              🗺 Tout le Maroc
            </button>
          </div>
          {/* Radius (nearby only) */}
          {mode === "nearby" && (
            <div className="flex overflow-hidden rounded-lg border hair">
              {RADII.map((r) => (
                <button key={r} onClick={() => setRadius(r)} className={`px-3 py-2 text-sm font-semibold transition ${r === radius ? "bg-brand text-[#1a130a]" : "text-muted hover:bg-[var(--bg-2)]"}`}>
                  {r}km
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid h-[74vh] min-h-[520px] grid-cols-1 gap-4 lg:grid-cols-2">
        {/* LEFT: garage list */}
        <div className={`flex-col overflow-hidden ${view === "map" ? "hidden lg:flex" : "flex"}`}>
          <div className="space-y-3 overflow-y-auto pr-1" onMouseLeave={() => setActiveId(null)}>
            {!loading && garages.length === 0 && (
              <div className="card p-10 text-center text-muted">
                {mode === "nearby"
                  ? `Aucun garage dans un rayon de ${radius} km. Élargissez le rayon ou parcourez tout le Maroc.`
                  : "Aucun garage à afficher."}
              </div>
            )}
            {garages.map((g) => (
              <div
                key={g.id}
                ref={(el) => {
                  itemRefs.current[g.id] = el;
                }}
                onMouseEnter={() => setActiveId(g.id)}
                onClick={() => setActiveId(g.id)}
                className={`card flex cursor-pointer gap-3 p-3 transition ${g.id === activeId ? "ring-2 ring-[var(--saffron)]" : ""}`}
              >
                <div className="relative h-24 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-black/[0.04]">
                  {g.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.cover_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center">
                      <GarageAvatar name={g.name} logoUrl={g.logo_url} size={44} />
                    </div>
                  )}
                  {g.cover_url && g.logo_url && (
                    <span className="absolute bottom-1.5 left-1.5">
                      <GarageAvatar name={g.name} logoUrl={g.logo_url} size={26} />
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-display truncate text-lg leading-tight tracking-wide">{g.name}</p>
                    {g.distance_km != null && (
                      <span className="num flex-shrink-0 rounded-md bg-brand/15 px-2 py-0.5 text-xs font-semibold text-saffron">
                        {g.distance_km.toFixed(1)} km
                      </span>
                    )}
                  </div>
                  <p className="num mt-0.5 text-xs text-faint">
                    {g.city} · 🚗 {g.car_count} voiture{g.car_count > 1 ? "s" : ""}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="badge-verified">✦ Vérifié</span>
                    <Link href={`/garages/${g.id}`} className="btn-primary ml-auto !py-1.5 text-xs" onClick={(e) => e.stopPropagation()}>
                      Inventaire
                    </Link>
                    <a href={waLink(g.phone)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="btn-whatsapp !px-3 !py-1.5 text-xs">
                      💬
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: map */}
        <div className={`overflow-hidden rounded-2xl border hair ${view === "list" ? "hidden lg:block" : "block"}`}>
          <NearbyMap
            user={user}
            radiusKm={mode === "nearby" ? radius : undefined}
            garages={garages}
            activeId={activeId}
            onSelect={setActiveId}
          />
        </div>
      </div>

      <button onClick={() => setView((v) => (v === "list" ? "map" : "list"))} className="btn-primary fixed bottom-5 left-1/2 z-40 -translate-x-1/2 shadow-lg lg:hidden">
        {view === "list" ? "🗺 Voir la carte" : "☰ Voir la liste"}
      </button>
    </div>
  );
}
