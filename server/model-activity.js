// ComfyUI exposes execution graphs, not the filenames retained in its GPU cache.
// Return only model loader filenames; prompts, paths and reference inputs stay here.
const loaderInputs = {
  CheckpointLoader: "ckpt_name",
  CheckpointLoaderSimple: "ckpt_name",
  SanaCheckpointLoader: "ckpt_name",
  SanaModelLoader: "model",
  UNETLoader: "unet_name",
  UnetLoaderGGUF: "unet_name"
};

export function graphModels(graph) {
  if (!graph || typeof graph !== "object" || Array.isArray(graph)) return [];
  const names = Object.values(graph).flatMap((node) => {
    const input = Object.hasOwn(loaderInputs, node?.class_type || "") ? loaderInputs[node.class_type] : null;
    const filename = input && node?.inputs?.[input];
    if (typeof filename !== "string") return [];
    const basename = filename.replaceAll("\\", "/").split("/").at(-1)?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
    return basename && basename !== "." && basename !== ".." ? [basename.slice(0, 200)] : [];
  });
  return [...new Set(names)].sort();
}

export async function readModelActivity(request) {
  const [queue, history] = await Promise.all([
    request("/queue", { timeout: 1500 }).catch(() => null),
    request("/history?max_items=1", { timeout: 1500 }).catch(() => null)
  ]);
  // A failed queue read cannot establish that an old result is still idle.
  if (!queue || !Array.isArray(queue.queue_running)) return null;
  if (queue.queue_running.length) {
    const models = [...new Set(queue.queue_running.flatMap((entry) => graphModels(entry?.[2])))].sort();
    return models.length ? { models, state: "generating" } : null;
  }
  const latest = Object.values(history || {}).at(-1);
  if (latest?.status?.status_str !== "success") return null;
  const models = graphModels(latest.prompt?.[2]);
  return models.length ? { models, state: "last-used" } : null;
}
