/**
 * Cartomancer Fantasy Map Maker - Image & Stamp Asset Cache Manager
 */

import { DEFAULT_STAMP_ASSETS } from '../data/defaultAssets';
import { StampAsset, StampCategory } from '../types';
import { inferCategoryFromName } from './dynamicAssetLoader';

class ImageManager {
  private imageCache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  /**
   * Preload an asset by its StampAsset definition
   */
  public async loadAsset(asset: StampAsset): Promise<HTMLImageElement> {
    if (this.imageCache.has(asset.id)) {
      return this.imageCache.get(asset.id)!;
    }

    if (this.loadingPromises.has(asset.id)) {
      return this.loadingPromises.get(asset.id)!;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        this.imageCache.set(asset.id, img);
        this.loadingPromises.delete(asset.id);
        resolve(img);
      };

      img.onerror = (err) => {
        console.warn(`Failed to load asset ${asset.id}`, err);
        this.loadingPromises.delete(asset.id);
        reject(err);
      };

      if (asset.imageUrl) {
        img.src = asset.imageUrl;
      } else if (asset.svgData) {
        const encoded = encodeURIComponent(asset.svgData.trim());
        img.src = `data:image/svg+xml;charset=utf-8,${encoded}`;
      } else {
        reject(new Error(`Asset ${asset.id} has neither imageUrl nor svgData`));
      }
    });

    this.loadingPromises.set(asset.id, promise);
    return promise;
  }

  /**
   * Synchronous get (returns null if still loading or not cached)
   */
  public getImage(assetId: string): HTMLImageElement | null {
    return this.imageCache.get(assetId) || null;
  }

  /**
   * Preload initial starter assets immediately, then progressively load remaining in background idle chunks
   */
  public async preloadDefaultAssets(customAssets: StampAsset[] = []): Promise<void> {
    const all = [...DEFAULT_STAMP_ASSETS, ...customAssets];
    if (all.length === 0) return;

    // 1. Preload first priority batch (16 assets) immediately for instant first-render response
    const priority = all.slice(0, 16);
    await Promise.allSettled(priority.map((a) => this.loadAsset(a)));

    // 2. Background queue for remaining assets in non-blocking chunks of 6
    const remaining = all.slice(16);
    if (remaining.length === 0) return;

    let index = 0;
    const loadNextChunk = () => {
      if (index >= remaining.length) return;
      const chunk = remaining.slice(index, index + 6);
      index += 6;
      Promise.allSettled(chunk.map((a) => this.loadAsset(a))).then(() => {
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(loadNextChunk, { timeout: 800 });
        } else {
          setTimeout(loadNextChunk, 120);
        }
      });
    };

    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(loadNextChunk, { timeout: 500 });
    } else {
      setTimeout(loadNextChunk, 100);
    }
  }

  /**
   * Intelligently infer an asset category from directory names or file names
   */
  public inferCategoryFromPath(pathOrName: string): StampCategory {
    return inferCategoryFromName(pathOrName);
  }

  /**
   * Recursively extract all image files from a dropped folder or data transfer
   */
  public async extractFilesFromDataTransfer(
    dataTransfer: DataTransfer
  ): Promise<{ file: File; relativePath: string }[]> {
    const results: { file: File; relativePath: string }[] = [];
    const items = dataTransfer.items;

    // Helper to read entries in a directory recursively (looping until readEntries is empty)
    const readDirectory = async (dirEntry: any, path: string): Promise<void> => {
      const reader = dirEntry.createReader();
      const readAllEntries = async (): Promise<any[]> => {
        const batch: any[] = await new Promise((resolve) => {
          reader.readEntries(
            (entries: any[]) => resolve(entries),
            () => resolve([])
          );
        });
        if (batch.length > 0) {
          const next = await readAllEntries();
          return [...batch, ...next];
        }
        return [];
      };

      const entries = await readAllEntries();
      for (const entry of entries) {
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file(
              (file: File) => {
                const fullPath = `${path}/${file.name}`;
                if (this.isSupportedImageFile(file)) {
                  results.push({ file, relativePath: fullPath });
                }
                resolve();
              },
              () => resolve()
            );
          });
        } else if (entry.isDirectory) {
          await readDirectory(entry, `${path}/${entry.name}`);
        }
      }
    };

    if (items && items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
      const entryPromises: Promise<void>[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isFile) {
            const file = item.getAsFile();
            if (file && this.isSupportedImageFile(file)) {
              results.push({ file, relativePath: file.name });
            }
          } else if (entry.isDirectory) {
            entryPromises.push(readDirectory(entry, entry.name));
          }
        }
      }
      await Promise.all(entryPromises);
    } else if (dataTransfer.files && dataTransfer.files.length > 0) {
      // Fallback standard files
      for (let i = 0; i < dataTransfer.files.length; i++) {
        const file = dataTransfer.files[i];
        if (this.isSupportedImageFile(file)) {
          results.push({
            file,
            relativePath: (file as any).webkitRelativePath || file.name,
          });
        }
      }
    }

    return results;
  }

  /**
   * Filter check for image file extensions and mime types
   */
  public isSupportedImageFile(file: File): boolean {
    if (file.name.startsWith('.') || file.name.includes('__MACOSX') || file.name.endsWith('.DS_Store')) {
      return false;
    }
    const lowerName = file.name.toLowerCase();
    return (
      file.type.startsWith('image/') ||
      /\.(png|jpe?g|webp|svg|gif)$/i.test(lowerName)
    );
  }

  /**
   * Downscale, auto-trim transparent borders, and optionally bake ground contact shadow for AI-extracted assets
   */
  public async optimizeAndProcessImage(
    file: File,
    name: string,
    category: StampCategory,
    maxDimension: number = 1024,
    options?: { autoTrim?: boolean; bakeGroundShadow?: boolean }
  ): Promise<StampAsset> {
    const autoTrim = options?.autoTrim ?? true;
    const bakeGroundShadow = options?.bakeGroundShadow ?? false;

    return new Promise((resolve, reject) => {
      // If it's an SVG, load raw text/data url directly without raster downscaling
      if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
        const reader = new FileReader();
        reader.onload = () => {
          const svgString = reader.result as string;
          const asset: StampAsset = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: name || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '),
            category,
            svgData: svgString.startsWith('<svg') ? svgString : undefined,
            imageUrl: svgString.startsWith('data:') ? svgString : undefined,
            defaultScale: 1.0,
            isCustom: true,
            tags: ['custom', category],
          };
          this.loadAsset(asset).then(() => resolve(asset)).catch(reject);
        };
        reader.onerror = reject;
        reader.readAsText(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const rawDataUrl = reader.result as string;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          let targetW = img.naturalWidth || img.width;
          let targetH = img.naturalHeight || img.height;

          // Downscale if unusually large (e.g. 4K high-res scans)
          if (targetW > maxDimension || targetH > maxDimension) {
            if (targetW >= targetH) {
              targetH = Math.round((targetH * maxDimension) / targetW);
              targetW = maxDimension;
            } else {
              targetW = Math.round((targetW * maxDimension) / targetH);
              targetH = maxDimension;
            }
          }

          const scratchCanvas = document.createElement('canvas');
          scratchCanvas.width = Math.max(1, targetW);
          scratchCanvas.height = Math.max(1, targetH);
          const scratchCtx = scratchCanvas.getContext('2d', { willReadFrequently: true });

          if (!scratchCtx) {
            const asset: StampAsset = {
              id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
              name: name || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '),
              category,
              imageUrl: rawDataUrl,
              defaultScale: 1.0,
              isCustom: true,
              tags: ['custom', category],
            };
            this.loadAsset(asset).then(() => resolve(asset)).catch(reject);
            return;
          }

          scratchCtx.imageSmoothingEnabled = true;
          scratchCtx.imageSmoothingQuality = 'high';
          scratchCtx.drawImage(img, 0, 0, scratchCanvas.width, scratchCanvas.height);

          let cropX = 0;
          let cropY = 0;
          let cropW = scratchCanvas.width;
          let cropH = scratchCanvas.height;

          if (autoTrim) {
            const imgData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height);
            const data = imgData.data;
            let minX = scratchCanvas.width;
            let minY = scratchCanvas.height;
            let maxX = -1;
            let maxY = -1;

            for (let y = 0; y < scratchCanvas.height; y++) {
              for (let x = 0; x < scratchCanvas.width; x++) {
                const alpha = data[(y * scratchCanvas.width + x) * 4 + 3];
                if (alpha > 12) {
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            if (maxX >= minX && maxY >= minY) {
              const pad = 4;
              cropX = Math.max(0, minX - pad);
              cropY = Math.max(0, minY - pad);
              cropW = Math.min(scratchCanvas.width - cropX, maxX - minX + 1 + pad * 2);
              cropH = Math.min(scratchCanvas.height - cropY, maxY - minY + 1 + pad * 2);
            }
          }

          const bottomPad = bakeGroundShadow ? Math.max(8, Math.round(cropH * 0.08)) : 0;
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = Math.max(1, cropW);
          finalCanvas.height = Math.max(1, cropH + bottomPad);
          const finalCtx = finalCanvas.getContext('2d');

          if (finalCtx) {
            finalCtx.imageSmoothingEnabled = true;
            finalCtx.imageSmoothingQuality = 'high';

            if (bakeGroundShadow) {
              finalCtx.save();
              const cx = finalCanvas.width / 2;
              const cy = cropH - Math.max(2, Math.round(cropH * 0.03));
              const rx = Math.max(8, cropW * 0.36);
              const ry = Math.max(4, cropH * 0.09);
              const grad = finalCtx.createRadialGradient(cx, cy, 1, cx, cy, rx);
              grad.addColorStop(0, 'rgba(15, 23, 42, 0.42)');
              grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.20)');
              grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
              finalCtx.fillStyle = grad;
              finalCtx.translate(cx, cy);
              finalCtx.scale(1, ry / rx);
              finalCtx.beginPath();
              finalCtx.arc(0, 0, rx, 0, Math.PI * 2);
              finalCtx.fill();
              finalCtx.restore();
            }

            finalCtx.drawImage(
              scratchCanvas,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              cropW,
              cropH
            );
          }

          // Convert to crisp PNG data URL
          const optimizedDataUrl = (finalCtx ? finalCanvas : scratchCanvas).toDataURL('image/png', 0.92);

          const asset: StampAsset = {
            id: `custom_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
            name: name || file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '),
            category,
            imageUrl: optimizedDataUrl,
            defaultScale: 1.0,
            isCustom: true,
            tags: ['custom', category],
          };

          this.loadAsset(asset).then(() => resolve(asset)).catch(reject);
        };

        img.onerror = (err) => {
          console.warn('Failed to decode image file', file.name, err);
          reject(err);
        };

        img.src = rawDataUrl;
      };

      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Convert a user uploaded file into a StampAsset with DataURL (single file)
   */
  public async processUploadedAsset(
    file: File,
    name: string,
    category: StampAsset['category'],
    options?: { autoTrim?: boolean; bakeGroundShadow?: boolean }
  ): Promise<StampAsset> {
    return this.optimizeAndProcessImage(file, name, category, 1024, options);
  }

  /**
   * Batch process an array of files with non-blocking concurrency to prevent tab freezes
   */
  public async processBatchAssets(
    items: { file: File; relativePath?: string; category?: StampCategory }[],
    options: {
      defaultCategory: StampCategory;
      autoDetectCategory?: boolean;
      autoTrim?: boolean;
      bakeGroundShadow?: boolean;
      onProgress?: (processed: number, total: number, currentName: string) => void;
      shouldCancel?: () => boolean;
    }
  ): Promise<StampAsset[]> {
    const total = items.length;
    const assets: StampAsset[] = [];

    for (let i = 0; i < total; i++) {
      if (options.shouldCancel && options.shouldCancel()) {
        console.log('Cartomancer: Batch asset upload cancelled by user');
        break;
      }

      const item = items[i];
      const displayName = item.file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');

      // Determine category
      let category = item.category || options.defaultCategory;
      if (options.autoDetectCategory) {
        const fullPath = item.relativePath || item.file.name;
        const inferred = this.inferCategoryFromPath(fullPath);
        if (inferred !== 'custom' || category === 'custom') {
          category = inferred;
        }
      }

      if (options.onProgress) {
        options.onProgress(i + 1, total, displayName);
      }

      try {
        const asset = await this.optimizeAndProcessImage(item.file, displayName, category, 1024, {
          autoTrim: options.autoTrim ?? true,
          bakeGroundShadow: options.bakeGroundShadow ?? false,
        });
        assets.push(asset);
      } catch (err) {
        console.warn(`Skipping invalid image file: ${item.file.name}`, err);
      }

      // Yield back to browser event loop every file to keep 60fps UI responsive
      await new Promise((resolve) => setTimeout(resolve, 8));
    }

    return assets;
  }

  /**
   * Directly register an already-loaded HTMLImageElement under one or more keys
   */
  public cacheDirectImage(key: string, img: HTMLImageElement): void {
    if (!key || !img) return;
    this.imageCache.set(key, img);
  }

  /**
   * Load any generic image URL (data URI or remote) into cache
   */
  public async loadImage(url: string, id: string = url): Promise<HTMLImageElement> {
    if (this.imageCache.has(id)) {
      const cached = this.imageCache.get(id)!;
      if (url && url !== id && !this.imageCache.has(url)) {
        this.imageCache.set(url, cached);
      }
      return cached;
    }
    if (url && this.imageCache.has(url)) {
      const cached = this.imageCache.get(url)!;
      this.imageCache.set(id, cached);
      return cached;
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.imageCache.set(id, img);
        if (url && url !== id) {
          this.imageCache.set(url, img);
        }
        resolve(img);
      };
      img.onerror = (err) => {
        console.warn(`Failed to load image url ${id}`, err);
        reject(err);
      };
      img.src = url;
    });
  }

  public getImageByUrl(idOrUrl: string): HTMLImageElement | null {
    if (!idOrUrl) return null;
    return this.imageCache.get(idOrUrl) || null;
  }
}

// Global pattern tile cache to avoid recreating canvases during 60fps painting
const patternTileCache = new Map<string, HTMLCanvasElement>();

/**
 * Get or create a seamless scaled tile canvas for pattern painting
 */
export function getScaledPatternTile(
  img: HTMLImageElement,
  cacheKey: string,
  targetScale: number = 48
): HTMLCanvasElement {
  const clampedScale = Math.max(16, Math.min(512, Math.round(targetScale)));
  const key = `${cacheKey}_${clampedScale}`;
  const existing = patternTileCache.get(key);
  if (existing) return existing;

  const tile = document.createElement('canvas');
  tile.width = clampedScale;
  tile.height = clampedScale;
  const tCtx = tile.getContext('2d');
  if (tCtx) {
    tCtx.imageSmoothingEnabled = true;
    tCtx.imageSmoothingQuality = 'high';
    tCtx.drawImage(img, 0, 0, clampedScale, clampedScale);
  }
  patternTileCache.set(key, tile);
  return tile;
}

export const imageManager = new ImageManager();
