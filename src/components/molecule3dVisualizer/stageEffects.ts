import * as THREE from 'three';
import { StageType, StageConfig } from './types.ts';

export interface ParticleState {
  solventParticles: any[];
  lipidChains: any[];
  distillParticles: any[];
}

export function setupStageEnvironment(
  activeStage: StageType, 
  config: StageConfig, 
  sceneGroups: { solventGroup: THREE.Group, lipidGroup: THREE.Group, distillationGroup: THREE.Group },
  geometries: { sphere: THREE.SphereGeometry }
): ParticleState {
  // Clear previous groups to prevent memory leaks
  const clearGroup = (group: THREE.Group) => {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      } else if (child instanceof THREE.Group) {
        child.traverse(node => {
          if (node instanceof THREE.Mesh) {
            if (node.geometry) node.geometry.dispose();
            if (node.material) {
              if (Array.isArray(node.material)) {
                node.material.forEach(m => m.dispose());
              } else {
                node.material.dispose();
              }
            }
          }
        });
      }
    }
  };

  clearGroup(sceneGroups.solventGroup);
  clearGroup(sceneGroups.lipidGroup);
  clearGroup(sceneGroups.distillationGroup);

  const solventParticles: any[] = [];
  const lipidChains: any[] = [];
  const distillParticles: any[] = [];

  // EXTRACTION: Swirling solvent molecules (CO2 or Ethanol)
  if (activeStage === 'extraction') {
    const solventType = (config as any).solventType || 'CO2';
    const count = Math.min(Math.max(((config as any).solventRatio || 8.0) * 4, 15), 60);

    for (let i = 0; i < count; i++) {
      const pGroup = new THREE.Group();

      if (solventType === 'CO2') {
        // CO2 molecule: linear O=C=O
        const carbon = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({ color: 0x333333 }));
        carbon.scale.set(0.24, 0.24, 0.24);
        pGroup.add(carbon);

        const ox1 = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({ color: 0xff3333 }));
        ox1.position.set(0.4, 0, 0);
        ox1.scale.set(0.2, 0.2, 0.2);
        pGroup.add(ox1);

        const ox2 = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({ color: 0xff3333 }));
        ox2.position.set(-0.4, 0, 0);
        ox2.scale.set(0.2, 0.2, 0.2);
        pGroup.add(ox2);
      } else {
        // Ethanol: C2H5OH (Simplified representation: 3 connected spheres)
        const oxygen = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({ color: 0xff3333 }));
        oxygen.scale.set(0.25, 0.25, 0.25);
        pGroup.add(oxygen);

        const c1 = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({ color: 0x333333 }));
        c1.position.set(0.35, 0.2, 0);
        c1.scale.set(0.28, 0.28, 0.28);
        pGroup.add(c1);

        const c2 = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({ color: 0x333333 }));
        c2.position.set(0.7, -0.1, 0);
        c2.scale.set(0.28, 0.28, 0.28);
        pGroup.add(c2);
      }

      // Positioning in a swirling vortex around the main molecule
      const radius = 3.5 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      const y = -4 + Math.random() * 8;

      pGroup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      sceneGroups.solventGroup.add(pGroup);

      solventParticles.push({
        mesh: pGroup,
        velocity: new THREE.Vector3(0, 0, 0),
        angle,
        radius,
        speedY: -0.01 - Math.random() * 0.02
      });
    }
  }

  // WINTERIZATION: Floating lipids / waxes that crystallize when frozen
  if (activeStage === 'winterization') {
    const count = 4; // 4 parallel lipid chains

    for (let c = 0; c < count; c++) {
      const cGroup = new THREE.Group();
      const pts: THREE.Vector3[] = [];
      const initialPts: THREE.Vector3[] = [];
      const segments = 10;
      const xOffset = -5 + c * 3.2;

      for (let i = 0; i < segments; i++) {
        const y = -4 + i * 0.85;
        const x = xOffset + (i % 2 === 0 ? 0.4 : -0.4);
        const z = -1 + Math.sin(i * 0.5) * 0.5;

        const sphere = new THREE.Mesh(geometries.sphere, new THREE.MeshPhongMaterial({
          color: 0x7e8a9f,
          shininess: 30,
          transparent: true,
          opacity: 0.8
        }));
        sphere.scale.set(0.28, 0.28, 0.28);
        sphere.position.set(x, y, z);
        cGroup.add(sphere);

        pts.push(new THREE.Vector3(x, y, z));
        initialPts.push(new THREE.Vector3(x, y, z));
      }

      sceneGroups.lipidGroup.add(cGroup);
      lipidChains.push({
        mesh: cGroup,
        initialPositions: initialPts,
        points: pts,
        spacing: 3.2
      });
    }
  }

  // DISTILLATION: Evaporation molecules (terpenes and cannabinoids)
  if (activeStage === 'distillation') {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const isTerpene = i % 3 === 0; // 33% terpenes, lighter, evaporates faster
      const pSize = isTerpene ? 0.22 : 0.35;
      const pMat = new THREE.MeshPhongMaterial({
        color: isTerpene ? 0xffa500 : 0xd4af37,
        shininess: 95,
        emissive: new THREE.Color(isTerpene ? 0x331a00 : 0x332200),
        emissiveIntensity: 0.5
      });

      const sphere = new THREE.Mesh(geometries.sphere, pMat);
      sphere.scale.set(pSize, pSize, pSize);

      // Position on the heated evaporating bottom floor
      const rx = -4 + Math.random() * 8;
      const ry = -5 + Math.random() * 1.5;
      const rz = -2 + Math.random() * 4;
      sphere.position.set(rx, ry, rz);

      sceneGroups.distillationGroup.add(sphere);
      distillParticles.push({
        mesh: sphere,
        type: isTerpene ? 'terpene' : 'cbd',
        initialY: ry,
        speedX: -0.015 + Math.random() * 0.03,
        speedY: 0.03 + Math.random() * 0.04 * (isTerpene ? 2.2 : 1.0),
        cycle: Math.random() * Math.PI * 2
      });
    }
  }

  return {
    solventParticles,
    lipidChains,
    distillParticles
  };
}

export function updateStageAnimations(
  activeStage: StageType, 
  config: StageConfig, 
  _groups: { solventGroup: THREE.Group, lipidGroup: THREE.Group, distillationGroup: THREE.Group }, 
  particles: ParticleState,
  elapsed: number,
  _delta: number
) {
  // A. EXTRACTION
  if (activeStage === 'extraction' && particles.solventParticles.length > 0) {
    const agitation = (config as any).agitationSpeed || 300;
    const temp = (config as any).extractionTemp || -40;

    const rotationSpeed = (agitation / 1000) * 0.08 + 0.01;
    const thermalJitter = Math.max((temp + 80) / 120, 0.05) * 0.05;

    particles.solventParticles.forEach((particle) => {
      particle.angle += rotationSpeed;
      particle.mesh.position.x = Math.cos(particle.angle) * particle.radius;
      particle.mesh.position.z = Math.sin(particle.angle) * particle.radius;

      particle.mesh.position.y += particle.speedY * (1.0 + thermalJitter * 5);
      if (particle.mesh.position.y < -5.5) {
        particle.mesh.position.y = 5.5;
      }

      particle.mesh.position.x += (Math.random() - 0.5) * thermalJitter;
      particle.mesh.position.y += (Math.random() - 0.5) * thermalJitter;
      particle.mesh.position.z += (Math.random() - 0.5) * thermalJitter;
    });
  }

  // B. WINTERIZATION
  if (activeStage === 'winterization' && particles.lipidChains.length > 0) {
    const coolingTemp = (config as any).coolingTemp || -40;
    const crystallizeFactor = Math.min(Math.max((0 - coolingTemp) / 40, 0), 1.0);

    particles.lipidChains.forEach((chain, cIdx) => {
      const sphereMeshes = chain.mesh.children as THREE.Mesh[];

      chain.points.forEach((pt: THREE.Vector3, idx: number) => {
        const initialPt = chain.initialPositions[idx];
        const sphere = sphereMeshes[idx];
        if (!sphere) return;

        const wiggleAmp = (1.0 - crystallizeFactor) * 0.35 + 0.05;
        const wiggleX = Math.sin(elapsed * 5 + idx + cIdx) * wiggleAmp;
        const wiggleZ = Math.cos(elapsed * 4 + idx - cIdx) * wiggleAmp;

        const targetX = initialPt.x + (crystallizeFactor * Math.sin(idx) * 0.15);
        const targetY = initialPt.y;
        const targetZ = initialPt.z;

        pt.x = THREE.MathUtils.lerp(pt.x, targetX + wiggleX, 0.08);
        pt.y = THREE.MathUtils.lerp(pt.y, targetY, 0.08);
        pt.z = THREE.MathUtils.lerp(pt.z, targetZ + wiggleZ, 0.08);

        sphere.position.copy(pt);

        const material = sphere.material as THREE.MeshPhongMaterial;
        if (material) {
          const r = THREE.MathUtils.lerp(126/255, 30/255, crystallizeFactor);
          const g = THREE.MathUtils.lerp(138/255, 190/255, crystallizeFactor);
          const b = THREE.MathUtils.lerp(159/255, 195/255, crystallizeFactor);
          material.color.setRGB(r, g, b);
          material.emissive.setRGB(0, crystallizeFactor * 0.4, crystallizeFactor * 0.3);
        }
      });
    });
  }

  // C. DISTILLATION
  if (activeStage === 'distillation' && particles.distillParticles.length > 0) {
    const evapTemp = (config as any).evaporatorTemp || 185;
    const vacPressure = (config as any).vacuumPressure || 0.05;

    const boilingPointFactor = Math.max(1.0 - vacPressure, 0.2);
    const thermalEnergy = Math.max((evapTemp - 140) / 100, 0.1) * boilingPointFactor * 1.5;

    particles.distillParticles.forEach((part, idx) => {
      part.cycle += 0.04;

      if (thermalEnergy > 0.2) {
        part.mesh.position.y += part.speedY * thermalEnergy;
        part.mesh.position.x += Math.sin(part.cycle) * 0.05;

        if (part.mesh.position.y >= 4.0) {
          part.mesh.position.y = -5.0;
          part.mesh.position.x = -4.0 + Math.random() * 8;
        }
      } else {
        part.mesh.position.y = part.initialY + (Math.sin(elapsed * 12 + idx) * 0.08);
      }
    });
  }
}
