"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

const MOROCCO: [number, number] = [31.7, -7.09];

const pin = L.divIcon({
  className: "garage-pin",
  html: `<div class="gp gp-active">📍</div>`,
  iconSize: [40, 30],
  iconAnchor: [20, 30],
});

function Clicker({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6)));
    },
  });
  return null;
}

export default function LocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const has = lat != null && lng != null;
  return (
    <MapContainer
      center={has ? [lat as number, lng as number] : MOROCCO}
      zoom={has ? 13 : 6}
      scrollWheelZoom
      className="h-64 w-full rounded-xl"
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Clicker onChange={onChange} />
      {has && <Marker position={[lat as number, lng as number]} icon={pin} />}
    </MapContainer>
  );
}
