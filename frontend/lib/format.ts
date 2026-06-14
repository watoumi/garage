import type { Car } from "./types";

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-MA", {
    maximumFractionDigits: 0,
  }).format(price) + " MAD";
}

export function formatMileage(km: number): string {
  return new Intl.NumberFormat("fr-MA").format(km) + " km";
}

const FUEL_LABELS: Record<string, string> = {
  petrol: "Essence",
  diesel: "Diesel",
  hybrid: "Hybride",
  electric: "Électrique",
  lpg: "GPL",
};

export function fuelLabel(fuel: string): string {
  return FUEL_LABELS[fuel] || fuel;
}

export function transmissionLabel(t: string): string {
  return t === "automatic" ? "Automatique" : "Manuelle";
}

/** Build a WhatsApp click-to-chat URL with a prefilled message for a listing. */
export function whatsappLink(car: Car): string {
  const phone = car.garage.phone.replace(/[^0-9]/g, "");
  const message = `Bonjour ${car.garage.name}, je suis intéressé par votre ${car.brand} ${car.model} (${car.year}) à ${formatPrice(
    car.price
  )} vue sur la plateforme.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
