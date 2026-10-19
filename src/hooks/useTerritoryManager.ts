import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedTerritory, BrushSettings } from '../types';

interface UseTerritoryManagerProps {
  initialTerritories?: PlacedTerritory[];
  pushHistorySnapshot: (description: string, overrides?: { territories?: PlacedTerritory[] }) => void;
  requestRedraw: (overrides?: { territories?: PlacedTerritory[] }) => void;
}

export function useTerritoryManager({
  initialTerritories = [],
  pushHistorySnapshot,
  requestRedraw,
}: UseTerritoryManagerProps) {
  const [territories, setTerritoriesState] = useState<PlacedTerritory[]>(initialTerritories);
  const territoriesRef = useRef<PlacedTerritory[]>(territories);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [territoryVertices, setTerritoryVertices] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    territoriesRef.current = territories;
  }, [territories]);

  const setTerritories = useCallback((next: PlacedTerritory[]) => {
    territoriesRef.current = next;
    setTerritoriesState(next);
  }, []);

  const commitTerritory = useCallback(
    (brushSettings: BrushSettings, verticesOverride?: { x: number; y: number }[]) => {
      const pts = verticesOverride || territoryVertices;
      if (pts.length < 3) return;

      const newTerritory: PlacedTerritory = {
        id: `territory_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: (brushSettings.territoryName || 'New Kingdom').trim(),
        points: pts.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) })),
        fillColor: brushSettings.territoryFillColor || '#f59e0b',
        fillOpacity: brushSettings.territoryFillOpacity ?? 0.22,
        borderColor: brushSettings.territoryBorderColor || '#b45309',
        borderWidth: brushSettings.territoryBorderWidth ?? 3,
        innerGlowWidth: brushSettings.territoryInnerGlowWidth ?? 18,
        borderStyle: brushSettings.territoryBorderStyle || 'dashed',
        showLabel: brushSettings.territoryShowLabel ?? true,
        locked: false,
      };

      const next = [...territoriesRef.current, newTerritory];
      territoriesRef.current = next;
      setTerritoriesState(next);
      setTerritoryVertices([]);
      setSelectedTerritoryId(newTerritory.id);
      pushHistorySnapshot('Create Territory', { territories: next });
      requestRedraw({ territories: next });
    },
    [territoryVertices, pushHistorySnapshot, requestRedraw]
  );

  const addTerritoryVertex = useCallback(
    (x: number, y: number, brushSettings: BrushSettings) => {
      setTerritoryVertices((prev) => {
        // Close polygon automatically if clicking near the first vertex with at least 3 vertices
        if (prev.length >= 3 && Math.hypot(x - prev[0].x, y - prev[0].y) <= 18) {
          setTimeout(() => commitTerritory(brushSettings, prev), 0);
          return [];
        }
        return [...prev, { x: Math.round(x), y: Math.round(y) }];
      });
      requestRedraw();
    },
    [commitTerritory, requestRedraw]
  );

  const undoTerritoryVertex = useCallback(() => {
    setTerritoryVertices((prev) => prev.slice(0, -1));
    requestRedraw();
  }, [requestRedraw]);

  const cancelTerritoryDraft = useCallback(() => {
    setTerritoryVertices([]);
    requestRedraw();
  }, [requestRedraw]);

  const handleUpdateSelectedTerritory = useCallback(
    (updates: Partial<PlacedTerritory>) => {
      if (!selectedTerritoryId) return;
      const next = territoriesRef.current.map((t) =>
        t.id === selectedTerritoryId ? { ...t, ...updates } : t
      );
      territoriesRef.current = next;
      setTerritoriesState(next);
      requestRedraw({ territories: next });
    },
    [selectedTerritoryId, requestRedraw]
  );

  const handleDeleteSelectedTerritory = useCallback(() => {
    if (!selectedTerritoryId) return;
    const target = territoriesRef.current.find((t) => t.id === selectedTerritoryId);
    if (target?.locked) return;
    const next = territoriesRef.current.filter((t) => t.id !== selectedTerritoryId);
    territoriesRef.current = next;
    setTerritoriesState(next);
    setSelectedTerritoryId(null);
    pushHistorySnapshot('Delete Territory', { territories: next });
    requestRedraw({ territories: next });
  }, [selectedTerritoryId, pushHistorySnapshot, requestRedraw]);

  const handleDuplicateSelectedTerritory = useCallback(() => {
    if (!selectedTerritoryId) return;
    const target = territoriesRef.current.find((t) => t.id === selectedTerritoryId);
    if (!target) return;
    const clone: PlacedTerritory = {
      ...target,
      id: `territory_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${target.name} II`,
      points: target.points.map((pt) => ({ x: pt.x + 28, y: pt.y + 28 })),
      locked: false,
    };
    const next = [...territoriesRef.current, clone];
    territoriesRef.current = next;
    setTerritoriesState(next);
    setSelectedTerritoryId(clone.id);
    pushHistorySnapshot('Duplicate Territory', { territories: next });
    requestRedraw({ territories: next });
  }, [selectedTerritoryId, pushHistorySnapshot, requestRedraw]);

  return {
    territories,
    territoriesRef,
    setTerritories,
    selectedTerritoryId,
    setSelectedTerritoryId,
    territoryVertices,
    addTerritoryVertex,
    commitTerritory,
    undoTerritoryVertex,
    cancelTerritoryDraft,
    handleUpdateSelectedTerritory,
    handleDeleteSelectedTerritory,
    handleDuplicateSelectedTerritory,
  };
}
