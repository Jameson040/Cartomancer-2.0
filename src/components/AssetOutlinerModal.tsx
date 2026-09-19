/**
 * Cartomancer Fantasy Map Maker - Asset Outliner & Master Assets Table
 * Centralized registry and management for all entities rendered on the canvas
 */

import React, { useState, useMemo } from 'react';
import {
  PlacedStamp,
  PlacedPath,
  PlacedLabel,
  StampAsset,
} from '../types';
import { DEFAULT_STAMP_ASSETS } from '../data/defaultAssets';
import {
  X,
  Search,
  Trash2,
  Crosshair,
  Layers,
  MapPin,
  Waves,
  Route,
  Type,
  Shield,
  Trees,
  Mountain,
  Castle,
  CheckSquare,
  Square,
  Compass,
  Maximize2,
  Minimize2,
  Eye,
} from 'lucide-react';

interface AssetOutlinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  stamps: PlacedStamp[];
  paths: PlacedPath[];
  labels: PlacedLabel[];
  customAssets?: StampAsset[];
  onDeleteStamp: (id: string) => void;
  onDeletePath: (id: string) => void;
  onDeleteLabel: (id: string) => void;
  onDeleteBatch: (selection: { stampIds: string[]; pathIds: string[]; labelIds: string[] }) => void;
  onSelectAndFocus: (type: 'stamp' | 'path' | 'label', id: string, x: number, y: number) => void;
  selectedStampId: string | null;
  selectedPathId: string | null;
  selectedLabelId: string | null;
}

type TabType = 'all' | 'stamps' | 'rivers' | 'paths' | 'labels';

export const AssetOutlinerModal: React.FC<AssetOutlinerModalProps> = ({
  isOpen,
  onClose,
  stamps,
  paths,
  labels,
  customAssets = [],
  onDeleteStamp,
  onDeletePath,
  onDeleteLabel,
  onDeleteBatch,
  onSelectAndFocus,
  selectedStampId,
  selectedPathId,
  selectedLabelId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [isWide, setIsWide] = useState(false);

  // Asset Lookup map
  const assetMap = useMemo(() => {
    const map = new Map<string, StampAsset>();
    DEFAULT_STAMP_ASSETS.forEach((a) => map.set(a.id, a));
    customAssets.forEach((a) => map.set(a.id, a));
    return map;
  }, [customAssets]);

  // Normalized Table Items
  const items = useMemo(() => {
    const list: Array<{
      id: string;
      rawType: 'stamp' | 'path' | 'label';
      name: string;
      category: string;
      x: number;
      y: number;
      details: string;
      svgData?: string;
      color?: string;
      isSelected: boolean;
    }> = [];

    // 1. Stamps
    stamps.forEach((s) => {
      const asset = assetMap.get(s.assetId);
      const category = asset?.category || 'custom';
      list.push({
        id: s.id,
        rawType: 'stamp',
        name: asset?.name || s.assetId,
        category,
        x: Math.round(s.x),
        y: Math.round(s.y),
        details: `Scale: ${s.scale.toFixed(2)}x • Rot: ${Math.round(s.rotation)}°`,
        svgData: asset?.svgData,
        isSelected: selectedStampId === s.id,
      });
    });

    // 2. Paths (Rivers, Roads, Routes, Borders)
    paths.forEach((p) => {
      const isRiver = p.style === 'river';
      const category = isRiver ? 'rivers' : 'paths';
      const name =
        p.style === 'river'
          ? 'Waterway River'
          : p.style === 'trade_route'
          ? 'Trade Route (Naval/Land)'
          : p.style === 'road'
          ? 'Paved Road / Highway'
          : 'Territorial Border';
      const avgX =
        p.points.length > 0
          ? Math.round(p.points.reduce((acc, pt) => acc + pt.x, 0) / p.points.length)
          : 0;
      const avgY =
        p.points.length > 0
          ? Math.round(p.points.reduce((acc, pt) => acc + pt.y, 0) / p.points.length)
          : 0;

      list.push({
        id: p.id,
        rawType: 'path',
        name,
        category,
        x: avgX,
        y: avgY,
        details: `${p.points.length} nodes • Width: ${p.width}px`,
        color: p.color,
        isSelected: selectedPathId === p.id,
      });
    });

    // 3. Labels
    labels.forEach((l) => {
      list.push({
        id: l.id,
        rawType: 'label',
        name: `"${l.text}"`,
        category: 'labels',
        x: Math.round(l.x),
        y: Math.round(l.y),
        details: `${l.fontSize}px • ${l.fontFamily?.replace(/'/g, '') || 'Serif'}`,
        color: l.color,
        isSelected: selectedLabelId === l.id,
      });
    });

    return list;
  }, [stamps, paths, labels, assetMap, selectedStampId, selectedPathId, selectedLabelId]);

  // Aggregate Category Counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      settlements: 0,
      castles: 0,
      mountains: 0,
      trees: 0,
      decorations: 0,
      rivers: 0,
      paths: 0,
      labels: 0,
    };

    items.forEach((item) => {
      if (counts[item.category] !== undefined) {
        counts[item.category]++;
      } else {
        counts[item.category] = (counts[item.category] || 0) + 1;
      }
    });

    return counts;
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'stamps' && item.rawType !== 'stamp') return false;
      if (activeTab === 'rivers' && (item.rawType !== 'path' || item.category !== 'rivers')) return false;
      if (activeTab === 'paths' && (item.rawType !== 'path' || item.category === 'rivers')) return false;
      if (activeTab === 'labels' && item.rawType !== 'label') return false;

      // Category chip filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchCat = item.category.toLowerCase().includes(q);
        const matchCoords = `${item.x},${item.y}`.includes(q);
        if (!matchName && !matchCat && !matchCoords) return false;
      }

      return true;
    });
  }, [items, activeTab, selectedCategory, searchQuery]);

  // Selection handlers
  const toggleSelectItem = (id: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedCount = useMemo(() => {
    return Object.values(selectedItems).filter(Boolean).length;
  }, [selectedItems]);

  const selectAllFiltered = () => {
    const newSelection: Record<string, boolean> = {};
    filteredItems.forEach((i) => {
      newSelection[i.id] = true;
    });
    setSelectedItems(newSelection);
  };

  const deselectAll = () => {
    setSelectedItems({});
  };

  const handleDeleteItem = (item: (typeof items)[0]) => {
    if (item.rawType === 'stamp') {
      onDeleteStamp(item.id);
    } else if (item.rawType === 'path') {
      onDeletePath(item.id);
    } else if (item.rawType === 'label') {
      onDeleteLabel(item.id);
    }
  };

  const handleDeleteSelectedBatch = () => {
    const stampIds: string[] = [];
    const pathIds: string[] = [];
    const labelIds: string[] = [];

    Object.entries(selectedItems).forEach(([id, isSelected]) => {
      if (!isSelected) return;
      const target = items.find((i) => i.id === id);
      if (!target) return;
      if (target.rawType === 'stamp') stampIds.push(id);
      else if (target.rawType === 'path') pathIds.push(id);
      else if (target.rawType === 'label') labelIds.push(id);
    });

    if (stampIds.length === 0 && pathIds.length === 0 && labelIds.length === 0) return;
    onDeleteBatch({ stampIds, pathIds, labelIds });
    setSelectedItems({});
  };

  if (!isOpen) return null;

  return (
    <aside
      id="asset-outliner-panel"
      className={`fixed right-0 top-14 bottom-0 z-40 bg-[#FDF6E3] border-l-2 border-[#E2D6B5] shadow-2xl flex flex-col select-none overflow-hidden transition-all duration-200 text-slate-800 ${
        isWide ? 'w-[640px] max-w-[96vw]' : 'w-[440px] max-w-[92vw]'
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#F4EBD0] via-[#FDF6E3] to-[#F4EBD0] border-b border-[#E2D6B5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-[#14532d]/10 border border-[#14532d]/30 flex items-center justify-center text-[#14532d] shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-['Cinzel'] font-bold text-sm text-slate-800 tracking-wider truncate">
                Asset Table Inspector
              </h2>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#14532d] text-white shrink-0">
                {items.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 truncate">
              Click any row to locate on live map
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsWide(!isWide)}
            title={isWide ? 'Compact Panel' : 'Expand Panel'}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-[#E2D6B5]/60 rounded-lg transition-colors"
          >
            {isWide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            title="Close Asset Table"
            className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-[#E2D6B5]/60 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

        {/* Category Stat Chips */}
        <div className="px-6 py-2.5 bg-[#F4EBD0]/70 border-b border-[#E2D6B5] flex items-center gap-2 overflow-x-auto scrollbar-none text-xs">
          <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap">
            Quick Categories:
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-slate-800 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
            }`}
          >
            All Categories ({items.length})
          </button>

          {categoryCounts.settlements > 0 && (
            <button
              onClick={() => setSelectedCategory('settlements')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'settlements'
                  ? 'bg-[#14532d] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Castle className="w-3.5 h-3.5" />
              Settlements ({categoryCounts.settlements})
            </button>
          )}

          {categoryCounts.castles > 0 && (
            <button
              onClick={() => setSelectedCategory('castles')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'castles'
                  ? 'bg-[#14532d] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Castle className="w-3.5 h-3.5" />
              Fortresses ({categoryCounts.castles})
            </button>
          )}

          {categoryCounts.mountains > 0 && (
            <button
              onClick={() => setSelectedCategory('mountains')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'mountains'
                  ? 'bg-[#14532d] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Mountain className="w-3.5 h-3.5" />
              Relief / Mountains ({categoryCounts.mountains})
            </button>
          )}

          {categoryCounts.trees > 0 && (
            <button
              onClick={() => setSelectedCategory('trees')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'trees'
                  ? 'bg-[#14532d] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Trees className="w-3.5 h-3.5" />
              Forests ({categoryCounts.trees})
            </button>
          )}

          {categoryCounts.rivers > 0 && (
            <button
              onClick={() => setSelectedCategory('rivers')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'rivers'
                  ? 'bg-[#0369a1] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              Rivers ({categoryCounts.rivers})
            </button>
          )}

          {categoryCounts.paths > 0 && (
            <button
              onClick={() => setSelectedCategory('paths')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'paths'
                  ? 'bg-[#b45309] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              Routes & Roads ({categoryCounts.paths})
            </button>
          )}

          {categoryCounts.labels > 0 && (
            <button
              onClick={() => setSelectedCategory('labels')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'labels'
                  ? 'bg-[#7e22ce] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              Labels ({categoryCounts.labels})
            </button>
          )}

          {categoryCounts.decorations > 0 && (
            <button
              onClick={() => setSelectedCategory('decorations')}
              className={`px-2.5 py-1 rounded-full font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                selectedCategory === 'decorations'
                  ? 'bg-[#c2410c] text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-[#E2D6B5]'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              Shields & Crests ({categoryCounts.decorations})
            </button>
          )}
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-[#E2D6B5] flex flex-wrap items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#F4EBD0] p-1 rounded-lg border border-[#E2D6B5]">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'all'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Assets ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('stamps')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'stamps'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stamps ({stamps.length})
            </button>
            <button
              onClick={() => setActiveTab('rivers')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'rivers'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rivers ({categoryCounts.rivers || 0})
            </button>
            <button
              onClick={() => setActiveTab('paths')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'paths'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Roads & Routes ({categoryCounts.paths || 0})
            </button>
            <button
              onClick={() => setActiveTab('labels')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'labels'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Labels ({labels.length})
            </button>
          </div>

          {/* Search bar */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, category, or (x,y)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#FDF6E3] border border-[#E2D6B5] rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#14532d]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Batch Actions */}
          {selectedCount > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">
                {selectedCount} selected
              </span>
              <button
                onClick={handleDeleteSelectedBatch}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Selected
              </button>
              <button
                onClick={deselectAll}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Deselect
              </button>
            </div>
          ) : (
            <button
              onClick={selectAllFiltered}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-[#E2D6B5] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
              Select All Visible
            </button>
          )}
        </div>

        {/* Main Table */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#FDF6E3]">
          {filteredItems.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center">
              <Layers className="w-12 h-12 mb-2 stroke-1 opacity-50" />
              <p className="text-sm font-semibold text-slate-600">No assets match your search/filter</p>
              <p className="text-xs text-slate-500 mt-1">
                Try selecting "All Assets" or clearing the search bar
              </p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#E2D6B5] text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-[#F4EBD0]/50 sticky top-0 z-10 backdrop-blur-xs">
                  <th className="py-2.5 px-3 w-10 text-center">
                    <button
                      onClick={selectedCount === filteredItems.length ? deselectAll : selectAllFiltered}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      {selectedCount > 0 && selectedCount === filteredItems.length ? (
                        <CheckSquare className="w-4 h-4 text-[#14532d]" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-2.5 px-3 w-14 text-center">Preview</th>
                  <th className="py-2.5 px-3">Asset / Element Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Coordinates (X, Y)</th>
                  <th className="py-2.5 px-3">Details</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2D6B5]/60 text-xs">
                {filteredItems.map((item) => {
                  const isChecked = !!selectedItems[item.id];
                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectAndFocus(item.rawType, item.id, item.x, item.y)}
                      className={`group hover:bg-[#F4EBD0]/90 transition-colors cursor-pointer ${
                        item.isSelected
                          ? 'bg-[#14532d]/15 font-medium border-l-4 border-l-[#14532d]'
                          : isChecked
                          ? 'bg-amber-50'
                          : 'bg-white/70'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectItem(item.id);
                          }}
                          className="text-slate-400 hover:text-slate-700"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-[#14532d]" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Preview */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="w-9 h-9 rounded-md bg-[#F4EBD0] border border-[#E2D6B5] flex items-center justify-center overflow-hidden mx-auto">
                          {item.rawType === 'stamp' && item.svgData ? (
                            <div
                              className="w-7 h-7 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain"
                              dangerouslySetInnerHTML={{ __html: item.svgData }}
                            />
                          ) : item.rawType === 'path' ? (
                            <Waves
                              className="w-5 h-5"
                              style={{ color: item.color || '#38bdf8' }}
                            />
                          ) : (
                            <Type
                              className="w-5 h-5"
                              style={{ color: item.color || '#000' }}
                            />
                          )}
                        </div>
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                          {item.name}
                          {item.isSelected && (
                            <span className="text-[10px] px-1.5 py-0.2 bg-[#14532d] text-white rounded-sm">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {item.id}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#E2D6B5]/60 text-slate-700 capitalize">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Coordinates */}
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        X: {item.x}, Y: {item.y}
                      </td>

                      {/* Details */}
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {item.details}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Locate & Highlight */}
                          <button
                            title="Center on Map & Select"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectAndFocus(item.rawType, item.id, item.x, item.y);
                            }}
                            className="p-1.5 text-teal-700 hover:text-white hover:bg-teal-700 rounded-md transition-colors"
                          >
                            <Crosshair className="w-4 h-4" />
                          </button>

                          {/* Delete Item Directly */}
                          <button
                            title="Delete Item from Map"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteItem(item);
                            }}
                            className="p-1.5 text-red-600 hover:text-white hover:bg-red-600 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-[#F4EBD0] border-t border-[#E2D6B5] flex items-center justify-between text-xs text-slate-600 shrink-0">
          <div>
            Showing <strong className="text-slate-800">{filteredItems.length}</strong> of{' '}
            <strong className="text-slate-800">{items.length}</strong> items
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-800 font-semibold rounded-lg border border-[#E2D6B5] transition-colors"
            >
              Done
            </button>
          </div>
        </div>
    </aside>
  );
};
