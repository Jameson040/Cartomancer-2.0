import React from 'react';
import {
  ArrowUpToLine,
  ArrowDownToLine,
  Copy,
  Trash2,
  Lock,
  Unlock,
  Group,
  Ungroup,
  ClipboardCopy,
  ClipboardPaste,
  FlipHorizontal,
  Maximize2,
} from 'lucide-react';

interface CanvasContextMenuProps {
  position: { x: number; y: number } | null;
  hasSelection: boolean;
  isStampSelected: boolean;
  isMultiStampSelected: boolean;
  isGrouped: boolean;
  isLocked: boolean;
  hasStyleClipboard: boolean;
  onClose: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onFlipX: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onToggleLock: () => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onFitToScreen: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({
  position,
  hasSelection,
  isStampSelected,
  isMultiStampSelected,
  isGrouped,
  isLocked,
  hasStyleClipboard,
  onClose,
  onBringToFront,
  onSendToBack,
  onFlipX,
  onGroup,
  onUngroup,
  onToggleLock,
  onCopyStyle,
  onPasteStyle,
  onDuplicate,
  onDelete,
  onFitToScreen,
}) => {
  if (!position) return null;

  const menuX = Math.min(window.innerWidth - 220, Math.max(12, position.x));
  const menuY = Math.min(window.innerHeight - 320, Math.max(12, position.y));

  const runAction = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <div
      id="canvas-right-click-menu"
      style={{ transform: `translate3d(${menuX}px, ${menuY}px, 0)` }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed top-0 left-0 z-50 w-52 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl text-slate-100 text-xs select-none"
    >
      {hasSelection ? (
        <>
          {isStampSelected && (
            <>
              <button
                type="button"
                onClick={() => runAction(onBringToFront)}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ArrowUpToLine className="w-3.5 h-3.5 text-amber-400" />
                  Bring to Front
                </span>
                <span className="text-[10px] text-slate-400 font-mono">]</span>
              </button>
              <button
                type="button"
                onClick={() => runAction(onSendToBack)}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <ArrowDownToLine className="w-3.5 h-3.5 text-slate-400" />
                  Send to Back
                </span>
                <span className="text-[10px] text-slate-400 font-mono">[</span>
              </button>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => runAction(onFlipX)}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center justify-between text-left disabled:opacity-40 cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <FlipHorizontal className="w-3.5 h-3.5 text-sky-400" />
                  Flip Horizontal
                </span>
                <span className="text-[10px] text-slate-400 font-mono">X</span>
              </button>

              <div className="my-1 border-t border-slate-800" />

              {isMultiStampSelected && (
                <button
                  type="button"
                  onClick={() => runAction(onGroup)}
                  className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left text-sky-300 cursor-pointer"
                >
                  <Group className="w-3.5 h-3.5" />
                  Group Selected Stamps
                </button>
              )}
              {isGrouped && (
                <button
                  type="button"
                  onClick={() => runAction(onUngroup)}
                  className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left text-amber-300 cursor-pointer"
                >
                  <Ungroup className="w-3.5 h-3.5" />
                  Ungroup Stamps
                </button>
              )}

              <button
                type="button"
                onClick={() => runAction(onCopyStyle)}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
              >
                <ClipboardCopy className="w-3.5 h-3.5 text-emerald-400" />
                Copy Visual Style
              </button>
              <button
                type="button"
                disabled={!hasStyleClipboard || isLocked}
                onClick={() => runAction(onPasteStyle)}
                className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left disabled:opacity-40 cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400" />
                Paste Visual Style
              </button>

              <div className="my-1 border-t border-slate-800" />
            </>
          )}

          <button
            type="button"
            onClick={() => runAction(onToggleLock)}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
          >
            {isLocked ? (
              <>
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Unlock Object</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Lock Position</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => runAction(onDuplicate)}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-slate-300" />
            Duplicate
          </button>

          <button
            type="button"
            disabled={isLocked}
            onClick={() => runAction(onDelete)}
            className="w-full px-3 py-1.5 hover:bg-red-500/20 text-red-400 flex items-center justify-between text-left disabled:opacity-40 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </span>
            <span className="text-[10px] font-mono">Del</span>
          </button>
        </>
      ) : (
        <>
          <div className="px-3 py-1 text-[10px] text-slate-400 font-semibold">Canvas Quick Actions</div>
          {hasStyleClipboard && (
            <div className="px-3 py-1 text-[10px] text-emerald-400">Style copied in clipboard</div>
          )}
          <button
            type="button"
            onClick={() => runAction(onFitToScreen)}
            className="w-full px-3 py-1.5 hover:bg-slate-800 flex items-center gap-2 text-left cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            Fit Map to Screen
          </button>
        </>
      )}
    </div>
  );
};
