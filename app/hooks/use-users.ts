"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { Crown, Gem, Sword, User2, Clock, Users } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS, ROLES, Role } from "@/lib/permissions";
import { useTranslations } from "next-intl";

export interface UserItem {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  expiresAt?: string | null;
  roles?: { name: Role }[];
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>;
export type UserRoleFilter = "all" | Role;

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 1,
};

export function useUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRoleFilter>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState<"single" | "batch">("single");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const deferredSearchText = useDeferredValue(searchText.trim());
  const { toast } = useToast();
  const { checkPermission, isReady } = useRolePermission();
  const canPromote = isReady && checkPermission(PERMISSIONS.PROMOTE_USER);
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");

  const roleConfigs = useMemo(
    () => ({
      [ROLES.EMPEROR]: {
        name: tr("emperor"),
        icon: Crown,
        bgColor: "bg-amber-500/15",
        textColor: "text-amber-700 dark:text-amber-200",
      },
      [ROLES.DUKE]: {
        name: tr("duke"),
        icon: Gem,
        bgColor: "bg-violet-500/15",
        textColor: "text-violet-700 dark:text-violet-200",
      },
      [ROLES.KNIGHT]: {
        name: tr("knight"),
        icon: Sword,
        bgColor: "bg-sky-500/15",
        textColor: "text-sky-700 dark:text-sky-200",
      },
      [ROLES.CIVILIAN]: {
        name: tr("civilian"),
        icon: User2,
        bgColor: "bg-slate-500/15",
        textColor: "text-slate-700 dark:text-slate-200",
      },
      [ROLES.TEMP_USER]: {
        name: tr("tempUser"),
        icon: Clock,
        bgColor: "bg-orange-500/15",
        textColor: "text-orange-700 dark:text-orange-200",
      },
    }),
    [tr]
  );

  const roleFilters = useMemo(
    () => [
      { value: "all" as const, label: t("filterAll"), icon: Users },
      { value: ROLES.EMPEROR, label: tr("emperor"), icon: Crown },
      { value: ROLES.DUKE, label: tr("duke"), icon: Gem },
      { value: ROLES.KNIGHT, label: tr("knight"), icon: Sword },
      { value: ROLES.CIVILIAN, label: tr("civilian"), icon: User2 },
      { value: ROLES.TEMP_USER, label: tr("tempUser"), icon: Clock },
    ],
    [t, tr]
  );

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [deferredSearchText, page, selectedRole]);

  const fetchUsers = useCallback(async () => {
    if (!canPromote) {
      setUsers([]);
      setPagination((current) => ({ ...current, total: 0, totalPages: 1 }));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: DEFAULT_PAGINATION.pageSize.toString(),
      });

      if (selectedRole !== "all") {
        params.set("role", selectedRole);
      }

      if (deferredSearchText) {
        params.set("search", deferredSearchText);
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`);
      if (!response.ok) {
        throw new Error(t("fetchUsersFailed"));
      }

      const data = (await response.json()) as {
        users: UserItem[];
        pagination: PaginationInfo;
      };

      setUsers(data.users);
      setPagination(data.pagination);

      if (data.pagination.page !== page) {
        setPage(data.pagination.page);
      }
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("fetchUsersFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canPromote, deferredSearchText, page, selectedRole, t, tc, toast]);

  useEffect(() => {
    if (!isReady) return;
    fetchUsers();
  }, [fetchUsers, isReady]);

  useEffect(() => {
    setSelectedUsers([]);
  }, [users]);

  const handlePromote = async (userId: string, roleName: RoleWithoutEmperor) => {
    try {
      const response = await fetch("/api/roles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleName }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error: string };
        throw new Error(error.error || t("setFailed"));
      }

      toast({
        title: t("setSuccess"),
        description: t("roleUpdated", { role: roleConfigs[roleName].name }),
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: t("setFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((previous) =>
      previous.includes(userId) ? previous.filter((id) => id !== userId) : [...previous, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
      return;
    }

    setSelectedUsers(users.map((user) => user.id));
  };

  const openDeleteDialog = (mode: "single" | "batch", userId?: string, userName?: string) => {
    setDeleteMode(mode);

    if (mode === "single" && userId && userName) {
      setDeleteTarget({ id: userId, name: userName });
    }

    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteMode === "batch") {
        const deletePromises = selectedUsers.map(async (userId) => {
          const response = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });

          if (!response.ok) {
            const error = (await response.json()) as { error?: string };
            throw new Error(error.error || t("deleteFailed"));
          }

          return userId;
        });

        const results = await Promise.allSettled(deletePromises);
        const successCount = results.filter((result) => result.status === "fulfilled").length;
        const failCount = results.length - successCount;

        toast({
          title: t("deleteSuccess"),
          description:
            failCount > 0
              ? t("batchDeleteResultWithFail", { success: successCount, fail: failCount })
              : t("batchDeleteSuccess", { count: successCount }),
        });

        setSelectedUsers([]);
      } else {
        if (!deleteTarget) return;

        const response = await fetch(`/api/admin/users?id=${deleteTarget.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          throw new Error(error.error || t("deleteFailed"));
        }

        toast({
          title: t("deleteSuccess"),
          description: t("userDeleted"),
        });
      }

      fetchUsers();
    } catch (error) {
      toast({
        title: t("deleteFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  return {
    users,
    loading,
    searchText,
    selectedRole,
    page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    totalPages: pagination.totalPages,
    deleteDialogOpen,
    deleteTarget,
    selectedUsers,
    deleteMode,
    permissionReady: isReady,
    canPromote,
    roleFilters,
    roleConfigs,
    searchInputRef,
    t,
    tc,
    tr,
    setSearchText,
    setSelectedRole,
    setPage,
    setDeleteDialogOpen,
    handlePromote,
    toggleSelectUser,
    toggleSelectAll,
    openDeleteDialog,
    confirmDelete,
  };
}
