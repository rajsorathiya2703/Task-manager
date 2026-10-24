"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Search, Filter, Plus, LayoutGrid, List, Menu, X, Tag, Type, AlignLeft, Bot } from "lucide-react";
import { Button } from "../ui/Button";
import { useSidebar } from "./SidebarContext";
import { useChatbot } from "../chatbot/ChatbotContext";
import { CompanyLink } from "../../lib/useCompanyPath";
import { FilterDropdown, FilterRule, FilterFieldDefinition } from "../common/FilterDropdown";
import { GroupByDropdown, GroupByOption } from "../common/GroupByDropdown";
import { GlobalTimerDisplay } from "../common/GlobalTimerDisplay";
import { NotificationDropdown } from "../common/NotificationDropdown";
import { useAccessControl } from "../../contexts/AccessContext";

export type SearchContext = string;

export interface SearchContextItem {
  key: string;
  label: string;
  icon?: any;
}

interface PageHeaderProps {
  title: React.ReactNode | string;
  breadcrumbs?: { label: string; href?: string }[];
  activeView?: 'board' | 'list';
  onViewChange?: (view: 'board' | 'list') => void;
  addText?: string;
  onAddClick?: () => void;
  addHref?: string;
  showAdd?: boolean;
  filters?: FilterRule[];
  onApplyFilter?: (filter: FilterRule) => void;
  onRemoveFilter?: (id: string) => void;
  onClearFilters?: () => void;
  filterFields?: FilterFieldDefinition[];
  availableStages?: string[];
  availablePriorities?: string[];
  searchQuery?: string;
  searchContext?: SearchContext;
  searchContexts?: SearchContextItem[];
  onSearchChange?: (query: string, context: SearchContext) => void;
  groupByOptions?: GroupByOption[];
  selectedGroupBy?: string;
  onGroupByChange?: (key: string) => void;
}

export function PageHeader({ 
  title, 
  breadcrumbs,
  activeView = 'board', 
  onViewChange,
  addText = "Add Task",
  onAddClick,
  addHref = "/tasks/new",
  showAdd = true,
  filters = [],
  onApplyFilter,
  onRemoveFilter,
  onClearFilters,
  filterFields,
  availableStages = [],
  availablePriorities = [],
  searchQuery = "",
  searchContext = "all",
  searchContexts,
  onSearchChange,
  groupByOptions,
  selectedGroupBy,
  onGroupByChange,
}: PageHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const { isOpen, toggleSidebar } = useSidebar();
  const { isOpen: isChatbotOpen, toggleChatbot } = useChatbot();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { can } = useAccessControl();

  const targetModule = useMemo(() => {
    const href = (addHref || "").toLowerCase();
    const text = (typeof addText === "string" ? addText : "").toLowerCase();
    if (href.includes("/tasks") || text.includes("task")) return "tasks";
    if (href.includes("/team") || text.includes("team")) return "teams";
    if (href.includes("/employee") || text.includes("employee")) return "employees";
    if (href.includes("/project") || text.includes("project")) return "projects";
    if (href.includes("/role") || text.includes("role")) return "roles";
    if (href.includes("/dayoff") || text.includes("leave")) return "dayoff";
    return null;
  }, [addHref, addText]);

  const isPermitted = targetModule ? can(targetModule, "create") : true;
  const shouldShowAdd = Boolean(showAdd && isPermitted);

  const defaultContexts: SearchContextItem[] = useMemo(() => [
    { key: 'title', label: 'Title', icon: Type },
    { key: 'description', label: 'Description', icon: AlignLeft },
    { key: 'label', label: 'Label', icon: Tag },
  ], []);

  const resolvedContexts = searchContexts && searchContexts.length > 0 ? searchContexts : defaultContexts;

  // Sync local query with prop if needed
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  // Global keydown listener for typing to search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input/textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) {
        if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
          setIsSearchOpen(false);
          searchInputRef.current?.blur();
        }
        return;
      }
      
      // If user types a printable character
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setIsSearchOpen(true);
        // Focus the input so the character goes into it
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleQueryChange = (q: string) => {
    setLocalQuery(q);
    if (onSearchChange) {
      onSearchChange(q, searchContext);
    }
  };

  const handleContextSelect = (ctx: SearchContext) => {
    if (onSearchChange) {
      onSearchChange(localQuery, ctx);
    }
  };

  const clearSearch = () => {
    setLocalQuery("");
    setIsSearchOpen(false);
    if (onSearchChange) {
      onSearchChange("", "all");
    }
  };

  const currentContextObj = resolvedContexts.find(c => c.key === searchContext);

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-background shrink-0 min-h-[56px] border-b border-border/40">
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Hamburger Button (visible only when sidebar is closed) */}
        {!isOpen && (
          <button 
            onClick={toggleSidebar}
            className="w-9 h-9 rounded-lg flex items-center justify-center border border-border dark:border-transparent bg-card dark:bg-gunmetal hover:bg-muted dark:hover:bg-iron-grey/40 text-foreground transition-colors mr-1 shrink-0"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4 text-foreground" />
          </button>
        )}
        
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground truncate">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-2">
                {bc.href ? (
                  <CompanyLink href={bc.href} className="hover:text-foreground transition-colors">
                    {bc.label}
                  </CompanyLink>
                ) : (
                  <span>{bc.label}</span>
                )}
                <span>/</span>
              </span>
            ))}
            <div className="text-foreground font-bold text-2xl tracking-tight flex items-center gap-2 truncate">
              {title}
            </div>
          </div>
        ) : (
          <div className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5 truncate">
            {title}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-end gap-2.5 shrink-0 min-w-0">
        {/* Search */}
        {(onSearchChange !== undefined) && (
          <div className="relative">
            <div className="flex items-center border border-border dark:border-transparent rounded-lg px-3 py-1.5 bg-card dark:bg-gunmetal w-44 sm:w-52 md:w-56 h-9 shadow-xs focus-within:ring-1 focus-within:ring-primary transition-all">
              <Search className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />
              
              {/* Context Tag */}
              {searchContext !== 'all' && (
                <div className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded mr-1.5 shrink-0 whitespace-nowrap">
                  {currentContextObj?.icon && (
                    <currentContextObj.icon className="w-3 h-3" />
                  )}
                  Filtered by {currentContextObj?.label || searchContext}
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleContextSelect('all'); }}
                    className="hover:text-primary-foreground hover:bg-primary rounded-full p-0.5 transition-colors ml-0.5"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}

              <input 
                ref={searchInputRef}
                type="text" 
                placeholder={searchContext === 'all' ? "Search tasks" : `Search ${currentContextObj?.label || searchContext}...`}
                className="bg-transparent border-none outline-none text-xs sm:text-sm w-full text-foreground placeholder:text-muted-foreground min-w-0"
                value={localQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                onKeyUp={(e) => e.stopPropagation()}
              />
              
              {localQuery && (
                <button 
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearSearch(); }}
                  className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Recommendations Dropdown */}
            {localQuery && (
              <div className="absolute top-full mt-1.5 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden outline-none">
                <div className="p-1 flex flex-col">
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Search "{localQuery}" in
                  </div>
                  
                  {resolvedContexts.map((ctx) => {
                    const IconComp = ctx.icon || Search;
                    return (
                      <button 
                        key={ctx.key}
                        onClick={() => handleContextSelect(ctx.key)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors text-left"
                      >
                        <IconComp className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span><span className="font-medium">{ctx.label}:</span> {localQuery}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter */}
        {(onApplyFilter && onRemoveFilter) && (
          <div className="flex items-center gap-2">
            <FilterDropdown 
              filters={filters}
              onApplyFilter={onApplyFilter}
              onRemoveFilter={onRemoveFilter}
              filterFields={filterFields}
              availableStages={availableStages}
              availablePriorities={availablePriorities}
            />
            {filters.length > 0 && onClearFilters && (
              <button 
                onClick={onClearFilters}
                className="flex items-center gap-1.5 px-2.5 h-9 border border-border dark:border-transparent rounded-lg hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 transition-colors bg-card dark:bg-gunmetal text-xs font-medium text-muted-foreground"
                title="Clear all filters"
              >
                <Filter className="w-3 h-3 relative" />
                <span className="absolute w-[18px] h-[1px] bg-current rotate-45 transform -translate-x-[2px]"></span>
                Clear
              </button>
            )}
          </div>
        )}

        {/* Group By */}
        {groupByOptions && groupByOptions.length > 0 && onGroupByChange && (
          <GroupByDropdown
            options={groupByOptions}
            selected={selectedGroupBy || groupByOptions[0].key}
            onChange={onGroupByChange}
          />
        )}

        {/* View Switcher */}
        {onViewChange && (
          <div className="flex items-center bg-card dark:bg-gunmetal p-1 rounded-lg border border-border dark:border-transparent h-9 shrink-0">
            <button 
              onClick={() => onViewChange('list')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all ${
                activeView === 'list' 
                  ? 'bg-carbon-black text-white dark:bg-white dark:text-carbon-black font-semibold shadow-xs' 
                  : 'text-muted-foreground dark:text-pale-slate-2 hover:text-foreground dark:hover:text-white font-medium'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button 
              onClick={() => onViewChange('board')}
              className={`flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-all ${
                activeView === 'board' 
                  ? 'bg-carbon-black text-white dark:bg-white dark:text-carbon-black font-semibold shadow-xs' 
                  : 'text-muted-foreground dark:text-pale-slate-2 hover:text-foreground dark:hover:text-white font-medium'
              }`}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
          </div>
        )}

        <GlobalTimerDisplay />
        <NotificationDropdown />

        {/* AI Copilot Toggle */}
        <button
          onClick={toggleChatbot}
          className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
            isChatbotOpen
              ? "bg-primary/10 text-primary border-primary/40 shadow-xs"
              : "border-border dark:border-transparent hover:bg-muted dark:hover:bg-iron-grey/40 text-foreground bg-card dark:bg-gunmetal shadow-xs"
          }`}
          title="Toggle AI Task Copilot (⌘J)"
        >
          <Bot className="w-4 h-4" />
        </button>

        {/* Add Button */}
        {shouldShowAdd && (
          onAddClick ? (
            <button
              onClick={onAddClick}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-carbon-black hover:bg-gunmetal text-white dark:bg-white dark:hover:bg-platinum dark:text-carbon-black shadow-xs transition-all shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{addText}</span>
            </button>
          ) : (
            <CompanyLink href={addHref}>
              <button
                className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-semibold bg-carbon-black hover:bg-gunmetal text-white dark:bg-white dark:hover:bg-platinum dark:text-carbon-black shadow-xs transition-all shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{addText}</span>
              </button>
            </CompanyLink>
          )
        )}
      </div>
    </header>
  );
}
