/**
 * Cartomancer Fantasy Map Maker - Asset Library & Custom Asset / Folder Uploader
 * Supports single file, multiple files, and full folder imports with recursion,
 * automatic category classification, and throttled non-blocking processing to prevent freezing.
 */

import React, { useState, useRef, useMemo } from 'react';
import { StampAsset, StampCategory } from '../types';
import { DEFAULT_STAMP_ASSETS } from '../data/defaultAssets';
import { imageManager } from '../utils/imageManager';
import { formatTitle } from '../utils/dynamicAssetLoader';
import {
  X,
  Upload,
  Search,
  Trash2,
  FolderOpen,
  Sparkles,
  Check,
  FolderDown,
  Loader2,
  AlertCircle,
  Layers,
  StopCircle,
  Download,
  FileUp,
  Info,
  BookOpen,
  ChevronDown,
  ChevronUp,
  HardDrive,
  CheckCircle2,
  Star,
} from 'lucide-react';

interface AssetLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssetId: string;
  onSelectAsset: (asset: StampAsset) => void;
  customAssets: StampAsset[];
  onAddCustomAsset: (asset: StampAsset) => void;
  onAddCustomAssets?: (assets: StampAsset[]) => void;
  onDeleteCustomAsset: (assetId: string) => void;
  onClearAllCustomAssets?: () => void;
}

const BASE_CATEGORIES: { id: StampCategory | 'all' | 'favorites' | 'recent'; label: string }[] = [
  { id: 'all', label: 'All Assets' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recently Used' },
  { id: 'trees', label: 'Trees & Flora' },
  { id: 'swamps', label: 'Swamps & Marshes' },
  { id: 'forts', label: 'Forts & Citadels' },
  { id: 'lakes', label: 'Lakes & Water Bodies' },
  { id: 'piers', label: 'Piers & Docks' },
  { id: 'camping_carriage', label: 'Camping & Carriages' },
  { id: 'castles', label: 'Castles & Spires' },
  { id: 'mountains', label: 'Mountains & Hills' },
  { id: 'settlements', label: 'Cities & Villages' },
  { id: 'building_blocks', label: 'Building Blocks' },
  { id: 'nature_props', label: 'Dungeons & Props' },
  { id: 'water_maritime', label: 'Ships & Maritime' },
  { id: 'decorations', label: 'Compass & Banners' },
  { id: 'custom', label: 'Custom Uploads' },
];

export const AssetLibraryModal: React.FC<AssetLibraryModalProps> = ({
  isOpen,
  onClose,
  selectedAssetId,
  onSelectAsset,
  customAssets,
  onAddCustomAsset,
  onAddCustomAssets,
  onDeleteCustomAsset,
  onClearAllCustomAssets,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<StampCategory | 'all' | 'favorites' | 'recent'>('all');
  const [favoriteAssetIds, setFavoriteAssetIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cartomancer_favorite_assets') || '[]'); } catch { return []; }
  });
  const [recentAssetIds, setRecentAssetIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('cartomancer_recent_assets') || '[]'); } catch { return []; }
  });
  const [currentView, setCurrentView] = useState<'browser' | 'import'>(
    customAssets.length === 0 ? 'import' : 'browser'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState<StampCategory>('custom');
  const [autoDetectCategories, setAutoDetectCategories] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [visibleCount, setVisibleCount] = useState(48);

  // Reset pagination when category or search query changes
  React.useEffect(() => {
    setVisibleCount(48);
  }, [selectedCategory, searchQuery]);

  // Batch progress state
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    currentFilename: string;
  } | null>(null);
  const cancelBatchRef = useRef(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const packInputRef = useRef<HTMLInputElement>(null);

  const [isPermanentizing, setIsPermanentizing] = useState(false);
  const [permanentizeMsg, setPermanentizeMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const allAssets = useMemo(() => [...DEFAULT_STAMP_ASSETS, ...customAssets], [customAssets]);

  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of BASE_CATEGORIES) {
      map.set(c.id, c.label);
    }
    for (const a of allAssets) {
      if (a.category && !map.has(a.category)) {
        map.set(a.category, formatTitle(a.category));
      }
    }
    const list: { id: StampCategory | 'all' | 'favorites' | 'recent'; label: string }[] = [];
    for (const [id, label] of map.entries()) {
      list.push({ id: id as StampCategory, label });
    }
    return list;
  }, [allAssets]);

  const filteredAssets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allAssets.filter((asset) => {
      const matchesCategory =
        selectedCategory === 'all'
          ? true
          : selectedCategory === 'custom'
          ? asset.isCustom
          : selectedCategory === 'favorites'
          ? favoriteAssetIds.includes(asset.id)
          : selectedCategory === 'recent'
          ? recentAssetIds.includes(asset.id)
          : asset.category === selectedCategory;

      if (!matchesCategory) return false;
      if (!q) return true;

      return (
        asset.name.toLowerCase().includes(q) ||
        (asset.tags && asset.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });
  }, [allAssets, selectedCategory, searchQuery, favoriteAssetIds, recentAssetIds]);

  const toggleFavorite = (assetId: string) => {
    setFavoriteAssetIds((current) => {
      const next = current.includes(assetId) ? current.filter((id) => id !== assetId) : [...current, assetId];
      localStorage.setItem('cartomancer_favorite_assets', JSON.stringify(next));
      return next;
    });
  };

  const rememberRecent = (assetId: string) => {
    setRecentAssetIds((current) => {
      const next = [assetId, ...current.filter((id) => id !== assetId)].slice(0, 24);
      localStorage.setItem('cartomancer_recent_assets', JSON.stringify(next));
      return next;
    });
  };

  const displayedAssets = useMemo(
    () => filteredAssets.slice(0, visibleCount),
    [filteredAssets, visibleCount]
  );

  // Turn uploaded custom vault assets into permanent files in src/assets/stamps/<category>/
  const handlePermanentizeAssets = async () => {
    if (customAssets.length === 0) return;
    setIsPermanentizing(true);
    setPermanentizeMsg(null);

    try {
      const response = await fetch('/api/permanentize-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assets: customAssets }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        const catDetails = Object.entries(data.categories || {})
          .map(([k, v]) => `${k} (${v})`)
          .join(', ');
        const successText = `Successfully placed ${data.savedCount} assets permanently into src/assets/stamps/! Categories: ${catDetails}`;
        setPermanentizeMsg({ type: 'success', text: successText });
        setUploadSuccessMsg(successText);
      } else {
        setPermanentizeMsg({ type: 'error', text: data.error || 'Server error occurred while saving.' });
      }
    } catch (err: any) {
      console.error('Error permanentizing assets:', err);
      setPermanentizeMsg({ type: 'error', text: `Failed to contact server: ${err.message}` });
    } finally {
      setIsPermanentizing(false);
    }
  };

  // Export custom vault as portable JSON pack
  const handleExportAssetPack = () => {
    if (customAssets.length === 0) return;
    const pack = {
      format: 'cartomancer_asset_pack',
      version: 1,
      createdAt: new Date().toISOString(),
      assetCount: customAssets.length,
      assets: customAssets,
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cartomancer_asset_vault_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setUploadSuccessMsg(`Exported ${customAssets.length} custom assets to JSON vault pack!`);
  };

  // Import previously saved JSON asset pack
  const handleImportAssetPack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const incoming: StampAsset[] = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed.assets)
          ? parsed.assets
          : [];
        if (incoming.length > 0) {
          commitNewAssets(incoming);
          setUploadSuccessMsg(`Successfully restored ${incoming.length} assets from vault pack!`);
        } else {
          alert('No valid stamp assets found in selected file.');
        }
      } catch (err) {
        console.error('Failed to parse asset pack JSON', err);
        alert('Invalid JSON file. Please provide a valid Cartomancer asset pack.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Safe Batch Adder
  const commitNewAssets = (newAssets: StampAsset[]) => {
    if (newAssets.length === 0) return;
    if (onAddCustomAssets) {
      onAddCustomAssets(newAssets);
    } else {
      newAssets.forEach((a) => onAddCustomAsset(a));
    }
    // Select the first imported asset for immediate use
    onSelectAsset(newAssets[0]);
  };

  // Process a list of File objects with non-blocking progress
  const processBatchQueue = async (
    items: { file: File; relativePath?: string }[],
    customSingleName?: string
  ) => {
    if (items.length === 0) return;

    setIsProcessing(true);
    cancelBatchRef.current = false;
    setBatchProgress({ current: 0, total: items.length, currentFilename: items[0].file.name });

    try {
      if (items.length === 1 && customSingleName) {
        // Single named asset
        const single = items[0];
        const asset = await imageManager.optimizeAndProcessImage(
          single.file,
          customSingleName,
          uploadCategory,
          1024
        );
        commitNewAssets([asset]);
        setUploadName('');
        setUploadSuccessMsg(`Added "${asset.name}" to library!`);
      } else {
        // Batch folder or multiple files
        const processedAssets = await imageManager.processBatchAssets(items, {
          defaultCategory: uploadCategory,
          autoDetectCategory: autoDetectCategories,
          shouldCancel: () => cancelBatchRef.current,
          onProgress: (current, total, currentFilename) => {
            setBatchProgress({ current, total, currentFilename });
          },
        });

        if (processedAssets.length > 0) {
          commitNewAssets(processedAssets);
          setUploadSuccessMsg(`Successfully imported ${processedAssets.length} assets!`);
        }
      }
    } catch (err) {
      console.error('Failed processing asset batch', err);
    } finally {
      setIsProcessing(false);
      setBatchProgress(null);
      setTimeout(() => setUploadSuccessMsg(''), 4000);
    }
  };

  // Handle Drag & Drop of single files, multiple files, or full folders
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    try {
      const extracted = await imageManager.extractFilesFromDataTransfer(e.dataTransfer);
      if (extracted.length > 0) {
        setCurrentView('import');
        processBatchQueue(extracted);
      }
    } catch (err) {
      console.error('Error reading dropped files/folders', err);
    }
  };

  // Handle File Input selection (Multiple Files)
  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFiles = Array.from(e.target.files) as File[];
    const fileList = rawFiles.filter((f) => imageManager.isSupportedImageFile(f));
    const items = fileList.map((file) => ({ file, relativePath: file.name }));
    const singleName = fileList.length === 1 ? uploadName.trim() : undefined;
    processBatchQueue(items, singleName);
    e.target.value = ''; // Reset input
  };

  // Handle Folder Input selection (webkitdirectory)
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const rawFiles = Array.from(e.target.files) as File[];
    const fileList = rawFiles.filter((f) => imageManager.isSupportedImageFile(f));
    const items = fileList.map((file) => ({
      file,
      relativePath: (file as any).webkitRelativePath || file.name,
    }));
    processBatchQueue(items);
    e.target.value = ''; // Reset input
  };

  const handleCancelBatch = () => {
    cancelBatchRef.current = true;
  };

  if (!isOpen) return null;

  return (
    <div
      id="asset-library-modal-backdrop"
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in select-none"
    >
      <div
        id="asset-library-modal"
        className="bg-[#FDF6E3] border-2 border-[#E2D6B5] rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden text-slate-800"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FF7E5F]/15 border border-[#FF7E5F]/40 flex items-center justify-center text-[#FF7E5F]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Cinzel'] font-bold text-lg text-slate-800 tracking-wider">
                Cartographer's Stamp Vault
              </h2>
              <p className="text-xs text-slate-600">
                Place built-in world assets or import single stamps & complete asset pack folders
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Category Sidebar */}
          <div className="w-56 bg-[#F7F0DC] border-r border-[#E2D6B5] p-3 flex flex-col gap-1 overflow-y-auto">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase px-2 mb-1">
              Asset Categories
            </span>
            {availableCategories.map((cat) => {
              const count =
                cat.id === 'all'
                  ? allAssets.length
                  : cat.id === 'custom'
                  ? customAssets.length
                  : allAssets.filter((a) => a.category === cat.id).length;

              const isSelected = currentView === 'browser' && selectedCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setCurrentView('browser');
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] text-white font-bold shadow-xs'
                      : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-white/30 text-white font-bold' : 'bg-[#EFE5C9] text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {/* Custom Upload Highlight Section */}
            <div className="mt-4 pt-3 border-t border-[#E2D6B5] flex flex-col gap-2">
              <button
                onClick={() => setCurrentView('import')}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                  currentView === 'import'
                    ? 'bg-gradient-to-r from-[#00BBF9] to-[#0096C7] text-white ring-2 ring-[#00BBF9]/50 shadow-md'
                    : 'bg-white hover:bg-[#00BBF9]/10 text-[#0086b3] border-2 border-[#00BBF9]/40 hover:border-[#00BBF9] shadow-xs'
                }`}
              >
                <FolderDown className="w-3.5 h-3.5" />
                <span>Import Assets / Folder</span>
              </button>

              {/* Vault Pack Backup & Restore */}
              <div className="pt-1 flex items-center gap-1.5">
                <button
                  onClick={handleExportAssetPack}
                  disabled={customAssets.length === 0}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2D6B5] rounded-md transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
                  title="Export custom vault as a single JSON file to your machine"
                >
                  <Download className="w-3 h-3 text-[#FF7E5F]" />
                  <span>Export Pack</span>
                </button>
                <button
                  onClick={() => packInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#E2D6B5] rounded-md transition-colors cursor-pointer shadow-2xs"
                  title="Load a previously saved JSON vault pack"
                >
                  <FileUp className="w-3 h-3 text-[#00BBF9]" />
                  <span>Load Pack</span>
                </button>
              </div>

              {customAssets.length > 0 && onClearAllCustomAssets && (
                <button
                  onClick={() => setShowConfirmClear(true)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-medium text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear All Custom ({customAssets.length})</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Content Area */}
          {currentView === 'import' ? (
            /* Dedicated Import Assets / Folder Studio */
            <div className="flex-1 flex flex-col p-5 overflow-y-auto pr-3">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E2D6B5]">
                <div>
                  <h3 className="font-['Cinzel'] font-bold text-base text-slate-800 flex items-center gap-2">
                    <FolderDown className="w-5 h-5 text-[#00BBF9]" />
                    <span>Import Assets & Stamp Folders</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Batch import single stamp images or full directory packs with automatic folder classification.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedCategory('custom');
                    setCurrentView('browser');
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg border border-[#E2D6B5] hover:border-[#FF7E5F] text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <span>Browse Custom Vault ({customAssets.length})</span>
                  <span className="text-[#FF7E5F] font-bold">→</span>
                </button>
              </div>

              {/* Dynamic Folder Discovery Status Banner */}
              <div className="mb-4 p-3.5 rounded-xl bg-[#FDFBF7] border border-[#E2D6B5] flex items-start gap-3 shadow-xs">
                <FolderOpen className="w-5 h-5 text-[#00BBF9] shrink-0 mt-0.5" />
                <div className="flex-1 text-xs text-slate-700">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">
                      Permanent Folder Auto-Discovery Active
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {DEFAULT_STAMP_ASSETS.length} Folder {DEFAULT_STAMP_ASSETS.length === 1 ? 'Asset' : 'Assets'} Loaded
                    </span>
                  </div>
                  <p className="mt-1 text-slate-600 leading-relaxed">
                    Any images dropped into <code className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 font-mono text-[11px]">/src/assets/stamps/&lt;category&gt;/</code> in the code editor's file explorer are automatically discovered and registered as permanent built-in stamps with zero code changes required.
                  </p>
                </div>
              </div>

              {/* Hidden File and Folder Inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg"
                multiple
                className="hidden"
                onChange={handleFilesSelect}
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore - non-standard attributes for directory selection
                webkitdirectory=""
                directory=""
                multiple
                className="hidden"
                onChange={handleFolderSelect}
              />
              <input
                ref={packInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportAssetPack}
              />

              {/* Non-Blocking Batch Progress Card */}
              {isProcessing && batchProgress && (
                <div className="mb-4 p-4 rounded-xl bg-gradient-to-r from-[#FFF8E7] to-[#FDF6E3] border-2 border-[#00BBF9]/60 shadow-md">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-[#00BBF9] animate-spin" />
                      <span className="font-bold text-xs text-slate-800">
                        Importing Assets ({batchProgress.current} / {batchProgress.total})
                      </span>
                      <span className="text-[11px] text-slate-500 truncate max-w-xs font-mono">
                        {batchProgress.currentFilename}
                      </span>
                    </div>
                    <button
                      onClick={handleCancelBatch}
                      className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md border border-rose-300 font-semibold cursor-pointer transition-colors"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Stop Import</span>
                    </button>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#00BBF9] to-[#FF7E5F] transition-all duration-150"
                      style={{
                        width: `${Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Success Banner */}
              {uploadSuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2 font-semibold">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{uploadSuccessMsg}</span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedCategory('custom');
                      setCurrentView('browser');
                    }}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded cursor-pointer"
                  >
                    View in Custom Vault →
                  </button>
                </div>
              )}

              {/* Large Drop Zone */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`p-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center gap-4 ${
                  dragActive
                    ? 'border-[#00BBF9] bg-[#00BBF9]/10 scale-[1.01]'
                    : 'border-[#E2D6B5] bg-white/80 shadow-xs'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-[#00BBF9]/15 border border-[#00BBF9]/30 flex items-center justify-center text-[#00BBF9] shadow-xs">
                  <FolderDown className="w-7 h-7" />
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-800">
                    Drag & Drop Stamp Files or Entire Folders Here
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
                    Drop single images, packs, or folders. Transparent backgrounds are preserved, and subdirectories can automatically map to categories.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold border-2 border-[#E2D6B5] hover:border-[#00BBF9] rounded-xl text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 text-[#00BBF9]" />
                    <span>Browse Files</span>
                  </button>

                  <button
                    onClick={() => folderInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#FF7E5F] to-[#FEB47B] hover:from-[#f86c4a] hover:to-[#fea360] text-white font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Import Entire Folder</span>
                  </button>
                </div>
              </div>

              {/* Classification Settings Card */}
              <div className="mt-4 p-4 rounded-xl bg-white/70 border border-[#E2D6B5] flex flex-col gap-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Import Options & Category Mapping
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={autoDetectCategories}
                      onChange={(e) => setAutoDetectCategories(e.target.checked)}
                      className="rounded text-[#00BBF9] focus:ring-[#00BBF9]"
                    />
                    <span>Auto-classify into categories from subfolder names (e.g. /mountains, /trees, /castles)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Default Category:</span>
                    <select
                      value={uploadCategory}
                      onChange={(e) => setUploadCategory(e.target.value as StampCategory)}
                      className="bg-white border border-[#E2D6B5] rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#00BBF9] cursor-pointer font-medium"
                    >
                      <option value="custom">General Custom</option>
                      <option value="trees">Trees & Flora</option>
                      <option value="swamps">Swamps & Marshes</option>
                      <option value="forts">Forts & Citadels</option>
                      <option value="lakes">Lakes & Water Bodies</option>
                      <option value="piers">Piers & Docks</option>
                      <option value="camping_carriage">Camping & Carriages</option>
                      <option value="castles">Castles & Spires</option>
                      <option value="mountains">Mountains & Hills</option>
                      <option value="settlements">Cities / Villages</option>
                      <option value="building_blocks">Building Blocks</option>
                      <option value="nature_props">Nature & Dungeons</option>
                      <option value="water_maritime">Ships & Maritime</option>
                      <option value="decorations">Compass & Banners</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#E2D6B5]/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-medium">Single Asset Name (optional):</span>
                    <input
                      type="text"
                      placeholder="Custom stamp name"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      className="bg-white border border-[#E2D6B5] rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-[#00BBF9] w-48"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Supports PNG, SVG, WebP, JPG
                  </span>
                </div>
              </div>

              {/* Permanentize Custom Assets to src/assets/stamps/ */}
              {customAssets.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF7E5F] to-[#FEB47B] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                        <span>Save to Permanent Categories (src/assets/stamps/)</span>
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                          {customAssets.length} Ready
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 max-w-xl">
                        Turn all your uploaded assets into permanent project files in <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-[10px] border border-amber-200">src/assets/stamps/&lt;category&gt;/</code>. They will be auto-categorized by name (Trees, Swamps, Forts, Lakes, Piers, Camping, etc.) and permanently integrated.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePermanentizeAssets}
                      disabled={isPermanentizing}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF7E5F] to-[#D9480F] hover:from-[#f06d4e] hover:to-[#be3e0c] text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isPermanentizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Files...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                          <span>Save to Permanent Folders</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Permanentize status alert */}
              {permanentizeMsg && (
                <div
                  className={`mt-2 p-3 rounded-xl border text-xs flex items-center justify-between ${
                    permanentizeMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {permanentizeMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{permanentizeMsg.text}</span>
                  </div>
                  {permanentizeMsg.type === 'success' && onClearAllCustomAssets && (
                    <button
                      onClick={() => {
                        onClearAllCustomAssets();
                        setPermanentizeMsg(null);
                      }}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 font-bold rounded border border-emerald-300 text-[11px] cursor-pointer"
                      title="Clear custom uploads now that they exist as permanent assets"
                    >
                      Clear Uploads Vault (Now Built-in)
                    </button>
                  )}
                </div>
              )}

              {/* Confirmation Banner for Clearing Custom Stamps */}
              {showConfirmClear && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-center justify-between text-xs text-rose-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Are you sure you want to remove all {customAssets.length} custom stamps from your vault?</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (onClearAllCustomAssets) onClearAllCustomAssets();
                        setShowConfirmClear(false);
                        setUploadSuccessMsg('Cleared custom stamps.');
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded cursor-pointer"
                    >
                      Yes, Delete All
                    </button>
                    <button
                      onClick={() => setShowConfirmClear(false)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Preview of loaded custom assets */}
              {customAssets.length > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-white/70 border border-[#E2D6B5]">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                      <span>Currently Loaded in Custom Vault</span>
                      <span className="bg-[#EFE5C9] text-slate-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                        {customAssets.length} assets
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedCategory('custom');
                        setCurrentView('browser');
                      }}
                      className="text-xs text-[#0086b3] hover:text-[#00BBF9] font-bold cursor-pointer"
                    >
                      Surf All Custom Assets →
                    </button>
                  </div>

                  <div className="flex items-center gap-3 overflow-x-auto pb-1">
                    {customAssets.slice(-8).map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => {
                          onSelectAsset(asset);
                          onClose();
                        }}
                        className="shrink-0 w-16 h-16 rounded-lg bg-white border border-[#E2D6B5] hover:border-[#00BBF9] p-1 flex flex-col items-center justify-center cursor-pointer shadow-2xs hover:shadow-xs transition-all group"
                        title={asset.name}
                      >
                        <div className="w-10 h-10 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {asset.imageUrl ? (
                            <img
                              src={asset.imageUrl}
                              alt={asset.name}
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : asset.svgData ? (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              dangerouslySetInnerHTML={{ __html: asset.svgData }}
                            />
                          ) : null}
                        </div>
                        <span className="text-[9px] text-slate-600 truncate w-full text-center mt-0.5">
                          {asset.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Asset Pack Vault Backup & Restore Card */}
              <div className="mt-4 p-4 rounded-xl bg-white/70 border border-[#E2D6B5] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FF7E5F]/10 border border-[#FF7E5F]/30 flex items-center justify-center text-[#FF7E5F] shrink-0">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Vault Pack Backup & Portability (.json)
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Export your entire collection of custom stamps into a single portable file, or reload one anytime.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleExportAssetPack}
                    disabled={customAssets.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-lg border border-[#E2D6B5] text-xs shadow-2xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#FF7E5F]" />
                    <span>Export Pack ({customAssets.length})</span>
                  </button>

                  <button
                    onClick={() => packInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#00BBF9] to-[#0096C7] hover:from-[#00a9e0] hover:to-[#0086b3] text-white font-semibold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <FileUp className="w-3.5 h-3.5" />
                    <span>Import Pack (.json)</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Guide: How to Add Your AI-Extracted Assets */}
              <div className="mt-4 rounded-xl border border-[#E2D6B5] bg-[#F7F0DC]/80 overflow-hidden text-xs">
                <button
                  onClick={() => setShowGuide((prev) => !prev)}
                  className="w-full px-4 py-3 flex items-center justify-between font-bold text-slate-800 hover:bg-[#EFE5C9]/60 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#00BBF9]" />
                    <span>Guide: How to Add Your AI-Extracted Assets from Your Machine</span>
                  </div>
                  {showGuide ? (
                    <ChevronUp className="w-4 h-4 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  )}
                </button>

                {showGuide && (
                  <div className="px-4 pb-4 pt-1 text-slate-700 space-y-2.5 border-t border-[#E2D6B5]/60 bg-white/60">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#FF7E5F] shrink-0">1. Format & Transparency:</span>
                      <span>
                        Save your extracted assets as <strong>PNG</strong> or <strong>WebP</strong> with transparent alpha backgrounds (ideal resolutions: 256×256 up to 1024×1024).
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#FF7E5F] shrink-0">2. Automatic Folder Classification:</span>
                      <span>
                        If your extraction script created subdirectories (e.g. <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">mountains/</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">trees/</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">settlements/</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">castles/</code>), simply click <strong>Import Entire Folder</strong> or drag the parent folder into the drop zone. Cartomancer automatically parses the folder names and organizes each asset into the matching category tab.
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#FF7E5F] shrink-0">3. Local Persistence:</span>
                      <span>
                        Assets are indexed into your browser's local IndexedDB database. They survive page refreshes and browser restarts without sending any data over external networks.
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#FF7E5F] shrink-0">4. Project Portability & Backup:</span>
                      <span>
                        Use <strong>Export Pack (.json)</strong> anytime to back up all your loaded assets into a single JSON file. You can load this file onto another browser or machine instantly with <strong>Import Pack</strong>.
                      </span>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="font-bold text-[#FF7E5F] shrink-0">5. Permanent Folder Auto-Discovery (Zero Code):</span>
                      <span>
                        Place any image files directly into the project's <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">/src/assets/stamps/&lt;category&gt;/</code> directory (e.g. <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">mountains/</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">trees/</code>, <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px]">castles/</code>). Cartomancer automatically indexes them, derives their names and categories, and bundles them permanently into the application without editing any code files.
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Asset Browser View */
            <div
              className="flex-1 flex flex-col p-5 overflow-hidden relative"
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              {/* Drag Overlay if dragged while in browser mode */}
              {dragActive && (
                <div className="absolute inset-4 rounded-xl border-3 border-dashed border-[#00BBF9] bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-20 shadow-2xl animate-in fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-[#00BBF9]/15 flex items-center justify-center text-[#00BBF9]">
                    <FolderDown className="w-8 h-8 animate-bounce" />
                  </div>
                  <div className="font-['Cinzel'] font-bold text-base text-slate-800">
                    Drop Stamp Files or Folders Here
                  </div>
                  <div className="text-xs text-slate-600 max-w-sm text-center">
                    Release to batch-process and import stamps directly into your custom vault.
                  </div>
                </div>
              )}

              {/* Search & Status Bar */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      selectedCategory === 'custom'
                        ? 'Search custom uploaded stamps...'
                        : 'Search assets by name or tag (e.g., castle, pine, wall, ship)...'
                    }
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-[#E2D6B5] rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#00BBF9] transition-colors"
                  />
                </div>

                <div className="flex items-center gap-2">
                  {selectedCategory === 'custom' && customAssets.length > 0 && (
                    <button
                      onClick={handlePermanentizeAssets}
                      disabled={isPermanentizing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#FF7E5F] to-[#D9480F] hover:from-[#f06d4e] hover:to-[#be3e0c] text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      title="Save all custom uploads permanently into src/assets/stamps/<category>/"
                    >
                      {isPermanentizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Make Permanent ({customAssets.length})</span>
                        </>
                      )}
                    </button>
                  )}

                  {selectedCategory === 'custom' && (
                    <button
                      onClick={() => setCurrentView('import')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#00BBF9] to-[#0096C7] hover:from-[#00a9e0] hover:to-[#0086b3] text-white font-bold rounded-lg text-xs shadow-xs transition-all cursor-pointer active:scale-95"
                      title="Open asset uploader to add more stamps"
                    >
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Import Assets / Folder</span>
                    </button>
                  )}

                  {uploadSuccessMsg && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-lg font-semibold shadow-xs animate-in fade-in">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{uploadSuccessMsg}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Category Heading for Custom Uploads */}
              {selectedCategory === 'custom' && (
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E2D6B5]/60 text-xs">
                  <div className="flex items-center gap-2 text-slate-700">
                    <span className="font-bold text-slate-800 font-['Cinzel']">Custom Uploads Vault</span>
                    <span className="text-[11px] text-slate-500 bg-[#EFE5C9] px-2 py-0.5 rounded-full font-semibold">
                      {filteredAssets.length} stamp{filteredAssets.length !== 1 ? 's' : ''} available
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 italic">
                    Click any stamp to select and place on canvas
                  </span>
                </div>
              )}

              {/* Asset Cards Grid - Full 100% Height */}
              <div className="flex-1 overflow-y-auto pr-1">
                {filteredAssets.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-500 gap-3 text-center px-4">
                    <div className="w-12 h-12 rounded-xl bg-[#FF7E5F]/15 text-[#FF7E5F] flex items-center justify-center">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-800 mb-1">
                        {allAssets.length === 0
                          ? 'Your Stamp Vault is Ready for Your Assets'
                          : selectedCategory === 'custom'
                          ? 'No Custom Stamps in Vault Yet'
                          : 'No assets found matching your criteria'}
                      </div>
                      <div className="text-xs text-slate-600 max-w-sm">
                        {allAssets.length === 0
                          ? 'All testing assets have been removed. Click below to import your self-made AI-extracted PNGs, WebPs, or entire asset folders!'
                          : selectedCategory === 'custom'
                          ? 'Click "Import Assets / Folder" to import your own PNG, WebP, SVG stamps or full folders into this vault.'
                          : 'Try clearing your search query or choosing another category from the sidebar.'}
                      </div>
                    </div>
                    {(allAssets.length === 0 || selectedCategory === 'custom') && (
                      <button
                        onClick={() => setCurrentView('import')}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#00BBF9] to-[#0096C7] hover:from-[#00a9e0] hover:to-[#0086b3] text-white font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                      >
                        <FolderDown className="w-4 h-4" />
                        <span>Open Asset & Folder Importer</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                      {displayedAssets.map((asset) => {
                        const isSelected = selectedAssetId === asset.id;

                        return (
                          <div
                            key={asset.id}
                            onClick={() => {
                              rememberRecent(asset.id);
                              onSelectAsset(asset);
                              onClose();
                            }}
                            className={`group relative flex flex-col items-center justify-between p-3 rounded-xl border transition-all cursor-pointer bg-white hover:bg-slate-50 shadow-xs hover:shadow-md ${
                              isSelected
                                ? 'border-[#00BBF9] ring-2 ring-[#00BBF9]/40 bg-[#00BBF9]/10'
                                : 'border-[#E2D6B5] hover:border-[#00BBF9]/60'
                            }`}
                          >
                            {/* Preview Icon */}
                            <div className="w-20 h-20 flex items-center justify-center my-1 group-hover:scale-105 transition-transform">
                              {asset.imageUrl ? (
                                <img
                                  src={asset.imageUrl}
                                  alt={asset.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="max-w-full max-h-full object-contain filter drop-shadow-md"
                                  referrerPolicy="no-referrer"
                                />
                              ) : asset.svgData ? (
                                <div
                                  className="w-full h-full flex items-center justify-center filter drop-shadow-md"
                                  dangerouslySetInnerHTML={{ __html: asset.svgData }}
                                />
                              ) : null}
                            </div>

                            {/* Name & Badge */}
                            <div className="w-full text-center mt-2">
                              <div className="text-xs font-bold text-slate-800 truncate" title={asset.name}>
                                {asset.name}
                              </div>
                              <div className="text-[10px] text-slate-500 capitalize truncate flex items-center justify-center gap-1">
                                {asset.isCustom && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-[#00BBF9]" />
                                )}
                                <span>{asset.category.replace('_', ' ')}</span>
                              </div>
                            </div>

                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(asset.id); }}
                              className={`absolute top-2 left-2 rounded p-1 border transition-opacity ${favoriteAssetIds.includes(asset.id) ? 'bg-amber-100 text-amber-600 border-amber-300 opacity-100' : 'bg-white/90 text-slate-400 border-slate-200 opacity-0 group-hover:opacity-100'}`}
                              title={favoriteAssetIds.includes(asset.id) ? 'Remove favorite' : 'Add favorite'}
                            >
                              <Star className="w-3.5 h-3.5" fill={favoriteAssetIds.includes(asset.id) ? 'currentColor' : 'none'} />
                            </button>

                            {/* Custom asset delete button */}
                            {asset.isCustom && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteCustomAsset(asset.id);
                                }}
                                className="absolute top-2 right-2 p-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                title="Delete custom stamp"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Progressive Chunk Loader */}
                    {visibleCount < filteredAssets.length && (
                      <div className="flex items-center justify-center gap-3 py-4 border-t border-[#E2D6B5]/60">
                        <button
                          onClick={() => setVisibleCount((prev) => Math.min(filteredAssets.length, prev + 48))}
                          className="px-5 py-2 bg-white hover:bg-amber-50 text-amber-900 border border-[#E2D6B5] hover:border-amber-400 font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-2"
                        >
                          <span>Load Next 48 Stamps</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({filteredAssets.length - visibleCount} remaining)
                          </span>
                        </button>
                        <button
                          onClick={() => setVisibleCount(filteredAssets.length)}
                          className="px-4 py-2 bg-[#F4EBD0] hover:bg-[#EFE5C9] text-slate-700 font-medium rounded-xl text-xs border border-[#E2D6B5] cursor-pointer transition-all"
                        >
                          Load All ({filteredAssets.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-between text-xs text-slate-600 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Showing <span className="font-bold text-[#D9480F]">{displayedAssets.length}</span> of <span className="font-bold text-slate-800">{filteredAssets.length}</span> stamps in vault
            </span>
            {customAssets.length > 0 && (
              <span className="text-slate-500">
                (<span className="font-bold text-[#00BBF9]">{customAssets.length}</span> custom uploads)
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-[#E2D6B5] transition-colors shadow-xs cursor-pointer"
          >
            Close Vault
          </button>
        </div>
      </div>
    </div>
  );
};
