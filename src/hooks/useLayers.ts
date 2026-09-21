import { useState, useRef, useEffect, useCallback } from 'react';
import { LayerState } from '../types';

export interface LayerGroupState {
  water: LayerState;
  landmass: LayerState;
  textures: LayerState;
  elevation: LayerState;
  stamps: LayerState;
  paths: LayerState;
  labels: LayerState;
  grid: LayerState;
  atmosphere?: LayerState;
  compass?: LayerState;
}

export const DEFAULT_LAYERS: LayerGroupState = {
  water: { id: 'water', name: 'Ocean Base', visible: true, locked: false, opacity: 1.0 },
  landmass: { id: 'landmass', name: 'Landmass & Coastlines', visible: true, locked: false, opacity: 1.0 },
  textures: { id: 'textures', name: 'Biome Textures', visible: true, locked: false, opacity: 1.0 },
  elevation: { id: 'elevation', name: 'Elevation Relief', visible: true, locked: false, opacity: 1.0 },
  stamps: { id: 'stamps', name: 'Stamps & Objects', visible: true, locked: false, opacity: 1.0 },
  paths: { id: 'paths', name: 'Paths & Rivers', visible: true, locked: false, opacity: 1.0 },
  labels: { id: 'labels', name: 'Map Labels', visible: true, locked: false, opacity: 1.0 },
  grid: { id: 'grid', name: 'Tactical Grid', visible: false, locked: false, opacity: 0.6 },
  atmosphere: { id: 'atmosphere', name: 'Atmosphere & Filter', visible: true, locked: false, opacity: 1.0 },
  compass: { id: 'compass', name: 'Compass & Border', visible: true, locked: false, opacity: 1.0 },
};

interface UseLayersOptions {
  onLayerDeactivated?: (key: keyof LayerGroupState) => void;
  onRequestRedraw?: (updatedLayers?: LayerGroupState) => void;
}

export function useLayers(options?: UseLayersOptions) {
  const [layers, setLayersState] = useState<LayerGroupState>(DEFAULT_LAYERS);
  const layersRef = useRef<LayerGroupState>(layers);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  const updateLayer = useCallback(
    (key: keyof LayerGroupState, updates: Partial<LayerState>) => {
      // 1. Immediately create and store updated layer state in ref synchronously
      const current = layersRef.current;
      const updated: LayerGroupState = {
        ...current,
        [key]: { ...(current[key] ?? { id: key, name: key, visible: true, locked: false, opacity: 1 }), ...updates },
      };
      layersRef.current = updated;

      // 2. Schedule React state change for DOM / UI buttons
      setLayersState(updated);

      // 3. Clear active tools / transforms if layer was turned off or locked
      if (updates.visible === false || updates.locked === true) {
        options?.onLayerDeactivated?.(key);
      }

      // 4. Immediately trigger redraw passing the updated layers so canvas is never 1-step behind
      options?.onRequestRedraw?.(updated);
    },
    [options]
  );

  const setLayers = useCallback((newLayers: LayerGroupState) => {
    layersRef.current = newLayers;
    setLayersState(newLayers);
  }, []);

  const isLayerActive = useCallback((key: keyof LayerGroupState): boolean => {
    const layer = layersRef.current[key];
    return Boolean(layer && layer.visible && !layer.locked);
  }, []);

  return {
    layers,
    layersRef,
    setLayers,
    updateLayer,
    isLayerActive,
  };
}
