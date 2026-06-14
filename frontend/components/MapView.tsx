"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { formatPrice } from "@/lib/format";
import { cityCoords } from "@/lib/morocco";
import type { Car, GaragePublic } from "@/lib/types";

function garageCoords(g: GaragePublic): [number, number] | null {
  if (g.latitude != null && g.longitude != null) return [g.latitude, g.longitude];
  return cityCoords(g.city); // fall back to city center
}

export interface GarageGroup {
  garage: GaragePublic;
  cars: Car[];
}

// Morocco center fallback.
const MOROCCO: [number, number] = [31.7, -7.09];

function pinIcon(count: number, active: boolean) {
  return L.divIcon({
    className: "garage-pin",
    html: `<div class="gp ${active ? "gp-active" : ""}">🚗 ${count}</div>`,
    iconSize: [56, 30],
    iconAnchor: [28, 30],
    popupAnchor: [0, -28],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(points, { padding: [60, 60], maxZoom: 13 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return null;
}

function ActiveController({
  activeId,
  coords,
  markerRefs,
}: {
  activeId: number | null;
  coords: Record<number, [number, number]>;
  markerRefs: React.MutableRefObject<Record<number, L.Marker>>;
}) {
  const map = useMap();
  useEffect(() => {
    if (activeId == null) return;
    const c = coords[activeId];
    if (c) map.panTo(c, { animate: true });
    markerRefs.current[activeId]?.openPopup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  return null;
}

export default function MapView({
  groups,
  activeGarageId,
  onSelectGarage,
}: {
  groups: GarageGroup[];
  activeGarageId: number | null;
  onSelectGarage: (id: number | null) => void;
}) {
  const coords: Record<number, [number, number]> = {};
  const located = groups.filter((g) => {
    const c = garageCoords(g.garage);
    if (c) coords[g.garage.id] = c;
    return c != null;
  });
  const points = Object.values(coords);
  const markerRefs = useRef<Record<number, L.Marker>>({});

  return (
    <MapContainer
      center={points[0] || MOROCCO}
      zoom={points.length ? 11 : 6}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds points={points} />
      <ActiveController activeId={activeGarageId} coords={coords} markerRefs={markerRefs} />

      {located.map(({ garage, cars }) => {
        const top = cars[0];
        const active = garage.id === activeGarageId;
        return (
          <Marker
            key={garage.id}
            position={coords[garage.id]}
            icon={pinIcon(cars.length, active)}
            ref={(m) => {
              if (m) markerRefs.current[garage.id] = m as unknown as L.Marker;
            }}
            eventHandlers={{ click: () => onSelectGarage(garage.id) }}
          >
            <Popup minWidth={240} maxWidth={260}>
              <div className="w-[240px] overflow-hidden rounded-xl">
                {top?.images[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={top.images[0].url} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-base leading-tight tracking-wide">
                      {garage.name}
                    </p>
                    <span className="badge-verified flex-shrink-0">✦</span>
                  </div>
                  <p className="num mt-0.5 text-xs text-faint">
                    {garage.city} · {cars.length} véhicule{cars.length > 1 ? "s" : ""}
                  </p>
                  {top && (
                    <p className="mt-2 truncate text-sm">
                      <span className="font-medium">
                        {top.brand} {top.model}
                      </span>{" "}
                      <span className="price">· {formatPrice(top.price)}</span>
                    </p>
                  )}
                  <Link
                    href={`/garages/${garage.id}`}
                    className="btn-primary mt-3 w-full !py-2 text-sm"
                  >
                    Voir l&apos;inventaire →
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
