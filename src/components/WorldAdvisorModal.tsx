import React, { useMemo } from 'react';
import {
  X,
  Globe,
  Mountain,
  Waves,
  Sparkles,
  Compass,
  TreePine,
  Expand,
  CheckCircle2,
  AlertTriangle,
  Droplets,
  Wand2,
} from 'lucide-react';
import { CanvasDimensions, PlacedPath, PlacedStamp, PlacedTerritory } from '../types';

interface WorldAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  dimensions: CanvasDimensions;
  onResizeCanvas: (width: number, height: number) => void;
  maskCanvas: HTMLCanvasElement | null;
  elevationCanvas: HTMLCanvasElement | null;
  stamps: PlacedStamp[];
  paths: PlacedPath[];
  territories: PlacedTerritory[];
  onGenerateProceduralWorld: (preset: 'continent' | 'archipelago' | 'pangaea' | 'twin_realms') => void;
  onDeriveTopography: () => void;
  onHydraulicErosion: () => void;
  onGenerateRiverBasin: () => void;
  onAutoPopulateEcosystem: () => void;
}

const CANVAS_RESOLUTIONS = [
  {
    id: 'std_1600',
    name: 'Standard Realm',
    width: 1600,
    height: 1000,
    aspect: '16:10',
    desc: 'Fast regional drafting & quick campaign maps',
  },
  {
    id: 'hd_2200',
    name: '2K Studio Canvas',
    width: 2200,
    height: 1400,
    aspect: '11:7',
    desc: 'Recommended balance of expansive detail & 60 FPS sculpting',
  },
  {
    id: 'uhd_2800',
    name: '3K Continental Atlas',
    width: 2800,
    height: 1800,
    aspect: '14:9',
    desc: 'High-density continental scale for sprawling empires',
  },
  {
    id: 'world_3600',
    name: '4K World Builder',
    width: 3600,
    height: 2250,
    aspect: '16:10',
    desc: 'Maximum cartographic canvas for planetary worldbuilding',
  },
];

export const WorldAdvisorModal: React.FC<WorldAdvisorModalProps> = ({
  isOpen,
  onClose,
  dimensions,
  onResizeCanvas,
  maskCanvas,
  elevationCanvas,
  stamps,
  paths,
  territories,
  onGenerateProceduralWorld,
  onDeriveTopography,
  onHydraulicErosion,
  onGenerateRiverBasin,
  onAutoPopulateEcosystem,
}) => {
  // Compute real geological & cartographic diagnostics from the active canvas
  const diagnostics = useMemo(() => {
    if (!isOpen || !maskCanvas) {
      return {
        landPercent: 34,
        waterPercent: 66,
        highlandPercent: 18,
        riverCount: paths.filter((p) => p.style === 'river').length,
        roadCount: paths.filter((p) => p.style !== 'river').length,
        mountainStamps: 0,
        treeStamps: 0,
        settlementStamps: 0,
      };
    }

    const mCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    const eCtx = elevationCanvas?.getContext('2d', { willReadFrequently: true });
    const w = maskCanvas.width;
    const h = maskCanvas.height;

    let landSamples = 0;
    let highlandSamples = 0;
    let totalSamples = 0;

    if (mCtx) {
      const mData = mCtx.getImageData(0, 0, w, h).data;
      const eData = eCtx ? eCtx.getImageData(0, 0, w, h).data : null;
      const step = 8;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          totalSamples++;
          const idx = (y * w + x) * 4;
          if (mData[idx + 3] > 60) {
            landSamples++;
            if (eData && eData[idx + 3] > 10 && eData[idx] > 175) {
              highlandSamples++;
            }
          }
        }
      }
    }

    const landPercent = totalSamples > 0 ? Math.round((landSamples / totalSamples) * 100) : 0;
    const highlandPercent =
      landSamples > 0 ? Math.round((highlandSamples / landSamples) * 100) : 0;

    const riverCount = paths.filter((p) => p.style === 'river').length;
    const roadCount = paths.filter((p) => p.style !== 'river').length;
    const mountainStamps = stamps.filter((s) =>
      /mountain|peak|ridge|volcano|hill/i.test(s.assetId)
    ).length;
    const treeStamps = stamps.filter((s) => /tree|pine|oak|forest|palm/i.test(s.assetId)).length;
    const settlementStamps = stamps.filter((s) =>
      /castle|city|town|village|fort|tower|port|keep/i.test(s.assetId)
    ).length;

    return {
      landPercent,
      waterPercent: 100 - landPercent,
      highlandPercent,
      riverCount,
      roadCount,
      mountainStamps,
      treeStamps,
      settlementStamps,
    };
  }, [isOpen, maskCanvas, elevationCanvas, stamps, paths]);

  if (!isOpen) return null;

  const advisories: { status: 'good' | 'warn'; title: string; detail: string }[] = [];

  if (diagnostics.landPercent < 12) {
    advisories.push({
      status: 'warn',
      title: 'Sparse Continental Landmass',
      detail: `Land covers only ${diagnostics.landPercent}% of the world. Consider sculpting a continent or archipelago below.`,
    });
  } else if (diagnostics.landPercent > 82) {
    advisories.push({
      status: 'warn',
      title: 'Landlocked Interior Basin',
      detail: `Land covers ${diagnostics.landPercent}% of the canvas. Carving inland seas or bays will improve coastal trade routes.`,
    });
  } else {
    advisories.push({
      status: 'good',
      title: 'Balanced Hydrosphere & Continents',
      detail: `${diagnostics.landPercent}% Land / ${diagnostics.waterPercent}% Ocean supports realistic maritime climates and coastal shelves.`,
    });
  }

  if (diagnostics.riverCount === 0 && diagnostics.landPercent > 15) {
    advisories.push({
      status: 'warn',
      title: 'No River Drainage Basins Detected',
      detail: 'Use "Spawn Source-to-Sea Rivers" below to trace hydrological waterways from alpine ridges to the sea.',
    });
  } else {
    advisories.push({
      status: 'good',
      title: 'Active Hydrological Drainage',
      detail: `${diagnostics.riverCount} river waterway(s) and ${diagnostics.roadCount} overland route(s) charted across the realm.`,
    });
  }

  return (
    <div
      id="world-advisor-modal"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] bg-[#0F1623] border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#151E2E] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide text-white">
                Planet Advisor & Canvas Studio
              </h2>
              <p className="text-xs text-slate-400">
                Geological feasibility diagnostics, procedural world sculpting, and high-resolution map sizing
              </p>
            </div>
          </div>
          <button
            id="btn-close-world-advisor"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Canvas Size & Resolution Studio */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Expand className="w-4 h-4" />
                <span>01. Map Canvas Size & Resolution (Non-Destructive Scaling)</span>
              </h3>
              <span className="text-xs font-mono tabular-nums text-slate-400">
                Active: {dimensions.width} × {dimensions.height} px
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {CANVAS_RESOLUTIONS.map((res) => {
                const isCurrent =
                  dimensions.width === res.width && dimensions.height === res.height;
                return (
                  <button
                    key={res.id}
                    id={`btn-advisor-res-${res.id}`}
                    onClick={() => onResizeCanvas(res.width, res.height)}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isCurrent
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-lg'
                        : 'bg-[#151E2E]/90 border-slate-800 hover:border-slate-600 text-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white">{res.name}</span>
                        {isCurrent && (
                          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-sm font-mono tabular-nums font-bold text-amber-400 mt-0.5">
                        {res.width} × {res.height}
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{res.desc}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Geological & Hydrological Diagnostics */}
          <section className="space-y-3 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-2">
              <Compass className="w-4 h-4" />
              <span>02. Geological & Worldbuilding Telemetry</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-[#151E2E] border border-slate-800">
                <div className="text-[11px] text-slate-400">Land / Ocean Ratio</div>
                <div className="text-lg font-mono tabular-nums font-bold text-emerald-400 mt-0.5">
                  {diagnostics.landPercent}% / {diagnostics.waterPercent}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Alpine Relief: {diagnostics.highlandPercent}% of land
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#151E2E] border border-slate-800">
                <div className="text-[11px] text-slate-400">Hydrology & Routes</div>
                <div className="text-lg font-mono tabular-nums font-bold text-sky-400 mt-0.5">
                  {diagnostics.riverCount} Rivers · {diagnostics.roadCount} Roads
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Source-to-sea drainage network
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#151E2E] border border-slate-800">
                <div className="text-[11px] text-slate-400">Flora & Relief Stamps</div>
                <div className="text-lg font-mono tabular-nums font-bold text-amber-400 mt-0.5">
                  {diagnostics.mountainStamps} Peaks · {diagnostics.treeStamps} Trees
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Y-depth sorted terrain assets
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#151E2E] border border-slate-800">
                <div className="text-[11px] text-slate-400">Polities & Citadels</div>
                <div className="text-lg font-mono tabular-nums font-bold text-purple-400 mt-0.5">
                  {territories.length} Realms · {diagnostics.settlementStamps} Cities
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Political borders & settlements
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {advisories.map((adv, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-[#151E2E]/70 border border-slate-800 flex items-start gap-2.5"
                >
                  {adv.status === 'good' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">{adv.title}</div>
                    <div className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                      {adv.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. One-Click Procedural World & Hydrology Generators */}
          <section className="space-y-3 pt-2 border-t border-slate-800/80">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              <span>03. Automated Terrain, Tectonics & Hydrology Actions</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Procedural Landmass Generator */}
              <div className="p-4 rounded-xl bg-[#151E2E] border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Sculpt Procedural Tectonic Landmass</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Generate organic fractal coastlines, islands, and elevation ridges across the entire canvas.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-gen-continent"
                    onClick={() => onGenerateProceduralWorld('continent')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Imperial Continent
                  </button>
                  <button
                    id="btn-gen-archipelago"
                    onClick={() => onGenerateProceduralWorld('archipelago')}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Island Archipelago
                  </button>
                  <button
                    id="btn-gen-twin-realms"
                    onClick={() => onGenerateProceduralWorld('twin_realms')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Twin Continents
                  </button>
                  <button
                    id="btn-gen-pangaea"
                    onClick={() => onGenerateProceduralWorld('pangaea')}
                    className="px-3 py-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Inner Sea / Pangaea
                  </button>
                </div>
              </div>

              {/* Tectonic & Hydrological Simulation */}
              <div className="p-4 rounded-xl bg-[#151E2E] border border-slate-800 flex flex-col justify-between gap-2.5">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <Mountain className="w-4 h-4 text-sky-400" />
                    <span>Physical Simulation & Biome Seeding</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Refine existing landmasses with distance-field mountains, droplet erosion, and river basins.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    id="btn-advisor-derive-topo"
                    onClick={onDeriveTopography}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Mountain className="w-3.5 h-3.5 text-amber-400" />
                    <span>Derive Relief</span>
                  </button>
                  <button
                    id="btn-advisor-erosion"
                    onClick={onHydraulicErosion}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Droplets className="w-3.5 h-3.5 text-sky-400" />
                    <span>Droplet Erosion</span>
                  </button>
                  <button
                    id="btn-advisor-rivers"
                    onClick={onGenerateRiverBasin}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Waves className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Spawn Rivers</span>
                  </button>
                  <button
                    id="btn-advisor-ecosystem"
                    onClick={onAutoPopulateEcosystem}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <TreePine className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Seed Flora/Peaks</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#151E2E] border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            All procedural operations record an Undo snapshot (`Ctrl+Z`).
          </span>
          <button
            id="btn-done-world-advisor"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer"
          >
            Return to Canvas
          </button>
        </div>
      </div>
    </div>
  );
};
