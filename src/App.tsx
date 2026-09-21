/**
 * Cartomancer - Fantasy Map Maker
 * High-performance, professional-grade fantasy map creator.
 * Modular, decoupled architecture coordinating custom hooks and dedicated rendering/painting modules.
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
import { imageManager } from './utils/imageManager';
import { assetStorage } from './utils/assetStorage';
import { AutosavePayload, AutosaveRecord } from './utils/projectAutosave';
import { ParchmentFilterOptions } from './utils/cannyEdgeFilter';
import { CanvasRenderer } from './utils/canvasRenderer';
import {
  DEFAULT_WORLD_ELEVATION,
  deriveTopographyFromDrawnMap,
  bakeTopographyToCanvas,
  computeHydrologicalDrainagePath,
  carveRiverGorge,
} from './utils/elevationModel';
import { simulateHydraulicErosion } from './utils/proceduralNoise';
import { paintBrushDab, paintStroke } from './utils/painting/strokePainter';
import { isPointInStamp, getStampHitHandle, isPointInLabel, isPointNearPath, getStampsFrontToBack } from './utils/hitTesting';

// Custom Domain Hooks
import { useLayers, LayerGroupState } from './hooks/useLayers';
import { useViewport } from './hooks/useViewport';
import { useMapHistory } from './hooks/useMapHistory';
import { useStampManager } from './hooks/useStampManager';
import { usePathManager } from './hooks/usePathManager';
import { useLabelManager } from './hooks/useLabelManager';
import { useTransformManager } from './hooks/useTransformManager';
import { useEraser } from './hooks/useEraser';
import { useAutosave } from './hooks/useAutosave';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Subcomponents
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

const DEFAULT_DIMENSIONS: CanvasDimensions = { width: 1400, height: 900 };

export default function App() {
  // --- Project Configuration ---
  const [projectName, setProjectName] = useState('Realm of Eldoria');
  const [dimensions] = useState<CanvasDimensions>(DEFAULT_DIMENSIONS);
  const [waterDeepColor, setWaterDeepColor] = useState('#1a365d');
  const [waterShallowColor, setWaterShallowColor] = useState('#2b6cb0');
  const [topographicalView, setTopographicalView] = useState(false);
  const [elevationConfig, setElevationConfig] = useState<WorldElevationConfig>(DEFAULT_WORLD_ELEVATION);

  // --- Tactical Grid & Atmosphere ---
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    type: 'none',
    size: 48,
    color: '#ffffff',
    opacity: 0.25,
    lineWidth: 1.5,
    labels: false,
  });

  const [atmosphere, setAtmosphere] = useState<AtmosphereFilter>({
    preset: 'vintage_parchment',
    vignette: 0.35,
    warmth: 0.1,
    contrast: 1.05,
    brightness: 1.0,
  });

  // --- Tool & Brush Settings ---
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [isToolSettingsOpen, setIsToolSettingsOpen] = useState(true);
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
    pathRestrictToLand: true,
    pathAutoMerge: true,
    pathTextureId: 'default',
  });

  // Path Tool specific
  const [activePathStyle, setActivePathStyle] = useState<PathStyle>('river');
  const [pathWidth, setPathWidth] = useState(8);
  const [pathColor, setPathColor] = useState('#38bdf8');
  const [pathTaper, setPathTaper] = useState(true);
  const [pathDoubleLine, setPathDoubleLine] = useState(false);
  const [pathTextureId, setPathTextureId] = useState<string>('default');
  const [pathRestrictToLand, setPathRestrictToLand] = useState<boolean>(true);
  const [pathAutoMerge, setPathAutoMerge] = useState<boolean>(true);

  // Text Tool specific
  const [activeTextString, setActiveTextString] = useState('Valdorian Highlands');
  const [activeFontFamily, setActiveFontFamily] = useState("'Cinzel', serif");
  const [activeFontSize, setActiveFontSize] = useState(24);
  const [activeTextColor, setActiveTextColor] = useState('#fef3c7');
  const [activeBannerStyle, setActiveBannerStyle] = useState<TextBannerStyle>('parchment_ribbon');
  const [textCurvature, setTextCurvature] = useState(0);
  const [textPresetStyle, setTextPresetStyle] = useState<TextPresetStyle>('standard');

  // Custom Assets, Biomes, and Reference Maps
  const [customAssets, setCustomAssets] = useState<StampAsset[]>([]);
  const [referenceMap, setReferenceMap] = useState<ReferenceMapConfig | null>(null);
  const [customBiomes, setCustomBiomes] = useState<BiomeTexture[]>(() => {
    try {
      const saved = localStorage.getItem('cartomancer_custom_biomes');
      if (!saved) return [];
      const biomes: BiomeTexture[] = JSON.parse(saved);
      return biomes.map((b) => {
        if (b.color === '#6b7280') {
          const isGrass = /grass|green|meadow|lawn|pasture|field|forest/i.test(b.name || '');
          if (isGrass || b.detailType === 'grass') {
            return { ...b, color: '#4d8036', roughnessColor: '#315a20', detailType: 'grass' };
          }
        }
        return b;
      });
    } catch {
      return [];
    }
  });

  // Modals & Drawers
  const [isAssetLibraryOpen, setIsAssetLibraryOpen] = useState(false);
  const [isLayersPanelOpen, setIsLayersPanelOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isShaderLabOpen, setIsShaderLabOpen] = useState(false);
  const [isMapImportOpen, setIsMapImportOpen] = useState(false);
  const [isAssetOutlinerOpen, setIsAssetOutlinerOpen] = useState(false);

  // Canvas Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const elevationCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active stroke painting ref
  const isPaintingRef = useRef(false);
  const lastPaintPointRef = useRef<{ x: number; y: number } | null>(null);
  const lastStampPointRef = useRef<{ x: number; y: number } | null>(null);

  // Forward references for json save/load callbacks
  const saveJsonRef = useRef<() => void>(() => {});
  const loadJsonRef = useRef<() => void>(() => {});

  // --- 1. Layers Domain Hook ---
  const { layers, layersRef, setLayers, updateLayer, isLayerActive } = useLayers({
    onLayerDeactivated: (key) => {
      if (key === 'stamps') setSelectedStampId(null);
      if (key === 'paths') setSelectedPathId(null);
      if (key === 'labels') setSelectedLabelId(null);
      cancelTransform();
    },
    onRequestRedraw: (updatedLayers) => {
      requestRedraw({ layers: updatedLayers });
    },
  });

  const isStampsActive = useCallback(() => isLayerActive('stamps'), [isLayerActive]);
  const isPathsActive = useCallback(() => isLayerActive('paths'), [isLayerActive]);
  const isLabelsActive = useCallback(() => isLayerActive('labels'), [isLayerActive]);

  // Forward declarations for element setters & refs used in history & redraw coordinator
  const stampsRef = useRef<PlacedStamp[]>([]);
  const pathsRef = useRef<PlacedPath[]>([]);
  const labelsRef = useRef<PlacedText[]>([]);
  const selectedStampIdRef = useRef<string | null>(null);
  const selectedPathIdRef = useRef<string | null>(null);
  const selectedLabelIdRef = useRef<string | null>(null);
  const activePathDraftRef = useRef<any | null>(null);

  // --- Redraw Coordinator ---
  const requestRedraw = useCallback(
    (explicitOverrides?: {
      stamps?: PlacedStamp[];
      paths?: PlacedPath[];
      labels?: PlacedText[];
      layers?: LayerGroupState;
      atmosphere?: AtmosphereFilter;
      topographicalView?: boolean;
    }) => {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d');
      if (!ctx) return;

      const mask = maskCanvasRef.current;
      const texture = textureCanvasRef.current;
      const elevation = elevationCanvasRef.current;
      if (!mask || !texture || !elevation) return;

      const activeLayers = (explicitOverrides?.layers ?? layersRef.current ?? layers) as any;
      const activeAtmosphere = explicitOverrides?.atmosphere ?? atmosphere;
      const activeTopographical = explicitOverrides?.topographicalView ?? topographicalView;

      CanvasRenderer.render({
        ctx,
        width: dimensions.width,
        height: dimensions.height,
        maskCanvas: mask,
        textureCanvas: texture,
        elevationCanvas: elevation,
        stamps: explicitOverrides?.stamps ?? stampsRef.current,
        paths: explicitOverrides?.paths ?? pathsRef.current,
        labels: explicitOverrides?.labels ?? labelsRef.current,
        customAssets,
        layers: activeLayers,
        grid: gridConfig,
        atmosphere: activeAtmosphere,
        waterDeepColor,
        waterShallowColor,
        coastlineRipples: brushSettings.coastlineRipples,
        coastlineColor: brushSettings.coastlineColor,
        topographicalView: activeTopographical,
        selectedStampId: isStampsActive() ? selectedStampIdRef.current : null,
        selectedLabelId: isLabelsActive() ? selectedLabelIdRef.current : null,
        selectedPathId: isPathsActive() ? selectedPathIdRef.current : null,
        activePathDraft: activePathDraftRef.current,
        referenceMap,
      });
    },
    [
      dimensions,
      customAssets,
      layers,
      layersRef,
      gridConfig,
      atmosphere,
      waterDeepColor,
      waterShallowColor,
      brushSettings.coastlineRipples,
      brushSettings.coastlineColor,
      topographicalView,
      isStampsActive,
      isLabelsActive,
      isPathsActive,
      referenceMap,
    ]
  );

  // --- 2. Viewport Hook ---
  const {
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    cursorPos,
    setCursorPos,
    getCanvasCoords,
    resetZoom,
  } = useViewport({ dimensions, mainCanvasRef });

  // --- 3. Map History Hook ---
  const {
    undoCount,
    redoCount,
    pushHistorySnapshot,
    restoreStep,
    handleUndo,
    handleRedo,
    resetHistory,
  } = useMapHistory({
    maskCanvasRef,
    textureCanvasRef,
    elevationCanvasRef,
    stampsRef,
    pathsRef,
    labelsRef,
    setStamps: (s) => setStamps(s),
    setPaths: (p) => setPaths(p),
    setLabels: (l) => setLabels(l),
    requestRedraw,
  });

  // --- 4. Stamp Manager Hook ---
  const {
    stamps,
    stampsRef: stampRefHook,
    setStamps,
    selectedStampId,
    setSelectedStampId,
    placeStampsAt,
    handleUpdateSelectedStamp,
    handleDeleteSelectedStamp,
    handleDeleteStampById,
    handleDuplicateSelectedStamp,
    handleBringStampToFront,
    handleSendStampToBack,
  } = useStampManager({
    pushHistorySnapshot,
    requestRedraw,
    isStampsActive,
  });
  stampsRef.current = stamps;
  selectedStampIdRef.current = selectedStampId;

  // --- 5. Path Manager Hook ---
  const {
    paths,
    pathsRef: pathRefHook,
    setPaths,
    selectedPathId,
    setSelectedPathId,
    activePathDraft,
    setActivePathDraft,
    handleUpdateSelectedPath,
    handleDeleteSelectedPath,
    handleDeletePathById,
    handleCommitPath,
  } = usePathManager({
    pushHistorySnapshot,
    requestRedraw,
    isPathsActive,
  });
  pathsRef.current = paths;
  selectedPathIdRef.current = selectedPathId;
  activePathDraftRef.current = activePathDraft;

  // --- 6. Label Manager Hook ---
  const {
    labels,
    labelsRef: labelRefHook,
    setLabels,
    selectedLabelId,
    setSelectedLabelId,
    handleAddLabel,
    handleUpdateSelectedLabel,
    handleDeleteSelectedLabel,
    handleDeleteLabelById,
    handleDuplicateSelectedLabel,
  } = useLabelManager({
    pushHistorySnapshot,
    requestRedraw,
    isLabelsActive,
  });
  labelsRef.current = labels;
  selectedLabelIdRef.current = selectedLabelId;

  // --- 7. Transform Manager Hook ---
  const {
    startTransform,
    cancelTransform,
    handleTransformMove,
    finishTransform,
  } = useTransformManager({
    selectedStampId,
    selectedLabelId,
    stampsRef,
    labelsRef,
    setStamps,
    setLabels,
    isStampsActive,
    isLabelsActive,
    requestRedraw: () => requestRedraw(),
    pushHistorySnapshot,
  });

  // --- 8. Eraser Hook ---
  const {
    isErasingRef,
    eraseElementsAt,
    finishErasing,
  } = useEraser({
    brushSettings,
    stampsRef,
    pathsRef,
    labelsRef,
    setStamps,
    setPaths,
    setLabels,
    selectedStampId,
    selectedPathId,
    selectedLabelId,
    setSelectedStampId,
    setSelectedPathId,
    setSelectedLabelId,
    isStampsActive,
    isPathsActive,
    isLabelsActive,
    pushHistorySnapshot,
    requestRedraw: () => requestRedraw(),
  });

  // Auto-deselect elements if layers become inactive
  useEffect(() => {
    if (!layers.stamps.visible || layers.stamps.locked) setSelectedStampId(null);
    if (!layers.paths.visible || layers.paths.locked) setSelectedPathId(null);
    if (!layers.labels.visible || layers.labels.locked) setSelectedLabelId(null);
    cancelTransform();
  }, [layers, cancelTransform, setSelectedStampId, setSelectedPathId, setSelectedLabelId]);

  // Synchronize canvas whenever layers, atmosphere, topography, or global appearance changes
  useEffect(() => {
    requestRedraw();
  }, [layers, atmosphere, topographicalView, gridConfig, waterDeepColor, waterShallowColor, requestRedraw]);

  // --- Initialize Offscreen Canvases & Custom Assets ---
  useEffect(() => {
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

    applyTemplate('mythic_realm', false);
  }, []);

  // Custom Asset Handlers
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
    (asset: StampAsset) => handleAddCustomAssets([asset]),
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

  // Custom Biome Handlers
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

  // --- Finalize Active Path Draft ---
  const finalizeActivePath = useCallback(() => {
    if (!activePathDraft || activePathDraft.points.length === 0) {
      setActivePathDraft(null);
      return;
    }

    let finalPoints = activePathDraft.points;
    if (finalPoints.length === 1) {
      finalPoints = [
        finalPoints[0],
        { x: finalPoints[0].x + 4, y: finalPoints[0].y + 4 },
      ];
    }

    if (
      activePathStyle === 'river' &&
      brushSettings.riverCarveGorge &&
      elevationCanvasRef.current
    ) {
      carveRiverGorge(finalPoints, elevationCanvasRef.current, 8, activePathDraft.width * 2.5);
    }

    const newPath: PlacedPath = {
      id: `path_${Date.now()}`,
      style: activePathStyle,
      points: finalPoints,
      width: activePathDraft.width,
      color: activePathDraft.color,
      textureId: activePathDraft.textureId || pathTextureId,
      restrictToLand: activePathDraft.restrictToLand ?? pathRestrictToLand,
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

    handleCommitPath(newPath, pathAutoMerge);
  }, [
    activePathDraft,
    activePathStyle,
    brushSettings.riverCarveGorge,
    pathTextureId,
    pathRestrictToLand,
    pathAutoMerge,
    pathTaper,
    pathDoubleLine,
    handleCommitPath,
    setActivePathDraft,
  ]);

  // --- Template Loader ---
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
      mCtx.fillStyle = '#ffffff';
      mCtx.beginPath();
      mCtx.ellipse(460, 480, 320, 240, -0.08, 0, Math.PI * 2);
      mCtx.fill();

      mCtx.beginPath();
      mCtx.ellipse(430, 260, 240, 140, 0.1, 0, Math.PI * 2);
      mCtx.fill();

      mCtx.beginPath();
      mCtx.ellipse(840, 520, 220, 190, 0.25, 0, Math.PI * 2);
      mCtx.fill();

      mCtx.beginPath();
      mCtx.ellipse(320, 720, 140, 70, -0.2, 0, Math.PI * 2);
      mCtx.ellipse(620, 730, 120, 60, 0.1, 0, Math.PI * 2);
      mCtx.ellipse(920, 700, 100, 50, 0.3, 0, Math.PI * 2);
      mCtx.fill();

      mCtx.beginPath();
      mCtx.ellipse(140, 420, 80, 50, 0.4, 0, Math.PI * 2);
      mCtx.ellipse(180, 300, 60, 40, -0.2, 0, Math.PI * 2);
      mCtx.fill();

      tCtx.fillStyle = '#e8f2f8';
      tCtx.fillRect(0, 0, texture.width, 240);

      tCtx.fillStyle = '#4a7c3a';
      tCtx.fillRect(0, 240, 750, texture.height - 240);

      tCtx.fillStyle = '#264a25';
      tCtx.beginPath();
      tCtx.ellipse(420, 460, 160, 110, 0, 0, Math.PI * 2);
      tCtx.fill();

      tCtx.fillStyle = '#d4a259';
      tCtx.fillRect(750, 240, texture.width - 750, texture.height - 240);

      eCtx.fillStyle = '#808080';
      eCtx.beginPath();
      eCtx.ellipse(430, 360, 180, 60, -0.1, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.beginPath();
      eCtx.ellipse(780, 480, 120, 50, 0.3, 0, Math.PI * 2);
      eCtx.fill();
    }

    if (pushHistory) {
      pushHistorySnapshot(`Load ${tmpl.name}`, { stamps: newStamps, paths: newPaths, labels: newLabels });
    } else {
      pushHistorySnapshot('Initial Map State', { stamps: newStamps, paths: newPaths, labels: newLabels });
    }

    requestRedraw();
  };

  // --- Terrain Tools (Erosion, Topography, Map Outline Import) ---
  const handleHydraulicErosion = useCallback(() => {
    const elev = elevationCanvasRef.current;
    if (!elev) return;
    simulateHydraulicErosion(elev, 5000, 0.6);
    pushHistorySnapshot('Simulate Hydraulic Erosion');
    requestRedraw();
  }, [pushHistorySnapshot, requestRedraw]);

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

      const mPix = maskData.data;
      const totalPixels = maskData.width * maskData.height;
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

  // --- Outliner Batch & Single Actions ---
  const handleDeleteBatchFromTable = useCallback(
    (selection: { stampIds: string[]; pathIds: string[]; labelIds: string[] }) => {
      const stampSet = new Set(selection.stampIds);
      const pathSet = new Set(selection.pathIds);
      const labelSet = new Set(selection.labelIds);

      const updatedStamps = stampsRef.current.filter((s) => !stampSet.has(s.id));
      const updatedPaths = pathsRef.current.filter((p) => !pathSet.has(p.id));
      const updatedLabels = labelsRef.current.filter((l) => !labelSet.has(l.id));

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
      requestRedraw({
        stamps: updatedStamps,
        paths: updatedPaths,
        labels: updatedLabels,
      });
    },
    [selectedStampId, selectedPathId, selectedLabelId, pushHistorySnapshot, requestRedraw, setLabels, setPaths, setStamps, setSelectedStampId, setSelectedPathId, setSelectedLabelId]
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
    [zoom, dimensions, requestRedraw, setPan, setSelectedStampId, setSelectedPathId, setSelectedLabelId]
  );

  // --- Project JSON Save / Load & Restore Helpers ---
  const restoreProjectData = useCallback(
    (parsed: any) => {
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
    },
    [requestRedraw, setLayers, setLabels, setPaths, setStamps]
  );

  const handleSaveJson = useCallback(() => {
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
      stamps: stampsRef.current,
      paths: pathsRef.current,
      labels: labelsRef.current,
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
  }, [projectName, dimensions, waterDeepColor, waterShallowColor, layers, gridConfig, atmosphere, customAssets]);

  const handleLoadJson = useCallback(() => {
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
  }, [restoreProjectData, pushHistorySnapshot]);

  saveJsonRef.current = handleSaveJson;
  loadJsonRef.current = handleLoadJson;

  // --- 9. Autosave Domain Hook ---
  const getAutosavePayload = useCallback((): AutosavePayload | null => {
    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !elevation) return null;

    return {
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
  }, [projectName, dimensions, waterDeepColor, waterShallowColor, layers, gridConfig, atmosphere, customAssets]);

  const {
    isAutosaveEnabled,
    autosaveStatus,
    lastAutosaveTime,
    fsaFolderName,
    recoveryDraft,
    triggerAutosave,
    handleToggleAutosave,
    handleSelectFolder,
    handleRestoreRecoveryDraft,
  } = useAutosave({
    getAutosavePayload,
    onRestoreDraft: (rec) => restoreProjectData(rec.payload),
    isUserBusy: () => isPaintingRef.current || isErasingRef.current || isPanning,
  });

  // --- 10. Keyboard Shortcuts Hook ---
  const handleDeleteSelected = useCallback(() => {
    if (selectedStampId) {
      handleDeleteSelectedStamp();
    } else if (selectedLabelId) {
      handleDeleteSelectedLabel();
    } else if (selectedPathId) {
      handleDeleteSelectedPath();
    }
  }, [selectedStampId, selectedLabelId, selectedPathId, handleDeleteSelectedStamp, handleDeleteSelectedLabel, handleDeleteSelectedPath]);

  const handleClearSelection = useCallback(() => {
    setSelectedStampId(null);
    setSelectedLabelId(null);
    setSelectedPathId(null);
    setActivePathDraft(null);
    cancelTransform();
    requestRedraw();
  }, [setSelectedStampId, setSelectedLabelId, setSelectedPathId, setActivePathDraft, cancelTransform, requestRedraw]);

  const handleFlipSelectedStampX = useCallback(() => {
    if (!selectedStampId) return;
    const cur = stampsRef.current.find((s) => s.id === selectedStampId);
    if (!cur) return;
    handleUpdateSelectedStamp({ flipX: !cur.flipX });
    pushHistorySnapshot('Flip Stamp X');
  }, [selectedStampId, handleUpdateSelectedStamp, pushHistorySnapshot]);

  const handleFlipSelectedStampY = useCallback(() => {
    if (!selectedStampId) return;
    const cur = stampsRef.current.find((s) => s.id === selectedStampId);
    if (!cur) return;
    handleUpdateSelectedStamp({ flipY: !cur.flipY });
    pushHistorySnapshot('Flip Stamp Y');
  }, [selectedStampId, handleUpdateSelectedStamp, pushHistorySnapshot]);

  useKeyboardShortcuts({
    setActiveTool,
    setIsAssetOutlinerOpen,
    handleUndo,
    handleRedo,
    handleSaveJson,
    handleLoadJson,
    onDeleteSelected: handleDeleteSelected,
    onClearSelection: handleClearSelection,
    onFlipSelectedX: handleFlipSelectedStampX,
    onFlipSelectedY: handleFlipSelectedStampY,
  });

  // --- Mouse & Pointer Events ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.spaceKey || e.altKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'mask' || activeTool === 'brush' || activeTool === 'elevation') {
      if (activeTool === 'brush') {
        const mode = brushSettings.mode;
        if ((mode === 'land' || mode === 'ocean' || mode === 'erase_land') && layers.landmass.locked) return;
        if (mode === 'biome' && layers.textures.locked) return;
      } else if (activeTool === 'elevation' && layers.elevation.locked) {
        return;
      }
      isPaintingRef.current = true;
      lastPaintPointRef.current = { x, y };
      paintBrushDab({
        x,
        y,
        activeTool,
        brushSettings,
        maskCanvas: maskCanvasRef.current,
        textureCanvas: textureCanvasRef.current,
        elevationCanvas: elevationCanvasRef.current,
        customBiomes,
        onRequestRedraw: requestRedraw,
      });
      requestRedraw();
    } else if (activeTool === 'stamp') {
      if (!isStampsActive()) return;
      placeStampsAt(x, y, brushSettings);
      if (brushSettings.stampPlacementMode === 'ribbon') {
        lastStampPointRef.current = { x, y };
      }
    } else if (activeTool === 'path') {
      if (!isPathsActive()) return;

      let startPoint = { x, y };
      if (pathAutoMerge) {
        const SNAP_DIST = 28;
        for (const ep of pathsRef.current) {
          if (ep.points.length < 2) continue;
          const isBothRiver = activePathStyle === 'river' && ep.style === 'river';
          const isBothRoad = activePathStyle !== 'river' && ep.style !== 'river';
          if (!isBothRiver && !isBothRoad) continue;
          const epStart = ep.points[0];
          const epEnd = ep.points[ep.points.length - 1];
          if (Math.hypot(x - epEnd.x, y - epEnd.y) <= SNAP_DIST) {
            startPoint = { x: epEnd.x, y: epEnd.y };
            break;
          }
          if (Math.hypot(x - epStart.x, y - epStart.y) <= SNAP_DIST) {
            startPoint = { x: epStart.x, y: epStart.y };
            break;
          }
        }
      }

      if (
        activePathStyle === 'river' &&
        brushSettings.riverSnapDrainage &&
        elevationCanvasRef.current &&
        maskCanvasRef.current
      ) {
        const drainagePoints = computeHydrologicalDrainagePath(
          startPoint.x,
          startPoint.y,
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
          textureId: pathTextureId,
          restrictToLand: pathRestrictToLand,
          dashPattern: [],
          opacity: 0.95,
          smoothed: true,
          taper: pathTaper,
          doubleLine: pathDoubleLine,
        };
        handleCommitPath(newPath, pathAutoMerge);
        return;
      }

      setActivePathDraft({
        points: [startPoint],
        color: pathColor,
        width: pathWidth,
        style: activePathStyle,
        textureId: pathTextureId,
        restrictToLand: pathRestrictToLand,
        taper: pathTaper,
        doubleLine: pathDoubleLine,
      });
    } else if (activeTool === 'text') {
      if (!isLabelsActive()) return;
      handleAddLabel({
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
      });
      setSelectedStampId(null);
      setSelectedPathId(null);
    } else if (activeTool === 'select') {
      const stampsActive = isStampsActive();
      const labelsActive = isLabelsActive();
      const pathsActive = isPathsActive();

      // 1. If a stamp is selected, test handle drag or body move
      if (selectedStampId && stampsActive) {
        const curStamp = stampsRef.current.find((s) => s.id === selectedStampId);
        if (curStamp) {
          const handle = getStampHitHandle(x, y, curStamp);
          if (handle === 'rotate') {
            startTransform('rotate', {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              centerX: curStamp.x,
              centerY: curStamp.y,
              initialDist: Math.hypot(x - curStamp.x, y - curStamp.y),
              initialAngle: (Math.atan2(y - curStamp.y, x - curStamp.x) * 180) / Math.PI,
            });
            return;
          } else if (handle === 'scale') {
            startTransform('scale', {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              centerX: curStamp.x,
              centerY: curStamp.y,
              initialDist: Math.max(10, Math.hypot(x - curStamp.x, y - curStamp.y)),
              initialAngle: 0,
            });
            return;
          } else if (handle === 'move') {
            startTransform('move', {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              centerX: curStamp.x,
              centerY: curStamp.y,
              initialDist: 0,
              initialAngle: 0,
            });
            return;
          }
        }
      }

      // 2. If a label is selected, test drag-move
      if (selectedLabelId && labelsActive) {
        const curLabel = labelsRef.current.find((l) => l.id === selectedLabelId);
        if (curLabel && isPointInLabel(x, y, curLabel)) {
          startTransform('move', {
            startX: x,
            startY: y,
            initialElement: { ...curLabel },
            centerX: curLabel.x,
            centerY: curLabel.y,
            initialDist: 0,
            initialAngle: 0,
          });
          return;
        }
      }

      // 3. Hit-test any stamp
      if (stampsActive) {
        const clickedStamp = getStampsFrontToBack(stampsRef.current).find((s) => isPointInStamp(x, y, s));
        if (clickedStamp) {
          setSelectedStampId(clickedStamp.id);
          setSelectedLabelId(null);
          setSelectedPathId(null);
          startTransform('move', {
            startX: x,
            startY: y,
            initialElement: { ...clickedStamp },
            centerX: clickedStamp.x,
            centerY: clickedStamp.y,
            initialDist: 0,
            initialAngle: 0,
          });
          requestRedraw();
          return;
        }
      }

      // 4. Hit-test any label
      if (labelsActive) {
        const clickedLabel = [...labelsRef.current].reverse().find((l) => isPointInLabel(x, y, l));
        if (clickedLabel) {
          setSelectedLabelId(clickedLabel.id);
          setSelectedStampId(null);
          setSelectedPathId(null);
          startTransform('move', {
            startX: x,
            startY: y,
            initialElement: { ...clickedLabel },
            centerX: clickedLabel.x,
            centerY: clickedLabel.y,
            initialDist: 0,
            initialAngle: 0,
          });
          requestRedraw();
          return;
        }
      }

      // 5. Hit-test any path
      if (pathsActive) {
        const clickedPath = [...pathsRef.current].reverse().find((p) => isPointNearPath(x, y, p, 24));
        if (clickedPath) {
          setSelectedPathId(clickedPath.id);
          setSelectedStampId(null);
          setSelectedLabelId(null);
          requestRedraw();
          return;
        }
      }

      // Clear selection if empty space clicked
      setSelectedStampId(null);
      setSelectedLabelId(null);
      setSelectedPathId(null);
      requestRedraw();
    } else if (activeTool === 'eraser') {
      isErasingRef.current = true;
      eraseElementsAt(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);
    setCursorPos(coords);

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (activeTool === 'select') {
      const handled = handleTransformMove(coords);
      if (handled) return;
    }

    if (activeTool === 'eraser' && isErasingRef.current) {
      eraseElementsAt(coords.x, coords.y);
    } else if (activeTool === 'stamp' && lastStampPointRef.current && brushSettings.stampPlacementMode === 'ribbon') {
      const spacing = brushSettings.ribbonSpacing || 35;
      const dist = Math.hypot(coords.x - lastStampPointRef.current.x, coords.y - lastStampPointRef.current.y);
      if (dist >= spacing) {
        placeStampsAt(coords.x, coords.y, brushSettings);
        lastStampPointRef.current = coords;
      }
    } else if (isPaintingRef.current && lastPaintPointRef.current) {
      paintStroke(
        lastPaintPointRef.current.x,
        lastPaintPointRef.current.y,
        coords.x,
        coords.y,
        {
          activeTool,
          brushSettings,
          maskCanvas: maskCanvasRef.current,
          textureCanvas: textureCanvasRef.current,
          elevationCanvas: elevationCanvasRef.current,
          customBiomes,
          onRequestRedraw: requestRedraw,
        }
      );
      lastPaintPointRef.current = coords;
      requestRedraw();
    } else if (activePathDraft) {
      let nextPt = coords;
      if (pathAutoMerge) {
        const SNAP_DIST = 28;
        for (const ep of pathsRef.current) {
          if (ep.points.length < 2) continue;
          const isBothRiver = activePathStyle === 'river' && ep.style === 'river';
          const isBothRoad = activePathStyle !== 'river' && ep.style !== 'river';
          if (!isBothRiver && !isBothRoad) continue;
          const epStart = ep.points[0];
          const epEnd = ep.points[ep.points.length - 1];
          if (Math.hypot(coords.x - epEnd.x, coords.y - epEnd.y) <= SNAP_DIST) {
            nextPt = { x: epEnd.x, y: epEnd.y };
            break;
          }
          if (Math.hypot(coords.x - epStart.x, coords.y - epStart.y) <= SNAP_DIST) {
            nextPt = { x: epStart.x, y: epStart.y };
            break;
          }
        }
      }
      setActivePathDraft((prev) => (prev ? { ...prev, points: [...prev.points, nextPt] } : null));
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    finishTransform();

    if (lastStampPointRef.current) {
      lastStampPointRef.current = null;
    }

    if (isErasingRef.current) {
      finishErasing();
    }

    if (isPaintingRef.current) {
      isPaintingRef.current = false;
      lastPaintPointRef.current = null;
      pushHistorySnapshot(`Paint ${activeTool}`);
    } else if (activePathDraft) {
      finalizeActivePath();
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoom((prev) => Math.max(0.2, Math.min(3.5, prev + zoomDelta)));
  };

  // --- High-Resolution & Heightmap Export ---
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
      const eCtx = elevation.getContext('2d')!;
      const imgData = eCtx.getImageData(0, 0, dimensions.width, dimensions.height);
      const matrix: number[][] = [];
      const step = 8;
      for (let y = 0; y < dimensions.height; y += step) {
        const row: number[] = [];
        for (let x = 0; x < dimensions.width; x += step) {
          const idx = (y * dimensions.width + x) * 4;
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
          stamps: stampsRef.current,
          paths: pathsRef.current,
          labels: labelsRef.current,
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

  const selectedAsset =
    [...DEFAULT_STAMP_ASSETS, ...customAssets].find((a) => a.id === brushSettings.selectedStampId) ||
    customAssets[0] ||
    null;

  const selectedStamp = isStampsActive() ? stamps.find((s) => s.id === selectedStampId) || null : null;
  const selectedLabel = isLabelsActive() ? labels.find((l) => l.id === selectedLabelId) || null : null;
  const selectedPath = isPathsActive() ? paths.find((p) => p.id === selectedPathId) || null : null;
  const activeBiome = (brushSettings.selectedBiome as BiomePreset) || 'lush_grass';

  return (
    <div id="cartomancer-app" className="h-screen w-screen flex flex-col bg-[#FDF6E3] overflow-hidden font-sans select-none">
      {/* 1. Top Navigation Bar */}
      <Navbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canUndo={undoCount > 0}
        canRedo={redoCount > 0}
        undoCount={undoCount}
        redoCount={redoCount}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={resetZoom}
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
        onLinkFsaFolder={handleSelectFolder}
        onUnlinkFsaFolder={() => handleToggleAutosave(false)}
        onTriggerAutosave={triggerAutosave}
        onRestoreAutosave={handleRestoreRecoveryDraft}
        hasRecoveryDraft={Boolean(recoveryDraft)}
      />

      {/* 2. Main Center Workspace */}
      <div className="flex-1 flex overflow-hidden relative">
        <ToolPalette
          activeTool={activeTool}
          isToolSettingsOpen={isToolSettingsOpen}
          onSelectTool={(tool) => {
            if (tool === activeTool) {
              setIsToolSettingsOpen((prev) => !prev);
            } else {
              setActiveTool(tool);
              setIsToolSettingsOpen(true);
            }
          }}
          onOpenAssetOutliner={() => setIsAssetOutlinerOpen(true)}
          assetCount={stamps.length + paths.length + labels.length}
        />

        {isToolSettingsOpen && (
          <ToolSettingsPanel
            activeTool={activeTool}
            onClose={() => setIsToolSettingsOpen(false)}
            brushSettings={brushSettings}
            onUpdateBrushSettings={(newSet) => setBrushSettings((prev) => ({ ...prev, ...newSet }))}
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
            pathWidth={pathWidth}
            onPathWidthChange={(w) => {
              setPathWidth(w);
              setBrushSettings((prev) => ({ ...prev, size: w }));
            }}
            pathColor={pathColor}
            onPathColorChange={setPathColor}
            pathTaper={pathTaper}
            onPathTaperChange={setPathTaper}
            pathDoubleLine={pathDoubleLine}
            onPathDoubleLineChange={setPathDoubleLine}
            pathTextureId={pathTextureId}
            onPathTextureIdChange={setPathTextureId}
            pathRestrictToLand={pathRestrictToLand}
            onPathRestrictToLandChange={setPathRestrictToLand}
            pathAutoMerge={pathAutoMerge}
            onPathAutoMergeChange={setPathAutoMerge}
            onUpdateSelectedPath={handleUpdateSelectedPath}
            activePathDraft={activePathDraft}
            onFinishActivePath={finalizeActivePath}
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
            onSelectBiome={(biome) => setBrushSettings((prev) => ({ ...prev, selectedBiome: biome }))}
            customBiomes={customBiomes}
            onOpenShaderLab={() => setIsShaderLabOpen(true)}
          />
        )}

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

        <LayersPanel
          isOpen={isLayersPanelOpen}
          onClose={() => setIsLayersPanelOpen(false)}
          layers={layers}
          onUpdateLayer={updateLayer}
          stampCount={stamps.length}
          pathCount={paths.length}
          labelCount={labels.length}
          atmosphere={atmosphere}
          onAtmosphereChange={(newAtm) => {
            const updated = { ...atmosphere, ...newAtm };
            setAtmosphere(updated);
            requestRedraw({ atmosphere: updated });
          }}
        />
      </div>

      {/* 3. Modals */}
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
        onDeleteStamp={handleDeleteStampById}
        onDeletePath={handleDeletePathById}
        onDeleteLabel={handleDeleteLabelById}
        onDeleteBatch={handleDeleteBatchFromTable}
      />
    </div>
  );
}
