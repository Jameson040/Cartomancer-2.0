# Cartomancer 2.0 — Feature Audit & Inkarnate-Level Upgrade Plan

## Executive assessment

Cartomancer already has a good rendering foundation: a typed project model, separate raster layers for land/texture/elevation, vector paths, stamps, labels, history, autosave, export, and a dynamically discovered asset library. It is currently a capable **illustration editor prototype**, not yet a full map-production system.

The largest gap is not the toolbar. It is the map data model and the editing ergonomics around it. Inkarnate-like quality requires deterministic, editable geographic data underneath the canvas instead of relying mainly on painted pixels and decorative stamps.

## What exists today

| Area | Current implementation | Assessment |
|---|---|---|
| Land and water | Alpha mask canvas, fractal brush, add/carve modes, coast ripples, auto beaching | Good prototype; needs polygon/region awareness, selections, and non-destructive edits |
| Biomes | Raster texture canvas, procedural patterns, custom biome records | Good visual base; needs region fill, palette rules, blend controls, and persistence in projects |
| Elevation | Grayscale canvas, relief, contours, world presets, erosion/deposition, derived topography | Ambitious; needs a real heightfield workflow, brush preview, and better performance off the UI thread |
| Rivers and roads | Editable point paths, smoothing, ribbons, taper, casing, textures, land masking | Good start; needs snapping, branching, node editing, flow-aware river generation, and path editing handles |
| Stamps | PNG/SVG discovery by folder, scatter/ribbon placement, transforms, tint, depth sorting | Useful library; needs asset metadata, deterministic scatter, grouping, multi-select, and asset packs |
| Labels | Curved text, banners, presets, rotation, styling | Strong prototype; needs collision avoidance, label hierarchy, editing handles, and export-safe fonts |
| Grid | Square, hex, isometric, coordinates, rhumb lines | Good tactical overlay; needs scale/unit calibration and print-safe styling |
| Atmosphere | Lighting, vignette, seasonal particles, parchment effects | Nice presentation layer; should stay non-destructive and export-configurable |
| Import/export | Reference image import, PNG/JPG/heightmap/large export | Needs project format versioning, SVG/PDF, transparent export, and robust recovery |
| Persistence | Local autosave, IndexedDB custom assets, JSON project path | Needs explicit project file schema migrations and an asset manifest |
| UI architecture | React coordinator plus domain hooks and rendering modules | Direction is correct; `App.tsx` is still very large and should continue to shrink |

## Important codebase findings

1. **Rendering is mostly a composite of canvases.** This is fast for painting, but makes region-level editing, selection, fill, and later re-editing difficult.
2. **Raster canvases are already included in the JSON save/autosave wrapper, but the file boundary was previously weakly typed and unversioned in practice.** The first reliability batch now adds a versioned file boundary, validation, migration handling, and persistence for elevation/reference-map configuration.
3. **The code already has hooks for drainage, gorge carving, erosion, and derived settlements, but these should be exposed as deliberate workflows with preview/accept/cancel instead of one-click destructive operations.**
4. **The README mentions modules that are not present in the checkout** (for example `fmgClimateEngine.ts` and `ProgressiveGeneratorModal.tsx`). Documentation should be corrected as part of the next cleanup pass.
5. **`renderPathsMasked` creates a full-size temporary canvas during rendering.** This is acceptable at prototype size but will become a bottleneck at 4K/8K or while dragging. Cache/reuse compositing buffers.
6. **Assets are discovered from filenames/folders only.** That is convenient now, but a production library needs a manifest with anchor point, category, tags, default scale, recommended layer, and license/source.
7. **The app is currently a single fixed 1400×900 document.** A mapmaker needs new-map presets, arbitrary dimensions, portrait/landscape, DPI/physical size, and a coordinate transform independent of screen pixels.

## Recommended target architecture

Keep the current canvas renderer, but add a lightweight map document model beside it:

- **Regions:** landmasses, islands, lakes, biome areas, territories, and water bodies with stable IDs.
- **Nodes and edges:** river junctions, roads, borders, coast graph, and settlement connections.
- **Heightfield:** a low-resolution editable height grid plus a derived display canvas.
- **Style/theme:** palettes, line styles, textures, typography, and paper/export settings.
- **Display layers:** visibility, lock, opacity, blend mode, and ordering.
- **Asset manifest:** project-local references to built-in/custom assets with embedded or external storage policy.
- **Command history:** commands/patches for region edits and object changes; keep raster checkpoints only when needed.

This gives the visual flexibility of painting while making procedural features and repeatable edits possible.

## Priority roadmap

### Phase 1 — Reliability and editor fundamentals

- Add a versioned project schema and migrations.
- Save/load mask, texture, and elevation canvases losslessly (PNG blobs or compressed typed arrays).
- Add new-map dialog: dimensions, aspect ratio, paper style, seed, and starter template.
- Add select/multi-select, marquee, duplicate, group, align, lock, hide, and delete.
- Add brush cursor preview, pressure-independent interpolation, and a reliable stroke transaction boundary.
- Reuse offscreen canvases and debounce expensive redraws.
- Add automated tests for coordinate transforms, path hit testing, mask painting, serialization, and meters/byte conversion.

### Phase 2 — Professional terrain workflow

- Region-aware land/water selection and fill.
- Coastline smoothing, simplify, expand/contract, island duplication, and transform.
- Biome fill by region with edge feathering and palette remapping.
- Heightfield brush modes: raise, lower, smooth, flatten, terrace, ridge, canyon, and blur.
- Non-destructive contour generation with interval/index-line styling.
- A procedural terrain generator with seed, preview, and accept/cancel.

### Phase 3 — Inkarnate-level world features

- River generator from heightfield with watershed boundaries, tributaries, lakes, and mouth detection.
- Road generator between settlements with terrain cost and bridge/ferry suggestions.
- Settlement generator based on coast, river, road, elevation, and population controls.
- Territory/region coloring with border hierarchy and label placement.
- Smart scatter: density maps, avoidance masks, clustering, rotation/scale distributions, and deterministic seed.
- Asset groups and themed packs that can be toggled without changing map geometry.

### Phase 4 — Presentation and publishing

- SVG/PDF export for labels, paths, borders, and grid; rasterize only texture layers.
- Print presets with bleed, DPI, trim guides, and paper profiles.
- Map-frame, compass, scale bar, legend, title cartouche, and coordinate annotations as editable objects.
- Theme editor for parchment, atlas, nautical chart, dark fantasy, and clean tactical styles.
- Web-worker rendering/generation and tiled export for very large maps.

## Suggested first implementation slice

The best next coding milestone is **Project Reliability + Smart Rivers**:

1. Make mask/texture/elevation part of the serialized project format.
2. Add a deterministic seed to the project.
3. Add a region/heightfield preview panel.
4. Generate a river network from the accepted heightfield with visible tributary nodes.
5. Let the user accept, edit, or discard generated rivers.

This will produce a visible quality jump without throwing away the current UI or asset work.

## Acceptance criteria for “Inkarnate-level” v1

- A user can make a landmass without painting every detail manually.
- A user can regenerate terrain/rivers without losing labels, stamps, or style.
- Every generated feature can be edited after creation.
- Save/load produces the same map, including raster layers and custom assets.
- Large maps remain responsive while panning, painting, and moving objects.
- Exported output matches the canvas at print and high-resolution sizes.
- Asset packs can be dropped in with metadata and do not require source edits.
