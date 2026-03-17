"use client";

import Image from "next/image";
import { Clock, Gem, Sword, Trash2, User2, Users } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ROLES } from "@/lib/permissions";
import { useUsers } from "@/hooks/use-users";

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-9 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/60">
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="grid grid-cols-[24px_1.1fr_1fr_180px_140px_120px] gap-4">
              <Skeleton className="h-5 w-5 rounded-md" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
              <Skeleton className="h-12 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function UsersContent() {
  const hook = useUsers();

  if (!hook.permissionReady) {
    return <UsersTableSkeleton />;
  }

  if (!hook.canPromote) {
    return <p className="py-4 text-center text-muted-foreground">{hook.t("noPermission")}</p>;
  }

  const paginationStart = hook.total === 0 ? 0 : (hook.page - 1) * hook.pageSize + 1;
  const paginationEnd = hook.total === 0 ? 0 : Math.min(hook.page * hook.pageSize, hook.total);

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{hook.t("totalUsers", { count: hook.total })}</p>
              <p className="text-xs text-muted-foreground">{hook.t("userManagementDesc")}</p>
            </div>

            {hook.selectedUsers.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {hook.t("selectedCount", { count: hook.selectedUsers.length })}
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => hook.openDeleteDialog("batch")}
                  className="rounded-full"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {hook.t("batchDelete")}
                </Button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            {hook.roleFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = hook.selectedRole === filter.value;

              return (
                <Button
                  key={filter.value}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => hook.setSelectedRole(filter.value)}
                  className="rounded-full px-4"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {filter.label}
                </Button>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Input
              ref={hook.searchInputRef}
              placeholder={hook.t("userSearchPlaceholder")}
              value={hook.searchText}
              onChange={(event) => hook.setSearchText(event.target.value)}
              className="w-full rounded-xl bg-background/70 lg:max-w-md"
            />

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{hook.t("pageInfo", { page: hook.page, totalPages: hook.totalPages })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden">
        {hook.loading ? (
          <UsersTableSkeleton />
        ) : hook.users.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <Users className="h-8 w-8 text-primary/70" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                {hook.searchText || hook.selectedRole !== "all" ? hook.t("noUsersFound") : hook.t("noUsers")}
              </p>
              <p className="text-sm text-muted-foreground">{hook.t("userEmptyHint")}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={hook.selectedUsers.length === hook.users.length && hook.users.length > 0}
                        onChange={hook.toggleSelectAll}
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
                  {hook.users.map((user) => {
                    const currentRole = user.roles?.[0]?.name || ROLES.CIVILIAN;
                    const roleConfig = hook.roleConfigs[currentRole];
                    const Icon = roleConfig.icon;

                    return (
                      <TableRow key={user.id} className="border-border/50">
                        <TableCell>
                          <Checkbox
                            checked={hook.selectedUsers.includes(user.id)}
                            onChange={() => hook.toggleSelectUser(user.id)}
                          />
                        </TableCell>

                        <TableCell>
                          <div className="flex min-w-[220px] items-center gap-3">
                            {user.image ? (
                              <Image
                                src={user.image}
                                alt={user.name || hook.t("userAvatar")}
                                width={36}
                                height={36}
                                className="rounded-full ring-2 ring-primary/10"
                              />
                            ) : (
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                {(user.name || user.username || hook.t("user")).slice(0, 1).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {user.name || user.username || hook.t("unknownUser")}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                @{user.username || user.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="min-w-[220px] text-muted-foreground">
                          {user.email || "-"}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`${roleConfig.bgColor} ${roleConfig.textColor} gap-1.5 border-transparent`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {roleConfig.name}
                          </Badge>
                        </TableCell>

                        <TableCell className="min-w-[160px] text-muted-foreground">
                          {currentRole === ROLES.TEMP_USER && user.expiresAt
                            ? new Date(user.expiresAt).toLocaleString()
                            : "-"}
                        </TableCell>

                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {currentRole !== ROLES.EMPEROR ? (
                              <Select
                                value={currentRole}
                                onValueChange={(value) =>
                                  hook.handlePromote(user.id, value as Exclude<typeof currentRole, typeof ROLES.EMPEROR>)
                                }
                              >
                                <SelectTrigger className="h-9 w-[140px] rounded-xl bg-background/70">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={ROLES.TEMP_USER} disabled>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      {hook.tr("tempUser")}
                                    </div>
                                  </SelectItem>
                                  <SelectItem value={ROLES.DUKE}>
                                    <div className="flex items-center gap-2">
                                      <Gem className="h-3 w-3" />
                                      {hook.tr("duke")}
                                    </div>
                                  </SelectItem>
                                  <SelectItem value={ROLES.KNIGHT}>
                                    <div className="flex items-center gap-2">
                                      <Sword className="h-3 w-3" />
                                      {hook.tr("knight")}
                                    </div>
                                  </SelectItem>
                                  <SelectItem value={ROLES.CIVILIAN}>
                                    <div className="flex items-center gap-2">
                                      <User2 className="h-3 w-3" />
                                      {hook.tr("civilian")}
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : null}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                hook.openDeleteDialog(
                                  "single",
                                  user.id,
                                  user.name || user.username || hook.t("user")
                                )
                              }
                              className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
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
            </div>

            <div className="border-t border-border/60 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {hook.t("paginationInfo", {
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
                    {hook.t("prevPage")}
                  </Button>

                  <div className="min-w-[108px] text-center text-sm text-muted-foreground">
                    {hook.t("pageInfo", { page: hook.page, totalPages: hook.totalPages })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => hook.setPage(Math.min(hook.totalPages, hook.page + 1))}
                    disabled={hook.page >= hook.totalPages}
                    className="rounded-full"
                  >
                    {hook.t("nextPage")}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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
                  <span className="font-medium text-destructive">{hook.t("confirmBatchDeleteWarning")}</span>
                </>
              ) : (
                <>
                  {hook.t("confirmDeleteUser", { name: hook.deleteTarget?.name ?? "" })}
                  <br />
                  <span className="font-medium text-destructive">{hook.t("confirmDeleteWarning")}</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{hook.tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={hook.confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {hook.t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
