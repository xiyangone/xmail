import assert from "node:assert/strict";

import { GET } from "../../app/api/config/background/resolve/route";

function withMockedFetch<T>(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<T>
) {
  const original = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = mock;
  return fn().finally(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = original;
  });
}

async function testRedirectedImageReturnsFinalUrl() {
  const rawUrl = "https://random.example/redirect";

  await withMockedFetch(async () => {
    return {
      ok: true,
      url: "https://cdn.example/final.jpg",
      headers: new Headers({ "content-type": "image/jpeg" }),
    } as Response;
  }, async () => {
    const response = await GET(
      new Request(
        `https://mail.example/api/config/background/resolve?url=${encodeURIComponent(rawUrl)}`
      )
    );
    const data = (await response.json()) as { url: string };

    assert.equal(data.url, "https://cdn.example/final.jpg");
  });
}

async function testDirectImageReturnsStableProxyUrl() {
  const rawUrl = "https://random.example/image";

  await withMockedFetch(async () => {
    return {
      ok: true,
      url: rawUrl,
      headers: new Headers({ "content-type": "image/jpeg" }),
    } as Response;
  }, async () => {
    const response = await GET(
      new Request(
        `https://mail.example/api/config/background/resolve?url=${encodeURIComponent(rawUrl)}`
      )
    );
    const data = (await response.json()) as { url: string };
    const proxyUrl = new URL(data.url);

    assert.equal(proxyUrl.origin, "https://mail.example");
    assert.equal(proxyUrl.pathname, "/api/config/background/resolve");
    assert.equal(proxyUrl.searchParams.get("proxy"), "1");
    assert.equal(proxyUrl.searchParams.get("url"), rawUrl);
    assert.ok(proxyUrl.searchParams.get("v"));
  });
}

async function testProxyStreamsImageWithCacheHeaders() {
  const rawUrl = "https://random.example/image";
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  await withMockedFetch(async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response("image-bytes", {
      status: 200,
      headers: { "content-type": "image/png" },
    });
  }, async () => {
    const response = await GET(
      new Request(
        `https://mail.example/api/config/background/resolve?proxy=1&v=test&url=${encodeURIComponent(rawUrl)}`
      )
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/png");
    assert.equal(response.headers.get("cache-control"), "public, max-age=3600, immutable");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(await response.text(), "image-bytes");
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, rawUrl);
}

async function run() {
  await testRedirectedImageReturnsFinalUrl();
  await testDirectImageReturnsStableProxyUrl();
  await testProxyStreamsImageWithCacheHeaders();
  console.log("background-resolve tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
