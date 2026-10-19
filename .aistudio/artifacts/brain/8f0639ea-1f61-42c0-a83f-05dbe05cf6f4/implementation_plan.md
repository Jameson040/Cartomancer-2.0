# Cartomancer Pro Studio — Inkarnate-Tier Workflow & AI Asset Pipeline Upgrade

An architectural and interactive workflow upgrade that transforms Cartomancer into a studio-grade cartography suite tailored for custom AI-extracted assets, seamless visual blending, direct on-canvas manipulation, and political territory mapping.

## User Review & Critical Decisions

> [!IMPORTANT]
> All core workflow priorities have been confirmed from your answers. Review the architectural summary below and click **Proceed** to begin implementation.

- **Confirmed Decision 1 — AI Asset & Stamp Placement Pipeline**:
  - **Multi-Stamp Brush Pool**: Select multiple stamp variations simultaneously so every click or scatter stroke randomly draws from the active pool.
  - **Smart AI Asset Import**: Auto-trim transparent borders and generate optional contact ground-shadows upon importing extracted PNGs.
  - **Unified Quick Variations Shelf**: Include custom uploaded assets directly alongside built-in variations in the stamp tool shelf.
- **Confirmed Decision 2 — Visual Blending & Native Map Integration**:
  - **Per-Stamp Color Grading**: Real-time Hue, Saturation, Brightness, and Contrast (HSBC) sliders for both brush placement defaults and selected stamps on the canvas.
  - **Dynamic Drop Shadows & Ambient Ground Occlusion**: Configurable shadow softness, offset, and ground contact darkening so extracted AI assets sit naturally in the terrain.
  - **Stamp Blend Modes**: Support `Normal`, `Multiply`, `Overlay`, and `Soft Light` compositing per stamp.
- **Confirmed Decision 3 — Canvas Ergonomics & Direct Manipulation**:
  - **Floating Context Action Bar**: Contextual toolbar hovering directly above selected stamps, paths, territories, or labels for instant access to scale, flip, z-order, lock, color grading, and duplicate.
  - **Right-Click Canvas Context Menu**: Quick actions at the cursor for Group/Ungroup, Lock/Unlock, Bring to Front/Send to Back, Copy/Paste Style, and Delete.
  - **Direct Canvas Wheel Hotkeys**: `Alt + Mouse Wheel` to dynamically resize the active brush/stamp or selected object, and `Shift + Mouse Wheel` to rotate on the fly.
- **Confirmed Decision 4 — Power Tools & UI Density**:
  - **Political Territory / Region Polygon Tool**: Draw kingdom borders and biome regions with translucent fills, dashed/double-line borders, and an inner border glow.
  - **Stamp Eraser / Thinning Brush**: Sweep across dense forests or mountain ranges with a configurable radius and thinning probability to organically clear or thin out placed stamps.
  - **Compact Collapsible Inspector**: Accordion sections in the left Tool Settings panel so primary brush and placement controls remain immediately reachable without vertical scrolling.

---

## 1. Overview & Core Concept

- **What It Does**: Elevates the map-making experience from a multi-panel utility into a fluid, canvas-first cartography workstation where custom AI-extracted stamps blend effortlessly into procedural terrain and every object can be styled, graded, and arranged directly on the canvas.
- **Target Audience / Persona**: Worldbuilders, tabletop RPG gamemasters, and fantasy cartographers who bring their own AI-generated asset packs and demand Inkarnate-level speed, visual cohesion, and artistic control.
- **Key Value**: Eliminates the "pasted sticker" look of external PNG assets through real-time HSBC grading, ambient ground shadows, and blend modes, while cutting repetitive sidebar trips via multi-stamp scatter pools, wheel hotkeys, and floating on-canvas controls.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **AI Asset Ingestion & Multi-Stamp Painting**: The user uploads one or more extracted PNG stamps. The importer automatically trims dead transparent margins and indexes them into the active category. The user `Shift/Ctrl + Clicks` 4 tree variations into an active **Multi-Stamp Pool** and paints a forest stroke—each dab randomly samples from the pool with organic scale and rotation jitter.
  2. **Seamless Visual Blending**: Selecting a placed stamp (or configuring the stamp brush) reveals **Color Grading (Hue, Saturation, Brightness, Contrast)**, **Ground Shadow**, and **Blend Mode** controls. Adjusting Hue or Brightness updates an offscreen cached canvas in real time so the asset matches the surrounding biome lighting.
  3. **Direct Canvas Manipulation**: Clicking any object on the canvas summons a sleek **Floating Context Action Bar** 16px above its bounding box with one-click Flip, Layer Z-Order, Lock, Copy Style, Paste Style, Duplicate, and Delete. Right-clicking opens a precision **Canvas Context Menu**. Holding `Alt + Wheel` scales the object or active brush radius; `Shift + Wheel` rotates it in 5° increments.
  4. **Political Territories & Stamp Thinning**: Switching to the Territory mode lets users click or drag vertices to form kingdoms and regions with customizable inner border glow, fill opacity, and auto-centered realm labels. Selecting the **Stamp Eraser Brush** lets users sweep a circle over crowded stamps to thin them by percentage density or erase them cleanly.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Obsidian Cartographic Studio—tactile, high-contrast dark slate workspace chrome that recedes behind illuminated parchment and vibrant fantasy terrain.
  - *Color Palette & Mood*: Deep obsidian surfaces (`#0f172a` / `#1e293b`), crisp hairline borders (`rgba(255,255,255,0.08)`), warm amber cartographic accents (`#f59e0b`), and semantic emerald/sky indicators.
  - *Typography & Hierarchy*: `Cinzel` for display headers and map titles, `Plus Jakarta Sans` for crisp single-line tool controls, and `JetBrains Mono` (`tabular-nums`) for all coordinate readouts, degree angles, and slider percentages.
  - *Component Styling & Layout*: Single-elevation dark glass floating bars (`backdrop-blur-md bg-slate-900/90 border border-slate-700/80`), compact collapsible accordion drawers in the left sidebar, and zero static pill clutter.
- **Interactive Feedback & Motion**:
  - Live brush preview ghost on the canvas showing exact stamp scale, rotation, HSBC grading, and scatter radius before clicking.
  - Smooth 150ms compositor transitions (`transform`, `opacity`) on floating toolbars and context menus.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Offscreen Memoized Canvas Pipeline for Per-Stamp HSBC Grading & Shadows**
  - *Chosen Approach*: Compute Hue, Saturation, Brightness, Contrast, and tint transformations on an offscreen `HTMLCanvasElement` keyed by `assetId + gradingHash` inside the stamp renderer cache.
  - *Why*: Applying `ctx.filter` directly on the main 2D canvas during every frame for hundreds of scattered trees causes severe frame drops during pan/zoom. Caching the graded bitmap per unique parameter combination guarantees 60 FPS panning even with 1,000+ graded stamps.
  - *Alternatives Considered*: Real-time CSS/Canvas filter per draw call (rejected due to frame latency on large maps).
- **Decision 2: Automatic Alpha-Bounding-Box Trimming on Asset Import**
  - *Chosen Approach*: Scan pixel alpha channels (`alpha > 12`) when a user imports custom PNG stamps to crop excess transparent padding and normalize the ground anchor point.
  - *Why*: AI background removers leave inconsistent transparent margins around extracted buildings and trees, causing giant invisible selection boxes and misaligned ground placement.
  - *Alternatives Considered*: Manual crop UI on every upload (rejected as too slow for batch asset imports).
- **Decision 3: Compartmentalized Domain Hooks & Rendering Modules**
  - *Chosen Approach*: Encapsulate territory polygon management, stamp brush pools, and canvas context actions into dedicated hooks and rendering modules rather than expanding the root coordinator.
  - *Why*: Keeps state transitions deterministic, prevents closure lag during rapid brush strokes, and maintains strict modularity.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Root Coordinator (App Shell)                          │
└───────────────┬──────────────────────────────────────────────┬───────────────┘
                │                                              │
                ▼                                              ▼
┌───────────────────────────────────────┐      ┌───────────────────────────────┐
│        Domain State & Hooks           │      │    Interactive UI Surfaces    │
│  ┌─────────────────────────────────┐  │      │  ┌─────────────────────────┐  │
│  │ Stamp Manager & Multi-Pool      │  │      │  │ Collapsible Tool Drawer │  │
│  │ (Pool sampling, HSBC, Locking,  │  │      │  │ (Pool picker, Grading,  │  │
│  │  Style Clipboard, Group IDs)    │  │      │  │  Shadow & Territory UI) │  │
│  └─────────────────────────────────┘  │      │  └─────────────────────────┘  │
│  ┌─────────────────────────────────┐  │      │  ┌─────────────────────────┐  │
│  │ Territory / Region Manager      │  │      │  │ Floating Selection Bar  │  │
│  │ (Polygon vertices, Inner Glow,  │  │      │  │ (Quick Flip, Z-Order,   │  │
│  │  Border Style, Realm Labels)    │  │      │  │  HSBC Popover, Lock)    │  │
│  └─────────────────────────────────┘  │      │  └─────────────────────────┘  │
│  ┌─────────────────────────────────┐  │      │  ┌─────────────────────────┐  │
│  │ Eraser & Stamp Thinning Brush   │  │      │  │ Right-Click Canvas Menu │  │
│  │ (Radius hit-test, Density %     │  │      │  │ (Group, Copy/Paste      │  │
│  │  probabilistic stamp removal)   │  │      │  │  Style, Layer Send)     │  │
│  └─────────────────────────────────┘  │      │  └─────────────────────────┘  │
└───────────────────┬───────────────────┘      └───────────────┬───────────────┘
                    │                                          │
                    └────────────────────┬─────────────────────┘
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Composite Canvas Rendering Pipeline                       │
│  ┌──────────────────┐  ┌────────────────────────┐  ┌──────────────────────┐  │
│  │ Territory Layer  │─▶│ Graded Stamp Renderer  │─▶│ Interactive Overlays │  │
│  │ (Polygon fill +  │  │ (Cached HSBC + Drop    │  │ (Brush Ghost, Pool   │  │
│  │  inner glow rim) │  │  Shadow + Blend Modes) │  │  Badge, Lasso/Gizmo) │  │
│  └──────────────────┘  └────────────────────────┘  └──────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Enhanced `PlacedStamp`**: Adds `hue?: number` (-180 to 180), `saturation?: number` (0 to 200%), `brightness?: number` (0 to 200%), `contrast?: number` (0 to 200%), `blendMode?: GlobalCompositeOperation`, `shadow?: { enabled: boolean; blur: number; offsetX: number; offsetY: number; opacity: number }`, `locked?: boolean`, and `groupId?: string`.
  - **Enhanced `BrushSettings`**: Adds `stampPoolIds?: string[]` for multi-stamp random variation, default stamp HSBC/shadow/blend settings, and `stampEraserDensity?: number` (10%–100% thinning strength).
  - **New `PlacedTerritory` Entity**: Stores `id`, `name`, `points: PathPoint[]`, `fillColor`, `fillOpacity`, `borderColor`, `borderWidth`, `innerGlowWidth`, `borderStyle: 'solid' | 'dashed' | 'double'`, and `locked?: boolean`.
- **Interactive Component & State Mapping**:
  - **Smart Asset Trimmer (`imageManager` / Import Pipeline)**: On custom stamp upload, reads image data onto a scratch canvas, finds `[minX, minY, maxX, maxY]` of non-transparent pixels, crops with a 4px safety margin, and registers the trimmed data URL.
  - **Multi-Stamp Pool & Quick Variations**: Clicking stamps with `Shift` or toggling the `+ Pool` badge adds/removes `assetId`s in `brushSettings.stampPoolIds`. Every dab in `placeStampsAt` picks `pool[Math.floor(Math.random() * pool.length)]`. Custom uploaded stamps appear automatically in the Quick Variations shelf when their category matches or under `Custom`.
  - **Floating Context Bar & Right-Click Menu**: Computed from the selected object's canvas bounding box transformed through the active `ViewportTransform` (`zoom`, `panX`, `panY`). Supports copying visual style (`hue`, `saturation`, `brightness`, `contrast`, `tint`, `shadow`, `blendMode`, `scale`, `opacity`) to a clipboard ref and applying it to any target selection.
  - **Canvas Wheel Hotkeys**: Inside the canvas wheel handler, if `e.altKey` is pressed, adjusts active brush size or selected object scale without zooming the viewport; if `e.shiftKey` is pressed, adjusts stamp/label rotation by ±5° per notch.
