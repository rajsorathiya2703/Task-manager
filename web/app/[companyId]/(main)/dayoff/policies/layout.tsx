"use client";

import { ModuleGate } from "@/src/components/access";

export default function DayOffPoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="dayoff.policies">
      {children}
    </ModuleGate>
  );
}
