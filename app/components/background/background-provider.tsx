"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  backgroundThemeKeys,
  defaultBackgroundSettings,
  type BackgroundSettingsConfig,
  resolveAppTheme,
} from "@/lib/background-config";

export function BackgroundProvider() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const [globalBg, setGlobalBg] = useState<BackgroundSettingsConfig>(defaultBackgroundSettings);
  const [userBg, setUserBg] = useState<BackgroundSettingsConfig | null>(null);
  const [showLink, setShowLink] = useState(false);
  const [displayBackgroundUrl, setDisplayBackgroundUrl] = useState("");
  const [displayBackgroundSourceUrl, setDisplayBackgroundSourceUrl] = useState("");

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

  useEffect(() => {
    if (!backgroundUrl) {
      setDisplayBackgroundUrl("");
      setDisplayBackgroundSourceUrl("");
      return;
    }

    let cancelled = false;
    const sourceUrl = backgroundUrl.trim();
    const controller = new AbortController();

    setDisplayBackgroundUrl("");
    setDisplayBackgroundSourceUrl("");

    const resolveBackground = async () => {
      try {
        const params = new URLSearchParams({
          url: sourceUrl,
          route: pathname,
        });
        const response = await fetch(`/api/config/background/resolve?${params}`, {
          signal: controller.signal,
        });
        const data = response.ok ? ((await response.json()) as { url?: string }) : null;
        const displayUrl = data?.url || sourceUrl;

        if (!cancelled) {
          setDisplayBackgroundUrl(displayUrl);
          setDisplayBackgroundSourceUrl(displayUrl);
        }
      } catch {
        if (!cancelled) {
          setDisplayBackgroundUrl(sourceUrl);
          setDisplayBackgroundSourceUrl(sourceUrl);
        }
      }
    };

    void resolveBackground();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [backgroundUrl, pathname]);

  return (
    <>
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="page-gradient-background absolute inset-0" />
        {displayBackgroundUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
            style={{ backgroundImage: `url(${displayBackgroundUrl})` }}
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

      {displayBackgroundUrl ? (
        <div
          className="pointer-events-none fixed bottom-6 left-6 z-[100]"
          onMouseEnter={() => setShowLink(true)}
          onMouseLeave={() => setShowLink(false)}
        >
          <a
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-background shadow-lg opacity-80 transition-all duration-300 hover:border-primary/50 hover:opacity-100 hover:shadow-xl"
            href={displayBackgroundSourceUrl || displayBackgroundUrl}
            target="_blank"
            rel="noreferrer"
            title="查看原图"
          >
            <ImageIcon className="h-4 w-4 text-primary transition-transform duration-300 hover:scale-110" />
            <span className="sr-only">查看原图</span>
          </a>
          {showLink && (
            <div className="absolute bottom-full left-0 mb-2 max-w-[280px] truncate whitespace-nowrap rounded-lg bg-black/80 px-3 py-1.5 text-xs text-white backdrop-blur-sm animate-fade-in-up">
              {displayBackgroundSourceUrl || displayBackgroundUrl}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
