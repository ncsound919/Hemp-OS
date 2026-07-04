/**
 * Strain Lineage Network — Cytoscape.js visualization
 *
 * Visualizes cannabis strain genetics as an interactive network graph:
 *  - Parent strains connect to offspring
 *  - Node size reflects THC potency
 *  - Color reflects strain type (indica/sativa/hybrid)
 *  - Edge thickness reflects genetic similarity
 *
 * Uses Cytoscape.js for GPU-accelerated graph rendering with
 * force-directed (cose) layout for organic clustering.
 */

import React, { useEffect, useRef, useState } from 'react';
import cytoscape, { Core, ElementDefinition } from 'cytoscape';
import { Dna, Info, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface StrainNode {
  id: string;
  name: string;
  type: string;
  thc: number;
  lineage: string[];
}

interface LineageNetworkProps {
  strains: StrainNode[];
  onStrainClick?: (name: string) => void;
  width?: string;
  height?: string;
}

const TYPE_COLORS: Record<string, string> = {
  indica: '#8b5cf6',
  sativa: '#f59e0b',
  hybrid: '#22c55e',
};

export const StrainLineageNetwork: React.FC<LineageNetworkProps> = ({
  strains,
  onStrainClick,
  width = '100%',
  height = '600px',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [selectedStrain, setSelectedStrain] = useState<StrainNode | null>(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);

  useEffect(() => {
    if (!containerRef.current || strains.length === 0) {return;}

    // Build graph elements: nodes for strains, edges for lineage connections
    const elements: ElementDefinition[] = [];
    const addedNodes = new Set<string>();

    for (const strain of strains) {
      if (!addedNodes.has(strain.id)) {
        const thc = strain.thc || 0;
        const size = Math.max(20, Math.min(80, 20 + thc * 2));
        elements.push({
          data: {
            id: strain.id,
            label: strain.name,
            type: strain.type,
            thc,
            size,
          },
          classes: strain.type,
        });
        addedNodes.add(strain.id);
      }

      // Add parent nodes and edges
      for (const parent of strain.lineage || []) {
        const parentId = parent.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        if (!addedNodes.has(parentId)) {
          elements.push({
            data: {
              id: parentId,
              label: parent,
              type: 'unknown',
              thc: 0,
              size: 15,
            },
            classes: 'unknown',
          });
          addedNodes.add(parentId);
        }
        elements.push({
          data: {
            source: parentId,
            target: strain.id,
            label: 'lineage',
          },
        });
      }
    }

    setNodeCount(addedNodes.size);
    setEdgeCount(elements.length - addedNodes.size);

    // Clean up previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            width: 'data(size)',
            height: 'data(size)',
            'background-color': (ele) => {
              const type = ele.data('type');
              return TYPE_COLORS[type] || '#6b7280';
            },
            label: 'data(label)',
            'font-size': '10px',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'text-margin-y': 4,
            color: '#d1d1d1',
            'border-width': 1,
            'border-color': '#333',
            'text-wrap': 'wrap',
            'text-max-width': '80px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#4b5563',
            'target-arrow-color': '#4b5563',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 0.8,
          },
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#3b82f6',
            'shadow-blur': 15,
            'shadow-color': '#3b82f680',
          },
        },
        {
          selector: '.indica',
          style: { 'background-color': '#8b5cf6' },
        },
        {
          selector: '.sativa',
          style: { 'background-color': '#f59e0b' },
        },
        {
          selector: '.hybrid',
          style: { 'background-color': '#22c55e' },
        },
        {
          selector: '.unknown',
          style: { 'background-color': '#4b5563', opacity: 0.6 },
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        idealEdgeLength: 120,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 30,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: () => 8000,
        edgeElasticity: () => 100,
        nestingFactor: 0,
        gravity: 0.25,
        numIter: 1000,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      minZoom: 0.3,
      maxZoom: 3,
    });

    // Click handler
    cy.on('tap', 'node', (event) => {
      const node = event.target;
      const name = node.data('label');
      const strain = strains.find(s => s.name === name) || null;
      setSelectedStrain(strain);
      if (onStrainClick) {onStrainClick(name);}
    });

    // Hover effects
    cy.on('mouseover', 'node', (event) => {
      const node = event.target;
      node.style({
        'border-width': 2,
        'border-color': '#60a5fa',
        'shadow-blur': 10,
        'shadow-color': '#3b82f640',
      });
    });

    cy.on('mouseout', 'node', (event) => {
      const node = event.target;
      node.style({
        'border-width': 1,
        'border-color': '#333',
        'shadow-blur': 0,
      });
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [strains]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.3);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.7);
  const handleReset = () => {
    cyRef.current?.fit(undefined, 30);
    cyRef.current?.center();
  };

  return (
    <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1f1f21]">
        <div className="flex items-center gap-2">
          <Dna className="w-4 h-4 text-emerald-400" />
          <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest">
            Strain Lineage Network
          </span>
          <span className="text-[8px] text-[#555] font-mono">
            {nodeCount} strains · {edgeCount} connections
          </span>
        </div>
        <div className="flex gap-1">
          <button onClick={handleZoomIn} className="p-1.5 hover:bg-[#1a1a1c] rounded text-[#888] hover:text-white transition-colors cursor-pointer">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleZoomOut} className="p-1.5 hover:bg-[#1a1a1c] rounded text-[#888] hover:text-white transition-colors cursor-pointer">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleReset} className="p-1.5 hover:bg-[#1a1a1c] rounded text-[#888] hover:text-white transition-colors cursor-pointer">
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 px-4 py-2 bg-[#0d0d0f] border-b border-[#1f1f21]">
        <span className="flex items-center gap-1.5 text-[9px] text-[#888] font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#8b5cf6]" /> Indica
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-[#888] font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Sativa
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-[#888] font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Hybrid
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-[#888] font-mono">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4b5563]" /> Unlinked
        </span>
        <span className="ml-auto text-[8px] text-[#555] font-mono">
          Node size = THC potency
        </span>
      </div>

      {/* Cytoscape container */}
      <div ref={containerRef} style={{ width, height }} className="bg-[#0a0a0b]" />

      {/* Selection info panel */}
      {selectedStrain && (
        <div className="px-4 py-3 border-t border-[#1f1f21] bg-[#0d0d0f] flex items-start gap-3">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div className="text-[10px] text-[#aaa] space-y-0.5">
            <span className="font-bold text-white">{selectedStrain.name}</span>
            <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
              selectedStrain.type === 'indica' ? 'bg-purple-900/40 text-purple-300' :
              selectedStrain.type === 'sativa' ? 'bg-amber-900/40 text-amber-300' :
              'bg-emerald-900/40 text-emerald-300'
            }`}>{selectedStrain.type}</span>
            <div className="text-[9px] text-[#666] mt-1">
              THC: {selectedStrain.thc?.toFixed(1) || '?'}% · 
              Lineage: {selectedStrain.lineage?.join(', ') || 'Unknown'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrainLineageNetwork;
