import React, { useState, useCallback, useEffect, useRef } from 'react';
import { CanvasDimensions } from '../types';

interface UseViewportProps {
  dimensions: CanvasDimensions;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewportRef?: React.RefObject<HTMLDivElement | null>;
}

interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

export function useViewport({ dimensions, mainCanvasRef, viewportRef }: UseViewportProps) {
  // Unified viewport state for atomic zoom & pan synchronization
  const [viewport, setViewport] = useState<ViewportState>({
    zoom: 1.0,
    pan: { x: 40, y: 30 },
  });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  const zoom = viewport.zoom;
  const pan = viewport.pan;

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
    (containerWidth?: number, containerHeight?: number) => {
      const viewportEl = viewportRef?.current;
      const w = containerWidth || (viewportEl ? viewportEl.clientWidth : 0);
      const h = containerHeight || (viewportEl ? viewportEl.clientHeight : 0);
      if (!w || !h) {
        setViewport({
          zoom: 0.85,
          pan: { x: 30, y: 30 },
        });
        return;
      }
      const padX = 20;
      const padY = 20;
      const scaleX = (w - padX * 2) / dimensions.width;
      const scaleY = (h - padY * 2) / dimensions.height;
      const bestScale = Math.min(scaleX, scaleY, 1.25);
      const clampedScale = Math.max(0.4, +bestScale.toFixed(2));

      const panX = Math.round((w - dimensions.width * clampedScale) / 2);
      const panY = Math.round((h - dimensions.height * clampedScale) / 2);

      setViewport({
        zoom: clampedScale,
        pan: { x: panX, y: panY },
      });
    },
    [dimensions.width, dimensions.height, viewportRef]
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

        // Keep the map useful while zooming out: the minimum is the scale
        // that fits the full map with roughly 20px of breathing room.
        // Going smaller only turns the editable map into a tiny thumbnail.
        const fitScale = Math.min((viewW - 40) / dimensions.width, (viewH - 40) / dimensions.height);
        const minAllowedZoom = Math.max(0.1, +fitScale.toFixed(2));
        const maxAllowedZoom = 4.0;

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

          // Check if cursor is over the drawable map canvas
          const isOverMap =
            mouseX >= currentPan.x &&
            mouseX <= currentPan.x + curMapW &&
            mouseY >= currentPan.y &&
            mouseY <= currentPan.y + curMapH;

          if (isOverMap) {
            // Anchor to cursor position on the map
            focalX = mouseX;
            focalY = mouseY;
          } else {
            // Cursor is outside the map in the empty background!
            // Zoom symmetrically relative to the map canvas center so it doesn't wander
            focalX = currentPan.x + curMapW / 2;
            focalY = currentPan.y + curMapH / 2;
          }
        } else {
          // Centered zoom (e.g. from toolbar button)
          focalX = viewW / 2;
          focalY = viewH / 2;
        }

        // Standard affine focal zoom formula
        let nextPanX = focalX - (focalX - currentPan.x) * zoomRatio;
        let nextPanY = focalY - (focalY - currentPan.y) * zoomRatio;

        // Auto-center when the map is smaller than the viewport
        if (newMapW <= viewW) {
          nextPanX = Math.round((viewW - newMapW) / 2);
        }
        if (newMapH <= viewH) {
          nextPanY = Math.round((viewH - newMapH) / 2);
        }

        return {
          zoom: newZoom,
          pan: {
            x: +nextPanX.toFixed(1),
            y: +nextPanY.toFixed(1),
          },
        };
      });
    },
    [dimensions.width, dimensions.height, viewportRef]
  );

  const zoomIn = useCallback(
    (focalClientPoint?: { clientX: number; clientY: number }) => {
      zoomTo((z) => Math.min(4.0, +(z * 1.25).toFixed(2)), focalClientPoint);
    },
    [zoomTo]
  );

  const zoomOut = useCallback(
    (focalClientPoint?: { clientX: number; clientY: number }) => {
      zoomTo((z) => Math.max(0.35, +(z / 1.25).toFixed(2)), focalClientPoint);
    },
    [zoomTo]
  );

  const handleWheelZoom = useCallback(
    (e: WheelEvent | React.WheelEvent) => {
      let delta = e.deltaY;
      if (e.deltaMode === 1) delta *= 30; // lines mode
      if (e.deltaMode === 2) delta *= 300; // pages mode

      const isTrackpadPinch = e.ctrlKey;
      let zoomFactor: number;

      if (isTrackpadPinch) {
        zoomFactor = Math.exp(-delta * 0.012);
      } else {
        const clampedDelta = Math.sign(delta) * Math.min(Math.abs(delta) * 0.0018, 0.20);
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
      handleWheelZoom(e);
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onNativeWheel);
    };
  }, [viewportRef, handleWheelZoom]);

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
        return { ...prev, pan: nextPan };
      });
    },
    []
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
