"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { CarImage } from "@/lib/types";

export default function CarGallery({
  images,
  alt,
  year,
}: {
  images: CarImage[];
  alt: string;
  year?: number;
}) {
  const [active, setActive] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const thumbRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const go = useCallback(
    (dir: number) => setActive((a) => (a + dir + images.length) % images.length),
    [images.length]
  );

  // Keep the active thumbnail scrolled into view as the user navigates.
  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  // Empty state.
  if (images.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="relative flex aspect-[16/10] w-full items-center justify-center bg-black/[0.04] text-7xl text-faint">
          ⬡
          {year !== undefined && (
            <span className="plate absolute left-3 top-3 text-sm">{year}</span>
          )}
        </div>
      </div>
    );
  }

  const scrollStrip = (dx: number) =>
    stripRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  return (
    <div
      className="card overflow-hidden"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(-1);
        if (e.key === "ArrowRight") go(1);
      }}
    >
      {/* ---------- Main image ---------- */}
      <div className="relative aspect-[16/10] w-full bg-black/[0.04]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active].url}
          alt={alt}
          className="h-full w-full object-cover"
        />

        {year !== undefined && (
          <span className="plate absolute left-3 top-3 text-sm">{year}</span>
        )}

        {images.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Photo précédente"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border hair bg-white/85 text-lg text-[var(--text)] shadow backdrop-blur transition hover:bg-white"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Photo suivante"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border hair bg-white/85 text-lg text-[var(--text)] shadow backdrop-blur transition hover:bg-white"
            >
              ›
            </button>
            <span className="num absolute bottom-3 right-3 rounded-md bg-black/65 px-2 py-1 text-xs font-medium text-white">
              {active + 1} / {images.length}
            </span>
          </>
        )}
      </div>

      {/* ---------- Thumbnail strip ---------- */}
      {images.length > 1 && (
        <div className="flex items-center gap-1.5 p-3">
          {images.length > 4 && (
            <button
              type="button"
              aria-label="Défiler à gauche"
              onClick={() => scrollStrip(-240)}
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border hair text-[var(--text)] transition hover:bg-[var(--bg-2)]"
            >
              ‹
            </button>
          )}

          <div
            ref={stripRef}
            className="flex gap-2 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {images.map((img, i) => (
              <button
                key={img.id}
                ref={(el) => {
                  thumbRefs.current[i] = el;
                }}
                onClick={() => setActive(i)}
                className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === active
                    ? "border-brand"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>

          {images.length > 4 && (
            <button
              type="button"
              aria-label="Défiler à droite"
              onClick={() => scrollStrip(240)}
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border hair text-[var(--text)] transition hover:bg-[var(--bg-2)]"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  );
}
