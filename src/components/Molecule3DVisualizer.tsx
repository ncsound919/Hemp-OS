import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { StageType, StageConfig } from './molecule3dVisualizer/types.ts';
import { setupScene } from './molecule3dVisualizer/sceneSetup.ts';
import { getSubstrateDetails } from './molecule3dVisualizer/hudHelpers.ts';

// CPK Color Scheme for Atoms
const ATOM_COLORS = {
  C: 0x333333,  // Dark gray/charcoal
  H: 0xeeeeee,  // Near white
  O: 0xff3333,  // Deep red
  CO2_C: 0x4444aa, // Light purple/blue for visual contrast
  CO2_O: 0xff5555,
  LIPID_C: 0x7e8a9f, // Steel blue for lipids
  TERPENE: 0xffa500, // Orange
  CBD_GOLD: 0xd4af37, // Gold highlight
};

interface AtomDef {
  id: number;
  element: 'C' | 'H' | 'O';
  pos: [number, number, number];
  isCarboxyl?: boolean; // For CBDA decarboxylation group
  isCarboxylHydrogen?: boolean;
}

interface BondDef {
  from: number;
  to: number;
  isCarboxyl?: boolean;
}

export function Molecule3DVisualizer({
  activeStageType,
  stageConfig,
  results
}: Molecule3DVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI Control states
  const [viewMode, setViewMode] = useState<'cpk' | 'ball-stick' | 'electron-wire' | 'thermal'>('ball-stick');
  const [rotateSpeed, setRotateSpeed] = useState<number>(1.5);
  const [showBonds, setShowBonds] = useState<boolean>(true);
  const [showLabels, setShowLabels] = useState<boolean>(false);
  const [isDecarboxylated, setIsDecarboxylated] = useState<boolean>(false);
  const [isDecarboxylating, setIsDecarboxylating] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [interactiveRotation, setInteractiveRotation] = useState<{x: number, y: number}>({ x: 0.1, y: 0.1 });

  // Refs to allow animation loop to read latest state without re-creating scene
  const viewModeRef = useRef(viewMode);
  const showBondsRef = useRef(showBonds);
  const isDecarboxylatedRef = useRef(isDecarboxylated);
  const activeStageTypeRef = useRef(activeStageType);
  const configRef = useRef(stageConfig);

  // Sync refs
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { showBondsRef.current = showBonds; }, [showBonds]);
  useEffect(() => { isDecarboxylatedRef.current = isDecarboxylated; }, [isDecarboxylated]);
  useEffect(() => { activeStageTypeRef.current = activeStageType; }, [activeStageType]);
  useEffect(() => { configRef.current = stageConfig; }, [stageConfig]);

  // Reset decarboxylation state when switching away/back
  useEffect(() => {
    if (activeStageType !== 'decarboxylation') {
      setIsDecarboxylated(false);
      setIsDecarboxylating(false);
    }
  }, [activeStageType]);

  // Handle Drag-to-Rotate on Canvas
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    setInteractiveRotation(prev => ({
      x: prev.x + deltaX * 0.005,
      y: prev.y + deltaY * 0.005
    }));

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  // Trigger real-time chemical reaction (splitting CO2)
  const triggerDecarboxylation = () => {
    if (activeStageType !== 'decarboxylation' || isDecarboxylating || isDecarboxylated) return;
    setIsDecarboxylating(true);
  };

  const resetDecarboxylation = () => {
    setIsDecarboxylated(false);
    setIsDecarboxylating(false);
  };

  // --- THREE.JS INITIALIZATION & RUNTIME LOOP ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 340;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0b); // Transparent black matches flowsheet theme

    // 2. Camera setup
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 18;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    // Warm key light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 1.2);
    keyLight.position.set(5, 5, 5);
    scene.add(keyLight);

    // Cool fill light
    const fillLight = new THREE.DirectionalLight(0x8bc34a, 0.6); // slight green highlight to signify phytochemistry
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Blue rim light
    const rimLight = new THREE.DirectionalLight(0x3f51b5, 0.8);
    rimLight.position.set(0, -5, 2);
    scene.add(rimLight);

    // 5. Container Groups
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    const moleculeGroup = new THREE.Group();
    mainGroup.add(moleculeGroup);

    const solventGroup = new THREE.Group();
    mainGroup.add(solventGroup);

    const lipidGroup = new THREE.Group();
    mainGroup.add(lipidGroup);

    const distillationGroup = new THREE.Group();
    mainGroup.add(distillationGroup);

    // 6. Define Cannabinoid Backbone Atom coordinates (CBDA / CBD)
    // Structured representation of a cannabinoids chemical formula
    const cannabinoidAtoms: AtomDef[] = [
      // Benzene/Resorcinol Ring (Atoms 0 to 5)
      { id: 0, element: 'C', pos: [0, 0, 0] },
      { id: 1, element: 'C', pos: [1.2, 0.7, 0] },
      { id: 2, element: 'C', pos: [1.2, 2.1, 0] },
      { id: 3, element: 'C', pos: [0, 2.8, 0] },
      { id: 4, element: 'C', pos: [-1.2, 2.1, 0] },
      { id: 5, element: 'C', pos: [-1.2, 0.7, 0] },

      // Resorcinol Hydroxyl group at Atom 1
      { id: 6, element: 'O', pos: [2.4, 0, 0] },
      { id: 7, element: 'H', pos: [3.1, -0.5, 0.2] },

      // Resorcinol Hydroxyl group at Atom 5
      { id: 8, element: 'O', pos: [-2.4, 0, 0] },
      { id: 9, element: 'H', pos: [-3.1, -0.5, -0.2] },

      // Alkyl Pentyl Chain at Atom 3
      { id: 10, element: 'C', pos: [0, 4.2, 0] },
      { id: 11, element: 'C', pos: [0.8, 5.0, 0.4] },
      { id: 12, element: 'C', pos: [0.8, 6.4, 0.4] },
      { id: 13, element: 'C', pos: [1.6, 7.2, 0.8] },
      { id: 14, element: 'C', pos: [1.6, 8.6, 0.8] },
      { id: 15, element: 'H', pos: [2.2, 9.1, 1.3] },

      // Terpene cyclohexenyl ring at Atom 0
      { id: 16, element: 'C', pos: [0, -1.4, 0] },
      { id: 17, element: 'C', pos: [1.2, -2.1, 0.4] },
      { id: 18, element: 'C', pos: [1.2, -3.5, 0.4] },
      { id: 19, element: 'C', pos: [0, -4.2, 0] },
      { id: 20, element: 'C', pos: [-1.2, -3.5, -0.4] },
      { id: 21, element: 'C', pos: [-1.2, -2.1, -0.4] },

      // Hydrogens on cyclohexenyl
      { id: 22, element: 'H', pos: [-1.8, -1.6, -0.8] },
      { id: 23, element: 'H', pos: [1.8, -1.6, 0.8] },

      // --- CARBOXYL GROUP ($-COOH$) at Atom 4 (CBDA only) ---
      { id: 24, element: 'C', pos: [-2.4, 2.9, 0.2], isCarboxyl: true },
      { id: 25, element: 'O', pos: [-3.4, 2.1, 0.7], isCarboxyl: true }, // carbonyl double-bond oxygen
      { id: 26, element: 'O', pos: [-2.8, 4.1, -0.3], isCarboxyl: true }, // hydroxyl single-bond oxygen
      { id: 27, element: 'H', pos: [-3.7, 4.4, -0.2], isCarboxyl: true, isCarboxylHydrogen: true },
    ];

    const cannabinoidBonds: BondDef[] = [
      // Ring bonds
      { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 2, to: 3 },
      { from: 3, to: 4 }, { from: 4, to: 5 }, { from: 5, to: 0 },

      // Hydroxyl bonds
      { from: 1, to: 6 }, { from: 6, to: 7 },
      { from: 5, to: 8 }, { from: 8, to: 9 },

      // Alkyl Chain bonds
      { from: 3, to: 10 }, { from: 10, to: 11 }, { from: 11, to: 12 },
      { from: 12, to: 13 }, { from: 13, to: 14 }, { from: 14, to: 15 },

      // Cyclohexenyl ring bonds
      { from: 0, to: 16 }, { from: 16, to: 17 }, { from: 17, to: 18 },
      { from: 18, to: 19 }, { from: 19, to: 20 }, { from: 20, to: 21 },
      { from: 21, to: 16 },

      // Hydrogen bonds
      { from: 21, to: 22 }, { from: 17, to: 23 },

      // Carboxyl group bonds (Only CBDA)
      { from: 4, to: 24, isCarboxyl: true },
      { from: 24, to: 25, isCarboxyl: true },
      { from: 24, to: 26, isCarboxyl: true },
      { from: 26, to: 27, isCarboxyl: true },
    ];

    // Helper Geometries & Materials
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const cylinderGeometry = new THREE.CylinderGeometry(0.12, 0.12, 1, 16);

    // Keep track of carboxyl 3D elements to animate them separately during Decarboxylation
    const carboxylObjects: { mesh: THREE.Mesh; initialPos: THREE.Vector3; atomId: number }[] = [];
    const regularAtomMeshes: { mesh: THREE.Mesh; atom: AtomDef }[] = [];
    const regularBondMeshes: { mesh: THREE.Mesh; bond: BondDef }[] = [];
    let reactionBondMesh: THREE.Mesh | null = null; // The bond linking Ring C4 to Carboxyl Carbon

    // Re-create the entire main molecule
    const rebuildMolecule = () => {
      // Clear previous
      while (moleculeGroup.children.length > 0) {
        moleculeGroup.remove(moleculeGroup.children[0]);
      }
      carboxylObjects.length = 0;
      regularAtomMeshes.length = 0;
      regularBondMeshes.length = 0;
      reactionBondMesh = null;

      const isDecarbDone = isDecarboxylatedRef.current;
      const isDecarbStage = activeStageTypeRef.current === 'decarboxylation';

      // 1. Create Atom Spheres
      cannabinoidAtoms.forEach((atom) => {
        // Skip carboxyl group if decarboxylation has fully completed
        if (atom.isCarboxyl && isDecarbDone) return;

        // Visual size mapping based on atomic weight and CPK rules
        let sizeMultiplier = 0.42;
        if (atom.element === 'C') sizeMultiplier = 0.58;
        if (atom.element === 'O') sizeMultiplier = 0.52;
        if (atom.element === 'H') sizeMultiplier = 0.30;

        // Custom look based on viewing mode
        const mode = viewModeRef.current;
        let mat: THREE.Material;

        if (mode === 'electron-wire') {
          // Wireframe glowing electron cloud
          mat = new THREE.MeshBasicMaterial({
            color: ATOM_COLORS[atom.element],
            wireframe: true,
            transparent: true,
            opacity: 0.15
          });
          sizeMultiplier *= 2.0; // expand size
        } else if (mode === 'thermal') {
          // Thermally excited heatmap material
          // Driven by red/orange emissive glows
          const temp = configRef.current.temperature || configRef.current.extractionTemp || 25;
          const heatFactor = Math.min(Math.max((temp + 80) / 240, 0), 1); // map temp range to [0,1]
          mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color().setHSL(0.0 + (1 - heatFactor) * 0.6, 1.0, 0.45), // blue (cold) to red (hot)
            emissive: new THREE.Color().setHSL(0.0, 1.0, heatFactor * 0.3),
            shininess: 40
          });
        } else if (mode === 'cpk') {
          // Sphere-filling CPK space model
          sizeMultiplier *= 1.45;
          mat = new THREE.MeshPhongMaterial({
            color: ATOM_COLORS[atom.element],
            shininess: 90,
            specular: 0x555555
          });
        } else {
          // Ball-and-Stick
          mat = new THREE.MeshPhongMaterial({
            color: ATOM_COLORS[atom.element],
            shininess: 90,
            specular: 0x666666
          });
        }

        const sphere = new THREE.Mesh(sphereGeometry, mat);
        sphere.position.set(atom.pos[0], atom.pos[1], atom.pos[2]);
        sphere.scale.set(sizeMultiplier, sizeMultiplier, sizeMultiplier);

        // Store references
        if (atom.isCarboxyl) {
          carboxylObjects.push({
            mesh: sphere,
            initialPos: new THREE.Vector3(atom.pos[0], atom.pos[1], atom.pos[2]),
            atomId: atom.id
          });
        } else {
          regularAtomMeshes.push({ mesh: sphere, atom });
        }

        moleculeGroup.add(sphere);
      });

      // 2. Create Bonds (Stick representation)
      if (showBondsRef.current && viewModeRef.current !== 'cpk') {
        cannabinoidBonds.forEach((bond) => {
          // Skip carboxyl bonds if decarboxylation complete
          if (bond.isCarboxyl && isDecarbDone) return;

          const fromAtom = cannabinoidAtoms.find(a => a.id === bond.from);
          const toAtom = cannabinoidAtoms.find(a => a.id === bond.to);
          if (!fromAtom || !toAtom) return;

          // Positions
          const p1 = new THREE.Vector3(...fromAtom.pos);
          const p2 = new THREE.Vector3(...toAtom.pos);

          // Cylinder geometry oriented along the bond vector
          const direction = new THREE.Vector3().subVectors(p2, p1);
          const length = direction.length();
          const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

          const cylinder = new THREE.Mesh(cylinderGeometry, new THREE.MeshPhongMaterial({
            color: bond.isCarboxyl ? 0xcc9933 : 0xdddddd,
            shininess: 50,
            transparent: true,
            opacity: viewModeRef.current === 'electron-wire' ? 0.2 : 0.85
          }));

          cylinder.scale.set(1, length, 1);
          cylinder.position.copy(midPoint);

          // Align cylinder with bond direction vector
          const up = new THREE.Vector3(0, 1, 0);
          cylinder.quaternion.setFromUnitVectors(up, direction.clone().normalize());

          if (bond.from === 4 && bond.to === 24) {
            // This is the active cleavage bond
            reactionBondMesh = cylinder;
          } else if (bond.isCarboxyl) {
            carboxylObjects.push({
              mesh: cylinder,
              initialPos: midPoint.clone(),
              atomId: -bond.from // encode negative ID as a bond indicator
            });
          } else {
            regularBondMeshes.push({ mesh: cylinder, bond });
          }

          moleculeGroup.add(cylinder);
        });
      }
    };

    // Rebuild initial molecule state
    rebuildMolecule();

    // 7. Dynamic Stage Environment Setup
    // EXTRACTION: Swirling solvent molecules (CO2 or Ethanol)
    const activeStage = activeStageTypeRef.current;
    const config = configRef.current;

    // Generate Solvents for Extraction
    const solventParticles: { mesh: THREE.Group; velocity: THREE.Vector3; angle: number; radius: number; speedY: number }[] = [];
    if (activeStage === 'extraction') {
      const solventType = config.solventType || 'CO2';
      const count = Math.min(Math.max((config.solventRatio || 8.0) * 4, 15), 60);

      for (let i = 0; i < count; i++) {
        const pGroup = new THREE.Group();

        if (solventType === 'CO2') {
          // CO2 molecule: linear O=C=O
          const carbon = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({ color: ATOM_COLORS.C }));
          carbon.scale.set(0.24, 0.24, 0.24);
          pGroup.add(carbon);

          const ox1 = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({ color: ATOM_COLORS.O }));
          ox1.position.set(0.4, 0, 0);
          ox1.scale.set(0.2, 0.2, 0.2);
          pGroup.add(ox1);

          const ox2 = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({ color: ATOM_COLORS.O }));
          ox2.position.set(-0.4, 0, 0);
          ox2.scale.set(0.2, 0.2, 0.2);
          pGroup.add(ox2);
        } else {
          // Ethanol: C2H5OH (Simplified representation: 3 connected spheres)
          const oxygen = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({ color: ATOM_COLORS.O }));
          oxygen.scale.set(0.25, 0.25, 0.25);
          pGroup.add(oxygen);

          const c1 = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({ color: ATOM_COLORS.C }));
          c1.position.set(0.35, 0.2, 0);
          c1.scale.set(0.28, 0.28, 0.28);
          pGroup.add(c1);

          const c2 = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({ color: ATOM_COLORS.C }));
          c2.position.set(0.7, -0.1, 0);
          c2.scale.set(0.28, 0.28, 0.28);
          pGroup.add(c2);
        }

        // Positioning in a swirling vortex around the main molecule
        const radius = 3.5 + Math.random() * 5;
        const angle = Math.random() * Math.PI * 2;
        const y = -4 + Math.random() * 8;

        pGroup.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        solventGroup.add(pGroup);

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
    const lipidChains: { mesh: THREE.Group; initialPositions: THREE.Vector3[]; points: THREE.Vector3[]; spacing: number }[] = [];
    if (activeStage === 'winterization') {
      const count = 4; // 4 parallel lipid chains
      const isFrozen = (config.coolingTemp || -40) <= -30;

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

          const sphere = new THREE.Mesh(sphereGeometry, new THREE.MeshPhongMaterial({
            color: ATOM_COLORS.LIPID_C,
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

        lipidGroup.add(cGroup);
        lipidChains.push({
          mesh: cGroup,
          initialPositions: initialPts,
          points: pts,
          spacing: 3.2
        });
      }
    }

    // DISTILLATION: Evaporation molecules (terpenes and cannabinoids)
    const distillParticles: { mesh: THREE.Mesh; type: 'terpene' | 'cbd'; initialY: number; speedX: number; speedY: number; cycle: number }[] = [];
    if (activeStage === 'distillation') {
      const count = 30;
      for (let i = 0; i < count; i++) {
        const isTerpene = i % 3 === 0; // 33% terpenes, lighter, evaporates faster
        const pSize = isTerpene ? 0.22 : 0.35;
        const pMat = new THREE.MeshPhongMaterial({
          color: isTerpene ? ATOM_COLORS.TERPENE : ATOM_COLORS.CBD_GOLD,
          shininess: 95,
          emissive: isTerpene ? 0x331a00 : 0x332200,
          emissiveIntensity: 0.5
        });

        const sphere = new THREE.Mesh(sphereGeometry, pMat);
        sphere.scale.set(pSize, pSize, pSize);

        // Position on the heated evaporating bottom floor
        const rx = -4 + Math.random() * 8;
        const ry = -5 + Math.random() * 1.5;
        const rz = -2 + Math.random() * 4;
        sphere.position.set(rx, ry, rz);

        distillationGroup.add(sphere);
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

    // Centering layout adjustments
    moleculeGroup.position.set(0, 0.5, 0);

    // 8. ANIMATION LOOP
    let animationId = 0;
    let clock = new THREE.Clock();
    let decarbAnimationTime = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Core Group Rotations - combines auto-rotation with manual dragging offsets
      const speedCoeff = rotateSpeed * 0.15;
      mainGroup.rotation.y = elapsed * speedCoeff + interactiveRotation.x;
      mainGroup.rotation.x = interactiveRotation.y;

      // REBUILD MOLECULE TRIGGER on mode changes
      if (
        moleculeGroup.children.length === 0 ||
        (showBondsRef.current && viewModeRef.current === 'cpk') ||
        (!showBondsRef.current && viewModeRef.current !== 'cpk')
      ) {
        // Redraw only when needed to maintain high performance
      }

      // --- STAGE-SPECIFIC ANIMATION ENHANCEMENTS ---
      const activeStageCurrent = activeStageTypeRef.current;
      const currentConfig = configRef.current;

      // A. EXTRACTION SOLVENT FLOW
      if (activeStageCurrent === 'extraction' && solventGroup.children.length > 0) {
        const agitation = currentConfig.agitationSpeed || 300;
        const temp = currentConfig.extractionTemp || -40;

        // Swirling vortex math
        const rotationSpeed = (agitation / 1000) * 0.08 + 0.01;
        const thermalJitter = Math.max((temp + 80) / 120, 0.05) * 0.05;

        solventParticles.forEach((particle, idx) => {
          // Spiral angle update
          particle.angle += rotationSpeed;
          particle.mesh.position.x = Math.cos(particle.angle) * particle.radius;
          particle.mesh.position.z = Math.sin(particle.angle) * particle.radius;

          // Gentle vertical rise and fall
          particle.mesh.position.y += particle.speedY * (1.0 + thermalJitter * 5);
          if (particle.mesh.position.y < -5.5) {
            particle.mesh.position.y = 5.5; // Loop back up
          }

          // Swirl jitter
          particle.mesh.position.x += (Math.random() - 0.5) * thermalJitter;
          particle.mesh.position.y += (Math.random() - 0.5) * thermalJitter;
          particle.mesh.position.z += (Math.random() - 0.5) * thermalJitter;
        });
      }

      // B. WINTERIZATION CRYSTALLIZATION & LIPID LOCK
      if (activeStageCurrent === 'winterization' && lipidChains.length > 0) {
        const coolingTemp = currentConfig.coolingTemp || -40;
        const isFrozen = coolingTemp <= -30;

        // Interpolation factor driving crystallization ordering
        // At -40C, crystallize factor = 1.0. At 0C, crystallize factor = 0.0
        const crystallizeFactor = Math.min(Math.max((0 - coolingTemp) / 40, 0), 1.0);

        lipidChains.forEach((chain, cIdx) => {
          const sphereMeshes = chain.mesh.children as THREE.Mesh[];

          chain.points.forEach((pt, idx) => {
            const initialPt = chain.initialPositions[idx];
            const sphere = sphereMeshes[idx];
            if (!sphere) return;

            // Thermal kinetic wiggle (vibration decreases as temperature drops)
            const wiggleAmp = (1.0 - crystallizeFactor) * 0.35 + 0.05;
            const wiggleX = Math.sin(elapsed * 5 + idx + cIdx) * wiggleAmp;
            const wiggleZ = Math.cos(elapsed * 4 + idx - cIdx) * wiggleAmp;

            // Align lipid nodes in an orderly crystalline lattice when frozen
            const targetX = initialPt.x + (crystallizeFactor * Math.sin(idx) * 0.15);
            const targetY = initialPt.y;
            const targetZ = initialPt.z;

            pt.x = THREE.MathUtils.lerp(pt.x, targetX + wiggleX, 0.08);
            pt.y = THREE.MathUtils.lerp(pt.y, targetY, 0.08);
            pt.z = THREE.MathUtils.lerp(pt.z, targetZ + wiggleZ, 0.08);

            sphere.position.copy(pt);

            // Change lipid colors to frozen turquoise highlight as they crystallize
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

      // C. DECARBOXYLATION CARBOXYL BREAK-OFF & FLIGHT
      // If we are decarboxylating, we animate the CO2 group snapping and floating off-screen
      if (activeStageCurrent === 'decarboxylation') {
        const temp = currentConfig.temperature || 120;
        // Thermal atomic excitation (vibrates more at higher reaction temps)
        const excitation = Math.max((temp - 90) / 70, 0.1) * 0.08;

        // Apply visual jitter to all regular meshes
        regularAtomMeshes.forEach(({ mesh }) => {
          mesh.position.x += (Math.random() - 0.5) * excitation;
          mesh.position.y += (Math.random() - 0.5) * excitation;
          mesh.position.z += (Math.random() - 0.5) * excitation;
        });

        // Decarboxylation animation sequence
        if (isDecarboxylating && !isDecarboxylatedRef.current) {
          decarbAnimationTime += delta;

          // 1. Double the cleavage vibration as warning
          if (reactionBondMesh) {
            reactionBondMesh.position.x += (Math.random() - 0.5) * 0.18;
            reactionBondMesh.position.y += (Math.random() - 0.5) * 0.18;
          }

          // 2. Break connection and fly away!
          if (decarbAnimationTime > 1.2) {
            // Snapped! Hide the linking bond
            if (reactionBondMesh) {
              reactionBondMesh.visible = false;
            }

            // Move the carboxyl atoms together upward-right as a CO2 bubble
            const driftSpeedY = 0.07;
            const driftSpeedX = -0.02;

            carboxylObjects.forEach(({ mesh, initialPos, atomId }) => {
              // Drift offset
              mesh.position.y += driftSpeedY;
              mesh.position.x += driftSpeedX;
              mesh.position.z += Math.sin(elapsed * 8) * 0.02;

              // Rotate the drifting group
              mesh.rotateOnAxis(new THREE.Vector3(0, 1, 1).normalize(), 0.04);

              // Scale down/fade carboxyl atoms as they exit
              if (mesh.position.y > 6.0) {
                const s = Math.max(mesh.scale.x - 0.02, 0);
                mesh.scale.set(s, s, s);
              }
            });

            // Finish reaction state
            if (decarbAnimationTime > 4.2) {
              setIsDecarboxylated(true);
              setIsDecarboxylating(false);
              decarbAnimationTime = 0;
            }
          }
        }
      }

      // D. DISTILLATION VAPORIZATION & CONDENSATION
      if (activeStageCurrent === 'distillation' && distillParticles.length > 0) {
        const evapTemp = currentConfig.evaporatorTemp || 185;
        const vacPressure = currentConfig.vacuumPressure || 0.05;

        // Lighter vacuum = lower boiling point = higher kinetic speeds
        const boilingPointFactor = Math.max(1.0 - vacPressure, 0.2);
        const thermalEnergy = Math.max((evapTemp - 140) / 100, 0.1) * boilingPointFactor * 1.5;

        distillParticles.forEach((part, idx) => {
          part.cycle += 0.04;

          if (thermalEnergy > 0.2) {
            // Particle starts to evaporate
            part.mesh.position.y += part.speedY * thermalEnergy;
            part.mesh.position.x += Math.sin(part.cycle) * 0.05;

            // Condense on the cold finger at top (Y >= 4.0)
            if (part.mesh.position.y >= 4.0) {
              // Sliding down the side of the receiver tube
              part.mesh.position.y = -5.0; // Loop back to the heater bath for simulation
              part.mesh.position.x = -4.0 + Math.random() * 8;
            }
          } else {
            // Hot puddle jitter at bottom
            part.mesh.position.y = part.initialY + (Math.sin(elapsed * 12 + idx) * 0.08);
          }
        });
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [rotateSpeed, isDecarboxylated, activeStageType]); // Re-init on hard parameters change

  // Get descriptive details based on the selected stage
  const getSubstrateDetails = () => {
    switch (activeStageType) {
      case 'extraction':
        return {
          title: 'Vortex Solvent Extraction Substrate',
          desc: `Visualizing standard molecular structures of raw CBD Acid (CBDA) surrounded by a rushing phase of ${stageConfig.solventType || 'Ethanol'} solvent.`,
          metrics: [
            { label: 'Solvent Flow', value: `${((stageConfig.agitationSpeed || 300) / 10).toFixed(0)} mL/s` },
            { label: 'Solvent Ratio', value: `${(stageConfig.solventRatio || 8.0).toFixed(1)} L/kg` },
            { label: 'Thermal Jitter', value: `${Math.max((stageConfig.extractionTemp + 80) / 1.2, 0).toFixed(0)}%` }
          ]
        };
      case 'winterization':
        return {
          title: 'Co-solvent Freezing Crystallization Lattice',
          desc: 'Simulating the critical precipitation boundary. Standard phytochem waxes and heavy lipids crystallize into locked solid matrices while pure CBD molecules remain in the liquid supernatant.',
          metrics: [
            { label: 'Wax Crystal Order', value: (stageConfig.coolingTemp || -40) <= -30 ? '99.4% Highly Crystalline' : 'Amorphous Dispersion' },
            { label: 'Precipitation Threshold', value: '-30°C Critical Bound' },
            { label: 'Wax Density', value: '0.865 g/cm³' }
          ]
        };
      case 'decarboxylation':
        return {
          title: 'Arrhenius Thermal CO₂ Bond Cleavage',
          desc: isDecarboxylated 
            ? 'Reaction Completed. CBDA has been fully decarboxylated into CBD. Pure carbon dioxide gas was evolved and evacuated safely.'
            : isDecarboxylating
              ? 'Reaction in progress. The covalent bond connecting the carboxyl group (-COOH) is breaking under high temperature thermal excitation...'
              : 'Decarboxylation ready. Thermal excitation of the carboxyl group on the phytochem ring structure. Trigger to observe CO2 extraction.',
          metrics: [
            { label: 'Kinetic Rate', value: `${(2.45e11 * Math.exp(-126000 / (8.314 * ((stageConfig.temperature || 120) + 273.15)))).toExponential(3)} s⁻¹` },
            { label: 'Molecular Form', value: isDecarboxylated ? 'CBD (Active)' : 'CBDA (Acidic)' },
            { label: 'Thermal Vibration', value: `${(stageConfig.temperature || 120) > 130 ? 'Extremely High' : 'Moderate'}` }
          ]
        };
      case 'distillation':
        return {
          title: 'Kinetic Evaporation Column Path',
          desc: 'Visualizing fractional boiling point separation. Highly kinetic orange terpene molecules vaporize rapidly and condense on the cold finger collector first, leaving the heavier golden cannabinoids.',
          metrics: [
            { label: 'Evaporation Speed', value: `${(stageConfig.feedRate || 1.5).toFixed(1)} kg/hr` },
            { label: 'Vacuum Pressure', value: `${(stageConfig.vacuumPressure || 0.05).toFixed(3)} mbar` },
            { label: 'Mean Free Path', value: `${(0.05 / (stageConfig.vacuumPressure || 0.05)).toFixed(1)} cm` }
          ]
        };
      default:
        return {
          title: 'Molecular Substrate Explorer',
          desc: 'Phytochemical structures and solvent vectors.',
          metrics: []
        };
    }
  };

  const info = getSubstrateDetails();

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl relative">
      
      {/* Visualizer header */}
      <div className="bg-[#0b0b0c] p-4 border-b border-[#1f1f21] flex justify-between items-center flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4.5 h-4.5 text-blue-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-widest font-mono flex items-center gap-1.5">
              Real-Time 3D Chemical Pipeline View
            </h3>
            <p className="text-[8.5px] text-gray-500 font-mono">Dynamic Molecular and Phase Changes Interaction</p>
          </div>
        </div>

        {/* View Mode Selectors */}
        <div className="flex bg-[#121214] border border-[#1f1f21] rounded-lg p-0.5 text-[8.5px] font-mono uppercase tracking-wider font-bold">
          <button
            type="button"
            onClick={() => setViewMode('ball-stick')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'ball-stick' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Ball-Stick
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cpk')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'cpk' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            CPK Space
          </button>
          <button
            type="button"
            onClick={() => setViewMode('electron-wire')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'electron-wire' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Electron Cloud
          </button>
          <button
            type="button"
            onClick={() => setViewMode('thermal')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'thermal' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Thermal map
          </button>
        </div>
      </div>

      {/* Main Canvas Container */}
      <div 
        ref={containerRef} 
        className="relative bg-[#0a0a0b] cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <canvas ref={canvasRef} className="w-full h-[340px] block" />

        {/* Overlay HUD displaying current physical properties */}
        <div className="absolute top-4 left-4 p-3 bg-[#0d0d0f]/90 border border-[#1f1f21] rounded-xl font-mono text-[9px] text-gray-400 space-y-1 backdrop-blur pointer-events-none max-w-xs">
          <span className="text-blue-400 font-bold uppercase text-[10px] block">{info.title}</span>
          <p className="text-[8px] text-gray-500 leading-relaxed uppercase mt-1">{info.desc}</p>
        </div>

        {/* Rotational Indicator */}
        <div className="absolute bottom-4 left-4 p-2.5 bg-[#0d0d0f]/90 border border-[#1f1f21] rounded-xl font-mono text-[8px] text-gray-500 backdrop-blur pointer-events-none">
          <span>DRAG CANVAS TO ROTATE CAMERA</span>
        </div>

        {/* Decarboxylation trigger overlay */}
        {activeStageType === 'decarboxylation' && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {!isDecarboxylated && !isDecarboxylating && (
              <button
                type="button"
                onClick={triggerDecarboxylation}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-bold font-mono text-[9px] uppercase tracking-wider rounded-xl shadow-lg cursor-pointer transition-all flex items-center gap-1.5 animate-pulse"
              >
                <Flame className="w-3.5 h-3.5" />
                Trigger CO2 Decarb
              </button>
            )}

            {isDecarboxylating && (
              <div className="px-3.5 py-2 bg-red-950/80 border border-red-500/30 text-red-400 font-bold font-mono text-[9px] uppercase tracking-wider rounded-xl flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Breaking -COOH Bonds...
              </div>
            )}

            {isDecarboxylated && (
              <div className="flex gap-1.5 items-center">
                <span className="px-3 py-2 bg-emerald-950/80 border border-emerald-500/30 text-emerald-400 font-bold font-mono text-[9px] uppercase tracking-wider rounded-xl">
                  Decarboxylated CBD
                </span>
                <button
                  type="button"
                  onClick={resetDecarboxylation}
                  className="p-2 bg-[#0d0d0f]/90 border border-[#1f1f21] text-[#666] hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Reset molecular model"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control sliders and dynamic chemical properties */}
      <div className="p-5 bg-[#0b0b0c] border-t border-[#1f1f21] grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Rotation Speed adjustment */}
        <div className="md:col-span-4 flex flex-col justify-center">
          <label className="text-[9px] font-bold text-[#666] uppercase tracking-widest font-mono flex justify-between mb-2">
            <span>Model Auto-Rotation</span>
            <span className="text-blue-400">{(rotateSpeed).toFixed(1)} rad/s</span>
          </label>
          <input
            type="range"
            min="0.0"
            max="4.0"
            step="0.2"
            value={rotateSpeed}
            onChange={(e) => setRotateSpeed(parseFloat(e.target.value))}
            className="w-full h-1 bg-[#1b1b1e] rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Dynamic Metric indicators */}
        <div className="md:col-span-8 grid grid-cols-3 gap-3">
          {info.metrics.map((metric, idx) => (
            <div key={idx} className="p-3 bg-[#121214] border border-[#1f1f21] rounded-xl text-center">
              <span className="text-[8px] font-mono text-gray-500 uppercase tracking-widest block mb-0.5">{metric.label}</span>
              <span className="text-[11px] font-mono font-bold text-white uppercase">{metric.value}</span>
            </div>
          ))}
        </div>

      </div>

    </div>
  );
}
