/**
 * Cartomancer Fantasy Map Maker - Precision Canvas Hit Testing & Transform Utilities
 */

import { PlacedStamp, PlacedText, PlacedPath } from '../types';
import { imageManager } from './imageManager';
import { getStampGeometry, worldToStampLocal } from './stampGeometry';

export interface HitTestResult {
  type: 'stamp' | 'label' | 'path';
  id: string;
  handle?: 'move' | 'scale' | 'rotate';
}

type AlphaMask = { width: number; height: number; data: Uint8ClampedArray };
const alphaMasks = new Map<string, AlphaMask>();

function getStampAlphaMask(assetId: string, img: HTMLImageElement): AlphaMask | null {
  const cached = alphaMasks.get(assetId);
  if (cached && cached.width === img.width && cached.height === img.height) return cached;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, img.width, img.height).data;
    const mask = { width: img.width, height: img.height, data };
    alphaMasks.set(assetId, mask);
    return mask;
  } catch {
    // A cross-origin/custom image may not allow pixel reads. Bounding-box
    // selection remains a safe fallback for that asset.
    return null;
  }
}

/**
 * Accurately test if coordinate (x, y) hits a placed stamp taking into account
 * anchor offset (-drawW/2, -drawH*0.75), scale, rotation, and tolerance.
 */
export function isPointInStamp(
  x: number,
  y: number,
  stamp: PlacedStamp,
  tolerance = 12
): boolean {
  const img = imageManager.getImage(stamp.assetId);
  const rawW = img ? img.width : 90;
  const rawH = img ? img.height : 90;
  const baseGeometry = getStampGeometry(rawW, rawH, stamp.scale);
  const geometry = getStampGeometry(rawW, rawH, stamp.scale, tolerance);
  const drawW = baseGeometry.width;
  const drawH = baseGeometry.height;
  const local = worldToStampLocal(x, y, stamp.x, stamp.y, stamp.rotation);
  const localX = local.x;
  const localY = local.y;

  const minX = geometry.left;
  const maxX = geometry.right;
  const minY = geometry.top;
  const maxY = geometry.bottom;
  if (localX < minX || localX > maxX || localY < minY || localY > maxY) return false;

  // Keep the forgiving tolerance for unloaded/cross-origin images. For the
  // repository's local stamps, use actual alpha so transparent padding cannot
  // steal clicks from another visible object underneath.
  if (!img || !img.complete || img.naturalWidth === 0) return true;
  const alphaMask = getStampAlphaMask(stamp.assetId, img);
  if (!alphaMask) return true;

  const sourceX = Math.round(((localX + drawW / 2) / drawW) * (alphaMask.width - 1));
  const sourceY = stamp.flipY
    ? Math.round(((drawH * 0.25 - localY) / drawH) * (alphaMask.height - 1))
    : Math.round(((localY + drawH * 0.75) / drawH) * (alphaMask.height - 1));
  const mappedX = stamp.flipX ? alphaMask.width - 1 - sourceX : sourceX;
  if (mappedX < 0 || mappedX >= alphaMask.width || sourceY < 0 || sourceY >= alphaMask.height) return false;
  return alphaMask.data[(sourceY * alphaMask.width + mappedX) * 4 + 3] > 18;
}

/**
 * Determine if pointer hits a specific handle (scale corner or top rotation knob) or the stamp body.
 */
export function getStampHitHandle(
  x: number,
  y: number,
  stamp: PlacedStamp
): 'move' | 'scale' | 'rotate' | null {
  const img = imageManager.getImage(stamp.assetId);
  const rawW = img ? img.width : 90;
  const rawH = img ? img.height : 90;
  const geometry = getStampGeometry(rawW, rawH, stamp.scale);
  const drawW = geometry.width;
  const drawH = geometry.height;
  const local = worldToStampLocal(x, y, stamp.x, stamp.y, stamp.rotation);
  const localX = local.x;
  const localY = local.y;

  // 1. Rotation handle (at top center)
  const rotHandleX = 0;
  const rotHandleY = geometry.top - 18;
  if (Math.hypot(localX - rotHandleX, localY - rotHandleY) <= 12) {
    return 'rotate';
  }

  // 2. Corner scale handles
  const corners = [
    { x: -drawW / 2 - 4, y: -drawH * 0.75 - 4 },
    { x: drawW / 2 + 4, y: -drawH * 0.75 - 4 },
    { x: -drawW / 2 - 4, y: drawH * 0.25 + 4 },
    { x: drawW / 2 + 4, y: drawH * 0.25 + 4 },
  ];

  for (const c of corners) {
    if (Math.hypot(localX - c.x, localY - c.y) <= 14) {
      return 'scale';
    }
  }

  // 3. Body hit
  if (
    localX >= -drawW / 2 - 8 &&
    localX <= drawW / 2 + 8 &&
    localY >= -drawH * 0.75 - 8 &&
    localY <= drawH * 0.25 + 8
  ) {
    return 'move';
  }

  return null;
}

/**
 * Accurately test if coordinate (x, y) hits a placed map label.
 */
export function isPointInLabel(
  x: number,
  y: number,
  label: PlacedText,
  tolerance = 12
): boolean {
  const effectiveFontSize = Math.round(label.fontSize * (label.scale ?? 1.0));
  const textLen = Math.max(1, label.text.length);
  const padX = label.bannerStyle !== 'none' ? 36 : 14;
  const padY = label.bannerStyle !== 'none' ? 14 : 8;
  const approxW = textLen * effectiveFontSize * 0.65 + padX * 2;
  const approxH = effectiveFontSize * 1.4 + padY * 2;

  // Local space
  const dx = x - label.x;
  const dy = y - label.y;
  const rad = (-label.rotation * Math.PI) / 180;
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

  return (
    localX >= -approxW / 2 - tolerance &&
    localX <= approxW / 2 + tolerance &&
    localY >= -approxH / 2 - tolerance &&
    localY <= approxH / 2 + tolerance
  );
}

/**
 * Test proximity to polyline path or river.
 */
export function isPointNearPath(
  x: number,
  y: number,
  path: PlacedPath | { points: { x: number; y: number }[]; width?: number },
  threshold = 24
): boolean {
  if (path.points.length < 2) return false;
  for (let i = 0; i < path.points.length - 1; i++) {
    const p1 = path.points[i];
    const p2 = path.points[i + 1];
    const d = distToSegment({ x, y }, p1, p2);
    if (d <= threshold + (path.width || 4) * 0.5) return true;
  }
  return false;
}

function distToSegment(
  p: { x: number; y: number },
  v: { x: number; y: number },
  w: { x: number; y: number }
): number {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
}

/**
 * Returns stamps sorted in visual front-to-back order (highest Z-layer, highest Y foreground, newest)
 * so clicking selects the asset visibly on top!
 */
export function getStampsFrontToBack(stamps: PlacedStamp[]): PlacedStamp[] {
  return [...stamps].sort((a, b) => {
    // 1. Z-layer index (-5 to +5)
    const layerA = a.layer ?? 0;
    const layerB = b.layer ?? 0;
    if (layerB !== layerA) {
      return layerB - layerA; // Higher layer is in front
    }
    // 2. Y-coordinate (lower down in screen is foreground in isometric maps)
    if (b.y !== a.y) {
      return b.y - a.y; // Higher Y is in front
    }
    // 3. Creation time
    return (b.createdAt ?? 0) - (a.createdAt ?? 0);
  });
}

