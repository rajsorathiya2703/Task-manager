import type { ReactNode } from "react";
import { cn, priorityStyles, statusStyles } from "../../lib/utils";

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status?: string; className?: string }) {
  const styles = statusStyles(status);
  return <Badge className={cn(styles.badge, className)}>{styles.label}</Badge>;
}

export function PriorityBadgeChip({ priority, className }: { priority?: string; className?: string }) {
  const styles = priorityStyles(priority);
  return <Badge className={cn(styles.badge, className)}>{styles.label}</Badge>;
}
