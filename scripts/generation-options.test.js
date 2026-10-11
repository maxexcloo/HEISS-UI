import assert from "node:assert/strict";
import test from "node:test";
import { generationPlan, outputProfile, profileImageCount } from "../src/app/generationOptions.js";

test("settings reuse restores the saved workflow when multiple workflows share a model", () => {
  const profiles = [
    { id: "builtin", kind: "image", model: "klein.safetensors", workflow: "family:klein" },
    { id: "custom:reference", kind: "image", model: "klein.safetensors", workflow: "custom:reference" }
  ];
  assert.equal(outputProfile(profiles, { type: "image", model: "klein.safetensors", settings: { profileId: "custom:reference" } }).id, "custom:reference");
  assert.equal(outputProfile(profiles, { type: "image", model: "klein.safetensors", settings: { workflow: "custom:reference" } }).id, "custom:reference");
  assert.equal(outputProfile(profiles, { type: "image", model: "klein.safetensors" }).id, "builtin");
  assert.equal(outputProfile(profiles, { type: "video", model: "klein.safetensors" }), undefined);
});

test("custom image count falls back to its declared constraint on older catalogues", () => {
  const profile = { kind: "image", defaults: {}, constraints: { count: { default: 4 } } };
  assert.equal(profileImageCount(profile, 1), 4);
  assert.equal(profileImageCount({ ...profile, defaults: { count: 2 } }, 1), 2);
  assert.equal(profileImageCount({ ...profile, capabilities: { variations: false } }, 4), 1);
  assert.equal(profileImageCount({ ...profile, kind: "video" }, 4), 1);
});

test("four reference variants become four single-image requests even in batch mode", () => {
  assert.deepEqual(generationPlan({ count: 4, kind: "image", references: [{ assetId: "reference" }], queueMode: "batch" }), { effectiveCount: 4, separate: true, imageRuns: 4, requestCount: 1 });
  assert.deepEqual(generationPlan({ count: 4, kind: "image", queueMode: "batch" }), { effectiveCount: 4, separate: false, imageRuns: 1, requestCount: 4 });
  assert.equal(generationPlan({ count: 4, kind: "image", queueMode: "separate" }).imageRuns, 4);
  assert.equal(generationPlan({ count: 4, kind: "video", references: [{}], queueMode: "separate" }).requestCount, 1);
  assert.equal(generationPlan({ count: 4, kind: "image", profile: { capabilities: { variations: false } }, references: [{}] }).imageRuns, 1);
});
