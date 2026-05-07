import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { extractAuditRequestContext } from "../../app/lib/admin-audit";

const routeExpectations = [
  { file: "app/api/admin/users/route.ts", actions: ["user.delete"] },
  { file: "app/api/admin/card-keys/route.ts", actions: ["card_key.reset", "card_key.delete"] },
  { file: "app/api/admin/card-keys/generate/route.ts", actions: ["card_key.generate"] },
  { file: "app/api/config/route.ts", actions: ["config.update"] },
  { file: "app/api/config/background/route.ts", actions: ["config.background.update"] },
  { file: "app/api/config/email-service/route.ts", actions: ["config.email_service.update"] },
  { file: "app/api/cleanup/config/route.ts", actions: ["config.cleanup.update"] },
  { file: "app/api/admin/permissions/roles/route.ts", actions: ["permissions.role.update"] },
  { file: "app/api/admin/permissions/routes/route.ts", actions: ["permissions.route_policy.update"] },
  { file: "app/api/admin/permissions/api-key-scopes/route.ts", actions: ["permissions.api_key_scope.update"] },
];

function readRoute(file: string) {
  return readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
}

function assertRouteAuditCoverage() {
  for (const expectation of routeExpectations) {
    const source = readRoute(expectation.file);
    assert.match(source, /recordAdminMutationAudit/, `${expectation.file} should use admin audit helper`);

    for (const action of expectation.actions) {
      assert.match(source, new RegExp(`action:\\s*["']${action}["']`), `${expectation.file} should audit ${action}`);
    }
  }
}

function assertRequestContextExtraction() {
  const request = new Request("https://example.invalid/api/admin", {
    headers: {
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.22, 198.51.100.23",
      "user-agent": "audit-test-agent",
    },
  });

  assert.deepEqual(extractAuditRequestContext(request), {
    ipAddress: "203.0.113.10",
    userAgent: "audit-test-agent",
  });

  const fallbackRequest = new Request("https://example.invalid/api/admin", {
    headers: {
      "x-forwarded-for": "198.51.100.22, 198.51.100.23",
    },
  });

  assert.deepEqual(extractAuditRequestContext(fallbackRequest), {
    ipAddress: "198.51.100.22",
    userAgent: null,
  });
}

function run() {
  assertRequestContextExtraction();
  assertRouteAuditCoverage();
  console.log("admin audit integration tests: OK");
}

run();
