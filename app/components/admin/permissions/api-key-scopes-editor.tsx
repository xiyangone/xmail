"use client";

import { useEffect, useState } from "react";
import { KeyRound, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { PermissionAdminApiKey, PermissionAdminApiKeyScope, PermissionAdminPermission } from "./types";

interface ApiKeyScopesEditorProps {
  apiKeys: PermissionAdminApiKey[];
  scopes: PermissionAdminApiKeyScope[];
  permissions: PermissionAdminPermission[];
  canManage: boolean;
  onSave: (apiKeyId: string, permissionKeys: string[]) => Promise<void>;
}

export function ApiKeyScopesEditor({ apiKeys, scopes, permissions, canManage, onSave }: ApiKeyScopesEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [savingApiKeyId, setSavingApiKeyId] = useState<string | null>(null);

  useEffect(() => {
    const nextDrafts: Record<string, string[]> = {};
    for (const apiKey of apiKeys) {
      nextDrafts[apiKey.id] = scopes
        .filter((scope) => scope.apiKeyId === apiKey.id)
        .map((scope) => scope.permissionKey);
    }
    setDrafts(nextDrafts);
  }, [apiKeys, scopes]);

  const togglePermission = (apiKeyId: string, permissionKey: string) => {
    setDrafts((current) => {
      const existing = current[apiKeyId] ?? [];
      const next = existing.includes(permissionKey)
        ? existing.filter((key) => key !== permissionKey)
        : [...existing, permissionKey];
      return { ...current, [apiKeyId]: next };
    });
  };

  const saveApiKey = async (apiKeyId: string) => {
    setSavingApiKeyId(apiKeyId);
    try {
      await onSave(apiKeyId, drafts[apiKeyId] ?? []);
    } finally {
      setSavingApiKeyId(null);
    }
  };

  return (
    <section className="surface-panel rounded-3xl p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <KeyRound className="h-4 w-4 text-primary" />
            API Key Scopes
          </h3>
          <p className="text-sm text-muted-foreground">为空时 API Key 继承用户权限；设置后需要命中 scope 才能访问对应策略。</p>
        </div>
        <Badge variant="secondary">{apiKeys.length} keys</Badge>
      </div>

      {apiKeys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
          暂无启用的 API Key。
        </div>
      ) : (
        <div className="space-y-4">
          {apiKeys.map((apiKey) => {
            const selected = drafts[apiKey.id] ?? [];

            return (
              <div key={apiKey.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{apiKey.name}</div>
                    <p className="text-xs text-muted-foreground">owner: {apiKey.userId}</p>
                  </div>
                  <Badge variant={selected.length > 0 ? "default" : "outline"}>
                    {selected.length > 0 ? `${selected.length} scoped` : "inherit owner"}
                  </Badge>
                </div>

                <div className="grid max-h-48 gap-2 overflow-auto rounded-xl border border-border/50 bg-background/35 p-3 md:grid-cols-2 xl:grid-cols-3">
                  {permissions.map((permission) => (
                    <label key={permission.key} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={selected.includes(permission.key)}
                        disabled={!canManage}
                        onChange={() => togglePermission(apiKey.id, permission.key)}
                      />
                      <span className="truncate">{permission.key}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!canManage || savingApiKeyId === apiKey.id}
                    onClick={() => saveApiKey(apiKey.id)}
                    className="rounded-full"
                  >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    保存 API Key Scope
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
