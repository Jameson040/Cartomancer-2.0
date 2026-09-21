import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedStamp, BrushSettings } from '../types';

interface UseStampManagerProps {
  initialStamps?: PlacedStamp[];
  pushHistorySnapshot: (description: string, overrides?: { stamps?: PlacedStamp[] }) => void;
  requestRedraw: (overrides?: { stamps?: PlacedStamp[] }) => void;
  isStampsActive: () => boolean;
}

export function useStampManager({
  initialStamps = [],
  pushHistorySnapshot,
  requestRedraw,
  isStampsActive,
}: UseStampManagerProps) {
  const [stamps, setStampsState] = useState<PlacedStamp[]>(initialStamps);
  const stampsRef = useRef<PlacedStamp[]>(stamps);
  const [selectedStampId, setSelectedStampId] = useState<string | null>(null);

  useEffect(() => {
    stampsRef.current = stamps;
  }, [stamps]);

  const setStamps = useCallback((newStamps: PlacedStamp[]) => {
    stampsRef.current = newStamps;
    setStampsState(newStamps);
  }, []);

  const placeStampsAt = useCallback(
    (cx: number, cy: number, brushSettings: BrushSettings) => {
      if (!isStampsActive()) return;

      const assetId = brushSettings.selectedStampId;
      const isScatter = brushSettings.stampPlacementMode === 'scatter';
      const isRibbon = brushSettings.stampPlacementMode === 'ribbon';
      const count = isScatter ? (brushSettings.scatterDensity ?? 4) : 1;
      const radius = isScatter ? (brushSettings.scatterRadius ?? 60) : 0;

      const newStamps: PlacedStamp[] = [];

      for (let i = 0; i < count; i++) {
        const offsetX = isScatter ? (Math.random() - 0.5) * radius * 2 : 0;
        const offsetY = isScatter ? (Math.random() - 0.5) * radius * 1.5 : 0;
        const variance = brushSettings.scaleVariance ?? 0.15;
        const rotVariance = brushSettings.rotationVariance ?? Math.round(variance * 40);
        const scaleJitter = variance > 0 ? 1 + (Math.random() - 0.5) * 2 * variance : 1;
        const rotJitter = rotVariance > 0 ? (Math.random() - 0.5) * 2 * rotVariance : 0;
        const shouldFlipX = brushSettings.randomizeFlipX
          ? Math.random() > 0.5
          : Boolean(brushSettings.stampFlipX ?? (variance > 0 ? Math.random() > 0.5 : false));
        const shouldFlipY = Boolean(brushSettings.stampFlipY);

        const ribbonPerpJitter = isRibbon && variance > 0 ? (Math.random() - 0.5) * 12 * variance : 0;

        newStamps.push({
          id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          assetId,
          x: cx + offsetX,
          y: cy + offsetY + ribbonPerpJitter,
          scale: Math.max(0.2, brushSettings.stampScale * scaleJitter),
          rotation: brushSettings.randomizeRotation ? rotJitter : (brushSettings.stampRotation || 0),
          flipX: shouldFlipX,
          flipY: shouldFlipY,
          opacity: brushSettings.stampOpacity ?? 1.0,
          tint: brushSettings.stampTint || undefined,
          layer: brushSettings.stampLayer,
          createdAt: Date.now(),
        });
      }

      const updatedStamps = [...stampsRef.current, ...newStamps];
      stampsRef.current = updatedStamps;
      setStampsState(updatedStamps);
      pushHistorySnapshot('Place Stamp', { stamps: updatedStamps });
      requestRedraw({ stamps: updatedStamps });
    },
    [isStampsActive, pushHistorySnapshot, requestRedraw]
  );

  const handleUpdateSelectedStamp = useCallback(
    (updates: Partial<PlacedStamp>) => {
      if (!selectedStampId || !isStampsActive()) return;
      const next = stampsRef.current.map((s) => (s.id === selectedStampId ? { ...s, ...updates } : s));
      stampsRef.current = next;
      setStampsState(next);
      requestRedraw({ stamps: next });
    },
    [selectedStampId, isStampsActive, requestRedraw]
  );

  const handleDeleteSelectedStamp = useCallback(() => {
    if (!selectedStampId || !isStampsActive()) return;
    const remaining = stampsRef.current.filter((s) => s.id !== selectedStampId);
    stampsRef.current = remaining;
    setStampsState(remaining);
    setSelectedStampId(null);
    pushHistorySnapshot('Delete Stamp', { stamps: remaining });
    requestRedraw({ stamps: remaining });
  }, [selectedStampId, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleDuplicateSelectedStamp = useCallback(() => {
    if (!selectedStampId || !isStampsActive()) return;
    const s = stampsRef.current.find((item) => item.id === selectedStampId);
    if (!s) return;
    const clone: PlacedStamp = {
      ...s,
      id: `stamp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: s.x + 24,
      y: s.y + 24,
      createdAt: Date.now(),
    };
    const next = [...stampsRef.current, clone];
    stampsRef.current = next;
    setStampsState(next);
    setSelectedStampId(clone.id);
    pushHistorySnapshot('Duplicate Stamp', { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampId, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleBringStampToFront = useCallback(() => {
    if (!selectedStampId || !isStampsActive()) return;
    const s = stampsRef.current.find((item) => item.id === selectedStampId);
    if (!s) return;
    const next = [...stampsRef.current.filter((item) => item.id !== selectedStampId), s];
    stampsRef.current = next;
    setStampsState(next);
    requestRedraw({ stamps: next });
  }, [selectedStampId, isStampsActive, requestRedraw]);

  const handleSendStampToBack = useCallback(() => {
    if (!selectedStampId || !isStampsActive()) return;
    const s = stampsRef.current.find((item) => item.id === selectedStampId);
    if (!s) return;
    const next = [s, ...stampsRef.current.filter((item) => item.id !== selectedStampId)];
    stampsRef.current = next;
    setStampsState(next);
    requestRedraw({ stamps: next });
  }, [selectedStampId, isStampsActive, requestRedraw]);

  const handleDeleteStampById = useCallback(
    (id: string) => {
      const updated = stampsRef.current.filter((s) => s.id !== id);
      stampsRef.current = updated;
      setStampsState(updated);
      if (selectedStampId === id) setSelectedStampId(null);
      pushHistorySnapshot('Delete Stamp Asset', { stamps: updated });
      requestRedraw({ stamps: updated });
    },
    [selectedStampId, pushHistorySnapshot, requestRedraw]
  );

  return {
    stamps,
    stampsRef,
    setStamps,
    selectedStampId,
    setSelectedStampId,
    placeStampsAt,
    handleUpdateSelectedStamp,
    handleDeleteSelectedStamp,
    handleDeleteStampById,
    handleDuplicateSelectedStamp,
    handleBringStampToFront,
    handleSendStampToBack,
  };
}
