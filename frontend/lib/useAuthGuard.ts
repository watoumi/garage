"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getRole, getToken } from "./auth";
import type { Role } from "./types";

/** Client-side guard: redirects to login unless the user has the required role. */
export function useAuthGuard(requiredRole: Role) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const role = getRole();
    if (!token) {
      router.replace("/garage/login");
      return;
    }
    if (role !== requiredRole) {
      router.replace(role === "admin" ? "/admin/dashboard" : "/garage/dashboard");
      return;
    }
    setReady(true);
  }, [router, requiredRole]);

  return ready;
}
