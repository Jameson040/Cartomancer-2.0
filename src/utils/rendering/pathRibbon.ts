/**
 * Cartomancer Fantasy Map Maker - Path Ribbon & Offset Polygon Generator
 * Converts 2D centerlines with variable widths into smooth continuous polygon ribbons.
 * Provides seamless texture pattern filling, organic width modulation, and dual-rail casings.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface RibbonRails {
  leftRail: Point2D[];
  rightRail: Point2D[];
}

export interface RibbonOptions {
  startWidth: number;
  endWidth: number;
  organicVariation?: boolean;
  sampleStep?: number; // distance in pixels between sampled vertices (default: 6)
}

/**
 * Resamples and smooths a polyline using quadratic midpoint interpolation
 * so vertices are evenly spaced, resulting in clean normal vectors without angular pinch.
 */
export function resamplePathPoints(points: Point2D[], stepSize: number = 8): Point2D[] {
  if (points.length < 2) return [...points];
  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    const dist = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    const steps = Math.max(1, Math.ceil(dist / stepSize));
    const result: Point2D[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      result.push({
        x: p0.x + (p1.x - p0.x) * t,
        y: p0.y + (p1.y - p0.y) * t,
      });
    }
    return result;
  }

  // Multi-point spline interpolation
  const smoothed: Point2D[] = [];
  const n = points.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];

    const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.ceil(segDist / stepSize));

    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;

      // Catmull-Rom spline interpolation
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

      smoothed.push({ x, y });
    }
  }

  smoothed.push(points[n - 1]);
  return smoothed;
}

/**
 * Computes left and right polygon rails offset along the normal vectors of the curve.
 */
export function buildRibbonRails(
  points: Point2D[],
  options: RibbonOptions
): RibbonRails {
  if (points.length < 2) {
    return { leftRail: [...points], rightRail: [...points] };
  }

  const resampled = resamplePathPoints(points, options.sampleStep || 7);
  const n = resampled.length;
  const leftRail: Point2D[] = [];
  const rightRail: Point2D[] = [];

  const normals: { nx: number; ny: number }[] = [];

  // Compute smoothed normal vectors
  for (let i = 0; i < n; i++) {
    let tx = 0;
    let ty = 0;

    if (i === 0) {
      tx = resampled[1].x - resampled[0].x;
      ty = resampled[1].y - resampled[0].y;
    } else if (i === n - 1) {
      tx = resampled[n - 1].x - resampled[n - 2].x;
      ty = resampled[n - 1].y - resampled[n - 2].y;
    } else {
      tx = resampled[i + 1].x - resampled[i - 1].x;
      ty = resampled[i + 1].y - resampled[i - 1].y;
    }

    const len = Math.hypot(tx, ty);
    if (len > 0.0001) {
      normals.push({ nx: -ty / len, ny: tx / len });
    } else if (normals.length > 0) {
      normals.push(normals[normals.length - 1]);
    } else {
      normals.push({ nx: 0, ny: 1 });
    }
  }

  // Smooth normals with 3-tap moving average to eliminate sudden kinks
  const smoothNormals: { nx: number; ny: number }[] = [];
  for (let i = 0; i < n; i++) {
    const prev = normals[Math.max(0, i - 1)];
    const curr = normals[i];
    const next = normals[Math.min(n - 1, i + 1)];

    let avgX = (prev.nx + curr.nx * 2 + next.nx) / 4;
    let avgY = (prev.ny + curr.ny * 2 + next.ny) / 4;
    const len = Math.hypot(avgX, avgY) || 1;
    smoothNormals.push({ nx: avgX / len, ny: avgY / len });
  }

  const { startWidth, endWidth, organicVariation } = options;

  for (let i = 0; i < n; i++) {
    const p = resampled[i];
    const { nx, ny } = smoothNormals[i];
    const progress = i / Math.max(1, n - 1);

    let w = startWidth + (endWidth - startWidth) * progress;
    if (organicVariation) {
      // Natural wobble (wheel ruts, wandering cart tracks, eroded riverbanks)
      const wobble = 1 + Math.sin(i * 0.45) * 0.09 + Math.cos(i * 0.9) * 0.05;
      w *= wobble;
    }

    const halfW = Math.max(0.75, w / 2);
    leftRail.push({
      x: p.x + nx * halfW,
      y: p.y + ny * halfW,
    });
    rightRail.push({
      x: p.x - nx * halfW,
      y: p.y - ny * halfW,
    });
  }

  return { leftRail, rightRail };
}

/**
 * Traces the closed 2D polygon of the ribbon into the 2D context.
 * Enables seamless pattern fills with zero line-join gaps or stepped discs.
 */
export function traceRibbonPolygon(
  ctx: CanvasRenderingContext2D,
  rails: RibbonRails
): void {
  const { leftRail, rightRail } = rails;
  if (leftRail.length < 2 || rightRail.length < 2) return;

  ctx.beginPath();
  // Trace forward along left rail
  ctx.moveTo(leftRail[0].x, leftRail[0].y);
  for (let i = 1; i < leftRail.length; i++) {
    ctx.lineTo(leftRail[i].x, leftRail[i].y);
  }

  // Connect to and trace backward along right rail
  for (let i = rightRail.length - 1; i >= 0; i--) {
    ctx.lineTo(rightRail[i].x, rightRail[i].y);
  }

  ctx.closePath();
}

/**
 * Strokes the left and right boundary rails independently with the casing/bank color.
 */
export function strokeRibbonEdges(
  ctx: CanvasRenderingContext2D,
  rails: RibbonRails,
  lineWidth: number = 2
): void {
  const { leftRail, rightRail } = rails;
  if (leftRail.length < 2 || rightRail.length < 2) return;

  ctx.lineWidth = lineWidth;

  // Left rail
  ctx.beginPath();
  ctx.moveTo(leftRail[0].x, leftRail[0].y);
  for (let i = 1; i < leftRail.length; i++) {
    ctx.lineTo(leftRail[i].x, leftRail[i].y);
  }
  ctx.stroke();

  // Right rail
  ctx.beginPath();
  ctx.moveTo(rightRail[0].x, rightRail[0].y);
  for (let i = 1; i < rightRail.length; i++) {
    ctx.lineTo(rightRail[i].x, rightRail[i].y);
  }
  ctx.stroke();
}
