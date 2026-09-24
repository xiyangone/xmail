import assert from "node:assert/strict";
import test from "node:test";
import { createRequestController, isAbortError } from "../../app/lib/request-control";

test("a newer request aborts and invalidates the previous one", () => {
  const requests = createRequestController();
  const first = requests.start();
  const second = requests.start();
  assert.equal(first.signal.aborted, true);
  assert.equal(first.isCurrent(), false);
  assert.equal(first.finish(), false);
  assert.equal(requests.pending, true);
  assert.equal(second.isCurrent(), true);
  assert.equal(second.finish(), true);
  assert.equal(requests.pending, false);
  assert.equal(second.finish(), false);
});

test("late responses are ignored even when the transport ignores abort", async () => {
  const requests = createRequestController();
  let resolveOld!: (value: string) => void;
  const oldResponse = new Promise<string>((resolve) => { resolveOld = resolve; });
  let displayed = "";
  const old = requests.start();
  const oldWork = oldResponse.then((value) => {
    if (old.isCurrent()) displayed = value;
    old.finish();
  });
  const current = requests.start();
  if (current.isCurrent()) displayed = "new mailbox";
  current.finish();
  resolveOld("old mailbox");
  await oldWork;
  assert.equal(displayed, "new mailbox");
});

test("cleanup invalidates state writes, errors, and polling from settled work", () => {
  const requests = createRequestController();
  const request = requests.start();
  request.finish();
  assert.equal(request.isCurrent(), true);
  requests.cancel();
  assert.equal(request.isCurrent(), false);
  assert.equal(requests.pending, false);
  requests.cancel();
  assert.equal(requests.start().isCurrent(), true);
});

test("component instances cannot cancel each other's work", () => {
  const first = createRequestController();
  const second = createRequestController();
  const a = first.start();
  const b = second.start();
  first.cancel();
  assert.equal(a.signal.aborted, true);
  assert.equal(b.signal.aborted, false);
  assert.equal(b.isCurrent(), true);
  assert.equal(isAbortError(new DOMException("Cancelled", "AbortError")), true);
  assert.equal(isAbortError(new Error("Network error")), false);
  assert.equal(isAbortError(null), false);
});
