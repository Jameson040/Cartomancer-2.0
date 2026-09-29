# Cartomancer - Fantasy Map Maker

Professional-grade fantasy map creator with progressive generation, Azgaar-inspired climate simulation, globe placement, biome painting, stamp asset library, watershed river tracing, and high-resolution export.

## Architecture & Codebase Overview

> For the current feature audit, implementation priorities, and custom asset intake requirements, see [`docs/PRODUCT_UPGRADE_PLAN.md`](docs/PRODUCT_UPGRADE_PLAN.md) and [`docs/ASSET_SPECIFICATION.md`](docs/ASSET_SPECIFICATION.md).

The entire application runs as a modern, modular React 19 + TypeScript + Vite + Tailwind CSS application located in `src/`:

- **`src/App.tsx`**: Main orchestration component managing canvas viewports, multi-layer rendering stacks, brush engine, undo/redo history, and modal interactions.
- **`src/components/`**:
  - `Navbar.tsx`: Unified Map Menu dropdown (import, export, save, load, templates, studios), undo/redo, topography toggle, and zoom controls.
  - `ToolPalette.tsx`: Floating mapmaker tool suite (Landmass, Ocean, Elevation, Biomes, Assets, Rivers, Roads, Borders, Labels, Measure).
  - `BrushSettingsPanel.tsx`: Context-sensitive settings panel for the active tool (brush radius, feather, jitter, flow, scatter, and elevation presets).
  - `MapImportModal.tsx`: Image uploader with automated coastline/landmass extraction, thresholding, and trace reference overlay.
  - `ExportModal.tsx`: High-resolution map exporter (PNG, JPG, Topography Contours, Heightmap, WebP up to 4K/8K).
  - `ProgressiveGeneratorModal.tsx`: Progressive climate simulation (globe placement, solar insolation, wind circulation, orographic rain shadows, Whitaker biomes).
  - `ShaderLabModal.tsx`: Procedural shader generator and image palette color eyedropper.
  - `AssetLibraryModal.tsx`: Stamp asset browser and custom asset uploader.
  - `AssetOutlinerModal.tsx`: Master asset table to search, inspect, center on, and delete placed map elements.
  - `TemplatesModal.tsx`: Starter realm presets (The Sundered Realm, Continental, Archipelago, Pangaea).
  - `LayersPanel.tsx`: Layer visibility and opacity inspector.
  - `HelpShortcutsModal.tsx`: Hotkey reference and tool documentation.
- **`src/utils/`**:
  - `canvasRenderer.ts`: Canvas drawing and layer composite renderer.
  - `fmgClimateEngine.ts`: Azgaar-inspired climate engine (insolation, winds, precipitation, biomes).
  - `elevationModel.ts`: World elevation modeling, topography derivation, and contour generation.
  - `proceduralNoise.ts`: Hydraulic erosion simulation, simplex/perlin noise, fractal dabs.
  - `assetStorage.ts`: IndexedDB persistence for custom uploaded stamps and assets.
  - `imageManager.ts`: Image caching and SVG asset generation.
  - `geometry.ts`: Distance calculation, point-near-path detection, and bezier math.
- **`src/data/`**:
  - `defaultAssets.ts`: Default stamp vector assets, symbols, and procedural biome definitions.
  - `templates.ts`: Preconfigured fantasy world maps and starter scenarios.
- **`src/types.ts`**: Unified TypeScript interfaces and data models.

