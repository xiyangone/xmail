import assert from "node:assert/strict";

import {
  calculateExpiryTime,
  EXPIRY_OPTIONS,
  isValidExpiryTime,
} from "../../app/types/email";

async function testSevenDayPresetExists() {
  assert.ok(
    EXPIRY_OPTIONS.some(
      (option) =>
        option.label === "expiry.7days" &&
        option.value === 1000 * 60 * 60 * 24 * 7
    )
  );
}

async function testCustomExpiryTimeCalculation() {
  assert.equal(calculateExpiryTime("minutes", 15), 1000 * 60 * 15);
  assert.equal(calculateExpiryTime("hours", 2), 1000 * 60 * 60 * 2);
  assert.equal(calculateExpiryTime("days", 7), 1000 * 60 * 60 * 24 * 7);
}

async function testExpiryValidationAllowsCustomPositiveValues() {
  assert.equal(isValidExpiryTime(1000 * 60 * 45), true);
  assert.equal(isValidExpiryTime(0), true);
  assert.equal(isValidExpiryTime(1000), false);
  assert.equal(isValidExpiryTime(-1), false);
  assert.equal(isValidExpiryTime(Number.NaN), false);
}

async function run() {
  await testSevenDayPresetExists();
  await testCustomExpiryTimeCalculation();
  await testExpiryValidationAllowsCustomPositiveValues();
  console.log("email-expiry tests: OK");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
