/**
 * Versioned Cartomancer project-file boundary.
 *
 * Canvas pixels remain in the project file for now, while this module makes the
 * JSON boundary explicit and migration-safe for future document-model batches.
 */
import { MapProject } from '../types';

export const CURRENT_PROJECT_VERSION = '2.0.0';

export interface CartomancerProjectFile {
  project: MapProject;
  maskDataUrl?: string;
  textureDataUrl?: string;
  waterTextureDataUrl?: string;
  heightFieldData?: string;
  heightFieldMeta?: { cellSize: number; width: number; height: number; seaLevel: number; minHeight: number; maxHeight: number };
  elevationDataUrl?: string;
}

const isRecord = (value: unknown): value is Record<string, any> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const isDataUrl = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith('data:image/');

const safeArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value : []);

/**
 * Accepts current files and the older 1.x files produced by the prototype.
 * Invalid optional fields are dropped instead of crashing the editor.
 */
export function normalizeProjectFile(input: unknown): CartomancerProjectFile {
  const root = isRecord(input) ? input : {};
  const rawProject = isRecord(root.project) ? root.project : root;

  if (!isRecord(rawProject) || !rawProject.dimensions) {
    throw new Error('This file is not a valid Cartomancer project.');
  }

  const width = Number(rawProject.dimensions.width);
  const height = Number(rawProject.dimensions.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 64 || height < 64) {
    throw new Error('Cartomancer project dimensions are invalid.');
  }

  const project = {
    ...rawProject,
    version: CURRENT_PROJECT_VERSION,
    name: typeof rawProject.name === 'string' && rawProject.name.trim() ? rawProject.name : 'Imported Realm',
    dimensions: { width: Math.round(width), height: Math.round(height) },
    stamps: safeArray(rawProject.stamps),
    paths: safeArray(rawProject.paths),
    labels: safeArray(rawProject.labels),
    customAssets: safeArray(rawProject.customAssets),
  } as MapProject;

  return {
    project,
    maskDataUrl: isDataUrl(root.maskDataUrl) ? root.maskDataUrl : undefined,
    textureDataUrl: isDataUrl(root.textureDataUrl) ? root.textureDataUrl : undefined,
    waterTextureDataUrl: isDataUrl(root.waterTextureDataUrl) ? root.waterTextureDataUrl : undefined,
    elevationDataUrl: isDataUrl(root.elevationDataUrl) ? root.elevationDataUrl : undefined,
  };
}

export function createProjectFile(
  project: MapProject,
  canvases: {
    mask?: HTMLCanvasElement | null;
    texture?: HTMLCanvasElement | null;
    waterTexture?: HTMLCanvasElement | null;
    elevation?: HTMLCanvasElement | null;
    heightFieldData?: string;
    heightFieldMeta?: CartomancerProjectFile['heightFieldMeta'];
  }
): CartomancerProjectFile {
  return {
    project: { ...project, version: CURRENT_PROJECT_VERSION },
    maskDataUrl: canvases.mask?.toDataURL('image/png'),
    textureDataUrl: canvases.texture?.toDataURL('image/png'),
    waterTextureDataUrl: canvases.waterTexture?.toDataURL('image/png'),
    heightFieldData: canvases.heightFieldData,
    heightFieldMeta: canvases.heightFieldMeta,
    elevationDataUrl: canvases.elevation?.toDataURL('image/png'),
  };
}
