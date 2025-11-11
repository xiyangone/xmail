"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  ArrowLeft,
  Crown,
  Gem,
  Sword,
  User2,
  Trash2,
  Clock,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS, ROLES, Role } from "@/lib/permissions";
import Image from "next/image";
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

interface User {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  image?: string;
  createdAt: string;
  expiresAt?: string | null;
  roles?: { name: Role }[];
}

const roleConfigs = {
  [ROLES.EMPEROR]: {
    name: "皇帝",
    icon: Crown,
    bgColor: "bg-yellow-100",
    textColor: "text-yellow-800",
  },
  [ROLES.DUKE]: {
    name: "公爵",
    icon: Gem,
    bgColor: "bg-purple-100",
    textColor: "text-purple-800",
  },
  [ROLES.KNIGHT]: {
    name: "骑士",
    icon: Sword,
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
  },
  [ROLES.CIVILIAN]: {
    name: "平民",
    icon: User2,
    bgColor: "bg-gray-100",
    textColor: "text-gray-800",
  },
  [ROLES.TEMP_USER]: {
    name: "临时用户",
    icon: Clock,
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
  },
} as const;

type RoleWithoutEmperor = Exclude<Role, typeof ROLES.EMPEROR>;

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState<"single" | "batch">("single");
  const { toast } = useToast();
  const router = useRouter();
  const { checkPermission } = useRolePermission();
  const canPromote = checkPermission(PERMISSIONS.PROMOTE_USER);
  const searchInputRef = useRef<HTMLInputElement>(null);

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
      if (!response.ok) {
        throw new Error("获取用户列表失败");
      }
      const data = (await response.json()) as { users: User[]; total: number };
      setUsers(data.users);
      setTotal(data.total);
    } catch (error) {
      toast({
        title: "错误",
        description:
          error instanceof Error ? error.message : "获取用户列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, selectedRole, toast]);

  // 自动聚焦到搜索框
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (canPromote) {
      fetchUsers();
    }
  }, [canPromote, fetchUsers]);

  // 使用 useMemo 缓存角色过滤器配置
  const roleFilters = useMemo(
    () => [
      { value: "all", label: "全部", icon: Users },
      { value: ROLES.EMPEROR, label: "皇帝", icon: Crown },
      { value: ROLES.DUKE, label: "公爵", icon: Gem },
      { value: ROLES.KNIGHT, label: "骑士", icon: Sword },
      { value: ROLES.CIVILIAN, label: "平民", icon: User2 },
      { value: ROLES.TEMP_USER, label: "临时用户", icon: Clock },
    ],
    []
  );

  // 使用 useMemo 缓存过滤后的用户列表
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

  const handlePromote = async (
    userId: string,
    roleName: RoleWithoutEmperor
  ) => {
    try {
      const response = await fetch("/api/roles/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleName }),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error: string };
        throw new Error(error.error || "设置失败");
      }

      toast({
        title: "设置成功",
        description: `用户角色已更新为${roleConfigs[roleName].name}`,
      });

      fetchUsers();
    } catch (error) {
      toast({
        title: "设置失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    }
  };

  const toggleSelectUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleSelectAll = () => {
    // 过滤掉皇帝用户,不允许选中
    const selectableUsers = users.filter(
      (u) => u.roles?.[0]?.name !== ROLES.EMPEROR
    );

    if (selectedUsers.length === selectableUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(selectableUsers.map((u) => u.id));
    }
  };

  const openDeleteDialog = (
    mode: "single" | "batch",
    userId?: string,
    userName?: string
  ) => {
    setDeleteMode(mode);
    if (mode === "single" && userId && userName) {
      setDeleteTarget({ id: userId, name: userName });
    }
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      if (deleteMode === "batch") {
        // 批量删除
        const deletePromises = selectedUsers.map((userId) =>
          fetch(`/api/admin/users?id=${userId}`, {
            method: "DELETE",
          })
        );

        await Promise.all(deletePromises);

        toast({
          title: "删除成功",
          description: `已删除 ${selectedUsers.length} 个用户`,
        });

        setSelectedUsers([]);
      } else {
        // 单个删除
        if (!deleteTarget) return;

        const response = await fetch(`/api/admin/users?id=${deleteTarget.id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const error = (await response.json()) as { error: string };
          throw new Error(error.error || "删除失败");
        }

        toast({
          title: "删除成功",
          description: "用户已删除",
        });
      }

      fetchUsers();
    } catch (error) {
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : "请稍后重试",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  if (!canPromote) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-background rounded-lg border p-6">
          <p className="text-center text-muted-foreground">
            您没有权限访问此页面
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">用户管理</h1>
      </div>

      {/* 用户列表卡片 */}
      <div className="bg-background rounded-lg border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">用户列表</h2>
            <span className="text-sm text-muted-foreground">
              共 {total} 个用户
            </span>
          </div>

          {/* 角色筛选标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {roleFilters.map((filter) => {
              const Icon = filter.icon;
              const isActive = selectedRole === filter.value;
              const count =
                filter.value === "all"
                  ? total
                  : users.filter((u) =>
                      u.roles?.some((r) => r.name === filter.value)
                    ).length;

              return (
                <button
                  key={filter.value}
                  onClick={() => {
                    setSelectedRole(filter.value);
                    setPage(1);
                  }}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors
                    ${
                      isActive
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border hover:bg-muted"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                  {filter.value !== "all" && (
                    <Badge
                      variant="secondary"
                      className="ml-1 px-1.5 py-0 text-xs"
                    >
                      {count}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>

          {/* 搜索框和批量操作 */}
          <div className="flex items-center justify-between gap-4">
            <Input
              ref={searchInputRef}
              placeholder="搜索卡密/邮箱/使用者"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="max-w-md"
            />
            {selectedUsers.length > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  已选择 {selectedUsers.length} 个用户
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => openDeleteDialog("batch")}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  批量删除
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 表格 */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12">
            <p className="text-center text-muted-foreground">
              {searchText ? "未找到匹配的用户" : "暂无用户"}
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
                      checked={
                        selectedUsers.length === users.length &&
                        users.length > 0
                      }
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                    />
                  </TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>邮箱</TableHead>
                  <TableHead>当前角色</TableHead>
                  <TableHead>到期时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const currentRole = user.roles?.[0]?.name || ROLES.CIVILIAN;
                  const roleConfig =
                    roleConfigs[currentRole as keyof typeof roleConfigs];
                  const Icon = roleConfig.icon;

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        {/* 皇帝用户不显示复选框 */}
                        {currentRole !== ROLES.EMPEROR && (
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {user.image && (
                            <Image
                              src={user.image}
                              alt={user.name || "用户头像"}
                              width={32}
                              height={32}
                              className="rounded-full"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {user.name || user.username || "未知用户"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              @{user.username || user.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${roleConfig.bgColor} ${roleConfig.textColor} gap-1`}
                        >
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
                              onValueChange={(value) =>
                                handlePromote(
                                  user.id,
                                  value as RoleWithoutEmperor
                                )
                              }
                            >
                              <SelectTrigger className="w-28 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={ROLES.DUKE}>
                                  <div className="flex items-center gap-2">
                                    <Gem className="w-3 h-3" />
                                    公爵
                                  </div>
                                </SelectItem>
                                <SelectItem value={ROLES.KNIGHT}>
                                  <div className="flex items-center gap-2">
                                    <Sword className="w-3 h-3" />
                                    骑士
                                  </div>
                                </SelectItem>
                                <SelectItem value={ROLES.CIVILIAN}>
                                  <div className="flex items-center gap-2">
                                    <User2 className="w-3 h-3" />
                                    平民
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          {/* 皇帝用户不显示删除按钮 */}
                          {currentRole !== ROLES.EMPEROR && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() =>
                                openDeleteDialog(
                                  "single",
                                  user.id,
                                  user.name || user.username || "用户"
                                )
                              }
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* 分页 */}
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                显示 {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, total)} / {total} · 每页 {pageSize}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  上一页
                </Button>
                <div className="flex items-center px-3 text-sm">
                  第 {page} / {totalPages} 页
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  下一页
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteMode === "batch" ? "确认批量删除" : "确认删除用户"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === "batch" ? (
                <>
                  确定要删除选中的{" "}
                  <span className="font-semibold">{selectedUsers.length}</span>{" "}
                  个用户吗？
                  <br />
                  <span className="text-destructive font-medium">
                    此操作将同时删除这些用户关联的卡密和所有数据，且不可恢复。
                  </span>
                </>
              ) : (
                <>
                  确定要删除用户{" "}
                  <span className="font-semibold">
                    &quot;{deleteTarget?.name}&quot;
                  </span>{" "}
                  吗？
                  <br />
                  <span className="text-destructive font-medium">
                    此操作将同时删除该用户关联的卡密和所有数据，且不可恢复。
                  </span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
