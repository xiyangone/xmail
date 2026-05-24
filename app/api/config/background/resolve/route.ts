const BACKGROUND_RESOLVE_TIMEOUT_MS = 3000;
const BACKGROUND_PROXY_CACHE_SECONDS = 3600;

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const rawUrl = searchParams.get("url")?.trim();

  if (!rawUrl) {
    return Response.json({ error: "缺少图片 URL" }, { status: 400 });
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return Response.json({ error: "无效的图片 URL" }, { status: 400 });
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return Response.json({ error: "仅支持 HTTP/HTTPS 图片 URL" }, { status: 400 });
  }

  if (searchParams.get("proxy") === "1") {
    return proxyImage(url);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKGROUND_RESOLVE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const resolvedUrl =
      response.ok && contentType.startsWith("image/")
        ? resolveDisplayUrl(requestUrl, rawUrl, response.url)
        : rawUrl;

    return Response.json(
      { url: resolvedUrl || rawUrl },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return Response.json({ url: rawUrl }, { headers: { "Cache-Control": "private, no-store" } });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function proxyImage(url: URL) {
  const response = await fetch(url, { redirect: "follow" });
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (!response.ok || !contentType.startsWith("image/") || !response.body) {
    return Response.json({ error: "无法读取图片" }, { status: 502 });
  }

  return new Response(response.body, {
    status: response.status,
    headers: {
      "Cache-Control": `public, max-age=${BACKGROUND_PROXY_CACHE_SECONDS}, immutable`,
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function resolveDisplayUrl(requestUrl: URL, rawUrl: string, resolvedUrl: string) {
  if (resolvedUrl !== rawUrl) {
    return resolvedUrl;
  }

  const proxyUrl = new URL(requestUrl.pathname, requestUrl.origin);
  proxyUrl.searchParams.set("proxy", "1");
  proxyUrl.searchParams.set("v", String(Date.now()));
  proxyUrl.searchParams.set("url", rawUrl);
  return proxyUrl.toString();
}
