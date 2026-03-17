"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  backgroundThemeKeys,
  defaultBackgroundSettings,
  type BackgroundSettingsConfig,
  resolveAppTheme,
} from "@/lib/background-config";

export function BackgroundProvider() {
  const { resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const [globalBg, setGlobalBg] = useState<BackgroundSettingsConfig>(defaultBackgroundSettings);
  const [userBg, setUserBg] = useState<BackgroundSettingsConfig | null>(null);

  useEffect(() => {
    fetch("/api/config/background")
      .then((res) => (res.ok ? (res.json() as Promise<BackgroundSettingsConfig>) : null))
      .then((data) => data && setGlobalBg(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session?.user) return;

    fetch("/api/user/settings")
      .then((res) => (res.ok ? (res.json() as Promise<BackgroundSettingsConfig>) : null))
      .then((data) => data && setUserBg(data))
      .catch(() => {});
  }, [session?.user]);

  const activeTheme = resolveAppTheme(resolvedTheme);
  const { urlKey, enabledKey } = backgroundThemeKeys[activeTheme];
  const globalEnabled = globalBg.bgEnabled && globalBg[enabledKey];
  const userEnabled = !!userBg && userBg.bgEnabled && userBg[enabledKey];
  const backgroundUrl = globalEnabled
    ? (userEnabled ? userBg?.[urlKey] : "") || globalBg[urlKey]
    : "";

  if (!backgroundUrl) {
    return <div className="page-gradient-background fixed inset-0 -z-10" />;
  }

  return (
    <div
      className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
      style={{ backgroundImage: `url(${backgroundUrl})` }}
    >
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsla(var(--primary)/0.14),transparent_34%),linear-gradient(180deg,hsla(var(--background)/0.3),hsla(var(--background)/0.58))]"
        style={{
          backdropFilter: "blur(var(--background-overlay-blur))",
        }}
      />
    </div>
  );
}
