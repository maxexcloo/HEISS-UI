/** Deployment switches for optional studio features. */
// On by default; HEISS_ENABLE_INPAINT=0 turns it off.
export const inpaintingEnabled = process.env.HEISS_ENABLE_INPAINT !== '0';

export const grokEnabled = process.env.HEISS_ENABLE_GROK !== '0';
export const lorasEnabled = process.env.HEISS_ENABLE_LORAS !== '0';

export function modelFamilyEnabled(family, model = '') {
  const kroma = family === 'kroma' || /(?:^|[\\/])kroma(?:[-_.]|$)/i.test(model);
  return (family !== 'grok' || grokEnabled) && (!kroma || process.env.HEISS_ENABLE_KROMA !== '0');
}
