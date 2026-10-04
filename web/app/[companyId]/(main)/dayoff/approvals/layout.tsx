"use client";

import { ModuleGate } from "@/src/components/access";

export default function DayOffApprovalsLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="dayoff.approvals">
      {children}
    </ModuleGate>
  );
}
