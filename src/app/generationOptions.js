/** Restore the workflow that made an output before considering its model file. */
export function outputProfile(profiles = [], item = {}) {
  const candidates = profiles.filter((profile) => profile.kind === item.type);
  const settings = item.settings || {};
  return candidates.find((profile) => profile.id === settings.profileId)
    || candidates.find((profile) => profile.workflow === settings.workflow)
    || candidates.find((profile) => profile.model === item.model);
}

export function profileImageCount(profile, fallback) {
  if (profile.kind === "video" || profile.capabilities?.variations === false) return 1;
  const meta = profile.constraints?.count || {};
  const count = Number(profile.defaults?.count || meta.default || fallback);
  return Math.max(Number(meta.min) || 1, Math.min(Number(meta.max) || 8, count));
}

/** Reference latents multiply memory use: queue each variant separately. */
export function generationPlan({ count = 1, kind, profile, references = [], queueMode }) {
  const effectiveCount = kind === "video" || profile?.capabilities?.variations === false ? 1 : Math.max(1, Math.min(8, Math.round(Number(count) || 1)));
  const separate = kind === "image" && (queueMode === "separate" || references.length > 0);
  return { effectiveCount, separate, imageRuns: separate ? effectiveCount : 1, requestCount: separate ? 1 : effectiveCount };
}

/** Prefer a catalogue-supported portrait size for built-in image models. */
export function profileImageSize(profile, kind = profile?.kind || "image") {
  const defaults = profile?.defaults || {};
  if (kind === "image" && profile?.workflow?.startsWith("family:")) {
    const ranges = profile.constraints || {};
    const supported = (value, meta = {}) => value > 0
      && value >= (meta.min || 1) && value <= (meta.max || Infinity)
      && value % (meta.step || 1) === 0;
    const aspect = ["3:4", "1:1"].map((label) => profile.aspectPresets?.find((item) => item.label === label
      && supported(item.w, ranges.width) && supported(item.h, ranges.height))).find(Boolean);
    if (aspect) return { width: aspect.w, height: aspect.h };
  }
  return { width: Number(defaults.width || (kind === "video" ? 512 : 1024)), height: Number(defaults.height || (kind === "video" ? 288 : 1024)) };
}
