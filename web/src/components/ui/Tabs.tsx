import { cn } from "../../lib/utils";

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-5 border-b border-border", className)}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={cn(
            "relative pb-2.5 text-sm font-medium transition-colors",
            value === item.key ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {item.label}
          {value === item.key && (
            <span className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
