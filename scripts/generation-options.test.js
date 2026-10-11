import assert from "node:assert/strict";
import test from "node:test";
import { generationPlan, outputProfile, profileImageCount, profileImageSize } from "../src/app/generationOptions.js";

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

test("built-in image selection prefers a supported portrait size, then square", () => {
  const profile = {
    kind: "image", workflow: "family:flux1", defaults: { width: 1024, height: 1024 },
    aspectPresets: [{ label: "1:1", w: 1024, h: 1024 }, { label: "3:4", w: 880, h: 1184 }],
    constraints: { width: { min: 64, max: 8192, step: 16 }, height: { min: 64, max: 8192, step: 16 } }
  };
  assert.deepEqual(profileImageSize(profile), { width: 880, height: 1184 });
  assert.deepEqual(profileImageSize({ ...profile, constraints: { ...profile.constraints, height: { max: 1024, step: 16 } } }), { width: 1024, height: 1024 });
  assert.deepEqual(profileImageSize({ ...profile, aspectPresets: [{ label: "3:4", w: 881, h: 1184 }] }), { width: 1024, height: 1024 });
  assert.deepEqual(profileImageSize({ ...profile, aspectPolicy: "reference" }), { width: 880, height: 1184 }, "reference framing is applied separately when a reference is attached");
  assert.deepEqual(profileImageSize({ ...profile, workflow: "custom:portrait", defaults: { width: 768, height: 1280 } }), { width: 768, height: 1280 });
  assert.deepEqual(profileImageSize({ ...profile, kind: "video", defaults: { width: 832, height: 480 } }), { width: 832, height: 480 });
});

test("image selection stays within model count limits", () => {
  assert.equal(profileImageCount({ kind: "image", defaults: { count: 4 }, constraints: { count: { min: 1, max: 2 } } }, 4), 2);
  assert.equal(profileImageCount({ kind: "image", defaults: {}, constraints: { count: { default: 4, max: 8 } } }, 1), 4);
});
