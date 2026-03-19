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

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <div className="page-gradient-background absolute inset-0" />
      {backgroundUrl ? (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{ backgroundImage: `url(${backgroundUrl})` }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% -12%, hsl(var(--primary) / var(--background-image-glow-opacity)), transparent 52%), linear-gradient(180deg, hsl(var(--background) / var(--background-image-overlay-start)) 0%, hsl(var(--background) / var(--background-image-overlay-mid)) 42%, hsl(var(--background) / var(--background-image-overlay-end)) 100%)",
              backdropFilter: "blur(var(--background-overlay-blur))",
              WebkitBackdropFilter: "blur(var(--background-overlay-blur))",
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
