/**
 * Cartomancer Fantasy Map Maker - High Performance Canvas Rendering Engine
 * Modularized coordinator delegating to domain-specific rendering submodules.
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
import { ParchmentFilterOptions } from './cannyEdgeFilter';
import {
  renderWater,
  renderLandmassWithCoastlines,
  renderTexturesMasked,
  renderReliefShading,
  renderTopographicalHeatmap,
  renderTopographicLegend,
  renderPaths,
  renderPathsMasked,
  renderStamps,
  renderLabels,
  renderAtmosphereLayer,
  renderGrid,
  exportHighResolution as exportHighResInternal,
  exportHeightmap as exportHeightmapInternal,
  BiomePatternManager,
} from './rendering';

export type { RenderContextOptions };

export class CanvasRenderer {
  public static invalidatePatternCache(biomeId?: string): void {
    BiomePatternManager.invalidatePatternCache(biomeId);
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
      renderWater(ctx, width, height, waterDeepColor, waterShallowColor);
      ctx.globalAlpha = 1.0;
    }

    // 2. LANDMASS & COASTLINES
    if (layers.landmass.visible) {
      ctx.globalAlpha = layers.landmass.opacity;
      renderLandmassWithCoastlines(
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
      renderTexturesMasked(ctx, width, height, maskCanvas, textureCanvas);
      ctx.globalAlpha = 1.0;
    }

    // 4. ELEVATION / TOPOGRAPHY LAYER
    if (layers.elevation.visible) {
      ctx.globalAlpha = layers.elevation.opacity;
      if (topographicalView) {
        renderTopographicalHeatmap(ctx, width, height, elevationCanvas, maskCanvas, elevationConfig);
      } else {
        renderReliefShading(
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

    // 6. STAMPS / ASSETS (Depth sorted)
    if (layers.stamps.visible) {
      ctx.globalAlpha = layers.stamps.opacity;
      renderStamps(ctx, stamps, selectedStampId);
      ctx.globalAlpha = 1.0;
    }

    // 7. LABELS & TEXT
    if (layers.labels.visible) {
      ctx.globalAlpha = layers.labels.opacity;
      renderLabels(ctx, labels, selectedLabelId);
      ctx.globalAlpha = 1.0;
    }

    // 8. GRID OVERLAY & NAUTICAL RHUMB LINES
    if (layers.grid.visible && (grid.type !== 'none' || grid.showRhumbLines || grid.showCoordinates)) {
      ctx.globalAlpha = layers.grid.opacity * grid.opacity;
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
