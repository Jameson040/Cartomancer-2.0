/**
 * Renders base coordinate grids (Square, Hex, Isometric), Portolan rhumb lines,
 * margin coordinates, engraved Compass Rose, Distance Scale Bar, and Atlas Frame Border.
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
  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const cols = Math.floor(width / cellSize);
  for (let c = 0; c < cols; c++) {
    const letter = String.fromCharCode(65 + (c % 26));
    const x = c * cellSize + cellSize / 2;
    ctx.fillText(letter, x, 16);
    ctx.fillText(letter, x, height - 16);
  }

  const rows = Math.floor(height / cellSize);
  for (let r = 0; r < rows; r++) {
    const num = `${r + 1}`;
    const y = r * cellSize + cellSize / 2;
    ctx.fillText(num, 16, y);
    ctx.fillText(num, width - 16, y);
  }
  ctx.restore();
}

export function renderAtlasMapBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  ctx.save();
  ctx.globalAlpha = 0.92;
  const band = 12;

  // Outer dark frame
  ctx.strokeStyle = '#1e1b18';
  ctx.lineWidth = band * 2;
  ctx.strokeRect(0, 0, width, height);

  // Alternating degree ticks along perimeter
  const seg = 48;
  ctx.lineWidth = 5;
  for (let x = band; x < width - band; x += seg) {
    ctx.strokeStyle = Math.floor(x / seg) % 2 === 0 ? '#f3e5ab' : '#292018';
    ctx.beginPath();
    ctx.moveTo(x, band / 2);
    ctx.lineTo(Math.min(width - band, x + seg), band / 2);
    ctx.moveTo(x, height - band / 2);
    ctx.lineTo(Math.min(width - band, x + seg), height - band / 2);
    ctx.stroke();
  }
  for (let y = band; y < height - band; y += seg) {
    ctx.strokeStyle = Math.floor(y / seg) % 2 === 0 ? '#f3e5ab' : '#292018';
    ctx.beginPath();
    ctx.moveTo(band / 2, y);
    ctx.lineTo(band / 2, Math.min(height - band, y + seg));
    ctx.moveTo(width - band / 2, y);
    ctx.lineTo(width - band / 2, Math.min(height - band, y + seg));
    ctx.stroke();
  }

  // Inner brass hairlines
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(band, band, width - band * 2, height - band * 2);
  ctx.strokeRect(band + 4, band + 4, width - (band + 4) * 2, height - (band + 4) * 2);
  ctx.restore();
}

export function renderCompassRoseOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  corner: 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right'
): void {
  ctx.save();
  ctx.globalAlpha = 0.92;
  const r = Math.max(48, Math.min(72, Math.min(width, height) * 0.048));
  const pad = r + 38;
  const cx = corner === 'bottom-left' ? pad : width - pad;
  const cy = corner === 'top-right' ? pad : height - pad - 36;

  ctx.translate(cx, cy);

  // Outer degree rings
  ctx.strokeStyle = '#2c1e14';
  ctx.fillStyle = 'rgba(250, 243, 224, 0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point star spikes
  for (let i = 0; i < 8; i++) {
    const isCardinal = i % 2 === 0;
    const len = isCardinal ? r : r * 0.68;
    const w = isCardinal ? r * 0.18 : r * 0.12;
    ctx.save();
    ctx.rotate((i * Math.PI) / 4);

    // Left dark facet
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-w, -w);
    ctx.lineTo(0, -len);
    ctx.closePath();
    ctx.fillStyle = i === 0 ? '#991b1b' : '#2c1e14';
    ctx.fill();
    ctx.stroke();

    // Right gold/parchment facet
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(w, -w);
    ctx.lineTo(0, -len);
    ctx.closePath();
    ctx.fillStyle = i === 0 ? '#ef4444' : '#d4af37';
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // Center jewel
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.12, 0, Math.PI * 2);
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.stroke();

  // Cardinal labels
  ctx.font = `bold ${Math.round(r * 0.26)}px 'Cinzel', serif`;
  ctx.fillStyle = '#1e1b18';
  ctx.strokeStyle = '#faf3e0';
  ctx.lineWidth = 3;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const labelDist = r * 1.22;
  const dirs = [
    { t: 'N', x: 0, y: -labelDist },
    { t: 'E', x: labelDist, y: 0 },
    { t: 'S', x: 0, y: labelDist },
    { t: 'W', x: -labelDist, y: 0 },
  ];
  for (const d of dirs) {
    ctx.strokeText(d.t, d.x, d.y);
    ctx.fillStyle = d.t === 'N' ? '#991b1b' : '#1e1b18';
    ctx.fillText(d.t, d.x, d.y);
  }

  ctx.restore();
}

export function renderScaleBarOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  totalDistance: number = 200,
  unit: 'miles' | 'leagues' | 'km' = 'miles'
): void {
  ctx.save();
  ctx.globalAlpha = 0.94;
  const barWidth = Math.max(180, Math.min(280, width * 0.14));
  const barHeight = 8;
  const x0 = width - barWidth - 36;
  const y0 = height - 34;

  // Subtle parchment backing plate
  ctx.fillStyle = 'rgba(250, 243, 224, 0.88)';
  ctx.strokeStyle = '#3e2723';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x0 - 14, y0 - 22, barWidth + 28, 38, 6);
  ctx.fill();
  ctx.stroke();

  // 4 alternating segments
  const segments = 4;
  const segW = barWidth / segments;
  for (let i = 0; i < segments; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#2c1e14' : '#faf3e0';
    ctx.fillRect(x0 + i * segW, y0, segW, barHeight);
    ctx.strokeRect(x0 + i * segW, y0, segW, barHeight);
  }

  // Labels above ticks
  ctx.font = "bold 10px 'Cinzel', serif";
  ctx.fillStyle = '#2c1e14';
  ctx.textAlign = 'center';
  ctx.fillText('0', x0, y0 - 6);
  ctx.fillText(`${Math.round(totalDistance / 2)}`, x0 + barWidth / 2, y0 - 6);
  ctx.fillText(`${totalDistance} ${unit}`, x0 + barWidth - 10, y0 - 6);

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
    ctx.save();
    ctx.globalAlpha = grid.opacity ?? 0.25;
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
          const shiftY = isFlat && Math.floor(cx / dx) % 2 === 1 ? h / 2 : 0;
          const shiftX = !isFlat && Math.floor(cy / dy) % 2 === 1 ? w / 2 : 0;
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
    ctx.restore();
  }

  // 3. Alphanumeric Margin Coordinates
  if (grid.showCoordinates) {
    renderMarginCoordinates(ctx, width, height, Math.max(30, grid.size));
  }

  // 4. Ornamental Atlas Frame Border
  if (grid.showMapBorder) {
    renderAtlasMapBorder(ctx, width, height);
  }

  // 5. Engraved Compass Rose
  if (grid.showCompassRose) {
    renderCompassRoseOverlay(ctx, width, height, grid.compassCorner || 'top-right');
  }

  // 6. Cartographic Distance Scale Bar
  if (grid.showScaleBar) {
    renderScaleBarOverlay(
      ctx,
      width,
      height,
      grid.scaleBarDistance || 200,
      grid.scaleBarUnit || 'miles'
    );
  }

  ctx.restore();
}
