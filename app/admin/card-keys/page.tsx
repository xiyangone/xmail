"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Plus,
  Trash2,
  Copy,
  Filter,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Mail,
  Calendar,
  User,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { useRouter } from "next/navigation";

interface CardKey {
  id: string;
  code: string;
  emailAddress: string;
  mode: "single" | "multi";
  emailDomain?: string | null;
  emailLimit?: number | null;
  isUsed: boolean;
  usedBy?: {
    id: string;
    name: string;
    username: string;
  };
  usedAt?: string;
  createdAt: string;
  expiresAt: string;
}

type CardKeyFilter = "all" | "unused" | "used" | "expiring-soon";

export default function CardKeysPage() {
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cardKeyMode, setCardKeyMode] = useState<"single" | "multi">("single");
  const [emailAddresses, setEmailAddresses] = useState("");
  const [multiEmailAddresses, setMultiEmailAddresses] = useState("");
  const [expiryValue, setExpiryValue] = useState("7");
  const [expiryUnit, setExpiryUnit] = useState<"minutes" | "hours" | "days">(
    "days"
  );
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CardKeyFilter>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "batch";
    id?: string;
    count?: number;
  } | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const { toast } = useToast();
  const { checkPermission } = useRolePermission();
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const canManageCardKeys = checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);

  const calculateExpiryMinutes = () => {
    const value = parseInt(expiryValue);
    switch (expiryUnit) {
      case "minutes":
        return value;
      case "hours":
        return value * 60;
      case "days":
        return value * 24 * 60;
      default:
        return value * 24 * 60; // 默认为天
    }
  };

  const fetchAllowedDomains = useCallback(async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = (await response.json()) as { emailDomains?: string };
        const domains = data.emailDomains
          ?.split(",")
          .map((d: string) => d.trim()) || ["moemail.app"];
        setAllowedDomains(domains);
      }
    } catch (error) {
      console.error("获取域名列表失败:", error);
    }
  }, []);

  const fetchCardKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/card-keys");
      if (!response.ok) {
        throw new Error("获取卡密列表失败");
      }
      const data = (await response.json()) as { cardKeys: CardKey[] };
      setCardKeys(data.cardKeys);
    } catch (error) {
      toast({
        title: "错误",
        description:
          error instanceof Error ? error.message : "获取卡密列表失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // 使用 useMemo 优化过滤逻辑
  const filteredCardKeys = useMemo(() => {
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let filtered = cardKeys;

    switch (filterStatus) {
      case "unused":
        filtered = cardKeys.filter(
          (key) => !key.isUsed && new Date(key.expiresAt) > now
        );
        break;
      case "used":
        filtered = cardKeys.filter((key) => key.isUsed);
        break;
      case "expiring-soon":
        filtered = cardKeys.filter(
          (key) =>
            !key.isUsed &&
            new Date(key.expiresAt) > now &&
            new Date(key.expiresAt) <= oneDayFromNow
        );
        break;
      default:
        filtered = cardKeys;
    }

    // 应用搜索过滤
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter(
        (key) =>
          key.code.toLowerCase().includes(searchLower) ||
          key.emailAddress.toLowerCase().includes(searchLower) ||
          (key.usedBy?.name &&
            key.usedBy.name.toLowerCase().includes(searchLower)) ||
          (key.usedBy?.username &&
            key.usedBy.username.toLowerCase().includes(searchLower))
      );
    }

    return filtered;
  }, [cardKeys, filterStatus, searchText]);

  // 自动聚焦到搜索框
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (canManageCardKeys) {
      fetchCardKeys();
      fetchAllowedDomains();
    }
  }, [canManageCardKeys, fetchCardKeys, fetchAllowedDomains]);

  const generateCardKeys = async () => {
    if (cardKeyMode === "single") {
      // 单卡密模式验证
      const addresses = emailAddresses
        .split("\n")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addresses.length === 0) {
        toast({
          title: "错误",
          description: "请输入至少一个邮箱地址",
          variant: "destructive",
        });
        return;
      }

      // 前端验证域名
      const invalidEmails = addresses.filter((email) => {
        const domain = email.split("@")[1];
        return !domain || !allowedDomains.includes(domain);
      });

      if (invalidEmails.length > 0) {
        toast({
          title: "错误",
          description: `以下邮箱地址的域名不在允许的域名列表中：${invalidEmails.join(
            ", "
          )}`,
          variant: "destructive",
        });
        return;
      }
    } else {
      // 多卡密模式验证
      const addresses = multiEmailAddresses
        .split("\n")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (addresses.length === 0) {
        toast({
          title: "错误",
          description: "请输入至少一个邮箱地址",
          variant: "destructive",
        });
        return;
      }

      // 前端验证域名
      const invalidEmails = addresses.filter((email) => {
        const domain = email.split("@")[1];
        return !domain || !allowedDomains.includes(domain);
      });

      if (invalidEmails.length > 0) {
        toast({
          title: "错误",
          description: `以下邮箱地址的域名不在允许的域名列表中：${invalidEmails.join(
            ", "
          )}`,
          variant: "destructive",
        });
        return;
      }
    }

    setGenerating(true);
    try {
      const requestBody =
        cardKeyMode === "single"
          ? {
              mode: "single",
              emailAddresses: emailAddresses
                .split("\n")
                .map((addr) => addr.trim())
                .filter((addr) => addr.length > 0),
              expiryMinutes: calculateExpiryMinutes(),
            }
          : {
              mode: "multi",
              emailAddresses: multiEmailAddresses
                .split("\n")
                .map((addr) => addr.trim())
                .filter((addr) => addr.length > 0),
              expiryMinutes: calculateExpiryMinutes(),
            };

      const response = await fetch("/api/admin/card-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      const data = (await response.json()) as {
        message: string;
        cardKeys: { code: string; emailAddress: string }[];
      };
      toast({
        title: "成功",
        description: data.message,
      });

      setDialogOpen(false);
      setCardKeyMode("single");
      setEmailAddresses("");
      setMultiEmailAddresses("");
      setExpiryValue("7");
      setExpiryUnit("days");
      fetchCardKeys();
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "生成卡密失败",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "已复制",
      description: "卡密已复制到剪贴板",
    });
  };

  const openDeleteDialog = (type: "single" | "batch", id?: string) => {
    if (type === "batch" && selectedKeys.length === 0) {
      toast({
        title: "提示",
        description: "请先选择要删除的卡密",
        variant: "destructive",
      });
      return;
    }
    setDeleteTarget({
      type,
      id,
      count: type === "batch" ? selectedKeys.length : 1,
    });
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "single" && deleteTarget.id) {
        await deleteCardKey(deleteTarget.id);
      } else if (deleteTarget.type === "batch") {
        await deleteSelectedKeys();
      }
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const deleteCardKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/card-keys?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      toast({
        title: "成功",
        description: "卡密删除成功",
      });

      // 从选中列表中移除已删除的卡密
      setSelectedKeys((prev) => prev.filter((k) => k !== id));

      fetchCardKeys();
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "删除卡密失败",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteSelectedKeys = async () => {
    try {
      const results = await Promise.allSettled(
        selectedKeys.map((id) =>
          fetch(`/api/admin/card-keys?id=${id}`, { method: "DELETE" })
        )
      );

      const successCount = results.filter(
        (r) => r.status === "fulfilled"
      ).length;
      const failCount = results.filter((r) => r.status === "rejected").length;

      toast({
        title: "删除完成",
        description: `成功删除 ${successCount} 个卡密${
          failCount > 0 ? `，${failCount} 个失败` : ""
        }`,
      });

      setSelectedKeys([]);
      fetchCardKeys();
    } catch {
      toast({
        title: "错误",
        description: "批量删除失败",
        variant: "destructive",
      });
      throw new Error("批量删除失败");
    }
  };

  const resetCardKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/card-keys?id=${id}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }

      toast({
        title: "成功",
        description: "卡密已重置，可以再次使用",
      });

      fetchCardKeys();
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "重置卡密失败",
        variant: "destructive",
      });
    }
  };

  const toggleSelectKey = (id: string) => {
    setSelectedKeys((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const allKeys = filteredCardKeys.map((k) => k.id);
    if (selectedKeys.length === allKeys.length) {
      setSelectedKeys([]);
    } else {
      setSelectedKeys(allKeys);
    }
  };

  const getCardKeyStatus = (cardKey: CardKey) => {
    const now = new Date();
    const expiresAt = new Date(cardKey.expiresAt);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (cardKey.isUsed) {
      return {
        label: "已使用",
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: CheckCircle2,
      };
    } else if (expiresAt <= now) {
      return {
        label: "已过期",
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: XCircle,
      };
    } else if (expiresAt <= oneDayFromNow) {
      return {
        label: "即将过期",
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        icon: AlertCircle,
      };
    } else {
      return {
        label: "未使用",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
        icon: Clock,
      };
    }
  };

  if (!canManageCardKeys) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              您没有权限访问此页面
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filterOptions = [
    { value: "all", label: "全部", icon: Filter, count: cardKeys.length },
    {
      value: "unused",
      label: "未使用",
      icon: Clock,
      count: cardKeys.filter(
        (k) => !k.isUsed && new Date(k.expiresAt) > new Date()
      ).length,
    },
    {
      value: "used",
      label: "已使用",
      icon: CheckCircle2,
      count: cardKeys.filter((k) => k.isUsed).length,
    },
    {
      value: "expiring-soon",
      label: "即将过期",
      icon: AlertCircle,
      count: cardKeys.filter((k) => {
        const now = new Date();
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return (
          !k.isUsed &&
          new Date(k.expiresAt) > now &&
          new Date(k.expiresAt) <= oneDayFromNow
        );
      }).length,
    },
  ];

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/profile")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold">卡密管理</h1>
        </div>
        <div className="flex gap-2">
          {selectedKeys.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => openDeleteDialog("batch")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              删除选中 ({selectedKeys.length})
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                生成卡密
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">生成卡密</DialogTitle>
                <DialogDescription className="text-sm">
                  选择卡密类型并填写相关信息,生成后的卡密可用于创建临时账号
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-2">
                {/* 卡密模式选择 */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">卡密类型</Label>
                  </div>
                  <Select
                    value={cardKeyMode}
                    onValueChange={(value: "single" | "multi") =>
                      setCardKeyMode(value)
                    }
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium">单卡密模式</span>
                          <span className="text-xs text-muted-foreground">
                            一个卡密绑定一个固定邮箱地址
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="multi">
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium">多卡密模式</span>
                          <span className="text-xs text-muted-foreground">
                            一个卡密绑定多个固定邮箱地址
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="bg-muted/50 rounded-lg p-3 border border-muted">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cardKeyMode === "single"
                        ? "💡 单卡密：用户使用卡密登录后，只能使用一个预设的邮箱地址,适合单用户使用"
                        : "💡 多卡密：一个卡密绑定多个预设的邮箱地址，用户登录后只能使用这些邮箱,适合批量分配"}
                    </p>
                  </div>
                </div>

                {/* 单卡密模式 */}
                {cardKeyMode === "single" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emails" className="text-sm font-semibold">
                        邮箱地址列表
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        每行一个邮箱地址,每个邮箱将生成一个独立的卡密
                      </p>
                    </div>
                    <Textarea
                      id="emails"
                      placeholder={`user1@${
                        allowedDomains[0] || "example.com"
                      }\nuser2@${allowedDomains[0] || "example.com"}\nuser3@${
                        allowedDomains[0] || "example.com"
                      }`}
                      value={emailAddresses}
                      onChange={(e) => setEmailAddresses(e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    {allowedDomains.length > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          <span className="font-semibold">允许的域名：</span>
                          {allowedDomains.map((domain, index) => (
                            <span key={domain}>
                              {index > 0 && ", "}
                              <code className="bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded">
                                @{domain}
                              </code>
                            </span>
                          ))}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 多卡密模式 */}
                {cardKeyMode === "multi" && (
                  <div className="space-y-3">
                    <div>
                      <Label
                        htmlFor="multi-emails"
                        className="text-sm font-semibold"
                      >
                        邮箱地址列表
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        每行一个邮箱地址,所有邮箱将绑定到同一个卡密
                      </p>
                    </div>
                    <Textarea
                      id="multi-emails"
                      placeholder={`1@${
                        allowedDomains[0] || "example.com"
                      }\n2@${allowedDomains[0] || "example.com"}\n3@${
                        allowedDomains[0] || "example.com"
                      }\n4@${allowedDomains[0] || "example.com"}\n5@${
                        allowedDomains[0] || "example.com"
                      }`}
                      value={multiEmailAddresses}
                      onChange={(e) => setMultiEmailAddresses(e.target.value)}
                      rows={8}
                      className="font-mono text-sm"
                    />
                    {allowedDomains.length > 0 && (
                      <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-900">
                        <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                          <span className="font-semibold">允许的域名：</span>
                          {allowedDomains.map((domain, index) => (
                            <span key={domain}>
                              {index > 0 && ", "}
                              <code className="bg-purple-100 dark:bg-purple-900/50 px-1.5 py-0.5 rounded">
                                @{domain}
                              </code>
                            </span>
                          ))}
                        </p>
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          💡
                          一个卡密将绑定上述所有邮箱地址，用户登录后只能使用这些邮箱
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="expiry" className="text-sm font-semibold">
                      有效期
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      设置卡密激活后的账号有效期
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Input
                      id="expiry"
                      type="number"
                      min="1"
                      value={expiryValue}
                      onChange={(e) => setExpiryValue(e.target.value)}
                      className="flex-1 h-11"
                      placeholder="输入数值"
                    />
                    <Select
                      value={expiryUnit}
                      onValueChange={(value: "minutes" | "hours" | "days") =>
                        setExpiryUnit(value)
                      }
                    >
                      <SelectTrigger className="w-28 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">分钟</SelectItem>
                        <SelectItem value="hours">小时</SelectItem>
                        <SelectItem value="days">天</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  onClick={generateCardKeys}
                  disabled={generating}
                  className="w-full h-11 text-base font-medium"
                  size="lg"
                >
                  {generating && (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  )}
                  {generating ? "生成中..." : "生成卡密"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* 搜索框和批量操作 */}
      <div className="flex items-center justify-between mb-4">
        <Input
          ref={searchInputRef}
          placeholder="搜索卡密代码、邮箱或使用者..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-md"
        />
        {filteredCardKeys.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={
                selectedKeys.length === filteredCardKeys.length &&
                filteredCardKeys.length > 0
              }
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            />
            <span className="text-sm text-muted-foreground">
              全选 ({selectedKeys.length}/{filteredCardKeys.length})
            </span>
          </div>
        )}
      </div>

      {/* 筛选按钮 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterOptions.map((option) => {
          const Icon = option.icon;
          const isActive = filterStatus === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setFilterStatus(option.value as CardKeyFilter)}
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
              <span>{option.label}</span>
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                {option.count}
              </Badge>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : filteredCardKeys.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          暂无
          {filterStatus !== "all"
            ? filterOptions.find((o) => o.value === filterStatus)?.label
            : ""}
          卡密
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCardKeys.map((cardKey) => {
            const status = getCardKeyStatus(cardKey);
            const StatusIcon = status.icon;
            return (
              <Card
                key={cardKey.id}
                className={
                  selectedKeys.includes(cardKey.id) ? "border-primary" : ""
                }
              >
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    {/* 复选框 */}
                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selectedKeys.includes(cardKey.id)}
                        onChange={() => toggleSelectKey(cardKey.id)}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 flex justify-between items-start gap-4">
                      <div className="flex-1 space-y-3">
                        {/* 卡密代码 */}
                        <div className="flex items-center gap-2">
                          <code className="bg-muted px-3 py-1.5 rounded text-base font-mono font-semibold">
                            {cardKey.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(cardKey.code)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* 详细信息 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-start gap-2 text-muted-foreground">
                            <Mail className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              {cardKey.mode === "multi" &&
                              cardKey.emailAddress.includes(",") ? (
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold text-foreground mb-1">
                                    绑定邮箱 (
                                    {cardKey.emailAddress.split(",").length}个):
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {cardKey.emailAddress
                                      .split(",")
                                      .map((email, index) => (
                                        <code
                                          key={index}
                                          className="text-xs bg-muted px-2 py-0.5 rounded font-mono"
                                        >
                                          {email.trim()}
                                        </code>
                                      ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="font-medium text-foreground">
                                  {cardKey.emailAddress}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4 flex-shrink-0" />
                            <span>
                              创建:{" "}
                              {new Date(cardKey.createdAt).toLocaleString(
                                "zh-CN",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span>
                              过期:{" "}
                              {new Date(cardKey.expiresAt).toLocaleString(
                                "zh-CN",
                                {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>
                          </div>
                          {cardKey.isUsed && cardKey.usedBy && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <User className="h-4 w-4 flex-shrink-0" />
                              <span>
                                使用者:{" "}
                                <span className="font-medium text-foreground">
                                  {cardKey.usedBy.name ||
                                    cardKey.usedBy.username}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 状态和操作 */}
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`${status.color} gap-1 px-2 py-1`}>
                          <StatusIcon className="w-3 h-3" />
                          {status.label}
                        </Badge>
                        <div className="flex gap-1">
                          {cardKey.isUsed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetCardKey(cardKey.id)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="重置卡密，允许再次使用"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              openDeleteDialog("single", cardKey.id)
                            }
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "batch"
                ? `确定要删除选中的 ${deleteTarget.count} 个卡密吗？`
                : "确定要删除这个卡密吗？"}
              <br />
              <span className="text-destructive font-medium">
                此操作将同时删除关联的临时用户和所有数据，且不可恢复。
              </span>
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
