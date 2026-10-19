/**
 * Cartomancer Fantasy Map Maker - High Performance Canvas Rendering Engine
 * Modularized coordinator delegating to domain-specific rendering submodules.
 * Features a persistent Composite Terrain Base Cache so stamp, path, territory,
 * and label interactions render in <1ms even on 2K–4K canvases.
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
  BiomeTexture,
  RenderContextOptions,
} from '../types';
import { imageManager } from './imageManager';
import { DEFAULT_WORLD_ELEVATION } from './elevationModel';
import { renderHeightfieldOverlay } from './rendering/renderHeightfieldOverlay';
import { ParchmentFilterOptions } from './cannyEdgeFilter';
import {
  renderWater,
  renderLandmassWithCoastlines,
  renderTexturesMasked,
  renderReliefShading,
  renderTopographicalHeatmap,
  renderTopographicLegend,
  invalidateReliefCache,
  getReliefGeneration,
  renderPaths,
  renderPathsMasked,
  renderStamps,
  renderLabels,
  renderAtmosphereLayer,
  renderGrid,
  renderTerritories,
  exportHighResolution as exportHighResInternal,
  exportHeightmap as exportHeightmapInternal,
  BiomePatternManager,
} from './rendering';

export type { RenderContextOptions };

let waterLayerScratchCanvas: HTMLCanvasElement | null = null;
let waterLayerScratchCtx: CanvasRenderingContext2D | null = null;

let baseTerrainCacheCanvas: HTMLCanvasElement | null = null;
let baseTerrainCacheCtx: CanvasRenderingContext2D | null = null;
let baseTerrainCacheKey = '';
let terrainGeneration = 0;

export class CanvasRenderer {
  public static invalidatePatternCache(biomeId?: string): void {
    BiomePatternManager.invalidatePatternCache(biomeId);
    this.invalidateTerrainCache('textures');
  }

  /**
   * Invalidates the cached terrain composite layer (and optionally the CPU hillshade relief buffer).
   * Call with 'textures' when only biome/water textures changed; call with 'all' (default) when landmass mask or elevation changed.
   */
  public static invalidateTerrainCache(scope: 'all' | 'textures' | 'relief' = 'all'): void {
    terrainGeneration++;
    baseTerrainCacheKey = '';
    if (scope === 'all' || scope === 'relief') {
      invalidateReliefCache();
    }
  }

  /**
   * Main multi-pass canvas renderer
   */
  public static render(options: RenderContextOptions): void {
    const {
      ctx,
      width,
      height,
      maskCanvas,
      textureCanvas,
      waterTextureCanvas,
      elevationCanvas,
      heightField,
      showHeightfieldOverlay = false,
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
      selectedStampIds,
      selectedLabelId,
      activePathDraft,
    } = options;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Build deterministic key for Steps 1–4 (Water + Landmass + Underlays + Biomes + Relief)
    const refKey = options.referenceMap?.visible
      ? `${options.referenceMap.imageUrl}:${options.referenceMap.opacity}:${options.referenceMap.blendMode}`
      : 'none';
    const impKey = options.importedMapLayer?.visible
      ? `${options.importedMapLayer.imageUrl}:${options.importedMapLayer.opacity}:${options.importedMapLayer.blendMode}`
      : 'none';

    const targetBaseKey = [
      terrainGeneration,
      getReliefGeneration(),
      `${width}x${height}`,
      `w:${layers.water.visible}:${layers.water.opacity}:${waterDeepColor}:${waterShallowColor}`,
      `l:${layers.landmass.visible}:${layers.landmass.opacity}:${coastlineRipples}:${coastlineColor}:${coastlineHatching}:${autoBeaching}`,
      `t:${layers.textures.visible}:${layers.textures.opacity}`,
      `e:${layers.elevation.visible}:${layers.elevation.opacity}:${topographicalView}:${showContourLines}:${contourInterval}:${elevationConfig.minElevation}:${elevationConfig.maxElevation}`,
      `hf:${showHeightfieldOverlay}`,
      refKey,
      impKey,
    ].join('|');

    if (!baseTerrainCacheCanvas) {
      baseTerrainCacheCanvas = document.createElement('canvas');
      baseTerrainCacheCtx = baseTerrainCacheCanvas.getContext('2d');
    }
    if (baseTerrainCacheCanvas.width !== width || baseTerrainCacheCanvas.height !== height) {
      baseTerrainCacheCanvas.width = width;
      baseTerrainCacheCanvas.height = height;
      baseTerrainCacheKey = '';
    }

    if (baseTerrainCacheKey === targetBaseKey && baseTerrainCacheCtx && !showHeightfieldOverlay) {
      // Fast path: Blit cached Terrain + Biomes + Hillshading in 1 GPU call (<0.3ms)
      ctx.drawImage(baseTerrainCacheCanvas, 0, 0, width, height);
    } else {
      const bCtx = baseTerrainCacheCtx || ctx;
      if (baseTerrainCacheCtx) {
        baseTerrainCacheCtx.save();
        baseTerrainCacheCtx.clearRect(0, 0, width, height);
      }

      // 1. WATER / OCEAN LAYER
      if (layers.water.visible) {
        bCtx.globalAlpha = layers.water.opacity;
        renderWater(bCtx, width, height, waterDeepColor, waterShallowColor);
        bCtx.globalAlpha = 1.0;
      }

      // 2. LANDMASS & COASTLINES
      if (layers.landmass.visible) {
        bCtx.globalAlpha = layers.landmass.opacity;
        renderLandmassWithCoastlines(
          bCtx,
          width,
          height,
          maskCanvas,
          coastlineRipples,
          coastlineColor,
          waterShallowColor,
          autoBeaching,
          coastlineHatching
        );
        bCtx.globalAlpha = 1.0;
      }

      // 2.5 REFERENCE MAP (Blueprint / Trace layer)
      if (options.referenceMap && options.referenceMap.visible && options.referenceMap.imageUrl) {
        const refImg = imageManager.getImageByUrl(options.referenceMap.imageUrl);
        if (refImg) {
          bCtx.save();
          bCtx.globalAlpha = options.referenceMap.opacity;
          const blendMode = options.referenceMap.blendMode;
          bCtx.globalCompositeOperation =
            !blendMode || blendMode === 'normal' ? 'source-over' : blendMode;
          bCtx.drawImage(refImg, 0, 0, width, height);
          bCtx.restore();
        }
      }

      // 2.5 FINISHED MAP UNDERLAY
      if (options.importedMapLayer?.visible && options.importedMapLayer.imageUrl) {
        const imported = imageManager.getImageByUrl(options.importedMapLayer.imageUrl);
        if (imported) {
          bCtx.save();
          bCtx.globalAlpha = options.importedMapLayer.opacity;
          bCtx.globalCompositeOperation =
            options.importedMapLayer.blendMode === 'normal'
              ? 'source-over'
              : options.importedMapLayer.blendMode || 'source-over';
          bCtx.drawImage(imported, 0, 0, width, height);
          bCtx.restore();
        }
      }

      // 3. SEPARATED LAND AND WATER TEXTURE PAINTING
      if (layers.textures.visible) {
        bCtx.globalAlpha = layers.textures.opacity;
        renderTexturesMasked(bCtx, width, height, maskCanvas, textureCanvas);

        if (!waterLayerScratchCanvas) {
          waterLayerScratchCanvas = document.createElement('canvas');
          waterLayerScratchCtx = waterLayerScratchCanvas.getContext('2d');
        }
        if (waterLayerScratchCanvas.width !== width || waterLayerScratchCanvas.height !== height) {
          waterLayerScratchCanvas.width = width;
          waterLayerScratchCanvas.height = height;
        }
        if (waterLayerScratchCtx) {
          waterLayerScratchCtx.globalCompositeOperation = 'source-over';
          waterLayerScratchCtx.clearRect(0, 0, width, height);
          waterLayerScratchCtx.drawImage(waterTextureCanvas, 0, 0, width, height);
          waterLayerScratchCtx.globalCompositeOperation = 'destination-out';
          waterLayerScratchCtx.drawImage(maskCanvas, 0, 0, width, height);
          bCtx.drawImage(waterLayerScratchCanvas, 0, 0, width, height);
        }
        bCtx.globalAlpha = 1.0;
      }

      if (showHeightfieldOverlay && heightField) {
        renderHeightfieldOverlay(bCtx, heightField);
      }

      // 4. ELEVATION / TOPOGRAPHY LAYER
      if (layers.elevation.visible) {
        bCtx.globalAlpha = layers.elevation.opacity;
        if (topographicalView) {
          renderTopographicalHeatmap(bCtx, width, height, elevationCanvas, maskCanvas, elevationConfig);
        } else {
          renderReliefShading(
            bCtx,
            width,
            height,
            elevationCanvas,
            maskCanvas,
            showContourLines,
            contourInterval,
            elevationConfig
          );
        }
        bCtx.globalAlpha = 1.0;
      }

      if (baseTerrainCacheCtx) {
        baseTerrainCacheCtx.restore();
        baseTerrainCacheKey = targetBaseKey;
        ctx.drawImage(baseTerrainCacheCanvas, 0, 0, width, height);
      }
    }

    // 5. PATHS & RIVERS
    if (layers.paths.visible) {
      ctx.globalAlpha = layers.paths.opacity;
      if (layers.landmass.visible && maskCanvas) {
        renderPathsMasked(
          ctx,
          width,
          height,
          maskCanvas,
          paths,
          activePathDraft,
          options.selectedPathId,
          options.customBiomes
        );
      } else {
        renderPaths(
          ctx,
          paths,
          activePathDraft,
          options.selectedPathId,
          options.customBiomes
        );
      }
      ctx.globalAlpha = 1.0;
    }

    // 5.5 POLITICAL TERRITORIES & REGIONS
    if ((options.territories && options.territories.length > 0) || options.activeTerritoryDraft) {
      renderTerritories(
        ctx,
        options.territories || [],
        options.selectedTerritoryId,
        options.activeTerritoryDraft,
        options.cursorPos
      );
    }

    // 6. STAMPS / ASSETS (Depth sorted)
    if (layers.stamps.visible) {
      ctx.globalAlpha = layers.stamps.opacity;
      renderStamps(ctx, stamps, selectedStampId, selectedStampIds);
      ctx.globalAlpha = 1.0;
    }

    // 7. LABELS & TEXT
    if (layers.labels.visible) {
      ctx.globalAlpha = layers.labels.opacity;
      renderLabels(ctx, labels, selectedLabelId);
      ctx.globalAlpha = 1.0;
    }

    // 8. GRID OVERLAY, COMPASS ROSE, SCALE BAR & NAUTICAL RHUMB LINES
    if (
      layers.grid.visible &&
      (grid.type !== 'none' ||
        grid.showRhumbLines ||
        grid.showCoordinates ||
        grid.showCompassRose ||
        grid.showScaleBar ||
        grid.showMapBorder)
    ) {
      ctx.globalAlpha = layers.grid.opacity;
      renderGrid(ctx, width, height, grid);
      ctx.globalAlpha = 1.0;
    }

    // 9. ATMOSPHERE & LIGHTING LAYER
    if (layers.atmosphere?.visible && atmosphere) {
      ctx.globalAlpha = layers.atmosphere.opacity;
      renderAtmosphereLayer(ctx, width, height, atmosphere);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }

  /**
   * Export high-resolution rendered image with optional supersampling
   */
  public static async exportHighResolution(
    options: RenderContextOptions,
    scaleFactor: number = 2,
    includeLegend: boolean = true,
    parchmentOptions?: ParchmentFilterOptions,
    outputFormat: 'image/png' | 'image/jpeg' = 'image/png'
  ): Promise<string> {
    this.invalidateTerrainCache('all');
    return exportHighResInternal(
      options,
      scaleFactor,
      includeLegend,
      parchmentOptions,
      outputFormat,
      (opts) => CanvasRenderer.render(opts)
    );
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
    return exportHeightmapInternal(elevationCanvas, maskCanvas, width, height);
  }
}
