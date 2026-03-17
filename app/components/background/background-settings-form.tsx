"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cherry, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import {
  backgroundThemeKeys,
  defaultBackgroundSettings,
  type AppTheme,
  type BackgroundSettingsConfig,
} from "@/lib/background-config";

interface BackgroundSettingsFormProps {
  endpoint: string;
  scope: "personal" | "global";
}

const themeIcons: Record<AppTheme, LucideIcon> = {
  light: Sun,
  dark: Moon,
  sakura: Cherry,
  amber: Palette,
};

const themeOrder: AppTheme[] = ["light", "dark", "sakura", "amber"];

export function BackgroundSettingsForm({
  endpoint,
  scope,
}: BackgroundSettingsFormProps) {
  const [settings, setSettings] = useState<BackgroundSettingsConfig>(defaultBackgroundSettings);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("backgroundSettings");
  const tc = useTranslations("common");

  useEffect(() => {
    fetch(endpoint)
      .then((res) => (res.ok ? (res.json() as Promise<BackgroundSettingsConfig>) : null))
      .then((data) => {
        if (data) {
          setSettings({
            ...defaultBackgroundSettings,
            ...data,
          });
        }
      })
      .catch(() => {});
  }, [endpoint]);

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || t("saveFailed"));
      }

      toast({
        title: t("saveSuccess"),
        description: t("bgUpdated"),
      });
    } catch (error) {
      toast({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              {scope === "global" ? t("globalEnableBg") : t("enableBg")}
            </p>
            <p className="text-xs text-muted-foreground">
              {scope === "global" ? t("globalEnableBgDesc") : t("enableBgDesc")}
            </p>
          </div>
          <Switch
            checked={settings.bgEnabled}
            onCheckedChange={(checked) =>
              setSettings((current) => ({ ...current, bgEnabled: checked }))
            }
          />
        </div>
      </div>

      <div className="grid gap-4">
        {themeOrder.map((theme) => {
          const Icon = themeIcons[theme];
          const { urlKey, enabledKey } = backgroundThemeKeys[theme];
          const labelKey =
            theme === "light"
              ? "lightBg"
              : theme === "dark"
                ? "darkBg"
                : theme === "sakura"
                  ? "sakuraBg"
                  : "amberBg";

          return (
            <div key={theme} className="surface-panel rounded-2xl p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                <div className="flex items-center gap-3 xl:w-48 xl:flex-none">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">{t(labelKey)}</p>
                    <p className="text-xs text-muted-foreground">{t("themeToggleHint")}</p>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="rounded-2xl border border-border/60 bg-background/55 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{t("enableThemeBg")}</p>
                        <p className="text-xs text-muted-foreground">{t("themeKeepUrlHint")}</p>
                      </div>
                      <Switch
                        checked={settings[enabledKey]}
                        onCheckedChange={(checked) =>
                          setSettings((current) => ({ ...current, [enabledKey]: checked }))
                        }
                      />
                    </div>
                  </div>

                  <Input
                    value={settings[urlKey]}
                    onChange={(event) =>
                      setSettings((current) => ({ ...current, [urlKey]: event.target.value }))
                    }
                    placeholder={t("bgUrlPlaceholder")}
                    className="rounded-xl bg-background/70"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="surface-toolbar rounded-2xl px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">{t("bgUrlHint")}</p>
          <Button onClick={handleSave} disabled={loading} className="rounded-full sm:min-w-32">
            {tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
