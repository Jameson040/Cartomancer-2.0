import React, { useState, useCallback } from 'react';
import { CanvasDimensions } from '../types';

interface UseViewportProps {
  dimensions: CanvasDimensions;
  mainCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useViewport({ dimensions, mainCanvasRef }: UseViewportProps) {
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });

  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLElement>): { x: number; y: number } => {
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

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(4.0, +(z + 0.15).toFixed(2)));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.2, +(z - 0.15).toFixed(2)));
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1.0);
    setPan({ x: 40, y: 30 });
  }, []);

  const fitToScreen = useCallback((containerWidth?: number, containerHeight?: number) => {
    if (!containerWidth || !containerHeight) {
      setZoom(0.85);
      setPan({ x: 20, y: 20 });
      return;
    }
    const scaleX = (containerWidth - 80) / dimensions.width;
    const scaleY = (containerHeight - 80) / dimensions.height;
    const bestScale = Math.min(scaleX, scaleY, 1.2);
    setZoom(+bestScale.toFixed(2));
    setPan({
      x: Math.round((containerWidth - dimensions.width * bestScale) / 2),
      y: Math.round((containerHeight - dimensions.height * bestScale) / 2),
    });
  }, [dimensions]);

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
    getCanvasCoords,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToScreen,
  };
}
