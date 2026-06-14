"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { clearAuth, getRole } from "@/lib/auth";
import type { Role } from "@/lib/types";

export default function Navbar() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setRole(getRole());
  }, []);

  function logout() {
    clearAuth();
    setRole(null);
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b hair bg-[var(--bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand to-brand-dark text-lg text-[#1a130a] shadow-lg shadow-brand/30 transition group-hover:rotate-[8deg]">
            ◈
          </span>
          <span className="font-display text-2xl font-bold tracking-wide">
            GARAGE<span className="text-saffron">.MA</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 text-sm sm:gap-2">
          <Link
            href="/search"
            className="hidden px-3 py-2 font-medium text-muted transition hover:text-saffron sm:block"
          >
            🗺 Acheter
          </Link>
          {role === "garage" && (
            <Link href="/garage/dashboard" className="btn-outline">
              Mon espace
            </Link>
          )}
          {role === "admin" && (
            <Link href="/admin/dashboard" className="btn-outline">
              Admin
            </Link>
          )}
          {role ? (
            <button onClick={logout} className="btn-primary">
              Déconnexion
            </button>
          ) : (
            <>
              <Link href="/garage/login" className="btn-outline">
                Connexion
              </Link>
              <Link href="/garage/register" className="btn-primary">
                Inscrire mon garage
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
