/**
 * Procedural Brush and Elevation Dab/Stroke Painting.
 * Handles mask sculpting, biome texture stippling/pattern dabs, and elevation profile modeling.
 */
import { BrushSettings, BiomeTexture, ToolType } from '../../types';
import { DEFAULT_BIOMES } from '../../data/defaultAssets';
import { imageManager, getScaledPatternTile } from '../imageManager';
import { hexToRgba } from '../colorUtils';
import {
  drawFractalDab,
  applyColorJitter,
  drawTurbulentElevationDab,
} from '../proceduralNoise';
import { applySlopeLimitedDeposition } from '../elevationModel';
import { NumericHeightField, paintHeight } from '../heightField';

function drawSoftMaskDab(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  roughness: number,
  alpha: number,
  softness: number,
  carve: boolean
): void {
  const size = Math.ceil(radius * 2 + 4);
  const dab = document.createElement('canvas');
  dab.width = size;
  dab.height = size;
  const dabCtx = dab.getContext('2d');
  if (!dabCtx) return;
  dabCtx.save();
  dabCtx.translate(size / 2 - x, size / 2 - y);
  drawFractalDab(dabCtx, x, y, radius, roughness, '#ffffff', alpha);
  dabCtx.restore();
  dabCtx.globalCompositeOperation = 'destination-in';
  const center = size / 2;
  const inner = center * Math.max(0, 1 - softness) * 0.65;
  const feather = dabCtx.createRadialGradient(center, center, inner, center, center, center);
  feather.addColorStop(0, 'rgba(255,255,255,1)');
  feather.addColorStop(1, 'rgba(255,255,255,0)');
  dabCtx.fillStyle = feather;
  dabCtx.fillRect(0, 0, size, size);
  ctx.save();
  ctx.globalCompositeOperation = carve ? 'destination-out' : 'source-over';
  ctx.drawImage(dab, x - size / 2, y - size / 2);
  ctx.restore();
}

export interface PaintDabOptions {
  x: number;
  y: number;
  activeTool: ToolType;
  brushSettings: BrushSettings;
  maskCanvas: HTMLCanvasElement | null;
  textureCanvas: HTMLCanvasElement | null;
  waterTextureCanvas: HTMLCanvasElement | null;
  elevationCanvas: HTMLCanvasElement | null;
  heightField?: NumericHeightField | null;
  customBiomes: BiomeTexture[];
  onRequestRedraw?: () => void;
}

const BIOME_ALIAS_MAP: Record<string, string> = {
  grassland: 'lush_grass',
  lush_meadow: 'lush_grass',
  ancient_forest: 'highland_forest',
  forest: 'highland_forest',
  arid_desert: 'golden_sand',
  desert: 'golden_sand',
  arctic_frost: 'snow_peaks',
  tundra: 'snow_peaks',
  rocky_crags: 'mountain_stone',
  mountain: 'mountain_stone',
  marshland: 'swamp_marsh',
  swamp: 'swamp_marsh',
};

export function paintBrushDab({
  x,
  y,
  activeTool,
  brushSettings,
  maskCanvas,
  textureCanvas,
  waterTextureCanvas,
  elevationCanvas,
  heightField,
  customBiomes,
  onRequestRedraw,
}: PaintDabOptions): void {
  const { size, density, softness, elevation, maskMode, selectedBiome } = brushSettings;

  if (activeTool === 'mask') {
    if (!maskCanvas) return;
    const mCtx = maskCanvas.getContext('2d');
    if (!mCtx) return;

    const isCarve =
      maskMode === 'carve_water' ||
      (brushSettings as any).mode === 'subtract' ||
      (brushSettings as any).mode === 'ocean' ||
      (brushSettings as any).mode === 'erase_land';

    const roughness = brushSettings.coastlineRoughness ?? 0.35;
    mCtx.save();
    if (isCarve) {
      mCtx.globalCompositeOperation = 'destination-out';
      if (roughness > 0.05) {
        drawSoftMaskDab(mCtx, x, y, size, roughness, density, softness, isCarve);
      } else {
        mCtx.globalAlpha = density;
        mCtx.beginPath();
        mCtx.arc(x, y, size, 0, Math.PI * 2);
        mCtx.fill();
      }
    } else {
      mCtx.globalCompositeOperation = 'source-over';
      if (roughness > 0.05) {
        drawSoftMaskDab(mCtx, x, y, size, roughness, density, softness, isCarve);
      } else {
        mCtx.fillStyle = '#ffffff';
        mCtx.globalAlpha = density;
        mCtx.beginPath();
        mCtx.arc(x, y, size, 0, Math.PI * 2);
        mCtx.fill();
      }
    }
    mCtx.restore();

    // When carving ocean, also clear elevation at that point so mountain contours don't linger
    if (isCarve && elevationCanvas) {
      const eCtx = elevationCanvas.getContext('2d');
      if (eCtx) {
        eCtx.save();
        eCtx.globalCompositeOperation = 'destination-out';
        eCtx.globalAlpha = density;
        eCtx.beginPath();
        eCtx.arc(x, y, size, 0, Math.PI * 2);
        eCtx.fill();
        eCtx.restore();
      }
    }
  } else if (activeTool === 'brush') {
    const waterBiomeIds = new Set(['shallow_shallows', 'deep_ocean', 'river_water']);
    const isWaterBiome = waterBiomeIds.has(selectedBiome || '');
    const targetTextureCanvas = isWaterBiome ? waterTextureCanvas : textureCanvas;
    if (!targetTextureCanvas) return;
    const tCtx = targetTextureCanvas.getContext('2d');
    if (!tCtx) return;

    const allBiomes = [...DEFAULT_BIOMES, ...customBiomes];
    const targetId = (selectedBiome || '').trim();
    const canonicalId = BIOME_ALIAS_MAP[targetId.toLowerCase()] || targetId;
    const biome =
      allBiomes.find((b) => b.id === targetId) ||
      allBiomes.find((b) => b.id.toLowerCase() === canonicalId.toLowerCase()) ||
      allBiomes.find((b) => b.name.toLowerCase() === targetId.toLowerCase()) ||
      allBiomes.find((b) => b.id === 'lush_grass') ||
      DEFAULT_BIOMES[0];

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
          onRequestRedraw?.();
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
    let finalColor = brushSettings.brushColorOverride || biome.color;
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

    // Smooth color blending with matching zero-alpha outer ring
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
    if (heightField) {
      const mode = brushSettings.elevationMode ?? 'raise';
      const direction = mode === 'lower' ? -1 : mode === 'smooth' ? 0 : 1;
      const amount = mode === 'plateau' ? Math.abs(elevation) : direction * Math.max(0.25, Math.abs(elevation)) * density;
      if (direction !== 0 || mode === 'smooth') paintHeight(heightField, x, y, size, amount, maskCanvas || undefined, mode);
    }
    if (!elevationCanvas) return;
    const eCtx = elevationCanvas.getContext('2d');
    if (!eCtx) return;

    const profile = brushSettings.elevationProfile ?? 'gaussian';
    const grayVal = Math.round(((elevation + 100) / 200) * 255);
    const roughness = brushSettings.noiseRoughness ?? 0.45;
    const hasJitter = (brushSettings.noiseJitter ?? true) && roughness > 0.05;

    // 1. Slope-Limited Deposition (Angle of Repose)
    if (brushSettings.slopeDeposition) {
      const heightDelta = (elevation / 100) * 12 * density;
      applySlopeLimitedDeposition(
        elevationCanvas,
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
}

export function paintStroke(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  options: Omit<PaintDabOptions, 'x' | 'y'>
): void {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const step = Math.max(4, options.brushSettings.size * 0.25);
  const count = Math.ceil(dist / step);

  for (let i = 0; i <= count; i++) {
    const t = count === 0 ? 0 : i / count;
    const curX = x1 + (x2 - x1) * t;
    const curY = y1 + (y2 - y1) * t;
    paintBrushDab({ ...options, x: curX, y: curY });
  }
}
