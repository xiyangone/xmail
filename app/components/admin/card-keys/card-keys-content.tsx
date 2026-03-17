"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useCardKeys } from "@/hooks/use-card-keys";
import { CardKeyCard } from "./card-key-card";
import { CardKeyGenerateDialog } from "./card-key-generate-dialog";
import { CardKeyFilterBar } from "./card-key-filter-bar";
import { CardKeyDeleteDialog } from "./card-key-delete-dialog";

export function CardKeysContent() {
  const hook = useCardKeys();

  if (!hook.canManageCardKeys) {
    return (
      <p className="text-center text-muted-foreground py-4">
        {hook.ta("noPermission")}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {hook.selectedKeys.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => hook.openDeleteDialog("batch")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {hook.t("deleteSelected", { count: hook.selectedKeys.length })}
            </Button>
          )}
        </div>
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

      <CardKeyFilterBar
        searchText={hook.searchText}
        setSearchText={hook.setSearchText}
        filterStatus={hook.filterStatus}
        setFilterStatus={hook.setFilterStatus}
        filterOptions={hook.filterOptions}
        selectedKeys={hook.selectedKeys}
        filteredCount={hook.filteredCardKeys.length}
        toggleSelectAll={hook.toggleSelectAll}
        searchInputRef={hook.searchInputRef}
      />

      {hook.loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : hook.filteredCardKeys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {hook.t("noCardKeysFiltered", {
            filter: hook.filterStatus !== "all"
              ? (hook.filterOptions.find((o) => o.value === hook.filterStatus)?.label ?? "")
              : ""
          })}
        </div>
      ) : (
        <div className="grid gap-4">
          {hook.filteredCardKeys.map((cardKey) => (
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
