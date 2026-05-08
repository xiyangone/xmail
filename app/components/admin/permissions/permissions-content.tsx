"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiKeyScopesEditor } from "./api-key-scopes-editor";
import { RolePermissionsEditor } from "./role-permissions-editor";
import { RoutePoliciesEditor } from "./route-policies-editor";
import { readJsonError } from "../operations/use-admin-resource";
import type { PermissionAdminData, PolicyAccess } from "./types";

interface RoutePolicyDraft {
  methods: string;
  access: PolicyAccess;
  requiredPermissions: string[];
  allowApiKey: boolean;
  allowInternal: boolean;
  priority: number;
  enabled: boolean;
  description: string;
}

function PermissionsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <Skeleton className="h-10 w-full max-w-xl rounded-xl" />
      </div>
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="surface-panel rounded-3xl p-5">
          <Skeleton className="mb-4 h-6 w-48 rounded-lg" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 6 }).map((__, itemIndex) => (
              <Skeleton key={itemIndex} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PermissionsContent() {
  const [data, setData] = useState<PermissionAdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/permissions", { cache: "no-store" });
      if (!response.ok) throw new Error(await readJsonError(response));
      setData((await response.json()) as PermissionAdminData);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加载权限管理数据失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const patchJson = async (url: string, body: unknown) => {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(await readJsonError(response));
    setMessage("保存成功");
    await loadData();
  };

  if (loading) return <PermissionsLoadingState />;

  if (!data) {
    return (
      <div className="surface-panel rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{message ?? "无法加载权限管理数据"}</p>
        <Button variant="outline" onClick={() => void loadData()} className="mt-4 rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Shield className="h-4 w-4 text-primary" />
              数据库动态权限策略
            </p>
            <p className="text-xs text-muted-foreground">
              当前展示 {data.permissions.length} 个权限、{data.roles.length} 个角色、{data.routePolicies.length} 条路由策略。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={data.canManage ? "default" : "outline"}>{data.canManage ? "可编辑" : "只读"}</Badge>
            <Button variant="outline" size="sm" onClick={() => void loadData()} className="rounded-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
        {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      </div>

      <RolePermissionsEditor
        roles={data.roles}
        permissions={data.permissions}
        rolePermissions={data.rolePermissions}
        canManage={data.canManage}
        onSave={(roleId, permissionKeys) => patchJson("/api/admin/permissions/roles", { roleId, permissionKeys })}
      />

      <RoutePoliciesEditor
        policies={data.routePolicies}
        permissions={data.permissions}
        canManage={data.canManage}
        onSave={(id, draft: RoutePolicyDraft) =>
          patchJson("/api/admin/permissions/routes", {
            id,
            ...draft,
          })
        }
      />

      <ApiKeyScopesEditor
        apiKeys={data.apiKeys}
        scopes={data.apiKeyScopes}
        permissions={data.permissions}
        canManage={data.canManage}
        onSave={(apiKeyId, permissionKeys) =>
          patchJson("/api/admin/permissions/api-key-scopes", { apiKeyId, permissionKeys })
        }
      />
    </div>
  );
}
