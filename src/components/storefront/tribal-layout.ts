export type TribalPlacement = { x: number; y: number; height: number };
export type TribalLayout = { reflejo: TribalPlacement; cruz: TribalPlacement; waterY: number; moonPaths: [number, number] };

/** Fits both tribals inside the visible area of the scene: side by side when wide, stacked when tall. */
export function placeTribals(width: number, height: number): TribalLayout {
  if (width / height >= 1) {
    const size = Math.min(height * .86, width * .42);
    return {
      reflejo: { x: -width * .24, y: height * .02, height: size * .92 },
      cruz: { x: width * .24, y: height * .02, height: size },
      waterY: -height * .46,
      moonPaths: [-width * .24, width * .24],
    };
  }
  const size = Math.min(height * .46, width * .9);
  return {
    reflejo: { x: -width * .06, y: height * .25, height: size * .92 },
    cruz: { x: width * .06, y: -height * .2, height: size },
    waterY: -height * .47,
    moonPaths: [-width * .06, width * .06],
  };
}
