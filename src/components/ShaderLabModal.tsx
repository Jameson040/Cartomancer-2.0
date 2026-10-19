/**
 * Cartomancer Fantasy Map Maker - Shader Lab & Image Color Picker Modal
 * Upload any image to pick colors with an interactive eyedropper, extract dominant palettes,
 * and create custom pattern shaders for realistic terrain texturing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BiomeTexture } from '../types';
import {
  X,
  Upload,
  Pipette,
  Palette,
  Sparkles,
  Layers,
  Check,
  ZoomIn,
  Sliders,
  Image as ImageIcon,
  Trash2,
  Brush,
} from 'lucide-react';
import { imageManager } from '../utils/imageManager';
import { analyzeTextureImage, darkenHex, rgbToHex } from '../utils/textureAnalysis';

interface ShaderLabModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomBiome?: (biome: BiomeTexture) => void;
  onSaveShader?: (biome: BiomeTexture) => void;
  onSelectBiome?: (biomeId: string) => void;
  customBiomes?: BiomeTexture[];
  onDeleteCustomBiome?: (biomeId: string) => void;
}

// Built-in starter pattern textures (procedural SVG data URIs for instant testing)
const STARTER_PATTERNS = [
  {
    name: 'Ocean Ripple Waves',
    detailType: 'water' as const,
    color: '#1a365d',
    roughnessColor: '#0f233a',
    scale: 48,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%231a365d"/><path d="M0 16 Q12 10 24 16 T48 16" stroke="%2338bdf8" stroke-width="2" fill="none" opacity="0.6"/><path d="M0 32 Q12 26 24 32 T48 32" stroke="%2338bdf8" stroke-width="1.8" fill="none" opacity="0.45"/><path d="M0 48 Q12 42 24 48 T48 48" stroke="%2338bdf8" stroke-width="2" fill="none" opacity="0.6"/></svg>`,
  },
  {
    name: 'Meadow Grass Blades',
    detailType: 'grass' as const,
    color: '#4d8036',
    roughnessColor: '#315a20',
    scale: 48,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23487c32"/><path d="M8 32 Q12 16 10 8 Q14 20 14 32" stroke="%23315a20" stroke-width="2.5" fill="none"/><path d="M24 40 Q28 20 32 12 Q30 26 28 40" stroke="%23315a20" stroke-width="2.5" fill="none"/><path d="M38 36 Q42 22 40 14 Q44 26 42 36" stroke="%235f9942" stroke-width="2" fill="none"/></svg>`,
  },
  {
    name: 'Rocky Crag',
    detailType: 'rock' as const,
    color: '#6b7280',
    roughnessColor: '#4b5260',
    scale: 48,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23606674"/><path d="M0 20 L24 0 L40 16 L64 4 L48 40 L64 64 L20 54 Z" fill="%234b5260" opacity="0.45"/><path d="M12 28 L32 18 L50 34 L38 52 Z" fill="%23374151" opacity="0.3"/><circle cx="18" cy="44" r="3" fill="%232b313d" opacity="0.4"/><circle cx="48" cy="18" r="4" fill="%232b313d" opacity="0.4"/></svg>`,
  },
  {
    name: 'Parchment Weave',
    detailType: 'parchment' as const,
    color: '#e4d3a8',
    roughnessColor: '#cbb585',
    scale: 40,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" fill="%23e4d3a8"/><path d="M0 0h48v2H0zm0 12h48v2H0zm0 12h48v2H0zm0 12h48v2H0z" fill="%23cbb585" opacity="0.25"/><path d="M0 0v48h2V0zm12 0v48h2V0zm12 0v48h2V0zm12 0v48h2V0z" fill="%23cbb585" opacity="0.25"/></svg>`,
  },
  {
    name: 'Desert Dunes',
    detailType: 'sand' as const,
    color: '#d4a853',
    roughnessColor: '#be913c',
    scale: 64,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" fill="%23d4a853"/><path d="M0 16 Q16 8 32 20 T64 16 L64 28 Q48 20 32 32 T0 28 Z" fill="%23be913c" opacity="0.45"/><path d="M0 44 Q20 36 40 48 T64 44 L64 54 Q44 46 24 58 T0 54 Z" fill="%23be913c" opacity="0.45"/></svg>`,
  },
  {
    name: 'Cobblestone Street',
    detailType: 'cobble' as const,
    color: '#71717a',
    roughnessColor: '#52525b',
    scale: 44,
    dataUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><rect width="44" height="44" fill="%2352525b"/><rect x="2" y="2" width="18" height="12" rx="3" fill="%2371717a"/><rect x="24" y="2" width="18" height="12" rx="3" fill="%2371717a"/><rect x="12" y="18" width="20" height="12" rx="3" fill="%2364646e"/><rect x="2" y="32" width="18" height="10" rx="3" fill="%2371717a"/><rect x="24" y="32" width="18" height="10" rx="3" fill="%2371717a"/></svg>`,
  },
];

export const ShaderLabModal: React.FC<ShaderLabModalProps> = ({
  isOpen,
  onClose,
  onAddCustomBiome,
  onSaveShader,
  onSelectBiome,
  customBiomes = [],
  onDeleteCustomBiome,
}) => {
  const [activeTab, setActiveTab] = useState<'picker' | 'pattern' | 'saved'>('picker');
  const [savedToast, setSavedToast] = useState<string | null>(null);

  // Eyedropper / Image State
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string>('#4d8036');
  const [hoverColor, setHoverColor] = useState<string | null>(null);
  const [loupePos, setLoupePos] = useState<{ x: number; y: number } | null>(null);
  const [dominantPalette, setDominantPalette] = useState<string[]>([]);
  const [customName, setCustomName] = useState<string>('Custom Glade');
  const [customDetailType, setCustomDetailType] = useState<BiomeTexture['detailType']>('grass');
  const [customElevation, setCustomElevation] = useState<number>(20);

  // Pattern Shader State
  const [patternSrc, setPatternSrc] = useState<string>(STARTER_PATTERNS[0].dataUrl);
  const [patternName, setPatternName] = useState<string>('Meadow Grass Blades');
  const [patternScale, setPatternScale] = useState<number>(48);
  const [patternColor, setPatternColor] = useState<string>(STARTER_PATTERNS[0].color);
  const [patternRoughnessColor, setPatternRoughnessColor] = useState<string>(STARTER_PATTERNS[0].roughnessColor);
  const [patternDetailType, setPatternDetailType] = useState<BiomeTexture['detailType']>('grass');
  const [patternElevation, setPatternElevation] = useState<number>(20);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const patternFileInputRef = useRef<HTMLInputElement>(null);

  // Draw image on canvas whenever imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fit inside 500x320 box keeping aspect ratio
      const maxW = 520;
      const maxH = 300;
      let w = img.width;
      let h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      // Auto-extract dominant palette using safe analysis
      const analysis = analyzeTextureImage(img, customName);
      setDominantPalette(analysis.palette);
      if (analysis.palette.length > 0) {
        setPickedColor(analysis.dominantColor);
      }
      setCustomDetailType(analysis.suggestedDetailType);
      setCustomElevation(analysis.suggestedElevation);
    };
    img.src = imageSrc;
  }, [imageSrc]);

  // Handle image upload from user (Eyedropper tab)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImageSrc(url);
      setCustomName(file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
      // Pre-cache image for immediate reuse
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageManager.cacheDirectImage(url, img);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Convert uploaded Eyedropper image into a Tiled Pattern Shader with 1 click
  const handleTransferToPatternShader = () => {
    if (!imageSrc) return;
    setPatternSrc(imageSrc);
    setPatternName(customName ? `${customName} Pattern` : 'Custom Pattern');
    setPatternColor(pickedColor);
    setPatternRoughnessColor(darkenHex(pickedColor, 0.25));
    setPatternDetailType(customDetailType);
    setPatternElevation(customElevation);
    setActiveTab('pattern');
  };

  // Handle pattern file upload (Pattern Shader tab)
  const handlePatternFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setPatternSrc(url);
      setPatternName(`${cleanName} Shader`);

      // Analyze image to extract vibrant green/terrain color
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageManager.cacheDirectImage(url, img);
        const analysis = analyzeTextureImage(img, cleanName);
        setPatternColor(analysis.dominantColor);
        setPatternRoughnessColor(analysis.roughnessColor);
        setPatternDetailType(analysis.suggestedDetailType);
        setPatternElevation(analysis.suggestedElevation);
      };
      img.src = url;
    };
    reader.readAsDataURL(file);
  };

  // Eyedropper click & hover
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(e.clientX - rect.left);
    const y = Math.floor(e.clientY - rect.top);

    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) {
      setHoverColor(null);
      setLoupePos(null);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);

    setHoverColor(hex);
    setLoupePos({ x, y });
  };

  const handleCanvasClick = () => {
    if (hoverColor) {
      setPickedColor(hoverColor);
    }
  };

  // Save color biome
  const handleSaveColorBiome = () => {
    const newId = `custom_biome_${Date.now()}`;
    const name = customName.trim() || 'Custom Hue';
    const newBiome: BiomeTexture = {
      id: newId,
      name,
      color: pickedColor,
      roughnessColor: darkenHex(pickedColor, 0.25),
      detailType: customDetailType,
      defaultElevation: customElevation,
      isCustom: true,
    };

    if (onAddCustomBiome) onAddCustomBiome(newBiome);
    if (onSaveShader) onSaveShader(newBiome);
    if (onSelectBiome) onSelectBiome(newId);

    setSavedToast(`Saved "${name}"! Active on your brush.`);
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 600);
  };

  // Save pattern biome
  const handleSavePatternBiome = () => {
    const newId = `pattern_biome_${Date.now()}`;
    const name = patternName.trim() || 'Pattern Shader';

    // Synchronously cache the image under both the new ID and patternSrc URL
    const patImg = new Image();
    patImg.crossOrigin = 'anonymous';
    patImg.onload = () => {
      imageManager.cacheDirectImage(newId, patImg);
      imageManager.cacheDirectImage(patternSrc, patImg);
    };
    patImg.src = patternSrc;
    imageManager.loadImage(patternSrc, newId);

    const newBiome: BiomeTexture = {
      id: newId,
      name,
      // Save the REAL dominant color (e.g. green for grass), NEVER hardcoded grey!
      color: patternColor || '#4d8036',
      roughnessColor: patternRoughnessColor || darkenHex(patternColor || '#4d8036', 0.25),
      detailType: patternDetailType,
      defaultElevation: patternElevation,
      isPattern: true,
      patternImageUrl: patternSrc,
      patternScale,
      isCustom: true,
    };

    if (onAddCustomBiome) onAddCustomBiome(newBiome);
    if (onSaveShader) onSaveShader(newBiome);
    if (onSelectBiome) onSelectBiome(newId);

    setSavedToast(`Saved "${name}"! Active on your brush.`);
    setTimeout(() => {
      setSavedToast(null);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div
      id="shader-lab-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        id="shader-lab-modal"
        className="bg-[#FDF6E3] border-2 border-[#E2D6B5] rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden text-slate-800 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF7E5F]/15 border border-[#FF7E5F]/40 flex items-center justify-center text-[#FF7E5F]">
              <Pipette className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Cinzel'] font-bold text-lg text-slate-800 tracking-wider">
                Shader Lab
              </h2>
              <p className="text-xs text-slate-600">
                Sample custom palettes with an eyedropper, or create seamless land & sea pattern shaders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="px-6 pt-3 border-b border-[#E2D6B5] flex gap-3 bg-[#F9F3DF]/60">
          <button
            onClick={() => setActiveTab('picker')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'picker'
                ? 'border-[#FF7E5F] text-[#D9480F]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Pipette className="w-4 h-4" />
            <span>Image Eyedropper & Palette</span>
          </button>
          <button
            onClick={() => setActiveTab('pattern')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'pattern'
                ? 'border-[#00BBF9] text-[#0077B6]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Terrain Pattern Shaders</span>
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeTab === 'saved'
                ? 'border-[#06D6A0] text-[#059669]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Saved Shaders ({customBiomes.length})</span>
          </button>
        </div>

        {savedToast && (
          <div className="bg-[#06D6A0]/20 border-b border-[#06D6A0] px-6 py-2 text-xs font-bold text-emerald-900 flex items-center gap-2 animate-in fade-in duration-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{savedToast}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'picker' && (
            <div className="space-y-6">
              {/* Image Upload Area */}
              {!imageSrc ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#E2D6B5] hover:border-[#FF7E5F] bg-white rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-[#FF7E5F]/5 group text-center"
                >
                  <div className="w-12 h-12 rounded-full bg-[#FF7E5F]/15 text-[#FF7E5F] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 mb-1">
                    Upload Inspiration Image or Photo
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Drop a fantasy landscape, reference painting, or photo to sample colors directly with the loupe eyedropper
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Canvas Eyedropper Stage */}
                  <div className="relative border border-[#E2D6B5] rounded-xl bg-slate-900/5 p-2 flex flex-col items-center overflow-hidden">
                    <div className="relative cursor-crosshair inline-block">
                      <canvas
                        ref={canvasRef}
                        onMouseMove={handleCanvasMouseMove}
                        onClick={handleCanvasClick}
                        onMouseLeave={() => {
                          setHoverColor(null);
                          setLoupePos(null);
                        }}
                        className="rounded-lg shadow-sm border border-black/10 max-h-[260px] object-contain"
                      />

                      {/* Floating Magnifier Loupe */}
                      {loupePos && hoverColor && (
                        <div
                          className="absolute pointer-events-none rounded-full border-2 border-white shadow-xl flex items-center justify-center text-[9px] font-mono font-bold text-white z-20"
                          style={{
                            width: 52,
                            height: 52,
                            left: loupePos.x - 26,
                            top: loupePos.y - 64,
                            backgroundColor: hoverColor,
                            textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                          }}
                        >
                          {hoverColor}
                        </div>
                      )}
                    </div>

                    <div className="w-full flex items-center justify-between text-xs text-slate-500 mt-2 px-2">
                      <span>Click anywhere on the image to sample pixel color</span>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#FF7E5F] font-bold hover:underline"
                      >
                        Change Image
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Dominant Palette Swatches */}
                  {dominantPalette.length > 0 && (
                    <div className="p-3 bg-white rounded-xl border border-[#E2D6B5] flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                        <Sparkles className="w-3.5 h-3.5 text-[#FF7E5F]" />
                        <span>Extracted Dominant Palette (1-Click Pick):</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {dominantPalette.map((hex, idx) => (
                          <button
                            key={idx}
                            onClick={() => setPickedColor(hex)}
                            className={`group relative w-9 h-9 rounded-lg border-2 shadow-xs transition-transform hover:scale-110 flex items-center justify-center ${
                              pickedColor === hex
                                ? 'border-[#FF7E5F] ring-2 ring-[#FF7E5F]/50 scale-105'
                                : 'border-black/20 hover:border-black/50'
                            }`}
                            style={{ backgroundColor: hex }}
                            title={hex}
                          >
                            {pickedColor === hex && (
                              <Check className="w-4 h-4 text-white drop-shadow" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Color Details & Add Form */}
                  <div className="p-4 bg-white rounded-xl border border-[#E2D6B5] grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-xl border-2 border-[#E2D6B5] shadow-inner flex items-center justify-center shrink-0"
                        style={{ backgroundColor: pickedColor }}
                      >
                        <input
                          type="color"
                          value={pickedColor}
                          onChange={(e) => setPickedColor(e.target.value)}
                          className="opacity-0 w-full h-full cursor-pointer"
                          title="Click to fine-tune color"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">
                          Shader Name
                        </label>
                        <input
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs rounded border border-[#E2D6B5] focus:outline-none focus:border-[#FF7E5F]"
                          placeholder="e.g. Sylvan Moss"
                        />
                        <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                          Hex: {pickedColor}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600 w-24">
                          Terrain Type:
                        </label>
                        <select
                          value={customDetailType}
                          onChange={(e) =>
                            setCustomDetailType(e.target.value as BiomeTexture['detailType'])
                          }
                          className="flex-1 px-2 py-1 text-xs rounded border border-[#E2D6B5] bg-white focus:outline-none"
                        >
                          <option value="grass">Meadow / Grassland</option>
                          <option value="water">Sea / Ocean / Water</option>
                          <option value="sand">Sand / Desert</option>
                          <option value="rock">Rock / Mountain</option>
                          <option value="snow">Snow / Ice</option>
                          <option value="swamp">Swamp / Marsh</option>
                          <option value="volcanic">Volcanic / Ash</option>
                          <option value="parchment">Parchment / Plain</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600 w-24">
                          Default Height:
                        </label>
                        <input
                          type="range"
                          min="-50"
                          max="80"
                          value={customElevation}
                          onChange={(e) => setCustomElevation(Number(e.target.value))}
                          className="flex-1 accent-[#FF7E5F] cursor-pointer"
                        />
                        <span className="text-xs font-mono text-slate-700 w-8">
                          {customElevation}m
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E2D6B5] flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Want to tile this image as an organic texture brush?
                      </span>
                      <button
                        onClick={handleTransferToPatternShader}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#00BBF9]/15 hover:bg-[#00BBF9]/25 text-[#0077B6] border border-[#00BBF9]/30 text-xs font-bold transition-all"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Use as Tiled Pattern Shader &rarr;</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'pattern' && (
            <div className="space-y-6">
              {/* Presets & Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Choose Built-in Texture or Upload Seamless Tile:
                  </span>
                  <button
                    onClick={() => patternFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-[#00BBF9]/15 text-[#0077B6] rounded border border-[#00BBF9]/30 hover:bg-[#00BBF9]/25 transition-all"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Custom Image</span>
                  </button>
                  <input
                    ref={patternFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePatternFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {STARTER_PATTERNS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPatternSrc(p.dataUrl);
                        setPatternName(p.name + ' Shader');
                        setPatternColor(p.color);
                        setPatternRoughnessColor(p.roughnessColor || darkenHex(p.color, 0.25));
                        setPatternDetailType(p.detailType);
                        setPatternScale(p.scale);
                      }}
                      className={`p-2 rounded-lg border text-left flex flex-col gap-1.5 transition-all ${
                        patternSrc === p.dataUrl
                          ? 'border-[#00BBF9] bg-[#00BBF9]/10 ring-2 ring-[#00BBF9]/30'
                          : 'border-[#E2D6B5] bg-white hover:bg-[#FDF6E3]'
                      }`}
                    >
                      <div
                        className="w-full h-14 rounded border border-black/10 shadow-inner"
                        style={{
                          backgroundImage: `url(${p.dataUrl})`,
                          backgroundSize: `${p.scale}px`,
                        }}
                      />
                      <span className="text-[11px] font-bold text-slate-800 truncate">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Seamless Tiling Live Preview Box */}
              <div className="p-4 bg-white rounded-xl border border-[#E2D6B5] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Live Tiled Terrain Preview:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono">
                      Scale: {patternScale}px
                    </span>
                    <div
                      className="w-4 h-4 rounded-full border border-black/30 shadow-inner"
                      style={{ backgroundColor: patternColor }}
                      title={`Base Tint & Blending Color: ${patternColor}`}
                    />
                  </div>
                </div>

                <div
                  className="w-full h-44 rounded-lg border border-black/15 shadow-inner"
                  style={{
                    backgroundImage: `url(${patternSrc})`,
                    backgroundSize: `${patternScale}px ${patternScale}px`,
                    backgroundRepeat: 'repeat',
                  }}
                />

                {/* Configuration Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Pattern Shader Name
                    </label>
                    <input
                      type="text"
                      value={patternName}
                      onChange={(e) => setPatternName(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs rounded border border-[#E2D6B5] focus:outline-none focus:border-[#00BBF9]"
                      placeholder="e.g. Lush Meadow Grass"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Tiling Scale ({patternScale}px)
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="160"
                      value={patternScale}
                      onChange={(e) => setPatternScale(Number(e.target.value))}
                      className="w-full accent-[#00BBF9] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-600">
                        Base / Fallback Color
                      </label>
                      <span className="text-[10px] font-mono text-slate-500">{patternColor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded border border-black/30 shadow-inner relative overflow-hidden shrink-0"
                        style={{ backgroundColor: patternColor }}
                      >
                        <input
                          type="color"
                          value={patternColor}
                          onChange={(e) => {
                            setPatternColor(e.target.value);
                            setPatternRoughnessColor(darkenHex(e.target.value, 0.25));
                          }}
                          className="opacity-0 w-full h-full cursor-pointer absolute inset-0"
                          title="Click to adjust texture base color"
                        />
                      </div>
                      <span className="text-[11px] text-slate-600">
                        Used for natural biome edge blending and fallback
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      Terrain Classification
                    </label>
                    <select
                      value={patternDetailType}
                      onChange={(e) =>
                        setPatternDetailType(e.target.value as BiomeTexture['detailType'])
                      }
                      className="w-full px-2.5 py-1 text-xs rounded border border-[#E2D6B5] bg-white focus:outline-none"
                    >
                      <option value="grass">Meadow / Grassland</option>
                      <option value="water">Sea / Ocean / Water</option>
                      <option value="sand">Sand / Desert</option>
                      <option value="rock">Rock / Mountain</option>
                      <option value="snow">Snow / Ice</option>
                      <option value="swamp">Swamp / Marsh</option>
                      <option value="volcanic">Volcanic / Ash</option>
                      <option value="parchment">Parchment / Plain</option>
                      <option value="cobble">Cobblestone / Path</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2D6B5]">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Your Saved Custom Shaders & Colors</h3>
                  <p className="text-xs text-slate-500">
                    Click "Select & Paint" to instantly load any shader onto your terrain brush.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('picker')}
                  className="px-3 py-1 bg-[#FF7E5F]/15 hover:bg-[#FF7E5F]/25 text-[#D9480F] border border-[#FF7E5F]/40 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Pipette className="w-3.5 h-3.5" />
                  <span>+ Create New Shader</span>
                </button>
              </div>

              {customBiomes.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-[#E2D6B5] space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Palette className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">No Custom Shaders Saved Yet</p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                      Upload an image in the "Image Eyedropper" tab or choose a seamless texture in the "Terrain Pattern Shaders" tab to save your first shader.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveTab('picker')}
                    className="px-4 py-1.5 bg-[#FF7E5F] text-white font-bold rounded-lg text-xs hover:bg-[#e06a4b] transition-colors shadow-xs"
                  >
                    Open Image Eyedropper
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customBiomes.map((biome) => (
                    <div
                      key={biome.id}
                      className="p-3.5 bg-white rounded-xl border border-[#E2D6B5] hover:border-[#06D6A0] transition-all flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {biome.isPattern && biome.patternImageUrl ? (
                          <div
                            className="w-12 h-12 rounded-lg border border-black/20 shadow-inner shrink-0"
                            style={{
                              backgroundImage: `url(${biome.patternImageUrl})`,
                              backgroundSize: 'cover',
                            }}
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-lg border border-black/20 shadow-inner shrink-0 flex items-center justify-center"
                            style={{ backgroundColor: biome.color }}
                          />
                        )}
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{biome.name}</h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="capitalize">{biome.detailType}</span>
                            <span>•</span>
                            <span className="font-mono">{biome.isPattern ? 'Pattern' : biome.color}</span>
                          </div>
                          {biome.defaultElevation !== undefined && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              Height: {biome.defaultElevation}m
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => {
                            if (onSelectBiome) onSelectBiome(biome.id);
                            onClose();
                          }}
                          className="px-2.5 py-1.5 bg-[#06D6A0] hover:bg-[#05b586] text-white font-bold rounded-lg text-xs flex items-center gap-1 transition-colors shadow-xs"
                          title="Select this shader and activate on terrain brush"
                        >
                          <Brush className="w-3.5 h-3.5" />
                          <span>Paint</span>
                        </button>
                        {onDeleteCustomBiome && (
                          <button
                            onClick={() => onDeleteCustomBiome(biome.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete custom shader"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-[#E2D6B5] transition-colors"
          >
            Close
          </button>

          {activeTab === 'picker' ? (
            <button
              onClick={handleSaveColorBiome}
              className="px-5 py-1.5 bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:from-[#f86c4a] hover:to-[#fea360] text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Use Color Biome</span>
            </button>
          ) : activeTab === 'pattern' ? (
            <button
              onClick={handleSavePatternBiome}
              className="px-5 py-1.5 bg-gradient-to-r from-[#00BBF9] to-[#00F5D4] hover:from-[#0096c7] hover:to-[#05d5aa] text-slate-900 font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save & Use Pattern Shader</span>
            </button>
          ) : (
            <button
              onClick={() => setActiveTab('picker')}
              className="px-4 py-1.5 bg-[#FF7E5F] hover:bg-[#e06a4b] text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Pipette className="w-4 h-4" />
              <span>Create Another Shader</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
