// ESM loader that swaps src/supabase.js for the stub so real modules can be
// imported under Node. Run: node --loader ./tests/loader.mjs tests/content-harness.mjs
export function resolve(specifier, context, next) {
  if (specifier.endsWith('supabase.js') && context.parentURL?.includes('/src/')) {
    return { shortCircuit: true, url: new URL('./stubs/supabase.js', import.meta.url).href };
  }
  return next(specifier, context);
}
