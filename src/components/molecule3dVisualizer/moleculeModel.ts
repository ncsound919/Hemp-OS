
import * as THREE from 'three';
import { AtomDef, BondDef } from './types.ts';
import { ATOM_COLORS } from './data.ts';

export function createAtom(atom: AtomDef, sphereGeometry: THREE.SphereGeometry, mode: string, config: any): THREE.Mesh {
  let sizeMultiplier = 0.42;
  if (atom.element === 'C') sizeMultiplier = 0.58;
  if (atom.element === 'O') sizeMultiplier = 0.52;
  if (atom.element === 'H') sizeMultiplier = 0.30;

  let mat: THREE.Material;

  if (mode === 'electron-wire') {
    mat = new THREE.MeshBasicMaterial({ color: ATOM_COLORS[atom.element], wireframe: true, transparent: true, opacity: 0.15 });
    sizeMultiplier *= 2.0;
  } else if (mode === 'thermal') {
    const temp = config.temperature || 25;
    const heatFactor = Math.min(Math.max((temp + 80) / 240, 0), 1);
    mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.0 + (1 - heatFactor) * 0.6, 1.0, 0.45),
      emissive: new THREE.Color().setHSL(0.0, 1.0, heatFactor * 0.3),
      shininess: 40
    });
  } else if (mode === 'cpk') {
    sizeMultiplier *= 1.45;
    mat = new THREE.MeshPhongMaterial({ color: ATOM_COLORS[atom.element], shininess: 90, specular: 0x555555 });
  } else {
    mat = new THREE.MeshPhongMaterial({ color: ATOM_COLORS[atom.element], shininess: 90, specular: 0x666666 });
  }

  const sphere = new THREE.Mesh(sphereGeometry, mat);
  sphere.position.set(atom.pos[0], atom.pos[1], atom.pos[2]);
  sphere.scale.set(sizeMultiplier, sizeMultiplier, sizeMultiplier);
  return sphere;
}
