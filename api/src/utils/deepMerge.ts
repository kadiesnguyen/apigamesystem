function deepMerge(base: any, patch: any) {
  if (Array.isArray(base) || Array.isArray(patch)) return patch ?? base;
  if (base && typeof base === 'object' && patch && typeof patch === 'object') {
    const out: any = { ...base };
    for (const k of Object.keys(patch)) out[k] = k in out ? deepMerge(out[k], patch[k]) : patch[k];
    return out;
  }
  return patch ?? base;
}

export default deepMerge;