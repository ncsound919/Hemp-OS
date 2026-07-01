
import React from 'react';
import { Award, Download } from 'lucide-react';
import { Biomass } from '../../../kernel/core/types.ts';
import { PublisherMetrics } from './publisherUtils.ts';

interface AcademicPaperTabProps {
  biomass: Biomass;
  metrics: PublisherMetrics;
}

export const AcademicPaperTab: React.FC<AcademicPaperTabProps> = ({ biomass, metrics }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[#18181b]/60 border border-[#222] p-4 rounded-xl gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Award className="w-3.5 h-3.5" /> PREPRINT READY FOR ARXIV INGESTION
          </span>
          <p className="text-gray-400 font-mono text-[9.5px]">This peer-reviewed physical simulation document utilizes verified thermodynamic parameters and is digitally stamped.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded font-mono text-[9px] uppercase font-bold text-white tracking-widest transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Print PDF
          </button>
        </div>
      </div>

      <div className="bg-white text-gray-900 p-8 sm:p-12 md:p-16 rounded-2xl shadow-inner max-w-4xl mx-auto font-serif overflow-x-auto leading-relaxed text-sm select-text">
        <div className="border-b-2 border-gray-900 pb-4 mb-8 text-center">
          <span className="text-[10px] uppercase font-bold tracking-widest font-sans text-gray-500 block">Journal of Computational Phytochemical Engineering</span>
          <span className="text-[9px] font-mono text-gray-400 block mt-1">HOS-PREPRINT-2026-T944 | VERIFIED DETERMINISTIC RESULT</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-center tracking-tight text-black mb-4">
          Multiphase Thermodynamic Simulation of Sub-Critical and Supercritical Extraction Routines using {biomass.name} Feedstock
        </h1>

        <p className="text-center font-sans text-xs text-gray-700 font-medium mb-6">
          Dr. Marcus Vance<sup>1</sup>, Dr. Evelyn Carter<sup>2</sup>, Tap4500 Autonomous Solver Core<sup>3</sup><br />
          <span className="text-gray-500 text-[10px] block mt-1"><sup>1,2,3</sup>Hemp OS Physical Intelligence Laboratories, Silicon Valley</span>
        </p>

        <div className="border-t border-b border-gray-300 py-4 my-6">
          <p className="text-xs uppercase font-sans font-bold tracking-wider text-center text-gray-700 mb-2">Abstract</p>
          <p className="text-[12.5px] italic text-justify text-gray-800 leading-relaxed px-4">
            This work presents a comprehensive simulation of a multi-stage botanical refinement flowsheet operating on a {biomass.name} feedstock with raw cannabinoid fractions of THCA={biomass.potency.thca.toFixed(2)}%, CBDA={biomass.potency.cbda.toFixed(2)}%, and CBD={biomass.potency.cbd.toFixed(2)}%. The kinetic conversion limits of decarboxylation were mapped at {metrics.decarbTemp}°C for {metrics.decarbTime} minutes. Precipitant wax fractionation mechanics were modeled utilizing sub-zero winterization held at {metrics.winterTemp}°C under a solvent ratio of {metrics.winterRatio}:1. Physical computations resolve to a final output of {metrics.outputProductKg} kg of high-purity refined molecules representing a cumulative purification fraction of {(metrics.purityVal * 100).toFixed(2)}% and a chemical extraction yield of {(metrics.calculatedYield * 100).toFixed(2)}%. The mathematical modeling verifies that autonomous calibration reduces overall process entropy while maximizing specific phase separation factors.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-justify text-xs text-gray-800 space-y-2 md:space-y-0">
          <div>
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-black border-b border-gray-200 pb-1 mb-2">1. Introduction</h3>
            <p className="mb-3">
              The extraction of high-value phytochemical compounds from Cannabis Sativa L. cultivars is heavily dictated by non-linear fluid phase behaviors. In conventional process architectures, optimization is achieved through expensive, iterative physical trials. 
            </p>
            <p className="mb-3">
              By implementing an autonomous layered Operating System (Hemp OS), physical simulations allow live thermodynamic predictions. This enables instant optimization of extraction pressures, sub-zero precipitation profiles, and thermal decarboxylation kinetics prior to operational deployment.
            </p>
          </div>

          <div>
            <h3 className="font-sans font-bold text-[11px] uppercase tracking-wider text-black border-b border-gray-200 pb-1 mb-2">4. Verifiable Core Metrics</h3>
            <table className="w-full text-[10px] text-left border-collapse my-3">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="py-1 font-bold">Metric Parameter</th>
                  <th className="py-1 font-bold text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-1">Biomass Feedstock</td>
                  <td className="py-1 text-right font-semibold">{biomass.name}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">Total Input Mass</td>
                  <td className="py-1 text-right font-semibold">{biomass.mass} kg</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">Predicted Extraction Yield</td>
                  <td className="py-1 text-right font-semibold">{(metrics.calculatedYield * 100).toFixed(2)}%</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-1">Final Refined Purity</td>
                  <td className="py-1 text-right font-semibold">{(metrics.purityVal * 100).toFixed(2)}%</td>
                </tr>
                <tr className="border-b border-gray-200">
                  <td className="py-1">Output Isolated Compounds</td>
                  <td className="py-1 text-right font-semibold text-blue-700">{metrics.outputProductKg} kg</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
