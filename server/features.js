/** Deployment switches for optional studio features. */
// On by default; HEISS_ENABLE_INPAINT=0 turns it off.
export const inpaintingEnabled = process.env.HEISS_ENABLE_INPAINT !== '0';

export const grokEnabled = process.env.HEISS_ENABLE_GROK !== '0';
