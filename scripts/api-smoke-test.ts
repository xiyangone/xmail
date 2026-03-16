import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

const METHOD_NAMES: HttpMethod[] = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
];

const MUTATING_METHODS = new Set<HttpMethod>(["POST", "PUT", "PATCH", "DELETE"]);
const SAFE_MUTATION_SUFFIXES = ["/verification-code"];

function normalizeBaseUrl(raw: string): string {
  const value = raw.trim();
  const withScheme = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  return withScheme.replace(/\/+$/, "");
}

function isLocalUrl(url: URL): boolean {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname);
}

async function listRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listRouteFiles(fullPath)));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      results.push(fullPath);
    }
  }

  return results;
}

function routeFromFile(appApiDir: string, filePath: string): string {
  const rel = path.relative(appApiDir, filePath);
  const noSuffix = rel.replace(/(?:^|\\|\/)route\.ts$/, "");
  const normalized = noSuffix.split(path.sep).join("/");
  return `/api/${normalized}`.replace(/\/+$/, "");
}

function parseExportedMethods(source: string): HttpMethod[] {
  const methods = new Set<HttpMethod>();

  const fnRegex =
    /\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  for (const match of source.matchAll(fnRegex)) {
    methods.add(match[1] as HttpMethod);
  }

  const constRegex =
    /\bexport\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
  for (const match of source.matchAll(constRegex)) {
    methods.add(match[1] as HttpMethod);
  }

  const exportBlockRegex = /\bexport\s*\{\s*([^}]+)\s*\}/g;
  for (const match of source.matchAll(exportBlockRegex)) {
    const names = match[1]
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    for (const name of names) {
      if (METHOD_NAMES.includes(name as HttpMethod)) {
        methods.add(name as HttpMethod);
      }
    }
  }

  return [...methods].sort(
    (a, b) => METHOD_NAMES.indexOf(a) - METHOD_NAMES.indexOf(b)
  );
}

function materializeRoute(route: string): string {
  // NextAuth catch-all：选一个稳定的 GET 端点来冒烟
  if (route.includes("/api/auth/[...auth]")) {
    return "/api/auth/providers";
  }

  return (
    route
      // common dynamic segments
      .replaceAll("[id]", "00000000-0000-0000-0000-000000000000")
      .replaceAll("[messageId]", "00000000-0000-0000-0000-000000000000")
      .replaceAll("[shareId]", "00000000-0000-0000-0000-000000000000")
      .replaceAll("[token]", "test-token")
      // fallback for unknown dynamic segments
      .replace(/\[[^\]]+\]/g, "test")
  );
}

function isSafeMutationPath(routePath: string): boolean {
  return SAFE_MUTATION_SUFFIXES.some((suffix) => routePath.endsWith(suffix));
}

function buildBody(routePath: string): unknown {
  if (routePath.endsWith("/verification-code")) {
    return { interval: 250, timeout: 1000 };
  }
  return {};
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const baseUrl = new URL(normalizeBaseUrl(process.env.BASE_URL || "http://localhost:8787"));
  const appApiDir = path.join(process.cwd(), "app", "api");

  const isLocal = isLocalUrl(baseUrl);
  const allowMutations = process.env.RUN_MUTATIONS === "1" || isLocal;
  const requestTimeoutMs = Number.parseInt(
    process.env.REQUEST_TIMEOUT_MS || "10000",
    10
  );
  const verbose = process.env.VERBOSE === "1";

  const apiKey = process.env.API_KEY;

  const files = await listRouteFiles(appApiDir);
  files.sort((a, b) => a.localeCompare(b));

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const methods = parseExportedMethods(source);
    const rawRoute = routeFromFile(appApiDir, file);
    const routePath = materializeRoute(rawRoute);

    if (methods.length === 0) {
      if (verbose) console.log(`[SKIP] ${rawRoute} (no exported methods)`);
      skipped += 1;
      continue;
    }

    for (const method of methods) {
      const isMutating = MUTATING_METHODS.has(method);
      if (isMutating && !allowMutations && !isSafeMutationPath(routePath)) {
        if (verbose) console.log(`[SKIP] ${method} ${routePath} (mutations disabled)`);
        skipped += 1;
        continue;
      }

      const url = new URL(routePath, baseUrl).toString();
      const headers: Record<string, string> = {};

      if ((routePath.startsWith("/api/emails") || routePath.startsWith("/api/config")) && apiKey) {
        headers["X-API-Key"] = apiKey;
      }

      let body: string | undefined;
      if (["POST", "PUT", "PATCH"].includes(method)) {
        headers["Content-Type"] = "application/json";
        body = JSON.stringify(buildBody(routePath));
      }

      try {
        const res = await fetchWithTimeout(
          url,
          { method, headers, body },
          requestTimeoutMs
        );
        const ok = res.status < 500;

        if (ok) {
          passed += 1;
          if (verbose) console.log(`[PASS] ${method} ${routePath} -> ${res.status}`);
          continue;
        }

        failed += 1;
        const text = (await res.text()).slice(0, 800);
        console.error(
          `[FAIL] ${method} ${routePath} -> ${res.status}\n${text || "(empty body)"}\n`
        );
      } catch (error) {
        failed += 1;
        console.error(`[FAIL] ${method} ${routePath} -> ${String(error)}`);
      }
    }
  }

  console.log(
    `API smoke test done: ${passed} passed, ${skipped} skipped, ${failed} failed (base: ${baseUrl.origin})`
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

