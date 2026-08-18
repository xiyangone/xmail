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

  return Response.json(
    { url: resolveDisplayUrl(requestUrl, rawUrl) },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    }
  );
}

async function proxyImage(url: URL) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKGROUND_RESOLVE_TIMEOUT_MS);

  try {
    const response = await fetch(url, { redirect: "follow", signal: controller.signal });
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
  } catch {
    return Response.json({ error: "无法读取图片" }, { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolveDisplayUrl(requestUrl: URL, rawUrl: string) {
  const proxyUrl = new URL(requestUrl.pathname, requestUrl.origin);
  proxyUrl.searchParams.set("proxy", "1");
  proxyUrl.searchParams.set("url", rawUrl);
  return proxyUrl.toString();
}
