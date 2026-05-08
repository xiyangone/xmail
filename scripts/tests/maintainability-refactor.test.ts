import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function read(path: string) {
  return readFileSync(path, "utf8");
}

function listFiles(dir: string, suffixes: string[]): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return listFiles(path, suffixes);
    return suffixes.some((suffix) => path.endsWith(suffix)) ? [path] : [];
  });
}

function assertNoExcessiveBlankRuns(file: string) {
  const source = read(file);
  assert.equal(
    /\n\s*\n\s*\n\s*\n/.test(source),
    false,
    `${file} should not contain 4+ consecutive blank lines`
  );
}

function assertBannedCommentAbsent(file: string, pattern: RegExp) {
  const source = read(file);
  pattern.lastIndex = 0;
  assert.equal(pattern.test(source), false, `${file} contains a low-value or stale comment: ${pattern}`);
}

// Check excessive blank lines in large files
assertNoExcessiveBlankRuns("app/lib/auth.ts");
assertNoExcessiveBlankRuns("app/lib/schema.ts");
assertNoExcessiveBlankRuns("middleware.ts");

// Check duplicate readJsonError copies
const sourceFiles = listFiles("app", [".ts", ".tsx"]);
const readJsonErrorCopies = sourceFiles.filter((file) => read(file).includes("function readJsonError"));
assert.ok(
  readJsonErrorCopies.length <= 1,
  `readJsonError should be shared or reduced to one copy; found ${readJsonErrorCopies.join(", ")}`
);

// Check banned low-value comments
for (const file of sourceFiles) {
  assertBannedCommentAbsent(file, /\/\/\s*(验证输入|检查权限)(\s|$|[-:：])/);
}

console.log("maintainability refactor guardrails: OK");
