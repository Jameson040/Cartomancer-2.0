/**
 * Cartomancer Fantasy Map Maker - Top Navigation & Action Bar
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Compass,
  Undo2,
  Redo2,
  Download,
  FolderOpen,
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HelpCircle,
  Sparkles,
  Mountain,
  Layers,
  Globe,
  Map as MapIcon,
  ChevronDown,
  FileUp,
  Palette,
  FilePlus,
  Castle,
  HardDrive,
  Clock,
  RefreshCw,
  CheckCircle2,
  FolderCheck,
} from 'lucide-react';

interface NavbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoCount: number;
  redoCount: number;
  onUndo: () => void;
  onRedo: () => void;
  zoom: number;
  onZoomChange: (newZoom: number) => void;
  onResetZoom: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitToScreen?: () => void;
  topographicalView: boolean;
  onToggleTopographicalView: () => void;
  onOpenTemplates: () => void;
  onOpenAssetOutliner?: () => void;
  assetCount?: number;
  onOpenMapImport?: () => void;
  onOpenShaderLab?: () => void;
  onOpenExport: () => void;
  onSaveJson: () => void;
  onLoadJson: () => void;
  onNewMap?: () => void;
  onOpenHelp: () => void;
  onToggleLayersPanel: () => void;
  isLayersPanelOpen: boolean;
  isAutosaveEnabled?: boolean;
  onToggleAutosave?: (enabled: boolean) => void;
  autosaveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  lastAutosaveTime?: number | null;
  fsaFolderName?: string | null;
  onLinkFsaFolder?: () => Promise<void>;
  onUnlinkFsaFolder?: () => void;
  onTriggerAutosave?: () => void;
  onRestoreAutosave?: () => void;
  hasRecoveryDraft?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  projectName,
  onProjectNameChange,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onUndo,
  onRedo,
  zoom,
  onZoomChange,
  onResetZoom,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  topographicalView,
  onToggleTopographicalView,
  onOpenTemplates,
  onOpenAssetOutliner,
  assetCount,
  onOpenMapImport,
  onOpenShaderLab,
  onOpenExport,
  onSaveJson,
  onLoadJson,
  onNewMap,
  onOpenHelp,
  onToggleLayersPanel,
  isLayersPanelOpen,
  isAutosaveEnabled = false,
  onToggleAutosave,
  autosaveStatus = 'idle',
  lastAutosaveTime = null,
  fsaFolderName = null,
  onLinkFsaFolder,
  onUnlinkFsaFolder,
  onTriggerAutosave,
  onRestoreAutosave,
  hasRecoveryDraft = false,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <header
      id="main-navbar"
      className="h-14 bg-[#FDF6E3] border-b-2 border-[#E2D6B5] shadow-xs px-3 sm:px-4 flex items-center justify-between z-30 select-none text-slate-800 gap-2 relative"
    >
      {/* Left: Brand, Map Name, & Master Dropdown */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink">
        {/* Brand */}
        <div className="flex items-center gap-1.5 pr-2 sm:pr-2.5 border-r border-[#E2D6B5] shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF7E5F] to-[#FEB47B] flex items-center justify-center shadow-md text-white shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <span className="font-['Cinzel'] font-bold text-base sm:text-lg tracking-wider text-slate-800 hidden sm:inline-block">
            Cartomancer
          </span>
        </div>

        {/* Project Name editable */}
        <div className="flex items-center gap-1.5 bg-white/90 px-2 sm:px-2.5 py-1 rounded-md border border-[#E2D6B5] focus-within:border-[#00BBF9] focus-within:ring-1 focus-within:ring-[#00BBF9]/30 transition-all shrink min-w-[70px]">
          <MapIcon className="w-3.5 h-3.5 text-[#FF7E5F] shrink-0" />
          <input
            id="project-name-input"
            type="text"
            value={projectName ?? ''}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-medium text-slate-800 focus:outline-none w-20 sm:w-28 md:w-36 tracking-wide truncate"
            placeholder="Name your realm..."
          />
        </div>

        {/* THE MASTER DROPDOWN: Map & Project Actions */}
        <div className="relative" ref={menuRef}>
          <button
            id="btn-map-menu-dropdown"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow-xs border cursor-pointer ${
              isMenuOpen
                ? 'bg-[#0077B6] text-white border-[#005B8E] shadow-sm ring-2 ring-[#0077B6]/30'
                : 'bg-white hover:bg-[#FAF3E0] text-slate-800 border-[#D5C69E] hover:border-[#0077B6]'
            }`}
            title="Open Map Menu: Import Map, Export, Save, Open, Studios, and Presets"
          >
            <FolderOpen className="w-4 h-4 text-amber-600 shrink-0" />
            <span className="font-bold">Map Menu</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* DROPDOWN POPOVER */}
          {isMenuOpen && (
            <div
              id="map-menu-popover"
              className="absolute left-0 mt-2 w-80 sm:w-96 max-h-[calc(100vh-4.5rem)] flex flex-col bg-[#FAF6EC] border-2 border-[#D5C69E] rounded-xl shadow-2xl z-50 text-slate-800 animate-in fade-in zoom-in-95 duration-150 overflow-hidden"
            >
              {/* Dropdown Header - Pinned at top */}
              <div className="px-4 py-2.5 bg-[#EFE5C9]/95 backdrop-blur-xs flex items-center justify-between shrink-0 border-b border-[#E2D6B5]">
                <div>
                  <div className="font-serif font-bold text-xs text-slate-900 truncate max-w-[220px]">
                    {projectName || 'Untitled Realm'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans">Project Management & Studios</div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold border border-amber-200">
                  Cartomancer
                </span>
              </div>

              {/* Scrollable Dropdown Body */}
              <div className="overflow-y-auto overscroll-contain flex-1 divide-y divide-[#E2D6B5] scrollbar-parchment py-1">
                {/* Section 1: File & Transfer (Import, Export, Save, Open) */}
                <div className="p-1.5 space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  File & Transfer
                </div>

                {/* Import Map Option - Prominently featured so it is never missing! */}
                {onOpenMapImport && (
                  <button
                    id="menu-item-import-map"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenMapImport();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[#00BBF9]/15 text-slate-800 hover:text-[#0077B6] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#00BBF9]/20 flex items-center justify-center text-[#0077B6] group-hover:bg-[#00BBF9] group-hover:text-white transition-colors shrink-0">
                        <FileUp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Import Map / Reference Image</span>
                          <span className="text-[9px] bg-[#00BBF9] text-white px-1.5 py-0.2 rounded font-mono uppercase font-semibold">
                            Import
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          Extract coastline mask or overlay reference map
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Export Map Option */}
                <button
                  id="menu-item-export-map"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenExport();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[#FF7E5F]/15 text-slate-800 hover:text-[#D9480F] transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#FF7E5F]/20 flex items-center justify-center text-[#FF7E5F] group-hover:bg-[#FF7E5F] group-hover:text-white transition-colors shrink-0">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span>Export High-Resolution Map</span>
                        <span className="text-[9px] bg-[#FF7E5F] text-white px-1.5 py-0.2 rounded font-mono uppercase font-semibold">
                          Export
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        PNG, JPG, 4K/8K, Topography & Heightmap
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+E</span>
                </button>

                {/* Save Map Project */}
                <button
                  id="menu-item-save-json"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onSaveJson();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                      <Save className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Save Map Project</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Download complete .json project file</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+S</span>
                </button>

                {/* Open Map Project */}
                <button
                  id="menu-item-load-json"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLoadJson();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-amber-50 text-slate-800 hover:text-amber-800 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition-colors shrink-0">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Open Saved Map</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Load existing .json project file</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Ctrl+O</span>
                </button>
              </div>

              {/* Section: Optional Background Autosave (IndexedDB / FSA) */}
              <div className="p-2.5 bg-[#FAF3E0] mx-1.5 my-1 rounded-xl border border-[#E2D6B5] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block leading-tight">Background Autosave</span>
                      <span className="text-[10px] text-slate-500 block leading-tight">
                        {isAutosaveEnabled
                          ? (autosaveStatus === 'saving' ? 'Saving snapshot...' : 'Active (60s idle save)')
                          : 'Optional — currently disabled'}
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="toggle-autosave-enabled"
                      checked={Boolean(isAutosaveEnabled)}
                      onChange={(e) => onToggleAutosave?.(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 shadow-inner"></div>
                  </label>
                </div>

                {/* Sub-controls when autosave is enabled */}
                {isAutosaveEnabled && (
                  <div className="space-y-1.5 pt-1 border-t border-[#E2D6B5]/80 text-[11px]">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Status:</span>
                      <span className="font-mono text-slate-800 font-medium">
                        {autosaveStatus === 'saving'
                          ? 'Saving...'
                          : lastAutosaveTime
                          ? `Saved at ${new Date(lastAutosaveTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'Waiting for idle...'}
                      </span>
                    </div>

                    {/* Local Folder FSA Sync */}
                    <div className="flex items-center justify-between gap-1 py-1 px-2 bg-white/90 rounded border border-[#E2D6B5]">
                      <div className="flex items-center gap-1.5 truncate text-slate-700">
                        <HardDrive className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                        <span className="truncate">
                          {fsaFolderName ? `/${fsaFolderName}/` : 'Disk sync (FSA)'}
                        </span>
                      </div>
                      {fsaFolderName ? (
                        onUnlinkFsaFolder && (
                          <button
                            onClick={onUnlinkFsaFolder}
                            className="text-[10px] text-rose-600 hover:underline font-bold shrink-0 cursor-pointer"
                          >
                            Unlink
                          </button>
                        )
                      ) : (
                        onLinkFsaFolder && (
                          <button
                            onClick={onLinkFsaFolder}
                            className="text-[10px] text-sky-700 hover:text-sky-900 font-bold underline shrink-0 cursor-pointer"
                          >
                            Link Folder
                          </button>
                        )
                      )}
                    </div>

                    {/* Snapshot trigger */}
                    {onTriggerAutosave && (
                      <button
                        onClick={() => {
                          onTriggerAutosave();
                        }}
                        className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-all shadow-xs cursor-pointer text-center"
                      >
                        Save Snapshot Now
                      </button>
                    )}
                  </div>
                )}

                {/* Restore Autosaved Draft */}
                {onRestoreAutosave && (
                  <button
                    id="menu-item-restore-autosave"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRestoreAutosave();
                    }}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-800 border border-[#E2D6B5] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="text-xs font-semibold">Restore Autosaved Draft</span>
                    </div>
                    {hasRecoveryDraft && (
                      <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                        Draft Ready
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Section 2: Studios & World Generation */}
              <div className="p-1.5 space-y-0.5">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Studios & Generators
                </div>

                {/* Shader Lab */}
                {onOpenShaderLab && (
                  <button
                    id="menu-item-shader-lab"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenShaderLab();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-[#FF7E5F]/10 text-slate-800 hover:text-[#D9480F] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-[#FF7E5F]/15 flex items-center justify-center text-[#D9480F] group-hover:bg-[#FF7E5F] group-hover:text-white transition-colors shrink-0">
                        <Palette className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Shader Lab & Palette Studio</div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          Pick colors from images & build custom biome shaders
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Master Assets Table */}
                {onOpenAssetOutliner && (
                  <button
                    id="menu-item-asset-outliner"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenAssetOutliner();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                        <Layers className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>Master Assets Table</span>
                          {assetCount !== undefined && (
                            <span className="text-[10px] bg-emerald-700 text-white font-bold px-1.5 py-0.2 rounded-full font-mono">
                              {assetCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 leading-tight">
                          Inspect, search, center & delete placed assets
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                {/* Templates & Presets */}
                <button
                  id="menu-item-templates"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenTemplates();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-purple-50 text-slate-800 hover:text-purple-800 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-purple-100 flex items-center justify-center text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">World Templates & Presets</div>
                      <div className="text-[10px] text-slate-500 leading-tight">
                        Continents, Pangaea, Archipelago starter realms
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Section 3: Canvas Operations & Shortcuts */}
              <div className="p-1.5 space-y-0.5 pb-3">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Canvas & Help
                </div>

                {onNewMap && (
                  <button
                    id="menu-item-new-map"
                    onClick={() => {
                      setIsMenuOpen(false);
                      if (window.confirm('Start a new blank realm? You can undo this with Ctrl+Z.')) {
                        onNewMap();
                      }
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-rose-50 text-slate-800 hover:text-rose-700 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-rose-100 flex items-center justify-center text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-colors shrink-0">
                        <FilePlus className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">New Blank Map</div>
                        <div className="text-[10px] text-slate-500 leading-tight">Clear canvas and start fresh ocean realm</div>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  id="menu-item-help"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenHelp();
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-100 text-slate-800 hover:text-slate-900 transition-colors group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-800 group-hover:text-white transition-colors shrink-0">
                      <HelpCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">Keyboard Shortcuts & Guide</div>
                      <div className="text-[10px] text-slate-500 leading-tight">Hotkeys, brush modes & tips</div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">?</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Center Controls: Undo / Redo, Topography, & Zoom */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#F4EBD0]/80 p-0.5 rounded-lg border border-[#E2D6B5]">
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              canUndo
                ? 'text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95'
                : 'text-slate-400 cursor-not-allowed opacity-40'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
            <span className="hidden lg:inline">Undo</span>
            {undoCount > 0 && (
              <span className="text-[10px] bg-[#FF7E5F]/20 text-[#D9480F] font-bold px-1.5 py-0.2 rounded-full">
                {undoCount}
              </span>
            )}
          </button>
          <div className="w-[1px] h-4 bg-[#E2D6B5] my-auto" />
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded text-xs font-semibold transition-all ${
              canRedo
                ? 'text-slate-700 hover:bg-white hover:text-slate-900 active:scale-95'
                : 'text-slate-400 cursor-not-allowed opacity-40'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
            <span className="hidden lg:inline">Redo</span>
            {redoCount > 0 && (
              <span className="text-[10px] bg-[#FF7E5F]/20 text-[#D9480F] font-bold px-1.5 py-0.2 rounded-full">
                {redoCount}
              </span>
            )}
          </button>
        </div>

        {/* Topographical View Toggle */}
        <button
          id="btn-toggle-topographical"
          onClick={onToggleTopographicalView}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-md text-xs font-semibold border transition-all shadow-xs ${
            topographicalView
              ? 'bg-[#00F5D4] text-slate-900 border-[#05D5AA] ring-2 ring-[#00F5D4]/40 font-bold'
              : 'bg-white/80 text-slate-700 hover:bg-white hover:text-slate-900 border-[#E2D6B5]'
          }`}
          title="Toggle Topographical Elevation Contour View"
        >
          <Mountain className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Topography</span>
        </button>

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center bg-[#F4EBD0]/80 px-1 py-0.5 rounded-lg border border-[#E2D6B5] text-xs text-slate-700">
          <button
            id="btn-zoom-out"
            onClick={onZoomOut ? onZoomOut : () => onZoomChange(Math.max(0.15, +(zoom - 0.15).toFixed(2)))}
            className="p-1 hover:text-[#00BBF9] hover:bg-white rounded transition-colors"
            title="Zoom Out (Ctrl+-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-reset"
            onClick={onResetZoom}
            className="px-1.5 font-mono text-[11px] text-slate-800 hover:text-[#00BBF9] font-medium"
            title="Reset Zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            id="btn-zoom-in"
            onClick={onZoomIn ? onZoomIn : () => onZoomChange(Math.min(5.0, +(zoom + 0.15).toFixed(2)))}
            className="p-1 hover:text-[#00BBF9] hover:bg-white rounded transition-colors"
            title="Zoom In (Ctrl++)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-fit"
            onClick={onFitToScreen ? onFitToScreen : onResetZoom}
            className="p-1 hover:text-[#00BBF9] hover:bg-white rounded transition-colors ml-0.5"
            title="Fit to Screen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right Quick Controls: Quick Save, Quick Export, Layers, Help */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 flex-shrink-0 ml-auto z-30">
        {/* Quick Save Map Button */}
        <button
          id="btn-save-json"
          onClick={onSaveJson}
          className="flex items-center gap-1 px-2.5 py-1.5 text-slate-800 hover:text-slate-950 bg-white hover:bg-slate-50 rounded-md border border-[#D5C69E] transition-all shadow-xs text-xs font-bold hover:border-emerald-500"
          title="Save Map to Computer (Ctrl+S)"
        >
          <Save className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="hidden sm:inline">Save</span>
        </button>

        {/* Quick Export Button */}
        <button
          id="btn-export-map"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md font-bold text-xs bg-gradient-to-r from-[#FF7E5F] via-[#FF6B6B] to-[#FEB47B] hover:from-[#f86c4a] hover:to-[#fea360] text-white shadow-md shadow-[#FF7E5F]/25 active:scale-95 transition-all shrink-0 cursor-pointer"
          title="Export High-Resolution Map (PNG, JPG, Topo, Heightmap)"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span className="inline font-bold">Export Map</span>
        </button>

        {/* Layers Drawer Toggle */}
        <button
          id="btn-toggle-layers-panel"
          onClick={onToggleLayersPanel}
          className={`p-1.5 rounded-md border transition-colors shadow-xs ${
            isLayersPanelOpen
              ? 'bg-[#00BBF9] text-white border-[#0096C7]'
              : 'text-slate-700 hover:text-slate-900 bg-white/70 hover:bg-white border-[#E2D6B5]'
          }`}
          title="Toggle Layers Inspector"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          id="btn-help-shortcuts"
          onClick={onOpenHelp}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white/80 rounded-md transition-colors"
          title="Shortcuts & Tips"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
