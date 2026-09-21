/**
 * Biome pattern generator, pattern caching, and masked texture rendering.
 */
import { BiomeTexture } from '../../types';
import { imageManager } from '../imageManager';

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
      case 'cobble': {
        tCtx.strokeStyle = roughColor;
        tCtx.lineWidth = 1.5;
        const rows = [
          [{ x: 0, w: 20 }, { x: 20, w: 24 }, { x: 44, w: 20 }],
          [{ x: 0, w: 32 }, { x: 32, w: 32 }],
          [{ x: 0, w: 22 }, { x: 22, w: 26 }, { x: 48, w: 16 }],
          [{ x: 0, w: 16 }, { x: 16, w: 30 }, { x: 46, w: 18 }],
        ];
        const rowH = 16;
        for (let r = 0; r < rows.length; r++) {
          const y = r * rowH;
          for (const stone of rows[r]) {
            tCtx.fillStyle = roughColor;
            tCtx.globalAlpha = 0.25;
            tCtx.fillRect(stone.x + 1, y + 1, stone.w - 2, rowH - 2);
            tCtx.globalAlpha = 1.0;
            tCtx.strokeRect(stone.x + 1, y + 1, stone.w - 2, rowH - 2);
            tCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            tCtx.fillRect(stone.x + 2, y + 2, stone.w - 4, 2);
          }
        }
        break;
      }
      case 'water': {
        tCtx.strokeStyle = roughColor;
        tCtx.lineWidth = 2;
        tCtx.globalAlpha = 0.6;
        for (let y = 6; y < 64; y += 12) {
          tCtx.beginPath();
          tCtx.moveTo(0, y);
          tCtx.bezierCurveTo(16, y - 4, 32, y + 4, 48, y - 3);
          tCtx.bezierCurveTo(56, y + 2, 60, y - 1, 64, y);
          tCtx.stroke();
        }
        tCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        tCtx.fillRect(14, 18, 4, 1.5);
        tCtx.fillRect(42, 34, 5, 1.5);
        tCtx.fillRect(26, 50, 4, 1.5);
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

export function renderTexturesMasked(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maskCanvas: HTMLCanvasElement,
  textureCanvas: HTMLCanvasElement
): void {
  ctx.save();
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tCtx = tempCanvas.getContext('2d');
  if (!tCtx) {
    ctx.restore();
    return;
  }

  // Draw mask first
  tCtx.drawImage(maskCanvas, 0, 0, width, height);
  // Mask textures with source-in
  tCtx.globalCompositeOperation = 'source-in';
  tCtx.drawImage(textureCanvas, 0, 0, width, height);

  // Composite painted textures onto main canvas
  ctx.drawImage(tempCanvas, 0, 0, width, height);
  ctx.restore();
}
