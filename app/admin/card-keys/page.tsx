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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("cardKey");
  const tc = useTranslations("common");
  const ta = useTranslations("admin");

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
      console.error("Failed to fetch domains:", error);
    }
  }, []);

  const fetchCardKeys = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/card-keys");
      if (!response.ok) {
        throw new Error(t("fetchFailed"));
      }
      const data = (await response.json()) as { cardKeys: CardKey[] };
      setCardKeys(data.cardKeys);
    } catch (error) {
      toast({
        title: tc("error"),
        description:
          error instanceof Error ? error.message : t("fetchFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, t, tc]);

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
          title: tc("error"),
          description: t("enterAtLeastOne"),
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
          title: tc("error"),
          description: t("invalidDomains", { emails: invalidEmails.join(", ") }),
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
          title: tc("error"),
          description: t("enterAtLeastOne"),
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
          title: tc("error"),
          description: t("invalidDomains", { emails: invalidEmails.join(", ") }),
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
        title: tc("success"),
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
        title: tc("error"),
        description: error instanceof Error ? error.message : t("generateFailed"),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: tc("copied"),
      description: t("copiedToClipboard"),
    });
  };

  const openDeleteDialog = (type: "single" | "batch", id?: string) => {
    if (type === "batch" && selectedKeys.length === 0) {
      toast({
        title: tc("warning"),
        description: t("selectToDelete"),
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
        title: tc("success"),
        description: t("deleteSuccess"),
      });

      // 从选中列表中移除已删除的卡密
      setSelectedKeys((prev) => prev.filter((k) => k !== id));

      fetchCardKeys();
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("deleteFailed"),
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
        title: t("deleteComplete"),
        description: failCount > 0
          ? t("deleteResultWithFail", { success: successCount, fail: failCount })
          : t("deleteResult", { success: successCount }),
      });

      setSelectedKeys([]);
      fetchCardKeys();
    } catch {
      toast({
        title: tc("error"),
        description: t("batchDeleteFailed"),
        variant: "destructive",
      });
      throw new Error(t("batchDeleteFailed"));
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
        title: tc("success"),
        description: t("resetSuccess"),
      });

      fetchCardKeys();
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("resetFailed"),
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
        label: t("used"),
        color:
          "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
        icon: CheckCircle2,
      };
    } else if (expiresAt <= now) {
      return {
        label: tc("expired"),
        color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        icon: XCircle,
      };
    } else if (expiresAt <= oneDayFromNow) {
      return {
        label: tc("expiringSoon"),
        color:
          "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
        icon: AlertCircle,
      };
    } else {
      return {
        label: t("unused"),
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
              {ta("noPermission")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filterOptions = [
    { value: "all", label: t("filterAll"), icon: Filter, count: cardKeys.length },
    {
      value: "unused",
      label: t("unused"),
      icon: Clock,
      count: cardKeys.filter(
        (k) => !k.isUsed && new Date(k.expiresAt) > new Date()
      ).length,
    },
    {
      value: "used",
      label: t("used"),
      icon: CheckCircle2,
      count: cardKeys.filter((k) => k.isUsed).length,
    },
    {
      value: "expiring-soon",
      label: tc("expiringSoon"),
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
          <h1 className="text-3xl font-bold">{t("management")}</h1>
        </div>
        <div className="flex gap-2">
          {selectedKeys.length > 0 && (
            <Button
              variant="destructive"
              onClick={() => openDeleteDialog("batch")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("deleteSelected", { count: selectedKeys.length })}
            </Button>
          )}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t("generateCardKeys")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl">{t("generateTitle")}</DialogTitle>
                <DialogDescription className="text-sm">
                  {t("dialogDesc")}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-2">
                {/* 卡密模式选择 */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">{t("cardKeyType")}</Label>
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
                          <span className="font-medium">{t("singleMode")}</span>
                          <span className="text-xs text-muted-foreground">
                            {t("singleModeDesc")}
                          </span>
                        </div>
                      </SelectItem>
                      <SelectItem value="multi">
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium">{t("multiMode")}</span>
                          <span className="text-xs text-muted-foreground">
                            {t("multiModeDesc")}
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="bg-muted/50 rounded-lg p-3 border border-muted">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {cardKeyMode === "single"
                        ? `💡 ${t("singleModeTip")}`
                        : `💡 ${t("multiModeTip")}`}
                    </p>
                  </div>
                </div>

                {/* 单卡密模式 */}
                {cardKeyMode === "single" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="emails" className="text-sm font-semibold">
                        {t("emailListLabel")}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("singleEmailHint")}
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
                          <span className="font-semibold">{t("allowedDomains")}</span>
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
                        {t("emailListLabel")}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("multiEmailHint")}
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
                          <span className="font-semibold">{t("allowedDomains")}</span>
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
                          {t("multiCardKeyTip")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="expiry" className="text-sm font-semibold">
                      {t("expiryLabel")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("expiryHint")}
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
                      placeholder={t("expiryPlaceholder")}
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
                        <SelectItem value="minutes">{t("minutes")}</SelectItem>
                        <SelectItem value="hours">{t("hours")}</SelectItem>
                        <SelectItem value="days">{t("days")}</SelectItem>
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
                  {generating ? t("generating") : t("generateCardKeys")}
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
          placeholder={t("searchPlaceholder")}
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
              {t("selectAll", { selected: selectedKeys.length, total: filteredCardKeys.length })}
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
          {t("noCardKeysFiltered", {
            filter: filterStatus !== "all"
              ? (filterOptions.find((o) => o.value === filterStatus)?.label ?? "")
              : ""
          })}
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
                                    {t("boundEmails", { count: cardKey.emailAddress.split(",").length })}
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
                              {t("created")}{" "}
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
                              {t("expires")}{" "}
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
                                {t("usedByLabel")}{" "}
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
                              title={t("resetTitle")}
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
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.type === "batch"
                ? t("confirmDeleteBatch", { count: deleteTarget.count ?? 0 })
                : t("confirmDeleteSingle")}
              <br />
              <span className="text-destructive font-medium">
                {t("confirmDeleteWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t("confirmDelete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
