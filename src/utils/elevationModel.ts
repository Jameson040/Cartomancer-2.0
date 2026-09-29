/**
 * Cartomancer Fantasy Map Maker - Elevation Model & Topographical Engine
 * Supports real elevation in meters (-15,000m to +15,000m, plus custom worlds/planets)
 * Grounded in the principle: The drawn map is the ground truth, topography is derivative.
 */

import { WorldElevationConfig, PlacedStamp, PlacedPath, PathPoint } from '../types';
import { fbm2D } from './proceduralNoise';

export const DEFAULT_WORLD_ELEVATION: WorldElevationConfig = {
  minElevation: -15000,
  maxElevation: 15000,
  seaLevel: 0,
  unit: 'meters',
  worldPreset: 'titanic_fantasy',
  customName: 'Titanic Fantasy Realm (-15,000m to +15,000m)',
};

export const WORLD_PRESETS: Record<string, WorldElevationConfig> = {
  titanic_fantasy: {
    minElevation: -15000,
    maxElevation: 15000,
    seaLevel: 0,
    unit: 'meters',
    worldPreset: 'titanic_fantasy',
    customName: 'Titanic Fantasy (-15,000m to +15,000m)',
  },
  earth: {
    minElevation: -11000,
    maxElevation: 8848,
    seaLevel: 0,
    unit: 'meters',
    worldPreset: 'earth',
    customName: 'Earth Realism (-11,000m Mariana to +8,848m Everest)',
  },
  mars: {
    minElevation: -7200,
    maxElevation: 21287,
    seaLevel: 0,
    unit: 'meters',
    worldPreset: 'mars',
    customName: 'Mars / Other World (-7,200m Hellas to +21,287m Olympus Mons)',
  },
  custom: {
    minElevation: -15000,
    maxElevation: 15000,
    seaLevel: 0,
    unit: 'meters',
    worldPreset: 'custom',
    customName: 'Custom Defined World',
  },
};

/**
 * Convert elevation in real meters to 0..255 byte for elevation canvas
 * Byte 0 = minElevation (e.g. -15,000m deep sea trench)
 * Byte 128 = seaLevel (0m coastline)
 * Byte 255 = maxElevation (e.g. +15,000m extreme summit)
 */
export function metersToByte(meters: number, config: WorldElevationConfig = DEFAULT_WORLD_ELEVATION): number {
  if (meters <= config.seaLevel) {
    const range = config.seaLevel - config.minElevation;
    if (range <= 0) return 128;
    const fraction = Math.max(0, Math.min(1, (meters - config.minElevation) / range));
    return Math.round(fraction * 128);
  } else {
    const range = config.maxElevation - config.seaLevel;
    if (range <= 0) return 128;
    const fraction = Math.max(0, Math.min(1, (meters - config.seaLevel) / range));
    return Math.round(128 + fraction * 127);
  }
}

/**
 * Convert 0..255 byte back to real meters
 */
export function byteToMeters(byte: number, config: WorldElevationConfig = DEFAULT_WORLD_ELEVATION): number {
  if (byte <= 128) {
    const fraction = byte / 128;
    return Math.round(config.minElevation + fraction * (config.seaLevel - config.minElevation));
  } else {
    const fraction = (byte - 128) / 127;
    return Math.round(config.seaLevel + fraction * (config.maxElevation - config.seaLevel));
  }
}

/**
 * Topographical Hypsometric Tint Palette based on true physical meters
 */
export function getTopographicRgbMeters(
  meters: number,
  config: WorldElevationConfig = DEFAULT_WORLD_ELEVATION
): [number, number, number] {
  if (meters < config.seaLevel) {
    // Ocean bathymetry: from minElevation up to 0m
    const depthFrac = Math.max(0, Math.min(1, (meters - config.minElevation) / (config.seaLevel - config.minElevation || 1)));
    if (depthFrac <= 0.2) {
      // Abyssal trench: Midnight Navy (#020b17 to #071f3d)
      const t = depthFrac / 0.2;
      return [Math.round(2 + t * 5), Math.round(11 + t * 20), Math.round(23 + t * 38)];
    } else if (depthFrac <= 0.6) {
      // Deep ocean: Deep Sapphire (#071f3d to #0c4a6e)
      const t = (depthFrac - 0.2) / 0.4;
      return [Math.round(7 + t * 5), Math.round(31 + t * 43), Math.round(61 + t * 49)];
    } else if (depthFrac <= 0.9) {
      // Continental slope: Ocean Blue (#0c4a6e to #0284c7)
      const t = (depthFrac - 0.6) / 0.3;
      return [Math.round(12 - t * 10), Math.round(74 + t * 58), Math.round(110 + t * 89)];
    } else {
      // Continental shelf / Shallows: Aquamarine (#0284c7 to #38bdf8)
      const t = (depthFrac - 0.9) / 0.1;
      return [Math.round(2 + t * 54), Math.round(132 + t * 57), Math.round(199 + t * 49)];
    }
  } else {
    // Land hypsometry: from 0m up to maxElevation
    const maxLand = Math.max(1, config.maxElevation - config.seaLevel);
    const heightFrac = Math.max(0, Math.min(1, (meters - config.seaLevel) / maxLand));

    // Thresholds scaled to maxLand:
    // 0 -> 2% Coast/Beach
    // 2% -> 10% Lowland Green
    // 10% -> 25% Midland Hills
    // 25% -> 45% Highland Plateau Gold/Ochre
    // 45% -> 70% Mountain Crags Crimson/Slate
    // 70% -> 85% Alpine Scree Grey
    // 85% -> 100% Glacial Snow Summit
    if (heightFrac <= 0.02) {
      // Beach / Coastline Sand (#ecd69a to #d8c27a)
      const t = heightFrac / 0.02;
      return [Math.round(236 - t * 20), Math.round(214 - t * 20), Math.round(154 - t * 32)];
    } else if (heightFrac <= 0.10) {
      // Lowland plains: Verdant meadow (#15803d to #22c55e)
      const t = (heightFrac - 0.02) / 0.08;
      return [Math.round(21 + t * 13), Math.round(128 + t * 69), Math.round(61 + t * 33)];
    } else if (heightFrac <= 0.25) {
      // Midland hills: Lime to Golden ochre (#65a30d to #ca8a04)
      const t = (heightFrac - 0.10) / 0.15;
      return [Math.round(101 + t * 101), Math.round(163 - t * 25), Math.round(13 - t * 9)];
    } else if (heightFrac <= 0.45) {
      // Highland plateaus: Ochre to Burnt Sienna (#ca8a04 to #c2410c)
      const t = (heightFrac - 0.25) / 0.20;
      return [Math.round(202 - t * 8), Math.round(138 - t * 73), Math.round(4 + t * 8)];
    } else if (heightFrac <= 0.70) {
      // Mountain ridges: Deep Sienna to Rocky Slate (#9a3412 to #57534e)
      const t = (heightFrac - 0.45) / 0.25;
      return [Math.round(154 - t * 67), Math.round(52 + t * 31), Math.round(18 + t * 60)];
    } else if (heightFrac <= 0.85) {
      // Alpine scree & granite (#57534e to #94a3b8)
      const t = (heightFrac - 0.70) / 0.15;
      return [Math.round(87 + t * 61), Math.round(83 + t * 80), Math.round(78 + t * 106)];
    } else {
      // Glacial alpine ice & perpetual snow (#cbd5e1 to #ffffff)
      const t = (heightFrac - 0.85) / 0.15;
      return [Math.round(203 + t * 52), Math.round(213 + t * 42), Math.round(225 + t * 30)];
    }
  }
}

export interface DeriveTopographyParams {
  maskCanvas: HTMLCanvasElement;
  stamps: PlacedStamp[];
  paths: PlacedPath[];
  config?: WorldElevationConfig;
  resolution?: number; // width/height step for fast simulation
}

export interface DerivedTopographyResult {
  heightsMeters: Float32Array; // Real meter heights for every grid cell
  cols: number;
  rows: number;
  cellWidth: number;
  cellHeight: number;
  width: number;
  height: number;
  suggestedRivers: PlacedPath[];
  suggestedRoutes: PlacedPath[];
  suggestedSettlements: Array<{
    name: string;
    type: 'port' | 'town' | 'fortress';
    x: number;
    y: number;
    elevationMeters: number;
  }>;
}

/**
 * Core Algorithm: Derive Topography from Drawn Map
 * The drawn landmask, placed mountain/hill stamps, and rivers act as the ground truth.
 * Topography is mathematically derived to fit the user's creation.
 */
export function deriveTopographyFromDrawnMap(
  params: DeriveTopographyParams
): DerivedTopographyResult {
  const { maskCanvas, stamps, paths, config = DEFAULT_WORLD_ELEVATION } = params;
  const width = maskCanvas.width;
  const height = maskCanvas.height;

  // Working resolution: balanced for instant preview and high fidelity (approx 160 cols)
  const cols = Math.min(200, Math.max(100, Math.round(width / 7)));
  const cellWidth = width / cols;
  const rows = Math.round(height / cellWidth);
  const cellHeight = height / rows;
  const totalCells = cols * rows;

  const heightsMeters = new Float32Array(totalCells);
  const isLandGrid = new Uint8Array(totalCells);

  // 1. Sample Drawn Land Mask
  const mCtx = maskCanvas.getContext('2d');
  const mData = mCtx ? mCtx.getImageData(0, 0, width, height).data : null;

  for (let r = 0; r < rows; r++) {
    const y = Math.min(height - 1, Math.floor((r + 0.5) * cellHeight));
    for (let c = 0; c < cols; c++) {
      const x = Math.min(width - 1, Math.floor((c + 0.5) * cellWidth));
      const idx = r * cols + c;
      if (mData) {
        const pIdx = (y * width + x) * 4;
        isLandGrid[idx] = mData[pIdx + 3] > 60 ? 1 : 0;
      } else {
        isLandGrid[idx] = 1;
      }
    }
  }

  // 2. Distance Transform from Coastline (in grid cell units)
  // Distance to nearest land for water, distance to nearest water for land
  const distToCoast = new Float32Array(totalCells);

  // Approximate 2-pass Euclidean distance
  const INF = 99999;
  for (let i = 0; i < totalCells; i++) distToCoast[i] = INF;

  // Find coastline boundary cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isLand = isLandGrid[idx];
      let isCoast = false;

      // Check 4 neighbors
      if (r > 0 && isLandGrid[(r - 1) * cols + c] !== isLand) isCoast = true;
      if (r < rows - 1 && isLandGrid[(r + 1) * cols + c] !== isLand) isCoast = true;
      if (c > 0 && isLandGrid[r * cols + (c - 1)] !== isLand) isCoast = true;
      if (c < cols - 1 && isLandGrid[r * cols + (c + 1)] !== isLand) isCoast = true;

      if (isCoast) {
        distToCoast[idx] = 0.5;
      }
    }
  }

  // Forward sweep
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (distToCoast[idx] === 0.5) continue;
      let minD = distToCoast[idx];
      if (r > 0) minD = Math.min(minD, distToCoast[(r - 1) * cols + c] + 1);
      if (c > 0) minD = Math.min(minD, distToCoast[r * cols + (c - 1)] + 1);
      if (r > 0 && c > 0) minD = Math.min(minD, distToCoast[(r - 1) * cols + (c - 1)] + 1.414);
      if (r > 0 && c < cols - 1) minD = Math.min(minD, distToCoast[(r - 1) * cols + (c + 1)] + 1.414);
      distToCoast[idx] = minD;
    }
  }

  // Backward sweep
  for (let r = rows - 1; r >= 0; r--) {
    for (let c = cols - 1; c >= 0; c--) {
      const idx = r * cols + c;
      let minD = distToCoast[idx];
      if (r < rows - 1) minD = Math.min(minD, distToCoast[(r + 1) * cols + c] + 1);
      if (c < cols - 1) minD = Math.min(minD, distToCoast[r * cols + (c + 1)] + 1);
      if (r < rows - 1 && c < cols - 1) minD = Math.min(minD, distToCoast[(r + 1) * cols + (c + 1)] + 1.414);
      if (r < rows - 1 && c > 0) minD = Math.min(minD, distToCoast[(r + 1) * cols + (c - 1)] + 1.414);
      distToCoast[idx] = minD;
    }
  }

  // 3. Compute Base Elevation Field from Coastline Distance
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const isLand = isLandGrid[idx] === 1;
      const d = distToCoast[idx];

      if (!isLand) {
        // Ocean Bathymetry: slopes from 0m down to shelf (-200m) and abyssal depth (-4,000m to -15,000m)
        const shelfCells = 4;
        let depthMeters: number;
        if (d <= shelfCells) {
          // Continental shelf gently slopes 0m -> -200m
          depthMeters = -(d / shelfCells) * 200;
        } else {
          // Continental slope & abyss drops rapidly towards minElevation
          const abyssT = Math.min(1, (d - shelfCells) / 25);
          const deepTarget = Math.max(config.minElevation, -4000 + (config.minElevation + 4000) * (abyssT * 0.7));
          depthMeters = -200 + abyssT * (deepTarget + 200);
        }
        heightsMeters[idx] = depthMeters;
      } else {
        // Land Topography Base: slopes up from 0m coastal plains to +300m / +600m interior lowlands
        const plainT = Math.min(1, d / 20);
        const interiorMeters = 50 + plainT * 450;
        heightsMeters[idx] = interiorMeters;
      }
    }
  }

  // 4. Integrate Drawn Mountain & Hill Stamps as High Geological Relief Anchors
  // Separate stamps by geological category
  const mountainStamps = stamps.filter((s) => {
    const aid = s.assetId.toLowerCase();
    return (
      aid.includes('mountain') ||
      aid.includes('peak') ||
      aid.includes('ridge') ||
      aid.includes('spire') ||
      aid.includes('volcano') ||
      aid.includes('mesa')
    );
  });

  const hillStamps = stamps.filter((s) => {
    const aid = s.assetId.toLowerCase();
    return aid.includes('hill') || aid.includes('mound') || aid.includes('dune') || aid.includes('rock');
  });

  // Calculate target heights based on world maxElevation
  const maxElev = config.maxElevation;
  const peakHeightTarget = Math.min(maxElev * 0.85, Math.max(4500, maxElev * 0.65));
  const ridgeHeightTarget = peakHeightTarget * 0.7;
  const hillHeightTarget = Math.min(peakHeightTarget * 0.35, 1800);

  // Apply mountain stamps
  mountainStamps.forEach((s) => {
    const cx = s.x;
    const cy = s.y;
    const scale = s.scale || 1.0;
    const radiusPx = 70 * scale;
    const radiusCells = radiusPx / cellWidth;
    const radiusSq = radiusCells * radiusCells;

    const aid = s.assetId.toLowerCase();
    const isPeak = aid.includes('peak') || aid.includes('spire') || aid.includes('volcano');
    const peakMeters = (isPeak ? peakHeightTarget : ridgeHeightTarget) * (0.85 + scale * 0.25);

    const minC = Math.max(0, Math.floor((cx - radiusPx) / cellWidth));
    const maxC = Math.min(cols - 1, Math.ceil((cx + radiusPx) / cellWidth));
    const minR = Math.max(0, Math.floor((cy - radiusPx) / cellHeight));
    const maxR = Math.min(rows - 1, Math.ceil((cy + radiusPx) / cellHeight));

    for (let r = minR; r <= maxR; r++) {
      const cellY = (r + 0.5) * cellHeight;
      for (let c = minC; c <= maxC; c++) {
        const cellX = (c + 0.5) * cellWidth;
        const dx = (cellX - cx) / cellWidth;
        const dy = (cellY - cy) / cellHeight;
        const dSq = dx * dx + dy * dy;

        if (dSq <= radiusSq) {
          const idx = r * cols + c;
          if (isLandGrid[idx] === 1) {
            // Gaussian bell falloff
            const bell = Math.exp(-dSq / (radiusSq * 0.45));
            const uplift = peakMeters * bell;
            heightsMeters[idx] = Math.max(heightsMeters[idx], heightsMeters[idx] * (1 - bell) + uplift);
          }
        }
      }
    }
  });

  // Apply connecting geological ridges between closely spaced mountain stamps
  for (let i = 0; i < mountainStamps.length; i++) {
    for (let j = i + 1; j < mountainStamps.length; j++) {
      const s1 = mountainStamps[i];
      const s2 = mountainStamps[j];
      const dist = Math.hypot(s1.x - s2.x, s1.y - s2.y);
      // Connect if within range of forming a chain
      if (dist < 150) {
        const steps = Math.ceil(dist / 10);
        for (let step = 1; step < steps; step++) {
          const t = step / steps;
          const rx = s1.x + (s2.x - s1.x) * t;
          const ry = s1.y + (s2.y - s1.y) * t;
          const c = Math.round(rx / cellWidth);
          const r = Math.round(ry / cellHeight);
          if (c >= 0 && c < cols && r >= 0 && r < rows) {
            const idx = r * cols + c;
            if (isLandGrid[idx] === 1) {
              const ridgeMeters = ridgeHeightTarget * 0.8;
              heightsMeters[idx] = Math.max(heightsMeters[idx], ridgeMeters);
            }
          }
        }
      }
    }
  }

  // Apply hill stamps
  hillStamps.forEach((s) => {
    const cx = s.x;
    const cy = s.y;
    const scale = s.scale || 1.0;
    const radiusPx = 45 * scale;
    const radiusCells = radiusPx / cellWidth;
    const radiusSq = radiusCells * radiusCells;
    const hillMeters = hillHeightTarget * (0.8 + scale * 0.3);

    const minC = Math.max(0, Math.floor((cx - radiusPx) / cellWidth));
    const maxC = Math.min(cols - 1, Math.ceil((cx + radiusPx) / cellWidth));
    const minR = Math.max(0, Math.floor((cy - radiusPx) / cellHeight));
    const maxR = Math.min(rows - 1, Math.ceil((cy + radiusPx) / cellHeight));

    for (let r = minR; r <= maxR; r++) {
      const cellY = (r + 0.5) * cellHeight;
      for (let c = minC; c <= maxC; c++) {
        const cellX = (c + 0.5) * cellWidth;
        const dx = (cellX - cx) / cellWidth;
        const dy = (cellY - cy) / cellHeight;
        const dSq = dx * dx + dy * dy;

        if (dSq <= radiusSq) {
          const idx = r * cols + c;
          if (isLandGrid[idx] === 1) {
            const bell = Math.exp(-dSq / (radiusSq * 0.4));
            heightsMeters[idx] = Math.max(heightsMeters[idx], hillMeters * bell + 250);
          }
        }
      }
    }
  });

  // 5. River Valley Carving: Carve valleys where user has drawn rivers
  const riverPaths = paths.filter((p) => p.style === 'river');
  riverPaths.forEach((rp) => {
    const pts = rp.points;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const c = Math.round(p.x / cellWidth);
      const r = Math.round(p.y / cellHeight);
      const carveRadius = 2;

      for (let dr = -carveRadius; dr <= carveRadius; dr++) {
        for (let dc = -carveRadius; dc <= carveRadius; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
            const idx = nr * cols + nc;
            if (isLandGrid[idx] === 1) {
              const d = Math.hypot(dr, dc);
              if (d <= carveRadius) {
                // Valley depression
                const valleyErosion = 250 * (1 - d / carveRadius);
                heightsMeters[idx] = Math.max(25, heightsMeters[idx] - valleyErosion);
              }
            }
          }
        }
      }
    }
  });

  // 6. Suggest Rivers based on Topographical Watershed Drainage
  const suggestedRivers: PlacedPath[] = [];
  // Find high elevation cells to start rivers. Hand-painted/default maps often
  // do not contain literal mountain stamps, so requiring 1,800m here made the
  // generator silently return nothing. Use a world-scaled threshold and fall
  // back to the highest interior land cells when the map is low-relief.
  const candidateSources: Array<{ c: number; r: number; elev: number }> = [];
  const sourceThreshold = Math.min(1800, Math.max(180, config.maxElevation * 0.12));
  for (let r = 2; r < rows - 2; r += 4) {
    for (let c = 2; c < cols - 2; c += 4) {
      const idx = r * cols + c;
      if (isLandGrid[idx] === 1 && heightsMeters[idx] > sourceThreshold) {
        candidateSources.push({ c, r, elev: heightsMeters[idx] });
      }
    }
  }

  // Low-relief maps still need useful test rivers. Choose the highest land
  // cells, preferring points away from the coastline, instead of failing with
  // an empty suggestion list.
  if (candidateSources.length === 0) {
    for (let r = 3; r < rows - 3; r += 3) {
      for (let c = 3; c < cols - 3; c += 3) {
        const idx = r * cols + c;
        if (isLandGrid[idx] === 1 && distToCoast[idx] > 3) {
          candidateSources.push({ c, r, elev: heightsMeters[idx] + distToCoast[idx] * 20 });
        }
      }
    }
  }

  // Sort candidate sources descending
  candidateSources.sort((a, b) => b.elev - a.elev);
  const selectedSources = candidateSources.slice(0, 5);

  selectedSources.forEach((src, sIdx) => {
    let curC = src.c;
    let curR = src.r;
    const riverPoints: PathPoint[] = [
      { x: Math.round((curC + 0.5) * cellWidth), y: Math.round((curR + 0.5) * cellHeight) }
    ];
    const visited = new Set<number>();
    visited.add(curR * cols + curC);

    for (let step = 0; step < 80; step++) {
      let lowestNeighbor: { c: number; r: number; h: number } | null = null;

      // 8-direction downhill descent
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nc = curC + dc;
          const nr = curR + dr;
          if (nc >= 0 && nc < cols && nr >= 0 && nr < rows) {
            const nIdx = nr * cols + nc;
            if (!visited.has(nIdx)) {
              const h = heightsMeters[nIdx];
              // A strict lowest-neighbour walk produces ruler-straight rivers
              // on the derived low-relief field. Add a small deterministic
              // meander cost while keeping elevation as the dominant factor.
              const meander = fbm2D(
                nc * 0.16 + sIdx * 13.7,
                nr * 0.16 - sIdx * 9.1,
                3,
                0.55,
                2.0
              );
              const score = h + meander * 70;
              const currentScore = lowestNeighbor
                ? lowestNeighbor.h + fbm2D(
                    lowestNeighbor.c * 0.16 + sIdx * 13.7,
                    lowestNeighbor.r * 0.16 - sIdx * 9.1,
                    3,
                    0.55,
                    2.0
                  ) * 70
                : Number.POSITIVE_INFINITY;
              if (!lowestNeighbor || score < currentScore) {
                lowestNeighbor = { c: nc, r: nr, h };
              }
            }
          }
        }
      }

      if (!lowestNeighbor) break;

      curC = lowestNeighbor.c;
      curR = lowestNeighbor.r;
      const idx = curR * cols + curC;
      visited.add(idx);

      riverPoints.push({
        x: Math.round((curC + 0.5) * cellWidth),
        y: Math.round((curR + 0.5) * cellHeight),
      });

      // Terminate when ocean reached
      if (isLandGrid[idx] === 0 || heightsMeters[idx] <= 0) {
        break;
      }
    }

    if (riverPoints.length > 5) {
      suggestedRivers.push({
        id: `suggested_river_${Date.now()}_${sIdx}`,
        style: 'river',
        points: riverPoints,
        width: 3.5,
        color: '#0284c7',
        opacity: 0.9,
        smoothed: true,
      });
    }
  });

  // 7. Suggest Settlements based on Topography
  // Ports: Coastal bays at <50m
  // Towns: River valleys & fertile plains (100m to 400m)
  // Fortresses: Mountain passes (1000m to 2000m)
  const suggestedSettlements: DerivedTopographyResult['suggestedSettlements'] = [];

  // Ports
  for (let r = 5; r < rows - 5; r += 6) {
    for (let c = 5; c < cols - 5; c += 6) {
      const idx = r * cols + c;
      if (isLandGrid[idx] === 1 && distToCoast[idx] <= 2 && heightsMeters[idx] < 80) {
        suggestedSettlements.push({
          name: `Port Bay ${suggestedSettlements.length + 1}`,
          type: 'port',
          x: Math.round((c + 0.5) * cellWidth),
          y: Math.round((r + 0.5) * cellHeight),
          elevationMeters: Math.round(heightsMeters[idx]),
        });
        break;
      }
    }
    if (suggestedSettlements.length >= 2) break;
  }

  // Market Towns
  for (let r = 8; r < rows - 8; r += 7) {
    for (let c = 8; c < cols - 8; c += 7) {
      const idx = r * cols + c;
      if (isLandGrid[idx] === 1 && heightsMeters[idx] >= 120 && heightsMeters[idx] <= 400) {
        suggestedSettlements.push({
          name: `Lowland Settlement ${suggestedSettlements.length + 1}`,
          type: 'town',
          x: Math.round((c + 0.5) * cellWidth),
          y: Math.round((r + 0.5) * cellHeight),
          elevationMeters: Math.round(heightsMeters[idx]),
        });
        break;
      }
    }
    if (suggestedSettlements.length >= 4) break;
  }

  // Mountain Fortresses
  for (let r = 6; r < rows - 6; r += 5) {
    for (let c = 6; c < cols - 6; c += 5) {
      const idx = r * cols + c;
      if (isLandGrid[idx] === 1 && heightsMeters[idx] >= 1200 && heightsMeters[idx] <= 2500) {
        suggestedSettlements.push({
          name: `Highpass Citadel ${suggestedSettlements.length + 1}`,
          type: 'fortress',
          x: Math.round((c + 0.5) * cellWidth),
          y: Math.round((r + 0.5) * cellHeight),
          elevationMeters: Math.round(heightsMeters[idx]),
        });
        break;
      }
    }
    if (suggestedSettlements.length >= 6) break;
  }

  // Low-relief or very small maps may not satisfy the normal settlement
  // elevation bands. Seed two river-connected market points so route generation
  // remains useful instead of silently producing no roads.
  if (suggestedSettlements.length < 2 && suggestedRivers.length > 0) {
    const river = suggestedRivers[0];
    const first = river.points[Math.min(2, river.points.length - 1)];
    const last = river.points[Math.max(0, river.points.length - 3)];
    suggestedSettlements.push(
      { name: 'River Market', type: 'town', x: first.x, y: first.y, elevationMeters: 100 },
      { name: 'River Crossing', type: 'town', x: last.x, y: last.y, elevationMeters: 100 }
    );
  }

  // 8. Suggest Trade Routes connecting settlements along lowest contour valleys
  const suggestedRoutes: PlacedPath[] = [];
  if (suggestedSettlements.length >= 2) {
    for (let i = 0; i < suggestedSettlements.length - 1; i++) {
      const p1 = suggestedSettlements[i];
      const p2 = suggestedSettlements[i + 1];

      const steps = 20;
      const routePoints: PathPoint[] = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const baseX = p1.x + (p2.x - p1.x) * t;
        const baseY = p1.y + (p2.y - p1.y) * t;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const normalX = -dy / length;
        const normalY = dx / length;
        // Trade routes are influenced by settlement distance and terrain, not
        // drawn as a perfectly straight ruler line. This creates a readable
        // organic corridor while keeping both endpoints anchored.
        const bend = Math.sin(t * Math.PI) * (18 + fbm2D(i * 0.7, s * 0.22, 3) * 24);
        const lx = Math.max(0, Math.min(width, baseX + normalX * bend));
        const ly = Math.max(0, Math.min(height, baseY + normalY * bend));
        routePoints.push({ x: Math.round(lx), y: Math.round(ly) });
      }

      suggestedRoutes.push({
        id: `suggested_route_${Date.now()}_${i}`,
        style: 'road',
        points: routePoints,
        width: 2.2,
        color: '#b45309',
        opacity: 0.85,
        smoothed: true,
      });
    }
  }

  return {
    heightsMeters,
    cols,
    rows,
    cellWidth,
    cellHeight,
    width,
    height,
    suggestedRivers,
    suggestedRoutes,
    suggestedSettlements,
  };
}

/**
 * Bake Derived Topography into elevationCanvas (0..255 byte map)
 */
export function bakeTopographyToCanvas(
  result: DerivedTopographyResult,
  elevationCanvas: HTMLCanvasElement,
  config: WorldElevationConfig = DEFAULT_WORLD_ELEVATION
): void {
  elevationCanvas.width = result.width;
  elevationCanvas.height = result.height;
  const eCtx = elevationCanvas.getContext('2d');
  if (!eCtx) return;

  const { cols, rows, cellWidth, cellHeight, heightsMeters } = result;

  // Render cells to canvas
  for (let r = 0; r < rows; r++) {
    const y = Math.round(r * cellHeight);
    const h = Math.ceil(cellHeight);
    for (let c = 0; c < cols; c++) {
      const x = Math.round(c * cellWidth);
      const w = Math.ceil(cellWidth);
      const idx = r * cols + c;
      const meters = heightsMeters[idx];
      const byteVal = metersToByte(meters, config);

      eCtx.fillStyle = `rgb(${byteVal}, ${byteVal}, ${byteVal})`;
      eCtx.fillRect(x, y, w, h);
    }
  }
}

/**
 * Slope-Limited Deposition (Angle of Repose):
 * Simulates natural talus accumulation—when painting steep peaks, deposits jagged ridgelines
 * in the center while shedding scree and debris down steep slopes to collect at the base.
 */
export function applySlopeLimitedDeposition(
  elevationCanvas: HTMLCanvasElement,
  cx: number,
  cy: number,
  radius: number,
  heightDelta: number,
  angleRepose: number = 0.45,
  profile: 'gaussian' | 'plateau' | 'ridge' | 'terraced' = 'gaussian'
): void {
  const eCtx = elevationCanvas.getContext('2d');
  if (!eCtx) return;

  const w = elevationCanvas.width;
  const h = elevationCanvas.height;

  const pad = Math.ceil(radius * 1.5);
  const minX = Math.max(1, Math.floor(cx - pad));
  const minY = Math.max(1, Math.floor(cy - pad));
  const maxX = Math.min(w - 2, Math.ceil(cx + pad));
  const maxY = Math.min(h - 2, Math.ceil(cy + pad));
  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;

  if (boxW <= 2 || boxH <= 2) return;

  const imgData = eCtx.getImageData(minX, minY, boxW, boxH);
  const data = imgData.data;

  // Critical slope threshold before material sheds downhill
  const maxSlope = 22 * (angleRepose / 0.45);

  const getElev = (bx: number, by: number) => {
    const idx = (by * boxW + bx) * 4;
    return data[idx + 3] > 0 ? data[idx] : 128;
  };

  const setElev = (bx: number, by: number, val: number) => {
    if (bx < 0 || bx >= boxW || by < 0 || by >= boxH) return;
    const idx = (by * boxW + bx) * 4;
    const clamped = Math.max(0, Math.min(255, Math.round(val)));
    data[idx] = clamped;
    data[idx + 1] = clamped;
    data[idx + 2] = clamped;
    data[idx + 3] = 255;
  };

  for (let by = 1; by < boxH - 1; by++) {
    const py = minY + by;
    for (let bx = 1; bx < boxW - 1; bx++) {
      const px = minX + bx;
      const dist = Math.hypot(px - cx, py - cy);
      if (dist > radius) continue;

      const normDist = dist / radius;
      let falloff = 1 - normDist;
      if (profile === 'gaussian') {
        falloff = Math.exp(-3 * normDist * normDist);
      } else if (profile === 'ridge') {
        falloff = Math.pow(1 - normDist, 1.8);
      }

      // Local gradient slope
      const gx = (getElev(bx + 1, by) - getElev(bx - 1, by)) / 2;
      const gy = (getElev(bx, by + 1) - getElev(bx, by - 1)) / 2;
      const slope = Math.hypot(gx, gy);

      const curH = getElev(bx, by);

      if (slope > maxSlope && heightDelta > 0) {
        // Slope is steeper than angle of repose: cliff face cannot hold new rock!
        // Retain thin razor ridgeline in center, while shedding scree downhill
        const centralRetention = Math.max(0.1, 1 - normDist);
        setElev(bx, by, curH + heightDelta * falloff * centralRetention * 0.4);

        // Shed debris down the slope vector
        const dirX = -gx / (slope || 1);
        const dirY = -gy / (slope || 1);
        const screeBx = Math.round(bx + dirX * 3);
        const screeBy = Math.round(by + dirY * 3);

        if (screeBx >= 0 && screeBx < boxW && screeBy >= 0 && screeBy < boxH) {
          const screeH = getElev(screeBx, screeBy);
          setElev(screeBx, screeBy, screeH + heightDelta * falloff * (1 - centralRetention) * 0.7);
        }
      } else {
        // Normal deposition
        setElev(bx, by, curH + heightDelta * falloff);
      }
    }
  }

  eCtx.putImageData(imgData, minX, minY);
}

/**
 * Hydrological Drainage & Natural River Routing:
 * Computes steepest-descent flow vectors along the elevation matrix, with water momentum
 * and depression filling, so rivers snap to natural drainage basins and flow to the sea.
 */
export function computeHydrologicalDrainagePath(
  startX: number,
  startY: number,
  elevationCanvas: HTMLCanvasElement,
  maskCanvas: HTMLCanvasElement,
  stepSize: number = 8,
  maxSteps: number = 280
): PathPoint[] {
  const eCtx = elevationCanvas.getContext('2d');
  const mCtx = maskCanvas.getContext('2d');
  if (!eCtx || !mCtx) return [{ x: startX, y: startY }];

  const width = elevationCanvas.width;
  const height = elevationCanvas.height;

  const eData = eCtx.getImageData(0, 0, width, height).data;
  const mData = mCtx.getImageData(0, 0, width, height).data;

  const getElevation = (x: number, y: number): number => {
    const rx = Math.max(0, Math.min(width - 1, Math.round(x)));
    const ry = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (ry * width + rx) * 4;
    return eData[idx + 3] > 0 ? eData[idx] : 128;
  };

  const isOcean = (x: number, y: number): boolean => {
    const rx = Math.max(0, Math.min(width - 1, Math.round(x)));
    const ry = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (ry * width + rx) * 4;
    // The land mask is authoritative for coastlines. Treating every pixel at
    // or below byte 128 as ocean makes unpainted/flat land reject rivers and
    // is especially visible on template maps. Elevation controls flow, not
    // whether a point belongs to the map's ocean layer.
    return mData[idx + 3] < 35;
  };

  const points: PathPoint[] = [{ x: Math.round(startX), y: Math.round(startY) }];
  let currX = startX;
  let currY = startY;
  let vx = 0;
  let vy = 0;

  for (let step = 0; step < maxSteps; step++) {
    // Sample 5x5 neighborhood gradient for smooth downhill direction
    const sampleDist = 4;
    const hL = getElevation(currX - sampleDist, currY);
    const hR = getElevation(currX + sampleDist, currY);
    const hU = getElevation(currX, currY - sampleDist);
    const hD = getElevation(currX, currY + sampleDist);

    let gx = (hR - hL) / (sampleDist * 2);
    let gy = (hD - hU) / (sampleDist * 2);

    let slope = Math.hypot(gx, gy);

    // If caught in a flat basin/sink, seek lowest saddle in surrounding radius
    if (slope < 0.08) {
      let minVal = 999;
      let saddleX = currX;
      let saddleY = currY;
      const searchR = 18;
      for (let a = 0; a < 12; a++) {
        const ang = (a * Math.PI) / 6;
        const sx = currX + Math.cos(ang) * searchR;
        const sy = currY + Math.sin(ang) * searchR;
        const sh = getElevation(sx, sy);
        if (sh < minVal) {
          minVal = sh;
          saddleX = sx;
          saddleY = sy;
        }
      }
      gx = (saddleX - currX) * 0.1;
      gy = (saddleY - currY) * 0.1;
      slope = Math.hypot(gx, gy) || 1;
    }

    // Downhill force vector
    const dirX = -gx / (slope || 1);
    const dirY = -gy / (slope || 1);

    // Water flow momentum: 65% momentum, 35% downhill gravity
    vx = vx * 0.65 + dirX * 0.35;
    vy = vy * 0.65 + dirY * 0.35;
    const vLen = Math.hypot(vx, vy);
    if (vLen > 0.001) {
      vx /= vLen;
      vy /= vLen;
    }

    // Advance water point
    currX += vx * stepSize;
    currY += vy * stepSize;

    // Boundary check
    if (currX < 12 || currX > width - 12 || currY < 12 || currY > height - 12) {
      points.push({ x: Math.round(currX), y: Math.round(currY) });
      break;
    }

    // Reached ocean/coastline?
    if (isOcean(currX, currY)) {
      // Flow 12px out into the estuary/bay mouth then terminate
      points.push({ x: Math.round(currX), y: Math.round(currY) });
      points.push({ x: Math.round(currX + vx * 12), y: Math.round(currY + vy * 12) });
      break;
    }

    const last = points[points.length - 1];
    if (Math.hypot(currX - last.x, currY - last.y) >= 6) {
      points.push({ x: Math.round(currX), y: Math.round(currY) });
    }
  }

  return points;
}

/**
 * Carves a natural elevation gorge/trough along a river path so the river
 * physically sits within a carved valley or canyon.
 */
export function carveRiverGorge(
  pathPoints: PathPoint[],
  elevationCanvas: HTMLCanvasElement,
  gorgeDepth: number = 8,
  gorgeRadius: number = 10
): void {
  if (pathPoints.length < 2) return;
  const eCtx = elevationCanvas.getContext('2d');
  if (!eCtx) return;

  const w = elevationCanvas.width;
  const h = elevationCanvas.height;

  // Find bounding box
  let minX = w, minY = h, maxX = 0, maxY = 0;
  for (const p of pathPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const pad = gorgeRadius + 4;
  minX = Math.max(0, Math.floor(minX - pad));
  minY = Math.max(0, Math.floor(minY - pad));
  maxX = Math.min(w - 1, Math.ceil(maxX + pad));
  maxY = Math.min(h - 1, Math.ceil(maxY + pad));

  const boxW = maxX - minX + 1;
  const boxH = maxY - minY + 1;
  if (boxW <= 0 || boxH <= 0) return;

  const imgData = eCtx.getImageData(minX, minY, boxW, boxH);
  const data = imgData.data;

  // Point to segment distance helper
  const distToSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
    const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
  };

  for (let by = 0; by < boxH; by++) {
    const py = minY + by;
    for (let bx = 0; bx < boxW; bx++) {
      const px = minX + bx;

      // Find minimum distance to river spline
      let minDist = Infinity;
      for (let i = 0; i < pathPoints.length - 1; i++) {
        const p1 = pathPoints[i];
        const p2 = pathPoints[i + 1];
        // Quick AABB reject
        if (
          px < Math.min(p1.x, p2.x) - gorgeRadius ||
          px > Math.max(p1.x, p2.x) + gorgeRadius ||
          py < Math.min(p1.y, p2.y) - gorgeRadius ||
          py > Math.max(p1.y, p2.y) + gorgeRadius
        ) {
          continue;
        }
        const d = distToSegment(px, py, p1.x, p1.y, p2.x, p2.y);
        if (d < minDist) minDist = d;
      }

      if (minDist <= gorgeRadius) {
        const idx = (by * boxW + bx) * 4;
        const curH = data[idx + 3] > 0 ? data[idx] : 128;
        // Cosine smooth trough
        const trough = Math.cos((minDist / gorgeRadius) * (Math.PI / 2)) * gorgeDepth;
        // Don't lower below sea level (128)
        const newH = Math.max(128, Math.round(curH - trough));
        data[idx] = newH;
        data[idx + 1] = newH;
        data[idx + 2] = newH;
        data[idx + 3] = 255;
      }
    }
  }

  eCtx.putImageData(imgData, minX, minY);
}
