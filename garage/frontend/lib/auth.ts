"use client";

import type { Role } from "./types";

const TOKEN_KEY = "garage_token";
const ROLE_KEY = "garage_role";

export function saveAuth(token: string, role: Role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole(): Role | null {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(ROLE_KEY) as Role) || null;
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
