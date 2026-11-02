import type { KeyboardEventHandler, Ref } from "react";
import { Search, X } from "lucide-react";
import { cn } from "../../lib/utils";

export function SearchField({
  value,
  onChange,
  placeholder = "Search tasks, projects, people",
  className,
  inputRef,
  onKeyDown,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputRef?: Ref<HTMLInputElement>;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 h-10 px-3.5 rounded-full bg-muted border border-transparent focus-within:border-primary/30 focus-within:bg-white transition-colors",
        className
      )}
    >
      <Search className="w-4 h-4 text-muted-foreground shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground min-w-0"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
