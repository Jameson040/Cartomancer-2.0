/**
 * Renders base coordinate grids (Square, Hex, Isometric), Portolan rhumb lines, and margin coordinates.
 */
import { GridConfig } from '../../types';

export function drawHexagon(
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

export function renderRhumbLines(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const centers = [
    { cx: width * 0.25, cy: height * 0.35 },
    { cx: width * 0.75, cy: height * 0.65 },
  ];

  const diag = Math.hypot(width, height);
  for (const c of centers) {
    ctx.save();
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

export function renderMarginCoordinates(
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

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  grid: GridConfig
): void {
  ctx.save();

  // 1. Nautical Rhumb Lines
  if (grid.showRhumbLines) {
    renderRhumbLines(ctx, width, height);
  }

  // 2. Base Coordinate Grid
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
          drawHexagon(ctx, cx + shiftX, cy + shiftY, r, isFlat);
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

  // 3. Alphanumeric Margin Coordinates
  if (grid.showCoordinates) {
    renderMarginCoordinates(ctx, width, height, Math.max(30, grid.size));
  }

  ctx.restore();
}
