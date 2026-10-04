"use client";

import { ModuleGate } from "@/src/components/access";

export default function UsersLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="users">
      {children}
    </ModuleGate>
  );
}
