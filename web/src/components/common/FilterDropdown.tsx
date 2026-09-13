"use client";

import { useState, useMemo, useEffect } from "react";
import { Popover } from "@headlessui/react";
import { Filter, X, Plus } from "lucide-react";

export type FilterCondition = "eq" | "neq";

export interface FilterRule {
  id: string;
  field: string;
  condition: FilterCondition;
  value: string;
}

export interface FilterFieldDefinition {
  field: string;
  label: string;
  options: string[];
}

interface FilterDropdownProps {
  filters: FilterRule[];
  onApplyFilter: (filter: FilterRule) => void;
  onRemoveFilter: (id: string) => void;
  filterFields?: FilterFieldDefinition[];
  availableStages?: string[];
  availablePriorities?: string[];
}

export function FilterDropdown({ 
  filters, 
  onApplyFilter, 
  onRemoveFilter,
  filterFields,
  availableStages,
  availablePriorities
}: FilterDropdownProps) {
  const resolvedFields = useMemo<FilterFieldDefinition[]>(() => {
    if (filterFields && filterFields.length > 0) {
      return filterFields;
    }
    const legacyFields: FilterFieldDefinition[] = [];
    if (availableStages && availableStages.length > 0) {
      legacyFields.push({ field: "Stage", label: "Stage", options: availableStages });
    }
    if (availablePriorities && availablePriorities.length > 0) {
      legacyFields.push({ field: "Priority", label: "Priority", options: availablePriorities });
    }
    return legacyFields.length > 0
      ? legacyFields
      : [
          { field: "Stage", label: "Stage", options: ["To Do", "Doing", "Completed", "On Hold"] },
          { field: "Priority", label: "Priority", options: ["Low", "Medium", "High"] },
        ];
  }, [filterFields, availableStages, availablePriorities]);

  const [selectedField, setSelectedField] = useState<string>(resolvedFields[0]?.field || "Stage");
  const [selectedCondition, setSelectedCondition] = useState<FilterCondition>("eq");
  const [selectedValue, setSelectedValue] = useState<string>("");

  // Keep selectedField valid if resolvedFields changes
  useEffect(() => {
    if (!resolvedFields.some(f => f.field === selectedField) && resolvedFields.length > 0) {
      setSelectedField(resolvedFields[0].field);
      setSelectedValue("");
    }
  }, [resolvedFields, selectedField]);

  const handleAddFilter = () => {
    if (!selectedValue) return;
    
    onApplyFilter({
      id: Math.random().toString(36).substring(7),
      field: selectedField,
      condition: selectedCondition,
      value: selectedValue,
    });
    
    // Reset value after adding
    setSelectedValue("");
  };

  const currentFieldDef = resolvedFields.find(f => f.field === selectedField) || resolvedFields[0];
  const availableValues = currentFieldDef?.options || [];

  return (
    <Popover className="relative">
      {({ open }) => (
        <>
          <Popover.Button className={`flex items-center gap-1.5 px-2 py-1.5 border border-border rounded-md bg-card text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring ${open || filters.length > 0 ? 'bg-muted' : 'hover:bg-muted'}`}>
            <Filter className="w-3.5 h-3.5" />
            Filter
            {filters.length > 0 && (
              <span className="ml-1 flex items-center justify-center bg-primary text-primary-foreground text-[10px] w-4 h-4 rounded-full">
                {filters.length}
              </span>
            )}
          </Popover.Button>

          <Popover.Panel className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-lg z-50 p-4 outline-none">
            <h4 className="text-sm font-semibold text-foreground mb-3">Add Filter</h4>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Field</label>
                <select 
                  className="w-full text-sm border border-border rounded-md bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                  value={selectedField}
                  onChange={(e) => {
                    setSelectedField(e.target.value);
                    setSelectedValue(""); // Reset value when field changes
                  }}
                >
                  {resolvedFields.map(f => (
                    <option key={f.field} value={f.field}>{f.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Condition</label>
                <select 
                  className="w-full text-sm border border-border rounded-md bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                  value={selectedCondition}
                  onChange={(e) => setSelectedCondition(e.target.value as FilterCondition)}
                >
                  <option value="eq">Equal to</option>
                  <option value="neq">Not equal to</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Value</label>
                <select 
                  className="w-full text-sm border border-border rounded-md bg-background px-2 py-1.5 outline-none focus:ring-1 focus:ring-primary"
                  value={selectedValue}
                  onChange={(e) => setSelectedValue(e.target.value)}
                >
                  <option value="" disabled>Select a value...</option>
                  {availableValues.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>

              <button 
                onClick={handleAddFilter}
                disabled={!selectedValue}
                className="w-full flex items-center justify-center gap-1.5 bg-primary text-primary-foreground py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                Apply Filter
              </button>
            </div>

            {filters.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-xs font-medium text-muted-foreground mb-2">Active Filters</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {filters.map(filter => (
                    <div key={filter.id} className="flex items-center justify-between bg-muted/50 px-2 py-1.5 rounded-md text-xs">
                      <span className="truncate pr-2 text-foreground">
                        <span className="font-medium">{filter.field}</span> {filter.condition === 'eq' ? 'is' : 'is not'} <span className="font-medium">{filter.value}</span>
                      </span>
                      <button 
                        onClick={() => onRemoveFilter(filter.id)}
                        className="text-muted-foreground hover:text-red-500 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Popover.Panel>
        </>
      )}
    </Popover>
  );
}
