import React, { useState, useRef, useCallback } from 'react';
import { HistoryStep, PlacedStamp, PlacedPath, PlacedText } from '../types';

export const MAX_HISTORY_STEPS = 25;

interface UseMapHistoryProps {
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  textureCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  elevationCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  stampsRef: React.MutableRefObject<PlacedStamp[]>;
  pathsRef: React.MutableRefObject<PlacedPath[]>;
  labelsRef: React.MutableRefObject<PlacedText[]>;
  setStamps: (stamps: PlacedStamp[]) => void;
  setPaths: (paths: PlacedPath[]) => void;
  setLabels: (labels: PlacedText[]) => void;
  requestRedraw: (overrides?: {
    stamps?: PlacedStamp[];
    paths?: PlacedPath[];
    labels?: PlacedText[];
  }) => void;
}

export function useMapHistory({
  maskCanvasRef,
  textureCanvasRef,
  elevationCanvasRef,
  stampsRef,
  pathsRef,
  labelsRef,
  setStamps,
  setPaths,
  setLabels,
  requestRedraw,
}: UseMapHistoryProps) {
  const historyStackRef = useRef<HistoryStep[]>([]);
  const redoStackRef = useRef<HistoryStep[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const pushHistorySnapshot = useCallback(
    (
      description: string,
      overrides?: {
        stamps?: PlacedStamp[];
        paths?: PlacedPath[];
        labels?: PlacedText[];
      }
    ) => {
      const mask = maskCanvasRef.current;
      const texture = textureCanvasRef.current;
      const elevation = elevationCanvasRef.current;
      if (!mask || !texture || !elevation) return;

      const mCtx = mask.getContext('2d');
      const tCtx = texture.getContext('2d');
      const eCtx = elevation.getContext('2d');
      if (!mCtx || !tCtx || !eCtx) return;

      const targetStamps = overrides?.stamps ?? stampsRef.current;
      const targetPaths = overrides?.paths ?? pathsRef.current;
      const targetLabels = overrides?.labels ?? labelsRef.current;

      const step: HistoryStep = {
        description,
        timestamp: Date.now(),
        maskImageData: mCtx.getImageData(0, 0, mask.width, mask.height),
        textureImageData: tCtx.getImageData(0, 0, texture.width, texture.height),
        elevationImageData: eCtx.getImageData(0, 0, elevation.width, elevation.height),
        stamps: targetStamps.map((s) => ({ ...s })),
        paths: targetPaths.map((p) => ({ ...p, points: [...p.points] })),
        labels: targetLabels.map((l) => ({ ...l })),
      };

      const newHistory = [...historyStackRef.current, step];
      if (newHistory.length > MAX_HISTORY_STEPS) {
        newHistory.shift();
      }
      historyStackRef.current = newHistory;
      redoStackRef.current = [];
      setUndoCount(Math.max(0, newHistory.length - 1));
      setRedoCount(0);
    },
    [elevationCanvasRef, labelsRef, maskCanvasRef, pathsRef, stampsRef, textureCanvasRef]
  );

  const restoreStep = useCallback(
    (step: HistoryStep) => {
      // 1. Immediately update refs and state
      const restoredStamps = step.stamps.map((s) => ({ ...s }));
      const restoredPaths = step.paths.map((p) => ({ ...p, points: [...p.points] }));
      const restoredLabels = step.labels.map((l) => ({ ...l }));

      stampsRef.current = restoredStamps;
      pathsRef.current = restoredPaths;
      labelsRef.current = restoredLabels;

      setStamps(restoredStamps);
      setPaths(restoredPaths);
      setLabels(restoredLabels);

      const mask = maskCanvasRef.current;
      const texture = textureCanvasRef.current;
      const elevation = elevationCanvasRef.current;
      if (!mask || !texture || !elevation) return;

      // 2. Synchronously restore pixel data if ImageData is available (zero flicker)
      if (step.maskImageData && step.textureImageData && step.elevationImageData) {
        const mCtx = mask.getContext('2d')!;
        mCtx.putImageData(step.maskImageData, 0, 0);

        const tCtx = texture.getContext('2d')!;
        tCtx.putImageData(step.textureImageData, 0, 0);

        const eCtx = elevation.getContext('2d')!;
        eCtx.putImageData(step.elevationImageData, 0, 0);

        requestRedraw({ stamps: restoredStamps, paths: restoredPaths, labels: restoredLabels });
        return;
      }

      // 3. Fallback for DataURL legacy steps
      let pending = 0;
      const checkDone = () => {
        pending--;
        if (pending <= 0) {
          requestRedraw({ stamps: restoredStamps, paths: restoredPaths, labels: restoredLabels });
        }
      };

      if (step.maskDataUrl) {
        pending++;
        const mImg = new Image();
        mImg.onload = () => {
          const mCtx = mask.getContext('2d')!;
          mCtx.clearRect(0, 0, mask.width, mask.height);
          mCtx.drawImage(mImg, 0, 0);
          checkDone();
        };
        mImg.src = step.maskDataUrl;
      }

      if (step.textureDataUrl) {
        pending++;
        const tImg = new Image();
        tImg.onload = () => {
          const tCtx = texture.getContext('2d')!;
          tCtx.clearRect(0, 0, texture.width, texture.height);
          tCtx.drawImage(tImg, 0, 0);
          checkDone();
        };
        tImg.src = step.textureDataUrl;
      }

      if (step.elevationDataUrl) {
        pending++;
        const eImg = new Image();
        eImg.onload = () => {
          const eCtx = elevation.getContext('2d')!;
          eCtx.clearRect(0, 0, elevation.width, elevation.height);
          eCtx.drawImage(eImg, 0, 0);
          checkDone();
        };
        eImg.src = step.elevationDataUrl;
      }
    },
    [elevationCanvasRef, labelsRef, maskCanvasRef, pathsRef, requestRedraw, setLabels, setPaths, setStamps, stampsRef, textureCanvasRef]
  );

  const handleUndo = useCallback(() => {
    if (historyStackRef.current.length <= 1) return;
    const current = historyStackRef.current.pop();
    if (!current) return;
    redoStackRef.current.push(current);

    const prev = historyStackRef.current[historyStackRef.current.length - 1];
    if (prev) {
      restoreStep(prev);
    }
    setUndoCount(Math.max(0, historyStackRef.current.length - 1));
    setRedoCount(redoStackRef.current.length);
  }, [restoreStep]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) return;
    const next = redoStackRef.current.pop();
    if (!next) return;
    historyStackRef.current.push(next);
    restoreStep(next);

    setUndoCount(Math.max(0, historyStackRef.current.length - 1));
    setRedoCount(redoStackRef.current.length);
  }, [restoreStep]);

  const resetHistory = useCallback((initialStep?: HistoryStep) => {
    historyStackRef.current = initialStep ? [initialStep] : [];
    redoStackRef.current = [];
    setUndoCount(0);
    setRedoCount(0);
  }, []);

  return {
    historyStackRef,
    redoStackRef,
    undoCount,
    redoCount,
    pushHistorySnapshot,
    restoreStep,
    handleUndo,
    handleRedo,
    resetHistory,
  };
}
