"use client";

import { useEffect, useMemo, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ROLES } from "@/lib/permissions";
import type { PermissionAdminPermission, PermissionAdminRole, PermissionAdminRolePermission } from "./types";

interface RolePermissionsEditorProps {
  roles: PermissionAdminRole[];
  permissions: PermissionAdminPermission[];
  rolePermissions: PermissionAdminRolePermission[];
  canManage: boolean;
  onSave: (roleId: string, permissionKeys: string[]) => Promise<void>;
}

export function RolePermissionsEditor({
  roles,
  permissions,
  rolePermissions,
  canManage,
  onSave,
}: RolePermissionsEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  useEffect(() => {
    const nextDrafts: Record<string, string[]> = {};
    for (const role of roles) {
      nextDrafts[role.id] = rolePermissions
        .filter((record) => record.roleId === role.id)
        .map((record) => record.permissionKey);
    }
    setDrafts(nextDrafts);
  }, [rolePermissions, roles]);

  const permissionsByKey = useMemo(
    () => new Map(permissions.map((permission) => [permission.key, permission])),
    [permissions]
  );

  const togglePermission = (roleId: string, permissionKey: string) => {
    setDrafts((current) => {
      const existing = current[roleId] ?? [];
      const next = existing.includes(permissionKey)
        ? existing.filter((key) => key !== permissionKey)
        : [...existing, permissionKey];
      return { ...current, [roleId]: next };
    });
  };

  const saveRole = async (roleId: string) => {
    setSavingRoleId(roleId);
    try {
      await onSave(roleId, drafts[roleId] ?? []);
    } finally {
      setSavingRoleId(null);
    }
  };

  return (
    <section className="surface-panel rounded-3xl p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            角色权限
          </h3>
          <p className="text-sm text-muted-foreground">按角色分配动态权限。emperor 保留全部权限兜底。</p>
        </div>
        <Badge variant="secondary">{permissions.length} 个权限</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {roles.map((role) => {
          const selected = drafts[role.id] ?? [];
          const isEmperor = role.name === ROLES.EMPEROR;

          return (
            <div key={role.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-foreground">{role.name}</div>
                  <p className="text-xs text-muted-foreground">{role.description ?? "暂无描述"}</p>
                </div>
                <Badge variant={isEmperor ? "default" : "outline"}>{isEmperor ? "all" : selected.length}</Badge>
              </div>

              <div className="grid max-h-72 gap-2 overflow-auto pr-1 md:grid-cols-2">
                {permissions.map((permission) => {
                  const isChecked = isEmperor || selected.includes(permission.key);
                  const knownPermission = permissionsByKey.get(permission.key);

                  return (
                    <label
                      key={permission.key}
                      className="flex cursor-pointer items-start gap-2 rounded-xl border border-border/50 bg-background/55 p-2.5 text-sm"
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={!canManage || isEmperor}
                        onChange={() => togglePermission(role.id, permission.key)}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground">{permission.key}</span>
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {knownPermission?.description ?? permission.name}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManage || isEmperor || savingRoleId === role.id}
                  onClick={() => saveRole(role.id)}
                  className="rounded-full"
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  保存角色权限
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
