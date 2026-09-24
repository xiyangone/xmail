import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { authorizeRequest, type AuthIdentity } from "../../app/lib/policy";
import { DEFAULT_ROUTE_POLICIES, type RoutePolicyDefinition } from "../../app/lib/permission-seed";
import { PERMISSIONS } from "../../app/lib/permissions";

test("policy and identity reads start together while authorization stays fail-closed", async () => {
  const started: string[] = [];
  let resolvePolicies!: (value: RoutePolicyDefinition[]) => void;
  let resolveIdentity!: (value: { identity: AuthIdentity; requestHeaders: Headers }) => void;
  const policies = new Promise<RoutePolicyDefinition[]>((resolve) => { resolvePolicies = resolve; });
  const identity = new Promise<{ identity: AuthIdentity; requestHeaders: Headers }>((resolve) => { resolveIdentity = resolve; });
  const decision = authorizeRequest(new Request("https://example.test/api/emails"), {
    getRoutePolicies: () => { started.push("policies"); return policies; },
    resolveAuthIdentity: () => { started.push("identity"); return identity; },
  });
  assert.deepEqual(started, ["policies", "identity"]);
  resolvePolicies(DEFAULT_ROUTE_POLICIES);
  resolveIdentity({ identity: { source: "anonymous" }, requestHeaders: new Headers() });
  assert.equal((await decision).status, 401);
});

test("parallel authorization preserves permissions, missing-policy denial, and request isolation", async () => {
  const decide = (path: string, permissions: string[]) => authorizeRequest(new Request(`https://example.test${path}`), {
    getRoutePolicies: async () => DEFAULT_ROUTE_POLICIES,
    resolveAuthIdentity: async () => ({
      identity: { source: "session", userId: "test-user", permissionKeys: permissions },
      requestHeaders: new Headers(),
    }),
  });
  const [allowed, denied, missing] = await Promise.all([
    decide("/api/emails", [PERMISSIONS.MANAGE_EMAIL]),
    decide("/api/emails", []),
    decide("/not-a-managed-route", [PERMISSIONS.MANAGE_EMAIL]),
  ]);
  assert.equal(allowed.allowed, true);
  assert.equal(denied.status, 403);
  assert.equal(missing.status, 403);
});

test("client-only admin tabs do not navigate the server route or eagerly load every module", () => {
  const source = readFileSync("app/components/admin/admin-dashboard.tsx", "utf8");
  assert.doesNotMatch(source, /useRouter|router\.(?:push|replace)|startViewTransition/);
  assert.equal(source.match(/window\.history\.replaceState\(/g)?.length, 2);
  assert.equal(source.match(/= dynamic\(\(\) => import\(/g)?.length, 5);
  assert.match(source, /useSearchParams/);
});

test("mailbox reads retain ownership and expiry without an identical role-dependent branch", () => {
  const source = readFileSync("app/api/emails/route.ts", "utf8");
  assert.doesNotMatch(source, /isTempUser/);
  assert.match(source, /if \(!userId\)/);
  assert.match(source, /eq\(emails\.userId, userId\)/);
  assert.match(source, /gt\(emails\.expiresAt, new Date\(\)\)/);
});

test("mailbox actions are visible and keyboard-accessible without stealing the address width", () => {
  const source = readFileSync("app/components/emails/email-list.tsx", "utf8");
  const row = source.slice(source.indexOf('data-testid="mailbox-row"'), source.indexOf("export function EmailList"));
  assert.match(row, /role="checkbox"/);
  assert.match(row, /aria-checked=\{isChecked\}/);
  assert.match(row, /aria-pressed=\{isSelected\}/);
  assert.match(row, /title=\{email\.address\}/);
  assert.match(row, /break-all/);
  assert.match(row, /aria-label=\{tc\("delete"\)\}/);
  assert.doesNotMatch(row, /opacity-0|group-hover:opacity-100|truncate|animate-pulse/);
});

test("page transitions do not hide content or transform the fixed header containing block", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const animation = css.match(/@keyframes page-enter \{[^\n]+/);
  assert.ok(animation);
  assert.doesNotMatch(animation[0], /transform|opacity: 0;/);
  const dialog = readFileSync("app/components/ui/alert-dialog.tsx", "utf8");
  assert.match(dialog, /w-\[calc\(100%-2rem\)\]/);
  assert.match(dialog, /max-h-\[calc\(100dvh-2rem\)\]/);
});

test("temporary or custom roles can render their profile without a missing-role crash", () => {
  const source = readFileSync("app/components/profile/profile-card.tsx", "utf8");
  assert.match(source, /temp_user: \{ name: tr\('tempUser'\)/);
  assert.match(source, /roleConfigs\[name as keyof typeof roleConfigs\] \?\? \{ name, icon: User2 \}/);
});

test("routes outside the authorization proxy never trust client-supplied identity headers", () => {
  for (const file of [
    "app/api/user/settings/route.ts",
    "app/api/user/temp-info/route.ts",
    "app/api/realtime/token/route.ts",
  ]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /const session = await auth\(\)/);
    assert.match(source, /const userId = session\?\.user\?\.id/);
    assert.doesNotMatch(source, /getUserId|checkPermission\(/);
  }
  const settings = readFileSync("app/api/user/settings/route.ts", "utf8");
  assert.equal(settings.match(/const session = await auth\(\)/g)?.length, 2);
  assert.match(settings, /session\.user\.permissions\?\.includes\(PERMISSIONS\.MANAGE_WEBHOOK\)/);
});

test("mobile back navigation preserves mounted mailbox and message lists", () => {
  const source = readFileSync("app/components/emails/three-column-layout.tsx", "utf8");
  assert.match(source, /mobileView !== "list" && "hidden"/);
  assert.match(source, /mobileView !== "emails" && "hidden"/);
  assert.doesNotMatch(source, /mobileView === "list" &&/);
  assert.doesNotMatch(source, /mobileView === "emails" && selectedEmail/);
});

test("cleanup staging is excluded from source control, type checks, and lint", () => {
  const gitignore = readFileSync(".gitignore", "utf8");
  const tsconfig = JSON.parse(readFileSync("tsconfig.json", "utf8")) as { exclude: string[] };
  const eslint = readFileSync("eslint.config.mjs", "utf8");
  assert.match(gitignore, /^\/de\/$/m);
  assert.ok(tsconfig.exclude.includes("de"));
  assert.match(eslint, /"de\/\*\*\/\*"/);
});
