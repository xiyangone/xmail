import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createConfigStore } from "../../app/hooks/use-config";

const payload = { emailDomains: "b.example.net, example.cn, a.example.net", maxEmails: "12", messagePollInterval: "15000" };

test("config callers share a single request and reuse its successful result", async () => {
  let calls = 0;
  let respond!: (response: Response) => void;
  const store = createConfigStore(async () => {
    calls += 1;
    return new Promise<Response>((resolve) => { respond = resolve; });
  });
  const first = store.getState().fetch();
  const second = store.getState().fetch();
  assert.equal(first, second);
  assert.equal(store.getState().loading, true);
  await Promise.resolve();
  assert.equal(calls, 1);
  respond(Response.json(payload));
  await first;
  assert.deepEqual(store.getState().config?.emailDomainsArray, ["example.cn", "a.example.net", "b.example.net"]);
  assert.equal(store.getState().config?.maxEmails, 12);
  assert.equal(store.getState().fetchPromise, null);
  assert.equal(store.getState().loading, false);
  await store.getState().fetch();
  assert.equal(calls, 1);
});

test("an HTTP error is stable until an explicit retry succeeds", async () => {
  let calls = 0;
  const store = createConfigStore(async () => ++calls === 1
    ? new Response("unavailable", { status: 503 })
    : Response.json(payload));
  await store.getState().fetch();
  assert.equal(store.getState().config, null);
  assert.ok(store.getState().error);
  assert.equal(store.getState().loading, false);
  assert.equal(store.getState().fetchPromise, null);
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(calls, 1);
  await store.getState().fetch();
  assert.equal(calls, 2);
  assert.equal(store.getState().error, null);
  assert.ok(store.getState().config);
});

test("synchronous transport failure cannot leave a resolved in-flight promise behind", async () => {
  let fail = true;
  const store = createConfigStore(() => {
    if (fail) throw new Error("transport failed before returning a promise");
    return Promise.resolve(Response.json(payload));
  });
  await store.getState().fetch();
  assert.equal(store.getState().fetchPromise, null);
  assert.match(store.getState().error ?? "", /transport failed/);
  fail = false;
  await store.getState().fetch();
  assert.ok(store.getState().config);
});

test("the hook does not automatically retry a failed request on the next render", () => {
  const source = readFileSync("app/hooks/use-config.ts", "utf8");
  assert.match(source, /if \(!config && !loading && !error\)/);
  assert.match(source, /\[config, loading, error, fetchConfig\]/);
});
