import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const read = (path: string) => readFileSync(path, "utf8");

test("framework packages and deployment tools use the validated locked versions", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.dependencies.next, "16.3.6");
  assert.equal(pkg.dependencies.react, "19.3.0");
  assert.equal(pkg.devDependencies.tailwindcss, "4.3.3");
  assert.equal(pkg.packageManager, "pnpm@11.19.0");
  for (const value of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.match(String(value), /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/);
  }
  assert.equal(pkg.dependencies["framer-motion"], undefined);
  assert.equal(pkg.devDependencies["@eslint/eslintrc"], undefined);
  assert.equal(pkg.scripts.build, "next build --webpack");
  assert.equal(pkg.scripts["build:worker"], "opennextjs-cloudflare build");
  assert.match(pkg.scripts["deploy:worker"], /^pnpm run verify &&/);
  assert.doesNotMatch(read("scripts/deploy/index.ts") + read(".github/workflows/deploy.yml"), /pnpm dlx/);
  assert.match(read("pnpm-workspace.yaml"), /strictPeerDependencies: true/);
  assert.match(read("pnpm-workspace.yaml"), /nodeLinker: hoisted/);
});

test("there is exactly one proxy, Tailwind configuration, and ESLint configuration path", () => {
  assert.equal(existsSync("middleware.ts"), false);
  assert.equal(existsSync("tailwind.config.ts"), false);
  assert.equal(existsSync(".eslintrc.json"), false);
  assert.match(read("proxy.ts"), /export async function proxy\(/);
  assert.match(read("eslint.config.mjs"), /eslint-config-next\/core-web-vitals/);
  assert.doesNotMatch(read("eslint.config.mjs"), /FlatCompat/);
  assert.match(read("postcss.config.mjs"), /@tailwindcss\/postcss/);
  assert.match(read("app/globals.css"), /@import "tailwindcss" source\(none\)/);
  assert.doesNotMatch(read("app/globals.css"), /@tailwind |@config /);
});

test("native Tailwind CSS emits theme, overlay, and modal animation utilities", async () => {
  const result = await postcss([tailwind()]).process(read("app/globals.css"), { from: "app/globals.css" });
  assert.equal(result.warnings().length, 0);
  const rules: string[] = [];
  result.root.walkRules((rule) => { rules.push(rule.toString()); });
  const css = result.css;
  assert.ok(rules.some((rule) => rule.startsWith(".z-modal ") && rule.includes("120")));
  assert.ok(rules.some((rule) => rule.startsWith(".z-toast ") && rule.includes("200")));
  assert.ok(rules.some((rule) => rule.includes("slide-in-from-left-1\\/2") && rule.includes("-100%")));
  assert.ok(rules.some((rule) => rule.includes("slide-in-from-top-\\[48\\%\\]") && rule.includes("48%")));
  assert.ok(rules.some((rule) => rule.startsWith(".surface-header-link ") && rule.includes("--header-control-bg")));
  assert.match(css, /@keyframes enter/);
  assert.match(css, /@keyframes exit/);
  assert.match(css, /--tw-enter-translate-x, var\(--tw-translate-x/);
  assert.match(css, /--font-jetbrains-mono/);
  assert.match(css, /\.sakura/);
  assert.match(css, /\.amber/);
  assert.match(css, /\.dark/);
});

test("deployment observability is sampled without introducing new storage bindings", () => {
  const config = JSON.parse(read("wrangler.example.json"));
  assert.equal(config.compatibility_date, "2026-09-23");
  assert.equal(config.observability.enabled, true);
  assert.equal(config.observability.head_sampling_rate, 0.1);
  assert.deepEqual(config.d1_databases.map((binding: { binding: string }) => binding.binding), ["DB"]);
  assert.deepEqual(config.kv_namespaces.map((binding: { binding: string }) => binding.binding), ["SITE_CONFIG"]);
  assert.equal(config.r2_buckets, undefined);
});
