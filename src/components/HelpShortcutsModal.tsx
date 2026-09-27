/**
 * Cartomancer Fantasy Map Maker - Keyboard Shortcuts & User Guide Modal
 */

import React from 'react';
import { X, Keyboard, BookOpen, Compass, Layers, Sparkles } from 'lucide-react';

interface HelpShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpShortcutsModal: React.FC<HelpShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Select & Move placed stamps, paths, or labels' },
    { key: 'M', desc: 'Landmass Sculptor (Add Land / Carve Ocean)' },
    { key: 'B', desc: 'Biome Texture Brush (Paint meadows, snow, sand, etc.)' },
    { key: 'E', desc: 'Elevation Sculptor (Contour heights & relief shading)' },
    { key: 'S', desc: 'Stamp Placement & Scatter Brush' },
    { key: 'P', desc: 'Path & River Pen (Draw rivers, roads, and borders)' },
    { key: 'T', desc: 'Text & Label Callouts (Fantasy typography)' },
    { key: 'G', desc: 'Map Tactical Grid (Square, Hex, Isometric)' },
    { key: 'X', desc: 'Eraser Tool' },
    { key: 'Ctrl + Z', desc: 'Undo last action' },
    { key: 'Ctrl + Y', desc: 'Redo last action' },
    { key: 'Ctrl + S', desc: 'Save map project to disk (.cartomancer.json)' },
    { key: 'Ctrl + O', desc: 'Open and load saved map project' },
    { key: 'Space + Drag', desc: 'Pan canvas smoothly across the world map' },
    { key: 'Scroll Wheel', desc: 'Focal Zoom (stays locked right under your mouse cursor)' },
    { key: 'Ctrl + / -', desc: 'Zoom In / Zoom Out' },
    { key: 'Ctrl + 0', desc: 'Reset Zoom (Shift+0 to Fit Map to Screen)' },
    { key: 'Delete / Backspace', desc: 'Delete currently selected stamp or text' },
  ];

  return (
    <div
      id="help-shortcuts-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none"
    >
      <div
        id="help-shortcuts-modal"
        className="bg-[#FDF6E3] border-2 border-[#E2D6B5] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden text-slate-800 flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#00BBF9]/15 border border-[#00BBF9]/40 flex items-center justify-center text-[#00BBF9]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Cinzel'] font-bold text-lg text-slate-800 tracking-wider">
                Cartographer's Codex & Shortcuts
              </h2>
              <p className="text-xs text-slate-600">
                Master the hotkeys and techniques for swift, immersive worldbuilding
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-6 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {shortcuts.map((sc) => (
              <div
                key={sc.key}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-[#E2D6B5] shadow-2xs"
              >
                <span className="text-xs text-slate-700 font-medium">{sc.desc}</span>
                <span className="bg-[#FF7E5F]/15 border border-[#FF7E5F]/30 text-[#D9480F] px-2 py-0.5 rounded font-mono text-xs font-bold whitespace-nowrap ml-2">
                  {sc.key}
                </span>
              </div>
            ))}
          </div>

          {/* Worldbuilding Pro Tips */}
          <div className="mt-2 p-4 rounded-xl bg-[#00BBF9]/10 border border-[#00BBF9]/30 text-xs text-slate-800 flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-[#0077B6]">
              <Sparkles className="w-4 h-4" />
              <span>Worldbuilding Pro Tips:</span>
            </div>
            <ul className="list-disc pl-5 space-y-1 text-slate-700 leading-relaxed">
              <li>
                <strong className="text-[#0077B6]">Scatter Brush:</strong> Switch the Stamp tool to "Scatter Brush" mode to swiftly paint dense mountain ranges or thick pine forests with automated scale and rotation variance!
              </li>
              <li>
                <strong className="text-[#0077B6]">Custom Assets:</strong> Click "Library" in the Stamp tool bar to upload your own custom trees, cities, and building blocks just like in Inkarnate!
              </li>
              <li>
                <strong className="text-[#0077B6]">Coastline Ripples:</strong> Adjust the Coastline Ripples setting in the Landmass Mask tool to create radiant, authentic sea foam lines along your shorelines.
              </li>
              <li>
                <strong className="text-[#0077B6]">Topography Mode:</strong> Click "Topography" in the top bar to inspect your map's elevation contour heatmap from deep sea trenches to alpine peaks.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:from-[#f86c4a] hover:to-[#fea360] text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
