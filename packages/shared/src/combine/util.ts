/** Arithmetic mean of a non-empty number array. */
export function mean(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("mean() requires at least one value");
  let sum = 0;
  for (const x of xs) sum += x;
  return sum / xs.length;
}

/** max − min across a non-empty number array. */
export function range(xs: readonly number[]): number {
  if (xs.length === 0) throw new Error("range() requires at least one value");
  let min = xs[0]!;
  let max = xs[0]!;
  for (const x of xs) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  return max - min;
}
