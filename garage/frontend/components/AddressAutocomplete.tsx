"use client";

import { useEffect, useRef, useState } from "react";

export interface PlaceResult {
  lat: number;
  lng: number;
  address: string;
  city: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address?: Record<string, string>;
}

function cityFrom(a: Record<string, string> = {}): string {
  return a.city || a.town || a.village || a.municipality || a.county || a.state || "";
}

// OpenStreetMap Nominatim geocoder — no API key. (Swap the URL for the Google
// Places endpoint here if you add a billing-enabled key later.)
const ENDPOINT = "https://nominatim.openstreetmap.org/search";

export default function AddressAutocomplete({
  initial,
  onSelect,
  placeholder = "Rechercher votre adresse…",
}: {
  initial?: string;
  onSelect: (r: PlaceResult) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState(initial || "");
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => setQ(initial || ""), [initial]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function handleChange(v: string) {
    setQ(v);
    clearTimeout(timer.current);
    if (v.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(() => search(v), 450); // debounce (respect Nominatim rate limits)
  }

  async function search(v: string) {
    setLoading(true);
    try {
      const url = `${ENDPOINT}?format=jsonv2&addressdetails=1&limit=6&countrycodes=ma&q=${encodeURIComponent(v)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function pick(r: NominatimResult) {
    const result: PlaceResult = {
      lat: parseFloat(r.lat),
      lng: parseFloat(r.lon),
      address: r.display_name,
      city: cityFrom(r.address),
    };
    setQ(r.display_name);
    setOpen(false);
    onSelect(result);
  }

  return (
    <div ref={box} className="relative">
      <input
        className="input"
        value={q}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        autoComplete="off"
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-faint">…</span>}
      {open && results.length > 0 && (
        <ul className="absolute z-[1100] mt-1 max-h-64 w-full overflow-auto rounded-xl border hair bg-[var(--surface)] shadow-lg">
          {results.map((r, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => pick(r)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-2)]"
              >
                <span className="mt-0.5 text-saffron">📍</span>
                <span className="leading-snug">{r.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
