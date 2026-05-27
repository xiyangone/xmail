import assert from "node:assert/strict";

import {
  createBackgroundCacheKey,
  createBackgroundCacheRequestUrl,
  createBackgroundResolveUrl,
  getBackgroundAssetUrl,
  getOrCreateBackgroundTabId,
} from "../../app/lib/background-cache";

function createMemoryStorage() {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
    clear() {
      values.clear();
    },
    key(index: number) {
      return Array.from(values.keys())[index] ?? null;
    },
    get length() {
      return values.size;
    },
  } as Storage;
}

async function testTabIdIsStableWithinSession() {
  const storage = createMemoryStorage();

  const first = getOrCreateBackgroundTabId(storage);
  const second = getOrCreateBackgroundTabId(storage);

  assert.equal(first, second);
  assert.ok(first.length > 0);
}

async function testCacheKeyDoesNotDependOnRoute() {
  const base = {
    sourceUrl: "https://loliapi.com/acg/",
    theme: "light",
    userKey: "anonymous",
    tabId: "tab-a",
  };

  const key = createBackgroundCacheKey(base);

  assert.equal(key, createBackgroundCacheKey(base));
  assert.notEqual(key, createBackgroundCacheKey({ ...base, sourceUrl: "https://loliapi.com/acg/2" }));
  assert.notEqual(key, createBackgroundCacheKey({ ...base, theme: "dark" }));
  assert.notEqual(key, createBackgroundCacheKey({ ...base, userKey: "user-1" }));
  assert.notEqual(key, createBackgroundCacheKey({ ...base, tabId: "tab-b" }));
  assert.equal(key.includes("route"), false);
}

async function testCacheRequestUrlUsesKey() {
  const key = createBackgroundCacheKey({
    sourceUrl: "https://loliapi.com/acg/",
    theme: "dark",
    userKey: "authenticated",
    tabId: "tab-a",
  });
  const requestUrl = new URL(createBackgroundCacheRequestUrl(key, "https://mail.example"));

  assert.equal(requestUrl.origin, "https://mail.example");
  assert.equal(requestUrl.pathname, "/__xmail_background_cache__");
  assert.equal(requestUrl.searchParams.get("key"), key);
}

async function testResolveUrlAndAssetUrlSplitCrossOriginImages() {
  const rawUrl = "https://cdn.example/image.jpg";

  assert.equal(
    createBackgroundResolveUrl(rawUrl),
    `/api/config/background/resolve?url=${encodeURIComponent(rawUrl)}`
  );

  const assetUrl = getBackgroundAssetUrl(rawUrl, "https://mail.example");
  const parsedUrl = new URL(assetUrl, "https://mail.example");

  assert.equal(parsedUrl.pathname, "/api/config/background/resolve");
  assert.equal(parsedUrl.searchParams.get("proxy"), "1");
  assert.equal(parsedUrl.searchParams.get("url"), rawUrl);
}

async function testSameOriginAssetUrlStaysDirect() {
  const rawUrl = "https://mail.example/assets/background.jpg";

  assert.equal(getBackgroundAssetUrl(rawUrl, "https://mail.example"), rawUrl);
}

async function run() {
  await testTabIdIsStableWithinSession();
  await testCacheKeyDoesNotDependOnRoute();
  await testCacheRequestUrlUsesKey();
  await testResolveUrlAndAssetUrlSplitCrossOriginImages();
  await testSameOriginAssetUrlStaysDirect();
  console.log("background-cache tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
