import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { StageType, StageConfig } from './molecule3dVisualizer/types.ts';
import { setupScene } from './molecule3dVisualizer/sceneSetup.ts';
import { getSubstrateDetails } from './molecule3dVisualizer/hudHelpers.ts';
import { createAtom, createBond, disposeGeometryCaches, VisualizationMode } from './molecule3dVisualizer/moleculeModel.ts';
import { setupStageEnvironment, updateStageAnimations, ParticleState } from './molecule3dVisualizer/stageEffects.ts';
import { cannabinoidAtoms, cannabinoidBonds } from './molecule3dVisualizer/data.ts';
import { Activity, Flame, RefreshCw } from 'lucide-react';

interface Molecule3DVisualizerProps {
  activeStageType: StageType;
  stageConfig: StageConfig;
  results: any;
}

export function Molecule3DVisualizer({
  activeStageType,
  stageConfig,
  results
}: Molecule3DVisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI Control states
  const [viewMode, setViewMode] = useState<VisualizationMode>('ball-stick');
  const [rotateSpeed, setRotateSpeed] = useState<number>(1.5);
  const [showBonds, _setShowBonds] = useState<boolean>(true);
  const [isDecarboxylated, setIsDecarboxylated] = useState<boolean>(false);
  const [isDecarboxylating, setIsDecarboxylating] = useState<boolean>(false);

  // Interactive rotation references (drag behavior)
  const interactiveRotationRef = useRef<{ x: number; y: number }>({ x: 0.1, y: 0.1 });
  const isDraggingRef = useRef(false);
  const previousMousePositionRef = useRef({ x: 0, y: 0 });

  // Scene state and loop synchronization refs
  const viewModeRef = useRef(viewMode);
  const showBondsRef = useRef(showBonds);
  const isDecarboxylatedRef = useRef(isDecarboxylated);
  const isDecarboxylatingRef = useRef(isDecarboxylating);
  const activeStageTypeRef = useRef(activeStageType);
  const configRef = useRef(stageConfig);
  const rotateSpeedRef = useRef(rotateSpeed);

  // Sync refs instantly on every state update
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);
  useEffect(() => { showBondsRef.current = showBonds; }, [showBonds]);
  useEffect(() => { isDecarboxylatedRef.current = isDecarboxylated; }, [isDecarboxylated]);
  useEffect(() => { isDecarboxylatingRef.current = isDecarboxylating; }, [isDecarboxylating]);
  useEffect(() => { activeStageTypeRef.current = activeStageType; }, [activeStageType]);
  useEffect(() => { configRef.current = stageConfig; }, [stageConfig]);
  useEffect(() => { rotateSpeedRef.current = rotateSpeed; }, [rotateSpeed]);

  // Reset decarboxylation status when stage changes
  useEffect(() => {
    if (activeStageType !== 'decarboxylation') {
      setIsDecarboxylated(false);
      setIsDecarboxylating(false);
    }
  }, [activeStageType]);

  // Handle Drag-to-Rotate Mouse Events
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    interactiveRotationRef.current.x += deltaX * 0.005;
    interactiveRotationRef.current.y += deltaY * 0.005;

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Trigger decarboxylation event
  const triggerDecarboxylation = () => {
    if (activeStageType !== 'decarboxylation' || isDecarboxylating || isDecarboxylated) return;
    setIsDecarboxylating(true);
  };

  const resetDecarboxylation = () => {
    setIsDecarboxylated(false);
    setIsDecarboxylating(false);
  };

  // --- MOUNT THE SCENE ONCE & MANAGE RUNTIME UPDATE LOOPS ---
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = 340;

    // 1. Initialise core Three.js environment
    const { scene, camera, renderer } = setupScene(canvasRef.current, width, height);

    // 2. Setup structural groups
    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    const moleculeGroup = new THREE.Group();
    mainGroup.add(moleculeGroup);
    moleculeGroup.position.set(0, 0.5, 0);

    const solventGroup = new THREE.Group();
    mainGroup.add(solventGroup);

    const lipidGroup = new THREE.Group();
    mainGroup.add(lipidGroup);

    const distillationGroup = new THREE.Group();
    mainGroup.add(distillationGroup);

    const sceneGroups = { solventGroup, lipidGroup, distillationGroup };

    // Common reused sphere geometry for atoms/particles
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);

    // Carboxyl animation objects references
    const carboxylObjects: { mesh: THREE.Mesh; initialPos: THREE.Vector3; atomId: number }[] = [];
    const regularAtomMeshes: { mesh: THREE.Mesh; atom: any }[] = [];
    const regularBondMeshes: { mesh: THREE.Mesh; bond: any }[] = [];
    let reactionBondMesh: THREE.Mesh | null = null;

    // 3. Helper to rebuild the main Cannabinoid Molecule Group
    const rebuildMolecule = () => {
      // Clean previous children completely
      while (moleculeGroup.children.length > 0) {
        const child = moleculeGroup.children[0];
        moleculeGroup.remove(child);
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      }

      carboxylObjects.length = 0;
      regularAtomMeshes.length = 0;
      regularBondMeshes.length = 0;
      reactionBondMesh = null;

      const isDecarbDone = isDecarboxylatedRef.current;
      const currentMode = viewModeRef.current;
      const currentTemp = (configRef.current as any).temperature || (configRef.current as any).extractionTemp || 25;

      // Keep temporary tracking map of created atom meshes by id
      const atomsMap = new Map<number, THREE.Mesh>();

      // A. Populate Atoms
      cannabinoidAtoms.forEach((atom) => {
        // Skip carboxyl atoms if reaction has finished
        if (atom.isCarboxyl && isDecarbDone) return;

        const atomMesh = createAtom(atom, sphereGeometry, currentMode, {
          temperature: currentTemp
        });
        atomsMap.set(atom.id, atomMesh);

        if (atom.isCarboxyl) {
          carboxylObjects.push({
            mesh: atomMesh,
            initialPos: new THREE.Vector3(...atom.pos),
            atomId: atom.id
          });
        } else {
          regularAtomMeshes.push({ mesh: atomMesh, atom });
        }

        moleculeGroup.add(atomMesh);
      });

      // B. Populate Bonds
      if (showBondsRef.current && currentMode !== 'cpk') {
        cannabinoidBonds.forEach((bond) => {
          if (bond.isCarboxyl && isDecarbDone) return;

          const bondMesh = createBond(bond, atomsMap, currentMode);
          if (!bondMesh) return;

          // Orient custom bond details
          const mat = bondMesh.material as THREE.MeshPhongMaterial;
          if (mat) {
            mat.transparent = true;
            mat.opacity = currentMode === 'electron-wire' ? 0.2 : 0.85;
            if (bond.isCarboxyl) {
              mat.color.setHex(0xcc9933);
            }
          }

          const fromAtom = cannabinoidAtoms.find(a => a.id === bond.from);
          const toAtom = cannabinoidAtoms.find(a => a.id === bond.to);
          const p1 = new THREE.Vector3(...(fromAtom?.pos || [0, 0, 0]));
          const p2 = new THREE.Vector3(...(toAtom?.pos || [0, 0, 0]));
          const midPoint = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);

          if (bond.from === 4 && bond.to === 24) {
            reactionBondMesh = bondMesh;
          } else if (bond.isCarboxyl) {
            carboxylObjects.push({
              mesh: bondMesh,
              initialPos: midPoint.clone(),
              atomId: -bond.from
            });
          } else {
            regularBondMeshes.push({ mesh: bondMesh, bond });
          }

          moleculeGroup.add(bondMesh);
        });
      }
    };

    // Initial molecule build
    rebuildMolecule();

    // 4. Initialise stage environment particles
    let particleState: ParticleState = setupStageEnvironment(
      activeStageTypeRef.current,
      configRef.current,
      sceneGroups,
      { sphere: sphereGeometry }
    );

    // Track state variations to trigger targeted rebuilds inside the animation loop
    let lastStage = activeStageTypeRef.current;
    let lastConfigStr = JSON.stringify(configRef.current);
    let lastMode = viewModeRef.current;
    let lastDecarbDone = isDecarboxylatedRef.current;

    // 5. ANIMATION & EVENT LOOP
    let animationId = 0;
    const clock = new THREE.Clock();
    let decarbAnimationTime = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Check for structural rebuild triggers (allows reactive updates without tearing down WebGL canvas)
      const currentStage = activeStageTypeRef.current;
      const currentConfigStr = JSON.stringify(configRef.current);
      const currentMode = viewModeRef.current;
      const currentDecarbDone = isDecarboxylatedRef.current;

      const stageOrConfigChanged = currentStage !== lastStage || currentConfigStr !== lastConfigStr;
      const renderModeOrDecarbChanged = currentMode !== lastMode || currentDecarbDone !== lastDecarbDone;

      if (stageOrConfigChanged) {
        // Switch the environmental background phase simulation
        particleState = setupStageEnvironment(currentStage, configRef.current, sceneGroups, { sphere: sphereGeometry });
        lastStage = currentStage;
        lastConfigStr = currentConfigStr;
      }

      if (stageOrConfigChanged || renderModeOrDecarbChanged) {
        rebuildMolecule();
        lastMode = currentMode;
        lastDecarbDone = currentDecarbDone;
      }

      // Rotate camera group (combine rotation speed + interactive dragging offsets)
      const speedCoeff = rotateSpeedRef.current * 0.15;
      mainGroup.rotation.y = elapsed * speedCoeff + interactiveRotationRef.current.x;
      mainGroup.rotation.x = interactiveRotationRef.current.y;

      // Real-time Stage Kinetics
      updateStageAnimations(currentStage, configRef.current, sceneGroups, particleState, elapsed, delta);

      // Decarboxylation Splitting Sequence
      if (currentStage === 'decarboxylation') {
        const temp = (configRef.current as any).temperature || 120;
        const excitation = Math.max((temp - 90) / 70, 0.1) * 0.08;

        // Visual jitter to evoke thermal heat excitement
        regularAtomMeshes.forEach(({ mesh }) => {
          mesh.position.x += (Math.random() - 0.5) * excitation;
          mesh.position.y += (Math.random() - 0.5) * excitation;
          mesh.position.z += (Math.random() - 0.5) * excitation;
        });

        if (isDecarboxylatingRef.current && !isDecarboxylatedRef.current) {
          decarbAnimationTime += delta;

          // Break bonding connection and fly away!
          if (reactionBondMesh) {
            reactionBondMesh.position.x += (Math.random() - 0.5) * 0.18;
            reactionBondMesh.position.y += (Math.random() - 0.5) * 0.18;
          }

          if (decarbAnimationTime > 1.2) {
            if (reactionBondMesh) {
              reactionBondMesh.visible = false;
            }

            const driftSpeedY = 0.07;
            const driftSpeedX = -0.02;

            carboxylObjects.forEach(({ mesh }) => {
              mesh.position.y += driftSpeedY;
              mesh.position.x += driftSpeedX;
              mesh.position.z += Math.sin(elapsed * 8) * 0.02;

              mesh.rotateOnAxis(new THREE.Vector3(0, 1, 1).normalize(), 0.04);

              // Scale down/fade carboxyl group as it escapes standard camera view
              if (mesh.position.y > 6.0) {
                const s = Math.max(mesh.scale.x - 0.02, 0);
                mesh.scale.set(s, s, s);
              }
            });

            if (decarbAnimationTime > 4.2) {
              setIsDecarboxylated(true);
              setIsDecarboxylating(false);
              decarbAnimationTime = 0;
            }
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // 6. Responsive Resize Handling
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const w = containerRef.current.clientWidth;
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
      renderer.setSize(w, height);
    };

    window.addEventListener('resize', handleResize);

    // 7. Component Unmount / Cleanup
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      sphereGeometry.dispose();
      disposeGeometryCaches();
    };
  }, []); // Bound strictly once to persist WebGL contexts safely

  const info = getSubstrateDetails(activeStageType, stageConfig, isDecarboxylated, isDecarboxylating);

  return (
    <div id="molecule-3d-visualizer" className="bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden shadow-2xl relative">
      
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
            id="btn-view-mode-ball-stick"
            type="button"
            onClick={() => setViewMode('ball-stick')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'ball-stick' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Ball-Stick
          </button>
          <button
            id="btn-view-mode-cpk"
            type="button"
            onClick={() => setViewMode('cpk')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'cpk' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            CPK Space
          </button>
          <button
            id="btn-view-mode-electron-wire"
            type="button"
            onClick={() => setViewMode('electron-wire')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${viewMode === 'electron-wire' ? 'bg-[#1b1b1e] text-blue-400 border border-[#2d2d30]' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Electron Cloud
          </button>
          <button
            id="btn-view-mode-thermal"
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
                id="btn-trigger-decarb"
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
                  id="btn-reset-decarb"
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
            id="range-rotation-speed"
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
