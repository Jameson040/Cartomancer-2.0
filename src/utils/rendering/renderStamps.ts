/**
 * Renders placed stamps with isometric Y-depth sorting, flip, rotation, tinting, and selection gizmos.
 */
import { PlacedStamp } from '../../types';
import { imageManager } from '../imageManager';

export function renderStamps(
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

    const drawW = img.width * stamp.scale * 0.7;
    const drawH = img.height * stamp.scale * 0.7;

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
    ctx.restore();

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
