"use client";

// Lightweight client-only favorites (Airbnb-style heart), persisted in localStorage.
const KEY = "garage_favorites";

export function getFavorites(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function isFavorite(id: number): boolean {
  return getFavorites().includes(id);
}

export function toggleFavorite(id: number): boolean {
  const favs = getFavorites();
  const next = favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id];
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("favchange"));
  return next.includes(id);
}
