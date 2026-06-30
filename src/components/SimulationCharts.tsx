/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Sliders, Activity, Info } from 'lucide-react';

interface SimulationChartsProps {
  results: any;
  biomass: any;
  activeStageId: string;
  stages: any[];
}

export const SimulationCharts: React.FC<SimulationChartsProps> = ({
  results,
  biomass,
  activeStageId,
  stages,
}) => {
  if (!results || !results.results) {
    return (
      <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-6 text-center text-[#666] flex flex-col items-center justify-center gap-3 min-h-[300px]">
        <Activity className="w-8 h-8 text-[#2d2d30] animate-pulse" />
        <p className="text-xs font-semibold uppercase tracking-wider">Please trigger the "Run Simulation" solver to compute the physical process graph outputs.</p>
      </div>
    );
  }

  const { stagesResults } = results.results;

  // 1. Gather Cannabinoid Potencies across steps
  // We will trace the THCA, THC, CBDA, CBD, CBGA, and Other concentrations (wt%)
  const stepsData = [
    {
      name: '1. Biomass',
      THCA: biomass.potency.thca,
      THC: biomass.potency.thc,
      CBDA: biomass.potency.cbda,
      CBD: biomass.potency.cbd,
      CBGA: biomass.potency.cbga,
      Other: biomass.potency.other,
    }
  ];

  // Find extraction stage result
  const extStage = stages.find(s => s.type === 'extraction');
  if (extStage && stagesResults[extStage.id]) {
    const extOut = stagesResults[extStage.id].output;
    const totalGrams = (Object.values(extOut.cannabinoidRecovery) as number[]).reduce((a: number, b: number) => a + b, 0);
    const crudeMassKg = (totalGrams / 1000) + extOut.waxExtracted + (biomass.mass * 0.015);
    
    stepsData.push({
      name: '2. Crude Oil',
      THCA: crudeMassKg > 0 ? ((extOut.cannabinoidRecovery.thca / 1000) / crudeMassKg) * 100 : 0,
      THC: crudeMassKg > 0 ? ((extOut.cannabinoidRecovery.thc / 1000) / crudeMassKg) * 100 : 0,
      CBDA: crudeMassKg > 0 ? ((extOut.cannabinoidRecovery.cbda / 1000) / crudeMassKg) * 100 : 0,
      CBD: crudeMassKg > 0 ? ((extOut.cannabinoidRecovery.cbd / 1000) / crudeMassKg) * 100 : 0,
      CBGA: crudeMassKg > 0 ? ((extOut.cannabinoidRecovery.cbga / 1000) / crudeMassKg) * 100 : 0,
      Other: crudeMassKg > 0 ? ((extOut.cannabinoidRecovery.other / 1000) / crudeMassKg) * 100 : 0,
    });
  }

  // Find winterization stage result
  const wintStage = stages.find(s => s.type === 'winterization');
  if (wintStage && stagesResults[wintStage.id]) {
    const wintOut = stagesResults[wintStage.id].output;
    const initialCrudeResult = stepsData[stepsData.length - 1];
    
    // Scale cannabinoids by winterization recovery
    const mult = wintOut.cannabinoidRecoveryRate / 100;
    stepsData.push({
      name: '3. Dewaxed',
      THCA: initialCrudeResult ? initialCrudeResult.THCA * mult : 0,
      THC: initialCrudeResult ? initialCrudeResult.THC * mult : 0,
      CBDA: initialCrudeResult ? initialCrudeResult.CBDA * mult : 0,
      CBD: initialCrudeResult ? initialCrudeResult.CBD * mult : 0,
      CBGA: initialCrudeResult ? initialCrudeResult.CBGA * mult : 0,
      Other: initialCrudeResult ? initialCrudeResult.Other * mult : 0,
    });
  }

  // Find decarb stage result
  const decarbStage = stages.find(s => s.type === 'decarboxylation');
  if (decarbStage && stagesResults[decarbStage.id]) {
    const decarbOut = stagesResults[decarbStage.id].output;
    const prof = decarbOut.finalCannabinoidProfile;
    
    stepsData.push({
      name: '4. Decarbed',
      THCA: prof.thca,
      THC: prof.thc,
      CBDA: prof.cbda,
      CBD: prof.cbd,
      CBGA: prof.cbga,
      Other: prof.other,
    });
  }

  // Find distillation stage result
  const distStage = stages.find(s => s.type === 'distillation');
  if (distStage && stagesResults[distStage.id]) {
    const distOut = stagesResults[distStage.id].output;
    const initialDecarbResult = stepsData[stepsData.length - 1] || stepsData[stepsData.length - 2];
    
    // Scale cannabinoids to represent the final high-purity distillate
    const cannabinoidSum = (initialDecarbResult?.THC || 0) + (initialDecarbResult?.CBD || 0);
    const distillatePurity = distOut.cannabinoidPurity;
    
    // Distillation heart cut concentrates the neutrals and strips out heavy residue
    const scale = distillatePurity / Math.max(0.1, cannabinoidSum);

    stepsData.push({
      name: '5. Distillate',
      THCA: 0, // completely stripped
      THC: initialDecarbResult ? initialDecarbResult.THC * scale : 0,
      CBDA: 0,
      CBD: initialDecarbResult ? initialDecarbResult.CBD * scale : 0,
      CBGA: 0,
      Other: distOut.distillateMass > 0 ? 100 - distillatePurity : 0,
    });
  }

  // 2. Distillation Split Pie Chart
  let distSplitData: any[] = [];
  if (distStage && stagesResults[distStage.id]) {
    const distOut = stagesResults[distStage.id].output;
    distSplitData = [
      { name: 'Hearts (Distillate)', value: distOut.distillateMass, color: '#3b82f6' },
      { name: 'Heads (Terpenes)', value: distOut.headsMass, color: '#0ea5e9' },
      { name: 'Tails (Heavy Bottom)', value: distOut.tailsMass, color: '#ef4444' },
    ];
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cannabinoid Profile Progression (Bar Chart) */}
      <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md lg:col-span-2 flex flex-col gap-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#1f1f21]">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-blue-500" />
            <h3 className="font-bold text-white text-xs tracking-wider uppercase">CANNABINOID ENRICHMENT CURVE (wt%)</h3>
          </div>
          <span className="text-[10px] font-mono text-[#555] uppercase tracking-widest font-bold">Step-by-Step Analytical Profile</span>
        </div>

        <div className="h-[250px] w-full text-xs font-mono">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={stepsData}
              margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1f1f21" />
              <XAxis dataKey="name" stroke="#555" fontSize={10} tickLine={false} />
              <YAxis stroke="#555" fontSize={10} unit="%" tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#121214', border: '1px solid #1f1f21', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: any) => [`${parseFloat(value).toFixed(2)}%`]}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                fontSize={10} 
                iconType="circle" 
                formatter={(value) => <span className="text-[#888] font-bold text-[9px] uppercase font-mono tracking-widest">{value}</span>}
              />
              <Bar dataKey="THCA" fill="#10b981" stackId="a" />
              <Bar dataKey="THC" fill="#059669" stackId="a" />
              <Bar dataKey="CBDA" fill="#60a5fa" stackId="a" />
              <Bar dataKey="CBD" fill="#2563eb" stackId="a" />
              <Bar dataKey="CBGA" fill="#a855f7" stackId="a" />
              <Bar dataKey="Other" fill="#3f3f46" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#666] bg-[#0d0d0f] border border-[#1f1f21] p-2.5 rounded-lg">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>This graph models chemical species concentration shifting. Notice acid forms (THCA/CBDA) conversion to neutrals during decarboxylation (step 4) and total cannabinoid concentration in step 5.</span>
        </div>
      </div>

      {/* Distillation Mass Split (Pie Chart) */}
      <div className="bg-[#121214] rounded-xl border border-[#1f1f21] p-5 shadow-md flex flex-col gap-4">
        <div className="flex items-center gap-1.5 pb-2 border-b border-[#1f1f21]">
          <Activity className="w-4 h-4 text-blue-500" />
          <h3 className="font-bold text-white text-xs tracking-wider uppercase">DISTILLATION MASS BALANCE</h3>
        </div>

        {distSplitData.length > 0 ? (
          <div className="flex-1 flex flex-col gap-4 justify-center">
            <div className="h-[140px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distSplitData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {distSplitData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#121214', border: '1px solid #1f1f21', borderRadius: '8px', color: '#fff', fontSize: '11px' }}
                    formatter={(value: any) => [`${parseFloat(value).toFixed(3)} kg`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Customized Legends */}
            <div className="flex flex-col gap-2">
              {distSplitData.map((item, idx) => {
                const total = distSplitData.reduce((acc, i) => acc + i.value, 0);
                const pct = total > 0 ? (item.value / total) * 100 : 0;
                return (
                  <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-[#888] font-bold">{item.name}</span>
                    </div>
                    <span className="font-bold text-white">
                      {item.value.toFixed(3)} kg ({pct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-[#555] p-4 bg-[#0d0d0f] border border-[#1f1f21] rounded-xl min-h-[220px]">
            <Sliders className="w-6 h-6 text-[#2d2d30] mb-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Distillation pass not executed. Connect and execute the distillation stage to analyze fractionation cuts.</p>
          </div>
        )}
      </div>
    </div>
  );
};
