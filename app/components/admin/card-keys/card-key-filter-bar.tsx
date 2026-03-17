"use client";

import { AlertCircle, CheckCircle2, Clock, Filter } from "lucide-react";
import type { RefObject } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { CardKeyFilter } from "@/hooks/use-card-keys";

interface CardKeyFilterBarProps {
  searchText: string;
  setSearchText: (value: string) => void;
  filterStatus: CardKeyFilter;
  setFilterStatus: (value: CardKeyFilter) => void;
  filterOptions: { value: CardKeyFilter; label: string }[];
  selectedKeys: string[];
  visibleCount: number;
  totalCount: number;
  toggleSelectAll: () => void;
  searchInputRef: RefObject<HTMLInputElement | null>;
}

const filterIcons = {
  all: Filter,
  unused: Clock,
  used: CheckCircle2,
  "expiring-soon": AlertCircle,
} as const;

export function CardKeyFilterBar({
  searchText,
  setSearchText,
  filterStatus,
  setFilterStatus,
  filterOptions,
  selectedKeys,
  visibleCount,
  totalCount,
  toggleSelectAll,
  searchInputRef,
}: CardKeyFilterBarProps) {
  const t = useTranslations("cardKey");

  return (
    <div className="surface-toolbar rounded-2xl p-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Input
            ref={searchInputRef}
            placeholder={t("searchPlaceholder")}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-full rounded-xl bg-background/70 xl:max-w-md"
          />

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{t("totalCardKeys", { count: totalCount })}</span>
            {visibleCount > 0 ? (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedKeys.length === visibleCount && visibleCount > 0}
                  onChange={toggleSelectAll}
                />
                <span>{t("selectAll", { selected: selectedKeys.length, total: visibleCount })}</span>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterOptions.map((option) => {
            const Icon = filterIcons[option.value];
            const isActive = filterStatus === option.value;

            return (
              <Button
                key={option.value}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterStatus(option.value)}
                className="rounded-full px-4"
              >
                <Icon className="mr-2 h-4 w-4" />
                {option.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
