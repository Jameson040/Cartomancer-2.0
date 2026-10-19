import React, { useState } from 'react';
import {
  PlacedStamp,
  PlacedTerritory,
  PlacedText,
  PlacedPath,
  StampBlendMode,
} from '../types';
import {
  FlipHorizontal,
  FlipVertical,
  ArrowUpToLine,
  ArrowDownToLine,
  Lock,
  Unlock,
  Copy,
  Trash2,
  Sliders,
  Group,
  Ungroup,
  ClipboardCopy,
  ClipboardPaste,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

interface CanvasContextBarProps {
  zoom: number;
  pan: { x: number; y: number };
  selectedStamp: PlacedStamp | null;
  selectedStampIds: string[];
  selectedTerritory: PlacedTerritory | null;
  selectedLabel: PlacedText | null;
  selectedPath: PlacedPath | null;
  hasStyleClipboard: boolean;
  onUpdateSelectedStamp: (updates: Partial<PlacedStamp>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  onToggleLockStamp: () => void;
  onGroupStamps: () => void;
  onUngroupStamps: () => void;
  onCopyStampStyle: () => void;
  onPasteStampStyle: () => void;
  onUpdateSelectedTerritory?: (updates: Partial<PlacedTerritory>) => void;
}

export const CanvasContextBar: React.FC<CanvasContextBarProps> = ({
  zoom,
  pan,
  selectedStamp,
  selectedStampIds,
  selectedTerritory,
  selectedLabel,
  selectedPath,
  hasStyleClipboard,
  onUpdateSelectedStamp,
  onDeleteSelected,
  onDuplicateSelected,
  onBringToFront,
  onSendToBack,
  onToggleLockStamp,
  onGroupStamps,
  onUngroupStamps,
  onCopyStampStyle,
  onPasteStampStyle,
  onUpdateSelectedTerritory,
}) => {
  const [showGradingPopover, setShowGradingPopover] = useState(false);

  // Determine anchor position in world coordinates
  let anchorX: number | null = null;
  let anchorY: number | null = null;

  if (selectedStamp) {
    anchorX = selectedStamp.x;
    anchorY = selectedStamp.y - Math.max(48, 70 * (selectedStamp.scale || 1));
  } else if (selectedTerritory && selectedTerritory.points.length > 0) {
    const minY = Math.min(...selectedTerritory.points.map((p) => p.y));
    const avgX =
      selectedTerritory.points.reduce((s, p) => s + p.x, 0) / selectedTerritory.points.length;
    anchorX = avgX;
    anchorY = minY - 24;
  } else if (selectedLabel) {
    anchorX = selectedLabel.x;
    anchorY = selectedLabel.y - 36;
  } else if (selectedPath && selectedPath.points.length > 0) {
    const mid = selectedPath.points[Math.floor(selectedPath.points.length / 2)];
    anchorX = mid.x;
    anchorY = mid.y - 28;
  }

  if (anchorX === null || anchorY === null) return null;

  const screenX = Math.max(220, Math.min(window.innerWidth - 280, pan.x + anchorX * zoom));
  const screenY = Math.max(16, pan.y + anchorY * zoom - 44);

  const isLocked = Boolean(selectedStamp?.locked || selectedTerritory?.locked);
  const isGrouped = Boolean(selectedStamp?.groupId);

  return (
    <div
      id="floating-canvas-context-bar"
      style={{
        transform: `translate3d(${Math.round(screenX)}px, ${Math.round(screenY)}px, 0) translateX(-50%)`,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="fixed top-14 left-0 z-40 flex flex-col items-center gap-1.5 pointer-events-auto select-none"
    >
      <div className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700/90 shadow-2xl text-slate-100">
        {selectedStamp && (
          <>
            {/* Quick Scale - / + */}
            <button
              id="ctx-bar-scale-down"
              type="button"
              disabled={isLocked}
              onClick={() =>
                onUpdateSelectedStamp({
                  scale: Math.max(0.15, Number(((selectedStamp.scale || 1) * 0.9).toFixed(2))),
                })
              }
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer transition-colors"
              title="Scale Down (-10% or Alt+Wheel)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono tabular-nums text-amber-300 px-1">
              {Math.round((selectedStamp.scale || 1) * 100)}%
            </span>
            <button
              id="ctx-bar-scale-up"
              type="button"
              disabled={isLocked}
              onClick={() =>
                onUpdateSelectedStamp({
                  scale: Math.min(8, Number(((selectedStamp.scale || 1) * 1.1).toFixed(2))),
                })
              }
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer transition-colors"
              title="Scale Up (+10% or Alt+Wheel)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* Quick Rotate */}
            <button
              id="ctx-bar-rot-ccw"
              type="button"
              disabled={isLocked}
              onClick={() =>
                onUpdateSelectedStamp({ rotation: ((selectedStamp.rotation || 0) - 15 + 360) % 360 })
              }
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer transition-colors"
              title="Rotate -15° (or Shift+Wheel)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              id="ctx-bar-rot-cw"
              type="button"
              disabled={isLocked}
              onClick={() =>
                onUpdateSelectedStamp({ rotation: ((selectedStamp.rotation || 0) + 15) % 360 })
              }
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer transition-colors"
              title="Rotate +15° (or Shift+Wheel)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>

            {/* Quick Flip X / Y */}
            <button
              id="ctx-bar-flip-x"
              type="button"
              disabled={isLocked}
              onClick={() => onUpdateSelectedStamp({ flipX: !selectedStamp.flipX })}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-40 ${
                selectedStamp.flipX
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Flip Horizontal (Mirror X)"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </button>
            <button
              id="ctx-bar-flip-y"
              type="button"
              disabled={isLocked}
              onClick={() => onUpdateSelectedStamp({ flipY: !selectedStamp.flipY })}
              className={`p-1.5 rounded-lg cursor-pointer transition-colors disabled:opacity-40 ${
                selectedStamp.flipY
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'hover:bg-slate-800 text-slate-300 hover:text-white'
              }`}
              title="Flip Vertical (Mirror Y)"
            >
              <FlipVertical className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* Z-Order Front / Back */}
            <button
              id="ctx-bar-bring-front"
              type="button"
              onClick={onBringToFront}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Bring to Front"
            >
              <ArrowUpToLine className="w-3.5 h-3.5" />
            </button>
            <button
              id="ctx-bar-send-back"
              type="button"
              onClick={onSendToBack}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Send to Back"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-0.5" />

            {/* HSBC Color Grading & Blending Popover Trigger */}
            <button
              id="ctx-bar-grading-popover"
              type="button"
              onClick={() => setShowGradingPopover((v) => !v)}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                showGradingPopover
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
              }`}
              title="Color Grading (HSBC), Drop Shadow & Blend Mode"
            >
              <Sliders className="w-3 h-3" />
              <span>Blend</span>
            </button>

            {/* Copy / Paste Style */}
            <button
              id="ctx-bar-copy-style"
              type="button"
              onClick={onCopyStampStyle}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
              title="Copy Stamp Visual Style (HSBC, Scale, Shadow, Blend)"
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
            </button>
            {hasStyleClipboard && (
              <button
                id="ctx-bar-paste-style"
                type="button"
                disabled={isLocked}
                onClick={onPasteStampStyle}
                className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 cursor-pointer transition-colors"
                title="Paste Copied Stamp Style"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Group / Ungroup */}
            {selectedStampIds.length > 1 && (
              <button
                id="ctx-bar-group"
                type="button"
                onClick={onGroupStamps}
                className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Group Selected Stamps"
              >
                <Group className="w-3 h-3" />
                <span>Group</span>
              </button>
            )}
            {isGrouped && (
              <button
                id="ctx-bar-ungroup"
                type="button"
                onClick={onUngroupStamps}
                className="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                title="Ungroup Stamps"
              >
                <Ungroup className="w-3 h-3" />
                <span>Ungroup</span>
              </button>
            )}
          </>
        )}

        {/* Lock / Unlock */}
        {(selectedStamp || selectedTerritory) && (
          <button
            id="ctx-bar-lock-toggle"
            type="button"
            onClick={() => {
              if (selectedStamp) onToggleLockStamp();
              else if (selectedTerritory && onUpdateSelectedTerritory) {
                onUpdateSelectedTerritory({ locked: !selectedTerritory.locked });
              }
            }}
            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
              isLocked
                ? 'bg-red-500/25 text-red-300 hover:bg-red-500/35'
                : 'hover:bg-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isLocked ? 'Unlock Object' : 'Lock Object Position'}
          >
            {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Duplicate & Delete */}
        {(selectedStamp || selectedTerritory || selectedLabel) && (
          <button
            id="ctx-bar-duplicate"
            type="button"
            onClick={onDuplicateSelected}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          id="ctx-bar-delete"
          type="button"
          disabled={isLocked}
          onClick={onDeleteSelected}
          className="p-1.5 rounded-lg hover:bg-red-500/25 text-red-400 hover:text-red-300 disabled:opacity-40 cursor-pointer transition-colors"
          title="Delete Selected"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline HSBC Color Grading, Drop Shadow & Blend Mode Popover */}
      {showGradingPopover && selectedStamp && (
        <div className="w-68 p-3 rounded-xl bg-slate-900/95 backdrop-blur-md border border-slate-700 shadow-2xl text-slate-100 text-[11px] flex flex-col gap-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-amber-300">Visual Blending & Grading</span>
            <button
              type="button"
              onClick={() =>
                onUpdateSelectedStamp({
                  hue: 0,
                  saturation: 100,
                  brightness: 100,
                  contrast: 100,
                  blendMode: 'source-over',
                })
              }
              className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Hue */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span className="text-slate-300">Hue Shift</span>
              <span className="font-mono tabular-nums text-amber-300">{selectedStamp.hue ?? 0}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={selectedStamp.hue ?? 0}
              onChange={(e) => onUpdateSelectedStamp({ hue: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Saturation */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span className="text-slate-300">Saturation</span>
              <span className="font-mono tabular-nums text-amber-300">
                {selectedStamp.saturation ?? 100}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={selectedStamp.saturation ?? 100}
              onChange={(e) => onUpdateSelectedStamp({ saturation: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Brightness */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span className="text-slate-300">Brightness</span>
              <span className="font-mono tabular-nums text-amber-300">
                {selectedStamp.brightness ?? 100}%
              </span>
            </div>
            <input
              type="range"
              min="25"
              max="180"
              step="5"
              value={selectedStamp.brightness ?? 100}
              onChange={(e) => onUpdateSelectedStamp({ brightness: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Contrast */}
          <div className="flex flex-col gap-0.5">
            <div className="flex justify-between">
              <span className="text-slate-300">Contrast</span>
              <span className="font-mono tabular-nums text-amber-300">
                {selectedStamp.contrast ?? 100}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="180"
              step="5"
              value={selectedStamp.contrast ?? 100}
              onChange={(e) => onUpdateSelectedStamp({ contrast: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Blend Mode */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <span className="text-slate-300">Blend Mode</span>
            <select
              value={selectedStamp.blendMode || 'source-over'}
              onChange={(e) =>
                onUpdateSelectedStamp({ blendMode: e.target.value as StampBlendMode })
              }
              className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-[11px] text-slate-100 cursor-pointer"
            >
              <option value="source-over">Normal</option>
              <option value="multiply">Multiply</option>
              <option value="overlay">Overlay</option>
              <option value="soft-light">Soft Light</option>
              <option value="screen">Screen</option>
            </select>
          </div>

          {/* Ground Shadow & Occlusion */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-800">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={selectedStamp.shadow?.enabled ?? true}
                onChange={(e) =>
                  onUpdateSelectedStamp({
                    shadow: {
                      enabled: e.target.checked,
                      blur: selectedStamp.shadow?.blur ?? 6,
                      offsetX: selectedStamp.shadow?.offsetX ?? 3,
                      offsetY: selectedStamp.shadow?.offsetY ?? 4,
                      opacity: selectedStamp.shadow?.opacity ?? 0.35,
                      groundOcclusion: selectedStamp.shadow?.groundOcclusion ?? true,
                    },
                  })
                }
                className="accent-amber-500 rounded"
              />
              <span>Drop Shadow & Ground AO</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
