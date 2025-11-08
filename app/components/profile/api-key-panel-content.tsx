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

  const fetchApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error("获取 API Keys 失败");
      const data = (await res.json()) as { apiKeys: ApiKey[] };
      setApiKeys(data.apiKeys);
    } catch (error) {
      console.error(error);
      toast({
        title: "获取失败",
        description: "获取 API Keys 列表失败",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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

      if (!res.ok) throw new Error("更新失败");

      setApiKeys((keys) =>
        keys.map((key) => (key.id === id ? { ...key, enabled } : key))
      );
    } catch (error) {
      console.error(error);
      toast({
        title: "更新失败",
        description: "更新 API Key 状态失败",
        variant: "destructive",
      });
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("删除失败");

      toast({
        title: "删除成功",
        description: "API Key 已删除",
      });

      // 强制刷新列表,清除缓存
      await fetchApiKeys();
    } catch (error) {
      console.error(error);
      toast({
        title: "删除失败",
        description: "删除 API Key 失败",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      {!canManageApiKey ? (
        <div className="text-center text-muted-foreground py-8">
          <p>需要公爵或更高权限才能管理 API Key</p>
          <p className="mt-2">请联系网站管理员升级您的角色</p>
          {config?.adminContact && (
            <p className="mt-2">管理员联系方式：{config.adminContact}</p>
          )}
        </div>
      ) : isLoading ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">加载中...</p>
          </div>
        </div>
      ) : apiKeys.length === 0 ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Key className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium">没有 API Keys</h3>
            <p className="text-sm text-muted-foreground mt-1">
              点击上方的创建 &quot;API Key&quot; 按钮来创建你的第一个 API Key
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
                  创建于 {new Date(key.createdAt).toLocaleString()}
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
              查看使用文档
            </button>

            {showExamples && (
              <div className="rounded-lg border bg-card p-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">获取系统配置</div>
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
                  <p>注意：所有请求都需要包含 X-API-Key 请求头</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
