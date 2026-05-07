import assert from "node:assert/strict";

import { DEFAULT_ROUTE_POLICIES, POLICY_ACCESS } from "../../app/lib/permission-seed";
import { PERMISSIONS } from "../../app/lib/permissions";
import { matchRoutePolicyFromList, methodMatches, pathMatches } from "../../app/lib/policy";

function requirePolicy(pathname: string, method: string) {
  const policy = matchRoutePolicyFromList(DEFAULT_ROUTE_POLICIES, pathname, method);
  assert.ok(policy, `Expected policy for ${method} ${pathname}`);
  return policy;
}

function run() {
  assert.equal(methodMatches("GET,POST", "post"), true);
  assert.equal(methodMatches("GET", "POST"), false);
  assert.equal(pathMatches("/api/admin/:path*", "/api/admin/operations/summary"), true);
  assert.equal(pathMatches("/api/config", "/api/config/background"), false);

  const publicConfig = requirePolicy("/api/config", "GET");
  assert.equal(publicConfig.access, POLICY_ACCESS.PUBLIC);

  const configWrite = requirePolicy("/api/config", "POST");
  assert.deepEqual(configWrite.requiredPermissions, [PERMISSIONS.MANAGE_CONFIG]);

  const emailRead = requirePolicy("/api/emails/abc/messages", "GET");
  assert.equal(emailRead.allowApiKey, true);
  assert.ok(emailRead.requiredPermissions.includes(PERMISSIONS.VIEW_TEMP_EMAIL));

  const emailWrite = requirePolicy("/api/emails/abc", "DELETE");
  assert.deepEqual(emailWrite.requiredPermissions, [PERMISSIONS.MANAGE_EMAIL]);

  const tempCleanup = requirePolicy("/api/cleanup/temp-accounts", "POST");
  assert.equal(tempCleanup.allowInternal, true);
  assert.ok(tempCleanup.requiredPermissions.includes(PERMISSIONS.MANAGE_OPERATIONS));

  const operationsSummary = requirePolicy("/api/admin/operations/summary", "GET");
  assert.ok(operationsSummary.requiredPermissions.includes(PERMISSIONS.VIEW_OPERATIONS));

  const legacyAdminFallback = requirePolicy("/api/admin/unknown", "POST");
  assert.deepEqual(legacyAdminFallback.requiredPermissions, [PERMISSIONS.MANAGE_OPERATIONS]);

  console.log("route policy tests: OK");
}

run();
