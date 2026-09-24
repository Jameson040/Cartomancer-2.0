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
   * Preload all standard assets for instant, buttery-smooth painting & stamping
   */
  public async preloadDefaultAssets(customAssets: StampAsset[] = []): Promise<void> {
    const all = [...DEFAULT_STAMP_ASSETS, ...customAssets];
    await Promise.allSettled(all.map((a) => this.loadAsset(a)));
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
   * Downscale and optimize an image file to prevent UI freezes or memory exhaustion
   */
  public async optimizeAndProcessImage(
    file: File,
    name: string,
    category: StampCategory,
    maxDimension: number = 1024
  ): Promise<StampAsset> {
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

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, targetW);
          canvas.height = Math.max(1, targetH);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback to raw data url
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

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Convert to crisp PNG data URL
          const optimizedDataUrl = canvas.toDataURL('image/png', 0.92);

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
    category: StampAsset['category']
  ): Promise<StampAsset> {
    return this.optimizeAndProcessImage(file, name, category, 1024);
  }

  /**
   * Batch process an array of files with non-blocking concurrency to prevent tab freezes
   */
  public async processBatchAssets(
    items: { file: File; relativePath?: string; category?: StampCategory }[],
    options: {
      defaultCategory: StampCategory;
      autoDetectCategory?: boolean;
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
        const asset = await this.optimizeAndProcessImage(item.file, displayName, category, 1024);
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
