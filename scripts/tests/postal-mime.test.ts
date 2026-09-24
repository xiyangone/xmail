import assert from "node:assert/strict";
import test from "node:test";
import PostalMime, { addressParser } from "postal-mime";

test("MIME v3 decodes UTF-8 headers and keeps both alternative bodies", async () => {
  const source = [
    "From: =?UTF-8?B?5rWL6K+V?= <sender@example.test>",
    "To: Inbox <inbox@example.test>",
    "Subject: =?UTF-8?B?6aqM6K+B56CB?=",
    "Message-ID: <migration-test@example.test>",
    'Content-Type: multipart/alternative; boundary="mail-boundary"',
    "", "--mail-boundary", 'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: quoted-printable", "", "Code: 123456",
    "--mail-boundary", 'Content-Type: text/html; charset="UTF-8"', "", "<p>Code: <b>123456</b></p>",
    "--mail-boundary--", "",
  ].join("\r\n");
  const email = await PostalMime.parse(source);
  assert.equal(email.subject, "验证码");
  assert.equal(email.messageId, "<migration-test@example.test>");
  assert.ok(email.from && "address" in email.from);
  assert.equal(email.from.address, "sender@example.test");
  assert.equal(email.from.name, "测试");
  assert.match(email.text ?? "", /123456/);
  assert.match(email.html ?? "", /<b>123456<\/b>/);
});

test("sender groups remain distinguishable from an individual mailbox", () => {
  const group = addressParser("Team: Alice <alice@example.test>, Bob <bob@example.test>;")[0];
  assert.ok(group && "group" in group);
  assert.equal(group.name, "Team");
  assert.ok(group.group);
  assert.deepEqual(group.group.map((member) => member.address), ["alice@example.test", "bob@example.test"]);
});

test("missing headers and explicit attachment encoding have predictable results", async () => {
  const plain = await PostalMime.parse("Content-Type: text/plain; charset=utf-8\r\n\r\nhello");
  assert.equal(plain.from, undefined);
  assert.equal(plain.html, undefined);
  assert.match(plain.text ?? "", /hello/);
  const email = await PostalMime.parse([
    'Content-Type: multipart/mixed; boundary="attachment"', "", "--attachment",
    "Content-Type: text/plain", "", "body", "--attachment", "Content-Type: application/octet-stream",
    'Content-Disposition: attachment; filename="example.txt"', "Content-Transfer-Encoding: base64", "", "aGVsbG8=",
    "--attachment--", "",
  ].join("\r\n"), { attachmentEncoding: "base64" });
  assert.equal(email.attachments.length, 1);
  assert.equal(email.attachments[0].filename, "example.txt");
  assert.equal(email.attachments[0].content, "aGVsbG8=");
});
