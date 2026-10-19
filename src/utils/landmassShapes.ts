/**
 * Landmass Geometric Shapes and Custom Polygon Engine.
 * Supports exact geometric and organic coastlines: Circle, Rectangle, Triangle,
 * Pentagon, Hexagon, Octagon, Star, and Custom Multi-Vertex Polygons.
 */

import { LandmassShape, MaskMode } from '../types';
import { CanvasRenderer } from './canvasRenderer';

export interface Point {
  x: number;
  y: number;
}

export interface LandmassShapeDraft {
  shape: LandmassShape;
  mode: MaskMode;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  edgeStyle: 'crisp' | 'fractal';
  roughness: number;
}

/**
 * Generate regular polygon or geometric shape vertices based on center, radii, and rotation.
 */
export function generateShapeVertices(
  shape: LandmassShape,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number = 0
): Point[] {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);

  const rotate = (px: number, py: number): Point => ({
    x: cx + px * cos - py * sin,
    y: cy + px * sin + py * cos,
  });

  switch (shape) {
    case 'circle': {
      // Circle approximation with 48 smooth points for consistent fractal displacement
      const segments = 48;
      const points: Point[] = [];
      for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        points.push(rotate(Math.cos(theta) * rx, Math.sin(theta) * ry));
      }
      return points;
    }

    case 'rectangle': {
      return [
        rotate(-rx, -ry),
        rotate(rx, -ry),
        rotate(rx, ry),
        rotate(-rx, ry),
      ];
    }

    case 'triangle': {
      // Equilateral / isosceles triangle pointing upwards
      return [
        rotate(0, -ry),
        rotate(rx, ry),
        rotate(-rx, ry),
      ];
    }

    case 'pentagon': {
      // 5-sided regular polygon
      const points: Point[] = [];
      for (let i = 0; i < 5; i++) {
        const theta = (i / 5) * Math.PI * 2 - Math.PI / 2;
        points.push(rotate(Math.cos(theta) * rx, Math.sin(theta) * ry));
      }
      return points;
    }

    case 'hexagon': {
      // 6-sided regular polygon (flat-topped or pointy depending on rotation)
      const points: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const theta = (i / 6) * Math.PI * 2 - Math.PI / 6;
        points.push(rotate(Math.cos(theta) * rx, Math.sin(theta) * ry));
      }
      return points;
    }

    case 'octagon': {
      // 8-sided regular polygon
      const points: Point[] = [];
      for (let i = 0; i < 8; i++) {
        const theta = (i / 8) * Math.PI * 2 - Math.PI / 8;
        points.push(rotate(Math.cos(theta) * rx, Math.sin(theta) * ry));
      }
      return points;
    }

    case 'star': {
      // 5-pointed fantasy crest star with inner and outer vertices
      const points: Point[] = [];
      const innerFactor = 0.44;
      for (let i = 0; i < 10; i++) {
        const rFactor = i % 2 === 0 ? 1.0 : innerFactor;
        const theta = (i / 10) * Math.PI * 2 - Math.PI / 2;
        points.push(rotate(Math.cos(theta) * rx * rFactor, Math.sin(theta) * ry * rFactor));
      }
      return points;
    }

    default:
      return [];
  }
}

/**
 * Procedural pseudo-random hash generator for deterministic coastline jitter.
 */
function pseudoNoise(x: number, y: number, seed: number = 1337): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return (n - Math.floor(n)) * 2 - 1;
}

/**
 * Apply fractal displacement to polygon edges so landmass edges naturally
 * resemble realistic fjords, bays, capes, and rocky coastlines while conforming
 * to the chosen geometric shape.
 */
export function applyFractalDisplacement(
  points: Point[],
  roughness: number = 0.35,
  iterations: number = 2
): Point[] {
  if (points.length < 3 || roughness <= 0.02) return points;

  let current = [...points];

  for (let iter = 0; iter < iterations; iter++) {
    const next: Point[] = [];
    const scale = Math.pow(0.55, iter) * roughness * 0.45;

    for (let i = 0; i < current.length; i++) {
      const p1 = current[i];
      const p2 = current[(i + 1) % current.length];
      next.push(p1);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy);

      if (len > 8) {
        // Normal vector (perpendicular to edge)
        const nx = -dy / len;
        const ny = dx / len;

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        const jitter = pseudoNoise(midX, midY, iter * 997 + i * 43) * len * scale;

        next.push({
          x: midX + nx * jitter,
          y: midY + ny * jitter,
        });
      }
    }
    current = next;
  }

  return current;
}

/**
 * Generate an SVG path data string `d` attribute from an array of 2D points.
 */
export function getPolygonSvgPath(points: Point[]): string {
  if (points.length < 2) return '';
  return `M ${points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ')} Z`;
}

/**
 * Rasterize a shape or polygon directly onto the landmass mask canvas.
 * If mode is `add_land`: paints opaque land (source-over white).
 * If mode is `carve_water`: cuts out ocean or inland sea/lake (destination-out).
 * Also cleanly clears elevation in the carved water footprint if an elevationCanvas is provided.
 */
export function applyLandmassShapeToMask(options: {
  maskCanvas: HTMLCanvasElement;
  elevationCanvas?: HTMLCanvasElement | null;
  points: Point[];
  mode: MaskMode;
  edgeStyle?: 'crisp' | 'fractal';
  roughness?: number;
  opacity?: number;
}): void {
  const {
    maskCanvas,
    elevationCanvas,
    points,
    mode,
    edgeStyle = 'crisp',
    roughness = 0.35,
    opacity = 1.0,
  } = options;

  if (points.length < 3) return;

  const finalPoints =
    edgeStyle === 'fractal' && roughness > 0.05
      ? applyFractalDisplacement(points, roughness)
      : points;

  const mCtx = maskCanvas.getContext('2d');
  if (!mCtx) return;

  mCtx.save();
  if (mode === 'carve_water') {
    mCtx.globalCompositeOperation = 'destination-out';
    mCtx.globalAlpha = opacity;
  } else {
    mCtx.globalCompositeOperation = 'source-over';
    mCtx.fillStyle = '#ffffff';
    mCtx.globalAlpha = opacity;
  }

  mCtx.beginPath();
  mCtx.moveTo(finalPoints[0].x, finalPoints[0].y);
  for (let i = 1; i < finalPoints.length; i++) {
    mCtx.lineTo(finalPoints[i].x, finalPoints[i].y);
  }
  mCtx.closePath();
  mCtx.fill();
  mCtx.restore();

  // If carving water/sea/lake, also remove elevation contour relief in that area
  if (mode === 'carve_water' && elevationCanvas) {
    const eCtx = elevationCanvas.getContext('2d');
    if (eCtx) {
      eCtx.save();
      eCtx.globalCompositeOperation = 'destination-out';
      eCtx.globalAlpha = opacity;
      eCtx.beginPath();
      eCtx.moveTo(finalPoints[0].x, finalPoints[0].y);
      for (let i = 1; i < finalPoints.length; i++) {
        eCtx.lineTo(finalPoints[i].x, finalPoints[i].y);
      }
      eCtx.closePath();
      eCtx.fill();
      eCtx.restore();
    }
  }
  CanvasRenderer.invalidateTerrainCache('all');
}
