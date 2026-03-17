"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Cherry, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";

interface GlobalBackgroundSettings {
  bgLight: string;
  bgDark: string;
  bgSakura: string;
}

export function GlobalBackgroundSettingsContent() {
  const [settings, setSettings] = useState<GlobalBackgroundSettings>({
    bgLight: "",
    bgDark: "",
    bgSakura: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const t = useTranslations("backgroundSettings");
  const tc = useTranslations("common");

  useEffect(() => {
    fetch("/api/config/background")
      .then((res) => (res.ok ? (res.json() as Promise<GlobalBackgroundSettings>) : null))
      .then((data) => {
        if (!data) return;

        setSettings({
          bgLight: data.bgLight || "",
          bgDark: data.bgDark || "",
          bgSakura: data.bgSakura || "",
        });
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/config/background", {
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

  const themeFields = [
    { key: "bgLight" as const, icon: Sun, label: t("lightBg") },
    { key: "bgDark" as const, icon: Moon, label: t("darkBg") },
    { key: "bgSakura" as const, icon: Cherry, label: t("sakuraBg") },
  ];

  return (
    <div className="space-y-4">
      {themeFields.map(({ key, icon: Icon, label }) => (
        <div key={key} className="surface-toolbar rounded-2xl p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-3 lg:w-48 lg:flex-none">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>

            <Input
              value={settings[key]}
              onChange={(event) =>
                setSettings((previous) => ({ ...previous, [key]: event.target.value }))
              }
              placeholder={t("bgUrlPlaceholder")}
              className="w-full rounded-xl bg-background/70"
            />
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/55 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">{t("bgUrlHint")}</p>
        <Button onClick={handleSave} disabled={loading} className="sm:min-w-32">
          {tc("save")}
        </Button>
      </div>
    </div>
  );
}
