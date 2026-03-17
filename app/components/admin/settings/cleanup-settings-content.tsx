"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { useTranslations } from "next-intl";

interface CleanupConfig {
  deleteExpiredUsedCardKeys: boolean;
  deleteExpiredUnusedCardKeys: boolean;
  deleteExpiredEmails: boolean;
  cardKeyDefaultDays: number;
}

function CleanupSettingsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <Skeleton className="h-5 w-52 rounded-lg" />
        <div className="mt-3 space-y-2">
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-lg" />
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="surface-panel rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-4 w-full rounded-lg" />
            </div>
            <Skeleton className="h-6 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CleanupSettingsContent() {
  const [config, setConfig] = useState<CleanupConfig>({
    deleteExpiredUsedCardKeys: true,
    deleteExpiredUnusedCardKeys: true,
    deleteExpiredEmails: true,
    cardKeyDefaultDays: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();
  const { checkPermission, isReady } = useRolePermission();
  const canManageConfig = isReady && checkPermission(PERMISSIONS.MANAGE_CONFIG);
  const t = useTranslations("cleanup");
  const tc = useTranslations("common");
  const ta = useTranslations("admin");

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch("/api/cleanup/config");
      if (!response.ok) {
        throw new Error(t("fetchFailed"));
      }

      const data = (await response.json()) as CleanupConfig;
      setConfig(data);
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : t("fetchFailed"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [t, tc, toast]);

  useEffect(() => {
    if (!isReady) return;

    if (!canManageConfig) {
      setLoading(false);
      return;
    }

    fetchConfig();
  }, [canManageConfig, fetchConfig, isReady]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/cleanup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        throw new Error(t("saveFailed"));
      }

      toast({
        title: t("saveSuccess"),
        description: t("configUpdated"),
      });
    } catch (error) {
      toast({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!isReady) {
    return <CleanupSettingsSkeleton />;
  }

  if (!canManageConfig) {
    return <p className="py-4 text-center text-muted-foreground">{ta("noPermission")}</p>;
  }

  if (loading) {
    return <CleanupSettingsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-foreground">{t("autoCleanupTitle")}</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li>- {t("autoCleanupDesc1")}</li>
          <li>- {t("autoCleanupDesc2")}</li>
          <li>- {t("autoCleanupDesc3")}</li>
          <li>- {t("autoCleanupDesc4")}</li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className="surface-panel rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="delete-used-card-keys" className="text-sm font-medium">
                {t("deleteUsedExpired")}
              </Label>
              <p className="text-sm text-muted-foreground">{t("deleteUsedExpiredDesc")}</p>
            </div>
            <Switch
              id="delete-used-card-keys"
              checked={config.deleteExpiredUsedCardKeys}
              onCheckedChange={(checked) =>
                setConfig((current) => ({ ...current, deleteExpiredUsedCardKeys: checked }))
              }
            />
          </div>
        </div>

        <div className="surface-panel rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="delete-unused-card-keys" className="text-sm font-medium">
                {t("deleteUnusedExpired")}
              </Label>
              <p className="text-sm text-muted-foreground">{t("deleteUnusedExpiredDesc")}</p>
            </div>
            <Switch
              id="delete-unused-card-keys"
              checked={config.deleteExpiredUnusedCardKeys}
              onCheckedChange={(checked) =>
                setConfig((current) => ({ ...current, deleteExpiredUnusedCardKeys: checked }))
              }
            />
          </div>
        </div>

        <div className="surface-panel rounded-2xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-1">
              <Label htmlFor="delete-expired-emails" className="text-sm font-medium">
                {t("deleteExpiredEmails")}
              </Label>
              <p className="text-sm text-muted-foreground">{t("deleteExpiredEmailsDesc")}</p>
            </div>
            <Switch
              id="delete-expired-emails"
              checked={config.deleteExpiredEmails}
              onCheckedChange={(checked) =>
                setConfig((current) => ({ ...current, deleteExpiredEmails: checked }))
              }
            />
          </div>
        </div>
      </div>

      <div className="surface-panel rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Label htmlFor="default-days" className="shrink-0 text-sm font-medium">
            {t("defaultExpiryLabel")}
          </Label>
          <Input
            id="default-days"
            type="number"
            min="1"
            max="365"
            value={config.cardKeyDefaultDays}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                cardKeyDefaultDays: Number.parseInt(event.target.value, 10) || 7,
              }))
            }
            className="max-w-xs rounded-xl bg-background/70"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-36 rounded-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("saveSettings")}
        </Button>
      </div>
    </div>
  );
}
