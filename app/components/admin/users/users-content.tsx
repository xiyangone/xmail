"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Gem, Sword, User2 } from "lucide-react";
import { ROLES } from "@/lib/permissions";
import { useUsers } from "@/hooks/use-users";

export function UsersContent() {
  const hook = useUsers();

  if (!hook.canPromote) {
    return (
      <p className="text-center text-muted-foreground py-4">
        {hook.t("noPermission")}
      </p>
    );
  }

  return (
    <div>
      <div className="p-4 border-b border-primary/10">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-muted-foreground">
            {hook.t("totalUsers", { count: hook.total })}
          </span>
        </div>

        {/* Role filters */}
        <div className="flex flex-wrap gap-2 mb-4">
          {hook.roleFilters.map((filter) => {
            const Icon = filter.icon;
            const isActive = hook.selectedRole === filter.value;
            const count = filter.value === "all"
              ? hook.total
              : hook.users.filter((u) => u.roles?.some((r) => r.name === filter.value)).length;
            return (
              <button
                key={filter.value}
                onClick={() => { hook.setSelectedRole(filter.value); hook.setPage(1); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  isActive ? "bg-primary/10 border-primary text-primary" : "bg-background border-border hover:bg-muted"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{filter.label}</span>
                {filter.value !== "all" && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">{count}</Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Search and batch ops */}
        <div className="flex items-center justify-between gap-4">
          <Input
            ref={hook.searchInputRef}
            placeholder={hook.t("searchPlaceholder")}
            value={hook.searchText}
            onChange={(e) => hook.setSearchText(e.target.value)}
            className="max-w-md"
          />
          {hook.selectedUsers.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {hook.t("selectedCount", { count: hook.selectedUsers.length })}
              </span>
              <Button variant="destructive" size="sm" onClick={() => hook.openDeleteDialog("batch")}>
                <Trash2 className="mr-2 h-4 w-4" />
                {hook.t("batchDelete")}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      {hook.loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : hook.users.length === 0 ? (
        <div className="py-12">
          <p className="text-center text-muted-foreground">
            {hook.searchText ? hook.t("noUsersFound") : hook.t("noUsers")}
          </p>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={hook.selectedUsers.length === hook.users.length && hook.users.length > 0}
                    onChange={hook.toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                  />
                </TableHead>
                <TableHead>{hook.t("userColumn")}</TableHead>
                <TableHead>{hook.t("emailColumn")}</TableHead>
                <TableHead>{hook.t("currentRoleColumn")}</TableHead>
                <TableHead>{hook.t("expiryColumn")}</TableHead>
                <TableHead className="text-right">{hook.t("actionColumn")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hook.filteredUsers.map((user) => {
                const currentRole = user.roles?.[0]?.name || ROLES.CIVILIAN;
                const roleConfig = hook.roleConfigs[currentRole as keyof typeof hook.roleConfigs];
                const Icon = roleConfig.icon;
                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={hook.selectedUsers.includes(user.id)}
                        onChange={() => hook.toggleSelectUser(user.id)}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user.image && (
                          <Image src={user.image} alt={user.name || hook.t("userAvatar")} width={32} height={32} className="rounded-full" />
                        )}
                        <div>
                          <div className="font-medium">{user.name || user.username || hook.t("unknownUser")}</div>
                          <div className="text-xs text-muted-foreground">@{user.username || user.id.slice(0, 8)}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`${roleConfig.bgColor} ${roleConfig.textColor} gap-1`}>
                        <Icon className="w-3 h-3" />
                        {roleConfig.name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {currentRole === ROLES.TEMP_USER && user.expiresAt
                        ? new Date(user.expiresAt).toLocaleString()
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {currentRole !== ROLES.EMPEROR && (
                          <Select
                            value={currentRole}
                            onValueChange={(value) => hook.handlePromote(user.id, value as Exclude<typeof currentRole, typeof ROLES.EMPEROR>)}
                          >
                            <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={ROLES.DUKE}>
                                <div className="flex items-center gap-2"><Gem className="w-3 h-3" />{hook.tr("duke")}</div>
                              </SelectItem>
                              <SelectItem value={ROLES.KNIGHT}>
                                <div className="flex items-center gap-2"><Sword className="w-3 h-3" />{hook.tr("knight")}</div>
                              </SelectItem>
                              <SelectItem value={ROLES.CIVILIAN}>
                                <div className="flex items-center gap-2"><User2 className="w-3 h-3" />{hook.tr("civilian")}</div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => hook.openDeleteDialog("single", user.id, user.name || user.username || hook.t("user"))}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t">
            <div className="text-sm text-muted-foreground">
              {hook.t("paginationInfo", {
                start: (hook.page - 1) * hook.pageSize + 1,
                end: Math.min(hook.page * hook.pageSize, hook.total),
                total: hook.total,
                pageSize: hook.pageSize,
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => hook.setPage((p) => Math.max(1, p - 1))} disabled={hook.page === 1}>
                {hook.t("prevPage")}
              </Button>
              <div className="flex items-center px-3 text-sm">
                {hook.t("pageInfo", { page: hook.page, totalPages: hook.totalPages })}
              </div>
              <Button variant="outline" size="sm" onClick={() => hook.setPage((p) => Math.min(hook.totalPages, p + 1))} disabled={hook.page >= hook.totalPages}>
                {hook.t("nextPage")}
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Delete dialog */}
      <AlertDialog open={hook.deleteDialogOpen} onOpenChange={hook.setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {hook.deleteMode === "batch" ? hook.t("confirmBatchDeleteTitle") : hook.t("confirmDeleteUserTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hook.deleteMode === "batch" ? (
                <>
                  {hook.t("confirmBatchDelete", { count: hook.selectedUsers.length })}
                  <br />
                  <span className="text-destructive font-medium">{hook.t("confirmBatchDeleteWarning")}</span>
                </>
              ) : (
                <>
                  {hook.t("confirmDeleteUser", { name: hook.deleteTarget?.name ?? "" })}
                  <br />
                  <span className="text-destructive font-medium">{hook.t("confirmDeleteWarning")}</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{hook.tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={hook.confirmDelete} className="bg-destructive hover:bg-destructive/90">
              {hook.t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}