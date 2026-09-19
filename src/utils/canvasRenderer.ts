/**
 * Cartomancer Fantasy Map Maker - High Performance Canvas Rendering Engine
 */

import {
  AtmosphereFilter,
  GridConfig,
  LayerState,
  PathStyle,
  PlacedPath,
  PlacedStamp,
  PlacedText,
  StampAsset,
  WorldElevationConfig,
} from '../types';
import { imageManager } from './imageManager';
import {
  byteToMeters,
  getTopographicRgbMeters,
  DEFAULT_WORLD_ELEVATION,
} from './elevationModel';
import { CannyParchmentFilter, ParchmentFilterOptions } from './cannyEdgeFilter';

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
  coastlineRipples: number;
  coastlineColor: string;
  coastlineHatching?: boolean;
  autoBeaching?: boolean;
  showContourLines?: boolean;
  contourInterval?: number;
  topographicalView: boolean;
  elevationConfig?: WorldElevationConfig;
  selectedStampId?: string | null;
  selectedLabelId?: string | null;
  selectedPathId?: string | null;
  activePathDraft?: {
    points: { x: number; y: number }[];
    color: string;
    width: number;
    style?: PathStyle;
    taper?: boolean;
    doubleLine?: boolean;
    dashPattern?: number[];
  } | null;
  referenceMap?: {
    imageUrl: string;
    opacity: number;
    visible: boolean;
    blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
  } | null;
  highResScale?: number;
}

export class CanvasRenderer {
  /**
   * Main render pass
   */
  public static render(options: RenderContextOptions): void {
    const {
      ctx,
      width,
      height,
      maskCanvas,
      textureCanvas,
      elevationCanvas,
      stamps,
      paths,
      labels,
      layers,
      grid,
      atmosphere,
      waterDeepColor,
      waterShallowColor,
      coastlineRipples,
      coastlineColor,
      coastlineHatching = false,
      autoBeaching = false,
      showContourLines = false,
      contourInterval = 20,
      topographicalView,
      elevationConfig = DEFAULT_WORLD_ELEVATION,
      selectedStampId,
      selectedLabelId,
      activePathDraft,
    } = options;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. WATER / OCEAN LAYER
    if (layers.water.visible) {
      ctx.globalAlpha = layers.water.opacity;
      this.renderWater(ctx, width, height, waterDeepColor, waterShallowColor);
      ctx.globalAlpha = 1.0;
    }

    // 2. LANDMASS & COASTLINES
    if (layers.landmass.visible) {
      ctx.globalAlpha = layers.landmass.opacity;
      this.renderLandmassWithCoastlines(
        ctx,
        width,
        height,
        maskCanvas,
        coastlineRipples,
        coastlineColor,
        waterShallowColor,
        autoBeaching,
        coastlineHatching
      );
      ctx.globalAlpha = 1.0;
    }

    // 2.5 REFERENCE MAP (Blueprint / Trace layer)
    if (options.referenceMap && options.referenceMap.visible && options.referenceMap.imageUrl) {
      const refImg = imageManager.getImageByUrl(options.referenceMap.imageUrl);
      if (refImg) {
        ctx.save();
        ctx.globalAlpha = options.referenceMap.opacity;
        const blendMode = options.referenceMap.blendMode;
        ctx.globalCompositeOperation =
          !blendMode || blendMode === 'normal' ? 'source-over' : blendMode;
        ctx.drawImage(refImg, 0, 0, width, height);
        ctx.restore();
      }
    }

    // 3. TEXTURE BIOME PAINTING (Masked inside landmass)
    if (layers.textures.visible && layers.landmass.visible) {
      ctx.globalAlpha = layers.textures.opacity;
      this.renderTexturesMasked(ctx, width, height, maskCanvas, textureCanvas);
      ctx.globalAlpha = 1.0;
    }

    // 4. ELEVATION / TOPOGRAPHY LAYER
    if (layers.elevation.visible) {
      ctx.globalAlpha = layers.elevation.opacity;
      if (topographicalView) {
        this.renderTopographicalHeatmap(ctx, width, height, elevationCanvas, maskCanvas, elevationConfig);
      } else {
        this.renderReliefShading(
          ctx,
          width,
          height,
          elevationCanvas,
          maskCanvas,
          showContourLines,
          contourInterval,
          elevationConfig
        );
      }
      ctx.globalAlpha = 1.0;
    }

    // 5. PATHS & RIVERS
    if (layers.paths.visible) {
      ctx.globalAlpha = layers.paths.opacity;
      this.renderPaths(ctx, paths, activePathDraft, options.selectedPathId);
      ctx.globalAlpha = 1.0;
    }

    // 6. STAMPS / ASSETS (Depth sorted)
    if (layers.stamps.visible) {
      ctx.globalAlpha = layers.stamps.opacity;
      this.renderStamps(ctx, stamps, selectedStampId);
      ctx.globalAlpha = 1.0;
    }

    // 7. LABELS & TEXT
    if (layers.labels.visible) {
      ctx.globalAlpha = layers.labels.opacity;
      this.renderLabels(ctx, labels, selectedLabelId);
      ctx.globalAlpha = 1.0;
    }

    // 8. GRID OVERLAY & NAUTICAL RHUMB LINES
    if (layers.grid.visible && (grid.type !== 'none' || grid.showRhumbLines || grid.showCoordinates)) {
      ctx.globalAlpha = layers.grid.opacity * grid.opacity;
      this.renderGrid(ctx, width, height, grid);
      ctx.globalAlpha = 1.0;
    }

    // 9. ATMOSPHERE & LIGHTING LAYER (Day/Night Light & Seasonal Static Particle Fill)
    if (layers.atmosphere?.visible && atmosphere) {
      ctx.globalAlpha = layers.atmosphere.opacity;
      this.renderAtmosphereLayer(ctx, width, height, atmosphere);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  /**
   * 1. Render base water ocean with atmospheric depth, soft cloud mist, and bathymetric swells
   */
  private static renderWater(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    deepColor: string,
    shallowColor: string
  ): void {
    ctx.save();

    // 1. Multi-stop atmospheric oceanic gradient
    const linearGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, height);
    linearGrad.addColorStop(0, shallowColor); // Northern cooler misty waters
    linearGrad.addColorStop(0.45, deepColor);  // Central deep ocean body
    linearGrad.addColorStop(1, '#0e2423');    // Deep abyssal depth

    ctx.fillStyle = linearGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Radial atmospheric depth vignette
    const radialGrad = ctx.createRadialGradient(
      width * 0.48,
      height * 0.45,
      width * 0.15,
      width * 0.5,
      height * 0.5,
      width * 0.78
    );
    radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
    radialGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.0)');
    radialGrad.addColorStop(1, 'rgba(4, 14, 14, 0.4)');

    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);

    // 3. Flowing oceanic bathymetric wave swells (gentle painterly bezier currents)
    ctx.save();
    ctx.lineWidth = 1.2;
    const waveStep = 48;
    for (let y = 16; y < height; y += waveStep) {
      const waveAlpha = 0.035 + ((Math.sin(y * 0.02) + 1) * 0.03);
      ctx.strokeStyle = `rgba(165, 225, 230, ${waveAlpha})`;
      ctx.beginPath();
      const waveLen = 130;
      const xOffset = (y % (waveStep * 2) === 0) ? 35 : 0;
      for (let x = -50 + xOffset; x < width + 50; x += waveLen) {
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
          x + waveLen * 0.35,
          y - 4.5,
          x + waveLen * 0.65,
          y + 4.5,
          x + waveLen,
          y
        );
      }
      ctx.stroke();
    }
    ctx.restore();

    ctx.restore();
  }

  /**
   * 2. Render landmass mask with concentric coastal ripples, auto-beaching, and copperplate hatching
   */
  private static renderLandmassWithCoastlines(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    maskCanvas: HTMLCanvasElement,
    ripples: number,
    coastlineColor: string,
    shallowColor: string,
    autoBeaching: boolean = false,
    coastlineHatching: boolean = false
  ): void {
    ctx.save();

    // Step A0: Luminous shallow water shelf & coastal glow (vibrant ambient halo around all coasts)
    ctx.save();
    ctx.shadowColor = shallowColor || '#5ea89e';
    ctx.shadowBlur = 22;
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.restore();

    ctx.save();
    ctx.shadowColor = shallowColor || '#76c4b8';
    ctx.shadowBlur = 10;
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.restore();

    // Step A0.5: Auto-beaching (warm golden shallow sand barrier & turquoise surf)
    if (autoBeaching) {
      ctx.save();
      ctx.shadowColor = '#d4b982';
      ctx.shadowBlur = 8;
      ctx.drawImage(maskCanvas, 0, 0, width, height);
      ctx.restore();

      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 18;
      ctx.drawImage(maskCanvas, 0, 0, width, height);
      ctx.restore();
    }

    // Step A1: Coastal ripples around landmass
    if (ripples > 0) {
      ctx.save();
      for (let i = ripples; i >= 1; i--) {
        const blurAmount = i * 4.5;
        ctx.shadowColor = shallowColor;
        ctx.shadowBlur = blurAmount;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(maskCanvas, 0, 0, width, height);
      }
      ctx.restore();

      // Sharp white/cyan foam contour edge
      ctx.save();
      ctx.shadowColor = coastlineColor;
      ctx.shadowBlur = 4;
      ctx.drawImage(maskCanvas, 0, 0, width, height);
      ctx.restore();
    }

    // Step A2: Historical Copperplate Hatching (concentric engraving pen lines)
    if (coastlineHatching) {
      ctx.save();
      for (let r = 1; r <= 3; r++) {
        ctx.shadowColor = 'rgba(43, 35, 24, 0.45)';
        ctx.shadowBlur = r * 3;
        ctx.drawImage(maskCanvas, 0, 0, width, height);
      }
      ctx.restore();
    }

    // Step B: Solid land base fill
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(maskCanvas, 0, 0, width, height);
      tCtx.globalCompositeOperation = 'source-in';
      tCtx.fillStyle = '#e8d8b5'; // Natural parchment / limestone base
      tCtx.fillRect(0, 0, width, height);

      ctx.drawImage(tempCanvas, 0, 0, width, height);
    }

    // Step C: Coastline dark ink stroke
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#2b2318';
    ctx.lineWidth = 2;
    // Outline using edge shadow trick or draw mask contour
    ctx.shadowColor = '#2b2318';
    ctx.shadowBlur = 1.5;
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.restore();

    ctx.restore();
  }

  /**
   * 3. Render painted textures clipped only to landmass
   */
  private static renderTexturesMasked(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    maskCanvas: HTMLCanvasElement,
    textureCanvas: HTMLCanvasElement
  ): void {
    ctx.save();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) {
      ctx.restore();
      return;
    }

    // Draw mask first
    tCtx.drawImage(maskCanvas, 0, 0, width, height);
    // Mask textures with source-in
    tCtx.globalCompositeOperation = 'source-in';
    tCtx.drawImage(textureCanvas, 0, 0, width, height);

    // Composite painted textures onto main canvas
    ctx.drawImage(tempCanvas, 0, 0, width, height);
    ctx.restore();
  }

  /**
   * Helper: Map 0..255 elevation to realistic cartographic topographic false-colors
   */
  private static getTopographicRgb(val: number): [number, number, number] {
    if (val <= 60) {
      // Abyssal deep ocean (#061e38 -> #0c4a6e)
      const t = Math.max(0, Math.min(1, val / 60));
      return [Math.round(6 + t * 6), Math.round(30 + t * 44), Math.round(56 + t * 54)];
    } else if (val <= 127) {
      // Ocean shallows (#0c4a6e -> #0284c7)
      const t = (val - 60) / 67;
      return [Math.round(12 - t * 10), Math.round(74 + t * 58), Math.round(110 + t * 89)];
    } else if (val <= 135) {
      // Coastline / Beach (#0284c7 -> #ecd69a)
      const t = (val - 127) / 8;
      return [Math.round(236 * t + (1 - t) * 2), Math.round(214 * t + (1 - t) * 132), Math.round(154 * t + (1 - t) * 199)];
    } else if (val <= 165) {
      // Lowland meadow green (#16a34a -> #22c55e)
      const t = (val - 135) / 30;
      return [Math.round(22 + t * 12), Math.round(163 + t * 34), Math.round(74 - t * 20)];
    } else if (val <= 195) {
      // Midland plateau amber/gold (#ca8a04 -> #ea580c)
      const t = (val - 165) / 30;
      return [Math.round(202 + t * 32), Math.round(138 - t * 50), Math.round(4 + t * 8)];
    } else if (val <= 228) {
      // Mountain rocky ridge / crimson slate (#991b1b -> #57534e)
      const t = (val - 195) / 33;
      return [Math.round(153 - t * 66), Math.round(27 + t * 56), Math.round(27 + t * 51)];
    } else {
      // Glacial alpine summit (#57534e -> #ffffff)
      const t = Math.min(1, (val - 228) / 27);
      return [Math.round(87 + t * 168), Math.round(83 + t * 172), Math.round(78 + t * 177)];
    }
  }

  /**
   * 4A. Relief Hillshading (NW directional sunlight sculpting) with optional vector contour lines
   */
  private static renderReliefShading(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elevationCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    showContourLines: boolean = false,
    contourInterval: number = 250,
    elevationConfig: WorldElevationConfig = DEFAULT_WORLD_ELEVATION
  ): void {
    const eCtx = elevationCanvas.getContext('2d');
    const mCtx = maskCanvas.getContext('2d');
    if (!eCtx || !mCtx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    const eData = eCtx.getImageData(0, 0, width, height);
    const mData = mCtx.getImageData(0, 0, width, height);
    const ePix = eData.data;
    const mPix = mData.data;

    const outImg = tCtx.createImageData(width, height);
    const outPix = outImg.data;

    // NW directional hillshading on land pixels
    for (let y = 1; y < height - 1; y++) {
      const rowIdx = y * width;
      const prevRowIdx = (y - 1) * width;
      const nextRowIdx = (y + 1) * width;

      for (let x = 1; x < width - 1; x++) {
        const i = (rowIdx + x) * 4;
        if (mPix[i + 3] < 30) continue; // Ocean pixel

        const eAlpha = ePix[i + 3];
        if (eAlpha === 0) continue; // Untouched elevation

        const curH = ePix[i];
        const nwIdx = (prevRowIdx + (x - 1)) * 4;
        const seIdx = (nextRowIdx + (x + 1)) * 4;

        const nwH = ePix[nwIdx + 3] > 0 ? ePix[nwIdx] : 128;
        const seH = ePix[seIdx + 3] > 0 ? ePix[seIdx] : 128;

        const slope = (curH - seH) + (nwH - curH);

        if (slope > 2) {
          // NW sunlit highlight
          const intensity = Math.min(180, Math.round(slope * 4.5));
          outPix[i] = 255;
          outPix[i + 1] = 255;
          outPix[i + 2] = 255;
          outPix[i + 3] = intensity;
        } else if (slope < -2) {
          // SE shadow
          const intensity = Math.min(190, Math.round(-slope * 5));
          outPix[i] = 20;
          outPix[i + 1] = 16;
          outPix[i + 2] = 12;
          outPix[i + 3] = intensity;
        }

        // Topographical contour lines overlay (threshold edge-stepping across real elevation meters)
        if (showContourLines && contourInterval > 0) {
          const curMeters = byteToMeters(curH, elevationConfig);
          if (curMeters >= 0) {
            const rIdx = (rowIdx + (x + 1)) * 4;
            const dIdx = (nextRowIdx + x) * 4;
            const rH = ePix[rIdx + 3] > 0 ? ePix[rIdx] : curH;
            const dH = ePix[dIdx + 3] > 0 ? ePix[dIdx] : curH;
            const rMeters = byteToMeters(rH, elevationConfig);
            const dMeters = byteToMeters(dH, elevationConfig);

            const curBin = Math.floor(curMeters / contourInterval);
            const rBin = Math.floor(rMeters / contourInterval);
            const dBin = Math.floor(dMeters / contourInterval);

            if (curBin !== rBin || curBin !== dBin) {
              const indexInterval = contourInterval * 5;
              const curIdxBin = Math.floor(curMeters / indexInterval);
              const rIdxBin = Math.floor(rMeters / indexInterval);
              const dIdxBin = Math.floor(dMeters / indexInterval);
              const isIndex = curIdxBin !== rIdxBin || curIdxBin !== dIdxBin;

              if (isIndex) {
                // Index contour: slightly bolder, antique cartographic sepia ink
                outPix[i] = 42;
                outPix[i + 1] = 30;
                outPix[i + 2] = 18;
                outPix[i + 3] = Math.max(outPix[i + 3], 180);
              } else {
                // Intermediate contour: delicate subtle vintage sepia hairline
                outPix[i] = 68;
                outPix[i + 1] = 52;
                outPix[i + 2] = 34;
                outPix[i + 3] = Math.max(outPix[i + 3], 110);
              }
            }
          }
        }

        // Snow peak caps for high alpine peaks (220+)
        if (curH > 220) {
          const capAlpha = Math.round(((curH - 220) / 35) * 150);
          outPix[i] = 245;
          outPix[i + 1] = 248;
          outPix[i + 2] = 255;
          outPix[i + 3] = Math.max(outPix[i + 3], capAlpha);
        }
      }
    }

    tCtx.putImageData(outImg, 0, 0);

    ctx.save();
    ctx.drawImage(tempCanvas, 0, 0, width, height);
    ctx.restore();
  }

  /**
   * 4B. Topographical Elevation View (Heatmap & contour bands based on real meters)
   */
  private static renderTopographicalHeatmap(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elevationCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    elevationConfig: WorldElevationConfig = DEFAULT_WORLD_ELEVATION
  ): void {
    const eCtx = elevationCanvas.getContext('2d');
    const mCtx = maskCanvas.getContext('2d');
    if (!eCtx || !mCtx) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (!tCtx) return;

    const eData = eCtx.getImageData(0, 0, width, height);
    const mData = mCtx.getImageData(0, 0, width, height);
    const ePix = eData.data;
    const mPix = mData.data;

    const outImg = tCtx.createImageData(width, height);
    const outPix = outImg.data;

    const totalPixels = width * height;
    for (let p = 0; p < totalPixels; p++) {
      const i = p * 4;
      const isLand = mPix[i + 3] > 40;
      const elevAlpha = ePix[i + 3];

      let elevVal: number;
      if (elevAlpha > 10) {
        elevVal = ePix[i];
      } else {
        elevVal = isLand ? 135 : 85;
      }

      // Real Elevation in Meters
      const meters = byteToMeters(elevVal, elevationConfig);
      let [r, g, b] = getTopographicRgbMeters(meters, elevationConfig);

      // Natural topographical contour intervals (every 500m index, 1000m bold)
      const contourMod = Math.abs(meters) % 500;
      if (contourMod < 35) {
        const isMajor = Math.abs(meters) % 2500 < 60 || meters === 0;
        const darkening = isMajor ? 0.65 : 0.82;
        r = Math.round(r * darkening);
        g = Math.round(g * darkening);
        b = Math.round(b * darkening);
      }

      outPix[i] = r;
      outPix[i + 1] = g;
      outPix[i + 2] = b;
      outPix[i + 3] = isLand ? 240 : 190;
    }

    tCtx.putImageData(outImg, 0, 0);

    ctx.save();
    ctx.drawImage(tempCanvas, 0, 0, width, height);

    // Topographic Legend Overlay at bottom-left
    this.renderTopographicLegend(ctx, width, height, elevationConfig);
    ctx.restore();
  }

  /**
   * Render Topographic Legend with Real World Meters
   */
  private static renderTopographicLegend(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    elevationConfig: WorldElevationConfig = DEFAULT_WORLD_ELEVATION
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    const legendW = 320;
    const legendH = 58;
    const legX = 20;
    const legY = height - 80;
    ctx.fillRect(legX, legY, legendW, legendH);
    ctx.strokeRect(legX, legY, legendW, legendH);

    // Color bar
    const barW = legendW - 30;
    const barH = 12;
    const grad = ctx.createLinearGradient(legX + 15, 0, legX + 15 + barW, 0);
    grad.addColorStop(0, '#020b17'); // Trench
    grad.addColorStop(0.2, '#0c4a6e'); // Deep ocean
    grad.addColorStop(0.38, '#38bdf8'); // Continental shelf / shallows
    grad.addColorStop(0.48, '#ecd69a'); // Coastline sand (0m)
    grad.addColorStop(0.55, '#22c55e'); // Lowland plains
    grad.addColorStop(0.70, '#ca8a04'); // Highland plateaus
    grad.addColorStop(0.85, '#9a3412'); // Mountain ridges
    grad.addColorStop(1, '#ffffff'); // Glacial summit
    ctx.fillStyle = grad;
    ctx.fillRect(legX + 15, legY + 24, barW, barH);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(legX + 15, legY + 24, barW, barH);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      elevationConfig.customName ? elevationConfig.customName.toUpperCase() : 'TOPOGRAPHY ELEVATION (METERS)',
      legX + 15,
      legY + 16
    );

    ctx.font = '9px monospace';
    const minStr = `${(elevationConfig.minElevation / 1000).toFixed(0)}k m`;
    const seaStr = `0m`;
    const midStr = `+${(elevationConfig.maxElevation * 0.35 / 1000).toFixed(0)}k m`;
    const maxStr = `+${(elevationConfig.maxElevation / 1000).toFixed(0)}k m`;

    ctx.fillText(minStr, legX + 12, legY + 50);
    ctx.fillText('-200m', legX + 75, legY + 50);
    ctx.fillText(seaStr, legX + 130, legY + 50);
    ctx.fillText(midStr, legX + 195, legY + 50);
    ctx.fillText(maxStr, legX + 265, legY + 50);

    ctx.restore();
  }

  /**
   * 5. Render Paths, Rivers, and Borders (with Tapering & Imperial Highways)
   */
  private static renderPaths(
    ctx: CanvasRenderingContext2D,
    paths: PlacedPath[],
    activeDraft?: {
      points: { x: number; y: number }[];
      color: string;
      width: number;
      style?: PathStyle;
      taper?: boolean;
      doubleLine?: boolean;
      dashPattern?: number[];
    } | null,
    selectedPathId?: string | null
  ): void {
    const allPaths = [...paths];
    if (activeDraft && activeDraft.points.length > 1) {
      allPaths.push({
        id: 'draft',
        style: activeDraft.style || 'river',
        points: activeDraft.points,
        width: activeDraft.width,
        color: activeDraft.color,
        opacity: 0.9,
        smoothed: true,
        taper: activeDraft.taper,
        doubleLine: activeDraft.doubleLine,
        dashPattern: activeDraft.dashPattern,
      });
    }

    for (const p of allPaths) {
      if (p.points.length < 2) continue;

      ctx.save();
      ctx.globalAlpha = p.opacity;

      // Handle Imperial Double-Line Roads / Borders
      if (p.doubleLine) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Outer casing
        ctx.save();
        ctx.lineWidth = p.width + 4;
        ctx.strokeStyle = '#1c1917';
        this.strokeSmoothPath(ctx, p.points, p.smoothed);
        ctx.restore();

        // Inner road fill
        ctx.save();
        ctx.lineWidth = p.width;
        ctx.strokeStyle = p.color;
        this.strokeSmoothPath(ctx, p.points, p.smoothed);
        ctx.restore();

        // Center dashed divider
        ctx.save();
        ctx.lineWidth = Math.max(1, p.width * 0.25);
        ctx.strokeStyle = '#292524';
        ctx.setLineDash([5, 6]);
        this.strokeSmoothPath(ctx, p.points, p.smoothed);
        ctx.restore();
      } else if (p.taper && p.points.length > 2) {
        // Variable-width tapering (broadens towards mouth / end of path)
        const startW = p.startWidth ?? Math.max(1.5, p.width * 0.35);
        const endW = p.endWidth ?? Math.max(p.width, p.width * 1.6);
        const numSegments = p.points.length - 1;

        // If river: bank outline first
        if (p.style === 'river') {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = '#1e3a8a';
          for (let i = 0; i < numSegments; i++) {
            const segProgress = i / numSegments;
            const segW = startW + (endW - startW) * segProgress;
            ctx.lineWidth = segW + 2.5;
            ctx.beginPath();
            ctx.moveTo(p.points[i].x, p.points[i].y);
            ctx.lineTo(p.points[i + 1].x, p.points[i + 1].y);
            ctx.stroke();
          }
        }

        // Core tapered stroke
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = p.color;
        for (let i = 0; i < numSegments; i++) {
          const segProgress = i / numSegments;
          const segW = startW + (endW - startW) * segProgress;
          ctx.lineWidth = segW;
          ctx.beginPath();
          ctx.moveTo(p.points[i].x, p.points[i].y);
          ctx.lineTo(p.points[i + 1].x, p.points[i + 1].y);
          ctx.stroke();
        }

        // Inner light water foam streak for rivers
        if (p.style === 'river') {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
          for (let i = 0; i < numSegments; i++) {
            const segProgress = i / numSegments;
            const segW = (startW + (endW - startW) * segProgress) * 0.35;
            ctx.lineWidth = Math.max(1, segW);
            ctx.beginPath();
            ctx.moveTo(p.points[i].x, p.points[i].y);
            ctx.lineTo(p.points[i + 1].x, p.points[i + 1].y);
            ctx.stroke();
          }
        }
      } else {
        // Standard uniform-width path (Rivers without taper, Roads, Borders, Routes)
        ctx.lineWidth = p.width;
        ctx.strokeStyle = p.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Apply dashed styles for borders and trade routes if no custom dash set
        if (p.dashPattern && p.dashPattern.length > 0) {
          ctx.setLineDash(p.dashPattern);
        } else if (p.style === 'border') {
          ctx.setLineDash([8, 6]);
        } else if (p.style === 'trade_route') {
          ctx.setLineDash([4, 6]);
        } else {
          ctx.setLineDash([]);
        }

        if (p.style === 'river') {
          // River bank outline
          ctx.save();
          ctx.lineWidth = p.width + 2;
          ctx.strokeStyle = '#1e3a8a';
          this.strokeSmoothPath(ctx, p.points, p.smoothed);
          ctx.restore();

          // River body
          this.strokeSmoothPath(ctx, p.points, p.smoothed);

          // River core foam highlight
          ctx.save();
          ctx.lineWidth = Math.max(1.5, p.width * 0.35);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
          this.strokeSmoothPath(ctx, p.points, p.smoothed);
          ctx.restore();
        } else {
          this.strokeSmoothPath(ctx, p.points, p.smoothed);
        }
      }

      // Selection indicator for paths & rivers
      if (selectedPathId === p.id) {
        ctx.save();
        ctx.lineWidth = Math.max(4, p.width + 6);
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([6, 6]);
        this.strokeSmoothPath(ctx, p.points, p.smoothed);
        ctx.restore();
      }

      ctx.restore();
    }
  }

  private static strokeSmoothPath(
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    smoothed: boolean
  ): void {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    if (smoothed && points.length > 2) {
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    } else {
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
    }
    ctx.stroke();
  }

  /**
   * 6. Render Placed Stamps (Sorted by layer & Y coordinate, with tinting)
   */
  private static renderStamps(
    ctx: CanvasRenderingContext2D,
    stamps: PlacedStamp[],
    selectedStampId?: string | null
  ): void {
    const sorted = [...stamps].sort((a, b) => {
      if (a.layer !== b.layer) {
        return a.layer - b.layer;
      }
      return a.y - b.y;
    });

    for (const stamp of sorted) {
      const img = imageManager.getImage(stamp.assetId);
      if (!img) continue;

      ctx.save();
      ctx.globalAlpha = stamp.opacity;
      ctx.translate(stamp.x, stamp.y);

      if (stamp.rotation !== 0) {
        ctx.rotate((stamp.rotation * Math.PI) / 180);
      }

      if (stamp.flipX) {
        ctx.scale(-1, 1);
      }

      const drawW = img.width * stamp.scale * 0.7;
      const drawH = img.height * stamp.scale * 0.7;

      // Seasonal / environmental tinting
      if (stamp.tint && stamp.tint !== '') {
        const tintCanvas = document.createElement('canvas');
        tintCanvas.width = img.width;
        tintCanvas.height = img.height;
        const tiCtx = tintCanvas.getContext('2d');
        if (tiCtx) {
          tiCtx.drawImage(img, 0, 0);
          tiCtx.globalCompositeOperation = 'source-atop';
          tiCtx.fillStyle = stamp.tint;
          tiCtx.globalAlpha = 0.5;
          tiCtx.fillRect(0, 0, img.width, img.height);
          ctx.drawImage(tintCanvas, -drawW / 2, -drawH * 0.75, drawW, drawH);
        } else {
          ctx.drawImage(img, -drawW / 2, -drawH * 0.75, drawW, drawH);
        }
      } else {
        ctx.drawImage(img, -drawW / 2, -drawH * 0.75, drawW, drawH);
      }

      // Selection bounding box indicator
      if (selectedStampId === stamp.id) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(-drawW / 2 - 4, -drawH * 0.75 - 4, drawW + 8, drawH + 8);
        ctx.setLineDash([]);

        // Rotation stem and handle (top center)
        ctx.beginPath();
        ctx.moveTo(0, -drawH * 0.75 - 4);
        ctx.lineTo(0, -drawH * 0.75 - 18);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, -drawH * 0.75 - 18, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 4 corner scale handles
        const handleSize = 7;
        const half = handleSize / 2;
        const cornerPositions = [
          [-drawW / 2 - 4, -drawH * 0.75 - 4],
          [drawW / 2 + 4, -drawH * 0.75 - 4],
          [-drawW / 2 - 4, drawH * 0.25 + 4],
          [drawW / 2 + 4, drawH * 0.25 + 4],
        ];
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        for (const [hx, hy] of cornerPositions) {
          ctx.fillRect(hx - half, hy - half, handleSize, handleSize);
          ctx.strokeRect(hx - half, hy - half, handleSize, handleSize);
        }
      }

      ctx.restore();
    }
  }

  /**
   * 7. Render Fantasy Labels & Annotations (with scale, custom font colors, boxes & curved text)
   */
  private static renderLabels(
    ctx: CanvasRenderingContext2D,
    labels: PlacedText[],
    selectedLabelId?: string | null
  ): void {
    for (const label of labels) {
      ctx.save();
      ctx.translate(label.x, label.y);

      if (label.rotation !== 0) {
        ctx.rotate((label.rotation * Math.PI) / 180);
      }

      const effectiveFontSize = Math.max(8, Math.round(label.fontSize * (label.scale ?? 1.0)));
      ctx.font = `bold ${effectiveFontSize}px ${label.fontFamily}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const metrics = ctx.measureText(label.text);
      const textW = metrics.width + label.letterSpacing * label.text.length;
      const textH = effectiveFontSize * 1.35;

      const boxColor = label.boxColor || '#fef3c7';
      const boxBorderColor = label.boxBorderColor || '#92400e';
      const boxOpacity = label.boxOpacity ?? 0.88;

      // Banner background styling
      if (label.bannerStyle === 'box_simple') {
        ctx.save();
        ctx.globalAlpha = boxOpacity;
        const padX = 16;
        const padY = 6;
        const bx = -textW / 2 - padX;
        const by = -textH / 2 - padY;
        const bw = textW + padX * 2;
        const bh = textH + padY * 2;

        ctx.fillStyle = boxColor;
        ctx.strokeStyle = boxBorderColor;
        ctx.lineWidth = 2;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();
      } else if (label.bannerStyle === 'parchment_ribbon') {
        ctx.save();
        ctx.globalAlpha = boxOpacity;
        const padX = 26;
        const padY = 8;
        const bx = -textW / 2 - padX;
        const by = -textH / 2 - padY;
        const bw = textW + padX * 2;
        const bh = textH + padY * 2;

        // Ribbon notch tail left & right
        ctx.fillStyle = boxBorderColor;
        ctx.beginPath();
        ctx.moveTo(bx, by + 4);
        ctx.lineTo(bx - 12, by + bh / 2);
        ctx.lineTo(bx, by + bh - 4);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(bx + bw, by + 4);
        ctx.lineTo(bx + bw + 12, by + bh / 2);
        ctx.lineTo(bx + bw, by + bh - 4);
        ctx.fill();

        // Banner plaque
        ctx.fillStyle = boxColor;
        ctx.strokeStyle = boxBorderColor;
        ctx.lineWidth = 2.5;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();
      } else if (label.bannerStyle === 'stone_plaque') {
        ctx.save();
        ctx.globalAlpha = boxOpacity;
        const padX = 20;
        const padY = 8;
        const bx = -textW / 2 - padX;
        const by = -textH / 2 - padY;
        const bw = textW + padX * 2;
        const bh = textH + padY * 2;

        ctx.fillStyle = boxColor || '#334155';
        ctx.strokeStyle = boxBorderColor || '#94a3b8';
        ctx.lineWidth = 3;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.restore();
      } else if (label.bannerStyle === 'royal_banner' || label.bannerStyle === 'scroll') {
        ctx.save();
        ctx.globalAlpha = boxOpacity;
        const padX = 24;
        const padY = 10;
        const bx = -textW / 2 - padX;
        const by = -textH / 2 - padY;
        const bw = textW + padX * 2;
        const bh = textH + padY * 2;

        ctx.fillStyle = boxColor;
        ctx.strokeStyle = boxBorderColor;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (typeof (ctx as any).roundRect === 'function') {
          (ctx as any).roundRect(bx, by, bw, bh, 8);
        } else {
          ctx.rect(bx, by, bw, bh);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Render Text Glyphs
      const curvature = label.curvature || 0;
      if (Math.abs(curvature) > 1) {
        const chars = label.text.split('');
        const charCount = chars.length;
        const isSmile = curvature < 0;
        const R = Math.max(90, (charCount * effectiveFontSize * 0.8) / (Math.abs(curvature) * 0.035));
        const totalAngle = (charCount * (effectiveFontSize * 0.65 + label.letterSpacing)) / R;
        const startAngle = -totalAngle / 2;

        ctx.save();
        for (let c = 0; c < charCount; c++) {
          const char = chars[c];
          const angle = startAngle + (c / Math.max(1, charCount - 1)) * totalAngle;
          const charX = R * Math.sin(angle);
          // In canvas, positive Y is down.
          // Arch (curvature > 0): ends curve down (Y > 0)
          // Smile (curvature < 0): ends curve up (Y < 0)
          const charY = isSmile ? -R * (1 - Math.cos(angle)) : R * (1 - Math.cos(angle));
          const charRot = isSmile ? -angle : angle;

          ctx.save();
          ctx.translate(charX, charY);
          ctx.rotate(charRot);

          if (label.stylePreset === 'imperial_spaced') {
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 4;
          }

          if (label.strokeWidth > 0) {
            ctx.strokeStyle = label.strokeColor;
            ctx.lineWidth = label.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(char, 0, 0);
          }
          ctx.fillStyle = label.color;
          ctx.fillText(char, 0, 0);
          ctx.restore();
        }
        ctx.restore();
      } else {
        if (label.stylePreset === 'imperial_spaced') {
          ctx.save();
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6;
          if (label.strokeWidth > 0) {
            ctx.strokeStyle = label.strokeColor;
            ctx.lineWidth = label.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(label.text, 0, 0);
          }
          ctx.fillStyle = label.color;
          ctx.fillText(label.text, 0, 0);
          ctx.restore();
        } else {
          if (label.strokeWidth > 0) {
            ctx.strokeStyle = label.strokeColor;
            ctx.lineWidth = label.strokeWidth;
            ctx.lineJoin = 'round';
            ctx.strokeText(label.text, 0, 0);
          }
          ctx.fillStyle = label.color;
          ctx.fillText(label.text, 0, 0);
        }
      }

      // Selection indicator for label
      if (selectedLabelId === label.id) {
        const padX = label.bannerStyle !== 'none' ? 32 : 12;
        const padY = label.bannerStyle !== 'none' ? 12 : 8;
        const bx = -textW / 2 - padX;
        const by = -textH / 2 - padY;
        const bw = textW + padX * 2;
        const bh = textH + padY * 2;

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(bx, by, bw, bh);
        ctx.setLineDash([]);

        // Rotation stem and knob
        ctx.beginPath();
        ctx.moveTo(0, by);
        ctx.lineTo(0, by - 16);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, by - 16, 5, 0, Math.PI * 2);
        ctx.fill();

        // Corner handles
        const handleSize = 6;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        const corners = [
          [bx, by],
          [bx + bw, by],
          [bx, by + bh],
          [bx + bw, by + bh],
        ];
        for (const [hx, hy] of corners) {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        }
      }

      ctx.restore();
    }
  }

  /**
   * 9. Atmosphere Layer: Controls Light (Day, Golden Hour, Sunset, Twilight, Night, Torchlight, Overcast)
   * and Seasonal Static Particle Fill (Snow/Frost, Autumn Leaves, Spring Blossom, Desert Sand)
   * with NO clouds.
   */
  private static renderAtmosphereLayer(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    atmosphere: AtmosphereFilter
  ): void {
    ctx.save();

    // 1. Ambient Lighting & Day-Night cycle
    const timeOfDay = atmosphere.timeOfDay || 'day';
    const intensity = atmosphere.lightIntensity ?? 0.7;

    if (intensity > 0) {
      if (timeOfDay === 'golden_hour') {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, `rgba(255, 190, 60, ${0.45 * intensity})`);
        grad.addColorStop(1, `rgba(217, 119, 6, ${0.35 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (timeOfDay === 'sunset') {
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        const grad = ctx.createLinearGradient(0, height * 0.3, width, height);
        grad.addColorStop(0, `rgba(239, 68, 68, ${0.35 * intensity})`);
        grad.addColorStop(0.6, `rgba(245, 158, 11, ${0.4 * intensity})`);
        grad.addColorStop(1, `rgba(76, 29, 149, ${0.5 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (timeOfDay === 'twilight') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, `rgba(30, 27, 75, ${0.48 * intensity})`);
        grad.addColorStop(1, `rgba(88, 28, 135, ${0.38 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (timeOfDay === 'night') {
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        const grad = ctx.createRadialGradient(
          width * 0.4,
          height * 0.35,
          width * 0.1,
          width * 0.5,
          height * 0.5,
          width * 0.75
        );
        grad.addColorStop(0, `rgba(15, 23, 42, ${0.65 * intensity})`);
        grad.addColorStop(1, `rgba(2, 6, 23, ${0.85 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        // Moonlit specular tint
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = `rgba(186, 230, 253, ${0.12 * intensity})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (timeOfDay === 'torchlight') {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        const grad = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          width * 0.05,
          width * 0.5,
          height * 0.5,
          width * 0.65
        );
        grad.addColorStop(0, `rgba(251, 146, 60, ${0.55 * intensity})`);
        grad.addColorStop(0.7, `rgba(180, 83, 9, ${0.35 * intensity})`);
        grad.addColorStop(1, `rgba(15, 23, 42, ${0.6 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (timeOfDay === 'overcast') {
        ctx.save();
        ctx.globalCompositeOperation = 'color';
        ctx.fillStyle = `rgba(100, 116, 139, ${0.4 * intensity})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (timeOfDay === 'day' && (atmosphere.warmth ?? 0) !== 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        const w = atmosphere.warmth;
        ctx.fillStyle =
          w > 0
            ? `rgba(254, 240, 138, ${Math.abs(w) * 0.3 * intensity})`
            : `rgba(186, 230, 253, ${Math.abs(w) * 0.3 * intensity})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }

    // 2. Static Particle Physics / Seasonal Fill (NO animations, deterministic static fill)
    const season = atmosphere.seasonFill || 'none';
    if (season !== 'none') {
      const density = atmosphere.seasonDensity ?? 0.5;
      const baseSize = atmosphere.seasonParticleSize ?? 2;
      const particleCount = Math.round(((width * height) / 3800) * density);

      ctx.save();
      for (let i = 0; i < particleCount; i++) {
        // High quality deterministic pseudo-random hash
        const hash1 = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
        const hash2 = Math.abs(Math.sin(i * 93.9898 + 67.345) * 24634.6345) % 1;
        const hash3 = Math.abs(Math.sin(i * 45.1234 + 19.876) * 58372.1294) % 1;

        const px = hash1 * width;
        const py = hash2 * height;
        const pSize = Math.max(0.8, baseSize * (0.5 + hash3 * 0.9));
        const pAlpha = 0.25 + hash3 * 0.65;

        if (season === 'snow_winter') {
          // Delicate multi-toned snow flakes and frost crystals
          const isIceBlue = hash3 > 0.7;
          ctx.fillStyle = isIceBlue
            ? `rgba(224, 242, 254, ${pAlpha * 0.9})`
            : `rgba(255, 255, 255, ${pAlpha})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === 'autumn_leaves') {
          // Warm russet, amber, gold and crimson leaf flecks
          const hues = ['#d97706', '#b45309', '#dc2626', '#ca8a04', '#92400e'];
          const color = hues[Math.floor(hash3 * hues.length)];
          ctx.fillStyle = color;
          ctx.globalAlpha = pAlpha * 0.85;
          ctx.beginPath();
          ctx.ellipse(px, py, pSize * 1.4, pSize * 0.8, hash3 * Math.PI, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === 'spring_blossom') {
          // Soft sakura pink, blush and gold pollen motes
          const hues = ['rgba(251, 207, 232, ', 'rgba(244, 114, 182, ', 'rgba(254, 240, 138, '];
          const colorPrefix = hues[Math.floor(hash3 * hues.length)];
          ctx.fillStyle = `${colorPrefix}${pAlpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize * 1.1, 0, Math.PI * 2);
          ctx.fill();
        } else if (season === 'desert_sand') {
          // Fine arid sand and golden dust granules
          ctx.fillStyle = `rgba(217, 119, 6, ${pAlpha * 0.45})`;
          ctx.beginPath();
          ctx.arc(px, py, pSize * 0.75, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // 3. Antique Vignette Edge Falloff
    const vignette = atmosphere.vignette ?? 0;
    if (vignette > 0.05) {
      ctx.save();
      const vigGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        Math.min(width, height) * 0.35,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.75
      );
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.7, `rgba(20, 15, 10, ${vignette * 0.4})`);
      vigGrad.addColorStop(1, `rgba(15, 10, 5, ${vignette * 0.85})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * 8. Render Grid, Nautical Rhumb Lines & Alphanumeric Border Coordinates
   */
  private static renderGrid(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    grid: GridConfig
  ): void {
    ctx.save();

    // 8A. Nautical Rhumb Lines (Compass Rose Navigation Rays)
    if (grid.showRhumbLines) {
      this.renderRhumbLines(ctx, width, height);
    }

    // 8B. Base Coordinate Grid (Square, Hex, Isometric)
    if (grid.type !== 'none') {
      ctx.strokeStyle = grid.color;
      ctx.lineWidth = grid.lineWidth;
      const size = Math.max(20, grid.size);

      if (grid.type === 'square') {
        ctx.beginPath();
        for (let x = 0; x <= width; x += size) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += size) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      } else if (grid.type === 'hex_flat' || grid.type === 'hex_pointy') {
        const isFlat = grid.type === 'hex_flat';
        const r = size / 2;
        const h = isFlat ? r * Math.sqrt(3) : r * 2;
        const w = isFlat ? r * 2 : r * Math.sqrt(3);

        const dx = isFlat ? r * 1.5 : w;
        const dy = isFlat ? h : r * 1.5;

        ctx.beginPath();
        for (let cy = 0; cy < height + h; cy += dy) {
          for (let cx = 0; cx < width + w; cx += dx) {
            const shiftY = (isFlat && Math.floor(cx / dx) % 2 === 1) ? h / 2 : 0;
            const shiftX = (!isFlat && Math.floor(cy / dy) % 2 === 1) ? w / 2 : 0;
            this.drawHexagon(ctx, cx + shiftX, cy + shiftY, r, isFlat);
          }
        }
        ctx.stroke();
      } else if (grid.type === 'isometric') {
        ctx.beginPath();
        const diag = size * 1.5;
        for (let d = -height; d < width + height; d += diag) {
          ctx.moveTo(d, 0);
          ctx.lineTo(d + height * 1.732, height);
          ctx.moveTo(d, 0);
          ctx.lineTo(d - height * 1.732, height);
        }
        ctx.stroke();
      }
    }

    // 8C. Alphanumeric Margin Coordinates (A-Z, 1-50)
    if (grid.showCoordinates) {
      this.renderMarginCoordinates(ctx, width, height, Math.max(30, grid.size));
    }

    ctx.restore();
  }

  /**
   * Render authentic nautical 16-point navigation compass rays (Portolan chart style)
   */
  private static renderRhumbLines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const centers = [
      { cx: width * 0.25, cy: height * 0.35 },
      { cx: width * 0.75, cy: height * 0.65 },
    ];

    const diag = Math.hypot(width, height);
    for (const c of centers) {
      ctx.save();
      // Draw 16 directional rays
      for (let i = 0; i < 16; i++) {
        const angle = (i * Math.PI) / 8;
        const isCardinal = i % 4 === 0;
        const isIntercardinal = i % 2 === 0;

        ctx.strokeStyle = isCardinal ? '#991b1b' : isIntercardinal ? '#1e3a8a' : 'rgba(71, 85, 105, 0.45)';
        ctx.lineWidth = isCardinal ? 1.4 : 0.8;
        ctx.setLineDash(isCardinal ? [] : [10, 8]);

        ctx.beginPath();
        ctx.moveTo(c.cx, c.cy);
        ctx.lineTo(c.cx + Math.cos(angle) * diag, c.cy + Math.sin(angle) * diag);
        ctx.stroke();
      }

      // Compass center rose ornament
      ctx.setLineDash([]);
      ctx.fillStyle = '#991b1b';
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#1e3a8a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(c.cx, c.cy, 14, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  /**
   * Render Margin Alphanumeric Reference Ticks (A-Z along columns, 1-50 along rows)
   */
  private static renderMarginCoordinates(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cellSize: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cols = Math.floor(width / cellSize);
    for (let c = 0; c < cols; c++) {
      const letter = String.fromCharCode(65 + (c % 26));
      const x = c * cellSize + cellSize / 2;
      ctx.fillText(letter, x, 14);
      ctx.fillText(letter, x, height - 14);
    }

    const rows = Math.floor(height / cellSize);
    for (let r = 0; r < rows; r++) {
      const num = `${r + 1}`;
      const y = r * cellSize + cellSize / 2;
      ctx.fillText(num, 14, y);
      ctx.fillText(num, width - 14, y);
    }
    ctx.restore();
  }

  private static drawHexagon(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    flatTop: boolean
  ): void {
    const angleOffset = flatTop ? 0 : Math.PI / 6;
    for (let i = 0; i < 6; i++) {
      const angle = angleOffset + (i * Math.PI) / 3;
      const px = x + radius * Math.cos(angle);
      const py = y + radius * Math.sin(angle);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  /**
   * Export high-resolution rendered image with optional supersampling (1x, 2x, 4x)
   */
  public static async exportHighResolution(
    options: RenderContextOptions,
    scaleFactor: number = 2,
    includeLegend: boolean = true,
    parchmentOptions?: ParchmentFilterOptions,
    outputFormat: 'image/png' | 'image/jpeg' = 'image/png'
  ): Promise<string> {
    const targetW = options.width * scaleFactor;
    const targetH = options.height * scaleFactor;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const eCtx = exportCanvas.getContext('2d');
    if (!eCtx) throw new Error('Could not create high resolution export canvas');

    eCtx.imageSmoothingEnabled = true;
    eCtx.imageSmoothingQuality = 'high';

    // Scale offscreen canvases
    const scaledMask = document.createElement('canvas');
    scaledMask.width = targetW;
    scaledMask.height = targetH;
    const sMaskCtx = scaledMask.getContext('2d')!;
    sMaskCtx.drawImage(options.maskCanvas, 0, 0, targetW, targetH);

    const scaledTexture = document.createElement('canvas');
    scaledTexture.width = targetW;
    scaledTexture.height = targetH;
    const sTexCtx = scaledTexture.getContext('2d')!;
    sTexCtx.drawImage(options.textureCanvas, 0, 0, targetW, targetH);

    const scaledElevation = document.createElement('canvas');
    scaledElevation.width = targetW;
    scaledElevation.height = targetH;
    const sElevCtx = scaledElevation.getContext('2d')!;
    sElevCtx.drawImage(options.elevationCanvas, 0, 0, targetW, targetH);

    // Scale stamps & paths coordinates
    const scaledStamps = options.stamps.map((s) => ({
      ...s,
      x: s.x * scaleFactor,
      y: s.y * scaleFactor,
      scale: s.scale * scaleFactor,
    }));

    const scaledPaths = options.paths.map((p) => ({
      ...p,
      width: p.width * scaleFactor,
      points: p.points.map((pt) => ({ x: pt.x * scaleFactor, y: pt.y * scaleFactor })),
    }));

    const scaledLabels = options.labels.map((l) => ({
      ...l,
      x: l.x * scaleFactor,
      y: l.y * scaleFactor,
      fontSize: l.fontSize * scaleFactor,
      strokeWidth: l.strokeWidth * scaleFactor,
    }));

    const scaledGrid = {
      ...options.grid,
      size: options.grid.size * scaleFactor,
      lineWidth: options.grid.lineWidth * scaleFactor,
    };

    // Render scaled scene
    this.render({
      ...options,
      ctx: eCtx,
      width: targetW,
      height: targetH,
      maskCanvas: scaledMask,
      textureCanvas: scaledTexture,
      elevationCanvas: scaledElevation,
      stamps: scaledStamps,
      paths: scaledPaths,
      labels: scaledLabels,
      grid: scaledGrid,
      highResScale: scaleFactor,
    });

    let finalCanvas = exportCanvas;
    if (parchmentOptions?.enabled) {
      finalCanvas = CannyParchmentFilter.process(exportCanvas, parchmentOptions);
    }

    return finalCanvas.toDataURL(outputFormat, outputFormat === 'image/jpeg' ? 0.92 : 1.0);
  }

  /**
   * Export topographical elevation grayscale heightmap
   */
  public static exportHeightmap(
    elevationCanvas: HTMLCanvasElement,
    maskCanvas: HTMLCanvasElement,
    width: number,
    height: number
  ): string {
    const hCanvas = document.createElement('canvas');
    hCanvas.width = width;
    hCanvas.height = height;
    const hCtx = hCanvas.getContext('2d')!;

    // Draw elevation grayscale map
    hCtx.fillStyle = '#000000';
    hCtx.fillRect(0, 0, width, height);

    hCtx.drawImage(elevationCanvas, 0, 0, width, height);

    // Mask to landmass so water is zero elevation (black)
    hCtx.globalCompositeOperation = 'destination-in';
    hCtx.drawImage(maskCanvas, 0, 0, width, height);

    return hCanvas.toDataURL('image/png');
  }
}
