/**
 * Custom Domain Hook for Landmass Geometric Shapes and Freeform Polygon Sculpting.
 * Handles drag-to-size shapes (Circle, Rectangle, Triangle, Pentagon, Hexagon, Octagon, Star)
 * and click-to-plot multi-vertex Polygons for precise Landmass or Water sculpting.
 */

import { useState, useCallback, useMemo } from 'react';
import { LandmassShape, MaskMode } from '../types';
import {
  Point,
  LandmassShapeDraft,
  generateShapeVertices,
  applyLandmassShapeToMask,
  getPolygonSvgPath,
  applyFractalDisplacement,
} from '../utils/landmassShapes';

interface UseLandmassShapesReturn {
  activeShapeDraft: LandmassShapeDraft | null;
  polygonVertices: Point[];
  isDraftingShape: boolean;
  startShapeDrag: (
    startX: number,
    startY: number,
    shape: LandmassShape,
    mode: MaskMode,
    edgeStyle: 'crisp' | 'fractal',
    roughness: number
  ) => void;
  updateShapeDrag: (currentX: number, currentY: number) => void;
  commitShapeDrag: (
    maskCanvas: HTMLCanvasElement | null,
    elevationCanvas: HTMLCanvasElement | null,
    defaultRadius: number,
    onCommitHistory: (action: string) => void,
    onRedraw: () => void
  ) => boolean;
  cancelShapeDrag: () => void;
  addPolygonVertex: (
    x: number,
    y: number,
    mode: MaskMode,
    edgeStyle: 'crisp' | 'fractal',
    roughness: number,
    maskCanvas: HTMLCanvasElement | null,
    elevationCanvas: HTMLCanvasElement | null,
    onCommitHistory: (action: string) => void,
    onRedraw: () => void
  ) => boolean;
  removeLastPolygonVertex: () => void;
  commitPolygon: (
    mode: MaskMode,
    edgeStyle: 'crisp' | 'fractal',
    roughness: number,
    maskCanvas: HTMLCanvasElement | null,
    elevationCanvas: HTMLCanvasElement | null,
    onCommitHistory: (action: string) => void,
    onRedraw: () => void
  ) => boolean;
  cancelPolygon: () => void;
  placePresetShapeAt: (
    cx: number,
    cy: number,
    shape: LandmassShape,
    radius: number,
    mode: MaskMode,
    edgeStyle: 'crisp' | 'fractal',
    roughness: number,
    maskCanvas: HTMLCanvasElement | null,
    elevationCanvas: HTMLCanvasElement | null,
    onCommitHistory: (action: string) => void,
    onRedraw: () => void
  ) => void;
  activeDraftPoints: Point[];
  activeDraftSvgPath: string;
  polygonSvgPath: string;
}

export function useLandmassShapes(): UseLandmassShapesReturn {
  const [activeShapeDraft, setActiveShapeDraft] = useState<LandmassShapeDraft | null>(null);
  const [polygonVertices, setPolygonVertices] = useState<Point[]>([]);

  const isDraftingShape = activeShapeDraft !== null || polygonVertices.length > 0;

  const startShapeDrag = useCallback(
    (
      startX: number,
      startY: number,
      shape: LandmassShape,
      mode: MaskMode,
      edgeStyle: 'crisp' | 'fractal',
      roughness: number
    ) => {
      if (shape === 'brush' || shape === 'polygon') return;
      setActiveShapeDraft({
        shape,
        mode,
        startX,
        startY,
        currentX: startX,
        currentY: startY,
        edgeStyle,
        roughness,
      });
    },
    []
  );

  const updateShapeDrag = useCallback((currentX: number, currentY: number) => {
    setActiveShapeDraft((prev) => (prev ? { ...prev, currentX, currentY } : null));
  }, []);

  const commitShapeDrag = useCallback(
    (
      maskCanvas: HTMLCanvasElement | null,
      elevationCanvas: HTMLCanvasElement | null,
      defaultRadius: number,
      onCommitHistory: (action: string) => void,
      onRedraw: () => void
    ): boolean => {
      if (!activeShapeDraft || !maskCanvas) {
        setActiveShapeDraft(null);
        return false;
      }

      const { shape, mode, startX, startY, currentX, currentY, edgeStyle, roughness } =
        activeShapeDraft;
      let dx = currentX - startX;
      let dy = currentY - startY;
      let dist = Math.hypot(dx, dy);

      // If user simply clicked without dragging, use the default radius from brush/shape size
      let cx = startX;
      let cy = startY;
      let rx = dist;
      let ry = dist;
      let rotation = 0;

      if (dist < 5) {
        rx = Math.max(25, defaultRadius);
        ry = Math.max(25, defaultRadius);
      } else {
        rotation = Math.atan2(dy, dx);
        if (shape === 'rectangle') {
          // Bounding box style
          rx = Math.abs(dx);
          ry = Math.abs(dy);
          cx = (startX + currentX) / 2;
          cy = (startY + currentY) / 2;
          rotation = 0;
        }
      }

      const rawPoints = generateShapeVertices(shape, cx, cy, rx, ry, rotation);
      if (rawPoints.length >= 3) {
        applyLandmassShapeToMask({
          maskCanvas,
          elevationCanvas,
          points: rawPoints,
          mode,
          edgeStyle,
          roughness,
        });

        const shapeName = shape.charAt(0).toUpperCase() + shape.slice(1);
        const actionLabel =
          mode === 'add_land' ? `Add ${shapeName} Landmass` : `Carve ${shapeName} Water`;
        onCommitHistory(actionLabel);
        onRedraw();
      }

      setActiveShapeDraft(null);
      return true;
    },
    [activeShapeDraft]
  );

  const cancelShapeDrag = useCallback(() => {
    setActiveShapeDraft(null);
  }, []);

  const addPolygonVertex = useCallback(
    (
      x: number,
      y: number,
      mode: MaskMode,
      edgeStyle: 'crisp' | 'fractal',
      roughness: number,
      maskCanvas: HTMLCanvasElement | null,
      elevationCanvas: HTMLCanvasElement | null,
      onCommitHistory: (action: string) => void,
      onRedraw: () => void
    ): boolean => {
      // If clicking near first vertex and we have at least 3 points, auto-commit
      if (polygonVertices.length >= 3) {
        const first = polygonVertices[0];
        if (Math.hypot(x - first.x, y - first.y) <= 16) {
          if (maskCanvas) {
            applyLandmassShapeToMask({
              maskCanvas,
              elevationCanvas,
              points: polygonVertices,
              mode,
              edgeStyle,
              roughness,
            });
            const actionLabel =
              mode === 'add_land' ? 'Add Landmass Polygon' : 'Carve Water Polygon';
            onCommitHistory(actionLabel);
            onRedraw();
          }
          setPolygonVertices([]);
          return true;
        }
      }

      setPolygonVertices((prev) => [...prev, { x: Math.round(x), y: Math.round(y) }]);
      return false;
    },
    [polygonVertices]
  );

  const removeLastPolygonVertex = useCallback(() => {
    setPolygonVertices((prev) => prev.slice(0, -1));
  }, []);

  const commitPolygon = useCallback(
    (
      mode: MaskMode,
      edgeStyle: 'crisp' | 'fractal',
      roughness: number,
      maskCanvas: HTMLCanvasElement | null,
      elevationCanvas: HTMLCanvasElement | null,
      onCommitHistory: (action: string) => void,
      onRedraw: () => void
    ): boolean => {
      if (polygonVertices.length < 3 || !maskCanvas) return false;

      applyLandmassShapeToMask({
        maskCanvas,
        elevationCanvas,
        points: polygonVertices,
        mode,
        edgeStyle,
        roughness,
      });

      const actionLabel =
        mode === 'add_land' ? 'Add Landmass Polygon' : 'Carve Water Polygon';
      onCommitHistory(actionLabel);
      onRedraw();
      setPolygonVertices([]);
      return true;
    },
    [polygonVertices]
  );

  const cancelPolygon = useCallback(() => {
    setPolygonVertices([]);
  }, []);

  const placePresetShapeAt = useCallback(
    (
      cx: number,
      cy: number,
      shape: LandmassShape,
      radius: number,
      mode: MaskMode,
      edgeStyle: 'crisp' | 'fractal',
      roughness: number,
      maskCanvas: HTMLCanvasElement | null,
      elevationCanvas: HTMLCanvasElement | null,
      onCommitHistory: (action: string) => void,
      onRedraw: () => void
    ) => {
      if (!maskCanvas) return;
      const rawPoints = generateShapeVertices(shape, cx, cy, radius, radius, 0);
      if (rawPoints.length >= 3) {
        applyLandmassShapeToMask({
          maskCanvas,
          elevationCanvas,
          points: rawPoints,
          mode,
          edgeStyle,
          roughness,
        });
        const shapeName = shape.charAt(0).toUpperCase() + shape.slice(1);
        const actionLabel =
          mode === 'add_land' ? `Add ${shapeName} Landmass` : `Carve ${shapeName} Water`;
        onCommitHistory(actionLabel);
        onRedraw();
      }
    },
    []
  );

  // Compute live SVG points for preview rendering
  const activeDraftPoints = useMemo<Point[]>(() => {
    if (!activeShapeDraft) return [];
    const { shape, startX, startY, currentX, currentY, edgeStyle, roughness } = activeShapeDraft;
    let dx = currentX - startX;
    let dy = currentY - startY;
    let dist = Math.hypot(dx, dy);

    let cx = startX;
    let cy = startY;
    let rx = dist;
    let ry = dist;
    let rotation = 0;

    if (dist < 5) {
      rx = 60;
      ry = 60;
    } else {
      rotation = Math.atan2(dy, dx);
      if (shape === 'rectangle') {
        rx = Math.abs(dx);
        ry = Math.abs(dy);
        cx = (startX + currentX) / 2;
        cy = (startY + currentY) / 2;
        rotation = 0;
      }
    }

    const raw = generateShapeVertices(shape, cx, cy, rx, ry, rotation);
    if (edgeStyle === 'fractal' && roughness > 0.05) {
      return applyFractalDisplacement(raw, roughness);
    }
    return raw;
  }, [activeShapeDraft]);

  const activeDraftSvgPath = useMemo(() => {
    return getPolygonSvgPath(activeDraftPoints);
  }, [activeDraftPoints]);

  const polygonSvgPath = useMemo(() => {
    if (polygonVertices.length < 2) return '';
    return `M ${polygonVertices.map((p) => `${p.x},${p.y}`).join(' L ')}`;
  }, [polygonVertices]);

  return {
    activeShapeDraft,
    polygonVertices,
    isDraftingShape,
    startShapeDrag,
    updateShapeDrag,
    commitShapeDrag,
    cancelShapeDrag,
    addPolygonVertex,
    removeLastPolygonVertex,
    commitPolygon,
    cancelPolygon,
    placePresetShapeAt,
    activeDraftPoints,
    activeDraftSvgPath,
    polygonSvgPath,
  };
}
