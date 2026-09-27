/**
 * Cartomancer Fantasy Map Maker - High Resolution & Topographical Export Modal
 * Featuring Live Small-Scale Preview & Canny Edge Parchment Inking Controls
 */

import React, { useState, useRef, useEffect } from 'react';
import { AtmosphereFilter, CanvasDimensions } from '../types';
import {
  Download,
  X,
  Sparkles,
  Mountain,
  FileImage,
  CheckCircle2,
  Sliders,
  Eye,
  Scroll,
  Palette,
} from 'lucide-react';
import { CannyParchmentFilter, ParchmentFilterOptions } from '../utils/cannyEdgeFilter';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
  dimensions: CanvasDimensions;
  atmosphere: AtmosphereFilter;
  onAtmosphereChange: (newAtm: Partial<AtmosphereFilter>) => void;
  onPerformExport: (
    scaleFactor: number,
    format: 'png' | 'jpeg' | 'heightmap' | 'topo_json',
    parchmentOptions?: ParchmentFilterOptions
  ) => Promise<void>;
  sourceCanvas?: HTMLCanvasElement | null;
  elevationCanvas?: HTMLCanvasElement | null;
  maskCanvas?: HTMLCanvasElement | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  projectName,
  dimensions,
  atmosphere,
  onAtmosphereChange,
  onPerformExport,
  sourceCanvas,
  elevationCanvas,
  maskCanvas,
}) => {
  const [scaleFactor, setScaleFactor] = useState<number>(2);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'heightmap' | 'topo_json'>('png');
  const [isExporting, setIsExporting] = useState(false);
  const [doneMsg, setDoneMsg] = useState('');

  // Parchment Canny Inking Controls
  const [inkThreshold, setInkThreshold] = useState<number>(45);
  const [paperTone, setPaperTone] = useState<'warm_antique' | 'aged_vellum' | 'sepia_wash'>('warm_antique');

  // Preview canvas ref
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Update live preview whenever source canvas or atmosphere or inking settings change
  useEffect(() => {
    if (!isOpen) return;
    const previewCanvas = previewCanvasRef.current;
    if (!previewCanvas) return;
    const pCtx = previewCanvas.getContext('2d');
    if (!pCtx) return;

    const pWidth = 360;
    const pHeight = Math.round(pWidth * (dimensions.height / dimensions.width));
    previewCanvas.width = pWidth;
    previewCanvas.height = pHeight;

    if (exportFormat === 'heightmap' && elevationCanvas && maskCanvas) {
      // Preview heightmap
      pCtx.fillStyle = '#000000';
      pCtx.fillRect(0, 0, pWidth, pHeight);
      pCtx.drawImage(elevationCanvas, 0, 0, pWidth, pHeight);
      pCtx.globalCompositeOperation = 'destination-in';
      pCtx.drawImage(maskCanvas, 0, 0, pWidth, pHeight);
      pCtx.globalCompositeOperation = 'source-over';
      return;
    }

    if (!sourceCanvas) {
      pCtx.fillStyle = '#F4EBD0';
      pCtx.fillRect(0, 0, pWidth, pHeight);
      pCtx.fillStyle = '#785028';
      pCtx.font = '12px Cinzel, serif';
      pCtx.textAlign = 'center';
      pCtx.fillText('Preview Generating...', pWidth / 2, pHeight / 2);
      return;
    }

    // Step 1: Render base map downscaled
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = pWidth;
    tempCanvas.height = pHeight;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    tCtx.drawImage(sourceCanvas, 0, 0, pWidth, pHeight);

    // Step 2: If Parchment is selected, apply Canny Inking + Parchment Wash
    if (atmosphere.preset === 'vintage_parchment') {
      const parchmentCanvas = CannyParchmentFilter.process(tempCanvas, {
        inkThreshold,
        paperTone,
        inkStrength: 0.92,
        includePaperGrain: true,
        waterToneWash: true,
      });
      pCtx.clearRect(0, 0, pWidth, pHeight);
      pCtx.drawImage(parchmentCanvas, 0, 0);
    } else {
      // Clean or standard atmosphere preset
      pCtx.clearRect(0, 0, pWidth, pHeight);
      pCtx.drawImage(tempCanvas, 0, 0);

      // Apply preview tone overlay if not none
      if (atmosphere.preset === 'enchanted_twilight') {
        pCtx.fillStyle = 'rgba(74, 20, 140, 0.16)';
        pCtx.fillRect(0, 0, pWidth, pHeight);
      } else if (atmosphere.preset === 'warm_sunlight') {
        pCtx.fillStyle = 'rgba(255, 179, 0, 0.15)';
        pCtx.fillRect(0, 0, pWidth, pHeight);
      } else if (atmosphere.preset === 'mystic_blue') {
        pCtx.fillStyle = 'rgba(2, 132, 199, 0.15)';
        pCtx.fillRect(0, 0, pWidth, pHeight);
      } else if (atmosphere.preset === 'sepia_antique') {
        pCtx.fillStyle = 'rgba(112, 66, 20, 0.25)';
        pCtx.fillRect(0, 0, pWidth, pHeight);
      }

      // Vignette
      if (atmosphere.vignette > 0) {
        const vig = pCtx.createRadialGradient(
          pWidth * 0.5, pHeight * 0.5, pWidth * 0.3,
          pWidth * 0.5, pHeight * 0.5, pWidth * 0.72
        );
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, `rgba(18, 12, 6, ${atmosphere.vignette * 0.8})`);
        pCtx.fillStyle = vig;
        pCtx.fillRect(0, 0, pWidth, pHeight);
      }
    }
  }, [
    isOpen,
    sourceCanvas,
    elevationCanvas,
    maskCanvas,
    atmosphere,
    inkThreshold,
    paperTone,
    exportFormat,
    dimensions,
  ]);

  if (!isOpen) return null;

  const targetW = dimensions.width * scaleFactor;
  const targetH = dimensions.height * scaleFactor;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onPerformExport(scaleFactor, exportFormat, {
        inkThreshold,
        paperTone,
      });
      setDoneMsg('Map successfully exported!');
      setTimeout(() => setDoneMsg(''), 3500);
    } catch (err) {
      console.error('Export failed', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      id="export-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 select-none"
    >
      <div
        id="export-modal"
        className="bg-[#FDF6E3] border-2 border-[#E2D6B5] rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden text-slate-800 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-3.5 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00BBF9]/15 border border-[#00BBF9]/40 flex items-center justify-center text-[#0077B6]">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Cinzel'] font-bold text-lg text-slate-800 tracking-wider">
                Export Realm Map
              </h2>
              <p className="text-xs text-slate-600">
                High-resolution rendering with live parchment inking & Canny outline preview
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 2-Column Body: Live Preview Left, Settings Right */}
        <div className="p-5 flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column: Small Scale Live Preview */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#D9480F] uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Live Scale Preview
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
                {atmosphere.preset === 'vintage_parchment' ? 'Canny Parchment Inked' : 'Standard Tone'}
              </span>
            </div>

            {/* Live Canvas Frame */}
            <div className="relative bg-[#0f172a] rounded-lg p-2 border-2 border-[#E2D6B5] shadow-inner flex items-center justify-center overflow-hidden min-h-[220px]">
              <canvas
                ref={previewCanvasRef}
                className="max-w-full h-auto rounded shadow-lg border border-slate-700/50 block"
              />
              {atmosphere.preset === 'vintage_parchment' && (
                <div className="absolute top-3 left-3 bg-[#3e2723]/90 text-amber-100 text-[10px] font-mono font-semibold px-2 py-0.5 rounded shadow backdrop-blur-xs">
                  Ink Threshold: {inkThreshold}%
                </div>
              )}
            </div>

            {/* Quick Preset Selector under preview */}
            <div>
              <label className="text-[11px] font-bold text-slate-700 mb-1.5 block">
                Atmosphere & Filter Preset
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'vintage_parchment', name: '📜 Parchment (Ink)' },
                  { id: 'none', name: 'Clean / None' },
                  { id: 'warm_sunlight', name: 'Sunlight' },
                  { id: 'enchanted_twilight', name: 'Twilight' },
                  { id: 'mystic_blue', name: 'Mystic' },
                  { id: 'sepia_antique', name: 'Sepia' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onAtmosphereChange({ preset: p.id as any })}
                    className={`py-1.5 px-2 rounded text-[11px] font-semibold border transition-all text-center cursor-pointer ${
                      atmosphere.preset === p.id
                        ? 'bg-gradient-to-r from-[#D9480F] to-[#FF7E5F] text-white font-bold border-[#D9480F] shadow-xs'
                        : 'bg-white border-[#E2D6B5] text-slate-700 hover:bg-[#FDF6E3]'
                    }`}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Parchment Live Drag Bar & Options (Only when Parchment is selected) */}
            {atmosphere.preset === 'vintage_parchment' && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                    <Sliders className="w-3.5 h-3.5 text-[#D9480F]" />
                    <span>Canny Ink Line Sensitivity:</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#D9480F]">
                    {inkThreshold}%
                  </span>
                </div>

                {/* THE DRAG BAR SLIDER */}
                <input
                  type="range"
                  min="10"
                  max="90"
                  step="1"
                  value={inkThreshold}
                  onChange={(e) => setInkThreshold(Number(e.target.value))}
                  className="w-full accent-[#D9480F] cursor-pointer h-2 bg-amber-200 rounded-lg"
                />

                <div className="flex justify-between text-[10px] text-amber-800/80 font-medium">
                  <span>Subtle Fine Linework</span>
                  <span>Balanced Ink</span>
                  <span>Bold Heavy Outlines</span>
                </div>

                {/* Paper Tone Chooser */}
                <div className="pt-2 border-t border-amber-200/70 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-950">Paper Tone:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { id: 'warm_antique', name: 'Antique Gold', bg: '#F4EBD0' },
                      { id: 'aged_vellum', name: 'Aged Vellum', bg: '#F7F2E4' },
                      { id: 'sepia_wash', name: 'Sepia Wash', bg: '#EAD7B0' },
                    ].map((tone) => (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setPaperTone(tone.id as any)}
                        style={{ backgroundColor: tone.bg }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                          paperTone === tone.id
                            ? 'border-[#D9480F] ring-2 ring-[#D9480F]/40 text-slate-900 shadow-xs'
                            : 'border-[#E2D6B5] text-slate-700'
                        }`}
                      >
                        {tone.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Export Settings & Formats */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Format Selector */}
            <div>
              <label className="text-xs font-bold text-[#D9480F] uppercase tracking-wider mb-2 block">
                1. Export Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'png', label: 'PNG Image', desc: 'Lossless High Detail' },
                  { id: 'jpeg', label: 'JPEG Image', desc: 'Optimized Size' },
                  { id: 'heightmap', label: 'Heightmap PNG', desc: 'Grayscale 16-bit' },
                  { id: 'topo_json', label: 'Elevation JSON', desc: 'Topographic Matrix' },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    onClick={() => setExportFormat(fmt.id as any)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      exportFormat === fmt.id
                        ? 'bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] text-white border-[#FF7E5F] font-bold shadow-xs'
                        : 'bg-white border-[#E2D6B5] text-slate-700 hover:border-[#00BBF9]/60'
                    }`}
                  >
                    <span className="text-xs font-bold">{fmt.label}</span>
                    <span
                      className={`text-[10px] mt-1 ${
                        exportFormat === fmt.id ? 'text-white/85' : 'text-slate-500'
                      }`}
                    >
                      {fmt.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Supersampling Scale */}
            <div>
              <label className="text-xs font-bold text-[#D9480F] uppercase tracking-wider mb-2 block">
                2. Output Resolution & Dimensions
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  {
                    scale: 1,
                    label: '1x Standard',
                    res: `${dimensions.width} x ${dimensions.height}`,
                    note: 'Quick Web',
                  },
                  {
                    scale: 2,
                    label: '2x High Def',
                    res: `${dimensions.width * 2} x ${dimensions.height * 2}`,
                    note: 'VTT & Screen',
                  },
                  {
                    scale: 4,
                    label: '4x Ultra 4K',
                    res: `${dimensions.width * 4} x ${dimensions.height * 4}`,
                    note: 'Tabletop Print',
                  },
                  {
                    scale: 8,
                    label: '8x Titan 8K',
                    res: `${dimensions.width * 8} x ${dimensions.height * 8}`,
                    note: 'Wall Poster',
                  },
                ].map((res) => (
                  <button
                    key={res.scale}
                    onClick={() => setScaleFactor(res.scale)}
                    className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                      scaleFactor === res.scale
                        ? 'bg-[#00BBF9]/15 border-[#00BBF9] text-slate-900 ring-2 ring-[#00BBF9]/30'
                        : 'bg-white border-[#E2D6B5] text-slate-700 hover:border-[#00BBF9]/60'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-800">{res.label}</div>
                    <div className="text-[10px] font-mono text-[#0077b6] font-bold mt-0.5">{res.res}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{res.note}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vignette & Vintage Map Accents */}
            <div className="bg-white p-3 rounded-lg border border-[#E2D6B5] flex flex-col gap-2.5">
              <div className="flex items-center justify-between text-xs text-slate-700">
                <span className="font-semibold text-slate-800">Edge Vignette Darkness:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={atmosphere?.vignette ?? 0.3}
                    onChange={(e) => onAtmosphereChange({ vignette: Number(e.target.value) })}
                    className="w-28 accent-[#00BBF9] cursor-pointer"
                  />
                  <span className="font-mono text-[#D9480F] font-bold w-8">
                    {Math.round((atmosphere?.vignette ?? 0.3) * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E2D6B5]/60 text-xs">
                <button
                  type="button"
                  onClick={() => onAtmosphereChange({ foldCreases: !atmosphere.foldCreases })}
                  className={`px-3 py-1 rounded font-semibold border transition-all cursor-pointer ${
                    atmosphere.foldCreases
                      ? 'bg-[#FF7E5F] text-white border-[#FF7E5F] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  4-Fold Map Creases
                </button>
                <button
                  type="button"
                  onClick={() => onAtmosphereChange({ weatheringStains: !atmosphere.weatheringStains })}
                  className={`px-3 py-1 rounded font-semibold border transition-all cursor-pointer ${
                    atmosphere.weatheringStains
                      ? 'bg-[#3e2723] text-white border-[#3e2723] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  Weathering Patina
                </button>
                <button
                  type="button"
                  onClick={() => onAtmosphereChange({ cloudShadows: !atmosphere.cloudShadows })}
                  className={`px-3 py-1 rounded font-semibold border transition-all cursor-pointer ${
                    atmosphere.cloudShadows
                      ? 'bg-[#475569] text-white border-[#334155] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  Cloud Shadows
                </button>
                <button
                  type="button"
                  onClick={() => onAtmosphereChange({ sunHaze: !atmosphere.sunHaze })}
                  className={`px-3 py-1 rounded font-semibold border transition-all cursor-pointer ${
                    atmosphere.sunHaze
                      ? 'bg-[#d97706] text-white border-[#b45309] shadow-xs'
                      : 'bg-white text-slate-700 border-[#E2D6B5] hover:bg-[#FDF6E3]'
                  }`}
                >
                  Sun Haze
                </button>
              </div>
            </div>

            {doneMsg && (
              <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 p-2.5 rounded-md font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{doneMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-between">
          <div className="text-xs text-slate-600 font-medium">
            Export Target:{' '}
            <span className="font-mono font-bold text-[#D9480F]">
              {targetW} x {targetH} px
            </span>
            {atmosphere.preset === 'vintage_parchment' && (
              <span className="ml-2 text-amber-800 font-semibold">(Canny Inked Parchment)</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-[#E2D6B5] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:from-[#f86c4a] hover:to-[#fea360] text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Rendering Map...' : 'Download Map'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
