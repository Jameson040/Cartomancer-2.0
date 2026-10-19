/**
 * Renders placed stamps with isometric Y-depth sorting, flip, rotation, HSBC grading,
 * tinting, dynamic drop shadows, ambient ground occlusion, blend modes, and selection gizmos.
 */
import { PlacedStamp } from '../../types';
import { imageManager } from '../imageManager';
import { getStampGeometry } from '../stampGeometry';

// Graded & tinted canvases are reused between frames so panning/painting hundreds of
// AI-extracted stamps remains smooth at 60 FPS.
const gradedStampCache = new Map<string, HTMLCanvasElement>();

function hasCustomGrading(stamp: PlacedStamp): boolean {
  const hasTint = Boolean(stamp.tint && stamp.tint !== '');
  const hasHue = stamp.hue !== undefined && stamp.hue !== 0;
  const hasSat = stamp.saturation !== undefined && stamp.saturation !== 100;
  const hasBri = stamp.brightness !== undefined && stamp.brightness !== 100;
  const hasCon = stamp.contrast !== undefined && stamp.contrast !== 100;
  return hasTint || hasHue || hasSat || hasBri || hasCon;
}

function getGradedStampImage(img: HTMLImageElement, stamp: PlacedStamp): HTMLCanvasElement | HTMLImageElement {
  if (!hasCustomGrading(stamp)) return img;

  const hue = stamp.hue ?? 0;
  const sat = stamp.saturation ?? 100;
  const bri = stamp.brightness ?? 100;
  const con = stamp.contrast ?? 100;
  const tint = stamp.tint || '';
  const key = `${stamp.assetId}|t:${tint}|h:${hue}|s:${sat}|b:${bri}|c:${con}`;

  const cached = gradedStampCache.get(key);
  if (cached && cached.width === img.width && cached.height === img.height) {
    return cached;
  }

  const graded = document.createElement('canvas');
  graded.width = Math.max(1, img.width);
  graded.height = Math.max(1, img.height);
  const gCtx = graded.getContext('2d');
  if (!gCtx) return img;

  const filterParts: string[] = [];
  if (hue !== 0) filterParts.push(`hue-rotate(${hue}deg)`);
  if (sat !== 100) filterParts.push(`saturate(${sat}%)`);
  if (bri !== 100) filterParts.push(`brightness(${bri}%)`);
  if (con !== 100) filterParts.push(`contrast(${con}%)`);

  if (filterParts.length > 0) {
    gCtx.filter = filterParts.join(' ');
  }

  gCtx.drawImage(img, 0, 0);
  gCtx.filter = 'none';

  if (tint !== '') {
    gCtx.globalCompositeOperation = 'source-atop';
    gCtx.fillStyle = tint;
    gCtx.globalAlpha = 0.45;
    gCtx.fillRect(0, 0, graded.width, graded.height);
    gCtx.globalAlpha = 1.0;
    gCtx.globalCompositeOperation = 'source-over';
  }

  // Keep cache bounded
  if (gradedStampCache.size > 400) {
    const firstKey = gradedStampCache.keys().next().value;
    if (firstKey) gradedStampCache.delete(firstKey);
  }
  gradedStampCache.set(key, graded);
  return graded;
}

export function clearStampTintCache(assetId?: string): void {
  if (!assetId) {
    gradedStampCache.clear();
    return;
  }
  for (const key of gradedStampCache.keys()) {
    if (key.startsWith(`${assetId}|`)) gradedStampCache.delete(key);
  }
}

export function renderStamps(
  ctx: CanvasRenderingContext2D,
  stamps: PlacedStamp[],
  selectedStampId?: string | null,
  selectedStampIds: string[] = []
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
    if (stamp.blendMode && stamp.blendMode !== 'source-over') {
      ctx.globalCompositeOperation = stamp.blendMode;
    }
    ctx.translate(stamp.x, stamp.y);

    if (stamp.rotation !== 0) {
      ctx.rotate((stamp.rotation * Math.PI) / 180);
    }

    const geometry = getStampGeometry(img.width, img.height, stamp.scale);
    const drawW = geometry.width;
    const drawH = geometry.height;

    const shadowCfg = stamp.shadow;
    const shadowEnabled = shadowCfg ? shadowCfg.enabled : true;

    // 1. Ambient Ground Occlusion at stamp base (makes extracted AI assets sit naturally on terrain)
    const occSetting = shadowCfg?.groundOcclusion ?? true;
    const occStrength = typeof occSetting === 'number' ? occSetting : occSetting ? 0.35 : 0;
    if (occStrength > 0) {
      ctx.save();
      const occOpacity = occStrength * 0.9 * stamp.opacity;
      const rx = Math.max(6, drawW * 0.34);
      const ry = Math.max(3, drawH * 0.10);
      const grad = ctx.createRadialGradient(0, 2, 1, 0, 2, rx);
      grad.addColorStop(0, `rgba(15, 23, 42, ${Math.min(0.75, occOpacity).toFixed(2)})`);
      grad.addColorStop(0.6, `rgba(15, 23, 42, ${(occOpacity * 0.38).toFixed(2)})`);
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(0, 2 * (rx / ry), rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw the stamp image with Flip X/Y, Drop Shadow, and HSBC grading
    ctx.save();
    const centerY = -drawH * 0.25;
    ctx.translate(0, centerY);
    const sx = stamp.flipX ? -1 : 1;
    const sy = stamp.flipY ? -1 : 1;
    if (sx !== 1 || sy !== 1) {
      ctx.scale(sx, sy);
    }
    ctx.translate(0, -centerY);

    if (shadowEnabled) {
      const sOpacity = shadowCfg?.opacity ?? 0.35;
      ctx.shadowColor = `rgba(15, 23, 42, ${sOpacity})`;
      ctx.shadowBlur = shadowCfg?.blur ?? 6;
      ctx.shadowOffsetX = (shadowCfg?.offsetX ?? 3) * sx;
      ctx.shadowOffsetY = (shadowCfg?.offsetY ?? 4) * sy;
    }

    const source = getGradedStampImage(img, stamp);
    ctx.drawImage(source, -drawW / 2, -drawH * 0.75, drawW, drawH);
    ctx.restore();

    // 3. Selection bounding box indicator & transform handles
    const isSelected = selectedStampId === stamp.id || selectedStampIds.includes(stamp.id);
    const isPrimary = selectedStampId === stamp.id;
    if (isSelected) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      const strokeColor = stamp.locked ? '#ef4444' : isPrimary ? '#f59e0b' : '#38bdf8';
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-drawW / 2 - 4, -drawH * 0.75 - 4, drawW + 8, drawH + 8);
      ctx.setLineDash([]);

      if (isPrimary && !stamp.locked) {
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
    }

    ctx.restore();
  }
}
