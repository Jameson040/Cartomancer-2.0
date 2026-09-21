/**
 * High-resolution multi-sampling export and heightmap extraction.
 */
import { RenderContextOptions } from '../../types';
import { CannyParchmentFilter, ParchmentFilterOptions } from '../cannyEdgeFilter';

export async function exportHighResolution(
  options: RenderContextOptions,
  scaleFactor: number = 2,
  includeLegend: boolean = true,
  parchmentOptions?: ParchmentFilterOptions,
  outputFormat: 'image/png' | 'image/jpeg' = 'image/png',
  renderFn?: (opts: RenderContextOptions) => void
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

  if (renderFn) {
    renderFn({
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
  }

  let finalCanvas = exportCanvas;
  if (parchmentOptions?.enabled) {
    finalCanvas = CannyParchmentFilter.process(exportCanvas, parchmentOptions);
  }

  return finalCanvas.toDataURL(outputFormat, outputFormat === 'image/jpeg' ? 0.92 : 1.0);
}

export function exportHeightmap(
  elevationCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  width: number,
  height: number
): string {
  const hCanvas = document.createElement('canvas');
  hCanvas.width = width;
  hCanvas.height = height;
  const hCtx = hCanvas.getContext('2d')!;

  hCtx.fillStyle = '#000000';
  hCtx.fillRect(0, 0, width, height);

  hCtx.drawImage(elevationCanvas, 0, 0, width, height);

  // Mask to landmass so water is zero elevation (black)
  hCtx.globalCompositeOperation = 'destination-in';
  hCtx.drawImage(maskCanvas, 0, 0, width, height);

  return hCanvas.toDataURL('image/png');
}
