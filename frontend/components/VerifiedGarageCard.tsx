import Link from "next/link";

import GarageAvatar from "@/components/GarageAvatar";
import type { GarageCard as GarageCardType } from "@/lib/types";

export default function VerifiedGarageCard({ garage }: { garage: GarageCardType }) {
  return (
    <Link
      href={`/garages/${garage.id}`}
      className="card flex w-60 flex-shrink-0 flex-col gap-3 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] sm:w-auto"
    >
      <div className="flex items-center gap-3">
        <GarageAvatar name={garage.name} logoUrl={garage.logo_url} size={48} />
        <div className="min-w-0">
          <p className="font-display truncate text-lg leading-tight tracking-wide">
            {garage.name}
          </p>
          <p className="truncate text-xs text-faint">{garage.city}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="badge-verified">✦ Vérifié</span>
        <span className="num text-xs text-muted">
          {garage.car_count} voiture{garage.car_count > 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
