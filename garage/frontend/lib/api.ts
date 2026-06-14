import { clearAuth, getToken } from "./auth";
import type {
  Car,
  CarInput,
  CarListResponse,
  Garage,
  GarageAnalytics,
  GarageCard,
  GarageProfilePublic,
  Lead,
  NearbyGarage,
  Role,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  // Only set JSON content-type when not sending FormData.
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    // Expired/invalid session on an authenticated call: clear it and bounce to login.
    if (res.status === 401 && auth && typeof window !== "undefined") {
      clearAuth();
      if (!window.location.pathname.startsWith("/garage/login")) {
        window.location.href = "/garage/login?expired=1";
      }
      throw new ApiError("Session expirée. Veuillez vous reconnecter.", 401);
    }
    const detail =
      (data && (data.detail?.[0]?.msg || data.detail)) || "Request failed";
    throw new ApiError(
      typeof detail === "string" ? detail : "Request failed",
      res.status
    );
  }
  return data as T;
}

// ---------- Auth ----------
export interface AuthResponse {
  access_token: string;
  token_type: string;
  role: Role;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  description?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export const api = {
  // Auth
  register: (payload: RegisterPayload) =>
    request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  // Public cars
  listCars: (params: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    });
    return request<CarListResponse>(`/cars?${qs.toString()}`);
  },
  getCar: (id: number | string) => request<Car>(`/cars/${id}`),
  getGarage: (id: number | string) =>
    request<GarageProfilePublic>(`/garages/${id}`),
  listGarages: (limit = 12) => request<GarageCard[]>(`/garages?limit=${limit}`),
  nearbyGarages: (lat: number, lng: number, radius: number) =>
    request<NearbyGarage[]>(`/garages/nearby?lat=${lat}&lng=${lng}&radius=${radius}`),

  // Fire-and-forget WhatsApp lead (does not block the redirect).
  recordLead: (carId: number) => {
    try {
      fetch(`${API_URL}/cars/${carId}/lead`, { method: "POST", keepalive: true });
    } catch {
      /* best effort */
    }
  },

  // Dashboard analytics & leads
  analytics: () => request<GarageAnalytics>("/garage/analytics", {}, true),
  leads: () => request<Lead[]>("/garage/leads", {}, true),

  // Garage profile
  myGarage: () => request<Garage>("/garage/me", {}, true),
  updateGarage: (payload: Partial<Garage>) =>
    request<Garage>(
      "/garage/update",
      { method: "PUT", body: JSON.stringify(payload) },
      true
    ),
  uploadLogo: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<Garage>("/garage/logo", { method: "POST", body: form }, true);
  },

  // Garage cars
  myCars: () => request<Car[]>("/cars/mine", {}, true),
  createCar: (payload: CarInput) =>
    request<Car>("/cars", { method: "POST", body: JSON.stringify(payload) }, true),
  updateCar: (id: number, payload: Partial<CarInput> & { is_active?: boolean }) =>
    request<Car>(
      `/cars/${id}`,
      { method: "PUT", body: JSON.stringify(payload) },
      true
    ),
  deleteCar: (id: number) =>
    request<void>(`/cars/${id}`, { method: "DELETE" }, true),
  uploadImages: (carId: number, files: FileList | File[]) => {
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    return request<Car>(
      `/cars/${carId}/images`,
      { method: "POST", body: form },
      true
    );
  },
  deleteImage: (carId: number, imageId: number) =>
    request<void>(`/cars/${carId}/images/${imageId}`, { method: "DELETE" }, true),

  // Admin
  adminGarages: (approved?: boolean) =>
    request<Garage[]>(
      `/admin/garages${approved === undefined ? "" : `?approved=${approved}`}`,
      {},
      true
    ),
  approveGarage: (garageId: number, approve = true) =>
    request<Garage>(
      `/admin/approve-garage?garage_id=${garageId}&approve=${approve}`,
      { method: "POST" },
      true
    ),
  disableGarage: (garageId: number, disable = true) =>
    request<Garage>(
      `/admin/disable-garage?garage_id=${garageId}&disable=${disable}`,
      { method: "POST" },
      true
    ),
  adminCars: () => request<Car[]>("/admin/cars", {}, true),
  adminDeleteCar: (carId: number) =>
    request<void>(`/admin/car/${carId}`, { method: "DELETE" }, true),
};

export { ApiError };
