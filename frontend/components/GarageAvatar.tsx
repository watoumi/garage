function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default function GarageAvatar({
  name,
  logoUrl,
  size = 44,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  const dim = { width: size, height: size };

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name}
        style={dim}
        className="flex-shrink-0 rounded-xl border hair object-cover"
      />
    );
  }

  return (
    <div
      style={{ ...dim, fontSize: size * 0.4 }}
      className="font-display flex flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-brand-dark font-bold tracking-wide text-[#1a130a]"
    >
      {initials(name)}
    </div>
  );
}
