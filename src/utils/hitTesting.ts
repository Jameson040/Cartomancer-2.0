/**
 * Cartomancer Fantasy Map Maker - Precision Canvas Hit Testing & Transform Utilities
 */

import { PlacedStamp, PlacedText, PlacedPath } from '../types';
import { imageManager } from './imageManager';

export interface HitTestResult {
  type: 'stamp' | 'label' | 'path';
  id: string;
  handle?: 'move' | 'scale' | 'rotate';
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
  const drawW = rawW * stamp.scale * 0.7;
  const drawH = rawH * stamp.scale * 0.7;

  // Transform world (x, y) into stamp local space
  const dx = x - stamp.x;
  const dy = y - stamp.y;
  const rad = (-stamp.rotation * Math.PI) / 180;
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

  const minX = -drawW / 2 - tolerance;
  const maxX = drawW / 2 + tolerance;
  const minY = -drawH * 0.75 - tolerance;
  const maxY = drawH * 0.25 + tolerance;

  return localX >= minX && localX <= maxX && localY >= minY && localY <= maxY;
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
  const drawW = rawW * stamp.scale * 0.7;
  const drawH = rawH * stamp.scale * 0.7;

  const dx = x - stamp.x;
  const dy = y - stamp.y;
  const rad = (-stamp.rotation * Math.PI) / 180;
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad);
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad);

  // 1. Rotation handle (at top center)
  const rotHandleX = 0;
  const rotHandleY = -drawH * 0.75 - 18;
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

