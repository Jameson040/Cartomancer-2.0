/**
 * Cartomancer Fantasy Map Maker - Merak-Inspired Dark Studio Top Navigation Bar
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
  HardDrive,
  Clock,
  Expand,
} from 'lucide-react';
import { CanvasDimensions } from '../types';

interface NavbarProps {
  projectName: string;
  onProjectNameChange: (name: string) => void;
  dimensions?: CanvasDimensions;
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
  onOpenWorldAdvisor?: () => void;
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

export const Navbar: React.FC<NavbarProps> = React.memo(({
  projectName,
  onProjectNameChange,
  dimensions,
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
  onOpenWorldAdvisor,
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
      className="h-13 bg-[#0B101B] border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between z-30 select-none text-slate-100 gap-2 relative"
    >
      {/* Left: Brand, Realm Name, Project Menu & Planet Advisor */}
      <div className="flex items-center gap-2 min-w-0 shrink">
        {/* Brand */}
        <div className="flex items-center gap-2 pr-2.5 border-r border-slate-800 shrink-0">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-['Cinzel'] font-bold text-sm sm:text-base tracking-wider text-slate-100 hidden sm:inline-block whitespace-nowrap">
            Cartomancer
          </span>
        </div>

        {/* Project Name editable */}
        <div className="flex items-center gap-1.5 bg-[#141D2E] px-2.5 py-1 rounded-lg border border-slate-800 focus-within:border-amber-400/70 transition-colors shrink min-w-[90px]">
          <MapIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <input
            id="project-name-input"
            type="text"
            value={projectName ?? ''}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none w-24 sm:w-32 md:w-40 truncate"
            placeholder="Name your realm..."
          />
        </div>

        {/* Master Project Dropdown */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            id="btn-map-menu-dropdown"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border cursor-pointer whitespace-nowrap ${
              isMenuOpen
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-[#141D2E] hover:bg-[#1C283E] text-slate-200 border-slate-800 hover:border-slate-700'
            }`}
            title="Open Map Menu: Import Map, Export, Save, Open, Studios, and Presets"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Map Menu</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 shrink-0 ${isMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMenuOpen && (
            <div
              id="map-menu-popover"
              className="absolute left-0 mt-2 w-80 sm:w-96 max-h-[calc(100vh-4.5rem)] flex flex-col bg-[#0F1623] border border-slate-700 rounded-xl shadow-2xl z-50 text-slate-100 overflow-hidden"
            >
              {/* Dropdown Header */}
              <div className="px-4 py-2.5 bg-[#151E2E] flex items-center justify-between shrink-0 border-b border-slate-800">
                <div>
                  <div className="font-semibold text-xs text-white truncate max-w-[220px]">
                    {projectName || 'Untitled Realm'}
                  </div>
                  <div className="text-[10px] text-slate-400">Project Management & Studios</div>
                </div>
                {dimensions && (
                  <span className="text-[10px] font-mono tabular-nums text-amber-400">
                    {dimensions.width}×{dimensions.height}
                  </span>
                )}
              </div>

              {/* Scrollable Dropdown Body */}
              <div className="overflow-y-auto overscroll-contain flex-1 divide-y divide-slate-800/80 py-1">
                {/* Section 1: File & Transfer */}
                <div className="p-1.5 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    File & Transfer
                  </div>

                  {onOpenMapImport && (
                    <button
                      id="menu-item-import-map"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenMapImport();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
                          <FileUp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">
                            Import Map / Reference Image
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            Extract coastline mask or overlay reference map
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    id="menu-item-export-map"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenExport();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <Download className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Export High-Resolution Map
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          PNG, JPG, 4K/8K, Topography & Heightmap
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+E</span>
                  </button>

                  <button
                    id="menu-item-save-json"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSaveJson();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                        <Save className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Save Map Project</div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          Download complete .json project file
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+S</span>
                  </button>

                  <button
                    id="menu-item-load-json"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onLoadJson();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">Open Saved Map</div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          Load existing .json project file
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">Ctrl+O</span>
                  </button>
                </div>

                {/* Section: Background Autosave */}
                <div className="p-2.5 bg-[#151E2E] mx-1.5 my-1 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <span className="text-xs font-semibold text-white block leading-tight">
                          Background Autosave
                        </span>
                        <span className="text-[10px] text-slate-400 block leading-tight">
                          {isAutosaveEnabled
                            ? autosaveStatus === 'saving'
                              ? 'Saving snapshot...'
                              : 'Active (60s idle save)'
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
                      <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>

                  {isAutosaveEnabled && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[11px]">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Status:</span>
                        <span className="font-mono tabular-nums text-slate-200">
                          {autosaveStatus === 'saving'
                            ? 'Saving...'
                            : lastAutosaveTime
                            ? `Saved at ${new Date(lastAutosaveTime).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}`
                            : 'Waiting for idle...'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1 py-1 px-2 bg-[#0B101B] rounded border border-slate-800">
                        <div className="flex items-center gap-1.5 truncate text-slate-300">
                          <HardDrive className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">
                            {fsaFolderName ? `/${fsaFolderName}/` : 'Disk sync (FSA)'}
                          </span>
                        </div>
                        {fsaFolderName ? (
                          onUnlinkFsaFolder && (
                            <button
                              onClick={onUnlinkFsaFolder}
                              className="text-[10px] text-rose-400 hover:underline font-semibold shrink-0 cursor-pointer"
                            >
                              Unlink
                            </button>
                          )
                        ) : (
                          onLinkFsaFolder && (
                            <button
                              onClick={onLinkFsaFolder}
                              className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold underline shrink-0 cursor-pointer"
                            >
                              Link Folder
                            </button>
                          )
                        )}
                      </div>

                      {onTriggerAutosave && (
                        <button
                          onClick={onTriggerAutosave}
                          className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer text-center"
                        >
                          Save Snapshot Now
                        </button>
                      )}
                    </div>
                  )}

                  {onRestoreAutosave && (
                    <button
                      id="menu-item-restore-autosave"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onRestoreAutosave();
                      }}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#0B101B] hover:bg-slate-800 text-slate-200 border border-slate-800 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-medium">Restore Autosaved Draft</span>
                      </div>
                      {hasRecoveryDraft && (
                        <span className="text-[10px] text-emerald-400 font-mono">Draft Ready</span>
                      )}
                    </button>
                  )}
                </div>

                {/* Section 2: Studios & World Generation */}
                <div className="p-1.5 space-y-0.5">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Studios & Generators
                  </div>

                  {onOpenWorldAdvisor && (
                    <button
                      id="menu-item-world-advisor"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenWorldAdvisor();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">
                            Planet Advisor & Canvas Size Studio
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            Resize map up to 4K, run tectonic & river generators
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {onOpenShaderLab && (
                    <button
                      id="menu-item-shader-lab"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenShaderLab();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                          <Palette className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">
                            Shader Lab & Palette Studio
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            Pick colors from images & build custom biome shaders
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  {onOpenAssetOutliner && (
                    <button
                      id="menu-item-asset-outliner"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenAssetOutliner();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                            <span>Master Assets Outliner</span>
                            {assetCount !== undefined && (
                              <span className="text-[10px] text-emerald-400 font-mono tabular-nums">
                                ({assetCount})
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            Inspect, search, center & delete placed assets
                          </div>
                        </div>
                      </div>
                    </button>
                  )}

                  <button
                    id="menu-item-templates"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onOpenTemplates();
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          World Templates & Presets
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          Continents, Pangaea, Archipelago starter realms
                        </div>
                      </div>
                    </div>
                  </button>
                </div>

                {/* Section 3: Canvas Operations & Shortcuts */}
                <div className="p-1.5 space-y-0.5 pb-3">
                  <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Canvas & Help
                  </div>

                  {onNewMap && (
                    <button
                      id="menu-item-new-map"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onNewMap();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-rose-300 transition-colors group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                          <FilePlus className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white">New Blank Map</div>
                          <div className="text-[10px] text-slate-400 leading-tight">
                            Clear canvas and start fresh ocean realm
                          </div>
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
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left hover:bg-slate-800/90 text-slate-200 hover:text-white transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white">
                          Keyboard Shortcuts & Guide
                        </div>
                        <div className="text-[10px] text-slate-400 leading-tight">
                          Hotkeys, brush modes & tips
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">?</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Planet Advisor & Map Size Quick Button */}
        {onOpenWorldAdvisor && (
          <button
            id="btn-open-world-advisor"
            onClick={onOpenWorldAdvisor}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#141D2E] hover:bg-[#1C283E] text-amber-300 border border-slate-800 hover:border-amber-500/50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            title="Open Planet Advisor, Procedural World Sculptor & Canvas Resolution Studio"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Planet Advisor</span>
            {dimensions && (
              <span className="text-[10px] font-mono tabular-nums text-slate-400 pl-1 border-l border-slate-700">
                {dimensions.width}×{dimensions.height}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Center Controls: Undo / Redo, Topography, & Zoom */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center bg-[#141D2E] p-0.5 rounded-lg border border-slate-800">
          <button
            id="btn-undo"
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              canUndo
                ? 'text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Undo</span>
            {undoCount > 0 && (
              <span className="text-[10px] font-mono tabular-nums text-amber-400">
                {undoCount}
              </span>
            )}
          </button>
          <div className="w-[1px] h-3.5 bg-slate-800 my-auto" />
          <button
            id="btn-redo"
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              canRedo
                ? 'text-slate-200 hover:bg-slate-800 hover:text-white cursor-pointer'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Redo</span>
            {redoCount > 0 && (
              <span className="text-[10px] font-mono tabular-nums text-amber-400">
                {redoCount}
              </span>
            )}
          </button>
        </div>

        {/* Topographical View Toggle */}
        <button
          id="btn-toggle-topographical"
          onClick={onToggleTopographicalView}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            topographicalView
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-[#141D2E] text-slate-300 hover:bg-[#1C283E] hover:text-white border-slate-800'
          }`}
          title="Toggle Topographical Elevation Contour Heatmap"
        >
          <Mountain className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Topography</span>
        </button>

        {/* Zoom Controls */}
        <div className="hidden lg:flex items-center bg-[#141D2E] px-1 py-0.5 rounded-lg border border-slate-800 text-xs text-slate-300">
          <button
            id="btn-zoom-out"
            onClick={onZoomOut ? onZoomOut : () => onZoomChange(Math.max(0.1, +(zoom - 0.15).toFixed(2)))}
            className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Zoom Out (Ctrl+-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-reset"
            onClick={onResetZoom}
            className="px-2 font-mono tabular-nums text-[11px] text-slate-200 hover:text-amber-400 font-semibold cursor-pointer"
            title="Reset Zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            id="btn-zoom-in"
            onClick={onZoomIn ? onZoomIn : () => onZoomChange(Math.min(6.0, +(zoom + 0.15).toFixed(2)))}
            className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Zoom In (Ctrl++)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            id="btn-zoom-fit"
            onClick={onFitToScreen ? onFitToScreen : onResetZoom}
            className="p-1 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors ml-0.5 cursor-pointer"
            title="Fit Map to Screen"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Right Quick Controls: Save, Export, Layers, Help */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto z-30">
        <button
          id="btn-save-json"
          onClick={onSaveJson}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-slate-200 hover:text-white bg-[#141D2E] hover:bg-[#1C283E] rounded-lg border border-slate-800 hover:border-slate-700 transition-colors text-xs font-semibold cursor-pointer whitespace-nowrap"
          title="Save Map to Computer (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Save</span>
        </button>

        <button
          id="btn-export-map"
          onClick={onOpenExport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shrink-0 cursor-pointer whitespace-nowrap"
          title="Export High-Resolution Map (PNG, JPG, Topo, Heightmap)"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Export Map</span>
        </button>

        <button
          id="btn-toggle-layers-panel"
          onClick={onToggleLayersPanel}
          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
            isLayersPanelOpen
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
              : 'text-slate-300 hover:text-white bg-[#141D2E] hover:bg-[#1C283E] border-slate-800'
          }`}
          title="Toggle Layers & Atmosphere Inspector"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          id="btn-help-shortcuts"
          onClick={onOpenHelp}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          title="Shortcuts & Tips (?)"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
});
