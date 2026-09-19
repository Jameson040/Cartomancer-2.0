/**
 * Cartomancer - Fantasy Map Maker
 * High-performance, professional-grade fantasy map creator
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  AtmosphereFilter,
  BiomePreset,
  BiomeTexture,
  BrushSettings,
  CanvasDimensions,
  GridConfig,
  HistoryStep,
  LayerState,
  MapProject,
  PathStyle,
  PlacedPath,
  PlacedStamp,
  PlacedText,
  ReferenceMapConfig,
  StampAsset,
  TextBannerStyle,
  TextPresetStyle,
  ToolType,
  WorldElevationConfig,
} from './types';
import { DEFAULT_BIOMES, DEFAULT_STAMP_ASSETS } from './data/defaultAssets';
import { TEMPLATES } from './data/templates';
import { imageManager, getScaledPatternTile } from './utils/imageManager';
import { assetStorage } from './utils/assetStorage';
import { projectAutosave, AutosavePayload, AutosaveRecord } from './utils/projectAutosave';
import { ParchmentFilterOptions } from './utils/cannyEdgeFilter';
import { CanvasRenderer } from './utils/canvasRenderer';
import { analyzeTextureImage } from './utils/textureAnalysis';
import {
  DEFAULT_WORLD_ELEVATION,
  deriveTopographyFromDrawnMap,
  bakeTopographyToCanvas,
  applySlopeLimitedDeposition,
  computeHydrologicalDrainagePath,
  carveRiverGorge,
} from './utils/elevationModel';
import {
  drawFractalDab,
  simulateHydraulicErosion,
  applyColorJitter,
  drawTurbulentElevationDab,
} from './utils/proceduralNoise';
import { Navbar } from './components/Navbar';
import { ToolPalette } from './components/ToolPalette';
import { ToolSettingsPanel } from './components/ToolSettingsPanel';
import { LayersPanel } from './components/LayersPanel';
import { AssetLibraryModal } from './components/AssetLibraryModal';
import { ExportModal } from './components/ExportModal';
import { TemplatesModal } from './components/TemplatesModal';
import { HelpShortcutsModal } from './components/HelpShortcutsModal';
import { ShaderLabModal } from './components/ShaderLabModal';
import { MapImportModal } from './components/MapImportModal';
import { AssetOutlinerModal } from './components/AssetOutlinerModal';
import {
  isPointInStamp,
  getStampHitHandle,
  isPointInLabel,
  isPointNearPath,
  getStampsFrontToBack,
} from './utils/hitTesting';

const DEFAULT_DIMENSIONS: CanvasDimensions = { width: 1400, height: 900 };
const MAX_HISTORY_STEPS = 25;

// Helper to calculate identical RGB with zero alpha, preventing black border fringe
function hexToRgba(hexOrColor: string, alpha: number): string {
  if (hexOrColor.startsWith('#')) {
    let c = hexOrColor.substring(1);
    if (c.length === 3) {
      c = c.split('').map((x) => x + x).join('');
    }
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (hexOrColor.startsWith('rgb')) {
    const parts = hexOrColor.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  }
  return `rgba(200, 200, 200, ${alpha})`;
}

export default function App() {
  // --- Project State ---
  const [projectName, setProjectName] = useState('Realm of Eldoria');
  const [dimensions] = useState<CanvasDimensions>(DEFAULT_DIMENSIONS);
  const [waterDeepColor, setWaterDeepColor] = useState('#1a365d');
  const [waterShallowColor, setWaterShallowColor] = useState('#2b6cb0');
  const [topographicalView, setTopographicalView] = useState(false);
  const [elevationConfig, setElevationConfig] = useState<WorldElevationConfig>(DEFAULT_WORLD_ELEVATION);

  // Layers
  const [layers, setLayers] = useState({
    water: { id: 'water', name: 'Ocean Base', visible: true, locked: false, opacity: 1.0 },
    landmass: { id: 'landmass', name: 'Landmass & Coastlines', visible: true, locked: false, opacity: 1.0 },
    textures: { id: 'textures', name: 'Biome Textures', visible: true, locked: false, opacity: 1.0 },
    elevation: { id: 'elevation', name: 'Elevation Relief', visible: true, locked: false, opacity: 1.0 },
    stamps: { id: 'stamps', name: 'Stamps & Objects', visible: true, locked: false, opacity: 1.0 },
    paths: { id: 'paths', name: 'Paths & Rivers', visible: true, locked: false, opacity: 1.0 },
    labels: { id: 'labels', name: 'Map Labels', visible: true, locked: false, opacity: 1.0 },
    grid: { id: 'grid', name: 'Tactical Grid', visible: false, locked: false, opacity: 0.6 },
    atmosphere: { id: 'atmosphere', name: 'Atmosphere & Filter', visible: true, locked: false, opacity: 1.0 },
  });

  // Tactical Grid
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    type: 'none',
    size: 48,
    color: '#ffffff',
    opacity: 0.25,
    lineWidth: 1.5,
    labels: false,
  });

  // Atmosphere Filter
  const [atmosphere, setAtmosphere] = useState<AtmosphereFilter>({
    preset: 'vintage_parchment',
    vignette: 0.35,
    warmth: 0.1,
    contrast: 1.05,
    brightness: 1.0,
  });

  // Elements
  const [stamps, setStamps] = useState<PlacedStamp[]>([]);
  const [paths, setPaths] = useState<PlacedPath[]>([]);
  const [labels, setLabels] = useState<PlacedText[]>([]);
  const [customAssets, setCustomAssets] = useState<StampAsset[]>([]);

  // Synchronous Element Refs to prevent stale closure race conditions in history & erasing
  const stampsRef = useRef<PlacedStamp[]>(stamps);
  const pathsRef = useRef<PlacedPath[]>(paths);
  const labelsRef = useRef<PlacedText[]>(labels);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  useEffect(() => {
    pathsRef.current = paths;
  }, [paths]);

  useEffect(() => {
    labelsRef.current = labels;
  }, [labels]);

  // Selection & Active Drafts
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);
  const [isToolSettingsOpen, setIsToolSettingsOpen] = useState(true);

  // Drag-to-Transform State (Select Tool)
  const transformModeRef = useRef<'move' | 'scale' | 'rotate' | null>(null);
  const transformStartRef = useRef<{
    startX: number;
    startY: number;
    initialElement: any;
    centerX: number;
    centerY: number;
    initialDist: number;
    initialAngle: number;
  } | null>(null);

  const [activePathDraft, setActivePathDraft] = useState<{
    points: { x: number; y: number }[];
    color: string;
    width: number;
  } | null>(null);

  // Active Tool & Settings
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 60,
    density: 0.6,
    softness: 0.5,
    elevation: 20,
    maskMode: 'add_land',
    selectedBiome: 'lush_grass',
    coastlineRipples: 2,
    coastlineColor: '#6ee7b7',
    roughness: 0.6,
    opacity: 0.85,
    elevationMode: 'raise',
    selectedStampId: '',
    stampPlacementMode: 'single',
    scatterDensity: 4,
    scatterRadius: 60,
    stampScale: 1.0,
    stampOpacity: 1.0,
    stampRotation: 0,
    randomizeRotation: false,
    randomizeScale: false,
    scaleVariance: 0.15,
    rotationVariance: 15,
    autoYDepthSort: true,
    stampLayer: 1,
    eraserTarget: 'all',
  });

  // Path Tool specific
  const [activePathStyle, setActivePathStyle] = useState<PathStyle>('river');
  const [pathWidth, setPathWidth] = useState(8);
  const [pathColor, setPathColor] = useState('#38bdf8');
  const [pathTaper, setPathTaper] = useState(true);
  const [pathDoubleLine, setPathDoubleLine] = useState(false);

  // Text Tool specific
  const [activeTextString, setActiveTextString] = useState('Valdorian Highlands');
  const [activeFontFamily, setActiveFontFamily] = useState("'Cinzel', serif");
  const [activeFontSize, setActiveFontSize] = useState(24);
  const [activeTextColor, setActiveTextColor] = useState('#fef3c7');
  const [activeBannerStyle, setActiveBannerStyle] = useState<TextBannerStyle>('parchment_ribbon');
  const [textCurvature, setTextCurvature] = useState(0);
  const [textPresetStyle, setTextPresetStyle] = useState<TextPresetStyle>('standard');

  // Viewport Zoom & Pan
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  // Modals & Drawers
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShaderLabOpen, setIsShaderLabOpen] = useState(false);
  const [isMapImportOpen, setIsMapImportOpen] = useState(false);
  const [isAssetOutlinerOpen, setIsAssetOutlinerOpen] = useState(false);

  // Autosave State
  const [isAutosaveEnabled, setIsAutosaveEnabled] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('cartomancer_autosave_enabled');
      return stored === 'true'; // Optional: disabled by default unless opted in
    } catch {
      return false;
    }
  });
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastAutosaveTime, setLastAutosaveTime] = useState<number | null>(() => projectAutosave.getLastSavedTimestamp());
  const [fsaFolderName, setFsaFolderName] = useState<string | null>(() => projectAutosave.getLinkedFolderName());
  const [recoveryDraft, setRecoveryDraft] = useState<AutosaveRecord | null>(null);

  // Custom Biomes (Color Shaders and Image Patterns)
  const [customBiomes, setCustomBiomes] = useState<BiomeTexture[]>(() => {
    try {
      const saved = localStorage.getItem('cartomancer_custom_biomes');
      if (!saved) return [];
      const biomes: BiomeTexture[] = JSON.parse(saved);
      // Auto-heal legacy or default grey biomes:
      return biomes.map((b) => {
        if (b.color === '#6b7280') {
          const isGrass = /grass|green|meadow|lawn|pasture|field|forest/i.test(b.name || '');
          if (isGrass || b.detailType === 'grass') {
            return {
              ...b,
              color: '#4d8036',
              roughnessColor: '#315a20',
              detailType: 'grass',
            };
          }
        }
        return b;
      });
    } catch {
      return [];
    }
  });

  // Reference Blueprint Map for tracing & editing
  const [referenceMap, setReferenceMap] = useState<ReferenceMapConfig | null>(null);

  // Canvas Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const elevationCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stroke Painting & Erasing state
  const isPaintingRef = useRef(false);
  const lastPaintPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastStampPointRef = useRef<{ x: number; y: number } | null>(null);
  const isErasingRef = useRef(false);
  const erasedElementsCountRef = useRef(0);

  // Undo / Redo Stacks
  const historyStackRef = useRef<HistoryStep[]>([]);
  const redoStackRef = useRef<HistoryStep[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const saveJsonRef = useRef<() => void>(() => {});
  const loadJsonRef = useRef<() => void>(() => {});

  // --- Initialize Offscreen Canvases & Preload Assets ---
  useEffect(() => {
    // Load custom assets from robust IndexedDB storage (with localStorage migration)
    assetStorage
      .loadCustomAssets()
      .then((loaded) => {
        if (loaded && loaded.length > 0) {
          setCustomAssets(loaded);
          imageManager.preloadDefaultAssets(loaded);
          setBrushSettings((prev) => ({
            ...prev,
            selectedStampId: prev.selectedStampId || loaded[0].id,
          }));
        } else {
          imageManager.preloadDefaultAssets();
        }
      })
      .catch(() => {
        imageManager.preloadDefaultAssets();
      });

    // Create offscreen canvases
    const mask = document.createElement('canvas');
    mask.width = dimensions.width;
    mask.height = dimensions.height;
    maskCanvasRef.current = mask;

    const texture = document.createElement('canvas');
    texture.width = dimensions.width;
    texture.height = dimensions.height;
    textureCanvasRef.current = texture;

    const elevation = document.createElement('canvas');
    elevation.width = dimensions.width;
    elevation.height = dimensions.height;
    elevationCanvasRef.current = elevation;

    // Load default starter template (Mythic Realm)
    applyTemplate('mythic_realm', false);
  }, []);

  // Preload custom pattern shaders and auto-heal legacy grey biomes from image
  useEffect(() => {
    customBiomes.forEach((b) => {
      if (b.isPattern && b.patternImageUrl) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          imageManager.cacheDirectImage(b.id, img);
          imageManager.cacheDirectImage(b.patternImageUrl!, img);
          if (b.color === '#6b7280') {
            const analysis = analyzeTextureImage(img, b.name);
            setCustomBiomes((prev) => {
              const updated = prev.map((item) =>
                item.id === b.id
                  ? {
                      ...item,
                      color: analysis.dominantColor,
                      roughnessColor: analysis.roughnessColor,
                      detailType: item.detailType === 'rock' ? analysis.suggestedDetailType : item.detailType,
                    }
                  : item
              );
              try {
                localStorage.setItem('cartomancer_custom_biomes', JSON.stringify(updated));
              } catch (err) {
                console.warn('Could not update healed custom biomes', err);
              }
              return updated;
            });
          }
        };
        img.src = b.patternImageUrl;
      }
    });
  }, []);

  // Save custom assets to IndexedDB & state
  const handleAddCustomAssets = useCallback((newAssets: StampAsset[]) => {
    setCustomAssets((prev) => {
      const updated = [...newAssets, ...prev];
      assetStorage.saveCustomAssets(updated).catch(console.warn);
      return updated;
    });
    if (newAssets.length > 0) {
      setBrushSettings((prev) => ({
        ...prev,
        selectedStampId: prev.selectedStampId || newAssets[0].id,
      }));
    }
  }, []);

  const handleAddCustomAsset = useCallback(
    (asset: StampAsset) => {
      handleAddCustomAssets([asset]);
    },
    [handleAddCustomAssets]
  );

  const handleDeleteCustomAsset = useCallback((assetId: string) => {
    setCustomAssets((prev) => {
      const updated = prev.filter((a) => a.id !== assetId);
      assetStorage.deleteCustomAsset(assetId).catch(console.warn);
      return updated;
    });
  }, []);

  const handleClearAllCustomAssets = useCallback(async () => {
    setCustomAssets([]);
    await assetStorage.clearAllCustomAssets();
  }, []);

  // --- Rerender Trigger ---
  const requestRedraw = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !elevation) return;

    CanvasRenderer.render({
      ctx,
      width: dimensions.width,
      height: dimensions.height,
      maskCanvas: mask,
      textureCanvas: texture,
      elevationCanvas: elevation,
      stamps,
      paths,
      labels,
      customAssets,
      layers,
      grid: gridConfig,
      atmosphere,
      waterDeepColor,
      waterShallowColor,
      coastlineRipples: brushSettings.coastlineRipples,
      coastlineColor: brushSettings.coastlineColor,
      topographicalView,
      selectedStampId,
      selectedLabelId,
      selectedPathId,
      activePathDraft,
      referenceMap,
    });
  }, [
    dimensions,
    stamps,
    paths,
    labels,
    customAssets,
    layers,
    gridConfig,
    atmosphere,
    waterDeepColor,
    waterShallowColor,
    brushSettings.coastlineRipples,
    brushSettings.coastlineColor,
    topographicalView,
    selectedStampId,
    selectedLabelId,
    selectedPathId,
    activePathDraft,
    referenceMap,
  ]);

  useEffect(() => {
    requestRedraw();
  }, [requestRedraw]);

  // --- History & Undo / Redo Engine ---
  const pushHistorySnapshot = useCallback(
    (
      description: string,
      overrides?: {
        stamps?: PlacedStamp[];
        paths?: PlacedPath[];
        labels?: PlacedText[];
      }
    ) => {
      const mask = maskCanvasRef.current;
      const texture = textureCanvasRef.current;
      const elevation = elevationCanvasRef.current;
      if (!mask || !texture || !elevation) return;

      const mCtx = mask.getContext('2d');
      const tCtx = texture.getContext('2d');
      const eCtx = elevation.getContext('2d');
      if (!mCtx || !tCtx || !eCtx) return;

      const targetStamps = overrides?.stamps ?? stampsRef.current;
      const targetPaths = overrides?.paths ?? pathsRef.current;
      const targetLabels = overrides?.labels ?? labelsRef.current;

      const step: HistoryStep = {
        description,
        timestamp: Date.now(),
        maskImageData: mCtx.getImageData(0, 0, mask.width, mask.height),
        textureImageData: tCtx.getImageData(0, 0, texture.width, texture.height),
        elevationImageData: eCtx.getImageData(0, 0, elevation.width, elevation.height),
        stamps: targetStamps.map((s) => ({ ...s })),
        paths: targetPaths.map((p) => ({ ...p, points: [...p.points] })),
        labels: targetLabels.map((l) => ({ ...l })),
      };

      const newHistory = [...historyStackRef.current, step];
      if (newHistory.length > MAX_HISTORY_STEPS) {
        newHistory.shift();
      }
      historyStackRef.current = newHistory;
      redoStackRef.current = [];
      setUndoCount(newHistory.length);
      setRedoCount(0);
    },
    []
  );

  const restoreStep = useCallback((step: HistoryStep) => {
    // 1. Immediately and synchronously update refs and state
    const restoredStamps = step.stamps.map((s) => ({ ...s }));
    const restoredPaths = step.paths.map((p) => ({ ...p, points: [...p.points] }));
    const restoredLabels = step.labels.map((l) => ({ ...l }));

    stampsRef.current = restoredStamps;
    pathsRef.current = restoredPaths;
    labelsRef.current = restoredLabels;

    setStamps(restoredStamps);
    setPaths(restoredPaths);
    setLabels(restoredLabels);

    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !elevation) return;

    // 2. Synchronously restore pixel data if ImageData is available (zero flicker, zero race condition)
    if (step.maskImageData && step.textureImageData && step.elevationImageData) {
      const mCtx = mask.getContext('2d')!;
      mCtx.putImageData(step.maskImageData, 0, 0);

      const tCtx = texture.getContext('2d')!;
      tCtx.putImageData(step.textureImageData, 0, 0);

      const eCtx = elevation.getContext('2d')!;
      eCtx.putImageData(step.elevationImageData, 0, 0);

      requestRedraw();
      return;
    }

    // 3. Fallback for DataURL legacy steps
    let pending = 0;
    const checkDone = () => {
      pending--;
      if (pending <= 0) requestRedraw();
    };

    if (step.maskDataUrl) {
      pending++;
      const mImg = new Image();
      mImg.onload = () => {
        const mCtx = mask.getContext('2d')!;
        mCtx.clearRect(0, 0, mask.width, mask.height);
        mCtx.drawImage(mImg, 0, 0);
        checkDone();
      };
      mImg.src = step.maskDataUrl;
    }

    if (step.textureDataUrl) {
      pending++;
      const tImg = new Image();
      tImg.onload = () => {
        const tCtx = texture.getContext('2d')!;
        tCtx.clearRect(0, 0, texture.width, texture.height);
        tCtx.drawImage(tImg, 0, 0);
        checkDone();
      };
      tImg.src = step.textureDataUrl;
    }

    if (step.elevationDataUrl) {
      pending++;
      const eImg = new Image();
      eImg.onload = () => {
        const eCtx = elevation.getContext('2d')!;
        eCtx.clearRect(0, 0, elevation.width, elevation.height);
        eCtx.drawImage(eImg, 0, 0);
        checkDone();
      };
      eImg.src = step.elevationDataUrl;
    }

    if (pending === 0) {
      requestRedraw();
    }
  }, [requestRedraw]);

  const handleUndo = useCallback(() => {
    if (historyStackRef.current.length <= 1) return;
    const current = historyStackRef.current.pop();
    if (!current) return;
    redoStackRef.current.push(current);

    const prev = historyStackRef.current[historyStackRef.current.length - 1];
    if (prev) {
      restoreStep(prev);
    }
    setUndoCount(historyStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  }, [restoreStep]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    if (!next) return;
    historyStackRef.current.push(next);
    restoreStep(next);

    setUndoCount(historyStackRef.current.length);
    setRedoCount(redoStackRef.current.length);
  }, [restoreStep]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid hotkeys when typing in input
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveJsonRef.current?.();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        loadJsonRef.current?.();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('select'); break;
        case 'm': setActiveTool('mask'); break;
        case 'b': setActiveTool('brush'); break;
        case 'e': setActiveTool('elevation'); break;
        case 's': setActiveTool('stamp'); break;
        case 'p': setActiveTool('path'); break;
        case 't': setActiveTool('text'); break;
        case 'g': setActiveTool('grid'); break;
        case 'x': setActiveTool('eraser'); break;
        case 'l':
          setIsAssetOutlinerOpen((prev) => !prev);
          break;
        case 'delete':
        case 'backspace':
          if (selectedStampId) {
            const updated = stampsRef.current.filter((s) => s.id !== selectedStampId);
            stampsRef.current = updated;
            setStamps(updated);
            setSelectedStampId(null);
            pushHistorySnapshot('Delete Stamp', { stamps: updated });
            requestRedraw();
          } else if (selectedLabelId) {
            const updated = labelsRef.current.filter((l) => l.id !== selectedLabelId);
            labelsRef.current = updated;
            setLabels(updated);
            setSelectedLabelId(null);
            pushHistorySnapshot('Delete Label', { labels: updated });
            requestRedraw();
          } else if (selectedPathId) {
            const updated = pathsRef.current.filter((p) => p.id !== selectedPathId);
            pathsRef.current = updated;
            setPaths(updated);
            setSelectedPathId(null);
            pushHistorySnapshot('Delete River / Route', { paths: updated });
            requestRedraw();
          }
          break;
        case 'escape':
          setSelectedStampId(null);
          setSelectedLabelId(null);
          setSelectedPathId(null);
          setActivePathDraft(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedStampId, selectedLabelId, selectedPathId, pushHistorySnapshot, requestRedraw]);

  // --- Seed Initial Landmass & Template Loader ---
  const applyTemplate = (templateKey: string, pushHistory = true) => {
    const tmpl = TEMPLATES[templateKey];
    if (!tmpl) return;

    if (tmpl.project.name) setProjectName(tmpl.project.name);
    if (tmpl.project.waterDeepColor) setWaterDeepColor(tmpl.project.waterDeepColor);
    if (tmpl.project.waterShallowColor) setWaterShallowColor(tmpl.project.waterShallowColor);

    const newStamps = tmpl.project.stamps ? tmpl.project.stamps.map((s) => ({ ...s })) : [];
    const newPaths = tmpl.project.paths ? tmpl.project.paths.map((p) => ({ ...p, points: [...p.points] })) : [];
    const newLabels = tmpl.project.labels ? tmpl.project.labels.map((l) => ({ ...l })) : [];

    stampsRef.current = newStamps;
    pathsRef.current = newPaths;
    labelsRef.current = newLabels;

    setStamps(newStamps);
    setPaths(newPaths);
    setLabels(newLabels);

    // Sculpt procedural continent on mask canvas
    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !elevation) return;

    const mCtx = mask.getContext('2d')!;
    const tCtx = texture.getContext('2d')!;
    const eCtx = elevation.getContext('2d')!;

    mCtx.clearRect(0, 0, mask.width, mask.height);
    tCtx.clearRect(0, 0, texture.width, texture.height);
    eCtx.clearRect(0, 0, elevation.width, elevation.height);

    if (templateKey === 'mythic_realm') {
      // Sculpt vast grand continent with coastal shelves and islands
      mCtx.fillStyle = '#ffffff';

      // 1. Central / Western mainland
      mCtx.beginPath();
      mCtx.ellipse(460, 480, 320, 240, -0.08, 0, Math.PI * 2);
      mCtx.fill();

      // Northern crown
      mCtx.beginPath();
      mCtx.ellipse(430, 260, 240, 140, 0.1, 0, Math.PI * 2);
      mCtx.fill();

      // Eastern realm / dragons horn
      mCtx.beginPath();
      mCtx.ellipse(840, 520, 220, 190, 0.25, 0, Math.PI * 2);
      mCtx.fill();

      // Southern archipelagos
      mCtx.beginPath();
      mCtx.ellipse(320, 720, 140, 70, -0.2, 0, Math.PI * 2);
      mCtx.ellipse(620, 730, 120, 60, 0.1, 0, Math.PI * 2);
      mCtx.ellipse(920, 700, 100, 50, 0.3, 0, Math.PI * 2);
      mCtx.fill();

      // Western barrier isles & fjord islands
      mCtx.beginPath();
      mCtx.ellipse(140, 420, 80, 50, 0.4, 0, Math.PI * 2);
      mCtx.ellipse(180, 300, 60, 40, -0.2, 0, Math.PI * 2);
      mCtx.fill();

      // Biome textures:
      // Arctic North (Frostlands)
      tCtx.fillStyle = '#e8f2f8';
      tCtx.fillRect(0, 0, texture.width, 240);

      // Central Emerald Forests & Valleys
      tCtx.fillStyle = '#4a7c3a';
      tCtx.fillRect(0, 240, 750, texture.height - 240);

      // Deep Primeval Woodland patch
      tCtx.fillStyle = '#264a25';
      tCtx.beginPath();
      tCtx.ellipse(420, 460, 160, 110, 0, 0, Math.PI * 2);
      tCtx.fill();

      // Southeastern Golden Steppes & Scorched Sands
      tCtx.fillStyle = '#d4a259';
      tCtx.fillRect(750, 240, texture.width - 750, texture.height - 240);

      // Elevation Spine (Frostfang Peaks & Dragon Horn)
      eCtx.fillStyle = '#808080';
      eCtx.beginPath();
      eCtx.ellipse(430, 360, 180, 60, -0.1, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.beginPath();
      eCtx.ellipse(780, 480, 120, 50, 0.3, 0, Math.PI * 2);
      eCtx.fill();
    } else if (templateKey === 'blank_canvas') {
      // Pristine open ocean - all canvases cleared
    }

    if (pushHistory) {
      pushHistorySnapshot(`Load ${tmpl.name}`, {
        stamps: newStamps,
        paths: newPaths,
        labels: newLabels,
      });
    } else {
      // First snapshot
      pushHistorySnapshot('Initial Map State', {
        stamps: newStamps,
        paths: newPaths,
        labels: newLabels,
      });
    }

    requestRedraw();
  };

  // --- Custom Biomes, Shader Lab & Map Importer Handlers ---
  const handleAddCustomBiome = (newBiome: BiomeTexture) => {
    setCustomBiomes((prev) => {
      const updated = [...prev.filter((b) => b.id !== newBiome.id), newBiome];
      try {
        localStorage.setItem('cartomancer_custom_biomes', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not persist custom biomes', err);
      }
      return updated;
    });

    // If newBiome has pattern image, pre-cache it under both ID and URL
    if (newBiome.isPattern && newBiome.patternImageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        imageManager.cacheDirectImage(newBiome.id, img);
        imageManager.cacheDirectImage(newBiome.patternImageUrl!, img);
      };
      img.src = newBiome.patternImageUrl;
      imageManager.loadImage(newBiome.patternImageUrl, newBiome.id);
    }

    // Auto-select this newly created biome
    setBrushSettings((prev) => ({
      ...prev,
      selectedBiome: newBiome.id,
      elevation: newBiome.defaultElevation ?? prev.elevation,
    }));
    setActiveTool('brush');
  };

  const handleDeleteCustomBiome = (biomeId: string) => {
    setCustomBiomes((prev) => {
      const updated = prev.filter((b) => b.id !== biomeId);
      try {
        localStorage.setItem('cartomancer_custom_biomes', JSON.stringify(updated));
      } catch (err) {
        console.warn('Could not persist custom biomes', err);
      }
      return updated;
    });
    setBrushSettings((prev) => {
      if (prev.selectedBiome === biomeId) {
        return { ...prev, selectedBiome: DEFAULT_BIOMES[0].id };
      }
      return prev;
    });
  };

  // --- Dynamic Vector & Feature Eraser (Paths, Rivers, Stamps, Labels) ---
  const eraseElementsAt = useCallback(
    (x: number, y: number) => {
      const eraseRadius = Math.max(25, brushSettings.size * 0.5);
      const targetMode = brushSettings.eraserTarget || 'all';
      let didErase = false;

      // 1. Erase Paths & Rivers (both template and user-drawn)
      if (targetMode === 'all' || targetMode === 'paths') {
        const currentPaths = pathsRef.current;
        const remainingPaths = currentPaths.filter((p) => !isPointNearPath(x, y, p, eraseRadius));
        if (remainingPaths.length !== currentPaths.length) {
          didErase = true;
          erasedElementsCountRef.current += currentPaths.length - remainingPaths.length;
          pathsRef.current = remainingPaths;
          setPaths(remainingPaths);
        }
      }

      // 2. Erase Stamps & Objects (using precision bounding box + radius)
      if (targetMode === 'all' || targetMode === 'stamps') {
        const currentStamps = stampsRef.current;
        const remainingStamps = currentStamps.filter((s) => !isPointInStamp(x, y, s, eraseRadius));
        if (remainingStamps.length !== currentStamps.length) {
          didErase = true;
          erasedElementsCountRef.current += currentStamps.length - remainingStamps.length;
          stampsRef.current = remainingStamps;
          setStamps(remainingStamps);
        }
      }

      // 3. Erase Text Labels
      if (targetMode === 'all' || targetMode === 'labels') {
        const currentLabels = labelsRef.current;
        const remainingLabels = currentLabels.filter((l) => !isPointInLabel(x, y, l, eraseRadius));
        if (remainingLabels.length !== currentLabels.length) {
          didErase = true;
          erasedElementsCountRef.current += currentLabels.length - remainingLabels.length;
          labelsRef.current = remainingLabels;
          setLabels(remainingLabels);
        }
      }

      if (didErase) {
        requestRedraw();
      }
    },
    [brushSettings.size, brushSettings.eraserTarget, requestRedraw]
  );

  // --- Asset Outliner Table Actions (Direct select, center, and surgical delete) ---
  const handleDeleteStampFromTable = useCallback(
    (id: string) => {
      const updated = stampsRef.current.filter((s) => s.id !== id);
      stampsRef.current = updated;
      setStamps(updated);
      if (selectedStampId === id) setSelectedStampId(null);
      pushHistorySnapshot('Delete Stamp Asset', { stamps: updated });
      requestRedraw();
    },
    [selectedStampId, pushHistorySnapshot, requestRedraw]
  );

  const handleDeletePathFromTable = useCallback(
    (id: string) => {
      const updated = pathsRef.current.filter((p) => p.id !== id);
      pathsRef.current = updated;
      setPaths(updated);
      if (selectedPathId === id) setSelectedPathId(null);
      pushHistorySnapshot('Delete River / Route', { paths: updated });
      requestRedraw();
    },
    [selectedPathId, pushHistorySnapshot, requestRedraw]
  );

  const handleDeleteLabelFromTable = useCallback(
    (id: string) => {
      const updated = labelsRef.current.filter((l) => l.id !== id);
      labelsRef.current = updated;
      setLabels(updated);
      if (selectedLabelId === id) setSelectedLabelId(null);
      pushHistorySnapshot('Delete Map Label', { labels: updated });
      requestRedraw();
    },
    [selectedLabelId, pushHistorySnapshot, requestRedraw]
  );

  const handleDeleteBatchFromTable = useCallback(
    (selection: { stampIds: string[]; pathIds: string[]; labelIds: string[] }) => {
      const stampSet = new Set(selection.stampIds);
      const pathSet = new Set(selection.pathIds);
      const labelSet = new Set(selection.labelIds);

      const updatedStamps = stampsRef.current.filter((s) => !stampSet.has(s.id));
      const updatedPaths = pathsRef.current.filter((p) => !pathSet.has(p.id));
      const updatedLabels = labelsRef.current.filter((l) => !labelSet.has(l.id));

      stampsRef.current = updatedStamps;
      pathsRef.current = updatedPaths;
      labelsRef.current = updatedLabels;

      setStamps(updatedStamps);
      setPaths(updatedPaths);
      setLabels(updatedLabels);

      if (selectedStampId && stampSet.has(selectedStampId)) setSelectedStampId(null);
      if (selectedPathId && pathSet.has(selectedPathId)) setSelectedPathId(null);
      if (selectedLabelId && labelSet.has(selectedLabelId)) setSelectedLabelId(null);

      pushHistorySnapshot('Batch Delete Assets', {
        stamps: updatedStamps,
        paths: updatedPaths,
        labels: updatedLabels,
      });
      requestRedraw();
    },
    [selectedStampId, selectedPathId, selectedLabelId, pushHistorySnapshot, requestRedraw]
  );

  const handleSelectAndFocus = useCallback(
    (type: 'stamp' | 'path' | 'label', id: string, x: number, y: number) => {
      const viewportW = viewportRef.current ? viewportRef.current.clientWidth : dimensions.width;
      const viewportH = viewportRef.current ? viewportRef.current.clientHeight : dimensions.height;
      const targetPanX = Math.round(viewportW / 2 - x * zoom);
      const targetPanY = Math.round(viewportH / 2 - y * zoom);
      setPan({ x: targetPanX, y: targetPanY });

      if (type === 'stamp') {
        setSelectedStampId(id);
        setSelectedPathId(null);
        setSelectedLabelId(null);
      } else if (type === 'path') {
        setSelectedPathId(id);
        setSelectedStampId(null);
        setSelectedLabelId(null);
      } else if (type === 'label') {
        setSelectedLabelId(id);
        setSelectedStampId(null);
        setSelectedPathId(null);
      }
      setActiveTool('select');
      requestRedraw();
    },
    [zoom, dimensions, requestRedraw]
  );

  // --- Selected Item Direct Manipulation (Transforms, Duplicate, Delete, Layer Ordering) ---
  const handleUpdateSelectedStamp = useCallback(
    (updates: Partial<PlacedStamp>) => {
      if (!selectedStampId) return;
      const next = stampsRef.current.map((s) => (s.id === selectedStampId ? { ...s, ...updates } : s));
      stampsRef.current = next;
      setStamps(next);
      requestRedraw();
    },
    [selectedStampId, requestRedraw]
  );

  const handleUpdateSelectedLabel = useCallback(
    (updates: Partial<PlacedText>) => {
      if (!selectedLabelId) return;
      const next = labelsRef.current.map((l) => (l.id === selectedLabelId ? { ...l, ...updates } : l));
      labelsRef.current = next;
      setLabels(next);
      requestRedraw();
    },
    [selectedLabelId, requestRedraw]
  );

  const handleDeleteSelectedStamp = useCallback(() => {
    if (!selectedStampId) return;
    const remaining = stampsRef.current.filter((s) => s.id !== selectedStampId);
    stampsRef.current = remaining;
    setStamps(remaining);
    setSelectedStampId(null);
    pushHistorySnapshot('Delete Stamp', { stamps: remaining });
    requestRedraw();
  }, [selectedStampId, pushHistorySnapshot, requestRedraw]);

  const handleDeleteSelectedLabel = useCallback(() => {
    if (!selectedLabelId) return;
    const remaining = labelsRef.current.filter((l) => l.id !== selectedLabelId);
    labelsRef.current = remaining;
    setLabels(remaining);
    setSelectedLabelId(null);
    pushHistorySnapshot('Delete Label', { labels: remaining });
    requestRedraw();
  }, [selectedLabelId, pushHistorySnapshot, requestRedraw]);

  const handleDeleteSelectedPath = useCallback(() => {
    if (!selectedPathId) return;
    const remaining = pathsRef.current.filter((p) => p.id !== selectedPathId);
    pathsRef.current = remaining;
    setPaths(remaining);
    setSelectedPathId(null);
    pushHistorySnapshot('Delete Path', { paths: remaining });
    requestRedraw();
  }, [selectedPathId, pushHistorySnapshot, requestRedraw]);

  const handleDuplicateSelectedStamp = useCallback(() => {
    if (!selectedStampId) return;
    const s = stampsRef.current.find((item) => item.id === selectedStampId);
    if (!s) return;
    const clone: PlacedStamp = {
      ...s,
      id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: s.x + 30,
      y: s.y + 30,
    };
    const next = [...stampsRef.current, clone];
    stampsRef.current = next;
    setStamps(next);
    setSelectedStampId(clone.id);
    pushHistorySnapshot('Duplicate Stamp', { stamps: next });
    requestRedraw();
  }, [selectedStampId, pushHistorySnapshot, requestRedraw]);

  const handleDuplicateSelectedLabel = useCallback(() => {
    if (!selectedLabelId) return;
    const l = labelsRef.current.find((item) => item.id === selectedLabelId);
    if (!l) return;
    const clone: PlacedText = {
      ...l,
      id: `label_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: l.x + 30,
      y: l.y + 30,
    };
    const next = [...labelsRef.current, clone];
    labelsRef.current = next;
    setLabels(next);
    setSelectedLabelId(clone.id);
    pushHistorySnapshot('Duplicate Label', { labels: next });
    requestRedraw();
  }, [selectedLabelId, pushHistorySnapshot, requestRedraw]);

  const handleBringStampToFront = useCallback(() => {
    if (!selectedStampId) return;
    const s = stampsRef.current.find((item) => item.id === selectedStampId);
    if (!s) return;
    const next = [...stampsRef.current.filter((item) => item.id !== selectedStampId), s];
    stampsRef.current = next;
    setStamps(next);
    requestRedraw();
  }, [selectedStampId, requestRedraw]);

  const handleSendStampToBack = useCallback(() => {
    if (!selectedStampId) return;
    const s = stampsRef.current.find((item) => item.id === selectedStampId);
    if (!s) return;
    const next = [s, ...stampsRef.current.filter((item) => item.id !== selectedStampId)];
    stampsRef.current = next;
    setStamps(next);
    requestRedraw();
  }, [selectedStampId, requestRedraw]);

  const handleFinishActivePath = useCallback(() => {
    if (!activePathDraft || activePathDraft.points.length < 2) {
      setActivePathDraft(null);
      return;
    }
    const newPath: PlacedPath = {
      id: `path_${Date.now()}`,
      style: activePathStyle,
      points: activePathDraft.points,
      width: activePathDraft.width,
      color: activePathDraft.color,
      dashPattern:
        activePathStyle === 'trade_route'
          ? [8, 6]
          : activePathStyle === 'border'
          ? [4, 4]
          : undefined,
      opacity: 1.0,
      smoothed: true,
      taper: pathTaper,
      doubleLine: pathDoubleLine,
    };
    const updatedPaths = [...pathsRef.current, newPath];
    pathsRef.current = updatedPaths;
    setPaths(updatedPaths);
    setActivePathDraft(null);
    pushHistorySnapshot('Draw Path', { paths: updatedPaths });
    requestRedraw();
  }, [activePathDraft, activePathStyle, pathTaper, pathDoubleLine, pushHistorySnapshot, requestRedraw]);

  const handleApplyExtractedMask = useCallback(
    (maskData: ImageData) => {
      const mask = maskCanvasRef.current;
      const elev = elevationCanvasRef.current;
      const text = textureCanvasRef.current;
      if (!mask || !elev || !text) return;

      const mCtx = mask.getContext('2d');
      const eCtx = elev.getContext('2d');
      const tCtx = text.getContext('2d');
      if (!mCtx || !eCtx || !tCtx) return;

      mCtx.putImageData(maskData, 0, 0);

      // Seed initial pleasant base terrain & elevation on newly extracted land
      const mPix = maskData.data;
      const totalPixels = maskData.width * maskData.height;

      // Seed elevation: where land exists, baseline elevation = 145 (meadow), water = 85 (ocean)
      const eImg = eCtx.createImageData(maskData.width, maskData.height);
      const ePix = eImg.data;
      for (let p = 0; p < totalPixels; p++) {
        const i = p * 4;
        const isLand = mPix[i + 3] > 40;
        const h = isLand ? 145 : 85;
        ePix[i] = h;
        ePix[i + 1] = h;
        ePix[i + 2] = h;
        ePix[i + 3] = 255;
      }
      eCtx.putImageData(eImg, 0, 0);

      // Seed texture with earthy parchment green
      tCtx.fillStyle = '#5b8e3d';
      tCtx.fillRect(0, 0, text.width, text.height);

      pushHistorySnapshot('Import Map Outline');
      requestRedraw();
    },
    [pushHistorySnapshot, requestRedraw]
  );

  const handleSetReferenceMap = useCallback(
    (config: ReferenceMapConfig | null) => {
      if (config) {
        imageManager.loadImage(config.imageUrl);
      }
      setReferenceMap(config);
      requestRedraw();
    },
    [requestRedraw]
  );

  const handleApplyBaseTextureImage = useCallback(
    (imgElement: HTMLImageElement) => {
      const text = textureCanvasRef.current;
      if (!text) return;
      const tCtx = text.getContext('2d');
      if (!tCtx) return;

      tCtx.drawImage(imgElement, 0, 0, text.width, text.height);
      pushHistorySnapshot('Apply Base Texture Image');
      requestRedraw();
    },
    [pushHistorySnapshot, requestRedraw]
  );

  // --- Canvas Coordinate Conversion ---
  const getCanvasCoords = (e: React.MouseEvent<HTMLDivElement>): { x: number; y: number } => {
    const mainCanvas = mainCanvasRef.current;
    if (!mainCanvas) return { x: 0, y: 0 };
    const rect = mainCanvas.getBoundingClientRect();

    const scaleX = dimensions.width / rect.width;
    const scaleY = dimensions.height / rect.height;

    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);

    return {
      x: Math.max(0, Math.min(dimensions.width, x)),
      y: Math.max(0, Math.min(dimensions.height, y)),
    };
  };

  // --- Manual Painting Stroke Handlers ---
  const paintBrushDab = (x: number, y: number) => {
    const { size, density, softness, elevation, maskMode, selectedBiome } = brushSettings;

    if (activeTool === 'mask') {
      const mask = maskCanvasRef.current;
      if (!mask) return;
      const mCtx = mask.getContext('2d')!;

      const roughness = brushSettings.coastlineRoughness ?? 0.35;
      mCtx.save();
      if (roughness > 0.05) {
        if (maskMode === 'add_land') {
          mCtx.globalCompositeOperation = 'source-over';
          drawFractalDab(mCtx, x, y, size, roughness, '#ffffff', density);
        } else {
          mCtx.globalCompositeOperation = 'destination-out';
          drawFractalDab(mCtx, x, y, size, roughness, '#ffffff', density);
        }
      } else {
        if (maskMode === 'add_land') {
          mCtx.globalCompositeOperation = 'source-over';
          mCtx.fillStyle = '#ffffff';
        } else {
          mCtx.globalCompositeOperation = 'destination-out';
        }
        mCtx.globalAlpha = density;
        mCtx.beginPath();
        mCtx.arc(x, y, size, 0, Math.PI * 2);
        mCtx.fill();
      }
      mCtx.restore();
    } else if (activeTool === 'brush') {
      const texture = textureCanvasRef.current;
      if (!texture) return;
      const tCtx = texture.getContext('2d')!;

      const allBiomes = [...DEFAULT_BIOMES, ...customBiomes];
      const biome = allBiomes.find((b) => b.id === selectedBiome) || DEFAULT_BIOMES[0];

      tCtx.save();
      tCtx.globalCompositeOperation = 'source-over';
      tCtx.globalAlpha = density * 0.45;

      // Check if this is a custom pattern shader
      if (biome.isPattern && biome.patternImageUrl) {
        let patImg =
          imageManager.getImageByUrl(biome.patternImageUrl) ||
          imageManager.getImageByUrl(biome.id);

        if (!patImg) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            imageManager.cacheDirectImage(biome.patternImageUrl!, img);
            imageManager.cacheDirectImage(biome.id, img);
            requestRedraw();
          };
          img.src = biome.patternImageUrl;
          if (img.complete && img.naturalWidth > 0) {
            imageManager.cacheDirectImage(biome.patternImageUrl, img);
            imageManager.cacheDirectImage(biome.id, img);
            patImg = img;
          }
        }

        if (patImg && patImg.complete && patImg.naturalWidth > 0) {
          const scale = Math.max(16, Math.min(256, biome.patternScale || 48));
          const tile = getScaledPatternTile(patImg, biome.id || biome.patternImageUrl, scale);
          const pattern = tCtx.createPattern(tile, 'repeat');
          if (pattern) {
            const r = Math.ceil(size);
            const dSize = r * 2;
            const dab = document.createElement('canvas');
            dab.width = dSize;
            dab.height = dSize;
            const dCtx = dab.getContext('2d');
            if (dCtx) {
              // 1. Tile pattern aligned to world coordinates so overlapping dabs tile seamlessly
              dCtx.save();
              const offsetX = ((x - r) % scale + scale) % scale;
              const offsetY = ((y - r) % scale + scale) % scale;
              dCtx.translate(-offsetX, -offsetY);
              dCtx.fillStyle = pattern;
              dCtx.fillRect(offsetX, offsetY, dSize, dSize);
              dCtx.restore();

              // 2. Feather dab boundary according to brush softness
              dCtx.globalCompositeOperation = 'destination-in';
              const grad = dCtx.createRadialGradient(r, r, r * (1 - softness) * 0.4, r, r, r);
              grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
              grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
              dCtx.fillStyle = grad;
              dCtx.beginPath();
              dCtx.arc(r, r, r, 0, Math.PI * 2);
              dCtx.fill();

              // 3. Composite onto texture canvas with density
              tCtx.globalAlpha = density * 0.7;
              tCtx.drawImage(dab, x - r, y - r);
              tCtx.restore();
              return;
            }
          }
        }
      }

      // Dual-tone color jitter for organic vegetation shifts
      let finalColor = biome.color;
      // Auto-heal legacy grey default if user paints with it
      if (
        (finalColor === '#6b7280' || finalColor === '#6B7280') &&
        (/grass|green|meadow|lawn|pasture|field|forest/i.test(biome.name) || biome.detailType === 'grass')
      ) {
        finalColor = '#4d8036';
      }

      if (brushSettings.colorJitter && brushSettings.colorJitter > 0) {
        finalColor = applyColorJitter(finalColor, brushSettings.colorJitter);
      }

      // Dry brush stippling mode
      if (brushSettings.stippleMode) {
        const numStipples = Math.round(size * 0.6 * density);
        tCtx.fillStyle = finalColor;
        for (let s = 0; s < numStipples; s++) {
          const angle = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * size;
          const px = x + Math.cos(angle) * r;
          const py = y + Math.sin(angle) * r;
          tCtx.beginPath();
          tCtx.arc(px, py, 1.2, 0, Math.PI * 2);
          tCtx.fill();
        }
        tCtx.restore();
        return;
      }

      // Smooth color blending with matching zero-alpha outer ring (prevents dark boundary artifacts)
      const outerColor = hexToRgba(finalColor, 0);
      const grad = tCtx.createRadialGradient(x, y, size * (1 - softness) * 0.4, x, y, size);
      grad.addColorStop(0, finalColor);
      grad.addColorStop(1, outerColor);

      tCtx.fillStyle = grad;
      tCtx.beginPath();
      tCtx.arc(x, y, size, 0, Math.PI * 2);
      tCtx.fill();
      tCtx.restore();
    } else if (activeTool === 'elevation') {
      const elevCanvas = elevationCanvasRef.current;
      if (!elevCanvas) return;
      const eCtx = elevCanvas.getContext('2d')!;

      const profile = brushSettings.elevationProfile ?? 'gaussian';
      const grayVal = Math.round(((elevation + 100) / 200) * 255);
      const roughness = brushSettings.noiseRoughness ?? 0.45;
      const hasJitter = (brushSettings.noiseJitter ?? true) && roughness > 0.05;

      // 1. Slope-Limited Deposition (Angle of Repose)
      if (brushSettings.slopeDeposition) {
        const heightDelta = (elevation / 100) * 12 * density;
        applySlopeLimitedDeposition(
          elevCanvas,
          x,
          y,
          size,
          heightDelta,
          brushSettings.angleRepose ?? 0.45,
          profile
        );
      } else if (hasJitter) {
        // 2. Procedural Noise & Fractal Jitter Brush (Turbulence Modulation)
        drawTurbulentElevationDab(
          eCtx,
          x,
          y,
          size,
          roughness,
          grayVal,
          density * 0.35,
          profile
        );
      } else {
        // 3. Standard smooth radial elevation dab
        const color = `rgb(${grayVal}, ${grayVal}, ${grayVal})`;
        const outerColor = `rgba(${grayVal}, ${grayVal}, ${grayVal}, 0)`;

        eCtx.save();
        eCtx.globalAlpha = density * 0.35;

        const innerRadius = profile === 'plateau' ? size * 0.7 : profile === 'ridge' ? size * 0.1 : size * 0.2;
        const grad = eCtx.createRadialGradient(x, y, innerRadius, x, y, size);
        grad.addColorStop(0, color);
        if (profile === 'ridge') {
          grad.addColorStop(0.35, color);
          grad.addColorStop(0.7, `rgba(${grayVal}, ${grayVal}, ${grayVal}, 0.15)`);
        }
        grad.addColorStop(1, outerColor);

        eCtx.fillStyle = grad;
        eCtx.beginPath();
        eCtx.arc(x, y, size, 0, Math.PI * 2);
        eCtx.fill();
        eCtx.restore();
      }
    }
  };

  // Interpolate dabs along stroke to prevent dotted gaps
  const paintStroke = (x1: number, y1: number, x2: number, y2: number) => {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const step = Math.max(4, brushSettings.size * 0.25);
    const count = Math.ceil(dist / step);

    for (let i = 0; i <= count; i++) {
      const t = count === 0 ? 0 : i / count;
      const curX = x1 + (x2 - x1) * t;
      const curY = y1 + (y2 - y1) * t;
      paintBrushDab(curX, curY);
    }
  };

  // Fast Hydraulic Erosion Action
  const handleHydraulicErosion = useCallback(() => {
    const elev = elevationCanvasRef.current;
    if (!elev) return;
    simulateHydraulicErosion(elev, 5000, 0.6);
    pushHistorySnapshot('Simulate Hydraulic Erosion');
    requestRedraw();
  }, [pushHistorySnapshot, requestRedraw]);

  // Derive Topography from Drawn Map
  const handleDeriveTopography = useCallback(() => {
    const mask = maskCanvasRef.current;
    const elev = elevationCanvasRef.current;
    if (!mask || !elev) return;
    const derived = deriveTopographyFromDrawnMap({
      maskCanvas: mask,
      stamps: stampsRef.current,
      paths: pathsRef.current,
      config: elevationConfig,
    });
    bakeTopographyToCanvas(derived, elev, elevationConfig);
    pushHistorySnapshot('Derive Topography from Drawn Map');
    requestRedraw();
  }, [elevationConfig, pushHistorySnapshot, requestRedraw]);

  // --- Stamp & Scatter Placement ---
  const placeStampsAt = (cx: number, cy: number) => {
    const assetId = brushSettings.selectedStampId;
    const isScatter = brushSettings.stampPlacementMode === 'scatter';
    const isRibbon = brushSettings.stampPlacementMode === 'ribbon';
    const count = isScatter ? (brushSettings.scatterDensity ?? 4) : 1;
    const radius = isScatter ? (brushSettings.scatterRadius ?? 60) : 0;

    const newStamps: PlacedStamp[] = [];

    for (let i = 0; i < count; i++) {
      const offsetX = isScatter ? (Math.random() - 0.5) * radius * 2 : 0;
      const offsetY = isScatter ? (Math.random() - 0.5) * radius * 1.5 : 0;
      const variance = brushSettings.scaleVariance ?? 0.15;
      const rotVariance = brushSettings.rotationVariance ?? Math.round(variance * 40);
      const scaleJitter = variance > 0 ? 1 + (Math.random() - 0.5) * 2 * variance : 1;
      const rotJitter = rotVariance > 0 ? (Math.random() - 0.5) * 2 * rotVariance : 0;
      const shouldFlip = variance > 0 ? Math.random() > 0.5 : false;

      // In ribbon mode, add a subtle perpendicular offset if jitter > 0 for organic mountain chains
      const ribbonPerpJitter = isRibbon && variance > 0 ? (Math.random() - 0.5) * 12 * variance : 0;

      newStamps.push({
        id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        assetId,
        x: cx + offsetX,
        y: cy + offsetY + ribbonPerpJitter,
        scale: Math.max(0.2, brushSettings.stampScale * scaleJitter),
        rotation: brushSettings.randomizeRotation ? rotJitter : (brushSettings.stampRotation || 0),
        flipX: shouldFlip,
        opacity: brushSettings.stampOpacity ?? 1.0,
        tint: brushSettings.stampTint || undefined,
        layer: brushSettings.stampLayer,
        createdAt: Date.now(),
      });
    }

    const updatedStamps = [...stampsRef.current, ...newStamps];
    stampsRef.current = updatedStamps;
    setStamps(updatedStamps);
    pushHistorySnapshot('Place Stamp', { stamps: updatedStamps });
    requestRedraw();
  };

  // --- Canvas Mouse Events ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Middle click or Space+click = Pan
    if (e.button === 1 || e.spaceKey || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return; // Only primary button for drawing
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'mask' || activeTool === 'brush' || activeTool === 'elevation') {
      isPaintingRef.current = true;
      lastPaintPointRef.current = { x, y };
      paintBrushDab(x, y);
      requestRedraw();
    } else if (activeTool === 'stamp') {
      placeStampsAt(x, y);
      if (brushSettings.stampPlacementMode === 'ribbon') {
        lastStampPointRef.current = { x, y };
      }
    } else if (activeTool === 'path') {
      if (
        activePathStyle === 'river' &&
        brushSettings.riverSnapDrainage &&
        elevationCanvasRef.current &&
        maskCanvasRef.current
      ) {
        // Hydrological Drainage & Natural River Routing:
        // Automatically compute steepest-descent downhill drainage path down to the ocean!
        const drainagePoints = computeHydrologicalDrainagePath(
          x,
          y,
          elevationCanvasRef.current,
          maskCanvasRef.current
        );

        if (brushSettings.riverCarveGorge) {
          carveRiverGorge(drainagePoints, elevationCanvasRef.current, 8, pathWidth * 2.5);
        }

        const newPath: PlacedPath = {
          id: `path_${Date.now()}`,
          style: 'river',
          points: drainagePoints,
          width: pathWidth,
          color: pathColor,
          dashPattern: [],
          opacity: 0.95,
          smoothed: true,
          taper: pathTaper,
          doubleLine: pathDoubleLine,
        };
        const updatedPaths = [...pathsRef.current, newPath];
        pathsRef.current = updatedPaths;
        setPaths(updatedPaths);
        pushHistorySnapshot('Snap River to Drainage Basin', { paths: updatedPaths });
        requestRedraw();
        return;
      }

      setActivePathDraft({
        points: [{ x, y }],
        color: pathColor,
        width: pathWidth,
        style: activePathStyle,
        taper: pathTaper,
        doubleLine: pathDoubleLine,
      });
    } else if (activeTool === 'text') {
      const newLabel: PlacedText = {
        id: `label_${Date.now()}`,
        text: activeTextString.trim() || 'Uncharted Region',
        x,
        y,
        fontSize: activeFontSize,
        scale: 1.0,
        fontFamily: activeFontFamily,
        color: activeTextColor,
        strokeColor: '#1e293b',
        strokeWidth: 3,
        rotation: 0,
        bannerStyle: activeBannerStyle,
        boxColor: '#fef3c7',
        boxBorderColor: '#92400e',
        boxOpacity: 0.88,
        letterSpacing: textPresetStyle === 'imperial_spaced' ? 6 : 2,
        curvature: textCurvature,
        stylePreset: textPresetStyle,
      };
      const updatedLabels = [...labelsRef.current, newLabel];
      labelsRef.current = updatedLabels;
      setLabels(updatedLabels);
      setSelectedLabelId(newLabel.id);
      setSelectedStampId(null);
      setSelectedPathId(null);
      pushHistorySnapshot('Place Label', { labels: updatedLabels });
      requestRedraw();
    } else if (activeTool === 'select') {
      // 1. If a stamp is already selected, test if user clicked its rotate, scale handles or body
      if (selectedStampId) {
        const curStamp = stampsRef.current.find((s) => s.id === selectedStampId);
        if (curStamp) {
          const handle = getStampHitHandle(x, y, curStamp);
          if (handle === 'rotate') {
            transformModeRef.current = 'rotate';
            transformStartRef.current = {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              centerX: curStamp.x,
              centerY: curStamp.y,
              initialDist: Math.hypot(x - curStamp.x, y - curStamp.y),
              initialAngle: (Math.atan2(y - curStamp.y, x - curStamp.x) * 180) / Math.PI,
            };
            return;
          } else if (handle === 'scale') {
            transformModeRef.current = 'scale';
            transformStartRef.current = {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              centerX: curStamp.x,
              centerY: curStamp.y,
              initialDist: Math.max(10, Math.hypot(x - curStamp.x, y - curStamp.y)),
              initialAngle: 0,
            };
            return;
          } else if (handle === 'move') {
            transformModeRef.current = 'move';
            transformStartRef.current = {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              centerX: curStamp.x,
              centerY: curStamp.y,
              initialDist: 0,
              initialAngle: 0,
            };
            return;
          }
        }
      }

      // 2. If a label is selected, test if user clicked inside it to drag-move
      if (selectedLabelId) {
        const curLabel = labelsRef.current.find((l) => l.id === selectedLabelId);
        if (curLabel && isPointInLabel(x, y, curLabel)) {
          transformModeRef.current = 'move';
          transformStartRef.current = {
            startX: x,
            startY: y,
            initialElement: { ...curLabel },
            centerX: curLabel.x,
            centerY: curLabel.y,
            initialDist: 0,
            initialAngle: 0,
          };
          return;
        }
      }

      // 3. Test hit on any stamp (front-most visually by Z-layer, isometric Y depth, creation time)
      const clickedStamp = getStampsFrontToBack(stampsRef.current).find((s) => isPointInStamp(x, y, s));
      if (clickedStamp) {
        setSelectedStampId(clickedStamp.id);
        setSelectedLabelId(null);
        setSelectedPathId(null);
        transformModeRef.current = 'move';
        transformStartRef.current = {
          startX: x,
          startY: y,
          initialElement: { ...clickedStamp },
          centerX: clickedStamp.x,
          centerY: clickedStamp.y,
          initialDist: 0,
          initialAngle: 0,
        };
        requestRedraw();
        return;
      }

      // 4. Test hit on any label
      const clickedLabel = [...labelsRef.current].reverse().find((l) => isPointInLabel(x, y, l));
      if (clickedLabel) {
        setSelectedLabelId(clickedLabel.id);
        setSelectedStampId(null);
        setSelectedPathId(null);
        transformModeRef.current = 'move';
        transformStartRef.current = {
          startX: x,
          startY: y,
          initialElement: { ...clickedLabel },
          centerX: clickedLabel.x,
          centerY: clickedLabel.y,
          initialDist: 0,
          initialAngle: 0,
        };
        requestRedraw();
        return;
      }

      // 5. Test hit on any path / river
      const clickedPath = [...pathsRef.current].reverse().find((p) => isPointNearPath(x, y, p, 24));
      if (clickedPath) {
        setSelectedPathId(clickedPath.id);
        setSelectedStampId(null);
        setSelectedLabelId(null);
        requestRedraw();
        return;
      }

      // 6. Clicked on empty space: clear selection
      setSelectedStampId(null);
      setSelectedLabelId(null);
      setSelectedPathId(null);
      requestRedraw();
    } else if (activeTool === 'eraser') {
      isErasingRef.current = true;
      erasedElementsCountRef.current = 0;

      const targetMode = brushSettings.eraserTarget || 'all';
      let elementDeleted = false;

      // 1. Direct single-click deletion for stamps (front-most visually by Z-layer, isometric Y depth)
      if (targetMode === 'all' || targetMode === 'stamps') {
        const clickedStamp = getStampsFrontToBack(stampsRef.current).find((s) => isPointInStamp(x, y, s));
        if (clickedStamp) {
          const remainingStamps = stampsRef.current.filter((s) => s.id !== clickedStamp.id);
          stampsRef.current = remainingStamps;
          setStamps(remainingStamps);
          if (selectedStampId === clickedStamp.id) setSelectedStampId(null);
          pushHistorySnapshot('Erase Stamp', { stamps: remainingStamps });
          elementDeleted = true;
        }
      }

      // 2. Direct single-click deletion for labels
      if (!elementDeleted && (targetMode === 'all' || targetMode === 'labels')) {
        const clickedLabel = [...labelsRef.current].reverse().find((l) => isPointInLabel(x, y, l));
        if (clickedLabel) {
          const remainingLabels = labelsRef.current.filter((l) => l.id !== clickedLabel.id);
          labelsRef.current = remainingLabels;
          setLabels(remainingLabels);
          if (selectedLabelId === clickedLabel.id) setSelectedLabelId(null);
          pushHistorySnapshot('Erase Label', { labels: remainingLabels });
          elementDeleted = true;
        }
      }

      // 3. Direct single-click deletion for paths / rivers
      if (!elementDeleted && (targetMode === 'all' || targetMode === 'paths')) {
        const clickedPath = [...pathsRef.current].reverse().find((p) => isPointNearPath(x, y, p, 24));
        if (clickedPath) {
          const remainingPaths = pathsRef.current.filter((p) => p.id !== clickedPath.id);
          pathsRef.current = remainingPaths;
          setPaths(remainingPaths);
          if (selectedPathId === clickedPath.id) setSelectedPathId(null);
          pushHistorySnapshot('Erase Path', { paths: remainingPaths });
          elementDeleted = true;
        }
      }

      // If clicked empty space or dragging, perform brush area erase
      if (!elementDeleted) {
        eraseElementsAt(x, y);
      } else {
        requestRedraw();
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);
    setCursorPos(coords);

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    // Interactive Drag-to-Transform (Select Tool)
    if (activeTool === 'select' && transformModeRef.current && transformStartRef.current) {
      const mode = transformModeRef.current;
      const start = transformStartRef.current;
      const dx = coords.x - start.startX;
      const dy = coords.y - start.startY;

      if (selectedStampId) {
        if (mode === 'move') {
          const newX = Math.round(start.initialElement.x + dx);
          const newY = Math.round(start.initialElement.y + dy);
          setStamps((prev) =>
            prev.map((s) => (s.id === selectedStampId ? { ...s, x: newX, y: newY } : s))
          );
          stampsRef.current = stampsRef.current.map((s) =>
            s.id === selectedStampId ? { ...s, x: newX, y: newY } : s
          );
        } else if (mode === 'scale') {
          const currentDist = Math.hypot(coords.x - start.centerX, coords.y - start.centerY);
          const ratio = currentDist / Math.max(10, start.initialDist);
          const newScale = Math.max(0.2, Math.min(4.0, Number((start.initialElement.scale * ratio).toFixed(2))));
          setStamps((prev) =>
            prev.map((s) => (s.id === selectedStampId ? { ...s, scale: newScale } : s))
          );
          stampsRef.current = stampsRef.current.map((s) =>
            s.id === selectedStampId ? { ...s, scale: newScale } : s
          );
        } else if (mode === 'rotate') {
          const curAngle = (Math.atan2(coords.y - start.centerY, coords.x - start.centerX) * 180) / Math.PI;
          const deltaAngle = curAngle - start.initialAngle;
          const newRot = Math.round((start.initialElement.rotation + deltaAngle + 360) % 360);
          setStamps((prev) =>
            prev.map((s) => (s.id === selectedStampId ? { ...s, rotation: newRot } : s))
          );
          stampsRef.current = stampsRef.current.map((s) =>
            s.id === selectedStampId ? { ...s, rotation: newRot } : s
          );
        }
        requestRedraw();
      } else if (selectedLabelId) {
        if (mode === 'move') {
          const newX = Math.round(start.initialElement.x + dx);
          const newY = Math.round(start.initialElement.y + dy);
          setLabels((prev) =>
            prev.map((l) => (l.id === selectedLabelId ? { ...l, x: newX, y: newY } : l))
          );
          labelsRef.current = labelsRef.current.map((l) =>
            l.id === selectedLabelId ? { ...l, x: newX, y: newY } : l
          );
        }
        requestRedraw();
      }
      return;
    }

    if (activeTool === 'eraser' && isErasingRef.current) {
      eraseElementsAt(coords.x, coords.y);
    } else if (activeTool === 'stamp' && lastStampPointRef.current && brushSettings.stampPlacementMode === 'ribbon') {
      const spacing = brushSettings.ribbonSpacing || 35;
      const dist = Math.hypot(coords.x - lastStampPointRef.current.x, coords.y - lastStampPointRef.current.y);
      if (dist >= spacing) {
        placeStampsAt(coords.x, coords.y);
        lastStampPointRef.current = coords;
      }
    } else if (isPaintingRef.current && lastPaintPointRef.current) {
      paintStroke(
        lastPaintPointRef.current.x,
        lastPaintPointRef.current.y,
        coords.x,
        coords.y
      );
      lastPaintPointRef.current = coords;
      requestRedraw();
    } else if (activePathDraft) {
      // Append point to river / path
      setActivePathDraft((prev) =>
        prev ? { ...prev, points: [...prev.points, coords] } : null
      );
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (transformModeRef.current) {
      transformModeRef.current = null;
      transformStartRef.current = null;
      pushHistorySnapshot('Transform Element');
    }

    if (lastStampPointRef.current) {
      lastStampPointRef.current = null;
    }

    if (isErasingRef.current) {
      isErasingRef.current = false;
      if (erasedElementsCountRef.current > 0) {
        pushHistorySnapshot('Erase Elements', {
          stamps: stampsRef.current,
          paths: pathsRef.current,
          labels: labelsRef.current,
        });
        erasedElementsCountRef.current = 0;
      }
    }

    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPaintPointRef.current = null;
      pushHistorySnapshot(`Paint ${activeTool}`);
    } else if (activePathDraft) {
      if (activePathDraft.points.length > 1) {
        if (
          activePathStyle === 'river' &&
          brushSettings.riverCarveGorge &&
          elevationCanvasRef.current
        ) {
          carveRiverGorge(
            activePathDraft.points,
            elevationCanvasRef.current,
            8,
            activePathDraft.width * 2.5
          );
        }

        const newPath: PlacedPath = {
          id: `path_${Date.now()}`,
          style: activePathStyle,
          points: activePathDraft.points,
          width: activePathDraft.width,
          color: activePathDraft.color,
          dashPattern:
            activePathStyle === 'trade_route'
              ? [8, 6]
              : activePathStyle === 'border'
              ? [4, 4]
              : [],
          opacity: 0.95,
          smoothed: true,
          taper: pathTaper,
          doubleLine: pathDoubleLine,
        };
        const updatedPaths = [...pathsRef.current, newPath];
        pathsRef.current = updatedPaths;
        setPaths(updatedPaths);
        pushHistorySnapshot('Draw River / Route', { paths: updatedPaths });
        requestRedraw();
      }
      setActivePathDraft(null);
    }
  };

  // Zoom handling with mouse wheel
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.max(0.2, Math.min(3.5, prev + zoomDelta)));
  };

  // --- Export Function ---
  const handlePerformExport = async (
    scaleFactor: number,
    format: 'png' | 'jpeg' | 'heightmap' | 'topo_json',
    parchmentOptions?: ParchmentFilterOptions
  ) => {
    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !elevation) return;

    if (format === 'heightmap') {
      const dataUrl = CanvasRenderer.exportHeightmap(
        elevation,
        mask,
        dimensions.width * scaleFactor,
        dimensions.height * scaleFactor
      );
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_heightmap.png`;
      a.click();
    } else if (format === 'topo_json') {
      // Export elevation matrix data
      const eCtx = elevation.getContext('2d')!;
      const imgData = eCtx.getImageData(0, 0, dimensions.width, dimensions.height);
      const matrix: number[][] = [];
      const step = 8; // Downsampled grid matrix
      for (let y = 0; y < dimensions.height; y += step) {
        const row: number[] = [];
        for (let x = 0; x < dimensions.width; x += step) {
          const idx = (y * dimensions.width + x) * 4;
          // Grayscale brightness mapped back to -100 to +100
          const val = Math.round((imgData.data[idx] / 255) * 200 - 100);
          row.push(val);
        }
        matrix.push(row);
      }
      const blob = new Blob([JSON.stringify({ name: projectName, step, matrix }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}_elevation.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // PNG or JPEG export with supersampling and Canny parchment inking support
      const offscreen = document.createElement('canvas');
      const oCtx = offscreen.getContext('2d')!;
      const dataUrl = await CanvasRenderer.exportHighResolution(
        {
          ctx: oCtx,
          width: dimensions.width,
          height: dimensions.height,
          maskCanvas: mask,
          textureCanvas: texture,
          elevationCanvas: elevation,
          stamps,
          paths,
          labels,
          customAssets,
          layers,
          grid: gridConfig,
          atmosphere,
          waterDeepColor,
          waterShallowColor,
          coastlineRipples: brushSettings.coastlineRipples,
          coastlineColor: brushSettings.coastlineColor,
          topographicalView,
        },
        scaleFactor,
        true,
        parchmentOptions,
        format === 'jpeg' ? 'image/jpeg' : 'image/png'
      );

      const a = document.createElement('a');
      a.href = dataUrl;
      const fileExt = format === 'jpeg' ? 'jpg' : 'png';
      const modeSuffix = atmosphere.preset === 'vintage_parchment' ? '_parchment_ink' : '';
      a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}${modeSuffix}_${scaleFactor}x.${fileExt}`;
      a.click();
    }
  };

  // --- Project JSON Save / Load & Restore Helpers ---
  const restoreProjectData = useCallback((parsed: any) => {
    if (parsed.project) {
      setProjectName(parsed.project.name || 'Imported Realm');
      if (parsed.project.waterDeepColor) setWaterDeepColor(parsed.project.waterDeepColor);
      if (parsed.project.waterShallowColor) setWaterShallowColor(parsed.project.waterShallowColor);
      const nextStamps = parsed.project.stamps || [];
      const nextPaths = parsed.project.paths || [];
      const nextLabels = parsed.project.labels || [];
      stampsRef.current = nextStamps;
      pathsRef.current = nextPaths;
      labelsRef.current = nextLabels;
      setStamps(nextStamps);
      setPaths(nextPaths);
      setLabels(nextLabels);
      if (parsed.project.grid) setGridConfig(parsed.project.grid);
      if (parsed.project.atmosphere) setAtmosphere(parsed.project.atmosphere);
      if (parsed.project.layers) setLayers(parsed.project.layers);
      if (parsed.project.customAssets) {
        setCustomAssets(parsed.project.customAssets);
        imageManager.preloadDefaultAssets(parsed.project.customAssets);
      }
    }

    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;

    if (parsed.maskDataUrl && mask) {
      const mImg = new Image();
      mImg.onload = () => {
        const mCtx = mask.getContext('2d')!;
        mCtx.clearRect(0, 0, mask.width, mask.height);
        mCtx.drawImage(mImg, 0, 0);
        requestRedraw();
      };
      mImg.src = parsed.maskDataUrl;
    }

    if (parsed.textureDataUrl && texture) {
      const tImg = new Image();
      tImg.onload = () => {
        const tCtx = texture.getContext('2d')!;
        tCtx.clearRect(0, 0, texture.width, texture.height);
        tCtx.drawImage(tImg, 0, 0);
        requestRedraw();
      };
      tImg.src = parsed.textureDataUrl;
    }

    if (parsed.elevationDataUrl && elevation) {
      const eImg = new Image();
      eImg.onload = () => {
        const eCtx = elevation.getContext('2d')!;
        eCtx.clearRect(0, 0, elevation.width, elevation.height);
        eCtx.drawImage(eImg, 0, 0);
        requestRedraw();
      };
      eImg.src = parsed.elevationDataUrl;
    }

    requestRedraw();
  }, [requestRedraw]);

  const handleSaveJson = () => {
    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;

    const projectData: MapProject = {
      version: '1.0.0',
      name: projectName,
      dimensions,
      backgroundColor: '#1a365d',
      waterDeepColor,
      waterShallowColor,
      layers,
      grid: gridConfig,
      atmosphere,
      stamps,
      paths,
      labels,
      customAssets,
    };

    const fullExport = {
      project: projectData,
      maskDataUrl: mask?.toDataURL(),
      textureDataUrl: texture?.toDataURL(),
      elevationDataUrl: elevation?.toDataURL(),
    };

    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.cartomancer.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          restoreProjectData(parsed);
          pushHistorySnapshot('Load Project JSON');
        } catch (err) {
          console.error('Failed to parse Cartomancer map file', err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- Autosave 60s Idle Engine & FSA Integration ---
  const triggerAutosave = useCallback(async () => {
    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !elevation) return;

    setAutosaveStatus('saving');
    try {
      const payload: AutosavePayload = {
        project: {
          version: '1.0.0',
          name: projectName,
          dimensions,
          backgroundColor: '#1a365d',
          waterDeepColor,
          waterShallowColor,
          layers,
          grid: gridConfig,
          atmosphere,
          stamps: stampsRef.current,
          paths: pathsRef.current,
          labels: labelsRef.current,
          customAssets,
        },
        maskDataUrl: mask.toDataURL(),
        textureDataUrl: texture.toDataURL(),
        elevationDataUrl: elevation.toDataURL(),
      };
      const res = await projectAutosave.save(payload);
      if (res.success) {
        setAutosaveStatus('saved');
        setLastAutosaveTime(res.timestamp);
        setTimeout(() => setAutosaveStatus('idle'), 3500);
      } else {
        setAutosaveStatus('error');
      }
    } catch {
      setAutosaveStatus('error');
    }
  }, [
    projectName,
    dimensions,
    waterDeepColor,
    waterShallowColor,
    layers,
    gridConfig,
    atmosphere,
    customAssets,
  ]);

  // Autosave 60s Idle Engine & FSA Integration
  const handleToggleAutosave = (enabled: boolean) => {
    setIsAutosaveEnabled(enabled);
    try {
      localStorage.setItem('cartomancer_autosave_enabled', String(enabled));
    } catch {
      // ignore
    }
    if (enabled) {
      triggerAutosave();
    } else {
      setAutosaveStatus('idle');
    }
  };

  // Periodic 60s idle autosave (only runs if enabled)
  useEffect(() => {
    if (!isAutosaveEnabled) return;

    const interval = setInterval(() => {
      if (isPaintingRef.current || isErasingRef.current || isPanning) {
        return; // Defers until idle
      }
      triggerAutosave();
    }, 60000);

    return () => clearInterval(interval);
  }, [isAutosaveEnabled, triggerAutosave, isPanning]);

  // Check for existing autosave on initial load (available in Map Menu dropdown)
  useEffect(() => {
    projectAutosave.getLatestAutosave().then((draft) => {
      if (draft && draft.payload?.project) {
        const hasContent =
          (draft.payload.project.stamps?.length || 0) > 0 ||
          (draft.payload.project.paths?.length || 0) > 0 ||
          (draft.payload.project.labels?.length || 0) > 0 ||
          draft.payload.maskDataUrl;
        if (hasContent) {
          setRecoveryDraft(draft);
        }
      }
    });
  }, []);

  const handleLinkFsaFolder = async () => {
    const res = await projectAutosave.linkLocalFolder();
    if (res.success && res.folderName) {
      setFsaFolderName(res.folderName);
      triggerAutosave();
    } else if (res.error) {
      alert(res.error);
    }
  };

  const handleUnlinkFsaFolder = () => {
    projectAutosave.unlinkFolder();
    setFsaFolderName(null);
  };

  const handleRestoreAutosave = () => {
    if (!recoveryDraft) {
      projectAutosave.getLatestAutosave().then((draft) => {
        if (draft && draft.payload) {
          restoreProjectData(draft.payload);
        } else {
          alert('No autosaved draft found.');
        }
      });
      return;
    }
    restoreProjectData(recoveryDraft.payload);
  };

  saveJsonRef.current = handleSaveJson;
  loadJsonRef.current = handleLoadJson;

  const selectedAsset =
    [...DEFAULT_STAMP_ASSETS, ...customAssets].find(
      (a) => a.id === brushSettings.selectedStampId
    ) || customAssets[0] || null;

  const selectedStamp = stamps.find((s) => s.id === selectedStampId) || null;
  const selectedLabel = labels.find((l) => l.id === selectedLabelId) || null;
  const selectedPath = paths.find((p) => p.id === selectedPathId) || null;
  const activeBiome = (brushSettings.selectedBiome as BiomePreset) || 'grassland';
  const handleSelectBiome = (biome: BiomePreset) => {
    setBrushSettings((prev) => ({ ...prev, selectedBiome: biome }));
  };

  return (
    <div id="cartomancer-app" className="h-screen w-screen flex flex-col bg-[#FDF6E3] overflow-hidden font-sans select-none">
      {/* 1. Top Navbar */}
      <Navbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canUndo={undoCount > 1}
        canRedo={redoCount > 0}
        undoCount={undoCount}
        redoCount={redoCount}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={() => {
          setZoom(1.0);
          setPan({ x: 40, y: 30 });
        }}
        topographicalView={topographicalView}
        onToggleTopographicalView={() => setTopographicalView(!topographicalView)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenMapImport={() => setIsMapImportOpen(true)}
        onOpenShaderLab={() => setIsShaderLabOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenAssetOutliner={() => setIsAssetOutlinerOpen(true)}
        assetCount={stamps.length + paths.length + labels.length}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onNewMap={() => applyTemplate('blank', true)}
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onToggleLayersPanel={() => setIsLayersPanelOpen(!isLayersPanelOpen)}
        isLayersPanelOpen={isLayersPanelOpen}
        isAutosaveEnabled={isAutosaveEnabled}
        onToggleAutosave={handleToggleAutosave}
        autosaveStatus={autosaveStatus}
        lastAutosaveTime={lastAutosaveTime}
        fsaFolderName={fsaFolderName}
        onLinkFsaFolder={handleLinkFsaFolder}
        onUnlinkFsaFolder={handleUnlinkFsaFolder}
        onTriggerAutosave={triggerAutosave}
        onRestoreAutosave={handleRestoreAutosave}
        hasRecoveryDraft={Boolean(recoveryDraft)}
      />

      {/* 2. Main Center Workspace: Tool Palette + Left Tool Settings Side Panel + Canvas Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Leftmost Tool Palette */}
        <ToolPalette
          activeTool={activeTool}
          isToolSettingsOpen={isToolSettingsOpen}
          onSelectTool={(tool) => {
            if (tool === activeTool) {
              // Clicking the already active tool icon toggles the side panel collapsed/open
              setIsToolSettingsOpen((prev) => !prev);
            } else {
              // Switching to a different tool activates it and reveals its settings panel
              setActiveTool(tool);
              setIsToolSettingsOpen(true);
            }
          }}
          onOpenAssetOutliner={() => setIsAssetOutlinerOpen(true)}
          assetCount={stamps.length + paths.length + labels.length}
        />

        {/* Dedicated Left-Side Tool Settings Panel */}
        {isToolSettingsOpen && (
          <ToolSettingsPanel
            activeTool={activeTool}
            onClose={() => setIsToolSettingsOpen(false)}
            brushSettings={brushSettings}
            onUpdateBrushSettings={(newSet) =>
              setBrushSettings((prev) => ({ ...prev, ...newSet }))
            }
            selectedStamp={selectedStamp}
            selectedLabel={selectedLabel}
            selectedPath={selectedPath}
            onUpdateSelectedStamp={handleUpdateSelectedStamp}
            onUpdateSelectedLabel={handleUpdateSelectedLabel}
            onDeleteSelectedStamp={handleDeleteSelectedStamp}
            onDeleteSelectedLabel={handleDeleteSelectedLabel}
            onDeleteSelectedPath={handleDeleteSelectedPath}
            onDuplicateSelectedStamp={handleDuplicateSelectedStamp}
            onDuplicateSelectedLabel={handleDuplicateSelectedLabel}
            onBringStampToFront={handleBringStampToFront}
            onSendStampToBack={handleSendStampToBack}
            selectedStampAsset={selectedAsset}
            onOpenAssetLibrary={() => setIsAssetLibraryOpen(true)}
            activePathStyle={activePathStyle}
            onPathStyleChange={setActivePathStyle}
            pathColor={pathColor}
            onPathColorChange={setPathColor}
            pathTaper={pathTaper}
            onPathTaperChange={setPathTaper}
            pathDoubleLine={pathDoubleLine}
            onPathDoubleLineChange={setPathDoubleLine}
            activePathDraft={activePathDraft}
            onFinishActivePath={handleFinishActivePath}
            activeTextString={activeTextString}
            onTextStringChange={setActiveTextString}
            activeFontFamily={activeFontFamily}
            onFontFamilyChange={setActiveFontFamily}
            activeFontSize={activeFontSize}
            onFontSizeChange={setActiveFontSize}
            activeTextColor={activeTextColor}
            onTextColorChange={setActiveTextColor}
            activeBannerStyle={activeBannerStyle}
            onBannerStyleChange={setActiveBannerStyle}
            textCurvature={textCurvature}
            onTextCurvatureChange={setTextCurvature}
            textPresetStyle={textPresetStyle}
            onTextPresetStyleChange={setTextPresetStyle}
            onHydraulicErosion={handleHydraulicErosion}
            activeBiome={activeBiome}
            onSelectBiome={handleSelectBiome}
            customBiomes={customBiomes}
            onOpenShaderLab={() => setIsShaderLabOpen(true)}
          />
        )}

        {/* Canvas Interactive Viewport */}
        <div
          ref={viewportRef}
          id="map-viewport"
          className={`flex-1 bg-[#F4EBD0]/40 overflow-hidden relative ${
            activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-crosshair'
          }`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        >
          {/* Zoomable & Pannable Stage Container */}
          <div
            id="map-stage"
            className="absolute origin-top-left transition-transform duration-75 ease-out shadow-2xl"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            <canvas
              ref={mainCanvasRef}
              id="main-map-canvas"
              width={dimensions.width}
              height={dimensions.height}
              className="rounded-sm shadow-2xl ring-4 ring-[#E2D6B5] block bg-[#0f172a]"
            />
          </div>

          {/* Bottom Floating Status Bar */}
          <div className="absolute bottom-3 left-3 bg-[#FDF6E3]/95 backdrop-blur-sm border border-[#E2D6B5] rounded-lg px-3 py-1.5 flex items-center gap-4 text-[11px] text-slate-700 shadow-md pointer-events-none select-none">
            <div>
              X: <span className="font-mono font-bold text-slate-900">{cursorPos.x}</span> Y:{' '}
              <span className="font-mono font-bold text-slate-900">{cursorPos.y}</span>
            </div>
            <div className="w-[1px] h-3 bg-[#E2D6B5]" />
            <div>
              Size:{' '}
              <span className="font-mono font-bold text-slate-900">
                {dimensions.width} x {dimensions.height}
              </span>
            </div>
            <div className="w-[1px] h-3 bg-[#E2D6B5]" />
            <div className="text-[#D9480F] font-bold capitalize">
              Active: {activeTool}
            </div>
          </div>
        </div>

        {/* Right Layers Inspector Drawer */}
        <LayersPanel
          isOpen={isLayersPanelOpen}
          onClose={() => setIsLayersPanelOpen(false)}
          layers={layers}
          onUpdateLayer={(key, updates) =>
            setLayers((prev) => ({
              ...prev,
              [key]: { ...(prev as any)[key], ...updates },
            }))
          }
          stampCount={stamps.length}
          pathCount={paths.length}
          labelCount={labels.length}
          atmosphere={atmosphere}
          onAtmosphereChange={(newAtm) => {
            setAtmosphere((prev) => ({ ...prev, ...newAtm }));
            requestRedraw();
          }}
        />
      </div>

      {/* 4. Modals */}
      <AssetLibraryModal
        isOpen={isAssetLibraryOpen}
        onClose={() => setIsAssetLibraryOpen(false)}
        selectedAssetId={brushSettings.selectedStampId}
        onSelectAsset={(asset) => {
          setBrushSettings((prev) => ({ ...prev, selectedStampId: asset.id }));
          setActiveTool('stamp');
        }}
        customAssets={customAssets}
        onAddCustomAsset={handleAddCustomAsset}
        onAddCustomAssets={handleAddCustomAssets}
        onDeleteCustomAsset={handleDeleteCustomAsset}
        onClearAllCustomAssets={handleClearAllCustomAssets}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        dimensions={dimensions}
        atmosphere={atmosphere}
        onAtmosphereChange={(newAtm) => setAtmosphere((prev) => ({ ...prev, ...newAtm }))}
        onPerformExport={handlePerformExport}
        sourceCanvas={mainCanvasRef.current}
        elevationCanvas={elevationCanvasRef.current}
        maskCanvas={maskCanvasRef.current}
      />

      <TemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onApplyTemplate={(tmplKey) => applyTemplate(tmplKey, true)}
      />

      <HelpShortcutsModal
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
      />

      <ShaderLabModal
        isOpen={isShaderLabOpen}
        onClose={() => setIsShaderLabOpen(false)}
        onAddCustomBiome={handleAddCustomBiome}
        onSaveShader={handleAddCustomBiome}
        customBiomes={customBiomes}
        onDeleteCustomBiome={handleDeleteCustomBiome}
        onSelectBiome={(biomeId) => {
          setBrushSettings((prev) => ({ ...prev, selectedBiome: biomeId }));
          setActiveTool('brush');
        }}
      />

      <MapImportModal
        isOpen={isMapImportOpen}
        onClose={() => setIsMapImportOpen(false)}
        canvasWidth={dimensions.width}
        canvasHeight={dimensions.height}
        onApplyExtractedMask={handleApplyExtractedMask}
        onSetReferenceMap={handleSetReferenceMap}
        onApplyBaseTextureImage={handleApplyBaseTextureImage}
      />

      <AssetOutlinerModal
        isOpen={isAssetOutlinerOpen}
        onClose={() => setIsAssetOutlinerOpen(false)}
        stamps={stamps}
        paths={paths}
        labels={labels}
        customAssets={customAssets}
        selectedStampId={selectedStampId}
        selectedPathId={selectedPathId}
        selectedLabelId={selectedLabelId}
        onSelectAndFocus={handleSelectAndFocus}
        onDeleteStamp={handleDeleteStampFromTable}
        onDeletePath={handleDeletePathFromTable}
        onDeleteLabel={handleDeleteLabelFromTable}
        onDeleteBatch={handleDeleteBatchFromTable}
      />
    </div>
  );
}
