"use client";

import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronRight, CreditCard, ImageIcon, Settings, Users } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ComponentType } from "react";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { AdminSectionShell } from "./admin-section-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRolePermission } from "@/hooks/use-role-permission";
import { PERMISSIONS } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type AdminTabId = "card-keys" | "users" | "cleanup" | "background";

const CardKeysContent = dynamic(
  () => import("./card-keys/card-keys-content").then((mod) => ({ default: mod.CardKeysContent })),
  { loading: () => <AdminModuleLoadingState /> }
);

const UsersContent = dynamic(
  () => import("./users/users-content").then((mod) => ({ default: mod.UsersContent })),
  { loading: () => <AdminModuleLoadingState /> }
);

const CleanupSettingsContent = dynamic(
  () => import("./settings/cleanup-settings-content").then((mod) => ({ default: mod.CleanupSettingsContent })),
  { loading: () => <AdminModuleLoadingState /> }
);

const GlobalBackgroundSettingsContent = dynamic(
  () =>
    import("../background/global-background-settings-content").then((mod) => ({
      default: mod.GlobalBackgroundSettingsContent,
    })),
  { loading: () => <AdminModuleLoadingState /> }
);

interface AdminTabConfig {
  id: AdminTabId;
  title: string;
  icon: LucideIcon;
  enabled: boolean;
  component: ComponentType;
}

function isAdminTabId(value: string | null): value is AdminTabId {
  return value === "card-keys" || value === "users" || value === "cleanup" || value === "background";
}

function AdminModuleLoadingState() {
  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-10 w-full max-w-md rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>
      </div>

      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="surface-panel rounded-2xl p-5">
          <div className="flex gap-4">
            <Skeleton className="mt-1 h-5 w-5 rounded-md" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-6 w-56 rounded-lg" />
              <div className="grid gap-2 md:grid-cols-2">
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminDashboardSkeleton() {
  return (
    <div className="mx-auto grid max-w-7xl gap-6 animate-fade-in-up xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Skeleton className="h-10 w-40 rounded-full" />

        <div className="surface-panel p-3">
          <div className="space-y-1">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <AdminSectionShell title=" " contentClassName="space-y-4">
          <AdminModuleLoadingState />
        </AdminSectionShell>
      </div>
    </div>
  );
}

export function AdminDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const t = useTranslations("admin");
  const { checkPermission, isReady } = useRolePermission();

  const canManageCardKeys = checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);
  const canPromote = checkPermission(PERMISSIONS.PROMOTE_USER);
  const canManageConfig = checkPermission(PERMISSIONS.MANAGE_CONFIG);

  const tabs = useMemo(
    (): AdminTabConfig[] => {
      const tabItems: AdminTabConfig[] = [
        {
          id: "card-keys",
          title: t("cardKeyManagement"),
          icon: CreditCard,
          enabled: canManageCardKeys,
          component: CardKeysContent,
        },
        {
          id: "users",
          title: t("userManagement"),
          icon: Users,
          enabled: canPromote,
          component: UsersContent,
        },
        {
          id: "cleanup",
          title: t("cleanupSettings"),
          icon: Settings,
          enabled: canManageConfig,
          component: CleanupSettingsContent,
        },
        {
          id: "background",
          title: t("globalBackgroundSettings"),
          icon: ImageIcon,
          enabled: canManageConfig,
          component: GlobalBackgroundSettingsContent,
        },
      ];

      return tabItems.filter((tab) => tab.enabled);
    },
    [canManageCardKeys, canManageConfig, canPromote, t]
  );

  const requestedTab = searchParams.get("tab");
  const firstTab = tabs[0]?.id;
  const activeTab = useMemo<AdminTabId | undefined>(() => {
    if (isAdminTabId(requestedTab) && tabs.some((tab) => tab.id === requestedTab)) {
      return requestedTab;
    }

    return firstTab;
  }, [firstTab, requestedTab, tabs]);

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  useEffect(() => {
    if (!isReady || !activeTab) return;

    if (requestedTab !== activeTab) {
      const params = new URLSearchParams(searchParamsString);
      params.set("tab", activeTab);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [activeTab, isReady, pathname, requestedTab, router, searchParamsString]);

  const handleTabChange = (nextTab: string) => {
    if (!isAdminTabId(nextTab) || !tabs.some((tab) => tab.id === nextTab)) {
      return;
    }

    const params = new URLSearchParams(searchParamsString);
    params.set("tab", nextTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (!isReady) {
    return <AdminDashboardSkeleton />;
  }

  if (!tabs.length || !activeTabConfig) {
    return (
      <div className="mx-auto max-w-4xl py-8 animate-fade-in-up">
        <div className="surface-panel-strong rounded-3xl p-8 text-center">
          <p className="text-muted-foreground">{t("noPermission")}</p>
        </div>
      </div>
    );
  }

  const ActiveContent = activeTabConfig.component;

  return (
    <div className="mx-auto grid max-w-7xl gap-6 animate-fade-in-up xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <Button
          variant="glass"
          onClick={() => router.push("/profile")}
          className="rounded-full border-primary/20 px-4 shadow-[0_16px_34px_hsl(var(--primary)/0.14)]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("backToProfile")}
        </Button>

        <nav className="theme-surface-admin-sidebar surface-panel overflow-hidden p-3">
          <div className="flex flex-col gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTabConfig.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "theme-surface-admin-nav-item group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all",
                    isActive
                      ? "theme-surface-admin-nav-item-active text-foreground shadow-sm ring-1 ring-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "absolute inset-y-3 left-0 w-1 rounded-r-full transition-colors",
                      isActive ? "bg-primary" : "bg-transparent"
                    )}
                  />

                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1 text-sm font-semibold">{tab.title}</span>

                  <ChevronRight
                    className={cn(
                      "h-4 w-4 shrink-0 transition-all",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:translate-x-0.5"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </nav>
      </aside>

      <div className="space-y-6">
        <AdminSectionShell title={activeTabConfig.title}>
          <ActiveContent />
        </AdminSectionShell>
      </div>
    </div>
  );
}
