"use client";

import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { useTranslations } from "next-intl";
import { EMAIL_CONFIG } from "@/config";

export interface CardKey {
  id: string;
  code: string;
  emailAddress: string;
  mode: "single" | "multi";
  emailDomain?: string | null;
  emailLimit?: number | null;
  isUsed: boolean;
  usedBy?: {
    id: string;
    name: string | null;
    username: string | null;
  } | null;
  usedAt?: string | Date | null;
  createdAt: string | Date;
  expiresAt: string | Date;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type CardKeyFilter = "all" | "unused" | "used" | "expiring-soon";

const DEFAULT_PAGINATION: PaginationInfo = {
  page: 1,
  pageSize: 8,
  total: 0,
  totalPages: 1,
};

export function useCardKeys() {
  const [cardKeys, setCardKeys] = useState<CardKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [cardKeyMode, setCardKeyMode] = useState<"single" | "multi">("single");
  const [emailAddresses, setEmailAddresses] = useState("");
  const [multiEmailAddresses, setMultiEmailAddresses] = useState("");
  const [expiryValue, setExpiryValue] = useState("7");
  const [expiryUnit, setExpiryUnit] = useState<"minutes" | "hours" | "days">("days");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<CardKeyFilter>("all");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo>(DEFAULT_PAGINATION);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "batch";
    id?: string;
    count?: number;
  } | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const deferredSearchText = useDeferredValue(searchText.trim());
  const { toast } = useToast();
  const { checkPermission, isReady } = useRolePermission();
  const t = useTranslations("cardKey");
  const tc = useTranslations("common");
  const ta = useTranslations("admin");

  const canManageCardKeys = isReady && checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [deferredSearchText, filterStatus, page]);

  const calculateExpiryMinutes = () => {
    const value = Number.parseInt(expiryValue, 10);

    switch (expiryUnit) {
      case "minutes":
        return value;
      case "hours":
        return value * 60;
      case "days":
      default:
        return value * 24 * 60;
    }
  };

  const fetchAllowedDomains = useCallback(async () => {
    try {
      const response = await fetch("/api/config");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as { emailDomains?: string };
      const domains =
        data.emailDomains?.split(",").map((domain) => domain.trim()).filter(Boolean) ??
        [EMAIL_CONFIG.DEFAULT_EMAIL_DOMAIN];

      setAllowedDomains(domains.length > 0 ? domains : [EMAIL_CONFIG.DEFAULT_EMAIL_DOMAIN]);
    } catch (error) {
      console.error("Failed to fetch domains:", error);
    }
  }, []);

  const fetchCardKeys = useCallback(async () => {
    if (!canManageCardKeys) {
      setCardKeys([]);
      setPagination((current) => ({ ...current, total: 0, totalPages: 1 }));
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: DEFAULT_PAGINATION.pageSize.toString(),
        status: filterStatus,
      });

      if (deferredSearchText) {
        params.set("search", deferredSearchText);
      }

      const response = await fetch(`/api/admin/card-keys?${params.toString()}`);
      if (!response.ok) {
        throw new Error(t("fetchFailed"));
      }

      const data = (await response.json()) as {
        cardKeys: CardKey[];
        pagination: PaginationInfo;
      };

      setCardKeys(data.cardKeys);
      setPagination(data.pagination);

      if (data.pagination.page !== page) {
        setPage(data.pagination.page);
      }
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("fetchFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [canManageCardKeys, deferredSearchText, filterStatus, page, t, tc, toast]);

  useEffect(() => {
    if (!isReady) return;

    fetchCardKeys();
  }, [fetchCardKeys, isReady]);

  useEffect(() => {
    if (!isReady || !canManageCardKeys) return;
    fetchAllowedDomains();
  }, [canManageCardKeys, fetchAllowedDomains, isReady]);

  useEffect(() => {
    setSelectedKeys([]);
  }, [cardKeys]);

  const refreshCardKeys = () => {
    if (page !== 1) {
      setPage(1);
      return;
    }

    fetchCardKeys();
  };

  const generateCardKeys = async () => {
    const addresses = (cardKeyMode === "single" ? emailAddresses : multiEmailAddresses)
      .split("\n")
      .map((address) => address.trim())
      .filter((address) => address.length > 0);

    if (addresses.length === 0) {
      toast({
        title: tc("error"),
        description: t("enterAtLeastOne"),
        variant: "destructive",
      });
      return;
    }

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

    setGenerating(true);
    try {
      const requestBody = {
        mode: cardKeyMode,
        emailAddresses: addresses,
        expiryMinutes: calculateExpiryMinutes(),
      };

      const response = await fetch("/api/admin/card-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || t("generateFailed"));
      }

      const data = (await response.json()) as { message: string };
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

      refreshCardKeys();
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

  const deleteCardKey = async (id: string) => {
    const response = await fetch(`/api/admin/card-keys?id=${id}`, { method: "DELETE" });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || t("deleteFailed"));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      if (deleteTarget.type === "single" && deleteTarget.id) {
        await deleteCardKey(deleteTarget.id);
        toast({
          title: tc("success"),
          description: t("deleteSuccess"),
        });
      } else if (deleteTarget.type === "batch") {
        const results = await Promise.allSettled(
          selectedKeys.map(async (id) => {
            await deleteCardKey(id);
          })
        );

        const successCount = results.filter((result) => result.status === "fulfilled").length;
        const failCount = results.length - successCount;

        toast({
          title: t("deleteComplete"),
          description:
            failCount > 0
              ? t("deleteResultWithFail", { success: successCount, fail: failCount })
              : t("deleteResult", { success: successCount }),
        });
      }

      setSelectedKeys([]);
      fetchCardKeys();
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("batchDeleteFailed"),
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    }
  };

  const resetCardKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/card-keys?id=${id}`, { method: "PATCH" });
      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error || t("resetFailed"));
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
    setSelectedKeys((previous) =>
      previous.includes(id) ? previous.filter((keyId) => keyId !== id) : [...previous, id]
    );
  };

  const toggleSelectAll = () => {
    const visibleKeys = cardKeys.map((cardKey) => cardKey.id);

    if (selectedKeys.length === visibleKeys.length) {
      setSelectedKeys([]);
      return;
    }

    setSelectedKeys(visibleKeys);
  };

  const getCardKeyStatus = (cardKey: CardKey) => {
    const now = new Date();
    const expiresAt = new Date(cardKey.expiresAt);
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    if (cardKey.isUsed) {
      return { label: t("used"), variant: "used" as const };
    }

    if (expiresAt <= now) {
      return { label: tc("expired"), variant: "expired" as const };
    }

    if (expiresAt <= oneDayFromNow) {
      return { label: tc("expiringSoon"), variant: "expiring" as const };
    }

    return { label: t("unused"), variant: "unused" as const };
  };

  const filterOptions = [
    { value: "all" as const, label: t("filterAll") },
    { value: "unused" as const, label: t("unused") },
    { value: "used" as const, label: t("used") },
    { value: "expiring-soon" as const, label: tc("expiringSoon") },
  ];

  return {
    cardKeys,
    loading,
    generating,
    cardKeyMode,
    emailAddresses,
    multiEmailAddresses,
    expiryValue,
    expiryUnit,
    dialogOpen,
    filterStatus,
    selectedKeys,
    searchText,
    page,
    total: pagination.total,
    pageSize: pagination.pageSize,
    totalPages: pagination.totalPages,
    deleteDialogOpen,
    deleteTarget,
    allowedDomains,
    permissionReady: isReady,
    canManageCardKeys,
    filterOptions,
    searchInputRef,
    t,
    tc,
    ta,
    setCardKeyMode,
    setEmailAddresses,
    setMultiEmailAddresses,
    setExpiryValue,
    setExpiryUnit,
    setDialogOpen,
    setFilterStatus,
    setSearchText,
    setPage,
    setDeleteDialogOpen,
    generateCardKeys,
    copyToClipboard,
    openDeleteDialog,
    confirmDelete,
    resetCardKey,
    toggleSelectKey,
    toggleSelectAll,
    getCardKeyStatus,
  };
}
