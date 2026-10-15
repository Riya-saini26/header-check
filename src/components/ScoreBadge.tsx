import { statusFor, type Severity } from "@/lib/heading-engine";
import { cn } from "@/lib/utils";

const TONE = {
  good: "bg-success-soft text-success",
  fair: "bg-warning-soft text-warning",
  poor: "bg-critical-soft text-critical",
};

export function StatusBadge({ score }: { score: number }) {
  const s = statusFor(score);
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE[s.tone])}>{s.label}</span>;
}

const SEV = {
  critical: "bg-critical-soft text-critical",
  warning: "bg-warning-soft text-warning",
  suggestion: "bg-suggestion-soft text-suggestion",
};
const SEV_LABEL = { critical: "Critical", warning: "Warning", suggestion: "Suggestion" };

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", SEV[severity])}>{SEV_LABEL[severity]}</span>;
}

export function ScoreRing({ score, size = 168 }: { score: number; size?: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const tone = statusFor(score).tone;
  const stroke = tone === "good" ? "var(--success)" : tone === "fair" ? "var(--warning)" : "var(--critical)";
  return (
    <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Heading structure score ${score} out of 100`}>
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
        <circle
          cx="80" cy="80" r={r} fill="none" stroke={stroke} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.9s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-4xl font-bold tabular-nums">{score}</div>
          <div className="text-xs text-muted-foreground">out of 100</div>
        </div>
      </div>
    </div>
  );
}
