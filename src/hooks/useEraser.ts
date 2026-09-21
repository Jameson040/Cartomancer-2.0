import React, { useRef, useCallback } from 'react';
import { PlacedStamp, PlacedPath, PlacedText, BrushSettings } from '../types';
import { isPointNearPath } from '../utils/geometry';
import { isPointInStamp, isPointInLabel, getStampsFrontToBack } from '../utils/hitTesting';

interface UseEraserProps {
  brushSettings: BrushSettings;
  stampsRef: React.MutableRefObject<PlacedStamp[]>;
  pathsRef: React.MutableRefObject<PlacedPath[]>;
  labelsRef: React.MutableRefObject<PlacedText[]>;
  setStamps: (stamps: PlacedStamp[]) => void;
  setPaths: (paths: PlacedPath[]) => void;
  setLabels: (labels: PlacedText[]) => void;
  selectedStampId: string | null;
  selectedPathId: string | null;
  selectedLabelId: string | null;
  setSelectedStampId: (id: string | null) => void;
  setSelectedPathId: (id: string | null) => void;
  setSelectedLabelId: (id: string | null) => void;
  isStampsActive: () => boolean;
  isPathsActive: () => boolean;
  isLabelsActive: () => boolean;
  pushHistorySnapshot: (description: string, overrides?: any) => void;
  requestRedraw: () => void;
}

export function useEraser({
  brushSettings,
  stampsRef,
  pathsRef,
  labelsRef,
  setStamps,
  setPaths,
  setLabels,
  selectedStampId,
  selectedPathId,
  selectedLabelId,
  setSelectedStampId,
  setSelectedPathId,
  setSelectedLabelId,
  isStampsActive,
  isPathsActive,
  isLabelsActive,
  pushHistorySnapshot,
  requestRedraw,
}: UseEraserProps) {
  const isErasingRef = useRef(false);
  const erasedElementsCountRef = useRef(0);

  const eraseElementsAt = useCallback(
    (x: number, y: number) => {
      const eraseRadius = Math.max(25, brushSettings.size * 0.5);
      const targetMode = brushSettings.eraserTarget || 'all';
      let didErase = false;

      const stampsActive = isStampsActive();
      const pathsActive = isPathsActive();
      const labelsActive = isLabelsActive();

      // 1. Erase Paths & Rivers
      if ((targetMode === 'all' || targetMode === 'paths') && pathsActive) {
        const currentPaths = pathsRef.current;
        const remainingPaths = currentPaths.filter((p) => !isPointNearPath(x, y, p, eraseRadius));
        if (remainingPaths.length !== currentPaths.length) {
          didErase = true;
          erasedElementsCountRef.current += currentPaths.length - remainingPaths.length;
          pathsRef.current = remainingPaths;
          setPaths(remainingPaths);
        }
      }

      // 2. Erase Stamps & Objects
      if ((targetMode === 'all' || targetMode === 'stamps') && stampsActive) {
        const currentStamps = stampsRef.current;
        const remainingStamps = currentStamps.filter((s) => !isPointInStamp(x, y, s, eraseRadius));
        if (remainingStamps.length !== currentStamps.length) {
          didErase = true;
          erasedElementsCountRef.current += currentStamps.length - remainingStamps.length;
          stampsRef.current = remainingStamps;
          setStamps(remainingStamps);
        }
      }

      // 3. Erase Text Labels
      if ((targetMode === 'all' || targetMode === 'labels') && labelsActive) {
        const currentLabels = labelsRef.current;
        const remainingLabels = currentLabels.filter((l) => !isPointInLabel(x, y, l, eraseRadius));
        if (remainingLabels.length !== currentLabels.length) {
          didErase = true;
          erasedElementsCountRef.current += currentLabels.length - remainingLabels.length;
          labelsRef.current = remainingLabels;
          setLabels(remainingLabels);
        }
      }

      if (didErase) {
        requestRedraw();
      }
    },
    [brushSettings.size, brushSettings.eraserTarget, isLabelsActive, isPathsActive, isStampsActive, labelsRef, pathsRef, requestRedraw, setLabels, setPaths, setStamps, stampsRef]
  );

  const eraseSingleElementAtPoint = useCallback(
    (x: number, y: number): boolean => {
      const targetMode = brushSettings.eraserTarget || 'all';
      const stampsActive = isStampsActive();
      const labelsActive = isLabelsActive();
      const pathsActive = isPathsActive();

      // 1. Direct single-click deletion for stamps
      if ((targetMode === 'all' || targetMode === 'stamps') && stampsActive) {
        const clickedStamp = getStampsFrontToBack(stampsRef.current).find((s) => isPointInStamp(x, y, s));
        if (clickedStamp) {
          const remainingStamps = stampsRef.current.filter((s) => s.id !== clickedStamp.id);
          stampsRef.current = remainingStamps;
          setStamps(remainingStamps);
          if (selectedStampId === clickedStamp.id) setSelectedStampId(null);
          pushHistorySnapshot('Erase Stamp', { stamps: remainingStamps });
          return true;
        }
      }

      // 2. Direct single-click deletion for labels
      if ((targetMode === 'all' || targetMode === 'labels') && labelsActive) {
        const clickedLabel = [...labelsRef.current].reverse().find((l) => isPointInLabel(x, y, l));
        if (clickedLabel) {
          const remainingLabels = labelsRef.current.filter((l) => l.id !== clickedLabel.id);
          labelsRef.current = remainingLabels;
          setLabels(remainingLabels);
          if (selectedLabelId === clickedLabel.id) setSelectedLabelId(null);
          pushHistorySnapshot('Erase Label', { labels: remainingLabels });
          return true;
        }
      }

      // 3. Direct single-click deletion for paths / rivers
      if ((targetMode === 'all' || targetMode === 'paths') && pathsActive) {
        const clickedPath = [...pathsRef.current].reverse().find((p) => isPointNearPath(x, y, p, 24));
        if (clickedPath) {
          const remainingPaths = pathsRef.current.filter((p) => p.id !== clickedPath.id);
          pathsRef.current = remainingPaths;
          setPaths(remainingPaths);
          if (selectedPathId === clickedPath.id) setSelectedPathId(null);
          pushHistorySnapshot('Erase Path', { paths: remainingPaths });
          return true;
        }
      }

      return false;
    },
    [brushSettings.eraserTarget, isLabelsActive, isPathsActive, isStampsActive, labelsRef, pathsRef, pushHistorySnapshot, selectedLabelId, selectedPathId, selectedStampId, setLabels, setPaths, setSelectedLabelId, setSelectedPathId, setSelectedStampId, setStamps, stampsRef]
  );

  const finishErasing = useCallback(() => {
    isErasingRef.current = false;
    if (erasedElementsCountRef.current > 0) {
      pushHistorySnapshot('Erase Elements', {
        stamps: stampsRef.current,
        paths: pathsRef.current,
        labels: labelsRef.current,
      });
      erasedElementsCountRef.current = 0;
    }
  }, [labelsRef, pathsRef, pushHistorySnapshot, stampsRef]);

  return {
    isErasingRef,
    erasedElementsCountRef,
    eraseElementsAt,
    eraseSingleElementAtPoint,
    finishErasing,
  };
}
