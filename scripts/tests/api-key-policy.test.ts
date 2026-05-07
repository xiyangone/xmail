import assert from "node:assert/strict";

import { DEFAULT_ROUTE_POLICIES } from "../../app/lib/permission-seed";
import { PERMISSIONS } from "../../app/lib/permissions";
import { matchRoutePolicyFromList } from "../../app/lib/policy";

function policyFor(pathname: string, method: string) {
  const policy = matchRoutePolicyFromList(DEFAULT_ROUTE_POLICIES, pathname, method);
  assert.ok(policy, `Missing policy for ${method} ${pathname}`);
  return policy;
}

function run() {
  assert.equal(policyFor("/api/emails", "GET").allowApiKey, true);
  assert.equal(policyFor("/api/emails/abc/verification-code", "POST").allowApiKey, true);
  assert.equal(policyFor("/api/config", "GET").allowApiKey, true);
  assert.equal(policyFor("/api/config", "POST").allowApiKey, true);

  assert.equal(policyFor("/api/webhook", "GET").allowApiKey, false);
  assert.equal(policyFor("/api/api-keys", "GET").allowApiKey, false);
  assert.equal(policyFor("/api/admin/operations/summary", "GET").allowApiKey, false);

  assert.ok(policyFor("/api/config", "POST").requiredPermissions.includes(PERMISSIONS.MANAGE_CONFIG));
  assert.ok(policyFor("/api/emails", "GET").requiredPermissions.includes(PERMISSIONS.MANAGE_EMAIL));

  console.log("api key policy tests: OK");
}

run();
