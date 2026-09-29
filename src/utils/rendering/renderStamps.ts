/**
 * Renders placed stamps with isometric Y-depth sorting, flip, rotation, tinting, and selection gizmos.
 */
import { PlacedStamp } from '../../types';
import { imageManager } from '../imageManager';
import { getStampGeometry } from '../stampGeometry';

// Tint canvases are reused between frames. Creating one canvas per stamp on every
// redraw becomes very expensive once a forest or swamp brush places hundreds of
// existing PNG assets on the map.
const tintCache = new Map<string, HTMLCanvasElement>();

function getTintedImage(img: HTMLImageElement, assetId: string, tint: string): HTMLCanvasElement {
  const key = `${assetId}:${tint}`;
  const cached = tintCache.get(key);
  if (cached && cached.width === img.width && cached.height === img.height) return cached;

  const tinted = document.createElement('canvas');
  tinted.width = img.width;
  tinted.height = img.height;
  const tintCtx = tinted.getContext('2d');
  if (!tintCtx) return tinted;
  tintCtx.drawImage(img, 0, 0);
  tintCtx.globalCompositeOperation = 'source-atop';
  tintCtx.fillStyle = tint;
  tintCtx.globalAlpha = 0.5;
  tintCtx.fillRect(0, 0, img.width, img.height);
  tintCache.set(key, tinted);
  return tinted;
}

export function clearStampTintCache(assetId?: string): void {
  if (!assetId) {
    tintCache.clear();
    return;
  }
  for (const key of tintCache.keys()) {
    if (key.startsWith(`${assetId}:`)) tintCache.delete(key);
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
    ctx.translate(stamp.x, stamp.y);

    if (stamp.rotation !== 0) {
      ctx.rotate((stamp.rotation * Math.PI) / 180);
    }

    const geometry = getStampGeometry(img.width, img.height, stamp.scale);
    const drawW = geometry.width;
    const drawH = geometry.height;

    // Draw the stamp image with Flip X and Flip Y transformations centered on the stamp
    ctx.save();
    const centerY = -drawH * 0.25;
    ctx.translate(0, centerY);
    const sx = stamp.flipX ? -1 : 1;
    const sy = stamp.flipY ? -1 : 1;
    if (sx !== 1 || sy !== 1) {
      ctx.scale(sx, sy);
    }
    ctx.translate(0, -centerY);

    // Seasonal / environmental tinting. Reuse the transformed source canvas so
    // large existing asset scatter fields remain responsive while panning/painting.
    const source = stamp.tint && stamp.tint !== ''
      ? getTintedImage(img, stamp.assetId, stamp.tint)
      : img;
    ctx.drawImage(source, -drawW / 2, -drawH * 0.75, drawW, drawH);
    ctx.restore();

    // Selection bounding box indicator. Secondary selections get an outline;
    // only the primary object gets transform handles.
    const isSelected = selectedStampId === stamp.id || selectedStampIds.includes(stamp.id);
    const isPrimary = selectedStampId === stamp.id;
    if (isSelected) {
      ctx.strokeStyle = isPrimary ? '#f59e0b' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(-drawW / 2 - 4, -drawH * 0.75 - 4, drawW + 8, drawH + 8);
      ctx.setLineDash([]);

      if (isPrimary) {
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
