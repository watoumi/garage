"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatMileage, formatPrice, fuelLabel } from "@/lib/format";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import type { Car } from "@/lib/types";

export default function CarCard({ car }: { car: Car }) {
  const images = car.images;
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);

  useEffect(() => {
    setFav(isFavorite(car.id));
    const sync = () => setFav(isFavorite(car.id));
    window.addEventListener("favchange", sync);
    return () => window.removeEventListener("favchange", sync);
  }, [car.id]);

  function step(e: React.MouseEvent, dir: number) {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => (i + dir + images.length) % images.length);
  }
  function heart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setFav(toggleFavorite(car.id));
  }

  return (
    <Link href={`/car/${car.id}`} className="group block">
      {/* ---------- Image ---------- */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black/[0.04]">
        {images[idx] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[idx].url}
            alt={`${car.brand} ${car.model}`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl text-faint">⬡</div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

        {/* Favorite heart */}
        <button
          onClick={heart}
          aria-label="Favori"
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full text-lg transition hover:scale-110"
          style={{ color: fav ? "var(--saffron)" : "#fff", filter: "drop-shadow(0 1px 2px rgba(0,0,0,.5))" }}
        >
          {fav ? "♥" : "♡"}
        </button>

        {/* Year plate (keeps the brand identity) */}
        <span className="plate absolute bottom-3 left-3">{car.year}</span>

        {/* Carousel controls */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => step(e, -1)}
              aria-label="Précédent"
              className="absolute left-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--text)] opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
            >
              ‹
            </button>
            <button
              onClick={(e) => step(e, 1)}
              aria-label="Suivant"
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[var(--text)] opacity-0 shadow transition hover:bg-white group-hover:opacity-100"
            >
              ›
            </button>
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full transition ${i === idx ? "bg-white" : "bg-white/50"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ---------- Info ---------- */}
      <div className="mt-3 px-0.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display truncate text-lg leading-tight tracking-wide">
            {car.brand} {car.model}
          </h3>
          <span className="flex shrink-0 items-center gap-1 text-xs text-teal" title="Garage vérifié">
            ✦
          </span>
        </div>
        <p className="num mt-0.5 truncate text-sm text-faint">
          {formatMileage(car.mileage)} · {fuelLabel(car.fuel_type)} · {car.garage.city}
        </p>
        <p className="price mt-1.5 text-lg font-semibold">{formatPrice(car.price)}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{car.garage.name}</p>
      </div>
    </Link>
  );
}
