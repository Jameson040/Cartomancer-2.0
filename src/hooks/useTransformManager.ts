import React, { useRef, useCallback } from 'react';
import { PlacedStamp, PlacedText } from '../types';

export type TransformMode = 'move' | 'scale' | 'rotate' | null;

export interface TransformStartData {
  startX: number;
  startY: number;
  initialElement: any;
  centerX: number;
  centerY: number;
  initialDist: number;
  initialAngle: number;
  selectedStampIds?: string[];
}

interface UseTransformManagerProps {
  selectedStampId: string | null;
  selectedStampIds?: string[];
  selectedLabelId: string | null;
  stampsRef: React.MutableRefObject<PlacedStamp[]>;
  labelsRef: React.MutableRefObject<PlacedText[]>;
  setStamps: (stamps: PlacedStamp[]) => void;
  setLabels: (labels: PlacedText[]) => void;
  isStampsActive: () => boolean;
  isLabelsActive: () => boolean;
  requestRedraw: () => void;
  pushHistorySnapshot: (description: string, overrides?: any) => void;
}

export function useTransformManager({
  selectedStampId,
  selectedStampIds = [],
  selectedLabelId,
  stampsRef,
  labelsRef,
  setStamps,
  setLabels,
  isStampsActive,
  isLabelsActive,
  requestRedraw,
  pushHistorySnapshot,
}: UseTransformManagerProps) {
  const transformModeRef = useRef<TransformMode>(null);
  const transformStartRef = useRef<TransformStartData | null>(null);
  const initialStampTransformsRef = useRef<Map<string, { x: number; y: number; scale: number; rotation: number }>>(new Map());
  const transformMovedRef = useRef(false);

  const startTransform = useCallback(
    (mode: TransformMode, startData: TransformStartData) => {
      transformModeRef.current = mode;
      transformStartRef.current = startData;
      initialStampTransformsRef.current = new Map(
        stampsRef.current
          .filter((stamp) => (startData.selectedStampIds ?? selectedStampIds).includes(stamp.id) || stamp.id === selectedStampId)
          .map((stamp) => [stamp.id, { x: stamp.x, y: stamp.y, scale: stamp.scale, rotation: stamp.rotation }])
      );
      transformMovedRef.current = false;
    },
    [selectedStampId, selectedStampIds, stampsRef]
  );

  const cancelTransform = useCallback(() => {
    transformModeRef.current = null;
    transformStartRef.current = null;
    initialStampTransformsRef.current.clear();
    transformMovedRef.current = false;
  }, []);

  const handleTransformMove = useCallback(
    (coords: { x: number; y: number }): boolean => {
      if (!transformModeRef.current || !transformStartRef.current) return false;

      const mode = transformModeRef.current;
      const start = transformStartRef.current;
      const dx = coords.x - start.startX;
      const dy = coords.y - start.startY;
      // A press without meaningful movement is a selection click, not an edit.
      // This prevents a history entry from being created for every simple click.
      if (Math.hypot(dx, dy) > 1) transformMovedRef.current = true;

      if (selectedStampId) {
        if (!isStampsActive()) {
          cancelTransform();
          return false;
        }
        if (mode === 'move') {
          const activeStampIds = start.selectedStampIds ?? selectedStampIds;
          const selectedIds = activeStampIds.length > 0 ? new Set(activeStampIds) : new Set([selectedStampId]);
          const next = stampsRef.current.map((s) =>
            selectedIds.has(s.id) && !s.locked
              ? {
                  ...s,
                  x: Math.round((initialStampTransformsRef.current.get(s.id)?.x ?? s.x) + dx),
                  y: Math.round((initialStampTransformsRef.current.get(s.id)?.y ?? s.y) + dy),
                }
              : s
          );
          stampsRef.current = next;
          setStamps(next);
        } else if (mode === 'scale') {
          const currentDist = Math.hypot(coords.x - start.centerX, coords.y - start.centerY);
          const ratio = currentDist / Math.max(10, start.initialDist);
          const activeStampIds = start.selectedStampIds ?? selectedStampIds;
          const selectedIds = activeStampIds.length > 1 ? new Set(activeStampIds) : new Set([selectedStampId]);
          const next = stampsRef.current.map((s) => {
            const initial = initialStampTransformsRef.current.get(s.id);
            if (!initial || !selectedIds.has(s.id) || s.locked) return s;
            return {
              ...s,
              x: selectedIds.size > 1 ? Math.round(start.centerX + (initial.x - start.centerX) * ratio) : s.x,
              y: selectedIds.size > 1 ? Math.round(start.centerY + (initial.y - start.centerY) * ratio) : s.y,
              scale: Math.max(0.2, Math.min(4.0, Number((initial.scale * ratio).toFixed(2)))),
            };
          });
          stampsRef.current = next;
          setStamps(next);
        } else if (mode === 'rotate') {
          const curAngle = (Math.atan2(coords.y - start.centerY, coords.x - start.centerX) * 180) / Math.PI;
          const deltaAngle = curAngle - start.initialAngle;
          const activeStampIds = start.selectedStampIds ?? selectedStampIds;
          const selectedIds = activeStampIds.length > 1 ? new Set(activeStampIds) : new Set([selectedStampId]);
          const next = stampsRef.current.map((s) => {
            const initial = initialStampTransformsRef.current.get(s.id);
            if (!initial || !selectedIds.has(s.id) || s.locked) return s;
            const radians = (deltaAngle * Math.PI) / 180;
            const relX = initial.x - start.centerX;
            const relY = initial.y - start.centerY;
            return {
              ...s,
              x: selectedIds.size > 1 ? Math.round(start.centerX + relX * Math.cos(radians) - relY * Math.sin(radians)) : s.x,
              y: selectedIds.size > 1 ? Math.round(start.centerY + relX * Math.sin(radians) + relY * Math.cos(radians)) : s.y,
              rotation: Math.round((initial.rotation + deltaAngle + 360) % 360),
            };
          });
          stampsRef.current = next;
          setStamps(next);
        }
        requestRedraw();
        return true;
      } else if (selectedLabelId) {
        if (!isLabelsActive()) {
          cancelTransform();
          return false;
        }
        if (mode === 'move') {
          const newX = Math.round(start.initialElement.x + dx);
          const newY = Math.round(start.initialElement.y + dy);
          const next = labelsRef.current.map((l) => (l.id === selectedLabelId ? { ...l, x: newX, y: newY } : l));
          labelsRef.current = next;
          setLabels(next);
        }
        requestRedraw();
        return true;
      }
      return false;
    },
    [cancelTransform, isLabelsActive, isStampsActive, labelsRef, requestRedraw, selectedLabelId, selectedStampId, selectedStampIds, setLabels, setStamps, stampsRef]
  );

  const finishTransform = useCallback(() => {
    if (!transformModeRef.current || !transformStartRef.current) return;
    const mode = transformModeRef.current;
    const didMove = transformMovedRef.current;
    if (didMove && selectedStampId) {
      pushHistorySnapshot(`Transform Stamp (${mode})`, { stamps: stampsRef.current });
    } else if (didMove && selectedLabelId) {
      pushHistorySnapshot(`Move Label`, { labels: labelsRef.current });
    }
    transformModeRef.current = null;
    initialStampTransformsRef.current.clear();
    transformMovedRef.current = false;
    transformStartRef.current = null;
  }, [pushHistorySnapshot, selectedLabelId, selectedStampId, stampsRef, labelsRef]);

  return {
    transformModeRef,
    transformStartRef,
    startTransform,
    cancelTransform,
    handleTransformMove,
    finishTransform,
  };
}
