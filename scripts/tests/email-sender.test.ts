import assert from "node:assert/strict";

import {
  buildResendEmailPayload,
  stripHtmlForEmailText,
} from "../../app/lib/email-sender";

async function testHtmlToTextFallback() {
  assert.equal(
    stripHtmlForEmailText("<p>Hello <strong>XiYang</strong></p><p>Line&nbsp;2</p>"),
    "Hello XiYang\nLine 2"
  );
}

async function testResendPayloadUsesDisplayFromReplyToAndText() {
  const payload = buildResendEmailPayload({
    fromEmail: "sand1993@xiyangone.cn",
    to: "user@example.com",
    subject: "Test",
    html: "<p>Hello</p>",
  });

  assert.deepEqual(payload, {
    from: "XiYang Mail <sand1993@xiyangone.cn>",
    to: ["user@example.com"],
    subject: "Test",
    html: "<p>Hello</p>",
    text: "Hello",
    reply_to: "sand1993@xiyangone.cn",
  });
}

async function run() {
  await testHtmlToTextFallback();
  await testResendPayloadUsesDisplayFromReplyToAndText();
  console.log("email-sender tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
