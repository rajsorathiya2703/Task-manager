import { avatarColor, cn, initials } from "../../lib/utils";

export function Avatar({
  name,
  src,
  size = "md",
  className,
  color,
}: {
  name?: string | null;
  src?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  color?: string;
}) {
  const sizes = {
    xs: "w-5 h-5 text-[8px]",
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
    lg: "w-9 h-9 text-sm",
  };
  const bg = color || avatarColor(name || src || "?");

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center overflow-hidden shrink-0 font-semibold text-white",
        sizes[size],
        className
      )}
      style={!src ? { backgroundColor: bg } : undefined}
      title={name || undefined}
    >
      {src ? (
        <img src={src} alt={name || ""} className="w-full h-full object-cover" />
      ) : (
        initials(name)
      )}
    </div>
  );
}
