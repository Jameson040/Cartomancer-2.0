/**
 * Cartomancer Fantasy Map Maker - Robust Asset Storage (IndexedDB + localStorage fallback)
 * Allows storing large custom asset packs (folders with 100+ images) without hitting 5MB browser quota limits.
 */

import { StampAsset } from '../types';

const DB_NAME = 'CartomancerDB';
const DB_VERSION = 1;
const STORE_NAME = 'custom_assets';
const LOCAL_STORAGE_KEY = 'cartomancer_custom_assets';

class AssetStorage {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private initDB(): Promise<IDBDatabase | null> {
    if (this.dbPromise) return this.dbPromise;

    if (typeof window === 'undefined' || !window.indexedDB) {
      this.dbPromise = Promise.resolve(null);
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e: any) => {
          const db = e.target.result as IDBDatabase;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('Cartomancer: IndexedDB access failed, falling back to localStorage');
          resolve(null);
        };
      } catch (err) {
        console.warn('Cartomancer: Error opening IndexedDB', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Load all custom assets from IndexedDB or localStorage fallback
   */
  public async loadCustomAssets(): Promise<StampAsset[]> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const store = tx.objectStore(STORE_NAME);
          const req = store.getAll();
          req.onsuccess = () => {
            const assets: StampAsset[] = req.result || [];
            if (assets.length > 0) {
              resolve(assets);
            } else {
              // Try migrating from legacy localStorage if present
              const legacy = this.loadFromLocalStorage();
              if (legacy.length > 0) {
                this.saveCustomAssets(legacy).catch(console.warn);
              }
              resolve(legacy);
            }
          };
          req.onerror = () => resolve(this.loadFromLocalStorage());
        } catch {
          resolve(this.loadFromLocalStorage());
        }
      });
    }

    return this.loadFromLocalStorage();
  }

  /**
   * Save complete list of custom assets
   */
  public async saveCustomAssets(assets: StampAsset[]): Promise<void> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.clear();
          for (const a of assets) {
            store.put(a);
          }
          tx.oncomplete = () => {
            // Also keep lightweight metadata or fallback in localStorage if small enough
            this.syncLightweightLocalStorage(assets);
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        } catch (err) {
          this.saveToLocalStorage(assets);
          resolve();
        }
      });
    }

    this.saveToLocalStorage(assets);
  }

  /**
   * Add a batch of custom assets
   */
  public async addCustomAssets(newAssets: StampAsset[]): Promise<void> {
    const db = await this.initDB();
    if (db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          for (const a of newAssets) {
            store.put(a);
          }
          tx.oncomplete = () => {
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        } catch {
          resolve();
        }
      });
    }

    const current = this.loadFromLocalStorage();
    this.saveToLocalStorage([...newAssets, ...current]);
  }

  /**
   * Delete a specific custom asset by ID
   */
  public async deleteCustomAsset(assetId: string): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.delete(assetId);
      } catch (e) {
        console.warn('IndexedDB delete error', e);
      }
    }

    const current = this.loadFromLocalStorage();
    this.saveToLocalStorage(current.filter((a) => a.id !== assetId));
  }

  /**
   * Clear all custom assets
   */
  public async clearAllCustomAssets(): Promise<void> {
    const db = await this.initDB();
    if (db) {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.clear();
      } catch (e) {
        console.warn('IndexedDB clear error', e);
      }
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }

  // --- LocalStorage Fallback Helpers ---

  private loadFromLocalStorage(): StampAsset[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private saveToLocalStorage(assets: StampAsset[]): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(assets));
    } catch (e) {
      console.warn('Cartomancer: LocalStorage quota exceeded, assets persisted in memory/IndexedDB only', e);
    }
  }

  private syncLightweightLocalStorage(assets: StampAsset[]): void {
    try {
      // Save at most 5 assets into localStorage as an offline safety backup
      const subset = assets.slice(0, 5);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subset));
    } catch {
      // Ignore quota warnings
    }
  }
}

export const assetStorage = new AssetStorage();
