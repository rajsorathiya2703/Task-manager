"use client";

import { Popover } from "@headlessui/react";
import { Layers, Check, ChevronDown } from "lucide-react";

export interface GroupByOption {
  key: string;
  label: string;
}

interface GroupByDropdownProps {
  options: GroupByOption[];
  selected: string;
  onChange: (key: string) => void;
}

export function GroupByDropdown({
  options,
  selected,
  onChange,
}: GroupByDropdownProps) {
  const currentOption = options.find((opt) => opt.key === selected) || options[0];

  return (
    <Popover className="relative">
      {({ open, close }) => (
        <>
          <Popover.Button
            className={`flex items-center gap-1.5 px-3 py-1.5 h-9 border border-border dark:border-transparent rounded-lg bg-card dark:bg-gunmetal text-xs font-medium text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 ${
              open || (selected && selected !== "none" && selected !== "stage")
                ? "bg-muted dark:bg-iron-grey/40 text-foreground"
                : "hover:bg-muted dark:hover:bg-iron-grey/40"
            }`}
            title="Group items by attribute"
          >
            <Layers className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Group</span>
            <span className="font-semibold text-foreground">{currentOption?.label || "Stage"}</span>
            <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
          </Popover.Button>

          <Popover.Panel className="absolute right-0 top-full mt-2 w-48 bg-card border border-border rounded-xl shadow-lg z-50 p-1.5 outline-none">
            <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Group by
            </div>
            <div className="space-y-0.5">
              {options.map((option) => {
                const isSelected = option.key === selected;
                return (
                  <button
                    key={option.key}
                    onClick={() => {
                      onChange(option.key);
                      close();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-left ${
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <span>{option.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}
