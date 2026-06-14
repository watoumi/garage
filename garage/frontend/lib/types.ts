export type FuelType = "petrol" | "diesel" | "hybrid" | "electric" | "lpg";
export type Transmission = "manual" | "automatic";
export type Role = "admin" | "garage";

export interface CarImage {
  id: number;
  url: string;
}

export interface GaragePublic {
  id: number;
  name: string;
  phone: string;
  city: string;
  address: string;
  description?: string | null;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface Car {
  id: number;
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel_type: FuelType;
  transmission: Transmission;
  price: number;
  description?: string | null;
  is_active: boolean;
  views: number;
  created_at: string;
  images: CarImage[];
  garage: GaragePublic;
}

export interface CarListResponse {
  items: Car[];
  total: number;
  page: number;
  page_size: number;
}

export interface GarageProfilePublic extends GaragePublic {
  cars: Car[];
}

export interface GarageCard extends GaragePublic {
  car_count: number;
  cover_url?: string | null;
}

export interface NearbyGarage extends GarageCard {
  distance_km: number;
}

export interface CarStat {
  car_id: number;
  label: string;
  views: number;
  leads: number;
}

export interface GarageAnalytics {
  total_listings: number;
  active_listings: number;
  total_views: number;
  total_leads: number;
  leads_last_7d: number;
  per_car: CarStat[];
}

export interface Lead {
  id: number;
  car_id: number;
  car_label: string;
  created_at: string;
}

export interface Garage {
  id: number;
  name: string;
  phone: string;
  city: string;
  address: string;
  description?: string | null;
  logo_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_approved: boolean;
  is_disabled: boolean;
  created_at: string;
}

export interface CarInput {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  fuel_type: FuelType;
  transmission: Transmission;
  price: number;
  description?: string;
}
