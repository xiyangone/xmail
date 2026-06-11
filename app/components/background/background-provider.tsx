"use client";

import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import {
  BACKGROUND_CACHE_NAME,
  createBackgroundCacheKey,
  createBackgroundCacheRequestUrl,
  createBackgroundResolveUrl,
  getBackgroundAssetUrl,
  getBackgroundSourceStorageKey,
  getOrCreateBackgroundTabId,
} from "@/lib/background-cache";
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
  const userCacheKey =
    session?.user?.email || session?.user?.name || (session?.user ? "authenticated" : "anonymous");

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

    const setBlobBackground = (blob: Blob, sourceLabel: string) => {
      const objectUrl = URL.createObjectURL(blob);
      if (cancelled) {
        URL.revokeObjectURL(objectUrl);
        return "";
      }

      setDisplayBackgroundUrl(objectUrl);
      setDisplayBackgroundSourceUrl(sourceLabel);
      return objectUrl;
    };

    const resolveBackground = async () => {
      let objectUrl = "";

      try {
        const tabId = getOrCreateBackgroundTabId(window.sessionStorage);
        const cacheKey = createBackgroundCacheKey({
          sourceUrl,
          theme: activeTheme,
          userKey: userCacheKey,
          tabId,
        });
        const sourceStorageKey = getBackgroundSourceStorageKey(cacheKey);
        const cachedSourceUrl = window.sessionStorage.getItem(sourceStorageKey) || sourceUrl;
        const cache =
          "caches" in window ? await window.caches.open(BACKGROUND_CACHE_NAME) : null;
        const cacheRequest = new Request(createBackgroundCacheRequestUrl(cacheKey));
        const cachedResponse = await cache?.match(cacheRequest);

        if (cachedResponse?.ok) {
          objectUrl = setBlobBackground(await cachedResponse.blob(), cachedSourceUrl);
          try {
            window.sessionStorage.setItem(sourceStorageKey, cachedSourceUrl);
          } catch {}
          return () => objectUrl && URL.revokeObjectURL(objectUrl);
        }

        const response = await fetch(createBackgroundResolveUrl(sourceUrl), {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = response.ok ? ((await response.json()) as { url?: string }) : null;
        const resolvedUrl = data?.url || sourceUrl;
        const assetUrl = getBackgroundAssetUrl(resolvedUrl);
        const imageResponse = await fetch(assetUrl, { signal: controller.signal });

        if (!imageResponse.ok) {
          throw new Error("Failed to load background image");
        }

        const responseForCache = imageResponse.clone();
        const blob = await imageResponse.blob();

        try {
          await cache?.put(cacheRequest, responseForCache);
          window.sessionStorage.setItem(sourceStorageKey, resolvedUrl);
        } catch {}

        objectUrl = setBlobBackground(blob, resolvedUrl);
      } catch {
        if (!cancelled) {
          const fallbackUrl = getBackgroundAssetUrl(sourceUrl);
          setDisplayBackgroundUrl(fallbackUrl);
          setDisplayBackgroundSourceUrl(sourceUrl);
        }
      }

      return () => objectUrl && URL.revokeObjectURL(objectUrl);
    };

    let revokeObjectUrl: (() => void) | undefined;
    void resolveBackground().then((revoke) => {
      revokeObjectUrl = revoke;
    });

    return () => {
      cancelled = true;
      controller.abort();
      revokeObjectUrl?.();
    };
  }, [activeTheme, backgroundUrl, userCacheKey]);

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
          className="pointer-events-none fixed bottom-6 left-6 z-header"
          onMouseEnter={() => setShowLink(true)}
          onMouseLeave={() => setShowLink(false)}
        >
          <a
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-background shadow-lg opacity-80 transition-all duration-300 hover:border-primary/50 hover:opacity-100 hover:shadow-xl"
            href={displayBackgroundUrl}
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
