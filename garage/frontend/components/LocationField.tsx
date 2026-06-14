"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";

import AddressAutocomplete from "./AddressAutocomplete";

const MOROCCO: [number, number] = [31.7, -7.09];

const pin = L.divIcon({
  className: "garage-pin",
  html: `<div class="gp gp-active">📍</div>`,
  iconSize: [40, 30],
  iconAnchor: [20, 30],
});

export interface LocationValue {
  lat: number | null;
  lng: number | null;
  address: string;
  city: string;
}

function cityFrom(a: Record<string, string> = {}): string {
  return a.city || a.town || a.village || a.municipality || a.county || a.state || "";
}

function Recenter({ coords }: { coords: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView(coords, 15);
  }, [coords, map]);
  return null;
}

export default function LocationField({
  value,
  onChange,
}: {
  value: LocationValue;
  onChange: (v: LocationValue) => void;
}) {
  const coords: [number, number] | null =
    value.lat != null && value.lng != null ? [value.lat, value.lng] : null;

  // Reverse-geocode after a marker drag so the address/city stay in sync.
  async function reverse(lat: number, lng: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`;
      const res = await fetch(url, { headers: { "Accept-Language": "fr" } });
      const d = await res.json();
      return { address: d.display_name as string, city: cityFrom(d.address) };
    } catch {
      return null;
    }
  }

  return (
    <div className="space-y-2">
      <AddressAutocomplete
        initial={value.address}
        onSelect={(r) => onChange({ lat: r.lat, lng: r.lng, address: r.address, city: r.city })}
      />
      <MapContainer center={coords || MOROCCO} zoom={coords ? 15 : 6} scrollWheelZoom className="h-64 w-full rounded-xl">
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter coords={coords} />
        {coords && (
          <Marker
            position={coords}
            draggable
            icon={pin}
            eventHandlers={{
              dragend: async (e) => {
                const ll = (e.target as L.Marker).getLatLng();
                const lat = Number(ll.lat.toFixed(6));
                const lng = Number(ll.lng.toFixed(6));
                const rev = await reverse(lat, lng);
                onChange({
                  lat,
                  lng,
                  address: rev?.address ?? value.address,
                  city: rev?.city || value.city,
                });
              },
            }}
          />
        )}
      </MapContainer>
      <p className="text-xs text-faint">
        Cherchez votre adresse, puis <b>déplacez le marqueur</b> pour positionner précisément votre garage.
      </p>
    </div>
  );
}
