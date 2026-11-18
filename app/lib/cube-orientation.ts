/**
 * Cube orientation system for 3Style BLD practice.
 *
 * The user picks a top color and a front color. We compute the whole-cube
 * rotation alg that transforms the default WCA orientation (white-up,
 * green-front) to the user's preferred orientation.
 *
 * Standard WCA color scheme and default positions:
 *   U=White, D=Yellow, F=Green, B=Blue, R=Red, L=Orange
 *
 * Opposite pairs: White↔Yellow, Green↔Blue, Red↔Orange
 *
 * Rotation semantics (applied to default W=U, Y=D, G=F, B=B, R=R, O=L):
 *   x:  F→U (green on top), U→B, B→D, D→F
 *   x': B→U (blue on top), U→F, F→D, D→B
 *   x2: U↔D, F↔B
 *   y:  R→F (red comes to front), F→L, L→B, B→R
 *   y': L→F (orange comes to front), F→R, R→B, B→L
 *   y2: F↔B, R↔L
 *   z:  L→U (orange on top), U→R, R→D, D→L
 *   z': R→U (red on top), U→L, L→D, D→R
 *   z2: U↔D, R↔L, F stays, B stays
 */

export type CubeColor = 'W' | 'Y' | 'G' | 'B' | 'R' | 'O';

export const CUBE_COLORS: { code: CubeColor; label: string }[] = [
  { code: 'W', label: 'Blanco' },
  { code: 'Y', label: 'Amarillo' },
  { code: 'G', label: 'Verde' },
  { code: 'B', label: 'Azul' },
  { code: 'R', label: 'Rojo' },
  { code: 'O', label: 'Naranja' },
];

export const OPPOSITE_COLORS: Record<CubeColor, CubeColor> = {
  W: 'Y',
  Y: 'W',
  G: 'B',
  B: 'G',
  R: 'O',
  O: 'R',
};

export function areOpposite(a: string, b: string): boolean {
  return OPPOSITE_COLORS[a as CubeColor] === b;
}

export function areSame(a: string, b: string): boolean {
  return a === b;
}

export function isInvalidOrientation(top: string, front: string): boolean {
  return areSame(top, front) || areOpposite(top, front);
}

export interface CubeOrientationPreset {
  id: string;
  label: string;
  top: CubeColor;
  front: CubeColor;
}

/** Two quick presets; everything else is custom. */
export const CUBE_ORIENTATION_PRESETS: CubeOrientationPreset[] = [
  { id: 'WG', label: 'Blanco / Verde', top: 'W', front: 'G' },
  { id: 'YG', label: 'Amarillo / Verde', top: 'Y', front: 'G' },
];

export const DEFAULT_CUBE_ORIENTATION = 'YG';

/**
 * Lookup table for all 24 valid (top, front) orientation pairs.
 * Key is `${topColor}${frontColor}`, value is the rotation alg.
 */
const ROTATION_ALGS: Record<string, string> = {
  // White top (W already on U, only need y rotations)
  WG: '',
  WB: 'y2',
  WR: 'y',
  WO: "y'",

  // Yellow top (z2 flips U↔D keeping F/B in place)
  YG: 'z2',
  YB: 'z2 y2',
  YR: "z2 y'",
  YO: 'z2 y',

  // Green top (x brings F→U, so green goes on top)
  GY: 'x',
  GW: 'x y2',
  GR: 'x y',
  GO: "x y'",

  // Blue top (x' brings B→U, so blue goes on top)
  BW: "x'",
  BY: "x' y2",
  BR: "x' y",
  BO: "x' y'",

  // Red top (z' brings R→U, so red goes on top)
  RG: "z'",
  RW: "z' y'",
  RY: "z' y",
  RB: "z' y2",

  // Orange top (z brings L→U, so orange goes on top)
  OG: 'z',
  OW: 'z y',
  OY: "z y'",
  OB: 'z y2',
};

/**
 * Computes the rotation alg for a given top/front color pair.
 * Returns empty string for the default orientation (white/green).
 */
export function computeRotationAlg(top: string, front: string): string {
  const key = `${top}${front}`;
  return ROTATION_ALGS[key] ?? '';
}

/**
 * Parses an orientation id like "YG" into top and front color codes.
 */
export function parseOrientationId(id: string): { top: string; front: string } {
  if (id.length < 2) return { top: 'W', front: 'G' };
  return { top: id[0], front: id[1] };
}

/**
 * Gets the rotation alg for a stored orientation id (e.g. "YG").
 */
export function getOrientationRotationAlg(id: string): string {
  const { top, front } = parseOrientationId(id);
  return computeRotationAlg(top, front);
}
