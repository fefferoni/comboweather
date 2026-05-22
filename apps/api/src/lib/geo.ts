/** Round lat/lon to 2 decimal places (~1.1 km). Used for cache key + upstream URL. */
export function roundCoord(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Build the `loc#<lat>#<lon>` partition key from already-rounded coords. */
export function locationKey(lat: number, lon: number): string {
  return `loc#${roundCoord(lat).toFixed(2)}#${roundCoord(lon).toFixed(2)}`;
}
