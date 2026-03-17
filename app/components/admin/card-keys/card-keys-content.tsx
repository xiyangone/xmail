"use client";

import { CreditCard, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCardKeys } from "@/hooks/use-card-keys";
import { CardKeyCard } from "./card-key-card";
import { CardKeyDeleteDialog } from "./card-key-delete-dialog";
import { CardKeyFilterBar } from "./card-key-filter-bar";
import { CardKeyGenerateDialog } from "./card-key-generate-dialog";

function CardKeysSkeleton() {
  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-32 rounded-full" />
          </div>
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </div>

      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="surface-panel rounded-2xl p-5">
          <div className="flex gap-4">
            <Skeleton className="mt-1 h-5 w-5 rounded-md" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-56 rounded-lg" />
              <div className="grid gap-2 md:grid-cols-2">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardKeysContent() {
  const hook = useCardKeys();

  if (!hook.permissionReady) {
    return <CardKeysSkeleton />;
  }

  if (!hook.canManageCardKeys) {
    return <p className="py-4 text-center text-muted-foreground">{hook.ta("noPermission")}</p>;
  }

  const paginationStart = hook.total === 0 ? 0 : (hook.page - 1) * hook.pageSize + 1;
  const paginationEnd = hook.total === 0 ? 0 : Math.min(hook.page * hook.pageSize, hook.total);
  const activeFilterLabel =
    hook.filterStatus !== "all"
      ? hook.filterOptions.find((option) => option.value === hook.filterStatus)?.label ?? ""
      : "";

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{hook.t("management")}</p>
            <p className="text-xs text-muted-foreground">{hook.ta("cardKeyManagementDesc")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {hook.selectedKeys.length > 0 ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => hook.openDeleteDialog("batch")}
                className="rounded-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {hook.t("deleteSelected", { count: hook.selectedKeys.length })}
              </Button>
            ) : null}

            <CardKeyGenerateDialog
              dialogOpen={hook.dialogOpen}
              setDialogOpen={hook.setDialogOpen}
              cardKeyMode={hook.cardKeyMode}
              setCardKeyMode={hook.setCardKeyMode}
              emailAddresses={hook.emailAddresses}
              setEmailAddresses={hook.setEmailAddresses}
              multiEmailAddresses={hook.multiEmailAddresses}
              setMultiEmailAddresses={hook.setMultiEmailAddresses}
              expiryValue={hook.expiryValue}
              setExpiryValue={hook.setExpiryValue}
              expiryUnit={hook.expiryUnit}
              setExpiryUnit={hook.setExpiryUnit}
              allowedDomains={hook.allowedDomains}
              generating={hook.generating}
              onGenerate={hook.generateCardKeys}
            />
          </div>
        </div>
      </div>

      <CardKeyFilterBar
        searchText={hook.searchText}
        setSearchText={hook.setSearchText}
        filterStatus={hook.filterStatus}
        setFilterStatus={hook.setFilterStatus}
        filterOptions={hook.filterOptions}
        selectedKeys={hook.selectedKeys}
        visibleCount={hook.cardKeys.length}
        totalCount={hook.total}
        toggleSelectAll={hook.toggleSelectAll}
        searchInputRef={hook.searchInputRef}
      />

      {hook.loading ? (
        <CardKeysSkeleton />
      ) : hook.cardKeys.length === 0 ? (
        <div className="surface-panel flex flex-col items-center justify-center gap-3 rounded-3xl px-6 py-16 text-center">
          <CreditCard className="h-8 w-8 text-primary/70" />
          <div className="space-y-1">
            <p className="font-medium text-foreground">
              {hook.searchText || hook.filterStatus !== "all"
                ? hook.t("noCardKeysFiltered", { filter: activeFilterLabel })
                : hook.t("noCardKeys")}
            </p>
            <p className="text-sm text-muted-foreground">{hook.t("noCardKeysHint")}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {hook.cardKeys.map((cardKey) => (
              <CardKeyCard
                key={cardKey.id}
                cardKey={cardKey}
                selected={hook.selectedKeys.includes(cardKey.id)}
                onToggleSelect={hook.toggleSelectKey}
                onCopy={hook.copyToClipboard}
                onReset={hook.resetCardKey}
                onDelete={hook.openDeleteDialog}
                status={hook.getCardKeyStatus(cardKey)}
              />
            ))}
          </div>

          <div className="surface-toolbar rounded-2xl px-4 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                {hook.ta("paginationInfo", {
                  start: paginationStart,
                  end: paginationEnd,
                  total: hook.total,
                  pageSize: hook.pageSize,
                })}
              </div>

              <div className="flex items-center gap-2 self-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => hook.setPage(Math.max(1, hook.page - 1))}
                  disabled={hook.page === 1}
                  className="rounded-full"
                >
                  {hook.ta("prevPage")}
                </Button>

                <div className="min-w-[108px] text-center text-sm text-muted-foreground">
                  {hook.ta("pageInfo", { page: hook.page, totalPages: hook.totalPages })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => hook.setPage(Math.min(hook.totalPages, hook.page + 1))}
                  disabled={hook.page >= hook.totalPages}
                  className="rounded-full"
                >
                  {hook.ta("nextPage")}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      <CardKeyDeleteDialog
        open={hook.deleteDialogOpen}
        onOpenChange={hook.setDeleteDialogOpen}
        deleteTarget={hook.deleteTarget}
        onConfirm={hook.confirmDelete}
      />
    </div>
  );
}
