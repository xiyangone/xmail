"use client";

import { useEffect, useState } from "react";
import { Route, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { PermissionAdminPermission, PermissionAdminRoutePolicy, PolicyAccess } from "./types";
import { parsePermissionList } from "./types";

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

interface RoutePoliciesEditorProps {
  policies: PermissionAdminRoutePolicy[];
  permissions: PermissionAdminPermission[];
  canManage: boolean;
  onSave: (policyId: string, draft: RoutePolicyDraft) => Promise<void>;
}

function toDraft(policy: PermissionAdminRoutePolicy): RoutePolicyDraft {
  return {
    methods: policy.methods,
    access: policy.access,
    requiredPermissions: parsePermissionList(policy.requiredPermissions),
    allowApiKey: policy.allowApiKey,
    allowInternal: policy.allowInternal,
    priority: policy.priority,
    enabled: policy.enabled,
    description: policy.description ?? "",
  };
}

export function RoutePoliciesEditor({ policies, permissions, canManage, onSave }: RoutePoliciesEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, RoutePolicyDraft>>({});
  const [savingPolicyId, setSavingPolicyId] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(Object.fromEntries(policies.map((policy) => [policy.id, toDraft(policy)])));
  }, [policies]);

  const updateDraft = (policyId: string, patch: Partial<RoutePolicyDraft>) => {
    setDrafts((current) => ({
      ...current,
      [policyId]: { ...current[policyId], ...patch },
    }));
  };

  const togglePermission = (policyId: string, permissionKey: string) => {
    const current = drafts[policyId]?.requiredPermissions ?? [];
    const next = current.includes(permissionKey)
      ? current.filter((key) => key !== permissionKey)
      : [...current, permissionKey];
    updateDraft(policyId, { requiredPermissions: next });
  };

  const savePolicy = async (policyId: string) => {
    const draft = drafts[policyId];
    if (!draft) return;

    setSavingPolicyId(policyId);
    try {
      await onSave(policyId, draft);
    } finally {
      setSavingPolicyId(null);
    }
  };

  return (
    <section className="surface-panel rounded-3xl p-5">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Route className="h-4 w-4 text-primary" />
            路由策略
          </h3>
          <p className="text-sm text-muted-foreground">按 path pattern 与 HTTP method 控制接口入口权限。</p>
        </div>
        <Badge variant="secondary">{policies.length} policies</Badge>
      </div>

      <div className="space-y-4">
        {policies.map((policy) => {
          const draft = drafts[policy.id] ?? toDraft(policy);

          return (
            <div key={policy.id} className="rounded-2xl border border-border/60 bg-background/45 p-4">
              <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-semibold text-foreground">{policy.pathPattern}</div>
                  <p className="text-xs text-muted-foreground">{policy.description ?? "No description"}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={draft.enabled ? "default" : "outline"}>{draft.enabled ? "enabled" : "disabled"}</Badge>
                  <Badge variant="secondary">{draft.access}</Badge>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Methods
                  <Input
                    value={draft.methods}
                    disabled={!canManage}
                    onChange={(event) => updateDraft(policy.id, { methods: event.target.value })}
                    className="rounded-xl"
                  />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Access
                  <Select
                    value={draft.access}
                    disabled={!canManage}
                    onValueChange={(value) => updateDraft(policy.id, { access: value as PolicyAccess })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">public</SelectItem>
                      <SelectItem value="authenticated">authenticated</SelectItem>
                      <SelectItem value="permission">permission</SelectItem>
                      <SelectItem value="internal">internal</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Priority
                  <Input
                    type="number"
                    value={draft.priority}
                    disabled={!canManage}
                    onChange={(event) => updateDraft(policy.id, { priority: Number(event.target.value) })}
                    className="rounded-xl"
                  />
                </label>
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-border/50 bg-background/55 p-3 text-xs">
                  <label className="flex flex-col items-center gap-2 text-muted-foreground">
                    Enabled
                    <Switch checked={draft.enabled} disabled={!canManage} onCheckedChange={(enabled) => updateDraft(policy.id, { enabled })} />
                  </label>
                  <label className="flex flex-col items-center gap-2 text-muted-foreground">
                    API Key
                    <Switch checked={draft.allowApiKey} disabled={!canManage} onCheckedChange={(allowApiKey) => updateDraft(policy.id, { allowApiKey })} />
                  </label>
                  <label className="flex flex-col items-center gap-2 text-muted-foreground">
                    Internal
                    <Switch checked={draft.allowInternal} disabled={!canManage} onCheckedChange={(allowInternal) => updateDraft(policy.id, { allowInternal })} />
                  </label>
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
                <div className="grid max-h-48 gap-2 overflow-auto rounded-xl border border-border/50 bg-background/35 p-3 md:grid-cols-2">
                  {permissions.map((permission) => (
                    <label key={permission.key} className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={draft.requiredPermissions.includes(permission.key)}
                        disabled={!canManage || draft.access !== "permission"}
                        onChange={() => togglePermission(policy.id, permission.key)}
                      />
                      <span className="truncate">{permission.key}</span>
                    </label>
                  ))}
                </div>
                <Textarea
                  value={draft.description}
                  disabled={!canManage}
                  onChange={(event) => updateDraft(policy.id, { description: event.target.value })}
                  className="min-h-32 rounded-xl"
                  placeholder="策略说明"
                />
              </div>

              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!canManage || savingPolicyId === policy.id}
                  onClick={() => savePolicy(policy.id)}
                  className="rounded-full"
                >
                  <Save className="mr-2 h-3.5 w-3.5" />
                  保存路由策略
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
