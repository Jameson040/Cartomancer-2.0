import { useEffect } from 'react';
import { ToolType } from '../types';

interface UseKeyboardShortcutsProps {
  setActiveTool: (tool: ToolType) => void;
  setIsAssetOutlinerOpen: (fn: (prev: boolean) => boolean) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  handleSaveJson: () => void;
  handleLoadJson: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  onFlipSelectedX?: () => void;
  onFlipSelectedY?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  onFitToScreen?: () => void;
  onNudgeSelection?: (dx: number, dy: number, recordHistory: boolean) => void;
}

export function useKeyboardShortcuts({
  setActiveTool,
  setIsAssetOutlinerOpen,
  handleUndo,
  handleRedo,
  handleSaveJson,
  handleLoadJson,
  onDeleteSelected,
  onClearSelection,
  onFlipSelectedX,
  onFlipSelectedY,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  onNudgeSelection,
}: UseKeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept typing in input fields or textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      // Zoom hotkeys: Ctrl/Cmd + (+ / - / 0)
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          onZoomIn?.();
          return;
        }
        if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          onZoomOut?.();
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          if (e.shiftKey) {
            onFitToScreen?.();
          } else {
            onResetZoom?.();
          }
          return;
        }
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Save / Open
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveJson();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleLoadJson();
        return;
      }

      // Single-key shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('select');
          break;
        case 'm':
          setActiveTool('mask');
          break;
        case 'b':
          setActiveTool('brush');
          break;
        case 'e':
          setActiveTool('elevation');
          break;
        case 's':
          setActiveTool('stamp');
          break;
        case 'p':
          setActiveTool('path');
          break;
        case 't':
          setActiveTool('text');
          break;
        case 'g':
          setActiveTool('grid');
          break;
        case 'x':
          setActiveTool('eraser');
          break;
        case 'l':
          setIsAssetOutlinerOpen((prev) => !prev);
          break;
        case 'h':
          if (e.shiftKey) {
            onFlipSelectedY?.();
          } else {
            onFlipSelectedX?.();
          }
          break;
        case 'arrowleft':
        case 'arrowright':
        case 'arrowup':
        case 'arrowdown': {
          if (onNudgeSelection) {
            e.preventDefault();
            const step = e.shiftKey ? 10 : 1;
            const dx = e.key.toLowerCase() === 'arrowleft' ? -step : e.key.toLowerCase() === 'arrowright' ? step : 0;
            const dy = e.key.toLowerCase() === 'arrowup' ? -step : e.key.toLowerCase() === 'arrowdown' ? step : 0;
            onNudgeSelection(dx, dy, !e.repeat);
          }
          break;
        }
        case 'delete':
        case 'backspace':
          onDeleteSelected();
          break;
        case 'escape':
          onClearSelection();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleUndo,
    handleRedo,
    handleSaveJson,
    handleLoadJson,
    onDeleteSelected,
    onClearSelection,
    onFlipSelectedX,
    onFlipSelectedY,
    setActiveTool,
    setIsAssetOutlinerOpen,
    onNudgeSelection,
  ]);
}
