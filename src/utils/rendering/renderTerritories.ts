/**
 * Renders Political Territories & Region Polygons with translucent fills,
 * inner border glow (clipped inside polygon), dashed/solid/double borders,
 * auto-centered kingdom titles, and live polygon vertex drafting.
 */
import { PlacedTerritory } from '../../types';

export function getPolygonCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const pt of points) {
    sumX += pt.x;
    sumY += pt.y;
  }
  return {
    x: sumX / points.length,
    y: sumY / points.length,
  };
}

export function isPointInPolygon(x: number, y: number, pts: { x: number; y: number }[]): boolean {
  if (!pts || pts.length < 3) return false;
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function isPointInTerritory(x: number, y: number, territory: PlacedTerritory): boolean {
  return isPointInPolygon(x, y, territory.points);
}

function buildTerritoryPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[], closed = true): void {
  if (points.length === 0) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  if (closed && points.length >= 3) {
    ctx.closePath();
  }
}

export function renderTerritories(
  ctx: CanvasRenderingContext2D,
  territories: PlacedTerritory[] = [],
  selectedTerritoryId?: string | null,
  activeTerritoryDraft?: {
    points: { x: number; y: number }[];
    cursorPos?: { x: number; y: number };
    name?: string;
    fillColor: string;
    fillOpacity?: number;
    borderColor: string;
    borderWidth?: number;
    innerGlowWidth?: number;
    borderStyle?: 'solid' | 'dashed' | 'double';
  } | null,
  cursorPos?: { x: number; y: number }
): void {
  // 1. Render committed territories
  for (const territory of territories) {
    if (!territory.points || territory.points.length < 3) continue;

    ctx.save();

    // Fill polygon
    buildTerritoryPath(ctx, territory.points, true);
    ctx.fillStyle = territory.fillColor || '#f59e0b';
    ctx.globalAlpha = territory.fillOpacity ?? 0.22;
    ctx.fill();

    // Inner Border Glow (Inkarnate-style political region inner rim)
    const glowW = territory.innerGlowWidth ?? 18;
    if (glowW > 0) {
      ctx.save();
      buildTerritoryPath(ctx, territory.points, true);
      ctx.clip();

      buildTerritoryPath(ctx, territory.points, true);
      ctx.strokeStyle = territory.borderColor || territory.fillColor || '#d97706';
      ctx.lineWidth = glowW * 1.6;
      ctx.globalAlpha = Math.min(0.65, (territory.fillOpacity ?? 0.22) * 1.9);
      ctx.shadowColor = territory.borderColor || territory.fillColor || '#d97706';
      ctx.shadowBlur = glowW;
      ctx.stroke();
      ctx.restore();
    }

    // Outer Border Stroke
    ctx.save();
    buildTerritoryPath(ctx, territory.points, true);
    ctx.globalAlpha = 0.92;
    ctx.strokeStyle = territory.borderColor || '#b45309';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (territory.borderStyle === 'dashed') {
      ctx.lineWidth = territory.borderWidth || 3;
      ctx.setLineDash([10, 6]);
      ctx.stroke();
    } else if (territory.borderStyle === 'double') {
      const bw = territory.borderWidth || 3;
      ctx.lineWidth = bw * 2.4;
      ctx.stroke();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = Math.max(1.5, bw * 0.8);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = territory.borderColor || '#b45309';
      ctx.lineWidth = Math.max(1, bw * 0.6);
      ctx.stroke();
    } else {
      ctx.lineWidth = territory.borderWidth || 3;
      ctx.stroke();
    }
    ctx.restore();

    // Optional Auto-Centered Realm Label
    if (territory.showLabel !== false && territory.name) {
      const center = getPolygonCentroid(territory.points);
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.font = "bold 16px 'Cinzel', serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.strokeText(territory.name.toUpperCase(), center.x, center.y);
      ctx.fillStyle = '#fef3c7';
      ctx.fillText(territory.name.toUpperCase(), center.x, center.y);
      ctx.restore();
    }

    // Selection highlight & vertex handles
    if (selectedTerritoryId === territory.id) {
      ctx.save();
      buildTerritoryPath(ctx, territory.points, true);
      ctx.strokeStyle = territory.locked ? '#ef4444' : '#38bdf8';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const pt of territory.points) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = territory.locked ? '#ef4444' : '#0284c7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }

    ctx.restore();
  }

  // 2. Render active territory draft in progress
  if (activeTerritoryDraft && activeTerritoryDraft.points.length > 0) {
    const pts = activeTerritoryDraft.points;
    const activeCursor = activeTerritoryDraft.cursorPos || cursorPos;
    ctx.save();

    if (pts.length >= 3) {
      buildTerritoryPath(ctx, pts, true);
      ctx.fillStyle = activeTerritoryDraft.fillColor || '#f59e0b';
      ctx.globalAlpha = activeTerritoryDraft.fillOpacity ?? 0.22;
      ctx.fill();
    }

    buildTerritoryPath(ctx, pts, false);
    if (activeCursor) {
      ctx.lineTo(activeCursor.x, activeCursor.y);
    }
    ctx.strokeStyle = activeTerritoryDraft.borderColor || '#f59e0b';
    ctx.lineWidth = activeTerritoryDraft.borderWidth || 3;
    ctx.setLineDash([6, 4]);
    ctx.globalAlpha = 0.9;
    ctx.stroke();
    ctx.setLineDash([]);

    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#10b981' : '#ffffff';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
