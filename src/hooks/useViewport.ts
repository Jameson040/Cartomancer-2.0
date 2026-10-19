import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CanvasDimensions } from '../types';

interface UseViewportProps {
  dimensions: CanvasDimensions;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
  mapStageRef?: React.RefObject<HTMLDivElement | null>;
  onModifierWheel?: (e: WheelEvent) => boolean;
}

interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

export function useViewport({
  dimensions,
  mainCanvasRef,
  viewportRef,
  mapStageRef,
  onModifierWheel,
}: UseViewportProps) {
  // Unified viewport state for atomic zoom & pan synchronization
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 0.75,
    pan: { x: 32, y: 24 },
  });
  const viewportStateRef = useRef<ViewportState>(viewport);
  viewportStateRef.current = viewport;

  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const zoom = viewport.zoom;
  const pan = viewport.pan;

  const syncStageTransform = useCallback(
    (nextPan: { x: number; y: number }, nextZoom: number) => {
      if (mapStageRef?.current) {
        mapStageRef.current.style.transform = `translate3d(${nextPan.x}px, ${nextPan.y}px, 0px) scale(${nextZoom})`;
      }
    },
    [mapStageRef]
  );

  // Spacebar panning detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.code === 'Space' && !e.repeat) {
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
      setIsPanning(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLElement> | MouseEvent | { clientX: number; clientY: number }): { x: number; y: number } => {
      const mainCanvas = mainCanvasRef.current;
      if (!mainCanvas) return { x: 0, y: 0 };
      const rect = mainCanvas.getBoundingClientRect();

      const scaleX = dimensions.width / rect.width;
      const scaleY = dimensions.height / rect.height;

      const x = Math.round((e.clientX - rect.left) * scaleX);
      const y = Math.round((e.clientY - rect.top) * scaleY);

      return {
        x: Math.max(0, Math.min(dimensions.width, x)),
        y: Math.max(0, Math.min(dimensions.height, y)),
      };
    },
    [dimensions, mainCanvasRef]
  );

  /**
   * Fit the map to comfortably fill the screen with balanced padding
   */
  const fitToScreen = useCallback(
    (containerWidth?: number, containerHeight?: number, customDims?: CanvasDimensions) => {
      const targetDims = customDims || dimensions;
      const viewportEl = viewportRef?.current;
      const w = containerWidth || (viewportEl ? viewportEl.clientWidth : 0);
      const h = containerHeight || (viewportEl ? viewportEl.clientHeight : 0);
      if (!w || !h) {
        const fallback = {
          zoom: 0.65,
          pan: { x: 24, y: 24 },
        };
        syncStageTransform(fallback.pan, fallback.zoom);
        setViewport(fallback);
        return;
      }
      const padX = 24;
      const padY = 24;
      const scaleX = (w - padX * 2) / targetDims.width;
      const scaleY = (h - padY * 2) / targetDims.height;
      const bestScale = Math.min(scaleX, scaleY, 1.35);
      const clampedScale = Math.max(0.15, +bestScale.toFixed(3));

      const panX = Math.round((w - targetDims.width * clampedScale) / 2);
      const panY = Math.round((h - targetDims.height * clampedScale) / 2);

      const nextState = {
        zoom: clampedScale,
        pan: { x: panX, y: panY },
      };
      syncStageTransform(nextState.pan, nextState.zoom);
      setViewport(nextState);
    },
    [dimensions, viewportRef, syncStageTransform]
  );

  // Auto-fit to screen on initial mount once viewport size is known
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (hasInitializedRef.current) return;
    const viewportEl = viewportRef?.current;
    if (viewportEl && viewportEl.clientWidth > 0 && viewportEl.clientHeight > 0) {
      hasInitializedRef.current = true;
      fitToScreen();
    }
  }, [fitToScreen, viewportRef]);

  /**
   * Smart focal-point zoom:
   * 1. If cursor is OVER the map canvas, zoom into the exact point under cursor (point doesn't move).
   * 2. If cursor is OUTSIDE the map canvas, zoom symmetrically relative to the map canvas center.
   * 3. When the map canvas fits within the viewport, keep it centered so it never drifts into empty space.
   */
  const zoomTo = useCallback(
    (
      targetZoomOrFn: number | ((prevZoom: number) => number),
      focalClientPoint?: { clientX: number; clientY: number }
    ) => {
      setViewport((prev) => {
        const viewportEl = viewportRef?.current;
        const currentZoom = prev.zoom;
        const currentPan = prev.pan;

        const viewW = viewportEl ? viewportEl.clientWidth : 1400;
        const viewH = viewportEl ? viewportEl.clientHeight : 900;

        const fitScale = Math.min((viewW - 40) / dimensions.width, (viewH - 40) / dimensions.height);
        const minAllowedZoom = Math.max(0.08, +(fitScale * 0.65).toFixed(3));
        const maxAllowedZoom = 6.0;

        const rawTarget =
          typeof targetZoomOrFn === 'function' ? targetZoomOrFn(currentZoom) : targetZoomOrFn;
        const newZoom = Math.max(minAllowedZoom, Math.min(maxAllowedZoom, +rawTarget.toFixed(3)));

        if (Math.abs(newZoom - currentZoom) < 0.001) return prev;

        const zoomRatio = newZoom / currentZoom;
        const curMapW = dimensions.width * currentZoom;
        const curMapH = dimensions.height * currentZoom;
        const newMapW = dimensions.width * newZoom;
        const newMapH = dimensions.height * newZoom;

        let focalX: number;
        let focalY: number;

        if (focalClientPoint && viewportEl) {
          const rect = viewportEl.getBoundingClientRect();
          const mouseX = focalClientPoint.clientX - rect.left;
          const mouseY = focalClientPoint.clientY - rect.top;

          const isOverMap =
            mouseX >= currentPan.x &&
            mouseX <= currentPan.x + curMapW &&
            mouseY >= currentPan.y &&
            mouseY <= currentPan.y + curMapH;

          if (isOverMap) {
            focalX = mouseX;
            focalY = mouseY;
          } else {
            focalX = currentPan.x + curMapW / 2;
            focalY = currentPan.y + curMapH / 2;
          }
        } else {
          focalX = viewW / 2;
          focalY = viewH / 2;
        }

        let nextPanX = focalX - (focalX - currentPan.x) * zoomRatio;
        let nextPanY = focalY - (focalY - currentPan.y) * zoomRatio;

        if (newMapW <= viewW) {
          nextPanX = Math.round((viewW - newMapW) / 2);
        }
        if (newMapH <= viewH) {
          nextPanY = Math.round((viewH - newMapH) / 2);
        }

        const nextPan = {
          x: +nextPanX.toFixed(1),
          y: +nextPanY.toFixed(1),
        };
        syncStageTransform(nextPan, newZoom);

        return {
          zoom: newZoom,
          pan: nextPan,
        };
      });
    },
    [dimensions.width, dimensions.height, viewportRef, syncStageTransform]
  );

  const zoomIn = useCallback(
    (focalClientPoint?: { clientX: number; clientY: number }) => {
      zoomTo((z) => Math.min(6.0, +(z * 1.25).toFixed(2)), focalClientPoint);
    },
    [zoomTo]
  );

  const zoomOut = useCallback(
    (focalClientPoint?: { clientX: number; clientY: number }) => {
      zoomTo((z) => Math.max(0.1, +(z / 1.25).toFixed(2)), focalClientPoint);
    },
    [zoomTo]
  );

  const handleWheelZoom = useCallback(
    (e: WheelEvent | React.WheelEvent) => {
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 30;
      if (e.deltaMode === 2) delta *= 300;

      const isTrackpadPinch = e.ctrlKey;
      let zoomFactor: number;

      if (isTrackpadPinch) {
        zoomFactor = Math.exp(-delta * 0.012);
      } else {
        const clampedDelta = Math.sign(delta) * Math.min(Math.abs(delta) * 0.0018, 0.22);
        zoomFactor = Math.exp(-clampedDelta);
      }

      zoomTo(
        (currentZoom) => +(currentZoom * zoomFactor).toFixed(3),
        { clientX: e.clientX, clientY: e.clientY }
      );
    },
    [zoomTo]
  );

  // Attach native non-passive wheel listener to viewport element
  useEffect(() => {
    const el = viewportRef?.current;
    if (!el) return;

    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (onModifierWheel && (e.altKey || e.shiftKey)) {
        const handled = onModifierWheel(e);
        if (handled) return;
      }
      handleWheelZoom(e);
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [viewportRef, handleWheelZoom, onModifierWheel]);

  const resetZoom = useCallback(() => {
    fitToScreen();
  }, [fitToScreen]);

  const setZoom = useCallback(
    (newZoomOrFn: number | ((prev: number) => number)) => {
      zoomTo(newZoomOrFn);
    },
    [zoomTo]
  );

  const setPan = useCallback(
    (
      newPanOrFn:
        | { x: number; y: number }
        | ((prev: { x: number; y: number }) => { x: number; y: number })
    ) => {
      setViewport((prev) => {
        const nextPan =
          typeof newPanOrFn === 'function' ? newPanOrFn(prev.pan) : newPanOrFn;
        syncStageTransform(nextPan, prev.zoom);
        return { ...prev, pan: nextPan };
      });
    },
    [syncStageTransform]
  );

  return {
    zoom,
    setZoom,
    pan,
    setPan,
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    cursorPos,
    setCursorPos,
    isSpacePressed,
    getCanvasCoords,
    zoomTo,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
    handleWheelZoom,
  };
}
