export const BACKGROUND_CACHE_NAME = "xmail-background-v1";

const BACKGROUND_TAB_ID_STORAGE_KEY = "xmail-background-tab-id";
const BACKGROUND_SOURCE_STORAGE_PREFIX = "xmail-background-source:";

interface BackgroundCacheKeyParts {
  sourceUrl: string;
  theme: string;
  userKey: string;
  tabId: string;
}

export function getOrCreateBackgroundTabId(storage: Storage) {
  const existingTabId = storage.getItem(BACKGROUND_TAB_ID_STORAGE_KEY);
  if (existingTabId) {
    return existingTabId;
  }

  const tabId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  storage.setItem(BACKGROUND_TAB_ID_STORAGE_KEY, tabId);
  return tabId;
}

export function createBackgroundCacheKey({
  sourceUrl,
  theme,
  userKey,
  tabId,
}: BackgroundCacheKeyParts) {
  const params = new URLSearchParams({
    sourceUrl,
    theme,
    userKey,
    tabId,
  });

  return params.toString();
}

export function createBackgroundCacheRequestUrl(cacheKey: string, origin = window.location.origin) {
  const url = new URL("/__xmail_background_cache__", origin);
  url.searchParams.set("key", cacheKey);
  return url.toString();
}

export function getBackgroundSourceStorageKey(cacheKey: string) {
  return `${BACKGROUND_SOURCE_STORAGE_PREFIX}${cacheKey}`;
}

export function createBackgroundResolveUrl(sourceUrl: string) {
  const params = new URLSearchParams({ url: sourceUrl });
  return `/api/config/background/resolve?${params}`;
}

export function createBackgroundProxyUrl(sourceUrl: string) {
  const params = new URLSearchParams({ proxy: "1", url: sourceUrl });
  return `/api/config/background/resolve?${params}`;
}

export function getBackgroundAssetUrl(sourceUrl: string, origin = window.location.origin) {
  try {
    const parsedUrl = new URL(sourceUrl, origin);
    if (parsedUrl.origin === origin) {
      return parsedUrl.toString();
    }
  } catch {}

  return createBackgroundProxyUrl(sourceUrl);
}
