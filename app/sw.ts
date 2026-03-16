import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

interface NavigationPreloadFetchEvent extends FetchEvent {
  preloadResponse?: Promise<Response | undefined>;
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.setCatchHandler(async ({ event, request }) => {
  if (request.mode === "navigate") {
    const fetchEvent = event as NavigationPreloadFetchEvent;
    const preloadResponse = await fetchEvent.preloadResponse;

    if (preloadResponse) {
      return preloadResponse;
    }

    try {
      return await fetch(request);
    } catch {
      return new Response(
        `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Temporarily unavailable</title>
  </head>
  <body>
    <main style="font-family: sans-serif; margin: 48px auto; max-width: 560px; padding: 0 24px; line-height: 1.6;">
      <h1 style="margin-bottom: 12px;">Page temporarily unavailable</h1>
      <p style="margin: 0 0 8px;">The latest page request could not be completed. Please refresh and try again.</p>
      <p style="margin: 0; color: #666;">页面暂时不可用，请稍后刷新重试。</p>
    </main>
  </body>
</html>`,
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type": "text/html; charset=utf-8",
          },
        }
      );
    }
  }

  return Response.error();
});

serwist.addEventListeners();
