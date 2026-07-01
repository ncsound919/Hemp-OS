
import * as THREE from 'three';
import { AtomDef, BondDef } from './types.ts';
import { ATOM_COLORS } from './data.ts';

/**
 * Supported visualization modes for atoms/bonds.
 * Using a union type instead of a bare `string` gives compile-time
 * safety and autocomplete at call sites.
 */
export type VisualizationMode = 'default' | 'cpk' | 'electron-wire' | 'thermal';

/**
 * Strongly-typed config object instead of `any`.
 * Extend this as new modes need more parameters.
 */
export interface VisualizationConfig {
  /** Temperature in Celsius, used only by 'thermal' mode. Defaults to 25. */
  temperature?: number;
  /** Minimum temp mapped to the "cold" end of the color ramp. */
  thermalMin?: number;
  /** Maximum temp mapped to the "hot" end of the color ramp. */
  thermalMax?: number;
}

/** Metadata attached to every generated atom mesh, useful for raycasting/picking. */
export interface AtomUserData {
  type: 'atom';
  element: string;
  atomId: number;
  atom: AtomDef;
}

/** Metadata attached to every generated bond mesh. */
export interface BondUserData {
  type: 'bond';
  from: number;
  to: number;
  bond: BondDef;
}

// ---------------------------------------------------------------------------
// Tunable constants (previously "magic numbers")
// ---------------------------------------------------------------------------

const DEFAULT_SIZE_MULTIPLIER = 0.42;

/** Per-element radius multipliers (fractions of the base sphere geometry). */
const ELEMENT_SIZE_MULTIPLIERS: Record<string, number> = {
  H: 0.30,
  C: 0.58,
  N: 0.54,
  O: 0.52,
  S: 0.62,
  P: 0.60,
  F: 0.42,
  Cl: 0.66,
  Br: 0.70,
  I: 0.76,
};

/** Multiplies the element size for a given render mode. */
const MODE_SIZE_MULTIPLIERS: Partial<Record<VisualizationMode, number>> = {
  'electron-wire': 2.0,
  cpk: 1.45,
  // 'default' and 'thermal' use 1.0 implicitly
};

const DEFAULT_ATOM_COLOR = 0xaaaaaa;
const BOND_RADIUS = 0.08;
const BOND_RADIAL_SEGMENTS = 16;
const BOND_COLOR = 0xcccccc;

const THERMAL_DEFAULT_TEMP = 25;
const THERMAL_DEFAULT_MIN = -80;
const THERMAL_DEFAULT_MAX = 160;

// ---------------------------------------------------------------------------
// Geometry cache (avoids re-scaling / distorting shared geometry, and avoids
// recreating identical geometries every call).
// ---------------------------------------------------------------------------

const sphereGeometryCache = new Map<string, THREE.SphereGeometry>();

/**
 * Returns a cached sphere geometry for a given radius, creating it on first use.
 * Prefer this over scaling one shared geometry when meshes may later be
 * rotated/skewed non-uniformly (keeps spheres perfectly round).
 */
function getSphereGeometry(radius: number, segments = 24): THREE.SphereGeometry {
  const key = `${radius.toFixed(3)}_${segments}`;
  let geometry = sphereGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.SphereGeometry(radius, segments, segments);
    sphereGeometryCache.set(key, geometry);
  }
  return geometry;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

function getElementColor(element: string): number {
  return ATOM_COLORS[element] ?? DEFAULT_ATOM_COLOR;
}

function createElectronWireMaterial(element: string): THREE.Material {
  return new THREE.MeshBasicMaterial({
    color: getElementColor(element),
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
}

function createThermalMaterial(
  temperature: number,
  min: number,
  max: number
): THREE.Material {
  const heatFactor = THREE.MathUtils.clamp((temperature - min) / (max - min), 0, 1);
  // Hue sweep: 0.65 (blue) -> 0.0 (red) as heatFactor goes 0 -> 1.
  const hue = 0.65 - heatFactor * 0.65;
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color().setHSL(hue, 1.0, 0.5),
    emissive: new THREE.Color().setHSL(0.0, 0.9, heatFactor * 0.35),
    shininess: 30,
  });
}

function createCpkMaterial(element: string): THREE.Material {
  return new THREE.MeshPhongMaterial({
    color: getElementColor(element),
    shininess: 90,
    specular: 0x555555,
  });
}

function createDefaultMaterial(element: string): THREE.Material {
  return new THREE.MeshPhongMaterial({
    color: getElementColor(element),
    shininess: 90,
    specular: 0x666666,
  });
}

// ---------------------------------------------------------------------------
// Public API: atoms
// ---------------------------------------------------------------------------

/**
 * Builds a renderable THREE.Mesh for a single atom, styled according to
 * the requested visualization mode.
 *
 * @param atom            Atom definition (position, element, id, ...).
 * @param sphereGeometry  Base unit-radius sphere geometry to reuse/scale.
 *                        Pass a cached geometry from `getSphereGeometry`
 *                        for distortion-free results across modes.
 * @param mode            Visualization style. Defaults to 'default'.
 * @param config          Mode-specific options (e.g. temperature for 'thermal').
 */
export function createAtom(
  atom: AtomDef,
  sphereGeometry: THREE.SphereGeometry,
  mode: VisualizationMode = 'default',
  config: VisualizationConfig = {}
): THREE.Mesh {
  let sizeMultiplier = ELEMENT_SIZE_MULTIPLIERS[atom.element] ?? DEFAULT_SIZE_MULTIPLIER;
  let material: THREE.Material;

  switch (mode) {
    case 'electron-wire':
      material = createElectronWireMaterial(atom.element);
      sizeMultiplier *= MODE_SIZE_MULTIPLIERS['electron-wire'] ?? 1.0;
      break;

    case 'thermal': {
      const temp = config.temperature ?? THERMAL_DEFAULT_TEMP;
      const min = config.thermalMin ?? THERMAL_DEFAULT_MIN;
      const max = config.thermalMax ?? THERMAL_DEFAULT_MAX;
      material = createThermalMaterial(temp, min, max);
      break;
    }

    case 'cpk':
      material = createCpkMaterial(atom.element);
      sizeMultiplier *= MODE_SIZE_MULTIPLIERS.cpk ?? 1.0;
      break;

    case 'default':
    default:
      material = createDefaultMaterial(atom.element);
      break;
  }

  const sphere = new THREE.Mesh(sphereGeometry, material);
  sphere.position.set(atom.pos[0], atom.pos[1], atom.pos[2]);
  sphere.scale.setScalar(sizeMultiplier);

  const userData: AtomUserData = {
    type: 'atom',
    element: atom.element,
    atomId: atom.id,
    atom,
  };
  sphere.userData = userData;

  return sphere;
}

// ---------------------------------------------------------------------------
// Public API: bonds
// ---------------------------------------------------------------------------

const bondGeometryCache = new Map<string, THREE.CylinderGeometry>();

function getBondGeometry(length: number): THREE.CylinderGeometry {
  const key = length.toFixed(3);
  let geometry = bondGeometryCache.get(key);
  if (!geometry) {
    geometry = new THREE.CylinderGeometry(
      BOND_RADIUS,
      BOND_RADIUS,
      length,
      BOND_RADIAL_SEGMENTS
    );
    bondGeometryCache.set(key, geometry);
  }
  return geometry;
}

/**
 * Builds a cylinder mesh connecting two already-placed atom meshes.
 * Returns null if either endpoint atom cannot be found in the lookup map,
 * so callers can safely skip malformed bonds without throwing.
 */
export function createBond(
  bond: BondDef,
  atoms: Map<number, THREE.Mesh>,
  _mode: VisualizationMode = 'default'
): THREE.Mesh | null {
  const a1 = atoms.get(bond.from);
  const a2 = atoms.get(bond.to);
  if (!a1 || !a2) return null;

  const direction = new THREE.Vector3().subVectors(a2.position, a1.position);
  const length = direction.length();
  if (length === 0) return null;

  const geometry = getBondGeometry(length);
  const material = new THREE.MeshPhongMaterial({ color: BOND_COLOR });
  const bondMesh = new THREE.Mesh(geometry, material);

  // Position at midpoint, then orient the cylinder along the bond axis.
  bondMesh.position.copy(a1.position).addScaledVector(direction, 0.5);

  const cylinderUp = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    cylinderUp,
    direction.clone().normalize()
  );
  bondMesh.quaternion.copy(quaternion);

  const userData: BondUserData = {
    type: 'bond',
    from: bond.from,
    to: bond.to,
    bond,
  };
  bondMesh.userData = userData;

  return bondMesh;
}

// ---------------------------------------------------------------------------
// Cleanup helper (call on scene teardown to free GPU memory)
// ---------------------------------------------------------------------------

export function disposeGeometryCaches(): void {
  sphereGeometryCache.forEach((g) => g.dispose());
  sphereGeometryCache.clear();
  bondGeometryCache.forEach((g) => g.dispose());
  bondGeometryCache.clear();
}