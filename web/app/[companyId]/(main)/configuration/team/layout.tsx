"use client";

import { ModuleGate } from "@/src/components/access";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="teams">
      {children}
    </ModuleGate>
  );
}
