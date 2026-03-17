"use client";

import dynamic from "next/dynamic";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, ChevronRight, CreditCard, Settings, Users } from "lucide-react";
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

type AdminTabId = "card-keys" | "users" | "cleanup";

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

interface AdminTabConfig {
  id: AdminTabId;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  component: ComponentType;
}

function isAdminTabId(value: string | null): value is AdminTabId {
  return value === "card-keys" || value === "users" || value === "cleanup";
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
        <div className="surface-panel-strong relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
            <div className="absolute bottom-0 left-8 h-32 w-32 rounded-full bg-orange-300/15 blur-3xl" />
          </div>

          <div className="relative space-y-4">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-xl" />
            <Skeleton className="h-5 w-full rounded-lg" />
            <Skeleton className="h-5 w-5/6 rounded-lg" />
          </div>
        </div>

        <div className="surface-panel p-3">
          <div className="space-y-2">
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
            <Skeleton className="h-20 rounded-2xl" />
          </div>
        </div>

        <div className="surface-toolbar rounded-3xl p-4">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full rounded-lg" />
            <Skeleton className="h-4 w-full rounded-lg" />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <AdminSectionShell title=" " description=" " contentClassName="space-y-4">
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
        description: t("cardKeyManagementDesc"),
        icon: CreditCard,
        enabled: canManageCardKeys,
        component: CardKeysContent,
      },
      {
        id: "users",
        title: t("userManagement"),
        description: t("userManagementDesc"),
        icon: Users,
        enabled: canPromote,
        component: UsersContent,
      },
      {
        id: "cleanup",
        title: t("cleanupSettings"),
        description: t("cleanupSettingsDesc"),
        icon: Settings,
        enabled: canManageConfig,
        component: CleanupSettingsContent,
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
        <header className="surface-panel-strong relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 right-4 h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
            <div className="absolute bottom-0 left-6 h-36 w-36 rounded-full bg-orange-300/15 blur-3xl" />
          </div>

          <div className="relative space-y-4">
            <Button
              variant="outline"
              onClick={() => router.push("/profile")}
              className="rounded-full border-primary/15 bg-background/50 px-4 backdrop-blur"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t("backToProfile")}
            </Button>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t("dashboard")}</h1>
              <p className="text-sm leading-6 text-muted-foreground">{t("workspaceDescription")}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <span
                  key={tab.id}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium backdrop-blur",
                    tab.id === activeTabConfig.id
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-primary/15 bg-background/45 text-muted-foreground"
                  )}
                >
                  {tab.title}
                </span>
              ))}
            </div>
          </div>
        </header>

        <div className="surface-panel overflow-hidden p-3">
          <div className="flex flex-col gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTabConfig.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "group flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-4 text-left transition-all",
                    isActive
                      ? "border-primary/25 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "border-border/60 bg-background/55 text-foreground hover:border-primary/20 hover:bg-background/80"
                  )}
                >
                  <span className="flex items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl border",
                        isActive
                          ? "border-white/15 bg-white/10 text-primary-foreground"
                          : "border-primary/15 bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>

                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="text-sm font-semibold">{tab.title}</span>
                      <span
                        className={cn(
                          "text-xs leading-5",
                          isActive ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}
                      >
                        {tab.description}
                      </span>
                    </span>
                  </span>

                  <ChevronRight
                    className={cn(
                      "mt-1 h-4 w-4 shrink-0 transition-transform",
                      isActive ? "translate-x-0 text-primary-foreground/80" : "text-muted-foreground group-hover:translate-x-0.5"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div className="surface-toolbar rounded-3xl p-4">
          <p className="text-sm font-medium text-foreground">{activeTabConfig.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{activeTabConfig.description}</p>

          <div className="mt-4 rounded-2xl border border-primary/15 bg-background/55 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("stickyTabsHint")}</p>
          </div>
        </div>
      </aside>

      <div className="space-y-6">
        <AdminSectionShell title={activeTabConfig.title} description={activeTabConfig.description}>
          <ActiveContent />
        </AdminSectionShell>
      </div>
    </div>
  );
}
