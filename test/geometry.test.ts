import assert from "node:assert/strict";
import test from "node:test";
import { pointInGeometry } from "../src/lib/geometry.js";
import type { SupportedGeometry } from "../src/types.js";

const square: SupportedGeometry = {
  type: "Polygon",
  coordinates: [
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
  ],
};

test("pointInGeometry returns true for points inside polygon", () => {
  assert.equal(pointInGeometry(5, 5, square), true);
  assert.equal(pointInGeometry(0, 0, square), true);
});

test("pointInGeometry returns false for points outside polygon", () => {
  assert.equal(pointInGeometry(11, 5, square), false);
  assert.equal(pointInGeometry(-1, -1, square), false);
});
