import React, { useRef, useCallback } from 'react';
import { PlacedStamp, PlacedPath, PlacedText, PlacedTerritory, BrushSettings } from '../types';
import { isPointNearPath } from '../utils/geometry';
import { isPointInStamp, isPointInLabel, getStampsFrontToBack } from '../utils/hitTesting';
import { isPointInTerritory } from '../utils/rendering/renderTerritories';

interface UseEraserProps {
  brushSettings: BrushSettings;
  stampsRef: React.MutableRefObject<PlacedStamp[]>;
  pathsRef: React.MutableRefObject<PlacedPath[]>;
  labelsRef: React.MutableRefObject<PlacedText[]>;
  territoriesRef?: React.MutableRefObject<PlacedTerritory[]>;
  setStamps: (stamps: PlacedStamp[]) => void;
  setPaths: (paths: PlacedPath[]) => void;
  setLabels: (labels: PlacedText[]) => void;
  setTerritories?: (territories: PlacedTerritory[]) => void;
  selectedStampId: string | null;
  selectedPathId: string | null;
  selectedLabelId: string | null;
  selectedTerritoryId?: string | null;
  setSelectedStampId: (id: string | null) => void;
  setSelectedPathId: (id: string | null) => void;
  setSelectedLabelId: (id: string | null) => void;
  setSelectedTerritoryId?: (id: string | null) => void;
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
  territoriesRef,
  setStamps,
  setPaths,
  setLabels,
  setTerritories,
  selectedStampId,
  selectedPathId,
  selectedLabelId,
  selectedTerritoryId,
  setSelectedStampId,
  setSelectedPathId,
  setSelectedLabelId,
  setSelectedTerritoryId,
  isStampsActive,
  isPathsActive,
  isLabelsActive,
  pushHistorySnapshot,
  requestRedraw,
}: UseEraserProps) {
  const isErasingRef = useRef(false);
  const erasedElementsCountRef = useRef(0);
  // Tracks stamps already evaluated during a single sweep stroke so probabilistic
  // thinning (e.g. 30% density) evaluates each stamp once per stroke instead of every frame.
  const testedStampIdsRef = useRef<Set<string>>(new Set());

  const eraseElementsAt = useCallback(
    (x: number, y: number) => {
      const eraseRadius = Math.max(20, brushSettings.size * 0.5);
      const targetMode = brushSettings.eraserTarget || 'all';
      const thinningDensity = Math.max(0.05, Math.min(1.0, (brushSettings.stampEraserDensity ?? 100) / 100));
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

      // 2. Erase or Thin Out Stamps & Objects (respects locked state & thinning probability)
      if ((targetMode === 'all' || targetMode === 'stamps') && stampsActive) {
        const currentStamps = stampsRef.current;
        const remainingStamps = currentStamps.filter((s) => {
          if (s.locked) return true;
          if (!isPointInStamp(x, y, s, eraseRadius)) return true;
          if (thinningDensity >= 0.99) return false;
          if (testedStampIdsRef.current.has(s.id)) return true;
          testedStampIdsRef.current.add(s.id);
          return Math.random() >= thinningDensity;
        });
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

      // 4. Erase Political Territories
      if ((targetMode === 'all' || targetMode === 'territories') && territoriesRef && setTerritories) {
        const currentTerritories = territoriesRef.current;
        const remainingTerritories = currentTerritories.filter(
          (t) => t.locked || !isPointInTerritory(x, y, t)
        );
        if (remainingTerritories.length !== currentTerritories.length) {
          didErase = true;
          erasedElementsCountRef.current += currentTerritories.length - remainingTerritories.length;
          territoriesRef.current = remainingTerritories;
          setTerritories(remainingTerritories);
        }
      }

      if (didErase) {
        requestRedraw();
      }
    },
    [
      brushSettings.size,
      brushSettings.eraserTarget,
      brushSettings.stampEraserDensity,
      isLabelsActive,
      isPathsActive,
      isStampsActive,
      labelsRef,
      pathsRef,
      territoriesRef,
      requestRedraw,
      setLabels,
      setPaths,
      setStamps,
      setTerritories,
      stampsRef,
    ]
  );

  const eraseSingleElementAtPoint = useCallback(
    (x: number, y: number): boolean => {
      testedStampIdsRef.current.clear();
      const targetMode = brushSettings.eraserTarget || 'all';
      const stampsActive = isStampsActive();
      const labelsActive = isLabelsActive();
      const pathsActive = isPathsActive();

      // 1. Direct single-click deletion for stamps
      if ((targetMode === 'all' || targetMode === 'stamps') && stampsActive) {
        const clickedStamp = getStampsFrontToBack(stampsRef.current).find(
          (s) => !s.locked && isPointInStamp(x, y, s)
        );
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

      // 4. Direct single-click deletion for territories
      if ((targetMode === 'all' || targetMode === 'territories') && territoriesRef && setTerritories) {
        const clickedTerritory = [...territoriesRef.current]
          .reverse()
          .find((t) => !t.locked && isPointInTerritory(x, y, t));
        if (clickedTerritory) {
          const remainingTerritories = territoriesRef.current.filter((t) => t.id !== clickedTerritory.id);
          territoriesRef.current = remainingTerritories;
          setTerritories(remainingTerritories);
          if (selectedTerritoryId === clickedTerritory.id) setSelectedTerritoryId?.(null);
          pushHistorySnapshot('Erase Territory', { territories: remainingTerritories });
          return true;
        }
      }

      return false;
    },
    [
      brushSettings.eraserTarget,
      isLabelsActive,
      isPathsActive,
      isStampsActive,
      labelsRef,
      pathsRef,
      territoriesRef,
      pushHistorySnapshot,
      selectedLabelId,
      selectedPathId,
      selectedStampId,
      selectedTerritoryId,
      setLabels,
      setPaths,
      setSelectedLabelId,
      setSelectedPathId,
      setSelectedStampId,
      setSelectedTerritoryId,
      setStamps,
      setTerritories,
      stampsRef,
    ]
  );

  const finishErasing = useCallback(() => {
    isErasingRef.current = false;
    testedStampIdsRef.current.clear();
    if (erasedElementsCountRef.current > 0) {
      pushHistorySnapshot('Erase Elements', {
        stamps: stampsRef.current,
        paths: pathsRef.current,
        labels: labelsRef.current,
        territories: territoriesRef?.current,
      });
      erasedElementsCountRef.current = 0;
    }
  }, [labelsRef, pathsRef, territoriesRef, pushHistorySnapshot, stampsRef]);

  return {
    isErasingRef,
    erasedElementsCountRef,
    eraseElementsAt,
    eraseSingleElementAtPoint,
    finishErasing,
  };
}
