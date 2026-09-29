import { NumericHeightField, decodeHeight } from '../heightField';

/** Lightweight diagnostic overlay for the optional numeric height grid. */
export function renderHeightfieldOverlay(ctx: CanvasRenderingContext2D, field: NumericHeightField): void {
  const cell = field.cellSize;
  let min = Infinity;
  let max = -Infinity;
  for (const encoded of field.values) {
    const value = decodeHeight(field, encoded);
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  const span = Math.max(1, max - min);
  ctx.save();
  ctx.globalAlpha = 0.28;
  for (let gy = 0; gy < field.height; gy++) for (let gx = 0; gx < field.width; gx++) {
    const value = decodeHeight(field, field.values[gy * field.width + gx]);
    const t = Math.max(0, Math.min(1, (value - min) / span));
    ctx.fillStyle = t < 0.5 ? `rgb(${35 + Math.round(t * 120)}, ${90 + Math.round(t * 100)}, 180)` : `rgb(${180 + Math.round((t - 0.5) * 120)}, ${150 - Math.round((t - 0.5) * 100)}, ${80 - Math.round((t - 0.5) * 60)})`;
    ctx.fillRect(gx * cell, gy * cell, cell + 0.5, cell + 0.5);
  }
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = 'rgba(35, 28, 20, 0.65)';
  ctx.lineWidth = 0.7;
  const interval = Math.max(25, Math.round(span / 8 / 10) * 10);
  for (let gy = 0; gy < field.height; gy++) for (let gx = 0; gx < field.width; gx++) {
    const value = decodeHeight(field, field.values[gy * field.width + gx]);
    if (Math.abs(value - Math.round(value / interval) * interval) < interval * 0.08) {
      ctx.strokeRect(gx * cell + 0.5, gy * cell + 0.5, cell - 1, cell - 1);
    }
  }
  ctx.restore();
}
