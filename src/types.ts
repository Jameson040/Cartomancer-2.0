/**
 * Cartomancer Fantasy Map Maker - Core Type Definitions
 */

export type ToolType = 
  | 'select'
  | 'mask'       // Landmass sculptor (Add Land / Carve Sea)
  | 'brush'      // Biome texture painting
  | 'elevation'  // Height / relief contour sculpting
  | 'stamp'      // Asset placement & scatter brush
  | 'path'       // Rivers, roads, borders
  | 'text'       // Map labels & annotations
  | 'grid'       // Grid customization
  | 'eraser';    // Erase stamps/paths/labels

export type MaskMode = 'add_land' | 'carve_water';

export type StampCategory = 
  | 'mountains'
  | 'trees'
  | 'settlements'
  | 'castles'
  | 'building_blocks'
  | 'nature_props'
  | 'water_maritime'
  | 'decorations'
  | 'custom';

export interface StampAsset {
  id: string;
  name: string;
  category: StampCategory;
  svgData?: string;      // Procedural SVG icon or symbol
  imageUrl?: string;     // Custom uploaded user asset data URL or image path
  defaultScale: number;
  tags?: string[];
  isCustom?: boolean;
}

export interface PlacedStamp {
  id: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;     // in degrees
  flipX: boolean;       // Horizontal flip
  flipY?: boolean;      // Vertical flip
  opacity: number;
  tint?: string;        // Optional tint hex color
  layer: number;        // Z-ordering: -5 to +5, with sub-sort by Y
  createdAt: number;
}

export interface PathPoint {
  x: number;
  y: number;
}

export type PathStyle = 'river' | 'road' | 'trade_route' | 'border' | 'coast_outline';

export interface PlacedPath {
  id: string;
  style: PathStyle;
  points: PathPoint[];
  width: number;
  color: string;
  textureId?: string;    // Custom texture id (from BiomeTexture/Shader Lab) or 'default'
  dashPattern?: number[]; // e.g. [] for solid, [8, 6] for dashed
  opacity: number;
  smoothed: boolean;
  taper?: boolean;       // Natural tapering from thin source to wide estuary
  startWidth?: number;
  endWidth?: number;
  doubleLine?: boolean;  // Imperial double highway styling
  restrictToLand?: boolean; // Restrict path/river to landmass (default: true)
}

export type TextBannerStyle = 'none' | 'box_simple' | 'parchment_ribbon' | 'stone_plaque' | 'royal_banner' | 'scroll';
export type TextPresetStyle = 'standard' | 'imperial_spaced' | 'regal_serif' | 'gothic_runic';

export interface PlacedText {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  scale?: number;          // 0.5 to 3.0 scale multiplier
  fontFamily: string;
  color: string;
  strokeColor: string;
  strokeWidth: number;
  rotation: number;
  bannerStyle: TextBannerStyle;
  boxColor?: string;       // Background fill color for label box / ribbon
  boxBorderColor?: string; // Border stroke color for label box
  boxOpacity?: number;     // 0 to 1 box opacity
  letterSpacing: number;
  curvature?: number;    // -100 to +100 arc angle for curved mountain/ocean names
  stylePreset?: TextPresetStyle;
}

export type PlacedLabel = PlacedText;

export interface BiomeTexture {
  id: string;
  name: string;
  color: string;
  roughnessColor: string;
  detailType: 'grass' | 'sand' | 'snow' | 'rock' | 'water' | 'swamp' | 'volcanic' | 'parchment' | 'cobble' | 'custom_pattern';
  defaultElevation: number; // Suggested base elevation
  isPattern?: boolean;
  patternImageUrl?: string;
  patternScale?: number;
  isCustom?: boolean;
}

export type BiomePreset = string;

export interface ReferenceMapConfig {
  imageUrl: string;
  opacity: number;
  visible: boolean;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export type GridType = 'none' | 'square' | 'hex_flat' | 'hex_pointy' | 'isometric';

export interface GridConfig {
  type: GridType;
  size: number;
  color: string;
  opacity: number;
  lineWidth: number;
  labels: boolean;
  showRhumbLines?: boolean;    // Nautical 16/32-point compass ray lines
  showCoordinates?: boolean;   // Alphanumeric margin borders (A-Z, 1-50)
}

export type TimeOfDay = 'day' | 'golden_hour' | 'sunset' | 'twilight' | 'night' | 'torchlight' | 'overcast';
export type SeasonParticleFill = 'none' | 'snow_winter' | 'autumn_leaves' | 'spring_blossom' | 'desert_sand';

export interface AtmosphereFilter {
  timeOfDay: TimeOfDay;
  lightIntensity: number;       // 0 to 1
  warmth: number;               // -1 (cool blue) to +1 (warm gold)
  vignette: number;             // 0 to 1
  seasonFill: SeasonParticleFill;
  seasonDensity: number;        // 0.1 to 1.0 (default 0.5)
  seasonParticleSize: number;   // 1 to 5 (default 2)
  foldCreases?: boolean;        // Authentic folded map crease overlays
  weatheringStains?: boolean;   // Water marks & ancient parchment patina
  // Deprecated/Legacy compatibility
  preset?: string;
  contrast?: number;
  brightness?: number;
  cloudShadows?: boolean;
  cloudOpacity?: number;
  sunHaze?: boolean;
  sunHazeIntensity?: number;
}

export interface LayerState {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
}

export interface WorldElevationConfig {
  minElevation: number; // e.g. -15000 (meters)
  maxElevation: number; // e.g. +15000 (meters)
  seaLevel: number;     // 0 (meters)
  unit: 'meters' | 'feet';
  worldPreset: 'earth' | 'titanic_fantasy' | 'mars' | 'custom';
  customName?: string;
}

export type ElevationProfile = 'gaussian' | 'plateau' | 'ridge' | 'terraced';

export interface BrushSettings {
  size: number;
  density: number;        // 0.05 to 1.0 (terrain flow/coverage)
  softness: number;       // 0 to 1 (feathering)
  elevation: number;      // in real meters (e.g. -15,000m to +15,000m)
  elevationConfig?: WorldElevationConfig;
  maskMode: MaskMode;
  mode?: 'add' | 'subtract' | 'land' | 'ocean' | 'erase_land' | string;
  selectedBiome: string;  // BiomeTexture id
  coastlineRipples: number; // 0 to 4 ripples
  coastlineColor: string;
  coastlineRoughness?: number; // 0 to 1 fractal coastline jitter
  coastlineHatching?: boolean; // Historical copperplate contour lines
  autoBeaching?: boolean;      // Automatic shallow water & sand shelf
  colorJitter?: number;        // 0 to 0.5 dual-tone organic vegetation shifts
  stippleMode?: boolean;       // Dry brush parchment stippling
  elevationProfile?: ElevationProfile; // Plateau, Ridge, Gaussian, Terraced
  showContourLines?: boolean;  // Vector topographical interval contours
  contourInterval?: number;    // 100m to 1000m intervals in meters
  // Procedural Noise & Deposition
  noiseJitter?: boolean;       // Turbulence Modulation: 3-octave Simplex craggy dab
  noiseRoughness?: number;     // 0 to 1 turbulence roughness (default 0.45)
  roughness?: number;          // Coastline / terrain fractal roughness (0.1 to 1.0)
  opacity?: number;            // Texture painting opacity (0.1 to 1.0)
  elevationMode?: 'raise' | 'lower' | 'plateau' | 'smooth';
  slopeDeposition?: boolean;   // Slope-limited deposition & talus accumulation
  angleRepose?: number;        // Critical slope threshold before shedding scree
  // Hydrological Drainage & River Routing
  riverSnapDrainage?: boolean; // Snap river to steepest-descent drainage basin
  riverCarveGorge?: boolean;   // Physically carve elevation gorge along river course
  // Path & River specific
  pathRestrictToLand?: boolean; // Restrict routes & rivers to landmass (default: true)
  pathAutoMerge?: boolean;      // Auto-merge overlapping ends from city to city (default: true)
  pathTextureId?: string;       // Chosen texture from Shader Lab & Biomes (default: 'default')
  // Stamp specific brush settings
  selectedStampId: string;
  stampPlacementMode: 'single' | 'scatter' | 'ribbon';
  scatterDensity: number; // 1 to 10 assets per stroke burst
  scatterRadius: number;
  ribbonSpacing?: number; // Spacing distance between ribbon stamps
  stampScale: number;
  stampOpacity?: number;  // 0.05 to 1.0 (default 1.0)
  stampRotation?: number; // 0 to 360 or -180 to 180 deg
  stampFlipX?: boolean;   // Flip horizontally on placement
  stampFlipY?: boolean;   // Flip vertically on placement
  randomizeFlipX?: boolean; // Organic random left/right flipping
  randomizeRotation?: boolean;
  randomizeScale?: boolean;
  scaleVariance: number;  // 0 to 0.5
  rotationVariance: number; // 0 to 180 deg
  autoYDepthSort: boolean;
  stampLayer: number;
  stampTint?: string;     // Seasonal/environmental tint hex (autumn, snow, etc)
  eraserTarget?: 'all' | 'stamps' | 'paths' | 'labels';
  labelScale?: number;
  labelBoxColor?: string;
  labelBoxBorderColor?: string;
  labelBoxOpacity?: number;
}

export interface CanvasDimensions {
  width: number;
  height: number;
}

export interface MapProject {
  version: string;
  name: string;
  dimensions: CanvasDimensions;
  backgroundColor: string;
  waterDeepColor: string;
  waterShallowColor: string;
  layers: {
    water: LayerState;
    landmass: LayerState;
    textures: LayerState;
    elevation: LayerState;
    stamps: LayerState;
    paths: LayerState;
    labels: LayerState;
    grid: LayerState;
    atmosphere: LayerState;
  };
  grid: GridConfig;
  atmosphere: AtmosphereFilter;
  stamps: PlacedStamp[];
  paths: PlacedPath[];
  labels: PlacedText[];
  customAssets: StampAsset[];
  elevationConfig?: WorldElevationConfig;
}

export interface RenderContextOptions {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  maskCanvas: HTMLCanvasElement;
  textureCanvas: HTMLCanvasElement;
  elevationCanvas: HTMLCanvasElement;
  stamps: PlacedStamp[];
  paths: PlacedPath[];
  labels: PlacedText[];
  customAssets?: StampAsset[];
  layers: {
    water: LayerState;
    landmass: LayerState;
    textures: LayerState;
    elevation: LayerState;
    stamps: LayerState;
    paths: LayerState;
    labels: LayerState;
    grid: LayerState;
    atmosphere?: LayerState;
  };
  grid: GridConfig;
  atmosphere?: AtmosphereFilter;
  waterDeepColor: string;
  waterShallowColor: string;
  coastlineRipples?: number;
  coastlineColor?: string;
  coastlineHatching?: boolean;
  autoBeaching?: boolean;
  showContourLines?: boolean;
  contourInterval?: number;
  topographicalView?: boolean;
  elevationConfig?: WorldElevationConfig;
  selectedStampId?: string | null;
  selectedLabelId?: string | null;
  selectedPathId?: string | null;
  customBiomes?: BiomeTexture[];
  activePathDraft?: {
    points: { x: number; y: number }[];
    color: string;
    width: number;
    style?: PathStyle;
    textureId?: string;
    restrictToLand?: boolean;
    taper?: boolean;
    doubleLine?: boolean;
    dashPattern?: number[];
  } | null;
  referenceMap?: ReferenceMapConfig | null;
  highResScale?: number;
}

export interface HistoryStep {
  description: string;
  timestamp: number;
  maskImageData?: ImageData;
  textureImageData?: ImageData;
  elevationImageData?: ImageData;
  maskDataUrl?: string;
  textureDataUrl?: string;
  elevationDataUrl?: string;
  stamps: PlacedStamp[];
  paths: PlacedPath[];
  labels: PlacedText[];
}


