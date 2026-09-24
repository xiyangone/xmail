import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { NavigationLink } from "../../app/components/layout/navigation-link";

test("navigation retains native anchor behavior and reserves space for its pending hint", () => {
  const html = renderToStaticMarkup(createElement(NavigationLink, {
    href: "/mailbox", target: "_blank", rel: "noreferrer",
  }, "Mailbox"));
  assert.match(html, /href="\/mailbox"/);
  assert.match(html, /target="_blank"/);
  assert.match(html, /rel="noreferrer"/);
  assert.match(html, /absolute right-1 top-1 h-3 w-3/);
  assert.doesNotMatch(html, /<button/);
});

test("entry points use prefetch-capable links and a route loading boundary", () => {
  for (const file of ["app/components/auth/sign-button.tsx", "app/components/home/action-button.tsx", "app/components/profile/profile-card.tsx", "app/components/admin/admin-dashboard.tsx"]) {
    const source = readFileSync(file, "utf8");
    assert.match(source, /NavigationLink/);
    assert.doesNotMatch(source, /router\.push/);
  }
  assert.match(readFileSync("app/(main)/loading.tsx", "utf8"), /role="status"/);
  assert.match(readFileSync("app/layout.tsx", "utf8"), /const \[locale, messages, session\] = await Promise\.all/);
});

test("successful sign-ins refresh the server session without a full page reload", () => {
  const source = readFileSync("app/components/auth/login-form.tsx", "utf8");
  assert.equal(source.match(/completeSignIn\(\);/g)?.length, 3);
  assert.match(source, /router\.replace\("\/"\);\s*router\.refresh\(\)/);
  assert.doesNotMatch(source, /window\.location\.href\s*=/);
});

test("transitions respect reduced motion and do not retain the animation runtime", () => {
  const source = readFileSync("app/components/layout/page-transition.tsx", "utf8");
  const css = readFileSync("app/globals.css", "utf8");
  assert.doesNotMatch(source, /framer-motion|AnimatePresence/);
  assert.match(css, /prefers-reduced-motion: reduce\)\s*\{\s*\.page-enter\s*\{\s*animation: none/);
});

test("every mailbox read owns its request signal and invalidates work on cleanup", () => {
  for (const name of ["email-list", "message-list", "message-view"]) {
    const source = readFileSync(`app/components/emails/${name}.tsx`, "utf8");
    assert.match(source, /signal: request\.signal/);
    assert.match(source, /request\.isCurrent\(\)/);
    assert.match(source, /requests\.cancel\(\)/);
    assert.match(source, /request\.finish\(\)/);
  }
  const messages = readFileSync("app/components/emails/message-list.tsx", "utf8");
  assert.match(messages, /cursor: nextCursor, silentOnError: false, scheduleNext: true/);
  assert.doesNotMatch(messages, /fetchMessages\([^;]*\)\.finally\(/);
});
