/** Keep the model and action on the title, with settings on the second line. */
export function modelName(profile) {
  const raw = String(profile?.displayName || profile?.label || 'No Model');
  const [lead, ...details] = raw.split(/\s*·\s*/);
  const precision = [];
  let name = lead.replace(/\[(FP\d+|BF\d+|INT\d+[^\]]*|W\d+A\d+)\]/gi, (_, value) => { precision.push(value.replace(/\s+ConvRot/gi, '')); return ''; })
    .replace(/\[klein\]/gi, 'Klein').replace(/Qwen-Image/g, 'Qwen Image').replace(/\s+/g, ' ').trim();
  let action = details.find((detail) => /^(Generate|Edit|Reference|Non-Reference|Animate Image)$/i.test(detail));
  if (action === 'Reference') action = profile?.kind === 'video' ? 'Animate Image' : 'Edit';
  if (action === 'Non-Reference') action = 'Generate';
  if (!action && / Image Edit$/.test(name)) {
    name = name.replace(/ Edit$/, '');
    action = 'Edit';
  }
  if (!action && / Image To Video$/.test(name)) {
    name = name.replace(/Image To Video$/, 'Video');
    action = 'Animate Image';
  }
  if (/\s+KV\b/.test(name)) {
    name = name.replace(/\s+KV\b/, '');
    precision.push('KV Cache');
  }
  const settings = details.filter((detail) => !/^(Generate|Edit|Reference|Non-Reference|Animate Image|Standard|Default|Distilled)$/i.test(detail))
    .flatMap((detail) => detail.replace(/\s*\(≈([\d.]+)\s*s\)/g, ' · ~$1 s').split(' · '));
  if (profile?.family !== 'grok' && profile?.defaults?.steps && !settings.some((detail) => /\bSteps\b/i.test(detail))) settings.push(`${profile.defaults.steps} Steps`);
  if (!action && profile?.kind) action = 'Generate';
  return { name: `${name || lead}${action ? ` · ${action}` : ''}`, detail: [...precision, ...settings].join(' · ') || profile?.familyName || profile?.family || '' };
}

/** Metadata titles take precedence; the exact file name remains the identity. */
export function loraName(name, info) {
  const title = typeof info?.title === 'string' ? info.title.trim() : '';
  return title || String(name).split(/[\\/]/).pop().replace(/\.(safetensors|ckpt|pt|bin)$/i, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Keep files without compatibility metadata visible while excluding known mismatches. */
export function modelLoras(options, fitOf, all = false) {
  return all ? options : options.filter((name) => fitOf(name) !== 'other');
}

/** Compare explicit family identifiers, including hyphen/underscore aliases. */
export function loraCompatibility(info, profile) {
  const family = String(profile?.family || '').replace(/-/g, '_');
  if (!info?.families?.length || !family || family === 'custom') return 'unknown';
  return info.families.some((value) => value.replace(/-/g, '_') === family) ? 'fits' : 'other';
}
