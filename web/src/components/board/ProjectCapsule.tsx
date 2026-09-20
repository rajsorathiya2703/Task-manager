"use client";


interface ProjectCapsuleProps {
  name: string;
  color?: string;
  size?: "sm" | "md";
}

export function ProjectCapsule({ name, color, size = "sm" }: ProjectCapsuleProps) {
  const projectColor = color || "#3b82f6";
  const initialLetter = (name ? name.charAt(0) : "P").toUpperCase();

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/70 text-muted-foreground border border-border/40 shrink-0 select-none ${
        size === "sm" ? "text-[10px] font-semibold" : "text-xs font-semibold"
      }`}
    >
      <div 
        className={`rounded flex items-center justify-center text-white font-bold shrink-0 shadow-xs ${
          size === "sm" ? "w-3.5 h-3.5 text-[8px]" : "w-4 h-4 text-[9px]"
        }`}
        style={{ backgroundColor: projectColor }}
      >
        {initialLetter}
      </div>
      <span className="font-semibold truncate max-w-[100px] text-muted-foreground leading-none">{name}</span>
    </div>
  );
}
