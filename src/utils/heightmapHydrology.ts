import { Delaunay } from 'd3-delaunay';
import { PlacedPath, PathPoint } from '../types';
import { fbm2D } from './proceduralNoise';

export interface HeightmapHydrologyOptions {
  maskCanvas: HTMLCanvasElement;
  elevationCanvas: HTMLCanvasElement;
  seed?: number;
  cellCount?: number;
  sourceCount?: number;
}

function sampleGray(canvas: HTMLCanvasElement, x: number, y: number, data: Uint8ClampedArray): number {
  const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y)));
  return data[(py * canvas.width + px) * 4];
}

/**
 * Quantizes the user's painted heightmap into a relaxed Delaunay graph and
 * routes rivers over that graph. It never writes to the mask, biome, or height
 * canvases: those remain the user's manual map and the generated paths are the
 * only output.
 */
export function generateRiversFromHeightmap(options: HeightmapHydrologyOptions): PlacedPath[] {
  const { maskCanvas, elevationCanvas, seed = 1337, cellCount = 850, sourceCount = 12 } = options;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const elevationCtx = elevationCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx || !elevationCtx) return [];
  const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  const elevationData = elevationCtx.getImageData(0, 0, elevationCanvas.width, elevationCanvas.height).data;

  let state = (seed | 0) || 1;
  const random = () => {
    state = Math.imul(1664525, state) + 1013904223;
    return ((state >>> 0) & 0x7fffffff) / 0x7fffffff;
  };
  const points: Array<[number, number]> = [];
  for (let i = 0; i < cellCount; i++) points.push([random() * maskCanvas.width, random() * maskCanvas.height]);

  // Two Lloyd passes make the hydrology sampling less biased by random clumps.
  for (let pass = 0; pass < 2; pass++) {
    const delaunay = Delaunay.from(points);
    const voronoi = delaunay.voronoi([0, 0, maskCanvas.width, maskCanvas.height]);
    points.forEach((point, index) => {
      const polygon = voronoi.cellPolygon(index);
      if (!polygon || polygon.length < 3) return;
      let sx = 0;
      let sy = 0;
      const vertices = polygon.slice(0, -1);
      vertices.forEach(([x, y]) => { sx += x; sy += y; });
      points[index] = [sx / vertices.length, sy / vertices.length];
    });
  }

  const delaunay = Delaunay.from(points);
  const cells = points.map(([x, y], id) => ({
    id,
    x,
    y,
    land: maskData[(Math.round(y) * maskCanvas.width + Math.round(x)) * 4 + 3] > 40,
    elevation: sampleGray(elevationCanvas, x, y, elevationData),
    neighbors: Array.from(delaunay.neighbors(id)),
  }));
  const landCells = cells.filter((cell) => cell.land);
  if (landCells.length < 10) return [];
  const maxElevation = Math.max(...landCells.map((cell) => cell.elevation));
  const minSourceElevation = Math.max(145, maxElevation - 45);
  const sources = landCells
    .filter((cell) => cell.elevation >= minSourceElevation)
    .sort((a, b) => b.elevation - a.elevation)
    .slice(0, sourceCount);
  const rivers: PlacedPath[] = [];
  const used = new Set<number>();

  sources.forEach((source, sourceIndex) => {
    if (used.has(source.id)) return;
    const path: PathPoint[] = [];
    const visited = new Set<number>();
    let current = source;
    for (let step = 0; step < 100; step++) {
      if (visited.has(current.id)) break;
      visited.add(current.id);
      used.add(current.id);
      path.push({ x: Math.round(current.x), y: Math.round(current.y) });
      const nextOptions = current.neighbors
        .map((id) => cells[id])
        .filter((cell) => cell && !visited.has(cell.id))
        .sort((a, b) => {
          const aScore = a.elevation + fbm2D(a.x * 0.02 + seed, a.y * 0.02) * 7;
          const bScore = b.elevation + fbm2D(b.x * 0.02 + seed, b.y * 0.02) * 7;
          return aScore - bScore;
        });
      const next = nextOptions[0];
      if (!next || next.elevation > current.elevation + 3) break;
      current = next;
      if (!current.land || current.elevation < 128) {
        path.push({ x: Math.round(current.x), y: Math.round(current.y) });
        break;
      }
    }
    if (path.length >= 6) {
      rivers.push({
        id: `heightmap_river_${seed}_${sourceIndex}`,
        style: 'river',
        points: path,
        width: Math.max(2.5, 8 - sourceIndex * 0.35),
        color: '#2f7bc9',
        textureId: 'river_water',
        opacity: 0.92,
        smoothed: true,
        taper: true,
        restrictToLand: true,
      });
    }
  });
  return rivers;
}
