/**
 * Renders roads, rivers, trade routes, and borders with multi-pass casings, tapering, and texture patterns.
 */
import { PlacedPath, PathStyle, BiomeTexture } from '../../types';
import { DEFAULT_BIOMES } from '../../data/defaultAssets';
import { BiomePatternManager } from './renderBiomes';
import { buildRibbonRails, traceRibbonPolygon, strokeRibbonEdges, RibbonRails } from './pathRibbon';

export function strokeSmoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
  smoothed: boolean
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (smoothed && points.length > 2) {
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();
}

export function renderPaths(
  ctx: CanvasRenderingContext2D,
  paths: PlacedPath[],
  activeDraft?: {
    points: { x: number; y: number }[];
    color: string;
    width: number;
    style?: PathStyle;
    textureId?: string;
    restrictToLand?: boolean;
    taper?: boolean;
    doubleLine?: boolean;
    dashPattern?: number[];
  } | null,
  selectedPathId?: string | null,
  customBiomes?: BiomeTexture[]
): void {
  const allPaths: PlacedPath[] = [...paths];
  if (activeDraft && activeDraft.points.length > 1) {
    allPaths.push({
      id: 'draft',
      style: activeDraft.style || 'river',
      points: activeDraft.points,
      width: activeDraft.width,
      color: activeDraft.color,
      textureId: activeDraft.textureId,
      restrictToLand: activeDraft.restrictToLand,
      opacity: 0.9,
      smoothed: true,
      taper: activeDraft.taper,
      doubleLine: activeDraft.doubleLine,
      dashPattern: activeDraft.dashPattern,
    });
  }

  if (allPaths.length === 0 && (!activeDraft || activeDraft.points.length === 0)) return;

  // Visual feedback when draft starts with single point
  if (activeDraft && activeDraft.points.length === 1) {
    const pt = activeDraft.points[0];
    ctx.save();
    ctx.fillStyle = activeDraft.color || '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, Math.max(3, activeDraft.width / 2), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  const allBiomesList = [...DEFAULT_BIOMES, ...(customBiomes || [])];
  const biomeMap = new Map<string, BiomeTexture>();
  for (const b of allBiomesList) {
    biomeMap.set(b.id, b);
  }

  // Pre-calculate Ribbon Rails for all tapered/width-varying paths (reused across Pass 1, 2, and 3)
  const ribbonMap = new Map<string, RibbonRails>();
  for (const p of allPaths) {
    if (p.taper && p.points.length > 2) {
      const startW = p.startWidth ?? Math.max(1.5, p.width * 0.35);
      const endW = p.endWidth ?? Math.max(p.width, p.width * 1.6);
      const rails = buildRibbonRails(p.points, {
        startWidth: startW,
        endWidth: endW,
        organicVariation: p.style === 'road',
      });
      ribbonMap.set(p.id, rails);
    }
  }

  // PASS 1: All Road Casings & River Bank Outlines
  for (const p of allPaths) {
    if (p.points.length < 2) continue;

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const defaultCasingColor = p.style === 'river' ? '#1e3a8a' : '#292524';
    const casingColor = (p.textureId && p.textureId !== 'default' && biomeMap.has(p.textureId))
      ? (biomeMap.get(p.textureId)!.roughnessColor || defaultCasingColor)
      : defaultCasingColor;

    const rails = ribbonMap.get(p.id);

    if (p.doubleLine) {
      ctx.lineWidth = p.width + 4;
      ctx.strokeStyle = '#1c1917';
      strokeSmoothPath(ctx, p.points, p.smoothed);
    } else if (rails) {
      // Offset-polygon dual-rail bank/casing
      ctx.strokeStyle = casingColor;
      strokeRibbonEdges(ctx, rails, 2.5);
    } else if (p.style === 'river') {
      ctx.lineWidth = p.width + 2.5;
      ctx.strokeStyle = casingColor;
      strokeSmoothPath(ctx, p.points, p.smoothed);
    } else if (p.style === 'road') {
      // Single-line road under-casing (ditch / cart track border)
      ctx.lineWidth = p.width + 3;
      ctx.strokeStyle = casingColor;
      strokeSmoothPath(ctx, p.points, p.smoothed);
    }

    ctx.restore();
  }

  // PASS 2: Inner Fills & Custom Textures
  for (const p of allPaths) {
    if (p.points.length < 2) continue;

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let strokeStyle: string | CanvasPattern = p.color;
    if (p.textureId && p.textureId !== 'default' && biomeMap.has(p.textureId)) {
      const biome = biomeMap.get(p.textureId)!;
      const pat = BiomePatternManager.getOrCreateBiomePattern(ctx, biome);
      if (pat) {
        strokeStyle = pat;
      } else if (biome.color) {
        strokeStyle = biome.color;
      }
    }

    const rails = ribbonMap.get(p.id);

    if (p.doubleLine) {
      ctx.lineWidth = p.width;
      ctx.strokeStyle = strokeStyle;
      strokeSmoothPath(ctx, p.points, p.smoothed);
    } else if (rails) {
      // Seamless closed polygon ribbon fill (no stepped disks or line join gaps)
      traceRibbonPolygon(ctx, rails);
      ctx.fillStyle = strokeStyle;
      ctx.fill();
    } else {
      ctx.lineWidth = p.width;
      ctx.strokeStyle = strokeStyle;

      if (p.dashPattern && p.dashPattern.length > 0) {
        ctx.setLineDash(p.dashPattern);
      } else if (p.style === 'border') {
        ctx.setLineDash([8, 6]);
      } else if (p.style === 'trade_route') {
        ctx.setLineDash([4, 6]);
      } else {
        ctx.setLineDash([]);
      }
      strokeSmoothPath(ctx, p.points, p.smoothed);
    }

    ctx.restore();
  }

  // PASS 3: Center Dividers & Water Foam Highlights
  for (const p of allPaths) {
    if (p.points.length < 2) continue;

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const isCustomNonWater = p.textureId && p.textureId !== 'default' &&
      biomeMap.has(p.textureId) && biomeMap.get(p.textureId)?.detailType !== 'water';

    if (p.doubleLine) {
      ctx.lineWidth = Math.max(1, p.width * 0.25);
      ctx.strokeStyle = '#292524';
      ctx.setLineDash([5, 6]);
      strokeSmoothPath(ctx, p.points, p.smoothed);
    } else if (p.style === 'river' && !isCustomNonWater) {
      const rails = ribbonMap.get(p.id);
      if (rails) {
        ctx.lineWidth = Math.max(1.2, p.width * 0.22);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        strokeSmoothPath(ctx, p.points, p.smoothed);
      } else {
        ctx.lineWidth = Math.max(1.5, p.width * 0.35);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        strokeSmoothPath(ctx, p.points, p.smoothed);
      }
    }

    ctx.restore();
  }

  // PASS 4: Selection Indicator
  if (selectedPathId) {
    const selectedP = allPaths.find((p) => p.id === selectedPathId);
    if (selectedP && selectedP.points.length >= 2) {
      ctx.save();
      const rails = ribbonMap.get(selectedP.id);
      if (rails) {
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([6, 6]);
        strokeRibbonEdges(ctx, rails, 3);
      } else {
        ctx.lineWidth = Math.max(4, selectedP.width + 6);
        ctx.strokeStyle = '#f59e0b';
        ctx.setLineDash([6, 6]);
        strokeSmoothPath(ctx, selectedP.points, selectedP.smoothed);
      }
      ctx.restore();
    }
  }
}

export function renderPathsMasked(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maskCanvas: HTMLCanvasElement,
  paths: PlacedPath[],
  activeDraft?: {
    points: { x: number; y: number }[];
    color: string;
    width: number;
    style?: PathStyle;
    textureId?: string;
    restrictToLand?: boolean;
    taper?: boolean;
    doubleLine?: boolean;
    dashPattern?: number[];
  } | null,
  selectedPathId?: string | null,
  customBiomes?: BiomeTexture[]
): void {
  const landPaths = paths.filter((p) => p.restrictToLand !== false);
  const openPaths = paths.filter((p) => p.restrictToLand === false);
  const draftIsLand = !activeDraft || activeDraft.restrictToLand !== false;

  if (landPaths.length > 0 || (activeDraft && draftIsLand)) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      renderPaths(
        tCtx,
        landPaths,
        draftIsLand ? activeDraft : null,
        selectedPathId,
        customBiomes
      );
      tCtx.globalCompositeOperation = 'destination-in';
      tCtx.drawImage(maskCanvas, 0, 0, width, height);
      ctx.drawImage(tempCanvas, 0, 0, width, height);
    }
  }

  if (openPaths.length > 0 || (activeDraft && !draftIsLand)) {
    renderPaths(
      ctx,
      openPaths,
      !draftIsLand ? activeDraft : null,
      selectedPathId,
      customBiomes
    );
  }
}
