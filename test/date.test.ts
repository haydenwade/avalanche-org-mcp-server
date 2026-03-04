import assert from "node:assert/strict";
import test from "node:test";
import { assertValidDay, isValidDay } from "../src/lib/validation.js";

test("isValidDay accepts valid YYYY-MM-DD", () => {
  assert.equal(isValidDay("2026-02-24"), true);
  assert.equal(assertValidDay("2026-02-24"), "2026-02-24");
});

test("isValidDay rejects invalid calendar dates and formats", () => {
  assert.equal(isValidDay("2026-02-30"), false);
  assert.equal(isValidDay("2026/02/24"), false);
  assert.equal(isValidDay("2026-2-24"), false);
  assert.throws(() => assertValidDay("2026-02-30"), /YYYY-MM-DD/);
});
