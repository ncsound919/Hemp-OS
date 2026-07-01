/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ultimate single‑file Social Flyer Tool
 * - All types, utilities, and UI in one file
 * - Depends on React and lucide-react (install via npm)
 * - Drop into any React project
 */

import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  Flame,
  Snowflake,
  Award,
  Download,
  RefreshCw,
  BadgeCheck,
  Microscope,
  Megaphone,
  BarChart3,
  FileJson,
  FileText,
  Instagram,
  Linkedin,
  MessageSquareQuote,
} from 'lucide-react';

// ============================================================================
// Types (originally imported from ../../../kernel/core/types.ts and ./publisherUtils.ts)
// ============================================================================

/** Biomass feedstock descriptor */
export interface Biomass {
  name: string;
  mass: number; // kg
  potency: {
    thca: number; // weight %
    cbda: number; // weight %
    cbd?: number; // weight % (optional)
  };
}

/** Metrics produced by the publisher pipeline */
export interface PublisherMetrics {
  purityVal?: number;
  decarbTemp?: number;
  winterTemp?: number;
  calculatedYield?: number;
  outputProductKg?: string | number;
  totalCBD?: number;
  decarbTime?: number;
  winterRatio?: number;
  // additional fields can be added
}

/** Extended metrics with safe defaults */
type ExtendedMetrics = PublisherMetrics & {
  calculatedYield: number;
  outputProductKg: string | number;
  decarbTime: number;
  winterRatio: number;
  totalCBD: number;
};

// ============================================================================
// UI Constants and Helpers
// ============================================================================

type FlyerStyle = 'neon-grid' | 'academic-brutalist' | 'lab-report' | 'thermal-warning';
type FlyerAspect = 'square' | 'story' | 'landscape';
type FlyerVoice = 'hype' | 'scientific' | 'investor' | 'retail';
type Channel = 'x' | 'instagram' | 'linkedin';

const STYLE_TOKENS: Record<
  FlyerStyle,
  {
    panel: string;
    border: string;
    accent: string;
    softAccent: string;
    chip: string;
    kicker: string;
    shell: string;
    overlay?: string;
    grid?: string;
  }
> = {
  'neon-grid': {
    panel: 'from-indigo-950 via-[#0a0614] to-purple-950',
    border: 'border-purple-500/40',
    accent: 'text-purple-300',
    softAccent: 'text-emerald-300',
    chip: 'bg-black/30 border-[#26262b] text-gray-200',
    kicker: 'text-emerald-400',
    shell: 'shadow-purple-500/10',
    grid:
      'bg-[linear-gradient(to_right,#2b1f55_1px,transparent_1px),linear-gradient(to_bottom,#2b1f55_1px,transparent_1px)] bg-[size:28px_28px] opacity-25',
  },
  'academic-brutalist': {
    panel: 'from-[#151518] via-[#111214] to-[#0c0d0f]',
    border: 'border-blue-500/30',
    accent: 'text-blue-300',
    softAccent: 'text-cyan-300',
    chip: 'bg-white/0 border-[#2a2c31] text-gray-200',
    kicker: 'text-blue-400',
    shell: 'shadow-black/40',
  },
  'lab-report': {
    panel: 'from-[#07211b] via-[#0b1715] to-[#101315]',
    border: 'border-emerald-500/30',
    accent: 'text-emerald-300',
    softAccent: 'text-cyan-200',
    chip: 'bg-black/20 border-[#23302c] text-gray-100',
    kicker: 'text-emerald-400',
    shell: 'shadow-emerald-500/10',
  },
  'thermal-warning': {
    panel: 'from-[#251004] via-[#1a0b08] to-[#12090a]',
    border: 'border-amber-500/35',
    accent: 'text-amber-300',
    softAccent: 'text-rose-200',
    chip: 'bg-black/25 border-[#3a231b] text-gray-100',
    kicker: 'text-amber-400',
    shell: 'shadow-amber-500/10',
  },
};

const ASPECT_TOKENS: Record<FlyerAspect, string> = {
  square: 'aspect-square max-w-[34rem]',
  story: 'aspect-[9/16] max-w-[24rem]',
  landscape: 'aspect-[16/10] max-w-[42rem]',
};

const DEFAULT_HEADLINES: Record<FlyerVoice, string> = {
  hype: 'SHATTERING PURITY RECORDS',
  scientific: 'KERNEL-VERIFIED REFINEMENT PROFILE',
  investor: 'HIGHER PURITY, LOWER PROCESS DRIFT',
  retail: 'CLEANER EXTRACTION. BETTER PRODUCT.',
};

const CHANNEL_LIMITS: Record<Channel, number> = {
  x: 280,
  instagram: 2200,
  linkedin: 3000,
};

function pct(value?: number, digits = 1): string {
  return `${((value ?? 0) * 100).toFixed(digits)}%`;
}

function safeNum(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function downloadText(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function trimTo(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

// ============================================================================
// Main Component
// ============================================================================

interface SocialFlyerTabProps {
  biomass: Biomass;
  metrics: PublisherMetrics;
}

export const SocialFlyerTab: React.FC<SocialFlyerTabProps> = ({ biomass, metrics }) => {
  // Safely extend metrics
  const m = metrics as ExtendedMetrics;

  // State
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [flyerStyle, setFlyerStyle] = useState<FlyerStyle>('neon-grid');
  const [flyerAspect, setFlyerAspect] = useState<FlyerAspect>('square');
  const [voice, setVoice] = useState<FlyerVoice>('hype');
  const [channel, setChannel] = useState<Channel>('instagram');
  const [headline, setHeadline] = useState(DEFAULT_HEADLINES.hype);
  const [subhead, setSubhead] = useState('Deterministic process intelligence translated into public-facing media.');
  const [cta, setCta] = useState('Follow the Hemp OS signal.');
  const [campaignTag, setCampaignTag] = useState('KERNEL VERIFIED');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeKernelSeal, setIncludeKernelSeal] = useState(true);
  const [includeClaimDiscipline, setIncludeClaimDiscipline] = useState(true);
  const [showDataStrip, setShowDataStrip] = useState(true);

  // Derived metrics
  const purityVal = safeNum(m.purityVal, 0.84);
  const calculatedYield = safeNum(m.calculatedYield, 0.82);
  const decarbTemp = safeNum(m.decarbTemp, 120);
  const decarbTime = safeNum(m.decarbTime, 60);
  const winterTemp = safeNum(m.winterTemp, -40);
  const winterRatio = safeNum(m.winterRatio, 4.0);
  const outputProductKg =
    typeof m.outputProductKg === 'string'
      ? m.outputProductKg
      : safeNum(m.outputProductKg, biomass.mass * calculatedYield * purityVal).toFixed(3);

  const totalCBD = safeNum(
    m.totalCBD,
    biomass.potency.cbd ?? 0 + biomass.potency.cbda * 0.877
  );

  const style = STYLE_TOKENS[flyerStyle];

  const toneWord = useMemo(() => {
    if (purityVal >= 0.92) return 'exceptional';
    if (purityVal >= 0.85) return 'high-confidence';
    if (purityVal >= 0.75) return 'stable';
    return 'developmental';
  }, [purityVal]);

  const qualitySignal = useMemo(() => {
    if (calculatedYield >= 0.88 && purityVal >= 0.9) return 'Peak route identified';
    if (calculatedYield >= 0.8 && purityVal >= 0.82) return 'Strong refinement window';
    return 'Promising optimization window';
  }, [calculatedYield, purityVal]);

  const hashtags = useMemo(() => {
    const tags = [
      '#HempOS',
      '#ProcessIntelligence',
      '#KernelVerified',
      '#ExtractionScience',
      '#CannabinoidEngineering',
    ];
    if (voice === 'investor') tags.push('#ManufacturingIntelligence');
    if (voice === 'scientific') tags.push('#ComputationalChemistry');
    if (voice === 'retail') tags.push('#CleanFormulation');
    return tags.join(' ');
  }, [voice]);

  const generatedBody = useMemo(() => {
    const base = {
      hype: `${headline} ${biomass.name} just moved through a ${toneWord} Hemp OS process window with ${pct(
        purityVal
      )} purity, ${pct(calculatedYield)} yield, ${decarbTemp}°C decarb control, and ${winterTemp}°C winterization discipline.`,
      scientific: `${headline}. Kernel-derived media summary for ${biomass.name}: predicted purity ${pct(
        purityVal
      )}, modeled yield ${pct(calculatedYield)}, decarboxylation at ${decarbTemp}°C for ${decarbTime} min, winterization at ${winterTemp}°C with solvent ratio ${winterRatio}:1.`,
      investor: `${headline}. ${biomass.name} modeled at ${pct(
        purityVal
      )} purity and ${pct(calculatedYield)} yield, indicating a ${toneWord} path toward tighter downstream refinement and more efficient process control.`,
      retail: `${headline} ${biomass.name} modeled clean with ${pct(
        purityVal
      )} purity and a controlled thermal/freeze pathway designed to support better extract quality and more consistent output.`,
    }[voice];

    const extras = [
      `Output projection: ${outputProductKg} kg refined fraction.`,
      `CBD-equivalent profile: ${totalCBD.toFixed(2)} wt%.`,
      `${qualitySignal}.`,
      cta,
    ];

    const discipline = includeClaimDiscipline
      ? 'Simulation summary only; not a lab certificate, medical claim, or release specification.'
      : '';

    return [base, subhead, extras.join(' '), discipline].filter(Boolean).join('\n\n');
  }, [
    headline,
    biomass.name,
    toneWord,
    purityVal,
    calculatedYield,
    decarbTemp,
    winterTemp,
    voice,
    decarbTime,
    winterRatio,
    outputProductKg,
    totalCBD,
    qualitySignal,
    cta,
    subhead,
    includeClaimDiscipline,
  ]);

  const socialCopy = useMemo(() => {
    const variants: Record<Channel, string> = {
      x: trimTo(
        `${headline} | ${biomass.name}: ${pct(purityVal)} purity, ${pct(
          calculatedYield
        )} yield, ${decarbTemp}°C decarb, ${winterTemp}°C winterization. ${qualitySignal}. ${cta} ${
          includeHashtags ? hashtags : ''
        }`,
        CHANNEL_LIMITS.x
      ),
      instagram: trimTo(
        `${headline}\n\n${biomass.name} moved through a ${toneWord} refinement profile with ${pct(
          purityVal
        )} purity and ${pct(calculatedYield)} yield.\n\nHeat activation: ${decarbTemp}°C for ${decarbTime} min\nFreeze wash: ${winterTemp}°C\nOutput projection: ${outputProductKg} kg\n\n${cta}\n\n${
          includeClaimDiscipline
            ? 'Simulation summary only. Not a certificate of analysis.'
            : ''
        }\n\n${includeHashtags ? hashtags : ''}`,
        CHANNEL_LIMITS.instagram
      ),
      linkedin: trimTo(
        `${headline}\n\n${biomass.name} was evaluated through the Hemp OS media pipeline using a kernel-derived process summary. Key outputs: ${pct(
          purityVal
        )} purity, ${pct(calculatedYield)} yield, ${decarbTemp}°C decarboxylation, ${winterTemp}°C winterization, and ${outputProductKg} kg projected refined output.\n\n${qualitySignal}. ${cta}\n\n${
          includeClaimDiscipline
            ? 'For modeling and workflow communication only; not a release spec or regulated lab statement.'
            : ''
        }\n\n${includeHashtags ? hashtags : ''}`,
        CHANNEL_LIMITS.linkedin
      ),
    };
    return variants[channel];
  }, [
    headline,
    biomass.name,
    purityVal,
    calculatedYield,
    decarbTemp,
    winterTemp,
    decarbTime,
    outputProductKg,
    toneWord,
    qualitySignal,
    cta,
    includeHashtags,
    includeClaimDiscipline,
    hashtags,
    channel,
  ]);

  const handleCopy = async (text: string) => {
    try {
      setCopyError(null);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopyError('Clipboard access was blocked by the browser.');
    }
  };

  const handleVoicePreset = (nextVoice: FlyerVoice) => {
    setVoice(nextVoice);
    setHeadline(DEFAULT_HEADLINES[nextVoice]);
  };

  const exportPayload = useMemo(
    () => ({
      campaignTag,
      channel,
      voice,
      flyerStyle,
      flyerAspect,
      biomass: biomass.name,
      metrics: {
        purity: purityVal,
        yield: calculatedYield,
        decarbTemp,
        decarbTime,
        winterTemp,
        winterRatio,
        outputProductKg,
        totalCBD,
      },
      headline,
      subhead,
      cta,
      generatedBody,
      socialCopy,
    }),
    [
      campaignTag,
      channel,
      voice,
      flyerStyle,
      flyerAspect,
      biomass.name,
      purityVal,
      calculatedYield,
      decarbTemp,
      decarbTime,
      winterTemp,
      winterRatio,
      outputProductKg,
      totalCBD,
      headline,
      subhead,
      cta,
      generatedBody,
      socialCopy,
    ]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
      <div className="xl:col-span-5 bg-[#161619] border border-[#1f1f21] p-5 rounded-2xl space-y-5">
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            Flyer Production Suite
          </span>
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Build campaign-grade social flyers from kernel-derived process metrics, then generate
            channel-specific copy with cleaner claim discipline and stronger visual systems.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
              Headline
            </label>
            <input
              type="text"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              placeholder="Enter campaign headline..."
            />
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
              Campaign tag
            </label>
            <input
              type="text"
              value={campaignTag}
              onChange={(e) => setCampaignTag(e.target.value)}
              className="w-full bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              placeholder="KERNEL VERIFIED"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
            Subhead
          </label>
          <textarea
            value={subhead}
            onChange={(e) => setSubhead(e.target.value)}
            rows={3}
            className="w-full bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
            Call to action
          </label>
          <input
            type="text"
            value={cta}
            onChange={(e) => setCta(e.target.value)}
            className="w-full bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
              Style system
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['neon-grid', 'academic-brutalist', 'lab-report', 'thermal-warning'] as FlyerStyle[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFlyerStyle(s)}
                  className={`px-2.5 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    flyerStyle === s
                      ? 'bg-white/8 border-white/30 text-white'
                      : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                  }`}
                >
                  {s.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
              Aspect ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['square', 'story', 'landscape'] as FlyerAspect[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setFlyerAspect(a)}
                  className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                    flyerAspect === a
                      ? 'bg-white/8 border-white/30 text-white'
                      : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
            Voice preset
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {(['hype', 'scientific', 'investor', 'retail'] as FlyerVoice[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => handleVoicePreset(v)}
                className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                  voice === v
                    ? 'bg-purple-950/40 border-purple-500 text-purple-300'
                    : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
            Output channel
          </label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { id: 'x', icon: MessageSquareQuote, label: 'X' },
              { id: 'instagram', icon: Instagram, label: 'Instagram' },
              { id: 'linkedin', icon: Linkedin, label: 'LinkedIn' },
            ] as { id: Channel; icon: React.ComponentType<any>; label: string }[]).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setChannel(item.id)}
                  className={`px-3 py-2 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    channel === item.id
                      ? 'bg-blue-950/40 border-blue-500 text-blue-300'
                      : 'bg-[#121214] border-[#1f1f21] text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <label className="flex items-center gap-2 bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeHashtags}
              onChange={() => setIncludeHashtags((v) => !v)}
              className="accent-purple-500"
            />
            Hashtags
          </label>
          <label className="flex items-center gap-2 bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeKernelSeal}
              onChange={() => setIncludeKernelSeal((v) => !v)}
              className="accent-emerald-500"
            />
            Kernel seal
          </label>
          <label className="flex items-center gap-2 bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeClaimDiscipline}
              onChange={() => setIncludeClaimDiscipline((v) => !v)}
              className="accent-amber-500"
            />
            Claim discipline
          </label>
          <label className="flex items-center gap-2 bg-[#121214] border border-[#1f1f21] rounded-lg px-3 py-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showDataStrip}
              onChange={() => setShowDataStrip((v) => !v)}
              className="accent-cyan-500"
            />
            Data strip
          </label>
        </div>

        <div className="bg-[#121214] border border-[#1f1f21] rounded-xl p-3.5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[8px] font-mono font-bold text-gray-500 uppercase tracking-widest">
              Generated channel copy
            </span>
            <span className="text-[8px] font-mono text-gray-500 uppercase">
              {socialCopy.length}/{CHANNEL_LIMITS[channel]}
            </span>
          </div>
          <textarea
            value={socialCopy}
            readOnly
            rows={8}
            className="w-full bg-[#0d0d10] border border-[#1d1f24] rounded-lg px-3 py-2 text-[11px] text-gray-200 focus:outline-none resize-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleCopy(socialCopy)}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy Post'}
            </button>

            <button
              type="button"
              onClick={() =>
                downloadText(`hemp-os-flyer-${channel}.txt`, socialCopy)
              }
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              Export TXT
            </button>

            <button
              type="button"
              onClick={() =>
                downloadText(
                  `hemp-os-flyer-payload.json`,
                  JSON.stringify(exportPayload, null, 2),
                  'application/json;charset=utf-8'
                )
              }
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono font-bold uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <FileJson className="w-3.5 h-3.5" />
              Export JSON
            </button>
          </div>
          {copyError && <p className="text-[10px] text-rose-400 font-mono">{copyError}</p>}
        </div>
      </div>

      <div className="xl:col-span-7 flex flex-col gap-4">
        <div
          className={`w-full ${ASPECT_TOKENS[flyerAspect]} p-6 sm:p-8 flex flex-col justify-between rounded-[2rem] overflow-hidden shadow-2xl relative select-none border bg-gradient-to-br ${style.panel} ${style.border} ${style.shell}`}
        >
          {style.grid && (
            <div
              className={`absolute inset-0 ${style.grid} [mask-image:radial-gradient(ellipse_75%_60%_at_50%_20%,#000_60%,transparent_100%)]`}
            />
          )}

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.10),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.10),transparent_25%)] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-[10px] font-black tracking-widest text-white">
                HOS
              </div>
              <div>
                <span className={`text-[8px] font-mono font-bold tracking-[0.22em] uppercase block ${style.accent}`}>
                  Hemp OS Media Protocol
                </span>
                <span className="text-[8px] font-mono text-gray-400 uppercase tracking-widest">
                  Public Signal Composer
                </span>
              </div>
            </div>

            {includeKernelSeal && (
              <span className={`text-[8px] font-mono font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${style.chip}`}>
                {campaignTag}
              </span>
            )}
          </div>

          <div className="relative z-10 my-6 sm:my-8">
            <span className={`text-[10px] font-bold font-mono uppercase tracking-[0.22em] block mb-2 ${style.kicker}`}>
              Kernel-Derived Campaign Output
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white uppercase leading-[0.95] max-w-[12ch]">
              {headline}
            </h1>
            <p className="text-[12px] sm:text-[13px] text-gray-200 font-sans mt-3 max-w-[44ch] leading-relaxed">
              {subhead}
            </p>
          </div>

          {showDataStrip && (
            <div
              className={`relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 bg-black/25 border p-3.5 rounded-2xl ${style.chip}`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                    Decarb
                  </span>
                </div>
                <p className="text-sm font-bold text-white font-mono">{decarbTemp}°C</p>
                <span className="text-[8px] text-gray-400 font-mono uppercase">{decarbTime} min</span>
              </div>

              <div className="space-y-1 md:border-l md:border-white/10 md:pl-3">
                <div className="flex items-center gap-1">
                  <Snowflake className="w-3 h-3 text-blue-400" />
                  <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                    Winterize
                  </span>
                </div>
                <p className="text-sm font-bold text-white font-mono">{winterTemp}°C</p>
                <span className="text-[8px] text-gray-400 font-mono uppercase">{winterRatio}:1 solvent</span>
              </div>

              <div className="space-y-1 md:border-l md:border-white/10 md:pl-3">
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                    Purity
                  </span>
                </div>
                <p className="text-sm font-bold text-emerald-300 font-mono">{pct(purityVal)}</p>
                <span className="text-[8px] text-gray-400 font-mono uppercase">{toneWord}</span>
              </div>

              <div className="space-y-1 md:border-l md:border-white/10 md:pl-3">
                <div className="flex items-center gap-1">
                  <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[8px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                    Yield
                  </span>
                </div>
                <p className="text-sm font-bold text-cyan-300 font-mono">{pct(calculatedYield)}</p>
                <span className="text-[8px] text-gray-400 font-mono uppercase">{outputProductKg} kg out</span>
              </div>
            </div>
          )}

          <div className="relative z-10 mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className={`rounded-2xl border p-3 ${style.chip}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Microscope className={`w-3.5 h-3.5 ${style.softAccent}`} />
                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-400">
                  Feedstock
                </span>
              </div>
              <p className="text-sm font-bold text-white">{biomass.name}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                THCA {biomass.potency.thca.toFixed(2)}% · CBDA {biomass.potency.cbda.toFixed(2)}%
              </p>
            </div>

            <div className={`rounded-2xl border p-3 ${style.chip}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <BadgeCheck className={`w-3.5 h-3.5 ${style.softAccent}`} />
                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-400">
                  Signal
                </span>
              </div>
              <p className="text-sm font-bold text-white">{qualitySignal}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                CBD-equivalent profile {totalCBD.toFixed(2)} wt%
              </p>
            </div>

            <div className={`rounded-2xl border p-3 ${style.chip}`}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Megaphone className={`w-3.5 h-3.5 ${style.softAccent}`} />
                <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-gray-400">
                  CTA
                </span>
              </div>
              <p className="text-sm font-bold text-white">{cta}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                Output channel: {channel.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-4 mt-4 border-t border-white/10 flex items-end justify-between gap-4">
            <div>
              <span className={`text-[8px] font-mono font-bold uppercase tracking-widest block ${style.kicker}`}>
                Campaign line
              </span>
              <h2 className="text-sm sm:text-base font-black tracking-wider text-white uppercase leading-tight max-w-[28ch]">
                {campaignTag}
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[8px] font-mono text-gray-500 uppercase block">Render mode</span>
              <span className={`text-[10px] font-mono font-bold uppercase ${style.accent}`}>
                {flyerStyle.replace('-', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-[#121214] border border-[#1f1f21] rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold font-mono text-gray-400 uppercase tracking-widest">
              Long-form campaign body
            </span>
            <button
              type="button"
              onClick={() => handleCopy(generatedBody)}
              className="text-[10px] font-mono bg-[#1b1b1e] hover:bg-[#252528] border border-[#2d2d30] text-[#aaa] px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              Copy body
            </button>
          </div>

          <div className="bg-[#0d0d10] border border-[#1d1f24] rounded-xl p-4 whitespace-pre-line text-[12px] text-gray-200 leading-relaxed">
            {generatedBody}
          </div>

          {includeClaimDiscipline && (
            <div className="flex items-start gap-2 bg-amber-950/20 border border-amber-500/20 rounded-xl p-3">
              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-100 leading-relaxed">
                This flyer system is tuned to present modeled process outputs more responsibly by
                framing them as kernel-derived media summaries, not regulated lab certificates or
                medical claims.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SocialFlyerTab;
