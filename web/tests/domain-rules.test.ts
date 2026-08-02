import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeEntryExitBlocks,
  compareBlockDifference,
} from "../app/data/pulse-entry-exit-rules";
import {
  getOrganClockEntry,
  getOrganClockEntryAt,
  getOrganClockEntryAtTime,
  getOrganClockGuidance,
} from "../app/data/organ-clock-rules";
import { getBreathingProtocol } from "../app/data/breathing-protocols";

test("Entry-Exit returns only positive differences and orders them by strength", () => {
  const results = analyzeEntryExitBlocks({ SI: -2, BL: 2, LV: -1, LU: 1, LI: 1, ST: 0 });

  assert.deepEqual(results.map(({ id, difference }) => ({ id, difference })), [
    { id: "SI_TO_BL", difference: 4 },
    { id: "LV_TO_LU", difference: 2 },
  ]);
});

test("Entry-Exit classifies boundary differences and supports app aliases", () => {
  const possible = analyzeEntryExitBlocks({ SP: 0, HE: 1 })[0];
  const clear = analyzeEntryExitBlocks({ KID: -1, PC: 1 })[0];
  const veryStrong = analyzeEntryExitBlocks({ SJ: -2, GB: 1 })[0];

  assert.equal(possible.suspicion, "POSSIBLE_BLOCK");
  assert.equal(clear.suspicion, "CLEAR_BLOCK_SUSPICION");
  assert.equal(veryStrong.suspicion, "VERY_STRONG_BLOCK_SUSPICION");
});

test("Entry-Exit skips a transition when either measurement is missing", () => {
  assert.deepEqual(analyzeEntryExitBlocks({ SI: -2 }), []);
  assert.deepEqual(analyzeEntryExitBlocks({ BL: 2 }), []);
});

test("block comparison covers every trend", () => {
  assert.equal(compareBlockDifference(2, 0), "PATTERN_ABSENT");
  assert.equal(compareBlockDifference(3, 2), "PATTERN_WEAKER");
  assert.equal(compareBlockDifference(2, 2), "PATTERN_UNCHANGED");
  assert.equal(compareBlockDifference(1, 2), "PATTERN_STRONGER");
  assert.equal(compareBlockDifference(0, 1), "NEW_PATTERN");
  assert.equal(compareBlockDifference(0, 0), "NO_PATTERN");
});

test("organ clock handles two-hour windows including midnight", () => {
  assert.equal(getOrganClockEntryAtTime("23:30")?.meridian, "GB");
  assert.equal(getOrganClockEntryAtTime("00:30")?.meridian, "GB");
  assert.equal(getOrganClockEntryAtTime("01:00")?.meridian, "LV");
  assert.equal(getOrganClockEntryAtTime("22:59")?.meridian, "SJ");
  assert.equal(getOrganClockEntryAt(new Date(2026, 7, 2, 15, 59))?.meridian, "BL");
  assert.equal(getOrganClockEntryAtTime("24:00"), undefined);
});

test("organ clock resolves UI aliases and creates context-specific guidance", () => {
  const heart = getOrganClockEntry("HE");
  assert.equal(heart?.meridian, "HT");
  assert.match(getOrganClockGuidance(heart, "sleep"), /^Zasypianie/);
  assert.match(getOrganClockGuidance(heart, "wake"), /^Pobudka/);
  assert.equal(getOrganClockGuidance(undefined, "wake"), "");
});

test("breathing protocol lookup returns known entries only", () => {
  assert.equal(getBreathingProtocol("calm-5-5")?.status, "approved_general");
  assert.equal(getBreathingProtocol("missing"), undefined);
});
