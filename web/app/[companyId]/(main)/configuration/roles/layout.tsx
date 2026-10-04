"use client";

import { ModuleGate } from "@/src/components/access";

export default function RolesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="roles">
      {children}
    </ModuleGate>
  );
}
