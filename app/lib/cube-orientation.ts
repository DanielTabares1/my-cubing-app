/**
 * Cube orientation presets for 3Style BLD practice.
 *
 * Each preset defines the top (U) and front (F) face colors of the cube,
 * and a whole-cube rotation alg that transforms the default orientation
 * (white-up, green-front) to the user's preferred orientation.
 *
 * The rotation is used as `experimentalSetupAlg` on the TwistyPlayer so the
 * 3D model faces the user's preferred direction. Standard WCA color scheme:
 *   U=white, D=yellow, F=green, B=blue, R=red, L=orange.
 */

export interface CubeOrientationPreset {
  /** Short id, e.g. "YG" (yellow top, green front). */
  id: string;
  /** Human label, e.g. "Amarillo / Verde". */
  label: string;
  /** Top face color. */
  top: string;
  /** Front face color. */
  front: string;
  /**
   * Whole-cube rotation alg that maps the default orientation
   * (white-up, green-front) to this orientation. Uses x/y/z rotations.
   */
  rotationAlg: string;
}

/**
 * Default orientation is white-up, green-front (standard WCA).
 * All other presets are rotations from this default.
 */
export const CUBE_ORIENTATIONS: CubeOrientationPreset[] = [
  // White top
  {
    id: 'WG',
    label: 'Blanco / Verde',
    top: 'Blanco',
    front: 'Verde',
    rotationAlg: '',
  },
  {
    id: 'WB',
    label: 'Blanco / Azul',
    top: 'Blanco',
    front: 'Azul',
    rotationAlg: 'y2',
  },
  {
    id: 'WR',
    label: 'Blanco / Rojo',
    top: 'Blanco',
    front: 'Rojo',
    rotationAlg: "y'",
  },
  {
    id: 'WO',
    label: 'Blanco / Naranja',
    top: 'Blanco',
    front: 'Naranja',
    rotationAlg: 'y',
  },
  // Yellow top (x2 flips the cube)
  {
    id: 'YG',
    label: 'Amarillo / Verde',
    top: 'Amarillo',
    front: 'Verde',
    rotationAlg: 'x2',
  },
  {
    id: 'YB',
    label: 'Amarillo / Azul',
    top: 'Amarillo',
    front: 'Azul',
    rotationAlg: 'x2 y2',
  },
  {
    id: 'YR',
    label: 'Amarillo / Rojo',
    top: 'Amarillo',
    front: 'Rojo',
    rotationAlg: "x2 y'",
  },
  {
    id: 'YO',
    label: 'Amarillo / Naranja',
    top: 'Amarillo',
    front: 'Naranja',
    rotationAlg: 'x2 y',
  },
];

export const DEFAULT_CUBE_ORIENTATION = 'WG';

export function getOrientationPreset(id: string): CubeOrientationPreset {
  return CUBE_ORIENTATIONS.find((p) => p.id === id) ?? CUBE_ORIENTATIONS[0];
}
