export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
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

  try {
    const response = await fetch(url, { redirect: "follow" });
    return Response.json(
      { url: response.url || rawUrl },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch {
    return Response.json({ url: rawUrl }, { headers: { "Cache-Control": "private, no-store" } });
  }
}
