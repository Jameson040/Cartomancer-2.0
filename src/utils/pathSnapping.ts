/**
 * Path snapping, merging, and projection utilities for roads, rivers, and boundaries.
 */

import { PlacedPath } from '../types';

export interface Point2D {
  x: number;
  y: number;
}

export interface SegmentProjectionResult {
  distance: number;
  x: number;
  y: number;
}

/**
 * Calculates distance from a point to a line segment with projected snap coordinates.
 */
export function distToSegmentWithProjection(
  p: Point2D,
  v: Point2D,
  w: Point2D
): SegmentProjectionResult {
  const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
  if (l2 === 0) return { distance: Math.hypot(p.x - v.x, p.y - v.y), x: v.x, y: v.y };
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  return {
    distance: Math.hypot(p.x - projX, p.y - projY),
    x: Math.round(projX),
    y: Math.round(projY),
  };
}

/**
 * Connects new paths to existing paths, performing endpoint continuation merges or T-junction branch snaps.
 */
export function mergeOrAddPath(
  newPath: PlacedPath,
  existingPaths: PlacedPath[],
  enableAutoMerge: boolean = true
): PlacedPath[] {
  if (!enableAutoMerge || newPath.points.length < 2) {
    return [...existingPaths, newPath];
  }

  const SNAP_RADIUS = 32;
  const newPts = [...newPath.points];
  const nStart = newPts[0];
  const nEnd = newPts[newPts.length - 1];

  let mergedTargetIdx = -1;
  let mergeMode: 'append' | 'prepend' | 'reverse_append' | 'reverse_prepend' | null = null;

  for (let i = 0; i < existingPaths.length; i++) {
    const ep = existingPaths[i];
    if (ep.points.length < 2) continue;
    const isBothRiver = newPath.style === 'river' && ep.style === 'river';
    const isBothRoad = newPath.style !== 'river' && ep.style !== 'river';
    if (!isBothRiver && !isBothRoad) continue;

    const epStart = ep.points[0];
    const epEnd = ep.points[ep.points.length - 1];

    if (Math.hypot(nStart.x - epEnd.x, nStart.y - epEnd.y) <= SNAP_RADIUS) {
      mergedTargetIdx = i;
      mergeMode = 'append';
      break;
    }
    if (Math.hypot(nEnd.x - epStart.x, nEnd.y - epStart.y) <= SNAP_RADIUS) {
      mergedTargetIdx = i;
      mergeMode = 'prepend';
      break;
    }
    if (Math.hypot(nStart.x - epStart.x, nStart.y - epStart.y) <= SNAP_RADIUS) {
      mergedTargetIdx = i;
      mergeMode = 'reverse_prepend';
      break;
    }
    if (Math.hypot(nEnd.x - epEnd.x, nEnd.y - epEnd.y) <= SNAP_RADIUS) {
      mergedTargetIdx = i;
      mergeMode = 'reverse_append';
      break;
    }
  }

  if (mergedTargetIdx !== -1 && mergeMode) {
    const target = existingPaths[mergedTargetIdx];
    let combinedPoints: Point2D[];

    if (mergeMode === 'append') {
      combinedPoints = [...target.points, ...newPts.slice(1)];
    } else if (mergeMode === 'prepend') {
      combinedPoints = [...newPts, ...target.points.slice(1)];
    } else if (mergeMode === 'reverse_prepend') {
      const rev = [...newPts].reverse();
      combinedPoints = [...rev, ...target.points.slice(1)];
    } else {
      const rev = [...newPts].reverse();
      combinedPoints = [...target.points, ...rev.slice(1)];
    }

    const updatedPath: PlacedPath = {
      ...target,
      points: combinedPoints,
      textureId: target.textureId && target.textureId !== 'default' ? target.textureId : newPath.textureId,
      color: target.textureId && target.textureId !== 'default' ? target.color : newPath.color,
    };

    const result = [...existingPaths];
    result[mergedTargetIdx] = updatedPath;

    // Check if new path acts as a bridge connecting to another path endpoint
    const finalStart = combinedPoints[0];
    const finalEnd = combinedPoints[combinedPoints.length - 1];

    for (let j = 0; j < result.length; j++) {
      if (j === mergedTargetIdx) continue;
      const other = result[j];
      if (other.points.length < 2) continue;
      const isBothRiver = updatedPath.style === 'river' && other.style === 'river';
      const isBothRoad = updatedPath.style !== 'river' && other.style !== 'river';
      if (!isBothRiver && !isBothRoad) continue;

      const oStart = other.points[0];
      const oEnd = other.points[other.points.length - 1];

      if (Math.hypot(finalEnd.x - oStart.x, finalEnd.y - oStart.y) <= SNAP_RADIUS) {
        updatedPath.points = [...updatedPath.points, ...other.points.slice(1)];
        result.splice(j, 1);
        break;
      } else if (Math.hypot(finalStart.x - oEnd.x, finalStart.y - oEnd.y) <= SNAP_RADIUS) {
        updatedPath.points = [...other.points, ...updatedPath.points.slice(1)];
        result.splice(j, 1);
        break;
      }
    }

    return result;
  }

  // Branch / T-junction snapping to road/river centerline
  for (const ep of existingPaths) {
    if (ep.points.length < 2) continue;
    for (let i = 0; i < ep.points.length - 1; i++) {
      const p1 = ep.points[i];
      const p2 = ep.points[i + 1];
      const dStart = distToSegmentWithProjection(nStart, p1, p2);
      if (dStart.distance <= SNAP_RADIUS * 0.75) {
        newPts[0] = { x: dStart.x, y: dStart.y };
      }
      const dEnd = distToSegmentWithProjection(nEnd, p1, p2);
      if (dEnd.distance <= SNAP_RADIUS * 0.75) {
        newPts[newPts.length - 1] = { x: dEnd.x, y: dEnd.y };
      }
    }
  }

  newPath.points = newPts;
  return [...existingPaths, newPath];
}
