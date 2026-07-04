/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Download } from 'lucide-react';
import { SystemAirlock } from './SystemAirlock';
import { InsightsPanel } from './InsightsPanel';
import { StrainsRolodex } from './StrainsRolodex';

// Mirror App types locally or import them from a shared types file
interface KnowledgeItem {
  id: number;
  name: string;
  type: 'strain' | 'study';
  subtitle: string;
  createdAt: string;
}

interface StrainDetail {
  id: number;
  name: string;
  type: string | null;
  thcMin: number | null;
  thcMax: number | null;
  cbdMin: number | null;
  cbdMax: number | null;
  terpeneProfile: string | null;
  effects: string | null;
  medicalUses: string | null;
  source: string | null;
  createdAt: string | null;
}

interface StudyDetail {
  id: number;
  title: string;
  authors: string | null;
  year: number | null;
  journal: string | null;
  doi: string | null;
  abstract: string | null;
  fullTextPath: string | null;
  topicTags: string | null;
  population: string | null;
  dose: string | null;
  route: string | null;
  outcomes: string | null;
  createdAt: string | null;
}

interface MainContentProps {
  selectedEntity: KnowledgeItem | null;
  strainDetail: StrainDetail | null;
  studyDetail: StudyDetail | null;
  relatedStudies: any[];
  activeView: 'strain' | 'study' | 'system' | 'insights';
  isLoading: boolean;
}

function formatPercent(value: number | null | undefined): string {
  if (value == null) return '—';
  // assuming stored as whole number basis points (e.g., 1840 = 18.40%)
  return `${(value / 100).toFixed(1)}%`;
}

export function MainContent({
  selectedEntity,
  strainDetail,
  studyDetail,
  relatedStudies,
  activeView,
  isLoading,
}: MainContentProps) {
  // System airlock view has precedence and doesn't require a selected entity
  if (activeView === 'system') {
    return <SystemAirlock />;
  }

  if (activeView === 'insights') {
    return <InsightsPanel />;
  }

  // Loading skeleton
  if (isLoading && !strainDetail && !studyDetail) {
    return (
      <main className="flex-1 p-8 overflow-hidden">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-1/3 bg-[#1E2124] rounded" />
          <div className="h-5 w-1/4 bg-[#1E2124] rounded" />
          <div className="h-40 w-full bg-[#1E2124] rounded" />
          <div className="h-40 w-full bg-[#1E2124] rounded" />
        </div>
      </main>
    );
  }

  // Empty state - Default to Rolodex if activeView is strain
  if (!selectedEntity) {
    if (activeView === 'strain') {
      return <StrainsRolodex onSelect={(id) => {
        // Find the strain by id to match the KnowledgeItem interface
        fetch(`/api/strains/${id}`)
          .then(res => res.json())
          .then(data => {
            if(data.strain) {
               // Let's trigger a window event or somehow notify the parent
               window.dispatchEvent(new CustomEvent('selectEntity', { detail: { 
                 id: data.strain.id, 
                 name: data.strain.name, 
                 type: 'strain' 
               }}));
            }
          });
      }} />;
    }
    return (
      <main className="flex-1 p-8 overflow-hidden flex items-center justify-center">
        <div className="text-center text-[#6B7280]">
          <div className="text-4xl mb-4">🌿</div>
          <div className="text-lg font-medium">Select a strain or study to begin</div>
          <div className="text-sm mt-2">
            Use the knowledge rail to explore your Hemp‑OS database.
          </div>
        </div>
      </main>
    );
  }

  if (activeView === 'strain' && strainDetail) {
    const s = strainDetail;

    const thcRange =
      s.thcMin != null || s.thcMax != null
        ? `${formatPercent(s.thcMin)} — ${formatPercent(s.thcMax)}`
        : '—';

    const cbdRange =
      s.cbdMin != null || s.cbdMax != null
        ? `${formatPercent(s.cbdMin ?? s.cbdMax)}`
        : '—';

    const indications =
      s.medicalUses
        ?.split(',')
        .map((x) => x.trim())
        .filter(Boolean) ?? [];

    const effects =
      s.effects
        ?.split(',')
        .map((x) => x.trim())
        .filter(Boolean) ?? [];

    const terpEntries =
      s.terpeneProfile
        ?.split(';')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((entry) => {
          const [name, val] = entry.split(':').map((x) => x.trim());
          return { name, val: val || '—' };
        }) ?? [];

    return (
      <main className="flex-1 p-8 overflow-hidden">
        {/* Header strip */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 uppercase tracking-[0.2em] text-[#A5C9B3] text-[10px] font-bold">
              <span>Biological Matrix</span>
              <span className="h-px w-8 bg-[#A5C9B3]/40" />
              <span className="opacity-50">Strain Data</span>
            </div>
            <h2 className="font-serif text-4xl md:text-5xl font-light italic text-white">
              {s.name}
            </h2>
            <div className="mt-2 text-xs text-[#6B7280]">
              {s.type ?? 'Unclassified'} •{' '}
              {s.createdAt
                ? `Ingested ${new Date(s.createdAt).toLocaleDateString()}`
                : 'Ingestion date unknown'}
            </div>
            <div className="flex flex-wrap gap-4 mt-6">
              {[
                { label: 'THC Range', val: thcRange },
                { label: 'CBD Total', val: cbdRange },
                {
                  label: 'Source',
                  val: s.source ?? 'Unknown laboratory/source',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded border border-white/10 bg-white/5 px-3 py-2 text-center min-w-[120px]"
                >
                  <div className="text-[10px] uppercase opacity-40">
                    {item.label}
                  </div>
                  <div className="font-mono text-sm md:text-lg truncate">
                    {item.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 items-end">
            <button className="flex items-center gap-2 rounded-full border border-[#2D5A47] px-5 py-2 text-[11px] font-bold uppercase text-[#A5C9B3] hover:bg-[#2D5A47] hover:text-white transition-all cursor-pointer">
              <span>Export Metadata</span>
              <Download size={14} />
            </button>
            <div className="text-[10px] uppercase font-bold opacity-40 text-right">
              Entity ID: {s.id}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Left column: terpene, indications, effects */}
          <div className="space-y-6">
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#A5C9B3] mb-3">
                Terpene Profile
              </h4>
              <div className="space-y-3">
                {terpEntries.length === 0 && (
                  <div className="text-xs opacity-40">
                    No terpene data available for this strain yet.
                  </div>
                )}
                {terpEntries.map((item) => (
                  <div key={item.name}>
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-serif italic">{item.name}</span>
                      <span className="font-mono">{item.val}</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden mt-1">
                      <div className="h-full bg-[#A5C9B3]" style={{ width: '50%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#A5C9B3] mb-3">
                Medical Indications
              </h4>
              <div className="flex flex-wrap gap-2">
                {indications.length === 0 && (
                  <span className="text-[10px] uppercase opacity-40">
                    No indications annotated.
                  </span>
                )}
                {indications.map((ind) => (
                  <span
                    key={ind}
                    className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-[10px] uppercase"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            </div>

            <div className="border-t border-white/10 pt-4">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#A5C9B3] mb-3">
                Reported Effects
              </h4>
              <div className="flex flex-wrap gap-2">
                {effects.length === 0 && (
                  <span className="text-[10px] uppercase opacity-40">
                    No subjective effects recorded.
                  </span>
                )}
                {effects.map((eff) => (
                  <span
                    key={eff}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase"
                  >
                    {eff}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right column: related studies list */}
          <div className="border-l border-white/10 pl-0 lg:pl-8">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#A5C9B3] mb-4">
              Related Studies
            </h4>
            <div className="space-y-3 overflow-y-auto pr-2 max-h-[360px]">
              {relatedStudies.length === 0 && (
                <div className="text-xs opacity-40">
                  No linked studies yet. As you ingest clinical or preclinical
                  research, they will appear here.
                </div>
              )}
              {relatedStudies.map((study) => (
                <div
                  key={study.id}
                  className="rounded-lg border border-white/5 bg-white/5 p-3 hover:border-white/20 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="text-xs font-medium truncate text-white">
                      {study.title}
                    </div>
                    <div className="text-[10px] opacity-40 ml-2">
                      {study.year ?? 'n.d.'}
                    </div>
                  </div>
                  <div className="text-[10px] opacity-50 truncate">
                    {study.journal ?? 'Unknown journal'}
                    {study.doi ? ` • DOI: ${study.doi}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Study view
  if (activeView === 'study' && studyDetail) {
    const st = studyDetail;
    const dateLabel = st.createdAt
      ? new Date(st.createdAt).toLocaleDateString()
      : 'Unknown ingestion date';

    const tags =
      st.topicTags
        ?.split(',')
        .map((x) => x.trim())
        .filter(Boolean) ?? [];

    return (
      <main className="flex-1 p-8 overflow-hidden">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2 uppercase tracking-[0.2em] text-[#93C5FD] text-[10px] font-bold">
              <span>Evidence Layer</span>
              <span className="h-px w-8 bg-[#93C5FD]/40" />
              <span className="opacity-50">Study Record</span>
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-light text-white">
              {st.title}
            </h2>
            <div className="mt-2 text-xs text-[#9CA3AF] space-y-1">
              <div>{st.authors ?? 'Authors unknown'}</div>
              <div>
                {st.journal ?? 'Unpublished'} • {st.year ?? 'n.d.'}
              </div>
              <div>{st.doi ? `DOI: ${st.doi}` : 'DOI not recorded'}</div>
              <div className="opacity-70">{dateLabel}</div>
            </div>
          </div>
          <div className="flex flex-col gap-3 items-end">
            {st.fullTextPath && (
              <a
                href={st.fullTextPath}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full border border-[#1D4ED8] px-5 py-2 text-[11px] font-bold uppercase text-[#BFDBFE] hover:bg-[#1D4ED8] hover:text-white transition-all cursor-pointer"
              >
                <span>Open Full Text</span>
                <Download size={14} />
              </a>
            )}
            <div className="text-[10px] uppercase font-bold opacity-40 text-right">
              Study ID: {st.id}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          {/* Abstract and outcomes */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#0D0E10] border border-[#1E2124] rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-2 text-[#E5E7EB]">
                Abstract
              </h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed whitespace-pre-wrap">
                {st.abstract ?? 'No abstract available for this study.'}
              </p>
            </div>
            <div className="bg-[#0D0E10] border border-[#1E2124] rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-2 text-[#E5E7EB]">
                Outcomes
              </h3>
              <p className="text-sm text-[#9CA3AF] leading-relaxed whitespace-pre-wrap">
                {st.outcomes ?? 'No outcome summary has been annotated yet.'}
              </p>
            </div>
          </div>

          {/* Metadata column */}
          <div className="space-y-6">
            <div className="bg-[#0D0E10] border border-[#1E2124] rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3 text-[#E5E7EB]">
                Study Parameters
              </h3>
              <dl className="space-y-2 text-[13px] text-[#9CA3AF]">
                <div className="flex justify-between">
                  <dt className="opacity-60">Population</dt>
                  <dd className="ml-4 text-right text-white">
                    {st.population ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-60">Dose</dt>
                  <dd className="ml-4 text-right text-white">{st.dose ?? '—'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="opacity-60">Route</dt>
                  <dd className="ml-4 text-right text-white">{st.route ?? '—'}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#0D0E10] border border-[#1E2124] rounded-lg p-5">
              <h3 className="text-sm font-semibold mb-3 text-[#E5E7EB]">
                Topic Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {tags.length === 0 && (
                  <span className="text-[10px] uppercase opacity-40">
                    No tags assigned.
                  </span>
                )}
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-[#1E40AF] bg-[#0B1120] px-3 py-1 text-[10px] uppercase text-[#BFDBFE]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Fallback if we have an entity but no detail yet
  return (
    <main className="flex-1 p-8 overflow-hidden flex items-center justify-center">
      <div className="text-center text-[#6B7280]">
        <div className="text-2xl mb-3">⏳</div>
        <div className="text-sm">
          Loading details for <span className="font-semibold text-white">{selectedEntity.name}</span>…
        </div>
      </div>
    </main>
  );
}
