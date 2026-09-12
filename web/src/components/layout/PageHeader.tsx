"use client";

import { useState, useEffect, useRef } from "react";
import { Popover } from "@headlessui/react";
import { Search, Filter, Plus, Columns, LayoutGrid, List, Menu, X, Tag, Type, AlignLeft, Bot } from "lucide-react";
import { Button } from "../ui/Button";
import { useSidebar } from "./SidebarContext";
import { useChatbot } from "../chatbot/ChatbotContext";
import Link from "next/link";
import { FilterDropdown, FilterRule } from "../common/FilterDropdown";
import { GlobalTimerDisplay } from "../common/GlobalTimerDisplay";
import { NotificationDropdown } from "../common/NotificationDropdown";

export type SearchContext = 'all' | 'title' | 'description' | 'label';

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
  availableStages?: string[];
  availablePriorities?: string[];
  searchQuery?: string;
  searchContext?: SearchContext;
  onSearchChange?: (query: string, context: SearchContext) => void;
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
  availableStages = [],
  availablePriorities = [],
  searchQuery = "",
  searchContext = "all",
  onSearchChange
}: PageHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const { isOpen, toggleSidebar } = useSidebar();
  const { isOpen: isChatbotOpen, toggleChatbot } = useChatbot();
  const searchInputRef = useRef<HTMLInputElement>(null);

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
        // We use setTimeout to ensure the input is visible/rendered if it was transitioning
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

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-background shrink-0 min-h-[50px]">
      <div className="flex items-center gap-3 min-w-0">
        {/* Toggle Hamburger Button (visible only when sidebar is closed) */}
        {!isOpen && (
          <button 
            onClick={toggleSidebar}
            className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors bg-card shadow-sm mr-1 shrink-0"
          >
            <Menu className="w-4 h-4 text-foreground" />
          </button>
        )}
        
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground truncate">
            {breadcrumbs.map((bc, i) => (
              <span key={i} className="flex items-center gap-2">
                {bc.href ? (
                  <Link href={bc.href} className="hover:text-foreground transition-colors">
                    {bc.label}
                  </Link>
                ) : (
                  <span>{bc.label}</span>
                )}
                <span>/</span>
              </span>
            ))}
            <div className="text-foreground font-semibold flex items-center gap-2 truncate">
              {title}
            </div>
          </div>
        ) : (
          <div className="text-xl font-semibold text-foreground flex items-center gap-2.5 truncate">
            {title}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-end gap-2 shrink-0 min-w-0">
        {/* Search */}
        <div className={`flex items-center justify-end transition-all duration-300 ease-in-out ${isSearchOpen || localQuery ? 'w-full max-w-lg' : 'w-8'}`}>
          {isSearchOpen || localQuery ? (
            <div className="relative w-full">
              <div className="flex items-center border border-border rounded-md px-2 py-1 bg-card w-full shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
                <Search className="w-4 h-4 text-muted-foreground mr-1.5 shrink-0" />
                
                {/* Context Tag */}
                {searchContext !== 'all' && (
                  <div className="flex items-center gap-1 bg-primary/10 text-primary text-[10px] font-medium px-1.5 py-0.5 rounded mr-1.5 shrink-0 whitespace-nowrap">
                    {searchContext === 'title' && <Type className="w-3 h-3" />}
                    {searchContext === 'description' && <AlignLeft className="w-3 h-3" />}
                    {searchContext === 'label' && <Tag className="w-3 h-3" />}
                    Filtered by {searchContext}
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
                  placeholder={searchContext === 'all' ? "Search tasks..." : `Search ${searchContext}...`}
                  className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground min-w-0"
                  value={localQuery}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => e.stopPropagation()}
                  onKeyUp={(e) => e.stopPropagation()}
                  autoFocus
                  onBlur={(e) => {
                    // Small delay to allow clicking on recommendations before it closes
                    setTimeout(() => {
                      if (!localQuery) setIsSearchOpen(false);
                    }, 200);
                  }}
                />
                
                {localQuery && (
                  <button 
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearSearch(); }}
                    className="text-muted-foreground hover:text-foreground shrink-0 ml-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {!localQuery && (
                  <span className="text-[10px] bg-muted text-muted-foreground px-1 py-0.5 rounded ml-1.5 shrink-0 hidden sm:block">⌘F</span>
                )}
              </div>

              {/* Recommendations Dropdown */}
              {localQuery && (
                <div className="absolute top-full mt-1.5 w-full bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden outline-none">
                  <div className="p-1 flex flex-col">
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Search "{localQuery}" in
                    </div>
                    
                    <button 
                      onClick={() => handleContextSelect('title')}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors text-left"
                    >
                      <Type className="w-4 h-4 text-muted-foreground" />
                      <span><span className="font-medium">Title:</span> {localQuery}</span>
                    </button>
                    
                    <button 
                      onClick={() => handleContextSelect('description')}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors text-left"
                    >
                      <AlignLeft className="w-4 h-4 text-muted-foreground" />
                      <span><span className="font-medium">Description:</span> {localQuery}</span>
                    </button>
                    
                    <button 
                      onClick={() => handleContextSelect('label')}
                      className="flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition-colors text-left"
                    >
                      <Tag className="w-4 h-4 text-muted-foreground" />
                      <span><span className="font-medium">Label:</span> {localQuery}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className="p-1.5 border border-border rounded-md hover:bg-muted transition-colors bg-card w-8 h-8 flex items-center justify-center shrink-0"
              title="Search (Type anywhere to search)"
            >
              <Search className="w-3.5 h-3.5 text-foreground" />
            </button>
          )}
        </div>

        {/* Filter */}
        {(onApplyFilter && onRemoveFilter) && (
          <div className="flex items-center gap-2">
            <FilterDropdown 
              filters={filters}
              onApplyFilter={onApplyFilter}
              onRemoveFilter={onRemoveFilter}
              availableStages={availableStages}
              availablePriorities={availablePriorities}
            />
            {filters.length > 0 && onClearFilters && (
              <button 
                onClick={onClearFilters}
                className="flex items-center gap-1.5 px-2 py-1.5 border border-border rounded-md hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900 transition-colors bg-card text-xs font-medium text-muted-foreground"
                title="Clear all filters"
              >
                <Filter className="w-3 h-3 relative" />
                <span className="absolute w-[18px] h-[1px] bg-current rotate-45 transform -translate-x-[2px]"></span>
                Clear
              </button>
            )}
          </div>
        )}

        {/* View Switcher */}
        {onViewChange && (
          <div className="flex items-center bg-muted/50 p-0.5 rounded-md border border-border">
            <button 
              onClick={() => onViewChange('list')}
              className={`flex items-center justify-center gap-1.5 rounded-[4px] transition-colors ${activeView === 'list' ? 'bg-background shadow-sm border border-border/50 px-2.5 py-1' : 'px-1.5 py-1 hover:text-foreground text-muted-foreground'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
              {activeView === 'list' && <span className="text-xs font-medium">List</span>}
            </button>
            <button 
              onClick={() => onViewChange('board')}
              className={`flex items-center justify-center gap-1.5 rounded-[4px] transition-colors ${activeView === 'board' ? 'bg-background shadow-sm border border-border/50 px-2.5 py-1' : 'px-1.5 py-1 hover:text-foreground text-muted-foreground'}`}
              title="Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              {activeView === 'board' && <span className="text-xs font-medium">Board</span>}
            </button>
          </div>
        )}

        <GlobalTimerDisplay />
        <NotificationDropdown />

        {/* AI Copilot Toggle */}
        <button
          onClick={toggleChatbot}
          className={`p-1.5 border rounded-md transition-colors flex items-center justify-center ${
            isChatbotOpen
              ? "bg-primary/10 text-primary border-primary/40 shadow-xs"
              : "border-border hover:bg-muted text-foreground bg-card shadow-xs"
          }`}
          title="Toggle AI Task Copilot (⌘J)"
        >
          <Bot className="w-3.5 h-3.5" />
        </button>

        {/* Add Button */}
        {showAdd && (
          onAddClick ? (
            <Button onClick={onAddClick} variant="primary" className="gap-1.5 h-7 px-3 rounded-md ml-1 text-xs">
              <Plus className="w-3.5 h-3.5" />
              {addText}
            </Button>
          ) : (
            <Link href={addHref}>
              <Button variant="primary" className="gap-1.5 h-7 px-3 rounded-md ml-1 text-xs">
                <Plus className="w-3.5 h-3.5" />
                {addText}
              </Button>
            </Link>
          )
        )}
      </div>
    </header>
  );
}
