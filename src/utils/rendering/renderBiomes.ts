/**
 * Biome pattern generator, pattern caching, and masked texture rendering.
 */
import { BiomeTexture } from '../../types';
import { imageManager } from '../imageManager';

function shadeColor(hex: string, factor: number): string {
  const c = hex.replace('#', '');
  if (c.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(c.substring(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(c.substring(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(c.substring(4, 6), 16) * factor)));
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export class BiomePatternManager {
  private static patternCache = new Map<string, CanvasPattern>();

  public static invalidatePatternCache(biomeId?: string): void {
    if (biomeId) {
      for (const key of Array.from(this.patternCache.keys())) {
        if (key.startsWith(biomeId)) {
          this.patternCache.delete(key);
        }
      }
    } else {
      this.patternCache.clear();
    }
  }

  public static getOrCreateBiomePattern(
    ctx: CanvasRenderingContext2D,
    biome: BiomeTexture
  ): CanvasPattern | null {
    const cacheKey = `${biome.id}_${biome.color}_${biome.roughnessColor}_${biome.patternImageUrl || ''}_${biome.patternScale || 48}`;
    const cached = this.patternCache.get(cacheKey);
    if (cached) return cached;

    // 1. If user provided a pattern image URL
    const imgUrl = biome.patternImageUrl;
    const img = (imgUrl ? imageManager.getImageByUrl(imgUrl) : null)
      || imageManager.getImageByUrl(biome.id);

    if (img && img.complete && img.naturalWidth > 0) {
      try {
        const targetTileSize = Math.max(24, Math.min(128, Math.round(biome.patternScale || 48)));
        const tile = document.createElement('canvas');
        tile.width = targetTileSize;
        tile.height = targetTileSize;
        const tileCtx = tile.getContext('2d');
        if (tileCtx) {
          tileCtx.drawImage(img, 0, 0, targetTileSize, targetTileSize);
          const pat = ctx.createPattern(tile, 'repeat');
          if (pat) {
            this.patternCache.set(cacheKey, pat);
            return pat;
          }
        }
        const pat = ctx.createPattern(img, 'repeat');
        if (pat) {
          this.patternCache.set(cacheKey, pat);
          return pat;
        }
      } catch {
        // fallback to procedural
      }
    }

    // Asynchronously pre-fetch image if not yet cached
    if (!img && imgUrl) {
      const asyncImg = new Image();
      asyncImg.crossOrigin = 'anonymous';
      asyncImg.onload = () => {
        imageManager.cacheDirectImage(biome.id, asyncImg);
        imageManager.cacheDirectImage(imgUrl, asyncImg);
        this.patternCache.delete(cacheKey);
      };
      asyncImg.src = imgUrl;
    }

    // 2. High-fidelity procedural 64x64 seamless tile
    const tile = document.createElement('canvas');
    tile.width = 64;
    tile.height = 64;
    const tCtx = tile.getContext('2d');
    if (!tCtx) return null;

    tCtx.fillStyle = biome.color || '#83868c';
    tCtx.fillRect(0, 0, 64, 64);

    const roughColor = biome.roughnessColor || '#585552';

    switch (biome.detailType) {
      case 'dirt': {
        // Base earthy dirt fill
        tCtx.fillStyle = biome.color || '#8b6f47';
        tCtx.fillRect(0, 0, 64, 64);

        // Speckle noise — darker + lighter soil flecks
        for (let i = 0; i < 90; i++) {
          const sx = (i * 17 + (i % 7) * 5) % 64;
          const sy = (i * 23 + (i % 5) * 7) % 64;
          const r = (i % 3) * 0.5 + 0.6;
          const lighter = i % 2 === 0;
          tCtx.fillStyle = lighter ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.22)';
          tCtx.beginPath();
          tCtx.arc(sx, sy, r, 0, Math.PI * 2);
          tCtx.fill();
        }

        // Small embedded pebbles
        const pebbleCoords = [
          { x: 12, y: 16, rx: 2.5, ry: 1.8, rot: 0.3 },
          { x: 38, y: 10, rx: 3.0, ry: 2.0, rot: -0.4 },
          { x: 52, y: 44, rx: 2.2, ry: 1.5, rot: 0.8 },
          { x: 22, y: 48, rx: 3.2, ry: 2.2, rot: 0.2 },
          { x: 44, y: 32, rx: 2.0, ry: 1.6, rot: -0.7 },
        ];
        for (const pb of pebbleCoords) {
          tCtx.fillStyle = 'rgba(40, 28, 18, 0.45)';
          tCtx.beginPath();
          tCtx.ellipse(pb.x, pb.y, pb.rx, pb.ry, pb.rot, 0, Math.PI * 2);
          tCtx.fill();
          tCtx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          tCtx.beginPath();
          tCtx.ellipse(pb.x - 0.5, pb.y - 0.5, pb.rx * 0.6, pb.ry * 0.6, pb.rot, 0, Math.PI * 2);
          tCtx.fill();
        }
        break;
      }
      case 'cobble':
      case 'cobblestone': {
        // Mortar base background
        tCtx.fillStyle = roughColor || '#3f3f3f';
        tCtx.fillRect(0, 0, 64, 64);

        const stoneSize = 16;
        const rows = Math.ceil(64 / stoneSize) + 1;
        const baseColor = biome.color || '#8a8a8a';

        for (let row = -1; row < rows; row++) {
          const offset = row % 2 === 0 ? 0 : stoneSize / 2;
          for (let col = -1; col * stoneSize + offset < 64 + stoneSize; col++) {
            const x = col * stoneSize + offset + 1;
            const y = row * stoneSize + 1;
            const w = stoneSize - 2.5;
            const h = stoneSize - 2.5;

            // Deterministic pseudo-random variation based on cell
            const hash = Math.sin((row + 5) * 31.1 + (col + 5) * 17.7) * 43758.5453;
            const shadeFactor = 0.78 + (Math.abs(hash) % 1) * 0.38;

            tCtx.fillStyle = shadeColor(baseColor, shadeFactor);
            roundRect(tCtx, x, y, w, h, 2.5);
            tCtx.fill();

            // Top-left highlight rim
            tCtx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
            tCtx.lineWidth = 1;
            tCtx.beginPath();
            tCtx.moveTo(x + 2, y + h - 1);
            tCtx.lineTo(x + 2, y + 2);
            tCtx.lineTo(x + w - 2, y + 2);
            tCtx.stroke();

            // Bottom-right shadow rim
            tCtx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            tCtx.beginPath();
            tCtx.moveTo(x + w - 1, y + 2);
            tCtx.lineTo(x + w - 1, y + h - 1);
            tCtx.lineTo(x + 2, y + h - 1);
            tCtx.stroke();
          }
        }
        break;
      }
      case 'paved': {
        // Solid masonry base
        tCtx.fillStyle = biome.color || '#5a5a5a';
        tCtx.fillRect(0, 0, 64, 64);

        // Asphalt / stone grain
        for (let i = 0; i < 110; i++) {
          const gx = (i * 29) % 64;
          const gy = (i * 37) % 64;
          tCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
          tCtx.fillRect(gx, gy, 1, 1);
        }

        // Paved flagstone slab joint lines
        tCtx.strokeStyle = roughColor || 'rgba(0,0,0,0.22)';
        tCtx.lineWidth = 1;
        tCtx.beginPath();
        tCtx.moveTo(0, 32);
        tCtx.lineTo(64, 32);
        tCtx.moveTo(32, 0);
        tCtx.lineTo(32, 32);
        tCtx.moveTo(48, 32);
        tCtx.lineTo(48, 64);
        tCtx.stroke();
        break;
      }
      case 'water': {
        const grad = tCtx.createLinearGradient(0, 0, 0, 64);
        grad.addColorStop(0, biome.color || '#2b70b8');
        grad.addColorStop(1, shadeColor(biome.color || '#2b70b8', 0.78));
        tCtx.fillStyle = grad;
        tCtx.fillRect(0, 0, 64, 64);

        // Subtle undulating water waves
        tCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
        tCtx.lineWidth = 1.5;
        for (let y = 8; y < 64; y += 14) {
          tCtx.beginPath();
          tCtx.moveTo(0, y);
          tCtx.bezierCurveTo(16, y - 3, 32, y + 3, 48, y - 2);
          tCtx.bezierCurveTo(56, y + 2, 60, y - 1, 64, y);
          tCtx.stroke();
        }

        tCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        tCtx.fillRect(14, 16, 5, 1);
        tCtx.fillRect(42, 30, 6, 1);
        tCtx.fillRect(24, 46, 5, 1);
        break;
      }
      case 'sand': {
        tCtx.strokeStyle = roughColor;
        tCtx.lineWidth = 1;
        tCtx.globalAlpha = 0.35;
        for (let y = 8; y < 64; y += 16) {
          tCtx.beginPath();
          tCtx.moveTo(0, y);
          tCtx.quadraticCurveTo(32, y + 5, 64, y);
          tCtx.stroke();
        }
        tCtx.fillStyle = roughColor;
        tCtx.globalAlpha = 0.4;
        for (let i = 0; i < 40; i++) {
          const sx = (i * 17) % 64;
          const sy = (i * 23) % 64;
          tCtx.fillRect(sx, sy, 1.5, 1.5);
        }
        break;
      }
      case 'rock': {
        tCtx.strokeStyle = roughColor;
        tCtx.lineWidth = 1.5;
        tCtx.globalAlpha = 0.5;
        tCtx.beginPath();
        tCtx.moveTo(0, 16); tCtx.lineTo(24, 32); tCtx.lineTo(12, 48); tCtx.lineTo(36, 64);
        tCtx.moveTo(40, 0); tCtx.lineTo(48, 28); tCtx.lineTo(64, 44);
        tCtx.stroke();
        tCtx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        tCtx.fillRect(8, 20, 12, 10);
        tCtx.fillRect(44, 10, 10, 14);
        break;
      }
      case 'volcanic': {
        tCtx.fillStyle = '#1c1917';
        tCtx.fillRect(0, 0, 64, 64);
        tCtx.strokeStyle = '#ef4444';
        tCtx.lineWidth = 2;
        tCtx.beginPath();
        tCtx.moveTo(0, 30); tCtx.lineTo(20, 34); tCtx.lineTo(36, 18); tCtx.lineTo(64, 24);
        tCtx.moveTo(20, 34); tCtx.lineTo(32, 54); tCtx.lineTo(48, 64);
        tCtx.stroke();
        tCtx.strokeStyle = '#f59e0b';
        tCtx.lineWidth = 1;
        tCtx.stroke();
        break;
      }
      case 'parchment': {
        tCtx.strokeStyle = roughColor;
        tCtx.lineWidth = 1;
        tCtx.globalAlpha = 0.25;
        for (let x = 0; x < 64; x += 8) {
          tCtx.beginPath(); tCtx.moveTo(x, 0); tCtx.lineTo(x, 64); tCtx.stroke();
        }
        for (let y = 0; y < 64; y += 8) {
          tCtx.beginPath(); tCtx.moveTo(0, y); tCtx.lineTo(64, y); tCtx.stroke();
        }
        break;
      }
      default: {
        tCtx.fillStyle = roughColor;
        tCtx.globalAlpha = 0.35;
        for (let i = 0; i < 48; i++) {
          const gx = (i * 19) % 64;
          const gy = (i * 29) % 64;
          tCtx.fillRect(gx, gy, 2, 2);
        }
        tCtx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        for (let i = 0; i < 24; i++) {
          const hx = (i * 31) % 64;
          const hy = (i * 37) % 64;
          tCtx.fillRect(hx, hy, 1.5, 1.5);
        }
        break;
      }
    }

    try {
      const pat = ctx.createPattern(tile, 'repeat');
      if (pat) {
        this.patternCache.set(cacheKey, pat);
        return pat;
      }
    } catch {
      // ignore
    }
    return null;
  }
}

let biomeScratchCanvas: HTMLCanvasElement | null = null;
let biomeScratchCtx: CanvasRenderingContext2D | null = null;

export function renderTexturesMasked(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maskCanvas: HTMLCanvasElement,
  textureCanvas: HTMLCanvasElement
): void {
  ctx.save();
  if (!biomeScratchCanvas) {
    biomeScratchCanvas = document.createElement('canvas');
    biomeScratchCtx = biomeScratchCanvas.getContext('2d');
  }
  if (biomeScratchCanvas.width !== width || biomeScratchCanvas.height !== height) {
    biomeScratchCanvas.width = width;
    biomeScratchCanvas.height = height;
  }
  const tCtx = biomeScratchCtx;
  if (!tCtx) {
    ctx.restore();
    return;
  }

  tCtx.globalCompositeOperation = 'source-over';
  tCtx.clearRect(0, 0, width, height);

  // Draw mask first
  tCtx.drawImage(maskCanvas, 0, 0, width, height);
  // Mask textures with source-in
  tCtx.globalCompositeOperation = 'source-in';
  tCtx.drawImage(textureCanvas, 0, 0, width, height);

  // Composite painted textures onto main canvas
  ctx.drawImage(biomeScratchCanvas, 0, 0, width, height);
  ctx.restore();
}
