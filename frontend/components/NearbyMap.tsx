"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";

import L from "leaflet";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";

export interface MapGarage {
  id: number;
  name: string;
  city: string;
  phone: string;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  car_count: number;
  distance_km?: number;
  cover_url?: string | null;
}

const MOROCCO: [number, number] = [31.7, -7.09];

const userIcon = L.divIcon({
  className: "user-dot-wrap",
  html: `<div class="user-dot"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function pinIcon(count: number, active: boolean) {
  return L.divIcon({
    className: "garage-pin",
    html: `<div class="gp ${active ? "gp-active" : ""}">🚗 ${count}</div>`,
    iconSize: [56, 30],
    iconAnchor: [28, 30],
    popupAnchor: [0, -28],
  });
}

const waLink = (phone: string) => `https://wa.me/${phone.replace(/[^0-9]/g, "")}`;

// Saffron cluster badge showing how many garages are grouped.
function clusterIcon(cluster: { getChildCount: () => number }) {
  return L.divIcon({
    html: `<div class="gp-cluster">${cluster.getChildCount()}</div>`,
    className: "garage-pin",
    iconSize: [44, 44],
  });
}

function FitView({
  user,
  radiusKm,
  points,
}: {
  user: [number, number] | null;
  radiusKm?: number;
  points: [number, number][];
}) {
  const map = useMap();
  // Key off the actual coordinate set (not just length) so a changed set refits.
  const key = `${user?.join(",")}|${radiusKm}|${points.map((p) => p.join(",")).join("|")}`;
  useEffect(() => {
    // Delay one tick so the (flex/grid) container has its final size before fitting.
    const t = setTimeout(() => {
      map.invalidateSize();
      if (user && radiusKm) {
        map.fitBounds(L.latLng(user[0], user[1]).toBounds(radiusKm * 2000), { padding: [40, 40] });
      } else if (points.length === 1) {
        map.setView(points[0], 12);
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [50, 50], maxZoom: 13 });
      } else if (user) {
        map.setView(user, 11);
      }
    }, 120);
    return () => clearTimeout(t);
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

export default function NearbyMap({
  user = null,
  radiusKm,
  garages,
  activeId,
  onSelect,
}: {
  user?: [number, number] | null;
  radiusKm?: number;
  garages: MapGarage[];
  activeId: number | null;
  onSelect: (id: number) => void;
}) {
  const coords: Record<number, [number, number]> = {};
  garages.forEach((g) => {
    if (g.latitude != null && g.longitude != null) coords[g.id] = [g.latitude, g.longitude];
  });
  const points = Object.values(coords);
  const markerRefs = useRef<Record<number, L.Marker>>({});

  return (
    <MapContainer center={user || points[0] || MOROCCO} zoom={user ? 12 : 6} scrollWheelZoom className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitView user={user} radiusKm={radiusKm} points={points} />
      <ActiveController activeId={activeId} coords={coords} markerRefs={markerRefs} />

      {user && radiusKm && (
        <Circle
          center={user}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#e8a23a", fillColor: "#e8a23a", fillOpacity: 0.06, weight: 1.5 }}
        />
      )}
      {user && (
        <Marker position={user} icon={userIcon}>
          <Popup>Vous êtes ici</Popup>
        </Marker>
      )}

      <MarkerClusterGroup
        iconCreateFunction={clusterIcon}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        maxClusterRadius={55}
        chunkedLoading
      >
        {garages.map((g) =>
          coords[g.id] ? (
            <Marker
              key={g.id}
              position={coords[g.id]}
              icon={pinIcon(g.car_count, g.id === activeId)}
              ref={(m) => {
                if (m) markerRefs.current[g.id] = m as unknown as L.Marker;
              }}
              eventHandlers={{ click: () => onSelect(g.id) }}
            >
            <Popup minWidth={230} maxWidth={250}>
              <div className="w-[230px] overflow-hidden rounded-xl">
                {g.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.cover_url} alt="" className="h-28 w-full object-cover" />
                )}
                <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-base leading-tight tracking-wide">{g.name}</p>
                  <span className="badge-verified flex-shrink-0">✦</span>
                </div>
                <div className="num mt-1.5 space-y-0.5 text-xs text-muted">
                  <p>
                    📍 {g.distance_km != null ? `${g.distance_km.toFixed(1)} km · ` : ""}
                    {g.city}
                  </p>
                  <p>🚗 {g.car_count} voiture{g.car_count > 1 ? "s" : ""} disponible{g.car_count > 1 ? "s" : ""}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <Link href={`/garages/${g.id}`} className="btn-primary flex-1 !py-1.5 text-xs">
                    Inventaire
                  </Link>
                  <a
                    href={waLink(g.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-whatsapp !px-3 !py-1.5 text-xs"
                  >
                    💬
                  </a>
                </div>
                </div>
              </div>
            </Popup>
          </Marker>
          ) : null
        )}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
