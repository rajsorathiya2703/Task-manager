"use client";

import { ModuleGate } from "@/src/components/access";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleGate module="employees">
      {children}
    </ModuleGate>
  );
}
