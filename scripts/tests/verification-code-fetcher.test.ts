import assert from "node:assert/strict";

import { getVerificationCode } from "../../app/lib/verification-code-fetcher";

function withMockedFetch<T>(
  mock: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  fn: () => Promise<T>
) {
  const original = globalThis.fetch;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).fetch = mock;
  return fn().finally(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).fetch = original;
  });
}

async function testBaseUrlRequiredOnServer() {
  await withMockedFetch(async () => {
    throw new Error("fetch should not be called");
  }, async () => {
    const originalConsoleError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.error = () => {};
    await assert.rejects(
      () =>
        getVerificationCode({
          emailId: "test-email",
          verificationCodeInterval: 0,
          verificationCodeTimeout: 10,
        }),
      /baseUrl is required/i
    );
    console.error = originalConsoleError;
  });
}

async function testFetchUsesBaseUrlAndApiKey() {
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  await withMockedFetch(async (input, init) => {
    calls.push({ url: String(input), init });
    return new Response(
      JSON.stringify({
        messages: [
          {
            id: "m1",
            from_address: "verify@example.com",
            subject: "Your verification code is: 672246",
            content: "",
            html: "",
            received_at: Date.now(),
          },
        ],
        nextCursor: null,
        total: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }, async () => {
    const code = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      apiKey: "k_test",
      verificationCodeInterval: 0,
      verificationCodeTimeout: 1000,
    });

    assert.equal(code, "672246");
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://example.com/api/emails/abc");
  assert.equal(
    (calls[0].init?.headers as Record<string, string> | undefined)?.["X-API-Key"],
    "k_test"
  );
}

async function testTimeoutReturnsNull() {
  await withMockedFetch(async () => {
    return new Response(
      JSON.stringify({ messages: [], nextCursor: null, total: 0 }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }, async () => {
    const code = await getVerificationCode({
      emailId: "abc",
      baseUrl: "https://example.com",
      verificationCodeInterval: 1,
      verificationCodeTimeout: 10,
    });

    assert.equal(code, null);
  });
}

async function run() {
  await testBaseUrlRequiredOnServer();
  await testFetchUsesBaseUrlAndApiKey();
  await testTimeoutReturnsNull();
  console.log("verification-code-fetcher tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
