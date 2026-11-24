import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCompletionTime } from "../src/completion-time.mjs";

test("obscured or malformed seconds do not produce a kill time", () => {
  for (const time of ["00:1", "00:1    ", "00:1.6", "00:123"]) {
    assert.equal(parseCompletionTime(`[07:12:53] Completion time: ${time}`), null, time);
  }
});

test("complete seconds are accepted with or without tenths", () => {
  assert.equal(parseCompletionTime("Completion time: 00:01.0"), 10);
  assert.equal(parseCompletionTime("Completion time: 00:01"), 10);
  assert.equal(parseCompletionTime("Completion time: 00:18.6"), 186);
  assert.equal(parseCompletionTime("Completion time: 1:07.8"), 678);
});
