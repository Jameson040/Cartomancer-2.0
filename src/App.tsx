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
  PlacedTerritory,
  PlacedText,
  ReferenceMapConfig,
  ImportedMapLayer,
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
import { createProjectFile, CURRENT_PROJECT_VERSION, normalizeProjectFile } from './utils/projectFormat';
import { ParchmentFilterOptions } from './utils/cannyEdgeFilter';
import { CanvasRenderer } from './utils/canvasRenderer';
import { isPointInPolygon } from './utils/rendering/renderTerritories';
import {
  DEFAULT_WORLD_ELEVATION,
  deriveTopographyFromDrawnMap,
  bakeTopographyToCanvas,
  computeHydrologicalDrainagePath,
  carveRiverGorge,
} from './utils/elevationModel';
import { simulateHydraulicErosion } from './utils/proceduralNoise';

import { createHeightField, NumericHeightField, serializeHeightField, deserializeHeightField, sampleHeight, encodeHeight } from './utils/heightField';

import { paintBrushDab, paintStroke } from './utils/painting/strokePainter';
import { useLandmassShapes } from './hooks/useLandmassShapes';
import { LandmassShape } from './types';
import { isPointInStamp, getStampHitHandle, isPointInLabel, isPointNearPath, getStampsFrontToBack } from './utils/hitTesting';

// Custom Domain Hooks
import { useLayers, LayerGroupState } from './hooks/useLayers';
import { useViewport } from './hooks/useViewport';
import { useMapHistory } from './hooks/useMapHistory';
import { useStampManager } from './hooks/useStampManager';
import { usePathManager } from './hooks/usePathManager';
import { useTerritoryManager } from './hooks/useTerritoryManager';
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
import { CanvasContextBar } from './components/CanvasContextBar';
import { CanvasContextMenu } from './components/CanvasContextMenu';
import { MinimapNavigator } from './components/MinimapNavigator';
import { WorldAdvisorModal } from './components/WorldAdvisorModal';

const DEFAULT_DIMENSIONS: CanvasDimensions = { width: 2200, height: 1400 };

const safeProjectFilename = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'cartomancer_map';

export default function App() {
  // --- Project Configuration ---
  const [projectName, setProjectName] = useState('Realm of Eldoria');
  const [dimensions, setDimensions] = useState<CanvasDimensions>(DEFAULT_DIMENSIONS);
  const [waterDeepColor, setWaterDeepColor] = useState('#1a365d');
  const [waterShallowColor, setWaterShallowColor] = useState('#2b6cb0');
  const [topographicalView, setTopographicalView] = useState(false);
  const [elevationConfig, setElevationConfig] = useState<WorldElevationConfig>(DEFAULT_WORLD_ELEVATION);

  // --- Tactical Grid, Compass Rose, Scale Bar & Atmosphere ---
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    type: 'none',
    size: 48,
    color: '#ffffff',
    opacity: 0.25,
    lineWidth: 1.5,
    labels: false,
    showCompassRose: true,
    compassCorner: 'top-right',
    showScaleBar: true,
    scaleBarDistance: 200,
    scaleBarUnit: 'miles',
    showMapBorder: false,
  });

  const [atmosphere, setAtmosphere] = useState<AtmosphereFilter>({
    preset: 'vintage_parchment',
    timeOfDay: 'golden_hour',
    lightIntensity: 0.8,
    seasonFill: 'none',
    seasonDensity: 0.5,
    seasonParticleSize: 2,
    vignette: 0.35,
    warmth: 0.1,
    contrast: 1.05,
    brightness: 1.0,
  });

  // --- Tool & Brush Settings ---
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [isToolSettingsOpen, setIsToolSettingsOpen] = useState(true);
  const [numericHeightfieldEnabled, setNumericHeightfieldEnabled] = useState(false);
  const [showHeightfieldOverlay, setShowHeightfieldOverlay] = useState(false);
  const heightFieldRef = useRef<NumericHeightField | null>(null);
  const [brushSettings, setBrushSettings] = useState<BrushSettings>({
    size: 60,
    density: 0.6,
    softness: 0.5,
    elevation: 20,
    maskMode: 'add_land',
    selectedBiome: 'lush_grass',
    textureTargetDomain: 'auto',
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
    stampEraserDensity: 100,
    pathRestrictToLand: true,
    pathAutoMerge: true,
    pathTextureId: 'river_water',
    territoryFillColor: '#f59e0b',
    territoryFillOpacity: 0.18,
    territoryBorderColor: '#b45309',
    territoryBorderWidth: 3,
    territoryBorderStyle: 'dashed',
    territoryInnerGlowWidth: 22,
    territoryInnerGlowOpacity: 0.35,
    territoryName: 'Kingdom of Eldoria',
  });

  // Path Tool specific
  const [activePathStyle, setActivePathStyle] = useState<PathStyle>('river');
  const [pathWidth, setPathWidth] = useState(8);
  const [pathColor, setPathColor] = useState('#38bdf8');
  const [pathTaper, setPathTaper] = useState(true);
  const [pathDoubleLine, setPathDoubleLine] = useState(false);
  const [pathTextureId, setPathTextureId] = useState<string>('river_water');
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
  const [importedMapLayer, setImportedMapLayer] = useState<ImportedMapLayer | null>(null);
  const [stampCategoryVisibility, setStampCategoryVisibility] = useState<Record<string, boolean>>({});
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
  const [isWorldAdvisorOpen, setIsWorldAdvisorOpen] = useState(false);
  const [minimapTick, setMinimapTick] = useState(0);

  // Canvas & Fast DOM Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const mapStageRef = useRef<HTMLDivElement>(null);
  const brushPreviewRef = useRef<HTMLDivElement>(null);
  const hudCoordsRef = useRef<HTMLSpanElement>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waterTextureCanvasRef = useRef<HTMLCanvasElement | null>(null);
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
  const territoriesRef = useRef<PlacedTerritory[]>([]);
  const selectedStampIdRef = useRef<string | null>(null);
  const selectedPathIdRef = useRef<string | null>(null);
  const selectedLabelIdRef = useRef<string | null>(null);
  const selectedTerritoryIdRef = useRef<string | null>(null);
  const [selectedStampIds, setSelectedStampIds] = useState<string[]>([]);
  const [marquee, setMarquee] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [isEyedropperActive, setIsEyedropperActive] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const marqueeRef = useRef<typeof marquee>(null);
  const activePathDraftRef = useRef<any | null>(null);
  const territoryVerticesRef = useRef<{ x: number; y: number }[]>([]);
  const cursorPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pathNodeDragRef = useRef<{ pathId: string; pointIndex: number; moved: boolean } | null>(null);
  const landmassShapes = useLandmassShapes();

  // --- Redraw Coordinator ---
  const requestRedraw = useCallback(
    (explicitOverrides?: {
      stamps?: PlacedStamp[];
      paths?: PlacedPath[];
      labels?: PlacedText[];
      territories?: PlacedTerritory[];
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

      const allStampAssets = [...DEFAULT_STAMP_ASSETS, ...customAssets];
      const stampsToRender = (explicitOverrides?.stamps ?? stampsRef.current).filter((stamp) => {
        const asset = allStampAssets.find((candidate) => candidate.id === stamp.assetId);
        return !asset?.category || stampCategoryVisibility[asset.category] !== false;
      });

      CanvasRenderer.render({
        ctx,
        width: dimensions.width,
        height: dimensions.height,
        maskCanvas: mask,
        textureCanvas: texture,
        waterTextureCanvas: waterTextureCanvasRef.current!,
        elevationCanvas: elevation,
        heightField: numericHeightfieldEnabled ? heightFieldRef.current : null,
        showHeightfieldOverlay,
        stamps: stampsToRender,
        paths: explicitOverrides?.paths ?? pathsRef.current,
        labels: explicitOverrides?.labels ?? labelsRef.current,
        territories: explicitOverrides?.territories ?? territoriesRef.current,
        customAssets,
        layers: activeLayers,
        grid: gridConfig,
        atmosphere: activeAtmosphere,
        waterDeepColor,
        waterShallowColor,
        coastlineRipples: brushSettings.coastlineRipples,
        coastlineColor: brushSettings.coastlineColor,
        coastlineHatching: brushSettings.coastlineHatching,
        autoBeaching: brushSettings.autoBeaching,
        showContourLines: brushSettings.showContourLines,
        contourInterval: brushSettings.contourInterval,
        elevationConfig,
        topographicalView: activeTopographical,
        selectedStampId: isStampsActive() ? selectedStampIdRef.current : null,
        selectedStampIds: isStampsActive() ? selectedStampIds : [],
        selectedLabelId: isLabelsActive() ? selectedLabelIdRef.current : null,
        selectedPathId: isPathsActive() ? selectedPathIdRef.current : null,
        selectedTerritoryId: isPathsActive() ? selectedTerritoryIdRef.current : null,
        activePathDraft: activePathDraftRef.current,
        activeTerritoryDraft:
          activeTool === 'territory' && territoryVerticesRef.current.length > 0
            ? {
                points: territoryVerticesRef.current,
                cursorPos: cursorPosRef.current,
                fillColor: brushSettings.territoryFillColor || '#f59e0b',
                borderColor: brushSettings.territoryBorderColor || '#b45309',
              }
            : null,
        referenceMap,
        importedMapLayer,
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
      brushSettings.coastlineHatching,
      brushSettings.autoBeaching,
      brushSettings.showContourLines,
      brushSettings.contourInterval,
      brushSettings.territoryFillColor,
      brushSettings.territoryBorderColor,
      elevationConfig,
      topographicalView,
      numericHeightfieldEnabled,
      showHeightfieldOverlay,
      isStampsActive,
      selectedStampIds,
      isLabelsActive,
      isPathsActive,
      activeTool,
      referenceMap,
      importedMapLayer,
      stampCategoryVisibility,
    ]
  );

  // --- 2. Viewport Hook (with Alt+Wheel & Shift+Wheel Canvas Hotkeys) ---
  const handleModifierWheel = useCallback(
    (e: WheelEvent): boolean => {
      const stepDir = e.deltaY < 0 ? 1 : -1;
      if (e.altKey) {
        // Alt + Wheel: Resize selected stamp/label, or resize active stamp/brush
        if (activeTool === 'select' && selectedStampIdRef.current) {
          const cur = stampsRef.current.find((s) => s.id === selectedStampIdRef.current);
          if (cur && !cur.locked) {
            const nextScale = Math.max(0.15, Math.min(5.0, Number(((cur.scale ?? 1.0) + stepDir * 0.08).toFixed(2))));
            const targetIds = selectedStampIds.length > 1 ? new Set(selectedStampIds) : new Set([cur.id]);
            const updated = stampsRef.current.map((s) =>
              targetIds.has(s.id) && !s.locked ? { ...s, scale: nextScale } : s
            );
            stampsRef.current = updated;
            setStamps(updated);
            requestRedraw({ stamps: updated });
            return true;
          }
        }
        if (activeTool === 'stamp') {
          setBrushSettings((prev) => ({
            ...prev,
            stampScale: Math.max(0.15, Math.min(5.0, Number(((prev.stampScale ?? 1.0) + stepDir * 0.08).toFixed(2)))),
          }));
          return true;
        }
        if (['mask', 'brush', 'elevation', 'eraser'].includes(activeTool)) {
          setBrushSettings((prev) => ({
            ...prev,
            size: Math.max(8, Math.min(200, Math.round((prev.size ?? 40) + stepDir * 6))),
          }));
          return true;
        }
      }

      if (e.shiftKey) {
        // Shift + Wheel: Rotate selected stamp/label, or rotate active stamp brush
        if (activeTool === 'select' && selectedStampIdRef.current) {
          const cur = stampsRef.current.find((s) => s.id === selectedStampIdRef.current);
          if (cur && !cur.locked) {
            const nextRot = ((cur.rotation ?? 0) + stepDir * 10 + 360) % 360;
            const targetIds = selectedStampIds.length > 1 ? new Set(selectedStampIds) : new Set([cur.id]);
            const updated = stampsRef.current.map((s) =>
              targetIds.has(s.id) && !s.locked ? { ...s, rotation: nextRot } : s
            );
            stampsRef.current = updated;
            setStamps(updated);
            requestRedraw({ stamps: updated });
            return true;
          }
        }
        if (activeTool === 'select' && selectedLabelIdRef.current) {
          const cur = labelsRef.current.find((l) => l.id === selectedLabelIdRef.current);
          if (cur) {
            const nextRot = ((cur.rotation ?? 0) + stepDir * 5 + 360) % 360;
            const updated = labelsRef.current.map((l) => (l.id === cur.id ? { ...l, rotation: nextRot } : l));
            labelsRef.current = updated;
            setLabels(updated);
            requestRedraw({ labels: updated });
            return true;
          }
        }
        if (activeTool === 'stamp') {
          setBrushSettings((prev) => ({
            ...prev,
            stampRotation: (((prev.stampRotation ?? 0) + stepDir * 10 + 180) % 360) - 180,
          }));
          return true;
        }
      }
      return false;
    },
    [activeTool, selectedStampIds, requestRedraw]
  );

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
    isSpacePressed,
    getCanvasCoords,
    zoomTo,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
  } = useViewport({
    dimensions,
    mainCanvasRef,
    viewportRef,
    mapStageRef,
    onModifierWheel: handleModifierWheel,
  });

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
    waterTextureCanvasRef,
    elevationCanvasRef,
    stampsRef,
    pathsRef,
    labelsRef,
    territoriesRef,
    setStamps: (s) => setStamps(s),
    setPaths: (p) => setPaths(p),
    setLabels: (l) => setLabels(l),
    setTerritories: (t) => setTerritories(t),
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
    handleToggleLockSelectedStamp,
    handleGroupSelectedStamps,
    handleUngroupSelectedStamps,
    handleCopyStampStyle,
    handlePasteStampStyle,
    stampStyleClipboard,
  } = useStampManager({
    pushHistorySnapshot,
    requestRedraw,
    isStampsActive,
    selectedStampIds,
    setSelectedStampIds,
  });
  const hasStampStyleClipboard = Boolean(stampStyleClipboard);
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

  // --- 5B. Territory Manager Hook ---
  const {
    territories,
    territoriesRef: territoryRefHook,
    setTerritories,
    selectedTerritoryId,
    setSelectedTerritoryId,
    territoryVertices,
    addTerritoryVertex,
    undoTerritoryVertex: removeLastTerritoryVertex,
    cancelTerritoryDraft,
    commitTerritory: commitTerritoryPolygon,
    handleUpdateSelectedTerritory,
    handleDeleteSelectedTerritory,
    handleDuplicateSelectedTerritory,
  } = useTerritoryManager({
    pushHistorySnapshot,
    requestRedraw: (overrides) => requestRedraw(overrides),
  });
  territoriesRef.current = territories;
  selectedTerritoryIdRef.current = selectedTerritoryId;
  territoryVerticesRef.current = territoryVertices;

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
    selectedStampIds,
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
    territoriesRef,
    setStamps,
    setPaths,
    setLabels,
    setTerritories,
    selectedStampId,
    selectedPathId,
    selectedLabelId,
    selectedTerritoryId,
    setSelectedStampId,
    setSelectedPathId,
    setSelectedLabelId,
    setSelectedTerritoryId,
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
  }, [
    layers,
    atmosphere,
    topographicalView,
    gridConfig,
    waterDeepColor,
    waterShallowColor,
    selectedStampId,
    selectedPathId,
    selectedLabelId,
    requestRedraw,
  ]);

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
          requestRedraw();
        } else {
          imageManager.preloadDefaultAssets();
          requestRedraw();
        }
      })
      .catch(() => {
        imageManager.preloadDefaultAssets();
        requestRedraw();
      });

    const mask = document.createElement('canvas');
    mask.width = dimensions.width;
    mask.height = dimensions.height;
    maskCanvasRef.current = mask;

    const texture = document.createElement('canvas');
    texture.width = dimensions.width;
    texture.height = dimensions.height;
    textureCanvasRef.current = texture;

    const waterTexture = document.createElement('canvas');
    waterTexture.width = dimensions.width;
    waterTexture.height = dimensions.height;
    waterTextureCanvasRef.current = waterTexture;

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

    // Remove high-frequency pointer jitter before committing. The renderer
    // performs the visual curve interpolation; this keeps the editable path
    // itself clean and lightweight.
    let finalPoints = activePathDraft.points.filter((point, index, points) => {
      if (index === 0 || index === points.length - 1) return true;
      const previous = points[index - 1];
      return Math.hypot(point.x - previous.x, point.y - previous.y) >= 2.5;
    });
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
    const key = templateKey === 'blank' ? 'blank_canvas' : templateKey;
    const tmpl = TEMPLATES[key];
    if (!tmpl) return;

    if (tmpl.project.name) setProjectName(tmpl.project.name);
    if (tmpl.project.waterDeepColor) setWaterDeepColor(tmpl.project.waterDeepColor);
    if (tmpl.project.waterShallowColor) setWaterShallowColor(tmpl.project.waterShallowColor);

    setSelectedStampId(null);
    setSelectedStampIds([]);
    setSelectedLabelId(null);
    setSelectedPathId(null);
    setActivePathDraft(null);

    if (heightFieldRef.current) {
      heightFieldRef.current = createHeightField(dimensions.width, dimensions.height, 4, 0);
    }

    let newStamps = tmpl.project.stamps ? tmpl.project.stamps.map((s) => ({ ...s })) : [];
    let newPaths = tmpl.project.paths ? tmpl.project.paths.map((p) => ({ ...p, points: [...p.points] })) : [];
    let newLabels = tmpl.project.labels ? tmpl.project.labels.map((l) => ({ ...l })) : [];

    // The default realm is an interactive fixture, not an empty canvas. It
    // deliberately uses the repository's discovered PNG packs so every reload
    // exercises selection, depth sorting, paths, masking, and export.
    if (templateKey === 'mythic_realm') {
      const assetsByCategory = (category: string) =>
        DEFAULT_STAMP_ASSETS.filter((asset) => asset.category === category);
      const demoStamp = (category: string, index: number, x: number, y: number, scale: number, layer: number): PlacedStamp | null => {
        const asset = assetsByCategory(category)[index % Math.max(1, assetsByCategory(category).length)];
        if (!asset) return null;
        return {
          id: `demo_${category}_${index}`,
          assetId: asset.id,
          x,
          y,
          scale,
          rotation: ((index * 17) % 24) - 12,
          flipX: index % 3 === 0,
          flipY: false,
          opacity: 0.94,
          layer,
          createdAt: 1000 + index,
        };
      };

      const demoStamps = [
        ...Array.from({ length: 9 }, (_, i) => demoStamp('trees', i, 300 + (i % 3) * 90, 340 + Math.floor(i / 3) * 72, 0.30 + (i % 3) * 0.04, 1)),
        ...Array.from({ length: 3 }, (_, i) => demoStamp('swamps', i, 720 + (i % 3) * 55, 585, 0.36, 0)),
        ...Array.from({ length: 2 }, (_, i) => demoStamp('forts', i, 390 + i * 360, 270 + (i % 2) * 40, 0.42, 3)),
        ...Array.from({ length: 2 }, (_, i) => demoStamp('lakes', i, 300 + i * 360, 650, 0.42, 0)),
        ...Array.from({ length: 2 }, (_, i) => demoStamp('piers', i, 830 + i * 55, 470 + (i % 2) * 24, 0.38, 2)),
      ].filter((stamp): stamp is PlacedStamp => Boolean(stamp));
      newStamps = demoStamps;

      newPaths = [
        {
          id: 'demo_river_main', style: 'river', points: [{ x: 360, y: 170 }, { x: 420, y: 265 }, { x: 470, y: 370 }, { x: 550, y: 465 }, { x: 690, y: 540 }, { x: 850, y: 610 }], width: 10, color: '#38bdf8', textureId: 'river_water', opacity: 0.95, smoothed: true, taper: true, restrictToLand: true,
        },
        {
          id: 'demo_river_branch', style: 'river', points: [{ x: 690, y: 540 }, { x: 650, y: 475 }, { x: 620, y: 390 }, { x: 590, y: 315 }], width: 6, color: '#60a5fa', textureId: 'river_water', opacity: 0.9, smoothed: true, taper: true, restrictToLand: true,
        },
        {
          id: 'demo_road_north', style: 'road', points: [{ x: 315, y: 210 }, { x: 420, y: 265 }, { x: 550, y: 300 }, { x: 680, y: 300 }, { x: 850, y: 390 }], width: 7, color: '#a16207', textureId: 'dirt_road', opacity: 0.9, smoothed: true, taper: false, restrictToLand: true,
        },
        {
          id: 'demo_border', style: 'border', points: [{ x: 220, y: 300 }, { x: 430, y: 240 }, { x: 700, y: 270 }, { x: 930, y: 430 }, { x: 820, y: 680 }], width: 3, color: '#b45309', opacity: 0.7, smoothed: true, taper: false, restrictToLand: true, dashPattern: [8, 6],
        },
      ];

      const demoLabels: PlacedText[] = [
        { id: 'demo_label_realm', text: 'The Sundered Realm', x: 560, y: 115, fontSize: 34, scale: 1, fontFamily: "'Cinzel', serif", color: '#fef3c7', strokeColor: '#1e293b', strokeWidth: 4, rotation: 0, bannerStyle: 'royal_banner', boxColor: '#78350f', boxBorderColor: '#f59e0b', boxOpacity: 0.9, letterSpacing: 4, curvature: 0, stylePreset: 'regal_serif' },
        { id: 'demo_label_northwatch', text: 'Northwatch', x: 315, y: 175, fontSize: 18, scale: 1, fontFamily: "'Cinzel', serif", color: '#fef3c7', strokeColor: '#1e293b', strokeWidth: 3, rotation: -8, bannerStyle: 'stone_plaque', boxColor: '#334155', boxBorderColor: '#cbd5e1', boxOpacity: 0.88, letterSpacing: 2, curvature: 0, stylePreset: 'standard' },
        { id: 'demo_label_fen', text: 'The Low Fen', x: 760, y: 665, fontSize: 20, scale: 1, fontFamily: "'Cinzel', serif", color: '#ecfccb', strokeColor: '#1e293b', strokeWidth: 3, rotation: -5, bannerStyle: 'parchment_ribbon', boxColor: '#365314', boxBorderColor: '#bef264', boxOpacity: 0.82, letterSpacing: 3, curvature: 12, stylePreset: 'imperial_spaced' },
        { id: 'demo_label_river', text: 'Aurelian River', x: 565, y: 455, fontSize: 17, scale: 1, fontFamily: "'Cinzel', serif", color: '#e0f2fe', strokeColor: '#0c4a6e', strokeWidth: 3, rotation: 18, bannerStyle: 'none', letterSpacing: 2, curvature: 28, stylePreset: 'standard' },
      ];
      newLabels = demoLabels;
    }

    const mask = maskCanvasRef.current;
    const texture = textureCanvasRef.current;
    const waterTexture = waterTextureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !waterTexture || !elevation) return;

    // Proportionally scale 1400x900 template coordinates to current canvas dimensions
    const sx = mask.width / 1400;
    const sy = mask.height / 900;
    const sAvg = Math.sqrt(sx * sy);

    if (Math.abs(sx - 1) > 0.01 || Math.abs(sy - 1) > 0.01) {
      newStamps = newStamps.map((s) => ({
        ...s,
        x: Math.round(s.x * sx),
        y: Math.round(s.y * sy),
        scale: +(s.scale * sAvg).toFixed(2),
      }));
      newPaths = newPaths.map((p) => ({
        ...p,
        width: Math.max(2, Math.round(p.width * sAvg)),
        points: p.points.map((pt) => ({
          x: Math.round(pt.x * sx),
          y: Math.round(pt.y * sy),
        })),
      }));
      newLabels = newLabels.map((l) => ({
        ...l,
        x: Math.round(l.x * sx),
        y: Math.round(l.y * sy),
        fontSize: Math.round(l.fontSize * sAvg),
      }));
    }

    stampsRef.current = newStamps;
    pathsRef.current = newPaths;
    labelsRef.current = newLabels;

    setStamps(newStamps);
    setPaths(newPaths);
    setLabels(newLabels);

    const mCtx = mask.getContext('2d')!;
    const tCtx = texture.getContext('2d')!;
    const wtCtx = waterTexture.getContext('2d')!;
    const eCtx = elevation.getContext('2d')!;

    mCtx.clearRect(0, 0, mask.width, mask.height);
    tCtx.clearRect(0, 0, texture.width, texture.height);
    wtCtx.clearRect(0, 0, waterTexture.width, waterTexture.height);
    eCtx.clearRect(0, 0, elevation.width, elevation.height);

    if (templateKey === 'mythic_realm') {
      mCtx.save();
      mCtx.scale(sx, sy);
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
      mCtx.restore();

      tCtx.save();
      tCtx.scale(sx, sy);
      tCtx.fillStyle = '#e8f2f8';
      tCtx.fillRect(0, 0, 1400, 240);

      tCtx.fillStyle = '#4a7c3a';
      tCtx.fillRect(0, 240, 750, 900 - 240);

      tCtx.fillStyle = '#264a25';
      tCtx.beginPath();
      tCtx.ellipse(420, 460, 160, 110, 0, 0, Math.PI * 2);
      tCtx.fill();

      tCtx.fillStyle = '#d4a259';
      tCtx.fillRect(750, 240, 1400 - 750, 900 - 240);
      tCtx.restore();

      eCtx.save();
      eCtx.scale(sx, sy);
      eCtx.fillStyle = '#808080';
      eCtx.beginPath();
      eCtx.ellipse(430, 360, 180, 60, -0.1, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.beginPath();
      eCtx.ellipse(780, 480, 120, 50, 0.3, 0, Math.PI * 2);
      eCtx.fill();
      eCtx.restore();
    }

    CanvasRenderer.invalidateTerrainCache('all');

    if (pushHistory) {
      pushHistorySnapshot(`Load ${tmpl.name}`, { stamps: newStamps, paths: newPaths, labels: newLabels });
    } else {
      pushHistorySnapshot('Initial Map State', { stamps: newStamps, paths: newPaths, labels: newLabels });
    }

    requestRedraw();
    setMinimapTick((t) => t + 1);
  };

  // --- Non-Destructive Canvas Resolution Resizer ---
  const handleResizeCanvas = useCallback(
    (newWidth: number, newHeight: number) => {
      if (newWidth === dimensions.width && newHeight === dimensions.height) return;

      const oldW = dimensions.width;
      const oldH = dimensions.height;
      const sx = newWidth / oldW;
      const sy = newHeight / oldH;
      const sAvg = Math.sqrt(sx * sy);

      const scaleOffscreenCanvas = (canvas: HTMLCanvasElement | null) => {
        if (!canvas) return;
        const tmp = document.createElement('canvas');
        tmp.width = oldW;
        tmp.height = oldH;
        const tmpCtx = tmp.getContext('2d');
        if (tmpCtx) {
          tmpCtx.drawImage(canvas, 0, 0);
        }
        canvas.width = newWidth;
        canvas.height = newHeight;
        const ctx = canvas.getContext('2d');
        if (ctx && tmpCtx) {
          ctx.clearRect(0, 0, newWidth, newHeight);
          ctx.drawImage(tmp, 0, 0, oldW, oldH, 0, 0, newWidth, newHeight);
        }
      };

      scaleOffscreenCanvas(maskCanvasRef.current);
      scaleOffscreenCanvas(textureCanvasRef.current);
      scaleOffscreenCanvas(waterTextureCanvasRef.current);
      scaleOffscreenCanvas(elevationCanvasRef.current);

      if (mainCanvasRef.current) {
        mainCanvasRef.current.width = newWidth;
        mainCanvasRef.current.height = newHeight;
      }

      if (heightFieldRef.current) {
        heightFieldRef.current = createHeightField(newWidth, newHeight, 4, 0);
      }

      const scaledStamps = stampsRef.current.map((s) => ({
        ...s,
        x: Math.round(s.x * sx),
        y: Math.round(s.y * sy),
        scale: +(s.scale * sAvg).toFixed(2),
      }));

      const scaledPaths = pathsRef.current.map((p) => ({
        ...p,
        width: Math.max(2, Math.round(p.width * sAvg)),
        points: p.points.map((pt) => ({
          x: Math.round(pt.x * sx),
          y: Math.round(pt.y * sy),
        })),
      }));

      const scaledTerritories = territoriesRef.current.map((t) => ({
        ...t,
        points: t.points.map((pt) => ({
          x: Math.round(pt.x * sx),
          y: Math.round(pt.y * sy),
        })),
      }));

      const scaledLabels = labelsRef.current.map((l) => ({
        ...l,
        x: Math.round(l.x * sx),
        y: Math.round(l.y * sy),
        fontSize: Math.max(10, Math.round(l.fontSize * sAvg)),
      }));

      stampsRef.current = scaledStamps;
      pathsRef.current = scaledPaths;
      territoriesRef.current = scaledTerritories;
      labelsRef.current = scaledLabels;

      setStamps(scaledStamps);
      setPaths(scaledPaths);
      setTerritories(scaledTerritories);
      setLabels(scaledLabels);
      setDimensions({ width: newWidth, height: newHeight });

      CanvasRenderer.invalidateTerrainCache('all');
      resetHistory();
      setTimeout(() => {
        pushHistorySnapshot(`Resize Canvas to ${newWidth}×${newHeight}`, {
          stamps: scaledStamps,
          paths: scaledPaths,
          labels: scaledLabels,
          territories: scaledTerritories,
        });
        fitToScreen(undefined, undefined, { width: newWidth, height: newHeight });
        requestRedraw({
          stamps: scaledStamps,
          paths: scaledPaths,
          labels: scaledLabels,
          territories: scaledTerritories,
        });
        setMinimapTick((t) => t + 1);
      }, 0);
    },
    [dimensions, fitToScreen, pushHistorySnapshot, requestRedraw, resetHistory, setLabels, setPaths, setStamps, setTerritories]
  );

  // --- Terrain Tools (Erosion, Topography, Procedural World & River Basin) ---
  const handleHydraulicErosion = useCallback(() => {
    const elev = elevationCanvasRef.current;
    if (!elev) return;
    simulateHydraulicErosion(elev, 5000, 0.6);
    CanvasRenderer.invalidateTerrainCache('relief');
    pushHistorySnapshot('Simulate Hydraulic Erosion');
    requestRedraw();
    setMinimapTick((t) => t + 1);
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

    // Turn the derived suggestions into editable map objects. Existing generated
    // objects are preserved so running the tool is safe to repeat only once per
    // accepted operation and every river/route can still be edited afterward.
    const generatedPaths = [...derived.suggestedRivers, ...derived.suggestedRoutes].map((path, index) => ({
      ...path,
      id: `${path.id}_${index}`,
      restrictToLand: path.style === 'river' ? true : false,
    }));
    const settlementAssets = DEFAULT_STAMP_ASSETS.filter((asset) => asset.category === 'forts');
    const generatedSettlementStamps: PlacedStamp[] = derived.suggestedSettlements
      .map((settlement, index) => {
        const asset = settlementAssets[index % Math.max(1, settlementAssets.length)];
        if (!asset) return null;
        return {
          id: `suggested_settlement_stamp_${Date.now()}_${index}`,
          assetId: asset.id,
          x: settlement.x,
          y: settlement.y,
          scale: settlement.type === 'fortress' ? 0.62 : 0.48,
          rotation: (index * 11) % 18 - 9,
          flipX: index % 2 === 0,
          flipY: false,
          opacity: 0.95,
          layer: 3,
          createdAt: Date.now() + index,
        } as PlacedStamp;
      })
      .filter((stamp): stamp is PlacedStamp => Boolean(stamp));
    const generatedLabels: PlacedText[] = derived.suggestedSettlements.map((settlement, index) => ({
      id: `suggested_settlement_${Date.now()}_${index}`,
      text: settlement.name,
      x: settlement.x,
      y: settlement.y,
      fontSize: settlement.type === 'fortress' ? 16 : 13,
      scale: 1,
      fontFamily: "'Cinzel', serif",
      color: settlement.type === 'fortress' ? '#fef3c7' : '#422006',
      strokeColor: settlement.type === 'fortress' ? '#1e293b' : '#fef3c7',
      strokeWidth: 3,
      rotation: 0,
      bannerStyle: settlement.type === 'fortress' ? 'stone_plaque' : 'none',
      boxColor: settlement.type === 'fortress' ? '#334155' : undefined,
      boxBorderColor: settlement.type === 'fortress' ? '#f59e0b' : undefined,
      boxOpacity: settlement.type === 'fortress' ? 0.86 : undefined,
      letterSpacing: 1,
      curvature: 0,
      stylePreset: 'standard',
    }));
    const nextStamps = [...stampsRef.current, ...generatedSettlementStamps];
    const nextPaths = [...pathsRef.current, ...generatedPaths];
    const nextLabels = [...labelsRef.current, ...generatedLabels];
    stampsRef.current = nextStamps;
    pathsRef.current = nextPaths;
    labelsRef.current = nextLabels;
    setStamps(nextStamps);
    setPaths(nextPaths);
    setLabels(nextLabels);
    CanvasRenderer.invalidateTerrainCache('all');
    pushHistorySnapshot('Generate Terrain, Rivers & Settlements', {
      stamps: nextStamps,
      paths: nextPaths,
      labels: nextLabels,
    });
    requestRedraw({ stamps: nextStamps, paths: nextPaths, labels: nextLabels });
    setMinimapTick((t) => t + 1);
  }, [elevationConfig, pushHistorySnapshot, requestRedraw, setLabels, setPaths, setStamps]);

  // --- Merak-Inspired Procedural World, River Basin & Ecosystem Generators ---
  const handleGenerateProceduralWorld = useCallback(
    (preset: 'continent' | 'archipelago' | 'pangaea' | 'twin_realms') => {
      const mask = maskCanvasRef.current;
      const texture = textureCanvasRef.current;
      const elevation = elevationCanvasRef.current;
      if (!mask || !texture || !elevation) return;

      const w = mask.width;
      const h = mask.height;
      const mCtx = mask.getContext('2d')!;
      const tCtx = texture.getContext('2d')!;
      const eCtx = elevation.getContext('2d')!;

      mCtx.clearRect(0, 0, w, h);
      tCtx.clearRect(0, 0, w, h);
      eCtx.clearRect(0, 0, w, h);

      const seed = Math.random() * 1000;
      const blobs: { cx: number; cy: number; rx: number; ry: number }[] = [];

      if (preset === 'continent') {
        blobs.push(
          { cx: w * 0.48, cy: h * 0.48, rx: w * 0.28, ry: h * 0.28 },
          { cx: w * 0.36, cy: h * 0.34, rx: w * 0.18, ry: h * 0.18 },
          { cx: w * 0.62, cy: h * 0.58, rx: w * 0.2, ry: h * 0.2 },
          { cx: w * 0.24, cy: h * 0.66, rx: w * 0.09, ry: h * 0.08 }
        );
      } else if (preset === 'archipelago') {
        for (let i = 0; i < 11; i++) {
          const angle = (i / 11) * Math.PI * 2 + (seed % 1);
          const dist = (0.12 + (i % 3) * 0.11) * Math.min(w, h);
          blobs.push({
            cx: w * 0.5 + Math.cos(angle) * dist * 1.3,
            cy: h * 0.5 + Math.sin(angle) * dist,
            rx: w * (0.06 + (i % 4) * 0.025),
            ry: h * (0.06 + ((i + 1) % 4) * 0.025),
          });
        }
      } else if (preset === 'twin_realms') {
        blobs.push(
          { cx: w * 0.27, cy: h * 0.46, rx: w * 0.19, ry: h * 0.28 },
          { cx: w * 0.33, cy: h * 0.32, rx: w * 0.14, ry: h * 0.16 },
          { cx: w * 0.73, cy: h * 0.52, rx: w * 0.2, ry: h * 0.27 },
          { cx: w * 0.66, cy: h * 0.68, rx: w * 0.13, ry: h * 0.15 }
        );
      } else {
        // Pangaea with inner sea
        blobs.push(
          { cx: w * 0.5, cy: h * 0.28, rx: w * 0.34, ry: h * 0.17 },
          { cx: w * 0.3, cy: h * 0.52, rx: w * 0.18, ry: h * 0.26 },
          { cx: w * 0.7, cy: h * 0.52, rx: w * 0.18, ry: h * 0.26 },
          { cx: w * 0.5, cy: h * 0.74, rx: w * 0.3, ry: h * 0.15 }
        );
      }

      // Draw fractal polygon blobs onto mask and elevation
      for (let bIdx = 0; bIdx < blobs.length; bIdx++) {
        const b = blobs[bIdx];
        const steps = 42;
        mCtx.save();
        mCtx.fillStyle = '#ffffff';
        mCtx.beginPath();
        for (let s = 0; s < steps; s++) {
          const theta = (s / steps) * Math.PI * 2;
          const n1 = Math.sin(theta * 3 + seed + bIdx * 1.7) * 0.16;
          const n2 = Math.cos(theta * 7 - seed * 1.3 + bIdx) * 0.09;
          const n3 = Math.sin(theta * 13 + bIdx * 3.1) * 0.05;
          const factor = 1 + n1 + n2 + n3;
          const px = b.cx + Math.cos(theta) * b.rx * factor;
          const py = b.cy + Math.sin(theta) * b.ry * factor;
          if (s === 0) mCtx.moveTo(px, py);
          else mCtx.lineTo(px, py);
        }
        mCtx.closePath();
        mCtx.fill();
        mCtx.restore();

        // Mountain spine inside each major landmass
        const grad = eCtx.createRadialGradient(
          b.cx,
          b.cy,
          Math.min(b.rx, b.ry) * 0.08,
          b.cx,
          b.cy,
          Math.max(b.rx, b.ry) * 0.85
        );
        grad.addColorStop(0, 'rgba(215, 215, 215, 0.92)');
        grad.addColorStop(0.5, 'rgba(155, 155, 155, 0.65)');
        grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
        eCtx.fillStyle = grad;
        eCtx.beginPath();
        eCtx.arc(b.cx, b.cy, Math.max(b.rx, b.ry) * 0.85, 0, Math.PI * 2);
        eCtx.fill();
      }

      // Latitude-aware biome base fill on textureCanvas
      const latGrad = tCtx.createLinearGradient(0, 0, 0, h);
      latGrad.addColorStop(0, '#dce8f2');
      latGrad.addColorStop(0.18, '#3b6638');
      latGrad.addColorStop(0.52, '#5b8e3d');
      latGrad.addColorStop(0.78, '#c89d54');
      latGrad.addColorStop(1, '#4a7c3a');
      tCtx.fillStyle = latGrad;
      tCtx.fillRect(0, 0, w, h);

      CanvasRenderer.invalidateTerrainCache('all');
      pushHistorySnapshot(`Generate Procedural ${preset}`);
      requestRedraw();
      setMinimapTick((t) => t + 1);
    },
    [pushHistorySnapshot, requestRedraw]
  );

  const handleGenerateRiverBasin = useCallback(() => {
    const mask = maskCanvasRef.current;
    const elev = elevationCanvasRef.current;
    if (!mask || !elev) return;

    const mCtx = mask.getContext('2d', { willReadFrequently: true });
    if (!mCtx) return;
    const w = mask.width;
    const h = mask.height;
    const mData = mCtx.getImageData(0, 0, w, h).data;

    // Pick 3 inland source points on land and trace drainage paths to the sea
    const candidates: { x: number; y: number }[] = [];
    for (let attempt = 0; attempt < 90 && candidates.length < 3; attempt++) {
      const rx = Math.round(w * (0.2 + Math.random() * 0.6));
      const ry = Math.round(h * (0.2 + Math.random() * 0.6));
      const idx = (ry * w + rx) * 4;
      if (mData[idx + 3] > 120) {
        candidates.push({ x: rx, y: ry });
      }
    }

    const newRivers: PlacedPath[] = [];
    for (let i = 0; i < candidates.length; i++) {
      const src = candidates[i];
      const pts = computeHydrologicalDrainagePath(src.x, src.y, elev, mask);
      if (pts.length >= 3) {
        newRivers.push({
          id: `river_basin_${Date.now()}_${i}`,
          style: 'river',
          points: pts,
          width: 9,
          color: '#38bdf8',
          textureId: 'river_water',
          restrictToLand: true,
          dashPattern: [],
          opacity: 0.95,
          smoothed: true,
          taper: true,
          doubleLine: false,
        });
      }
    }

    if (newRivers.length > 0) {
      const nextPaths = [...pathsRef.current, ...newRivers];
      pathsRef.current = nextPaths;
      setPaths(nextPaths);
      pushHistorySnapshot('Spawn Source-to-Sea Rivers', { paths: nextPaths });
      requestRedraw({ paths: nextPaths });
      setMinimapTick((t) => t + 1);
    }
  }, [pushHistorySnapshot, requestRedraw, setPaths]);

  const handleAutoPopulateEcosystem = useCallback(() => {
    const mask = maskCanvasRef.current;
    const elev = elevationCanvasRef.current;
    if (!mask || !elev) return;

    const mCtx = mask.getContext('2d', { willReadFrequently: true });
    const eCtx = elev.getContext('2d', { willReadFrequently: true });
    if (!mCtx || !eCtx) return;

    const w = mask.width;
    const h = mask.height;
    const mData = mCtx.getImageData(0, 0, w, h).data;
    const eData = eCtx.getImageData(0, 0, w, h).data;

    const treeAssets = DEFAULT_STAMP_ASSETS.filter((a) => a.category === 'trees');
    const mountainAssets = DEFAULT_STAMP_ASSETS.filter((a) => a.category === 'mountains');
    const addedStamps: PlacedStamp[] = [];

    for (let i = 0; i < 65; i++) {
      const rx = Math.round(w * (0.1 + Math.random() * 0.8));
      const ry = Math.round(h * (0.1 + Math.random() * 0.8));
      const idx = (ry * w + rx) * 4;
      if (mData[idx + 3] < 160) continue;

      const elevByte = eData[idx + 3] > 10 ? eData[idx] : 140;
      const isPeak = elevByte > 168 && mountainAssets.length > 0;
      const pool = isPeak ? mountainAssets : treeAssets;
      if (pool.length === 0) continue;

      const asset = pool[Math.floor(Math.random() * pool.length)];
      addedStamps.push({
        id: `eco_${Date.now()}_${i}`,
        assetId: asset.id,
        x: rx,
        y: ry,
        scale: isPeak ? 0.42 + Math.random() * 0.16 : 0.28 + Math.random() * 0.12,
        rotation: Math.round((Math.random() - 0.5) * 14),
        flipX: Math.random() > 0.5,
        flipY: false,
        opacity: 0.95,
        layer: isPeak ? 2 : 1,
        createdAt: Date.now() + i,
      });
    }

    if (addedStamps.length > 0) {
      const nextStamps = [...stampsRef.current, ...addedStamps];
      stampsRef.current = nextStamps;
      setStamps(nextStamps);
      pushHistorySnapshot('Auto-Populate Biome Flora & Peaks', { stamps: nextStamps });
      requestRedraw({ stamps: nextStamps });
      setMinimapTick((t) => t + 1);
    }
  }, [pushHistorySnapshot, requestRedraw, setStamps]);

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

      CanvasRenderer.invalidateTerrainCache('all');
      pushHistorySnapshot('Import Map Outline');
      requestRedraw();
      setMinimapTick((t) => t + 1);
    },
    [pushHistorySnapshot, requestRedraw]
  );

  const handleToggleEyedropper = useCallback(() => {
    setIsEyedropperActive((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 'Escape') {
        if (isEyedropperActive) setIsEyedropperActive(false);
        setContextMenu(null);
        landmassShapes.cancelShapeDrag();
        landmassShapes.cancelPolygon();
        cancelTerritoryDraft();
        requestRedraw();
      } else if (e.key === 'Enter') {
        if (
          activeTool === 'mask' &&
          brushSettings.landmassShape === 'polygon' &&
          landmassShapes.polygonVertices.length >= 3
        ) {
          landmassShapes.commitPolygon(
            brushSettings.maskMode,
            brushSettings.landmassEdgeStyle || 'crisp',
            brushSettings.roughness ?? 0.35,
            maskCanvasRef.current,
            elevationCanvasRef.current,
            pushHistorySnapshot,
            requestRedraw
          );
        } else if (activeTool === 'territory' && territoryVertices.length >= 3) {
          commitTerritoryPolygon(brushSettings);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEyedropperActive, activeTool, brushSettings, landmassShapes, territoryVertices.length, commitTerritoryPolygon, cancelTerritoryDraft, pushHistorySnapshot, requestRedraw]);

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

  const handleCreateSampledTexture = useCallback((imageUrl: string, patternScale: number, target: 'land' | 'water') => {
    const id = `sampled_texture_${Date.now()}`;
    const sampledBiome: BiomeTexture = {
      id,
      name: `Sampled Texture ${customBiomes.length + 1}`,
      color: '#75846b',
      roughnessColor: '#4f5a49',
      detailType: target === 'water' ? 'water' : 'custom_pattern',
      defaultElevation: target === 'water' ? -5 : 10,
      isPattern: true,
      patternImageUrl: imageUrl,
      patternScale,
      isCustom: true,
    };
    imageManager.loadImage(imageUrl, id);
    handleAddCustomBiome(sampledBiome);
    setBrushSettings((previous) => ({ ...previous, selectedBiome: id, brushColorOverride: undefined }));
  }, [customBiomes.length]);

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
    (input: unknown) => {
      let parsed;
      try {
        parsed = normalizeProjectFile(input);
      } catch (error) {
        console.error('Failed to validate Cartomancer project', error);
        return;
      }

      if (parsed.project) {
        setProjectName(parsed.project.name || 'Imported Realm');
        if (parsed.project.waterDeepColor) setWaterDeepColor(parsed.project.waterDeepColor);
        if (parsed.project.waterShallowColor) setWaterShallowColor(parsed.project.waterShallowColor);
        if (parsed.project.elevationConfig) setElevationConfig(parsed.project.elevationConfig);
        if (parsed.project.referenceMap) {
          setReferenceMap(parsed.project.referenceMap);
          imageManager.loadImage(parsed.project.referenceMap.imageUrl);
        }
        if (parsed.project.importedMapLayer) {
          setImportedMapLayer(parsed.project.importedMapLayer);
          imageManager.loadImage(parsed.project.importedMapLayer.imageUrl);
        }
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
      if (parsed.heightFieldData && parsed.heightFieldMeta) {
        const restoredField = deserializeHeightField(parsed.heightFieldData, parsed.heightFieldMeta);
        if (restoredField) {
          heightFieldRef.current = restoredField;
          setNumericHeightfieldEnabled(true);
        }
      }

      const mask = maskCanvasRef.current;
      const texture = textureCanvasRef.current;
      const waterTexture = waterTextureCanvasRef.current;
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

      if (parsed.waterTextureDataUrl && waterTexture) {
        const wImg = new Image();
        wImg.onload = () => {
          const wCtx = waterTexture.getContext('2d')!;
          wCtx.clearRect(0, 0, waterTexture.width, waterTexture.height);
          wCtx.drawImage(wImg, 0, 0);
          requestRedraw();
        };
        wImg.src = parsed.waterTextureDataUrl;
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
    const waterTexture = waterTextureCanvasRef.current;
    const elevation = elevationCanvasRef.current;

    const projectData: MapProject = {
      version: CURRENT_PROJECT_VERSION,
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
      elevationConfig,
      referenceMap: referenceMap || undefined,
      importedMapLayer: importedMapLayer || undefined,
    };

    const fullExport = createProjectFile(projectData, {
      mask,
      texture,
      waterTexture,
      elevation,
      ...(numericHeightfieldEnabled && heightFieldRef.current ? {
        heightFieldData: serializeHeightField(heightFieldRef.current),
        heightFieldMeta: { cellSize: heightFieldRef.current.cellSize, width: heightFieldRef.current.width, height: heightFieldRef.current.height, seaLevel: heightFieldRef.current.seaLevel, minHeight: heightFieldRef.current.minHeight, maxHeight: heightFieldRef.current.maxHeight },
      } : {}),
    });

    const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeProjectFilename(projectName)}.cartomancer.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectName, dimensions, waterDeepColor, waterShallowColor, layers, gridConfig, atmosphere, customAssets, elevationConfig, referenceMap]);

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
    const waterTexture = waterTextureCanvasRef.current;
    const elevation = elevationCanvasRef.current;
    if (!mask || !texture || !waterTexture || !elevation) return null;

    return {
      project: {
        version: CURRENT_PROJECT_VERSION,
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
        elevationConfig,
        referenceMap: referenceMap || undefined,
      importedMapLayer: importedMapLayer || undefined,
      },
      maskDataUrl: mask.toDataURL(),
      textureDataUrl: texture.toDataURL(),
      waterTextureDataUrl: waterTexture.toDataURL(),
      ...(numericHeightfieldEnabled && heightFieldRef.current ? {
        heightFieldData: serializeHeightField(heightFieldRef.current),
        heightFieldMeta: { cellSize: heightFieldRef.current.cellSize, width: heightFieldRef.current.width, height: heightFieldRef.current.height, seaLevel: heightFieldRef.current.seaLevel, minHeight: heightFieldRef.current.minHeight, maxHeight: heightFieldRef.current.maxHeight },
      } : {}),
      elevationDataUrl: elevation.toDataURL(),
    };
  }, [projectName, dimensions, waterDeepColor, waterShallowColor, layers, gridConfig, atmosphere, customAssets, elevationConfig, referenceMap]);

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
    if (selectedStampIds.length > 1) {
      const selected = new Set(selectedStampIds);
      const remaining = stampsRef.current.filter((stamp) => !selected.has(stamp.id));
      setStamps(remaining);
      setSelectedStampIds([]);
      setSelectedStampId(null);
      pushHistorySnapshot('Delete Selected Stamps', { stamps: remaining });
      requestRedraw({ stamps: remaining });
    } else if (selectedStampId) {
      handleDeleteSelectedStamp();
      setSelectedStampIds([]);
    } else if (selectedLabelId) {
      handleDeleteSelectedLabel();
    } else if (selectedPathId) {
      handleDeleteSelectedPath();
    } else if (selectedTerritoryId) {
      handleDeleteSelectedTerritory();
    }
  }, [selectedStampIds, selectedStampId, selectedLabelId, selectedPathId, selectedTerritoryId, handleDeleteSelectedStamp, handleDeleteSelectedLabel, handleDeleteSelectedPath, handleDeleteSelectedTerritory, pushHistorySnapshot, requestRedraw, setStamps, setSelectedStampId]);

  const handleNudgeSelection = useCallback(
    (dx: number, dy: number, recordHistory: boolean) => {
      if (selectedStampIds.length > 0) {
        if (recordHistory) pushHistorySnapshot('Nudge Selected Stamps');
        const selected = new Set(selectedStampIds);
        const next = stampsRef.current.map((stamp) =>
          selected.has(stamp.id)
            ? { ...stamp, x: Math.round(stamp.x + dx), y: Math.round(stamp.y + dy) }
            : stamp
        );
        setStamps(next);
        requestRedraw({ stamps: next });
        return;
      }
      if (selectedStampId) {
        if (recordHistory) pushHistorySnapshot('Nudge Stamp');
        const next = stampsRef.current.map((stamp) =>
          stamp.id === selectedStampId
            ? { ...stamp, x: Math.round(stamp.x + dx), y: Math.round(stamp.y + dy) }
            : stamp
        );
        setStamps(next);
        requestRedraw({ stamps: next });
      }
    },
    [pushHistorySnapshot, requestRedraw, selectedStampId, selectedStampIds, setStamps]
  );

  const handleClearSelection = useCallback(() => {
    setSelectedStampId(null);
    setSelectedLabelId(null);
    setSelectedPathId(null);
    setActivePathDraft(null);
    landmassShapes.cancelShapeDrag();
    landmassShapes.cancelPolygon();
    cancelTransform();
    requestRedraw();
  }, [setSelectedStampId, setSelectedLabelId, setSelectedPathId, setActivePathDraft, landmassShapes, cancelTransform, requestRedraw]);

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
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onResetZoom: resetZoom,
    onFitToScreen: fitToScreen,
    onNudgeSelection: handleNudgeSelection,
  });

  // --- Mouse & Pointer Events ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || e.altKey || isSpacePressed) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button !== 0) return;
    const { x, y } = getCanvasCoords(e);

    // Color Eyedropper mode: sample pixel directly under click and deactivate
    if (isEyedropperActive) {
      const canvas = mainCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          const sampleX = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
          const sampleY = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
          const pixel = ctx.getImageData(sampleX, sampleY, 1, 1).data;
          const hex = `#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
          setBrushSettings((previous) => ({ ...previous, brushColorOverride: hex }));
        }
      }
      setIsEyedropperActive(false);
      return;
    }

    if (activeTool === 'mask') {
      if (layers.landmass.locked) return;
      const shape = brushSettings.landmassShape || 'brush';

      if (shape === 'polygon') {
        landmassShapes.addPolygonVertex(
          x,
          y,
          brushSettings.maskMode,
          brushSettings.landmassEdgeStyle || 'crisp',
          brushSettings.roughness ?? 0.35,
          maskCanvasRef.current,
          elevationCanvasRef.current,
          pushHistorySnapshot,
          requestRedraw
        );
        return;
      }

      if (shape !== 'brush') {
        landmassShapes.startShapeDrag(
          x,
          y,
          shape,
          brushSettings.maskMode,
          brushSettings.landmassEdgeStyle || 'crisp',
          brushSettings.roughness ?? 0.35
        );
        return;
      }
    }

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
        waterTextureCanvas: waterTextureCanvasRef.current,
        elevationCanvas: elevationCanvasRef.current,
        heightField: numericHeightfieldEnabled ? heightFieldRef.current : null,
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

      if (pathRestrictToLand && maskCanvasRef.current) {
        const maskCtx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
        if (maskCtx) {
          const px = Math.max(0, Math.min(maskCanvasRef.current.width - 1, Math.round(x)));
          const py = Math.max(0, Math.min(maskCanvasRef.current.height - 1, Math.round(y)));
          if (maskCtx.getImageData(px, py, 1, 1).data[3] < 40) return;
        }
      }

      let startPoint = { x, y };
      if (pathAutoMerge) {
        const SNAP_DIST = Math.max(24, Math.min(72, pathWidth * 2.5 + 20));
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
    } else if (activeTool === 'territory') {
      if (!isPathsActive()) return;
      addTerritoryVertex(x, y, brushSettings);
    } else if (activeTool === 'text') {
      if (!isLabelsActive()) return;
      const labelPreset = textPresetStyle === 'regal_serif'
        ? { fontSize: Math.max(activeFontSize, 30), fontFamily: "'Cinzel', serif", color: '#fef3c7', bannerStyle: 'royal_banner' as TextBannerStyle, letterSpacing: 3 }
        : textPresetStyle === 'imperial_spaced'
        ? { fontSize: Math.max(activeFontSize, 22), fontFamily: "'Cinzel', serif", color: '#fef3c7', bannerStyle: 'parchment_ribbon' as TextBannerStyle, letterSpacing: 6 }
        : { fontSize: activeFontSize, fontFamily: activeFontFamily, color: activeTextColor, bannerStyle: activeBannerStyle, letterSpacing: 2 };
      handleAddLabel({
        id: `label_${Date.now()}`,
        text: activeTextString.trim() || 'Uncharted Region',
        x,
        y,
        fontSize: labelPreset.fontSize,
        scale: 1.0,
        fontFamily: labelPreset.fontFamily,
        color: labelPreset.color,
        strokeColor: '#1e293b',
        strokeWidth: 3,
        rotation: 0,
        bannerStyle: labelPreset.bannerStyle,
        boxColor: '#fef3c7',
        boxBorderColor: '#92400e',
        boxOpacity: 0.88,
        letterSpacing: labelPreset.letterSpacing,
        curvature: textCurvature,
        stylePreset: textPresetStyle,
      });
      setSelectedStampId(null);
      setSelectedPathId(null);
      setSelectedTerritoryId(null);
    } else if (activeTool === 'select') {
      const stampsActive = isStampsActive();
      const labelsActive = isLabelsActive();
      const pathsActive = isPathsActive();

      // 1. If a path is selected, allow direct point editing before object hit tests.
      if (selectedPathId && pathsActive) {
        const selectedPath = pathsRef.current.find((p) => p.id === selectedPathId);
        if (selectedPath) {
          const pointIndex = selectedPath.points.findIndex(
            (point) => Math.hypot(point.x - x, point.y - y) <= 10
          );
          if (pointIndex >= 0) {
            pathNodeDragRef.current = { pathId: selectedPath.id, pointIndex, moved: false };
            return;
          }
          // Clicking near a segment inserts a real editable node, avoiding the
          // need to redraw an entire river just to adjust one bend.
          for (let i = 0; i < selectedPath.points.length - 1; i++) {
            const a = selectedPath.points[i];
            const b = selectedPath.points[i + 1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const length2 = dx * dx + dy * dy || 1;
            const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length2));
            const projected = { x: a.x + t * dx, y: a.y + t * dy };
            if (Math.hypot(projected.x - x, projected.y - y) <= 12) {
              pushHistorySnapshot('Insert Path Node');
              const inserted = { x: Math.round(projected.x), y: Math.round(projected.y) };
              const updated = pathsRef.current.map((path) => path.id === selectedPath.id
                ? { ...path, points: [...path.points.slice(0, i + 1), inserted, ...path.points.slice(i + 1)] }
                : path);
              pathsRef.current = updated;
              setPaths(updated);
              requestRedraw({ paths: updated });
              pathNodeDragRef.current = { pathId: selectedPath.id, pointIndex: i + 1, moved: false };
              return;
            }
          }
        }
      }

      // 2. If a stamp is selected, test handle drag or body move
      if (selectedStampId && stampsActive) {
        const curStamp = stampsRef.current.find((s) => s.id === selectedStampId);
        if (curStamp) {
          const transformGroup = selectedStampIds.length > 1
            ? stampsRef.current.filter((stamp) => selectedStampIds.includes(stamp.id))
            : [curStamp];
          const transformCenter = {
            x: transformGroup.reduce((sum, stamp) => sum + stamp.x, 0) / transformGroup.length,
            y: transformGroup.reduce((sum, stamp) => sum + stamp.y, 0) / transformGroup.length,
          };
          const handle = getStampHitHandle(x, y, curStamp);
          if (handle === 'rotate') {
            startTransform('rotate', {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              selectedStampIds: selectedStampIds.length > 0 ? selectedStampIds : [curStamp.id],
              centerX: transformCenter.x,
              centerY: transformCenter.y,
              initialDist: Math.hypot(x - transformCenter.x, y - transformCenter.y),
              initialAngle: (Math.atan2(y - transformCenter.y, x - transformCenter.x) * 180) / Math.PI,
            });
            return;
          } else if (handle === 'scale') {
            startTransform('scale', {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              selectedStampIds: selectedStampIds.length > 0 ? selectedStampIds : [curStamp.id],
              centerX: transformCenter.x,
              centerY: transformCenter.y,
              initialDist: Math.max(10, Math.hypot(x - transformCenter.x, y - transformCenter.y)),
              initialAngle: 0,
            });
            return;
          } else if (handle === 'move') {
            startTransform('move', {
              startX: x,
              startY: y,
              initialElement: { ...curStamp },
              selectedStampIds: selectedStampIds.length > 0 ? selectedStampIds : [curStamp.id],
              centerX: transformCenter.x,
              centerY: transformCenter.y,
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

      // 3. Hit-test labels first because labels are rendered above stamps.
      // Selection priority must match the visual composite order.
      if (labelsActive) {
        const clickedLabel = [...labelsRef.current].reverse().find((l) => isPointInLabel(x, y, l));
        if (clickedLabel) {
          setSelectedLabelId(clickedLabel.id);
          setSelectedStampId(null);
          setSelectedStampIds([]);
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

      // 4. Hit-test stamps in front-to-back order (supporting obscured stamps & multi-select)
      if (stampsActive) {
        const stampsAtPoint = getStampsFrontToBack(stampsRef.current).filter((s) => isPointInStamp(x, y, s));
        if (stampsAtPoint.length > 0) {
          if (e.shiftKey) {
            // Multi-Select Protocol:
            // If overlapping/obscured stamps exist, select any unselected stamp beneath
            const targetStamp = stampsAtPoint.find((s) => !selectedStampIds.includes(s.id));
            if (targetStamp) {
              setSelectedStampIds((current) => {
                const next = [...current, targetStamp.id];
                setSelectedStampId(targetStamp.id);
                return next;
              });
            } else {
              // All stamps at this position are selected: toggle topmost stamp off
              const topStamp = stampsAtPoint[0];
              setSelectedStampIds((current) => {
                const next = current.filter((id) => id !== topStamp.id);
                setSelectedStampId(next[next.length - 1] || null);
                return next;
              });
            }
            setSelectedLabelId(null);
            setSelectedPathId(null);
            requestRedraw();
            return;
          } else {
            const clickedStamp = stampsAtPoint[0];
            const isAlreadySelected = selectedStampIds.includes(clickedStamp.id);
            let nextGroupSelection = [clickedStamp.id];
            if (clickedStamp.groupId) {
              nextGroupSelection = stampsRef.current
                .filter((s) => s.groupId === clickedStamp.groupId)
                .map((s) => s.id);
            }
            if (!isAlreadySelected) {
              setSelectedStampIds(nextGroupSelection);
              setSelectedStampId(clickedStamp.id);
            } else {
              setSelectedStampId(clickedStamp.id);
            }
            setSelectedLabelId(null);
            setSelectedPathId(null);
            setSelectedTerritoryId(null);
            if (!clickedStamp.locked) {
              startTransform('move', {
                startX: x,
                startY: y,
                initialElement: { ...clickedStamp },
                selectedStampIds: isAlreadySelected && selectedStampIds.length > 1
                  ? selectedStampIds
                  : nextGroupSelection,
                centerX: clickedStamp.x,
                centerY: clickedStamp.y,
                initialDist: 0,
                initialAngle: 0,
              });
            }
            requestRedraw();
            return;
          }
        }
      }

      // If Shift key was pressed and empty canvas clicked, KEEP existing multi-selection
      if (e.shiftKey) {
        return;
      }

      // 5. Hit-test any path
      if (pathsActive) {
        const clickedPath = [...pathsRef.current].reverse().find((p) => isPointNearPath(x, y, p, 24));
        if (clickedPath) {
          setSelectedPathId(clickedPath.id);
          setSelectedStampId(null);
          setSelectedStampIds([]);
          setSelectedLabelId(null);
          setSelectedTerritoryId(null);
          requestRedraw();
          return;
        }

        // 5B. Hit-test any political territory polygon
        const clickedTerritory = [...territoriesRef.current]
          .reverse()
          .find((t) => isPointInPolygon(x, y, t.points));
        if (clickedTerritory) {
          setSelectedTerritoryId(clickedTerritory.id);
          setSelectedPathId(null);
          setSelectedStampId(null);
          setSelectedStampIds([]);
          setSelectedLabelId(null);
          requestRedraw();
          return;
        }
      }

      // Empty select-space starts a marquee instead of immediately losing the
      // user's ability to select nearby objects as a group.
      const viewportRect = viewportRef.current?.getBoundingClientRect();
      if (viewportRect && activeTool === 'select') {
        const startX = e.clientX - viewportRect.left;
        const startY = e.clientY - viewportRect.top;
        const nextMarquee = { startX, startY, currentX: startX, currentY: startY };
        marqueeRef.current = nextMarquee;
        setMarquee(nextMarquee);
      }

      // Clear selection if empty space clicked without Shift
      setSelectedStampId(null);
      setSelectedStampIds([]);
      setSelectedLabelId(null);
      setSelectedPathId(null);
      setSelectedTerritoryId(null);
      requestRedraw();
    } else if (activeTool === 'eraser') {
      isErasingRef.current = true;
      eraseElementsAt(x, y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const coords = getCanvasCoords(e);
    cursorPosRef.current = coords;

    // Fast DOM-direct updates for brush ring and HUD coordinates (zero React re-render lag)
    if (brushPreviewRef.current) {
      const r = brushSettings.size * zoom;
      brushPreviewRef.current.style.left = `${pan.x + coords.x * zoom - r}px`;
      brushPreviewRef.current.style.top = `${pan.y + coords.y * zoom - r}px`;
    }
    if (hudCoordsRef.current) {
      hudCoordsRef.current.textContent = `X: ${coords.x} · Y: ${coords.y}`;
    }

    // Only update React cursorPos state when needed for interactive SVG/heightfield overlays
    if (
      (activeTool === 'mask' && landmassShapes.polygonVertices.length > 0) ||
      numericHeightfieldEnabled ||
      isEyedropperActive
    ) {
      setCursorPos(coords);
    }

    if (activeTool === 'territory' && territoryVerticesRef.current.length > 0) {
      requestRedraw();
    }

    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
      return;
    }

    if (landmassShapes.activeShapeDraft) {
      landmassShapes.updateShapeDrag(coords.x, coords.y);
      return;
    }

    if (activeTool === 'select') {
      if (marqueeRef.current && viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        const nextMarquee = {
          ...marqueeRef.current,
          currentX: e.clientX - rect.left,
          currentY: e.clientY - rect.top,
        };
        marqueeRef.current = nextMarquee;
        setMarquee(nextMarquee);
        return;
      }

      const nodeDrag = pathNodeDragRef.current;
      if (nodeDrag) {
        const currentPath = pathsRef.current.find((p) => p.id === nodeDrag.pathId);
        if (currentPath && currentPath.points[nodeDrag.pointIndex]) {
          if (currentPath.restrictToLand && maskCanvasRef.current) {
            const maskCtx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
            const px = Math.max(0, Math.min(maskCanvasRef.current.width - 1, Math.round(coords.x)));
            const py = Math.max(0, Math.min(maskCanvasRef.current.height - 1, Math.round(coords.y)));
            if (maskCtx && maskCtx.getImageData(px, py, 1, 1).data[3] < 40) return;
          }
          const nextPoints = currentPath.points.map((point, index) =>
            index === nodeDrag.pointIndex ? { x: Math.round(coords.x), y: Math.round(coords.y) } : point
          );
          const nextPaths = pathsRef.current.map((path) =>
            path.id === nodeDrag.pathId ? { ...path, points: nextPoints } : path
          );
          nodeDrag.moved = true;
          pathsRef.current = nextPaths;
          setPaths(nextPaths);
          requestRedraw({ paths: nextPaths });
        }
        return;
      }

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
        waterTextureCanvas: waterTextureCanvasRef.current,
        elevationCanvas: elevationCanvasRef.current,
        heightField: numericHeightfieldEnabled ? heightFieldRef.current : null,
        customBiomes,
          onRequestRedraw: requestRedraw,
        }
      );
      lastPaintPointRef.current = coords;
      requestRedraw();
    } else if (activePathDraft) {
      let nextPt = coords;
      if (pathAutoMerge) {
        const SNAP_DIST = Math.max(24, Math.min(72, pathWidth * 2.5 + 20));
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
      if (pathRestrictToLand && maskCanvasRef.current) {
        const maskCtx = maskCanvasRef.current.getContext('2d', { willReadFrequently: true });
        if (maskCtx) {
          const px = Math.max(0, Math.min(maskCanvasRef.current.width - 1, Math.round(nextPt.x)));
          const py = Math.max(0, Math.min(maskCanvasRef.current.height - 1, Math.round(nextPt.y)));
          if (maskCtx.getImageData(px, py, 1, 1).data[3] < 40) return;
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

    if (landmassShapes.activeShapeDraft) {
      landmassShapes.commitShapeDrag(
        maskCanvasRef.current,
        elevationCanvasRef.current,
        brushSettings.size,
        pushHistorySnapshot,
        requestRedraw
      );
      return;
    }

    const activeMarquee = marqueeRef.current;
    if (activeMarquee) {
      const toWorld = (screenX: number, screenY: number) => ({
        x: (screenX - pan.x) / zoom,
        y: (screenY - pan.y) / zoom,
      });
      const a = toWorld(activeMarquee.startX, activeMarquee.startY);
      const b = toWorld(activeMarquee.currentX, activeMarquee.currentY);
      const left = Math.min(a.x, b.x);
      const right = Math.max(a.x, b.x);
      const top = Math.min(a.y, b.y);
      const bottom = Math.max(a.y, b.y);
      const contained = stampsRef.current
        .filter((stamp) => stamp.x >= left && stamp.x <= right && stamp.y >= top && stamp.y <= bottom)
        .map((stamp) => stamp.id);
      setSelectedStampIds(contained);
      setSelectedStampId(contained[contained.length - 1] || null);
      marqueeRef.current = null;
      setMarquee(null);
      requestRedraw();
      return;
    }

    finishTransform();

    const nodeDrag = pathNodeDragRef.current;
    if (nodeDrag) {
      if (nodeDrag.moved) {
        pushHistorySnapshot('Edit Path Node', { paths: pathsRef.current });
      }
      pathNodeDragRef.current = null;
    }

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
      a.download = `${safeProjectFilename(projectName)}_heightmap.png`;
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
      a.download = `${safeProjectFilename(projectName)}_elevation.json`;
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
          waterTextureCanvas: waterTextureCanvasRef.current!,
          elevationCanvas: elevation,
          stamps: stampsRef.current,
          paths: pathsRef.current,
          labels: labelsRef.current,
          territories: territoriesRef.current,
          customAssets,
          layers,
          grid: gridConfig,
          atmosphere,
          waterDeepColor,
          waterShallowColor,
          coastlineRipples: brushSettings.coastlineRipples,
          coastlineColor: brushSettings.coastlineColor,
          topographicalView,
          importedMapLayer,
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
      a.download = `${safeProjectFilename(projectName)}${modeSuffix}_${scaleFactor}x.${fileExt}`;
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
  const selectedTerritory = isPathsActive() ? territories.find((t) => t.id === selectedTerritoryId) || null : null;
  const activeBiome = (brushSettings.selectedBiome as BiomePreset) || 'lush_grass';

  return (
    <div id="cartomancer-app" className="h-screen w-screen flex flex-col bg-[#0B101B] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. Top Navigation Bar */}
      <Navbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        dimensions={dimensions}
        canUndo={undoCount > 0}
        canRedo={redoCount > 0}
        undoCount={undoCount}
        redoCount={redoCount}
        onUndo={handleUndo}
        onRedo={handleRedo}
        zoom={zoom}
        onZoomChange={(newZ) => zoomTo(newZ)}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onResetZoom={resetZoom}
        onFitToScreen={fitToScreen}
        topographicalView={topographicalView}
        onToggleTopographicalView={() => setTopographicalView(!topographicalView)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
        onOpenWorldAdvisor={() => setIsWorldAdvisorOpen(true)}
        onOpenMapImport={() => setIsMapImportOpen(true)}
        onOpenShaderLab={() => setIsShaderLabOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
        onOpenAssetOutliner={() => setIsAssetOutlinerOpen(true)}
        assetCount={stamps.length + paths.length + labels.length}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onNewMap={() => {
          applyTemplate('blank_canvas', true);
          fitToScreen();
        }}
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
          onOpenWorldAdvisor={() => setIsWorldAdvisorOpen(true)}
          onOpenAssetOutliner={() => setIsAssetOutlinerOpen(true)}
          assetCount={stamps.length + paths.length + labels.length}
        />

        {isToolSettingsOpen && (
          <ToolSettingsPanel
            activeTool={activeTool}
            onClose={() => setIsToolSettingsOpen(false)}
            brushSettings={brushSettings}
            onUpdateBrushSettings={(newSet) => setBrushSettings((prev) => ({ ...prev, ...newSet }))}
            numericHeightfieldEnabled={numericHeightfieldEnabled}
            onToggleNumericHeightfield={() => {
              setNumericHeightfieldEnabled((enabled) => {
                if (!enabled && !heightFieldRef.current) heightFieldRef.current = createHeightField(dimensions.width, dimensions.height, 4, 0);
                if (enabled) setShowHeightfieldOverlay(false);
                return !enabled;
              });
            }}
            showHeightfieldOverlay={showHeightfieldOverlay}
            onToggleHeightfieldOverlay={() => setShowHeightfieldOverlay((visible) => !visible)}
            currentHeightMeters={numericHeightfieldEnabled && heightFieldRef.current ? sampleHeight(heightFieldRef.current, cursorPos.x, cursorPos.y) : null}
            onSetHeightMeters={(height) => {
              const field = heightFieldRef.current;
              if (!field) return;
              field.values[Math.max(0, Math.min(field.values.length - 1, Math.floor(cursorPos.y / field.cellSize) * field.width + Math.floor(cursorPos.x / field.cellSize)))] = encodeHeight(field, height);
              requestRedraw();
            }}
            waterDeepColor={waterDeepColor}
            waterShallowColor={waterShallowColor}
            onWaterDeepColorChange={setWaterDeepColor}
            onWaterShallowColorChange={setWaterShallowColor}
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
            onTextPresetStyleChange={(style) => setTextPresetStyle(style as TextPresetStyle)}
            onHydraulicErosion={handleHydraulicErosion}
            onDeriveTopography={handleDeriveTopography}
            activeBiome={activeBiome}
            onSelectBiome={(biome) => setBrushSettings((prev) => ({ ...prev, selectedBiome: biome }))}
            customBiomes={customBiomes}
            onOpenShaderLab={() => setIsShaderLabOpen(true)}
            onSampleMapColor={handleToggleEyedropper}
            isEyedropperActive={isEyedropperActive}
            selectedStampIds={selectedStampIds}
            onClearStampSelection={() => {
              setSelectedStampId(null);
              setSelectedStampIds([]);
              requestRedraw();
            }}
            polygonVerticesCount={landmassShapes.polygonVertices.length}
            onCommitPolygon={() => {
              landmassShapes.commitPolygon(
                brushSettings.maskMode,
                brushSettings.landmassEdgeStyle || 'crisp',
                brushSettings.roughness ?? 0.35,
                maskCanvasRef.current,
                elevationCanvasRef.current,
                pushHistorySnapshot,
                requestRedraw
              );
            }}
            onUndoPolygonPoint={() => landmassShapes.removeLastPolygonVertex()}
            onCancelPolygon={() => {
              landmassShapes.cancelPolygon();
              requestRedraw();
            }}
            onStampPresetShape={(shape: LandmassShape) => {
              landmassShapes.placePresetShapeAt(
                dimensions.width / 2,
                dimensions.height / 2,
                shape,
                brushSettings.size,
                brushSettings.maskMode,
                brushSettings.landmassEdgeStyle || 'crisp',
                brushSettings.roughness ?? 0.35,
                maskCanvasRef.current,
                elevationCanvasRef.current,
                pushHistorySnapshot,
                requestRedraw
              );
            }}
            customAssets={customAssets}
            selectedTerritory={selectedTerritory}
            onUpdateSelectedTerritory={handleUpdateSelectedTerritory}
            onDeleteSelectedTerritory={handleDeleteSelectedTerritory}
            onDuplicateSelectedTerritory={handleDuplicateSelectedTerritory}
            territoryVerticesCount={territoryVertices.length}
            onCommitTerritory={() => commitTerritoryPolygon(brushSettings)}
            onUndoTerritoryPoint={removeLastTerritoryVertex}
            onCancelTerritory={cancelTerritoryDraft}
            onToggleLockStamp={handleToggleLockSelectedStamp}
            onGroupStamps={handleGroupSelectedStamps}
            onUngroupStamps={handleUngroupSelectedStamps}
            onCopyStampStyle={handleCopyStampStyle}
            onPasteStampStyle={handlePasteStampStyle}
            hasStyleClipboard={hasStampStyleClipboard}
            gridConfig={gridConfig}
            onUpdateGridConfig={(updates) => {
              setGridConfig((prev) => ({ ...prev, ...updates }));
              updateLayer('grid', { visible: true });
            }}
            topographicalView={topographicalView}
            onToggleTopographicalView={() => setTopographicalView((v) => !v)}
            onFillOrClearLandmass={(fillLand) => {
              const mask = maskCanvasRef.current;
              const elev = elevationCanvasRef.current;
              if (!mask) return;
              const mCtx = mask.getContext('2d');
              if (!mCtx) return;
              mCtx.clearRect(0, 0, dimensions.width, dimensions.height);
              if (fillLand) {
                mCtx.fillStyle = '#ffffff';
                mCtx.fillRect(0, 0, dimensions.width, dimensions.height);
              }
              if (elev) {
                const eCtx = elev.getContext('2d');
                if (eCtx) {
                  eCtx.fillStyle = fillLand ? 'rgb(145,145,145)' : 'rgb(128,128,128)';
                  eCtx.fillRect(0, 0, dimensions.width, dimensions.height);
                }
              }
              CanvasRenderer.invalidateTerrainCache('all');
              pushHistorySnapshot();
              requestRedraw();
            }}
          />
        )}

        <div
          ref={viewportRef}
          id="map-viewport"
          className={`flex-1 studio-viewport-grid overflow-hidden relative ${
            isEyedropperActive
              ? 'cursor-crosshair'
              : isPanning
              ? 'cursor-grabbing'
              : isSpacePressed
              ? 'cursor-grab'
              : activeTool === 'select'
              ? 'cursor-default'
              : activeTool === 'text'
              ? 'cursor-text'
              : 'cursor-crosshair'
          }`}
          onMouseDown={(e) => {
            if (contextMenu) setContextMenu(null);
            handleMouseDown(e);
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onContextMenu={(e) => {
            e.preventDefault();
            const { x, y } = getCanvasCoords(e);
            const stampsAtPoint = getStampsFrontToBack(stampsRef.current).filter((s) => isPointInStamp(x, y, s));
            if (stampsAtPoint.length > 0) {
              const top = stampsAtPoint[0];
              if (!selectedStampIds.includes(top.id)) {
                const groupIds = top.groupId
                  ? stampsRef.current.filter((s) => s.groupId === top.groupId).map((s) => s.id)
                  : [top.id];
                setSelectedStampIds(groupIds);
              }
              setSelectedStampId(top.id);
              setSelectedLabelId(null);
              setSelectedPathId(null);
              setSelectedTerritoryId(null);
              requestRedraw();
            }
            const rect = viewportRef.current?.getBoundingClientRect();
            if (rect) {
              setContextMenu({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
              });
            }
          }}
          onDoubleClick={() => {
            if (
              activeTool === 'mask' &&
              brushSettings.landmassShape === 'polygon' &&
              landmassShapes.polygonVertices.length >= 3
            ) {
              landmassShapes.commitPolygon(
                brushSettings.maskMode,
                brushSettings.landmassEdgeStyle || 'crisp',
                brushSettings.roughness ?? 0.35,
                maskCanvasRef.current,
                elevationCanvasRef.current,
                pushHistorySnapshot,
                requestRedraw
              );
            } else if (activeTool === 'territory' && territoryVertices.length >= 3) {
              commitTerritoryPolygon(brushSettings);
            }
          }}
        >
          {/* Floating Context Action Bar above Selected Objects */}
          {activeTool === 'select' && (
            <CanvasContextBar
              zoom={zoom}
              pan={pan}
              selectedStamp={selectedStamp}
              selectedStampIds={selectedStampIds}
              selectedTerritory={selectedTerritory}
              selectedLabel={selectedLabel}
              selectedPath={selectedPath}
              hasStyleClipboard={hasStampStyleClipboard}
              onUpdateSelectedStamp={handleUpdateSelectedStamp}
              onBringToFront={handleBringStampToFront}
              onSendToBack={handleSendStampToBack}
              onDuplicateSelected={
                selectedStamp
                  ? handleDuplicateSelectedStamp
                  : selectedTerritory
                  ? handleDuplicateSelectedTerritory
                  : selectedLabel
                  ? handleDuplicateSelectedLabel
                  : () => {}
              }
              onDeleteSelected={handleDeleteSelected}
              onToggleLockStamp={handleToggleLockSelectedStamp}
              onGroupStamps={handleGroupSelectedStamps}
              onUngroupStamps={handleUngroupSelectedStamps}
              onCopyStampStyle={handleCopyStampStyle}
              onPasteStampStyle={handlePasteStampStyle}
              onUpdateSelectedTerritory={handleUpdateSelectedTerritory}
            />
          )}

          {/* Right-Click Canvas Context Menu */}
          {contextMenu && (
            <CanvasContextMenu
              position={contextMenu}
              hasSelection={Boolean(selectedStamp || selectedLabel || selectedPath || selectedTerritory)}
              isStampSelected={Boolean(selectedStamp)}
              isMultiStampSelected={selectedStampIds.length > 1}
              isLocked={Boolean(selectedStamp?.locked)}
              isGrouped={Boolean(selectedStamp?.groupId)}
              hasStyleClipboard={hasStampStyleClipboard}
              onClose={() => setContextMenu(null)}
              onBringToFront={handleBringStampToFront}
              onSendToBack={handleSendStampToBack}
              onFlipX={handleFlipSelectedStampX}
              onToggleLock={handleToggleLockSelectedStamp}
              onGroup={handleGroupSelectedStamps}
              onUngroup={handleUngroupSelectedStamps}
              onCopyStyle={handleCopyStampStyle}
              onPasteStyle={handlePasteStampStyle}
              onDuplicate={
                selectedStamp
                  ? handleDuplicateSelectedStamp
                  : selectedTerritory
                  ? handleDuplicateSelectedTerritory
                  : selectedLabel
                  ? handleDuplicateSelectedLabel
                  : () => {}
              }
              onDelete={handleDeleteSelected}
              onFitToScreen={fitToScreen}
            />
          )}
          {isEyedropperActive && (
            <div
              className="absolute pointer-events-none z-40 bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md shadow-lg border border-violet-400 flex items-center gap-1.5"
              style={{
                left: pan.x + cursorPos.x * zoom + 16,
                top: pan.y + cursorPos.y * zoom + 16,
              }}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 animate-pulse" />
              <span>Click to sample color (Esc to cancel)</span>
            </div>
          )}
          {['mask', 'brush', 'elevation', 'eraser'].includes(activeTool) && (
            <div
              ref={brushPreviewRef}
              id="brush-cursor-preview"
              className="absolute pointer-events-none z-30 rounded-full border-2 border-amber-400/85 bg-amber-300/10"
              style={{
                left: pan.x + cursorPosRef.current.x * zoom - brushSettings.size * zoom,
                top: pan.y + cursorPosRef.current.y * zoom - brushSettings.size * zoom,
                width: brushSettings.size * zoom * 2,
                height: brushSettings.size * zoom * 2,
              }}
            />
          )}
          {marquee && (
            <div
              id="selection-marquee"
              className="absolute pointer-events-none z-30 border border-[#0284c7] bg-[#38bdf8]/15"
              style={{
                left: Math.min(marquee.startX, marquee.currentX),
                top: Math.min(marquee.startY, marquee.currentY),
                width: Math.abs(marquee.currentX - marquee.startX),
                height: Math.abs(marquee.currentY - marquee.startY),
              }}
            />
          )}
          <div
            ref={mapStageRef}
            id="map-stage"
            className="absolute origin-top-left shadow-2xl select-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
              willChange: 'transform',
              width: dimensions.width,
              height: dimensions.height,
            }}
          >
            <canvas
              ref={mainCanvasRef}
              id="main-map-canvas"
              width={dimensions.width}
              height={dimensions.height}
              className="rounded-sm shadow-2xl ring-2 ring-slate-700/90 block bg-[#0f172a]"
            />

            {/* Interactive Landmass Shape & Polygon Drafting Overlay */}
            {activeTool === 'mask' && (landmassShapes.activeDraftSvgPath || landmassShapes.polygonVertices.length > 0) && (
              <svg
                id="landmass-shape-preview-overlay"
                className="absolute inset-0 pointer-events-none z-20"
                width={dimensions.width}
                height={dimensions.height}
                style={{ overflow: 'visible' }}
              >
                {/* Dragged Geometric Shape */}
                {landmassShapes.activeDraftSvgPath && (
                  <g id="landmass-shape-draft">
                    <path
                      d={landmassShapes.activeDraftSvgPath}
                      fill={brushSettings.maskMode === 'carve_water' ? 'rgba(56, 189, 248, 0.28)' : 'rgba(245, 158, 11, 0.28)'}
                      stroke={brushSettings.maskMode === 'carve_water' ? '#0284c7' : '#d97706'}
                      strokeWidth={2.5}
                      strokeDasharray="6 4"
                    />
                    {landmassShapes.activeShapeDraft && (
                      <>
                        <circle
                          cx={landmassShapes.activeShapeDraft.startX}
                          cy={landmassShapes.activeShapeDraft.startY}
                          r={4}
                          fill="#ffffff"
                          stroke="#3E2723"
                          strokeWidth={2}
                        />
                        <g
                          transform={`translate(${(landmassShapes.activeShapeDraft.startX + landmassShapes.activeShapeDraft.currentX) / 2}, ${(landmassShapes.activeShapeDraft.startY + landmassShapes.activeShapeDraft.currentY) / 2 - 14})`}
                        >
                          <rect
                            x="-40"
                            y="-12"
                            width="80"
                            height="20"
                            rx="4"
                            fill="#3E2723"
                            opacity="0.88"
                          />
                          <text
                            x="0"
                            y="2"
                            fill="#fde68a"
                            fontSize="10"
                            fontFamily="monospace"
                            fontWeight="bold"
                            textAnchor="middle"
                          >
                            {Math.round(
                              Math.hypot(
                                landmassShapes.activeShapeDraft.currentX - landmassShapes.activeShapeDraft.startX,
                                landmassShapes.activeShapeDraft.currentY - landmassShapes.activeShapeDraft.startY
                              )
                            )}px
                          </text>
                        </g>
                      </>
                    )}
                  </g>
                )}

                {/* Custom Polygon in Progress */}
                {landmassShapes.polygonVertices.length > 0 && (
                  <g id="landmass-polygon-draft">
                    {landmassShapes.polygonVertices.length >= 3 && (
                      <path
                        d={`${landmassShapes.polygonSvgPath} Z`}
                        fill={brushSettings.maskMode === 'carve_water' ? 'rgba(56, 189, 248, 0.18)' : 'rgba(245, 158, 11, 0.18)'}
                        stroke="none"
                      />
                    )}
                    {landmassShapes.polygonVertices.length > 1 && (
                      <path
                        d={landmassShapes.polygonSvgPath}
                        fill="none"
                        stroke={brushSettings.maskMode === 'carve_water' ? '#0284c7' : '#d97706'}
                        strokeWidth={2.5}
                        strokeDasharray="5 3"
                      />
                    )}
                    <line
                      x1={landmassShapes.polygonVertices[landmassShapes.polygonVertices.length - 1].x}
                      y1={landmassShapes.polygonVertices[landmassShapes.polygonVertices.length - 1].y}
                      x2={cursorPos.x}
                      y2={cursorPos.y}
                      stroke={brushSettings.maskMode === 'carve_water' ? '#38bdf8' : '#fbbf24'}
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                    />
                    {landmassShapes.polygonVertices.map((v, idx) => (
                      <g key={idx}>
                        <circle
                          cx={v.x}
                          cy={v.y}
                          r={idx === 0 ? 6 : 4}
                          fill={idx === 0 ? '#10b981' : '#ffffff'}
                          stroke="#1e293b"
                          strokeWidth={idx === 0 ? 2.5 : 1.5}
                        />
                        {idx === 0 && (
                          <circle
                            cx={v.x}
                            cy={v.y}
                            r={10}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth={1.5}
                            strokeDasharray="2 2"
                          />
                        )}
                      </g>
                    ))}
                  </g>
                )}
              </svg>
            )}
          </div>

          {/* Bottom-Left Studio Telemetry Readout */}
          <div className="absolute bottom-3 left-3 bg-[#0F1623]/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 flex items-center gap-3 text-[11px] text-slate-300 shadow-xl pointer-events-none select-none z-20">
            <span ref={hudCoordsRef} id="hud-coords-readout" className="font-mono tabular-nums text-slate-200">
              X: {cursorPosRef.current.x} · Y: {cursorPosRef.current.y}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="font-mono tabular-nums text-slate-300">
              {dimensions.width} × {dimensions.height}
            </span>
            <span className="text-slate-600" aria-hidden="true">·</span>
            <span className="text-amber-400 font-semibold capitalize">
              Tool: {activeTool}
            </span>
          </div>

          {/* Bottom-Right Interactive World Navigator & Map Size Switcher */}
          <MinimapNavigator
            mainCanvasRef={mainCanvasRef}
            viewportRef={viewportRef}
            dimensions={dimensions}
            zoom={zoom}
            pan={pan}
            onPanChange={(nextPan) => setPan(nextPan)}
            onFitToScreen={() => fitToScreen()}
            onResizeCanvas={handleResizeCanvas}
            renderTrigger={minimapTick}
          />
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
          stampCategoryVisibility={stampCategoryVisibility}
          onToggleStampCategory={(category) => setStampCategoryVisibility((current) => ({ ...current, [category]: current[category] === false }))}
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
        onSetImportedMapLayer={(config) => {
          setImportedMapLayer(config);
          imageManager.loadImage(config.imageUrl);
          requestRedraw();
        }}
        onApplyBaseTextureImage={handleApplyBaseTextureImage}
        onCreateSampledTexture={handleCreateSampledTexture}
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

      <WorldAdvisorModal
        isOpen={isWorldAdvisorOpen}
        onClose={() => setIsWorldAdvisorOpen(false)}
        dimensions={dimensions}
        onResizeCanvas={handleResizeCanvas}
        maskCanvas={maskCanvasRef.current}
        elevationCanvas={elevationCanvasRef.current}
        stamps={stamps}
        paths={paths}
        territories={territories}
        onGenerateProceduralWorld={handleGenerateProceduralWorld}
        onDeriveTopography={handleDeriveTopography}
        onHydraulicErosion={handleHydraulicErosion}
        onGenerateRiverBasin={handleGenerateRiverBasin}
        onAutoPopulateEcosystem={handleAutoPopulateEcosystem}
      />
    </div>
  );
}
