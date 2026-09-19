/**
 * Cartomancer Fantasy Map Maker - Map & Image Import / Outline Extraction Modal
 * Allows uploading PNG/JPG images to extract terrain outlines as landmass masks,
 * or load them as reference trace blueprints to draw upon.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  Layers,
  Sparkles,
  Sliders,
  Check,
  RotateCcw,
  Eye,
  SlidersHorizontal,
  Compass,
} from 'lucide-react';
import { ReferenceMapConfig } from '../types';

interface MapImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasWidth: number;
  canvasHeight: number;
  onApplyExtractedMask: (maskCanvasData: ImageData) => void;
  onSetReferenceMap: (config: ReferenceMapConfig) => void;
  onApplyBaseTextureImage: (imgElement: HTMLImageElement) => void;
}

export const MapImportModal: React.FC<MapImportModalProps> = ({
  isOpen,
  onClose,
  canvasWidth,
  canvasHeight,
  onApplyExtractedMask,
  onSetReferenceMap,
  onApplyBaseTextureImage,
}) => {
  const [activeMode, setActiveMode] = useState<'extract_outline' | 'reference_trace' | 'base_texture'>('extract_outline');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Extraction Settings
  const [threshold, setThreshold] = useState<number>(128);
  const [invertMask, setInvertMask] = useState<boolean>(false);
  const [useAlphaChannel, setUseAlphaChannel] = useState<boolean>(false);
  const [smoothing, setSmoothing] = useState<boolean>(true);

  // Reference Blueprint Settings
  const [refOpacity, setRefOpacity] = useState<number>(0.45);
  const [refBlendMode, setRefBlendMode] = useState<ReferenceMapConfig['blendMode']>('multiply');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const loadedImageRef = useRef<HTMLImageElement | null>(null);

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Process and update extraction preview whenever image or settings change
  const updateExtractionPreview = useCallback(() => {
    const img = loadedImageRef.current;
    if (!img) return;

    const origCanvas = originalCanvasRef.current;
    const prevCanvas = previewCanvasRef.current;
    if (!origCanvas || !prevCanvas) return;

    origCanvas.width = canvasWidth;
    origCanvas.height = canvasHeight;
    prevCanvas.width = canvasWidth;
    prevCanvas.height = canvasHeight;

    const oCtx = origCanvas.getContext('2d');
    const pCtx = prevCanvas.getContext('2d');
    if (!oCtx || !pCtx) return;

    // Draw original scaled to canvas
    oCtx.clearRect(0, 0, canvasWidth, canvasHeight);
    oCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);

    // Process mask
    const srcData = oCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    const srcPix = srcData.data;

    // We generate both a preview visualization and the target mask data
    const previewData = pCtx.createImageData(canvasWidth, canvasHeight);
    const pPix = previewData.data;

    const totalPixels = canvasWidth * canvasHeight;

    for (let p = 0; p < totalPixels; p++) {
      const i = p * 4;
      const r = srcPix[i];
      const g = srcPix[i + 1];
      const b = srcPix[i + 2];
      const a = srcPix[i + 3];

      let isLand = false;

      if (useAlphaChannel && a < 250) {
        // Transparent PNG mode: non-transparent pixels are land
        isLand = a > 40;
      } else {
        // Luminance mode: 0.299R + 0.587G + 0.114B
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        isLand = invertMask ? lum < threshold : lum > threshold;
      }

      if (isLand) {
        // Land in preview: Parchment / Gold with green tint
        pPix[i] = 232;
        pPix[i + 1] = 216;
        pPix[i + 2] = 181;
        pPix[i + 3] = 255;
      } else {
        // Water in preview: Deep Ocean Blue
        pPix[i] = 12;
        pPix[i + 1] = 74;
        pPix[i + 2] = 110;
        pPix[i + 3] = 255;
      }
    }

    pCtx.putImageData(previewData, 0, 0);
  }, [canvasWidth, canvasHeight, threshold, invertMask, useAlphaChannel, smoothing]);

  // Load image when imageSrc changes
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      loadedImageRef.current = img;
      // Auto-detect if transparent PNG
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 64;
      tempCanvas.height = 64;
      const tCtx = tempCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(img, 0, 0, 64, 64);
        const data = tCtx.getImageData(0, 0, 64, 64).data;
        let hasTrans = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] < 200) {
            hasTrans = true;
            break;
          }
        }
        if (hasTrans) {
          setUseAlphaChannel(true);
        }
      }
      updateExtractionPreview();
    };
    img.src = imageSrc;
  }, [imageSrc, updateExtractionPreview]);

  // Re-run preview on parameter change
  useEffect(() => {
    if (loadedImageRef.current) {
      updateExtractionPreview();
    }
  }, [updateExtractionPreview]);

  // Execute: Apply Extracted Mask
  const handleApplyMask = () => {
    const img = loadedImageRef.current;
    if (!img) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasWidth;
    tempCanvas.height = canvasHeight;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    tCtx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
    const srcData = tCtx.getImageData(0, 0, canvasWidth, canvasHeight);
    const srcPix = srcData.data;

    // Generate real mask ImageData (white = land, 0 alpha = water)
    const maskData = tCtx.createImageData(canvasWidth, canvasHeight);
    const mPix = maskData.data;

    const totalPixels = canvasWidth * canvasHeight;
    for (let p = 0; p < totalPixels; p++) {
      const i = p * 4;
      const r = srcPix[i];
      const g = srcPix[i + 1];
      const b = srcPix[i + 2];
      const a = srcPix[i + 3];

      let isLand = false;
      if (useAlphaChannel && a < 250) {
        isLand = a > 40;
      } else {
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        isLand = invertMask ? lum < threshold : lum > threshold;
      }

      if (isLand) {
        mPix[i] = 255;
        mPix[i + 1] = 255;
        mPix[i + 2] = 255;
        mPix[i + 3] = 255;
      } else {
        mPix[i] = 0;
        mPix[i + 1] = 0;
        mPix[i + 2] = 0;
        mPix[i + 3] = 0;
      }
    }

    onApplyExtractedMask(maskData);
    onClose();
  };

  // Execute: Set Reference Map Blueprint
  const handleApplyReferenceMap = () => {
    if (!imageSrc) return;
    onSetReferenceMap({
      imageUrl: imageSrc,
      opacity: refOpacity,
      visible: true,
      blendMode: refBlendMode,
    });
    onClose();
  };

  // Execute: Apply as Base Texture
  const handleApplyTexture = () => {
    if (!loadedImageRef.current) return;
    onApplyBaseTextureImage(loadedImageRef.current);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="map-import-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        id="map-import-modal"
        className="bg-[#FDF6E3] border-2 border-[#E2D6B5] rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00BBF9]/15 border border-[#00BBF9]/40 flex items-center justify-center text-[#0077B6]">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Cinzel'] font-bold text-lg text-slate-800 tracking-wider">
                Import Map / Extract Terrain Outline
              </h2>
              <p className="text-xs text-slate-600">
                Upload sketches, coastlines, or existing maps to extract editable landmasses or trace blueprints
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

        {/* Mode Selector */}
        <div className="px-6 pt-3 border-b border-[#E2D6B5] flex gap-3 bg-[#F9F3DF]/60">
          <button
            onClick={() => setActiveMode('extract_outline')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'extract_outline'
                ? 'border-[#FF7E5F] text-[#D9480F]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>1. Extract Terrain Outline (Auto Landmass)</span>
          </button>
          <button
            onClick={() => setActiveMode('reference_trace')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'reference_trace'
                ? 'border-[#00BBF9] text-[#0077B6]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>2. Draw Over as Reference Blueprint</span>
          </button>
          <button
            onClick={() => setActiveMode('base_texture')}
            className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeMode === 'base_texture'
                ? 'border-[#00F5D4] text-[#059669]'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>3. Paint as Base Texture</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Upload Dropzone */}
          {!imageSrc ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#E2D6B5] hover:border-[#FF7E5F] bg-white rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-[#FF7E5F]/5 group text-center"
            >
              <div className="w-14 h-14 rounded-full bg-[#00BBF9]/15 text-[#0077B6] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Click or Drop Map Image Here (PNG, JPG, WebP)
              </h3>
              <p className="text-xs text-slate-500 max-w-md">
                Upload any hand-drawn map sketch, black-and-white continent outline, or fantasy map screenshot to convert into an editable realm
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Dual Canvas Live Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Source Image */}
                <div className="p-3 bg-white rounded-xl border border-[#E2D6B5] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Original Uploaded Image:</span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[#FF7E5F] hover:underline text-[11px]"
                    >
                      Change Image
                    </button>
                  </div>
                  <div className="w-full h-52 bg-slate-900/5 rounded-lg border border-black/10 flex items-center justify-center overflow-hidden">
                    <canvas
                      ref={originalCanvasRef}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>

                {/* Right: Real-time Extracted Result Preview */}
                <div className="p-3 bg-white rounded-xl border border-[#E2D6B5] flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF7E5F]" />
                      <span>Extracted Landmass Preview (Live):</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Land: Gold | Water: Navy
                    </span>
                  </div>
                  <div className="w-full h-52 bg-slate-900/5 rounded-lg border border-black/10 flex items-center justify-center overflow-hidden">
                    <canvas
                      ref={previewCanvasRef}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Extraction Parameters Toolbar */}
              {activeMode === 'extract_outline' && (
                <div className="p-4 bg-white rounded-xl border border-[#E2D6B5] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <SlidersHorizontal className="w-4 h-4 text-[#FF7E5F]" />
                      <span>Outline Extraction Sensitivity:</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700">
                      Threshold: {threshold} / 255
                    </span>
                  </div>

                  <input
                    type="range"
                    min="10"
                    max="245"
                    value={threshold}
                    onChange={(e) => setThreshold(Number(e.target.value))}
                    className="w-full accent-[#FF7E5F] cursor-pointer"
                  />

                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invertMask}
                        onChange={(e) => setInvertMask(e.target.checked)}
                        className="rounded accent-[#FF7E5F]"
                      />
                      <span>Invert Land / Water detection</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useAlphaChannel}
                        onChange={(e) => setUseAlphaChannel(e.target.checked)}
                        className="rounded accent-[#FF7E5F]"
                      />
                      <span>Use PNG Transparency / Alpha Channel</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Reference Blueprint Parameters Toolbar */}
              {activeMode === 'reference_trace' && (
                <div className="p-4 bg-white rounded-xl border border-[#E2D6B5] space-y-3">
                  <div className="text-xs font-bold text-slate-800">
                    Configure Trace Blueprint Overlay:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex justify-between text-xs text-slate-600 mb-1">
                        <span>Blueprint Opacity:</span>
                        <span className="font-mono">{Math.round(refOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.05"
                        value={refOpacity}
                        onChange={(e) => setRefOpacity(Number(e.target.value))}
                        className="w-full accent-[#00BBF9] cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-600 block mb-1">
                        Blend Mode:
                      </label>
                      <select
                        value={refBlendMode}
                        onChange={(e) =>
                          setRefBlendMode(e.target.value as ReferenceMapConfig['blendMode'])
                        }
                        className="w-full px-2.5 py-1 text-xs rounded border border-[#E2D6B5] bg-white focus:outline-none"
                      >
                        <option value="multiply">Multiply (Dark sketch on parchment)</option>
                        <option value="normal">Normal (Direct overlay)</option>
                        <option value="screen">Screen (Light linework)</option>
                        <option value="overlay">Overlay (Vibrant contrast)</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    This keeps your current map completely intact and overlays your sketch as a reference guide. You can trace coastlines, place mountains, and paint biomes right over it!
                  </p>
                </div>
              )}

              {/* Base Texture Mode */}
              {activeMode === 'base_texture' && (
                <div className="p-4 bg-white rounded-xl border border-[#E2D6B5]">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    This mode draws the uploaded image directly onto your map's active terrain texture layer, clipped inside your existing coastlines.
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-[#E2D6B5] transition-colors"
          >
            Cancel
          </button>

          {imageSrc && (
            <div>
              {activeMode === 'extract_outline' && (
                <button
                  onClick={handleApplyMask}
                  className="px-5 py-1.5 bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:from-[#f86c4a] hover:to-[#fea360] text-white font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply as Realm Landmass</span>
                </button>
              )}

              {activeMode === 'reference_trace' && (
                <button
                  onClick={handleApplyReferenceMap}
                  className="px-5 py-1.5 bg-gradient-to-r from-[#00BBF9] to-[#00F5D4] hover:from-[#0096c7] hover:to-[#05d5aa] text-slate-900 font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" />
                  <span>Set as Trace Blueprint</span>
                </button>
              )}

              {activeMode === 'base_texture' && (
                <button
                  onClick={handleApplyTexture}
                  className="px-5 py-1.5 bg-gradient-to-r from-[#00F5D4] to-[#00BBF9] text-slate-900 font-bold rounded-lg text-xs transition-colors shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply to Terrain Layer</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
