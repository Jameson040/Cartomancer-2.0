import { useState, useRef, useEffect, useCallback } from 'react';
import { PlacedStamp, BrushSettings } from '../types';

interface UseStampManagerProps {
  initialStamps?: PlacedStamp[];
  pushHistorySnapshot: (description: string, overrides?: { stamps?: PlacedStamp[] }) => void;
  requestRedraw: (overrides?: { stamps?: PlacedStamp[] }) => void;
  isStampsActive: () => boolean;
  selectedStampIds?: string[];
  setSelectedStampIds?: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useStampManager({
  initialStamps = [],
  pushHistorySnapshot,
  requestRedraw,
  isStampsActive,
  selectedStampIds = [],
  setSelectedStampIds,
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

  const [stampStyleClipboard, setStampStyleClipboard] = useState<Partial<PlacedStamp> | null>(null);

  const placeStampsAt = useCallback(
    (cx: number, cy: number, brushSettings: BrushSettings) => {
      if (!isStampsActive()) return;

      const poolIds =
        brushSettings.stampPoolIds && brushSettings.stampPoolIds.length > 0
          ? brushSettings.stampPoolIds
          : [brushSettings.selectedStampId];
      const isScatter = brushSettings.stampPlacementMode === 'scatter';
      const isRibbon = brushSettings.stampPlacementMode === 'ribbon';
      const count = isScatter ? (brushSettings.scatterDensity ?? 4) : 1;
      const radius = isScatter ? (brushSettings.scatterRadius ?? 60) : 0;

      const newStamps: PlacedStamp[] = [];

      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < count; i++) {
        const pickedAssetId =
          poolIds[Math.floor(Math.random() * poolIds.length)] || brushSettings.selectedStampId;
        const scatterT = count <= 1 ? 0 : Math.sqrt((i + 0.5) / count);
        const scatterAngle = i * goldenAngle + Math.random() * 0.35;
        const offsetX = isScatter ? Math.cos(scatterAngle) * radius * scatterT : 0;
        const offsetY = isScatter ? Math.sin(scatterAngle) * radius * scatterT * 0.78 : 0;
        const variance = brushSettings.scaleVariance ?? 0.15;
        const rotVariance = brushSettings.rotationVariance ?? Math.round(variance * 40);
        const scaleJitter =
          brushSettings.randomizeScale || isScatter || isRibbon
            ? variance > 0
              ? 1 + (Math.random() - 0.5) * 2 * variance
              : 1
            : 1;
        const rotJitter = rotVariance > 0 ? (Math.random() - 0.5) * 2 * rotVariance : 0;
        const shouldFlipX = brushSettings.randomizeFlipX
          ? Math.random() > 0.5
          : Boolean(brushSettings.stampFlipX ?? (isScatter && variance > 0 ? Math.random() > 0.5 : false));
        const shouldFlipY = Boolean(brushSettings.stampFlipY);

        const ribbonPerpJitter = isRibbon && variance > 0 ? (Math.random() - 0.5) * 12 * variance : 0;

        newStamps.push({
          id: `stamp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          assetId: pickedAssetId,
          x: cx + offsetX,
          y: cy + offsetY + ribbonPerpJitter,
          scale: Math.max(0.2, brushSettings.stampScale * scaleJitter),
          rotation: brushSettings.randomizeRotation ? rotJitter : (brushSettings.stampRotation || 0),
          flipX: shouldFlipX,
          flipY: shouldFlipY,
          opacity: brushSettings.stampOpacity ?? 1.0,
          tint: brushSettings.stampTint || undefined,
          hue: brushSettings.stampHue ?? 0,
          saturation: brushSettings.stampSaturation ?? 100,
          brightness: brushSettings.stampBrightness ?? 100,
          contrast: brushSettings.stampContrast ?? 100,
          blendMode: brushSettings.stampBlendMode || 'source-over',
          shadow: {
            enabled: brushSettings.stampShadowEnabled ?? true,
            blur: brushSettings.stampShadowBlur ?? 6,
            offsetX: brushSettings.stampShadowOffsetX ?? 3,
            offsetY: brushSettings.stampShadowOffsetY ?? 4,
            opacity: brushSettings.stampShadowOpacity ?? 0.35,
            groundOcclusion: brushSettings.stampGroundOcclusion ?? true,
          },
          locked: false,
          layer: brushSettings.stampLayer,
          createdAt: Date.now() + i,
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
      if (!isStampsActive()) return;
      const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
      if (!targetIds || targetIds.size === 0) return;
      const next = stampsRef.current.map((s) => {
        if (!targetIds.has(s.id)) return s;
        // Allow unlocking even when locked, otherwise block transform mutations if locked
        if (s.locked && updates.locked === undefined) return s;
        return { ...s, ...updates };
      });
      stampsRef.current = next;
      setStampsState(next);
      requestRedraw({ stamps: next });
    },
    [selectedStampId, selectedStampIds, isStampsActive, requestRedraw]
  );

  const handleDeleteSelectedStamp = useCallback(() => {
    if (!isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const remaining = stampsRef.current.filter((s) => !targetIds.has(s.id) || s.locked);
    if (remaining.length === stampsRef.current.length) return;
    stampsRef.current = remaining;
    setStampsState(remaining);
    setSelectedStampId(null);
    setSelectedStampIds?.([]);
    const count = targetIds.size;
    pushHistorySnapshot(count > 1 ? `Delete ${count} Stamps` : 'Delete Stamp', { stamps: remaining });
    requestRedraw({ stamps: remaining });
  }, [selectedStampId, selectedStampIds, setSelectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleDuplicateSelectedStamp = useCallback(() => {
    if (!isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const toDuplicate = stampsRef.current.filter((item) => targetIds.has(item.id));
    if (toDuplicate.length === 0) return;

    const newGroupId = toDuplicate.length > 1 && toDuplicate[0].groupId ? `group_${Date.now()}` : undefined;
    const newClones: PlacedStamp[] = toDuplicate.map((s, idx) => ({
      ...s,
      id: `stamp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      x: s.x + 24,
      y: s.y + 24,
      locked: false,
      groupId: newGroupId || s.groupId,
      createdAt: Date.now() + idx,
    }));

    const next = [...stampsRef.current, ...newClones];
    stampsRef.current = next;
    setStampsState(next);

    const newCloneIds = newClones.map((c) => c.id);
    setSelectedStampIds?.(newCloneIds);
    setSelectedStampId(newCloneIds[newCloneIds.length - 1]);

    const count = newClones.length;
    pushHistorySnapshot(count > 1 ? `Duplicate ${count} Stamps` : 'Duplicate Stamp', { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampId, selectedStampIds, setSelectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleBringStampToFront = useCallback(() => {
    if (!isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const selectedList = stampsRef.current.filter((item) => targetIds.has(item.id));
    const unselectedList = stampsRef.current.filter((item) => !targetIds.has(item.id));
    const next = [...unselectedList, ...selectedList];
    stampsRef.current = next;
    setStampsState(next);
    pushHistorySnapshot('Bring Stamp to Front', { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampId, selectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleSendStampToBack = useCallback(() => {
    if (!isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const selectedList = stampsRef.current.filter((item) => targetIds.has(item.id));
    const unselectedList = stampsRef.current.filter((item) => !targetIds.has(item.id));
    const next = [...selectedList, ...unselectedList];
    stampsRef.current = next;
    setStampsState(next);
    pushHistorySnapshot('Send Stamp to Back', { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampId, selectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleToggleLockSelectedStamp = useCallback(() => {
    if (!isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const first = stampsRef.current.find((s) => targetIds.has(s.id));
    if (!first) return;
    const nextLocked = !first.locked;

    const next = stampsRef.current.map((s) =>
      targetIds.has(s.id) ? { ...s, locked: nextLocked } : s
    );
    stampsRef.current = next;
    setStampsState(next);
    pushHistorySnapshot(nextLocked ? 'Lock Stamp' : 'Unlock Stamp', { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampId, selectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleGroupSelectedStamps = useCallback(() => {
    if (!isStampsActive() || selectedStampIds.length < 2) return;
    const targetIds = new Set(selectedStampIds);
    const groupId = `group_${Date.now().toString(36)}`;
    const next = stampsRef.current.map((s) =>
      targetIds.has(s.id) ? { ...s, groupId } : s
    );
    stampsRef.current = next;
    setStampsState(next);
    pushHistorySnapshot(`Group ${selectedStampIds.length} Stamps`, { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleUngroupSelectedStamps = useCallback(() => {
    if (!isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const groupIds = new Set(
      stampsRef.current
        .filter((s) => targetIds.has(s.id) && s.groupId)
        .map((s) => s.groupId!)
    );

    const next = stampsRef.current.map((s) =>
      targetIds.has(s.id) || (s.groupId && groupIds.has(s.groupId))
        ? { ...s, groupId: undefined }
        : s
    );
    stampsRef.current = next;
    setStampsState(next);
    pushHistorySnapshot('Ungroup Stamps', { stamps: next });
    requestRedraw({ stamps: next });
  }, [selectedStampId, selectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleCopyStampStyle = useCallback(() => {
    const primary = stampsRef.current.find((s) => s.id === selectedStampId);
    if (!primary) return;
    setStampStyleClipboard({
      scale: primary.scale,
      opacity: primary.opacity,
      tint: primary.tint,
      hue: primary.hue ?? 0,
      saturation: primary.saturation ?? 100,
      brightness: primary.brightness ?? 100,
      contrast: primary.contrast ?? 100,
      blendMode: primary.blendMode || 'source-over',
      shadow: primary.shadow ? { ...primary.shadow } : undefined,
      layer: primary.layer,
    });
  }, [selectedStampId]);

  const handlePasteStampStyle = useCallback(() => {
    if (!stampStyleClipboard || !isStampsActive()) return;
    const targetIds = selectedStampIds.length > 0 ? new Set(selectedStampIds) : selectedStampId ? new Set([selectedStampId]) : null;
    if (!targetIds || targetIds.size === 0) return;

    const next = stampsRef.current.map((s) =>
      targetIds.has(s.id) && !s.locked ? { ...s, ...stampStyleClipboard } : s
    );
    stampsRef.current = next;
    setStampsState(next);
    pushHistorySnapshot('Paste Stamp Style', { stamps: next });
    requestRedraw({ stamps: next });
  }, [stampStyleClipboard, selectedStampId, selectedStampIds, isStampsActive, pushHistorySnapshot, requestRedraw]);

  const handleDeleteStampById = useCallback(
    (id: string) => {
      const updated = stampsRef.current.filter((s) => s.id !== id);
      stampsRef.current = updated;
      setStampsState(updated);
      if (selectedStampId === id) setSelectedStampId(null);
      setSelectedStampIds?.((prev) => prev.filter((item) => item !== id));
      pushHistorySnapshot('Delete Stamp Asset', { stamps: updated });
      requestRedraw({ stamps: updated });
    },
    [selectedStampId, setSelectedStampIds, pushHistorySnapshot, requestRedraw]
  );

  return {
    stamps,
    stampsRef,
    setStamps,
    selectedStampId,
    setSelectedStampId,
    stampStyleClipboard,
    placeStampsAt,
    handleUpdateSelectedStamp,
    handleDeleteSelectedStamp,
    handleDeleteStampById,
    handleDuplicateSelectedStamp,
    handleBringStampToFront,
    handleSendStampToBack,
    handleToggleLockSelectedStamp,
    handleGroupSelectedStamps,
    handleUngroupSelectedStamps,
    handleCopyStampStyle,
    handlePasteStampStyle,
  };
}
