"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  Key,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";
import { useCopy } from "@/hooks/use-copy";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { useConfig } from "@/hooks/use-config";
import { useTranslations } from "next-intl";

type ApiKey = {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  expiresAt: string | null;
  enabled: boolean;
};

export function ApiKeyPanelContent() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const { toast } = useToast();
  const { copyToClipboard } = useCopy();
  const [showExamples, setShowExamples] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { checkPermission } = useRolePermission();
  const canManageApiKey = checkPermission(PERMISSIONS.MANAGE_API_KEY);
  const { config } = useConfig();
  const t = useTranslations("apiKey");
  const tc = useTranslations("common");

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error(t("fetchFailed"));
      const data = (await res.json()) as { apiKeys: ApiKey[] };
      setApiKeys(data.apiKeys);
    } catch (error) {
      console.error(error);
      toast({
        title: t("fetchListFailed"),
        description: t("fetchListFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    if (canManageApiKey) {
      fetchApiKeys();
    }
  }, [canManageApiKey, fetchApiKeys]);

  const toggleApiKey = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) throw new Error(t("updateFailed"));

      setApiKeys((keys) =>
        keys.map((key) => (key.id === id ? { ...key, enabled } : key))
      );
    } catch (error) {
      console.error(error);
      toast({
        title: t("updateFailed"),
        description: t("updateStatusFailed"),
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error(t("deleteFailed"));

      toast({
        title: t("deleteSuccess"),
        description: t("deleteSuccessDesc"),
      });

      // 强制刷新列表,清除缓存
      await fetchApiKeys();
    } catch (error) {
      console.error(error);
      toast({
        title: t("deleteFailed"),
        description: t("deleteKeyFailed"),
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {!canManageApiKey ? (
        <div className="text-center text-muted-foreground py-8">
          <p>{t("noPermission")}</p>
          <p className="mt-2">{t("contactAdmin")}</p>
          {config?.adminContact && (
            <p className="mt-2">{t("adminContactLabel", { contact: config.adminContact })}</p>
          )}
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{tc("loading")}</p>
          </div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">{t("noApiKeys")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("noApiKeysHint")}
            </p>
          </div>
        </div>
      ) : (
        <>
          {apiKeys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="space-y-1">
                <div className="font-medium">{key.name}</div>
                <div className="text-sm text-muted-foreground">
                  {t("createdAtLabel", { time: new Date(key.createdAt).toLocaleString() })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={key.enabled}
                  onCheckedChange={(checked) => toggleApiKey(key.id, checked)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteApiKey(key.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}

          <div className="mt-8 space-y-4">
            <button
              type="button"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowExamples(!showExamples)}
            >
              {showExamples ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              {t("viewDocs")}
            </button>

            {showExamples && (
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{t("getConfig")}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(
                          `curl ${window.location.protocol}//${window.location.host}/api/config \\
  -H "X-API-Key: YOUR_API_KEY"`
                        )
                      }
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <pre className="text-xs bg-muted/50 rounded-lg p-4 overflow-x-auto">
                    {`curl ${window.location.protocol}//${window.location.host}/api/config \\
  -H "X-API-Key: YOUR_API_KEY"`}
                  </pre>
                </div>

                <div className="text-xs text-muted-foreground mt-4">
                  <p>{t("apiNote")}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
