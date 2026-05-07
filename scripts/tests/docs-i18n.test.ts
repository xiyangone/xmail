import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../..", import.meta.url);

function readText(path: string) {
  return readFileSync(new URL(path, root), "utf8");
}

function readJson(path: string) {
  return JSON.parse(readText(path)) as Record<string, unknown>;
}

function getNestedString(source: Record<string, unknown>, path: string) {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[key];
  }, source);

  assert.equal(typeof value, "string", `${path} should be translated`);
  assert.notEqual(value, "", `${path} should not be empty`);
}

function assertAdminTranslations() {
  const zh = readJson("messages/zh.json");
  const en = readJson("messages/en.json");
  const keys = [
    "admin.permissions",
    "admin.operations",
    "admin.workers",
    "admin.cleanupRuns",
    "admin.webhookLogs",
    "admin.mailLogs",
    "admin.auditLogs",
    "admin.diagnostics",
  ];

  for (const key of keys) {
    getNestedString(zh, key);
    getNestedString(en, key);
  }
}

function assertReadmeDocs() {
  const readme = readText("README.md");
  assert.match(readme, /## 运维中心/, "README should document the operations center");
  assert.match(readme, /动态权限策略/, "README should document dynamic permission policy management");
  assert.match(readme, /admin_audit_log/, "README should mention admin audit logs");
  assert.match(readme, /INTERNAL_WORKER_SECRET/, "README should document the internal worker secret");
}

function assertEnvironmentExamples() {
  const envExample = readText(".env.example");
  assert.match(envExample, /INTERNAL_WORKER_SECRET\s*=\s*""/, ".env.example should expose INTERNAL_WORKER_SECRET");

  const tempCleanup = readText("wrangler.temp-cleanup.example.json");
  assert.match(tempCleanup, /INTERNAL_WORKER_SECRET/, "temp cleanup worker example should include INTERNAL_WORKER_SECRET");
}

function run() {
  assertAdminTranslations();
  assertReadmeDocs();
  assertEnvironmentExamples();
  console.log("docs i18n tests: OK");
}

run();
