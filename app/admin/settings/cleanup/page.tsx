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

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/cleanup/config");
      if (!res.ok) throw new Error("获取配置失败");
      const data = (await res.json()) as CleanupConfig;
      setConfig(data);
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "获取配置失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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

      if (!res.ok) throw new Error("保存失败");

      toast({
        title: "保存成功",
        description: "清理策略配置已更新",
      });
    } catch (error) {
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "请稍后重试",
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
            您没有权限访问此页面
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
        <h1 className="text-3xl font-bold">清理与到期策略</h1>
      </div>

      <div className="space-y-6">
        {/* 自动清理说明 */}
        <div className="bg-muted/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">自动清理说明：</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>
              • 清理任务由 Cloudflare Scheduled Triggers 定时触发（通常每 24
              小时一次），也可手动调用 /api/cleanup/temp-accounts。
            </li>
            <li>
              • 当前定时规则 (wrangler.temp-cleanup.json): */30 * * * * (每 30
              分钟一次)。
            </li>
            <li>• 关闭某项开关后，对应资源将不再被自动清理。</li>
            <li>
              •
              &quot;清理过期邮箱&quot;会级联删除该邮箱下的所有消息，请谨慎启用。
            </li>
            <li>
              •
              卡密过期规则受&quot;卡密默认有效期&quot;与卡密创建时的自定义参数共同影响。
            </li>
          </ul>
        </div>

        {/* 卡密与邮箱清理开关 */}
        <div className="bg-background rounded-lg border-2 border-primary/20 p-6">
          <h2 className="text-xl font-semibold mb-6">卡密与邮箱清理开关</h2>

          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor="delete-used-card-keys"
                  className="text-base font-medium"
                >
                  删除&quot;已使用且过期&quot;的卡密
                </Label>
                <p className="text-sm text-muted-foreground">
                  过期且已被使用的卡密，将连带清理对应的临时账号/用户及其数据。
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
                  删除&quot;过期未使用&quot;的卡密
                </Label>
                <p className="text-sm text-muted-foreground">
                  仅删除已过期且未被使用的卡密；不涉及任何用户数据。
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
                  删除&quot;已过期邮箱（含消息）&quot;
                </Label>
                <p className="text-sm text-muted-foreground">
                  删除 emails 表中过期记录，会级联删除该邮箱下的消息。
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
          <h2 className="text-xl font-semibold mb-6">卡密默认有效期</h2>

          <div className="flex items-center gap-4 max-w-md">
            <Label
              htmlFor="default-days"
              className="text-base whitespace-nowrap"
            >
              默认有效期（天）
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
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
