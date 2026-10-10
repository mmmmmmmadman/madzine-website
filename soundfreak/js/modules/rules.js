// The single place where the cable connection rule lives.
// Real hardware: banana only mates with banana, Tini-Jax only with Tini-Jax.
// Relax here later if desired.

export function canConnect(jackA, jackB) {
  if (!jackA || !jackB) return false;
  if (jackA.dir === jackB.dir) return false;
  if (jackA.kind !== jackB.kind) return false;
  return true;
}

// Normalise an (a, b) pair into {from: output, to: input}.
export function orient(a, b) {
  return a.dir === 'out' ? { from: a, to: b } : { from: b, to: a };
}
