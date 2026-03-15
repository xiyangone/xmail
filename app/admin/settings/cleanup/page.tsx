"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { useTranslations } from "next-intl";

interface CleanupConfig {
  deleteExpiredUsedCardKeys: boolean;
  deleteExpiredUnusedCardKeys: boolean;
  deleteExpiredEmails: boolean;
  cardKeyDefaultDays: number;
}

export default function CleanupSettingsPage() {
  const [config, setConfig] = useState<CleanupConfig>({
    deleteExpiredUsedCardKeys: true,
    deleteExpiredUnusedCardKeys: true,
    deleteExpiredEmails: true,
    cardKeyDefaultDays: 7,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
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
    if (canManageConfig) {
      fetchConfig();
    }
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

  if (!canManageConfig) {
    return (
      <div className="container mx-auto py-8">
        <div className="bg-background rounded-lg border p-6">
          <p className="text-center text-muted-foreground">
            {ta("noPermission")}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      {/* 头部 */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/profile")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{t("title")}</h1>
      </div>

      <div className="space-y-6">
        {/* 自动清理说明 */}
        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">{t("autoCleanupTitle")}</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • {t("autoCleanupDesc1")}
            </li>
            <li>• {t("autoCleanupDesc2")}</li>
            <li>
              • {t("autoCleanupDesc3")}
            </li>
            <li>
              • {t("autoCleanupDesc4")}
            </li>
          </ul>
        </div>

        {/* 卡密与邮箱清理开关 */}
        <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
          <h2 className="text-xl font-semibold mb-6">{t("switchTitle")}</h2>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="delete-used-card-keys"
                  className="text-base font-medium"
                >
                  {t("deleteUsedExpired")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("deleteUsedExpiredDesc")}
                </p>
              </div>
              <Switch
                id="delete-used-card-keys"
                checked={config.deleteExpiredUsedCardKeys}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, deleteExpiredUsedCardKeys: checked })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="delete-unused-card-keys"
                  className="text-base font-medium"
                >
                  {t("deleteUnusedExpired")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("deleteUnusedExpiredDesc")}
                </p>
              </div>
              <Switch
                id="delete-unused-card-keys"
                checked={config.deleteExpiredUnusedCardKeys}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, deleteExpiredUnusedCardKeys: checked })
                }
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="delete-expired-emails"
                  className="text-base font-medium"
                >
                  {t("deleteExpiredEmails")}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t("deleteExpiredEmailsDesc")}
                </p>
              </div>
              <Switch
                id="delete-expired-emails"
                checked={config.deleteExpiredEmails}
                onCheckedChange={(checked) =>
                  setConfig({ ...config, deleteExpiredEmails: checked })
                }
              />
            </div>
          </div>
        </div>

        {/* 卡密默认有效期 */}
        <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
          <h2 className="text-xl font-semibold mb-6">{t("defaultExpiryTitle")}</h2>

          <div className="flex items-center gap-4 max-w-md">
            <Label
              htmlFor="default-days"
              className="text-base whitespace-nowrap"
            >
              {t("defaultExpiryLabel")}
            </Label>
            <Input
              id="default-days"
              type="number"
              min="1"
              max="365"
              value={config.cardKeyDefaultDays}
              onChange={(e) =>
                setConfig({
                  ...config,
                  cardKeyDefaultDays: parseInt(e.target.value) || 7,
                })
              }
              className="flex-1"
            />
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="min-w-32"
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("saveSettings")}
          </Button>
        </div>
      </div>
    </div>
  );
}
