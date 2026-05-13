interface ConfidenceBadgeProps {
  type: "confirmed" | "signal";
  size?: "sm" | "xs";
}

export function ConfidenceBadge({ type, size = "sm" }: ConfidenceBadgeProps) {
  const sizeClass = size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-0.5";

  if (type === "confirmed") {
    return (
      <span
        className={`inline-flex items-center rounded-full border border-cyan-300/55 bg-cyan-400/16 font-semibold text-cyan-100 ${sizeClass}`}
        title="Officially confirmed surveillance data"
        aria-label="Confirmed data"
      >
        ✓ CONFIRMED
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border border-orange-300/55 bg-orange-400/16 font-semibold text-orange-100 ${sizeClass}`}
      title="Signal or mention — unverified, may be inaccurate"
      aria-label="Signal data"
    >
      ⚡ SIGNAL
    </span>
  );
}

interface TierBadgeProps {
  tier: "A" | "B" | "C" | "D";
}

const TIER_LABELS: Record<string, string> = {
  A: "Official agency",
  B: "Science / summary",
  C: "Credible media",
  D: "Other",
};

const TIER_COLORS: Record<string, string> = {
  A: "border-emerald-300/55 bg-emerald-400/16 text-emerald-100",
  B: "border-cyan-300/55 bg-cyan-400/16 text-cyan-100",
  C: "border-amber-300/55 bg-amber-400/16 text-amber-100",
  D: "border-slate-400/45 bg-slate-500/16 text-slate-200",
};

export function TierBadge({ tier }: TierBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded text-[10px] px-1.5 py-0.5 font-medium border ${TIER_COLORS[tier]}`}
      title={TIER_LABELS[tier]}
    >
      Tier {tier}
    </span>
  );
}
