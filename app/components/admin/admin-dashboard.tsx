"use client";

import { CreditCard, Users, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { CollapsibleSection } from "@/components/profile/collapsible-section";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const CardKeysContent = dynamic(
  () => import("./card-keys/card-keys-content").then((mod) => ({ default: mod.CardKeysContent })),
  { loading: () => <div className="text-sm text-muted-foreground py-4 text-center">加载中...</div> }
);

const UsersContent = dynamic(
  () => import("./users/users-content").then((mod) => ({ default: mod.UsersContent })),
  { loading: () => <div className="text-sm text-muted-foreground py-4 text-center">加载中...</div> }
);

const CleanupSettingsContent = dynamic(
  () => import("./settings/cleanup-settings-content").then((mod) => ({ default: mod.CleanupSettingsContent })),
  { loading: () => <div className="text-sm text-muted-foreground py-4 text-center">加载中...</div> }
);

export function AdminDashboard() {
  const router = useRouter();
  const { checkPermission } = useRolePermission();
  const canManageCardKeys = checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);
  const canPromote = checkPermission(PERMISSIONS.PROMOTE_USER);
  const canManageConfig = checkPermission(PERMISSIONS.MANAGE_CONFIG);
  const t = useTranslations("admin");

  const hasAnyPermission = canManageCardKeys || canPromote || canManageConfig;

  if (!hasAnyPermission) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-background rounded-lg border p-6">
          <p className="text-center text-muted-foreground">{t("noPermission")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/profile")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{t("dashboard")}</h1>
      </div>

      {canManageCardKeys && (
        <CollapsibleSection
          title={t("cardKeyManagement")}
          icon={CreditCard}
          storageKey="admin-card-keys-open"
          defaultOpen={false}
        >
          <CardKeysContent />
        </CollapsibleSection>
      )}

      {canPromote && (
        <CollapsibleSection
          title={t("userManagement")}
          icon={Users}
          storageKey="admin-users-open"
          defaultOpen={false}
        >
          <UsersContent />
        </CollapsibleSection>
      )}

      {canManageConfig && (
        <CollapsibleSection
          title={t("cleanupSettings")}
          icon={Settings}
          storageKey="admin-cleanup-open"
          defaultOpen={false}
        >
          <CleanupSettingsContent />
        </CollapsibleSection>
      )}
    </div>
  );
}
