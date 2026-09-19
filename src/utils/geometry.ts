/**
 * Cartomancer Fantasy Map Maker - Geometry & Collision Utilities
 */

import { PlacedPath } from '../types';

/**
 * Calculate the shortest distance from point (px, py) to segment (x1, y1)-(x2, y2)
 */
export function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/**
 * Test whether a point (px, py) is within a distance threshold of any segment of a polyline path
 */
export function isPointNearPath(
  px: number,
  py: number,
  path: PlacedPath,
  threshold: number = 20
): boolean {
  if (!path.points || path.points.length < 2) return false;
  const maxDist = Math.max(threshold, path.width / 2 + 10);
  for (let i = 0; i < path.points.length - 1; i++) {
    const p1 = path.points[i];
    const p2 = path.points[i + 1];
    if (distToSegment(px, py, p1.x, p1.y, p2.x, p2.y) <= maxDist) {
      return true;
    }
  }
  return false;
}
