"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
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
  const [showLink, setShowLink] = useState(false);

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
          <button
            className="absolute bottom-4 right-4 p-2 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-all duration-200 opacity-60 hover:opacity-100 group"
            onMouseEnter={() => setShowLink(true)}
            onMouseLeave={() => setShowLink(false)}
            onClick={() => window.open(backgroundUrl, "_blank")}
            title="查看原图"
          >
            <ExternalLink className="h-4 w-4 text-white" />
            {showLink && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 rounded-lg bg-black/80 backdrop-blur-sm text-xs text-white max-w-[280px] truncate whitespace-nowrap animate-fade-in-up">
                {backgroundUrl}
              </div>
            )}
          </button>
        </div>
      ) : null}
    </div>
  );
}
