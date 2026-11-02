import { Card } from "./Card";
import { cn } from "../../lib/utils";

export function StatCard({
  label,
  value,
  hint,
  dotClass,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  dotClass?: string;
  className?: string;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {dotClass && <span className={cn("w-2 h-2 rounded-full", dotClass)} />}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-foreground">{value}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}
