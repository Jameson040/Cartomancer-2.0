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
}

interface UseTransformManagerProps {
  selectedStampId: string | null;
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

  const startTransform = useCallback(
    (mode: TransformMode, startData: TransformStartData) => {
      transformModeRef.current = mode;
      transformStartRef.current = startData;
    },
    []
  );

  const cancelTransform = useCallback(() => {
    transformModeRef.current = null;
    transformStartRef.current = null;
  }, []);

  const handleTransformMove = useCallback(
    (coords: { x: number; y: number }): boolean => {
      if (!transformModeRef.current || !transformStartRef.current) return false;

      const mode = transformModeRef.current;
      const start = transformStartRef.current;
      const dx = coords.x - start.startX;
      const dy = coords.y - start.startY;

      if (selectedStampId) {
        if (!isStampsActive()) {
          cancelTransform();
          return false;
        }
        if (mode === 'move') {
          const newX = Math.round(start.initialElement.x + dx);
          const newY = Math.round(start.initialElement.y + dy);
          const next = stampsRef.current.map((s) => (s.id === selectedStampId ? { ...s, x: newX, y: newY } : s));
          stampsRef.current = next;
          setStamps(next);
        } else if (mode === 'scale') {
          const currentDist = Math.hypot(coords.x - start.centerX, coords.y - start.centerY);
          const ratio = currentDist / Math.max(10, start.initialDist);
          const newScale = Math.max(0.2, Math.min(4.0, Number((start.initialElement.scale * ratio).toFixed(2))));
          const next = stampsRef.current.map((s) => (s.id === selectedStampId ? { ...s, scale: newScale } : s));
          stampsRef.current = next;
          setStamps(next);
        } else if (mode === 'rotate') {
          const curAngle = (Math.atan2(coords.y - start.centerY, coords.x - start.centerX) * 180) / Math.PI;
          const deltaAngle = curAngle - start.initialAngle;
          const newRot = Math.round((start.initialElement.rotation + deltaAngle + 360) % 360);
          const next = stampsRef.current.map((s) => (s.id === selectedStampId ? { ...s, rotation: newRot } : s));
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
    [cancelTransform, isLabelsActive, isStampsActive, labelsRef, requestRedraw, selectedLabelId, selectedStampId, setLabels, setStamps, stampsRef]
  );

  const finishTransform = useCallback(() => {
    if (!transformModeRef.current || !transformStartRef.current) return;
    const mode = transformModeRef.current;
    if (selectedStampId) {
      pushHistorySnapshot(`Transform Stamp (${mode})`, { stamps: stampsRef.current });
    } else if (selectedLabelId) {
      pushHistorySnapshot(`Move Label`, { labels: labelsRef.current });
    }
    transformModeRef.current = null;
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
