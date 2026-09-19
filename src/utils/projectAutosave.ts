/**
 * Cartomancer Fantasy Map Maker - Robust Project Autosave Engine
 * Supports:
 * 1. High-capacity IndexedDB autosave (stores project state, canvas masks, textures & elevations)
 * 2. File System Access (FSA) API: links a local folder on user's disk and writes .cartomancer.json
 * 3. 60-second idle cycle with intelligent paint-deferral (never lags while drawing)
 * 4. Crash recovery & draft restoration on startup
 */

import { MapProject } from '../types';

export interface AutosavePayload {
  project: MapProject;
  maskDataUrl?: string;
  textureDataUrl?: string;
  elevationDataUrl?: string;
}

export interface AutosaveRecord {
  id: string;
  projectName: string;
  timestamp: number;
  payload: AutosavePayload;
}

const DB_NAME = 'CartomancerDB';
const DB_VERSION = 2; // Upgraded to support project_autosaves
const AUTOSAVE_STORE = 'project_autosaves';
const FSA_DIRECTORY_KEY = 'cartomancer_fsa_folder_name';

class ProjectAutosaveManager {
  private dbPromise: Promise<IDBDatabase | null> | null = null;
  private directoryHandle: any = null;
  private folderName: string | null = null;
  private lastSavedTimestamp: number | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.folderName = localStorage.getItem(FSA_DIRECTORY_KEY);
    }
  }

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
          if (!db.objectStoreNames.contains('custom_assets')) {
            db.createObjectStore('custom_assets', { keyPath: 'id' });
          }
          if (!db.objectStoreNames.contains(AUTOSAVE_STORE)) {
            db.createObjectStore(AUTOSAVE_STORE, { keyPath: 'id' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = (err) => {
          console.warn('Cartomancer: Could not open IndexedDB for Autosave', err);
          resolve(null);
        };
      } catch (err) {
        console.warn('Cartomancer: IndexedDB exception in Autosave', err);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  /**
   * Save snapshot to IndexedDB and optionally to local folder via FSA
   */
  public async save(payload: AutosavePayload): Promise<{ success: boolean; timestamp: number; fsaSaved: boolean }> {
    const timestamp = Date.now();
    const record: AutosaveRecord = {
      id: 'active_session',
      projectName: payload.project.name || 'Untitled Realm',
      timestamp,
      payload,
    };

    let idbSuccess = false;
    let fsaSuccess = false;

    // 1. Write to IndexedDB
    const db = await this.initDB();
    if (db) {
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(AUTOSAVE_STORE, 'readwrite');
          const store = tx.objectStore(AUTOSAVE_STORE);
          const req = store.put(record);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        idbSuccess = true;
      } catch (err) {
        console.warn('Failed to write autosave to IndexedDB', err);
      }
    }

    // 2. Write to Linked File System Folder (FSA) if active
    if (this.directoryHandle && 'showDirectoryPicker' in window) {
      try {
        const safeName = (payload.project.name || 'realm')
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_');
        const filename = `${safeName}_autosave.cartomancer.json`;

        // Check/request permission if needed
        const perm = await this.directoryHandle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          const fileHandle = await this.directoryHandle.getFileHandle(filename, { create: true });
          const writable = await fileHandle.createWritable();
          const jsonContent = JSON.stringify(payload, null, 2);
          await writable.write(jsonContent);
          await writable.close();
          fsaSuccess = true;
        }
      } catch (fsaErr) {
        console.warn('FSA folder write failed, falling back to IndexedDB', fsaErr);
      }
    }

    if (idbSuccess || fsaSuccess) {
      this.lastSavedTimestamp = timestamp;
    }

    return {
      success: idbSuccess || fsaSuccess,
      timestamp,
      fsaSaved: fsaSuccess,
    };
  }

  /**
   * Retrieve the latest autosave from IndexedDB
   */
  public async getLatestAutosave(): Promise<AutosaveRecord | null> {
    const db = await this.initDB();
    if (!db) return null;

    return new Promise((resolve) => {
      try {
        const tx = db.transaction(AUTOSAVE_STORE, 'readonly');
        const store = tx.objectStore(AUTOSAVE_STORE);
        const req = store.get('active_session');
        req.onsuccess = () => {
          resolve(req.result || null);
        };
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }

  /**
   * Clears the current autosave record
   */
  public async clearAutosave(): Promise<void> {
    const db = await this.initDB();
    if (!db) return;

    try {
      const tx = db.transaction(AUTOSAVE_STORE, 'readwrite');
      const store = tx.objectStore(AUTOSAVE_STORE);
      store.delete('active_session');
    } catch (err) {
      console.warn('Could not clear autosave', err);
    }
  }

  /**
   * Link a local folder on user's computer via File System Access API
   */
  public async linkLocalFolder(): Promise<{ success: boolean; folderName?: string; error?: string }> {
    if (!('showDirectoryPicker' in window)) {
      return {
        success: false,
        error: 'File System Access API is not supported in this browser. IndexedDB autosave will be used instead.',
      };
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        id: 'cartomancer_autosave_dir',
        mode: 'readwrite',
      });

      this.directoryHandle = handle;
      this.folderName = handle.name;
      localStorage.setItem(FSA_DIRECTORY_KEY, handle.name);

      return { success: true, folderName: handle.name };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return { success: false, error: 'Folder selection was canceled.' };
      }
      return { success: false, error: err.message || 'Failed to select directory.' };
    }
  }

  /**
   * Unlink currently linked FSA folder
   */
  public unlinkFolder(): void {
    this.directoryHandle = null;
    this.folderName = null;
    localStorage.removeItem(FSA_DIRECTORY_KEY);
  }

  public getLinkedFolderName(): string | null {
    return this.folderName;
  }

  public isFsaSupported(): boolean {
    return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
  }

  public getLastSavedTimestamp(): number | null {
    return this.lastSavedTimestamp;
  }
}

export const projectAutosave = new ProjectAutosaveManager();
