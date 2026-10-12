/** Split a model's readable name from precision and workflow details. */
export function modelName(profile) {
  const raw = String(profile?.displayName || profile?.label || 'No Model');
  const [lead, ...details] = raw.split(/\s*·\s*/);
  const precision = [];
  const name = lead.replace(/\[(FP\d+|BF\d+|INT\d+[^\]]*|W\d+A\d+)\]/gi, (_, value) => { precision.push(value); return ''; }).replace(/\s+/g, ' ').trim();
  return { name: name || lead, detail: [...precision, ...details].join(' · ') || profile?.familyName || profile?.family || '' };
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
