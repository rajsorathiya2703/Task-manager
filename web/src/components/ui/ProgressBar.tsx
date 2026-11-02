import { cn } from "../../lib/utils";

export function ProgressBar({
  value,
  color = "var(--primary)",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={cn("h-1.5 w-full rounded-full bg-slate-100 overflow-hidden", className)}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
