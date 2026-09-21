/**
 * Renders directional hillshading relief, topographical heatmaps, and metric elevation legends.
 */
import { WorldElevationConfig } from '../../types';
import {
  DEFAULT_WORLD_ELEVATION,
  byteToMeters,
  getTopographicRgbMeters,
} from '../elevationModel';

export function getTopographicRgb(val: number): [number, number, number] {
  if (val <= 60) {
    const t = Math.max(0, Math.min(1, val / 60));
    return [Math.round(6 + t * 6), Math.round(30 + t * 44), Math.round(56 + t * 54)];
  } else if (val <= 127) {
    const t = (val - 60) / 67;
    return [Math.round(12 - t * 10), Math.round(74 + t * 58), Math.round(110 + t * 89)];
  } else if (val <= 135) {
    const t = (val - 127) / 8;
    return [Math.round(236 * t + (1 - t) * 2), Math.round(214 * t + (1 - t) * 132), Math.round(154 * t + (1 - t) * 199)];
  } else if (val <= 165) {
    const t = (val - 135) / 30;
    return [Math.round(22 + t * 12), Math.round(163 + t * 34), Math.round(74 - t * 20)];
  } else if (val <= 195) {
    const t = (val - 165) / 30;
    return [Math.round(202 + t * 32), Math.round(138 - t * 50), Math.round(4 + t * 8)];
  } else if (val <= 228) {
    const t = (val - 195) / 33;
    return [Math.round(153 - t * 66), Math.round(27 + t * 56), Math.round(27 + t * 51)];
  } else {
    const t = Math.min(1, (val - 228) / 27);
    return [Math.round(87 + t * 168), Math.round(83 + t * 172), Math.round(78 + t * 177)];
  }
}

export function renderReliefShading(
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

      // Topographical contour lines overlay
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
              outPix[i] = 42;
              outPix[i + 1] = 30;
              outPix[i + 2] = 18;
              outPix[i + 3] = Math.max(outPix[i + 3], 180);
            } else {
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

export function renderTopographicLegend(
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
  const maxStr = `${(elevationConfig.maxElevation / 1000).toFixed(0)}k m`;

  ctx.fillText(minStr, legX + 12, legY + 50);
  ctx.fillText('-200m', legX + 75, legY + 50);
  ctx.fillText(seaStr, legX + 130, legY + 50);
  ctx.fillText(midStr, legX + 195, legY + 50);
  ctx.fillText(maxStr, legX + 265, legY + 50);

  ctx.restore();
}

export function renderTopographicalHeatmap(
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

    const meters = byteToMeters(elevVal, elevationConfig);
    let [r, g, b] = getTopographicRgbMeters(meters, elevationConfig);

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
  renderTopographicLegend(ctx, width, height, elevationConfig);
  ctx.restore();
}
