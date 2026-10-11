import assert from "node:assert/strict";
import test from "node:test";
import { graphModels, readModelActivity } from "./model-activity.js";

const graph = {
  checkpoint: { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "/private/models/base.safetensors" } },
  model: { class_type: "UnetLoaderGGUF", inputs: { unet_name: "C:\\models\\flux.gguf" } },
  duplicate: { class_type: "UNETLoader", inputs: { unet_name: "flux.gguf" } },
  text: { class_type: "CLIPTextEncode", inputs: { text: "private prompt", unet_name: "not-a-model" } },
  reference: { class_type: "LoadImage", inputs: { image: "/private/references/person.png" } },
  linked: { class_type: "UNETLoader", inputs: { unet_name: ["other", 0] } }
};
const models = ["base.safetensors", "flux.gguf"];
const entry = (id, nodes = graph) => [0, id, nodes, { private: "metadata" }, []];
const history = { secretId: { prompt: entry("secretId"), status: { status_str: "success" }, outputs: { private: "output" } } };
function requestWith(queue, past = history) {
  return async (pathname, options) => {
    assert.equal(options.timeout, 1500);
    assert.ok(["/queue", "/history?max_items=1"].includes(pathname));
    return pathname === "/queue" ? queue : past;
  };
}

test("only model loader basenames leave an execution graph", () => {
  assert.deepEqual(graphModels(graph), models);
  assert.deepEqual(graphModels(null), []);
  assert.deepEqual(graphModels({ invalid: { class_type: "__proto__", inputs: { ckpt_name: "private" } } }), []);
});

test("running graphs take precedence over history without prompt or path leakage", async () => {
  const activity = await readModelActivity(requestWith({ queue_running: [entry("runningId")], queue_pending: [] }));
  assert.deepEqual(activity, { models, state: "generating" });
  assert.doesNotMatch(JSON.stringify(activity), /private|secretId|runningId|references|C:|metadata|output/);
});

test("idle and queued work show the last successful model, not a pending model", async () => {
  const activity = await readModelActivity(requestWith({ queue_running: [], queue_pending: [entry("pending", { new: { class_type: "UNETLoader", inputs: { unet_name: "pending.safetensors" } } })] }));
  assert.deepEqual(activity, { models, state: "last-used" });
});

test("no history, failed history, unavailable queue and unknown active loaders have no model signal", async () => {
  assert.equal(await readModelActivity(requestWith({ queue_running: [] }, {})), null);
  assert.equal(await readModelActivity(requestWith({ queue_running: [] }, { failed: { prompt: entry("failed"), status: { status_str: "error" } } })), null);
  assert.equal(await readModelActivity(requestWith({ queue_running: [entry("unknown", {})] })), null);
  assert.equal(await readModelActivity(async () => { throw new Error("offline"); }), null);
  assert.equal(await readModelActivity(async (pathname) => pathname === "/queue" ? Promise.reject(new Error("unavailable")) : history), null);
});

test("backend activity reads remain independent", async () => {
  const primary = requestWith({ queue_running: [entry("primary", { loader: { class_type: "UNETLoader", inputs: { unet_name: "image.safetensors" } } })] });
  const video = requestWith({ queue_running: [] }, { video: { prompt: entry("video", { loader: { class_type: "UNETLoader", inputs: { unet_name: "video.safetensors" } } }), status: { status_str: "success" } } });
  assert.deepEqual(await Promise.all([readModelActivity(primary), readModelActivity(video)]), [
    { models: ["image.safetensors"], state: "generating" },
    { models: ["video.safetensors"], state: "last-used" }
  ]);
});
