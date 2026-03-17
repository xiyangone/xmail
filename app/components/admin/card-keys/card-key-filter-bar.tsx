"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Filter, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { CardKeyFilter } from "@/hooks/use-card-keys";

interface CardKeyFilterBarProps {
  searchText: string;
  setSearchText: (v: string) => void;
  filterStatus: CardKeyFilter;
  setFilterStatus: (v: CardKeyFilter) => void;
  filterOptions: { value: CardKeyFilter; label: string; count: number }[];
  selectedKeys: string[];
  filteredCount: number;
  toggleSelectAll: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

const filterIcons = {
  all: Filter,
  unused: Clock,
  used: CheckCircle2,
  "expiring-soon": AlertCircle,
} as const;

export function CardKeyFilterBar({
  searchText, setSearchText, filterStatus, setFilterStatus,
  filterOptions, selectedKeys, filteredCount, toggleSelectAll, searchInputRef,
}: CardKeyFilterBarProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Input
          ref={searchInputRef}
          placeholder="搜索卡密..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-md"
        />
        {filteredCount > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedKeys.length === filteredCount && filteredCount > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">
              {selectedKeys.length}/{filteredCount}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((option) => {
          const Icon = filterIcons[option.value];
          const isActive = filterStatus === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                ${isActive
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-background border-border hover:bg-muted"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span>{option.label}</span>
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {option.count}
              </Badge>
            </button>
          );
        })}
      </div>
    </>
  );
}
