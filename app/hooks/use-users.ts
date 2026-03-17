"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS, ROLES, Role } from "@/lib/permissions";
import { useTranslations } from "next-intl";
import { Crown, Gem, Sword, User2, Clock, Users } from "lucide-react";

export interface UserItem {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  createdAt: string;
  expiresAt?: string | null;
  roles?: { name: Role }[];
}

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>;

export function useUsers() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState<"single" | "batch">("single");
  const { toast } = useToast();
  const { checkPermission } = useRolePermission();
  const canPromote = checkPermission(PERMISSIONS.PROMOTE_USER);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tr = useTranslations("roles");

  const roleConfigs = useMemo(() => ({
    [ROLES.EMPEROR]: { name: tr("emperor"), icon: Crown, bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
    [ROLES.DUKE]: { name: tr("duke"), icon: Gem, bgColor: "bg-purple-100", textColor: "text-purple-800" },
    [ROLES.KNIGHT]: { name: tr("knight"), icon: Sword, bgColor: "bg-blue-100", textColor: "text-blue-800" },
    [ROLES.CIVILIAN]: { name: tr("civilian"), icon: User2, bgColor: "bg-gray-100", textColor: "text-gray-800" },
    [ROLES.TEMP_USER]: { name: tr("tempUser"), icon: Clock, bgColor: "bg-orange-100", textColor: "text-orange-800" },
  } as const), [tr]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (selectedRole && selectedRole !== "all") {
        params.append("role", selectedRole);
      }
      const response = await fetch(`/api/admin/users?${params}`);
      if (!response.ok) throw new Error(t("fetchUsersFailed"));
      const data = (await response.json()) as { users: UserItem[]; total: number };
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("fetchUsersFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, selectedRole, toast, t, tc]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (canPromote) {
      fetchUsers();
    }
  }, [canPromote, fetchUsers]);

  const roleFilters = useMemo(() => [
    { value: "all", label: t("filterAll"), icon: Users },
    { value: ROLES.EMPEROR, label: tr("emperor"), icon: Crown },
    { value: ROLES.DUKE, label: tr("duke"), icon: Gem },
    { value: ROLES.KNIGHT, label: tr("knight"), icon: Sword },
    { value: ROLES.CIVILIAN, label: tr("civilian"), icon: User2 },
    { value: ROLES.TEMP_USER, label: tr("tempUser"), icon: Clock },
  ], [t, tr]);

  const filteredUsers = useMemo(() => {
    if (!searchText.trim()) return users;
    const search = searchText.toLowerCase();
    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(search) ||
        user.username?.toLowerCase().includes(search) ||
        user.email?.toLowerCase().includes(search)
    );
  }, [users, searchText]);

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
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
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
        const deletePromises = selectedUsers.map((userId) =>
          fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" })
        );
        await Promise.all(deletePromises);
        toast({
          title: t("deleteSuccess"),
          description: t("batchDeleteSuccess", { count: selectedUsers.length }),
        });
        setSelectedUsers([]);
      } else {
        if (!deleteTarget) return;
        const response = await fetch(`/api/admin/users?id=${deleteTarget.id}`, { method: "DELETE" });
        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          throw new Error(error.error || t("deleteFailed"));
        }
        toast({ title: t("deleteSuccess"), description: t("userDeleted") });
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

  const totalPages = Math.ceil(total / pageSize);

  return {
    users, loading, searchText, selectedRole, page, total, pageSize,
    deleteDialogOpen, deleteTarget, selectedUsers, deleteMode,
    canPromote, filteredUsers, roleFilters, roleConfigs, totalPages,
    searchInputRef,
    t, tc, tr,
    setSearchText, setSelectedRole, setPage, setDeleteDialogOpen,
    handlePromote, toggleSelectUser, toggleSelectAll,
    openDeleteDialog, confirmDelete,
  };
}
