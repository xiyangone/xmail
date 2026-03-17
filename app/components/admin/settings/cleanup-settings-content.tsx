"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { useTranslations } from "next-intl";

interface CleanupConfig {
  deleteExpiredUsedCardKeys: boolean;
  deleteExpiredUnusedCardKeys: boolean;
  deleteExpiredEmails: boolean;
  cardKeyDefaultDays: number;
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
  const { checkPermission } = useRolePermission();
  const canManageConfig = checkPermission(PERMISSIONS.MANAGE_CONFIG);
  const t = useTranslations("cleanup");
  const tc = useTranslations("common");
  const ta = useTranslations("admin");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/cleanup/config");
      if (!res.ok) throw new Error(t("fetchFailed"));
      const data = (await res.json()) as CleanupConfig;
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
  }, [toast, t, tc]);

  useEffect(() => {
    if (canManageConfig) fetchConfig();
  }, [canManageConfig, fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/cleanup/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error(t("saveFailed"));
      toast({ title: t("saveSuccess"), description: t("configUpdated") });
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

  if (!canManageConfig) {
    return <p className="text-center text-muted-foreground py-4">{ta("noPermission")}</p>;
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">{t("autoCleanupTitle")}</h3>
        <ul className="space-y-1 text-xs text-muted-foreground">
          <li>• {t("autoCleanupDesc1")}</li>
          <li>• {t("autoCleanupDesc2")}</li>
          <li>• {t("autoCleanupDesc3")}</li>
          <li>• {t("autoCleanupDesc4")}</li>
        </ul>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="delete-used-card-keys" className="text-sm font-medium">{t("deleteUsedExpired")}</Label>
            <p className="text-xs text-muted-foreground">{t("deleteUsedExpiredDesc")}</p>
          </div>
          <Switch
            id="delete-used-card-keys"
            checked={config.deleteExpiredUsedCardKeys}
            onCheckedChange={(checked) => setConfig({ ...config, deleteExpiredUsedCardKeys: checked })}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="delete-unused-card-keys" className="text-sm font-medium">{t("deleteUnusedExpired")}</Label>
            <p className="text-xs text-muted-foreground">{t("deleteUnusedExpiredDesc")}</p>
          </div>
          <Switch
            id="delete-unused-card-keys"
            checked={config.deleteExpiredUnusedCardKeys}
            onCheckedChange={(checked) => setConfig({ ...config, deleteExpiredUnusedCardKeys: checked })}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-1">
            <Label htmlFor="delete-expired-emails" className="text-sm font-medium">{t("deleteExpiredEmails")}</Label>
            <p className="text-xs text-muted-foreground">{t("deleteExpiredEmailsDesc")}</p>
          </div>
          <Switch
            id="delete-expired-emails"
            checked={config.deleteExpiredEmails}
            onCheckedChange={(checked) => setConfig({ ...config, deleteExpiredEmails: checked })}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 max-w-md">
        <Label htmlFor="default-days" className="text-sm whitespace-nowrap">{t("defaultExpiryLabel")}</Label>
        <Input
          id="default-days"
          type="number"
          min="1"
          max="365"
          value={config.cardKeyDefaultDays}
          onChange={(e) => setConfig({ ...config, cardKeyDefaultDays: parseInt(e.target.value) || 7 })}
          className="flex-1"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg" className="min-w-32">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("saveSettings")}
        </Button>
      </div>
    </div>
  );
}
