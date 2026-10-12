// Prompts and private reference assets belong to their space, never to these
// persistent image/video settings.
const settingKeys = [
  'model', 'textEncoder', 'textEncoders', 'vae', 'clipType', 'weightDtype',
  'width', 'height', 'steps', 'cfg', 'denoise', 'inpaintStrength',
  'inpaintFeather', 'seed', 'count', 'frames', 'fps', 'duration', 'resolution', 'sampler', 'scheduler',
  'loras', 'customSize'
];

export function composerSettings(value = {}) {
  return Object.fromEntries(settingKeys.filter((key) => value[key] !== undefined).map((key) => [key, value[key]]));
}

export function modeSettings(draft = {}) {
  const saved = draft.modeSettings || {};
  const settings = Object.fromEntries(['image', 'video'].filter((mode) => saved[mode]).map((mode) => [mode, composerSettings(saved[mode])]));
  const active = draft.mode === 'video' ? 'video' : 'image';
  settings[active] = { ...settings[active], ...composerSettings(draft) };
  return settings;
}

export function modePrompts(draft = {}) {
  const prompts = Object.fromEntries(['image', 'video'].map((mode) => [mode, {
    prompt: String(draft.modePrompts?.[mode]?.prompt || ''),
    negative: String(draft.modePrompts?.[mode]?.negative || '')
  }]));
  const active = draft.mode === 'video' ? 'video' : 'image';
  prompts[active] = { prompt: String(draft.prompt || ''), negative: String(draft.negative || '') };
  return prompts;
}

export function reusedNegative(value, current) {
  return String(value || '').trim() ? String(value) : current;
}

export function canRestoreLoras(requestRevision, currentRevision, found) {
  return Boolean(found) && requestRevision === currentRevision;
}
