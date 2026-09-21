# Project Rules: Codebase Compartmentalization & Architecture

## Core Mandate: Keep Codebase Compartmentalized
All code in this project must follow a strict modular and compartmentalized architecture. Files should be kept small, focused, and decoupled (targeting 50–100+ modular files rather than a few monolithic files).

---

## Architectural Taxonomy

### 1. Root Coordinator (`src/App.tsx`)
- `App.tsx` acts **exclusively as a coordinator and layout shell**.
- It must **never** host massive blocks of domain-specific logic, giant multi-branch switch statements, or inline canvas rendering loops.
- All stateful domains must be encapsulated inside specialized custom hooks.

### 2. Domain Hooks (`src/hooks/`)
- Each major functional domain has its own hook:
  - `useLayers`: Layer visibility, opacity, locking, and synchronization.
  - `useStampManager`: Placement, selection, z-indexing, duplication, and deletion of stamp assets.
  - `usePathManager`: Spline drafting, snapping, styling, river gorge carving, and committing paths.
  - `useLabelManager`: Typography creation, curving, style presets, and placement.
  - `useTransformManager`: Bounding box calculation, drag translation, rotation, and proportional scaling.
  - `useEraser`: Targeted mask/texture/elevation erasing and history commit.
  - `useViewport`: Zoom, pan, and screen-to-canvas coordinate translation.
  - `useMapHistory`: Undo/redo stack management and snapshot serialization.
  - `useAutosave`: LocalStorage recovery drafts and File System Access API integration.
  - `useKeyboardShortcuts`: Global hotkeys and shortcut bindings.
- New interactive tools or subsystem managers exceeding 80–100 lines must be extracted into their own hook in `src/hooks/`.

### 3. Rendering Modules (`src/utils/rendering/`)
- Canvas rendering logic is separated by composite layer in `src/utils/rendering/`:
  - `renderWater.ts`: Ocean gradients, depth fills, and water shading.
  - `renderLandmass.ts`: Landmass fills, coastline outlines, and coastal foam ripples.
  - `renderTextures.ts`: Biome textures, procedural pattern shaders, and stippling.
  - `renderRelief.ts`: NW hillshading relief, contour elevation lines, and snow caps.
  - `renderPaths.ts`: Vector waterways, trade routes, double-line borders, and rivers.
  - `renderStamps.ts`: Depth-sorted stamp objects, mountain ranges, trees, and castles.
  - `renderLabels.ts`: Arced text, banner ribbons, and typography.
  - `renderGrid.ts`: Tactical square, hex, isometric grids, and rhumb lines.
  - `renderAtmosphere.ts`: Day/night lighting tint, vignette, and seasonal particles.
  - `renderExport.ts`: Multi-scale supersampling and high-resolution export pipeline.
- `CanvasRenderer` (`src/utils/canvasRenderer.ts`) coordinates these modules in strict bottom-up composite order.

### 4. Algorithmic & Storage Utilities (`src/utils/`)
- Pure calculations and external services belong in `src/utils/`:
  - `elevationModel.ts`: Topography generation, hydrological flow, and river gorge carving.
  - `proceduralNoise.ts`: Perlin/simplex noise, hydraulic erosion simulation.
  - `bezierSplines.ts` & `pathSmoothing.ts`: Vector curve calculations and spline interpolation.
  - `hitTesting.ts`: Geometry collision detection for stamps, paths, and labels.
  - `imageManager.ts` & `assetStorage.ts`: IndexedDB and in-memory asset caching.
  - `dynamicAssetLoader.ts`: Auto-discovery and classification of stamp assets dropped into `/src/assets/stamps/`.

### 5. UI Subcomponents (`src/components/`)
- Modals, tool drawers, palettes, and inspectors are independent React components with typed props.
- Each interactive button, toggle, and slider must have a unique `id` attribute.

---

## Why This Rule Exists (Reasoning)

1. **AI Precision & Surgical Edits**:
   - Smaller files prevent context window saturation and eliminate the risk of code truncation during edits.
   - When an AI agent updates one subsystem (e.g. Atmosphere lighting), it only touches `renderAtmosphere.ts` or `useLayers.ts`, preventing unintended regressions in unrelated systems (e.g. Elevation or Stamps).

2. **Elimination of Cross-Talk & State Closure Lag**:
   - Monolithic components suffer from stale React closure bugs (where one layer toggle lags and triggers on the next action). Isolated hooks with immediate ref synchronization ensure that state changes are instantaneous and deterministic.

3. **Isolated Testability & Fast Compilation**:
   - TypeScript compiler (`tsc --noEmit`) and bundler can pinpoint exact lines and interfaces in small modules, making debugging instantaneous.

4. **Extensibility**:
   - Adding a new tool (e.g. weather system, compass rose, or territory shading) requires only creating a new hook/rendering module and plugging it into the coordinator without modifying existing code paths.
