import { SignalHigh, SignalMedium, SignalLow, Signal } from "lucide-react";

interface PriorityBadgeProps {
  priority?: "High" | "Medium" | "Low" | "No Priority" | string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  switch (priority) {
    case "High":
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-red-500">
          <SignalHigh className="w-3.5 h-3.5" />
          High
        </div>
      );
    case "Medium":
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-orange-500">
          <SignalMedium className="w-3.5 h-3.5" />
          Medium
        </div>
      );
    case "Low":
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <SignalLow className="w-3.5 h-3.5" />
          Low
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/70">
          <Signal className="w-3.5 h-3.5" />
          No Priority
        </div>
      );
  }
}
