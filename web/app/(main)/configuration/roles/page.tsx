"use client";

import { PanelLeft } from "lucide-react";
import { useSidebar } from "../../../../src/components/layout/SidebarContext";
import RolesManagement from "../../../../src/components/roles/RolesManagement";

export default function RolesPage() {
  const { isOpen, toggleSidebar } = useSidebar();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border/50">
        {!isOpen && (
          <button
            onClick={toggleSidebar}
            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
            title="Open sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">
            Roles & Access Control
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure custom roles, permission matrices, field overrides, and preview user access
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <RolesManagement />
      </div>
    </div>
  );
}
