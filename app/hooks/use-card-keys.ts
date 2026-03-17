"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    name: string;
    username: string;
  };
  usedAt?: string;
  createdAt: string;
  expiresAt: string;
}

export type CardKeyFilter = "all" | "unused" | "used" | "expiring-soon";

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "single" | "batch";
    id?: string;
    count?: number;
  } | null>(null);
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const { toast } = useToast();
  const { checkPermission } = useRolePermission();
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
        return value * 24 * 60;
    }
  };

  const fetchAllowedDomains = useCallback(async () => {
    try {
      const response = await fetch("/api/config");
      if (response.ok) {
        const data = (await response.json()) as { emailDomains?: string };
        const domains = data.emailDomains
          ?.split(",")
          .map((d: string) => d.trim()) || [EMAIL_CONFIG.DEFAULT_EMAIL_DOMAIN];
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
    const addresses = (cardKeyMode === "single" ? emailAddresses : multiEmailAddresses)
      .split("\n")
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    if (addresses.length === 0) {
      toast({ title: tc("error"), description: t("enterAtLeastOne"), variant: "destructive" });
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
        throw new Error(data.error);
      }

      const data = (await response.json()) as {
        message: string;
        cardKeys: { code: string; emailAddress: string }[];
      };
      toast({ title: tc("success"), description: data.message });

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
    toast({ title: tc("copied"), description: t("copiedToClipboard") });
  };

  const openDeleteDialog = (type: "single" | "batch", id?: string) => {
    if (type === "batch" && selectedKeys.length === 0) {
      toast({ title: tc("warning"), description: t("selectToDelete"), variant: "destructive" });
      return;
    }
    setDeleteTarget({ type, id, count: type === "batch" ? selectedKeys.length : 1 });
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
      const response = await fetch(`/api/admin/card-keys?id=${id}`, { method: "DELETE" });
      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }
      toast({ title: tc("success"), description: t("deleteSuccess") });
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
      const successCount = results.filter((r) => r.status === "fulfilled").length;
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
      toast({ title: tc("error"), description: t("batchDeleteFailed"), variant: "destructive" });
      throw new Error(t("batchDeleteFailed"));
    }
  };

  const resetCardKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/card-keys?id=${id}`, { method: "PATCH" });
      if (!response.ok) {
        const data = (await response.json()) as { error: string };
        throw new Error(data.error);
      }
      toast({ title: tc("success"), description: t("resetSuccess") });
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
      return { label: t("used"), variant: "used" as const };
    } else if (expiresAt <= now) {
      return { label: tc("expired"), variant: "expired" as const };
    } else if (expiresAt <= oneDayFromNow) {
      return { label: tc("expiringSoon"), variant: "expiring" as const };
    } else {
      return { label: t("unused"), variant: "unused" as const };
    }
  };

  const filterOptions = [
    { value: "all" as const, label: t("filterAll"), count: cardKeys.length },
    {
      value: "unused" as const,
      label: t("unused"),
      count: cardKeys.filter((k) => !k.isUsed && new Date(k.expiresAt) > new Date()).length,
    },
    {
      value: "used" as const,
      label: t("used"),
      count: cardKeys.filter((k) => k.isUsed).length,
    },
    {
      value: "expiring-soon" as const,
      label: tc("expiringSoon"),
      count: cardKeys.filter((k) => {
        const now = new Date();
        const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        return !k.isUsed && new Date(k.expiresAt) > now && new Date(k.expiresAt) <= oneDayFromNow;
      }).length,
    },
  ];

  return {
    // State
    cardKeys, loading, generating, cardKeyMode, emailAddresses, multiEmailAddresses,
    expiryValue, expiryUnit, dialogOpen, filterStatus, selectedKeys, searchText,
    deleteDialogOpen, deleteTarget, allowedDomains, canManageCardKeys,
    filteredCardKeys, filterOptions, searchInputRef,
    // Translations
    t, tc, ta,
    // Setters
    setCardKeyMode, setEmailAddresses, setMultiEmailAddresses,
    setExpiryValue, setExpiryUnit, setDialogOpen, setFilterStatus,
    setSearchText, setDeleteDialogOpen,
    // Actions
    generateCardKeys, copyToClipboard, openDeleteDialog, confirmDelete,
    resetCardKey, toggleSelectKey, toggleSelectAll, getCardKeyStatus,
  };
}
