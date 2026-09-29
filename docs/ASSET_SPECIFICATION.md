# Cartomancer 2.0 — Custom Asset Intake Specification

Assets can be supplied in batches. The current loader automatically discovers images under `src/assets/stamps/<category>/`, but the quality and consistency of the library depend heavily on transparent padding, scale, and naming.

## Existing asset inventory

The repository already contains **153 usable stamp images**:

- Trees: 81
- Swamps: 39
- Forts: 18
- Lakes: 9
- Piers: 6

These are enough to continue development now. No additional assets are required for the next engineering pass. The current implementation work should focus on better scatter behavior, depth/anchor handling, library metadata, and using the existing stamps in procedural terrain workflows.

The folders that are currently empty (`mountains`, `settlements`, `castles`, `building_blocks`, `nature_props`, `water_maritime`, and `decorations`) are optional future expansion points, not blockers.

## Priority asset packs

### Pack A — Settlements and architecture

- Hamlet: 8–12 variants
- Village: 8–12 variants
- Town: 8–12 variants
- Walled town: 6–10 variants
- City: 6–10 variants
- Capital: 4–8 variants
- Castle/keep: 8–12 variants
- Fort/bastion/watchtower: 8–12 variants
- Ruins, monastery, temple, mine, lighthouse, mill, tavern, bridge, gate, walls

Each group should include small, medium, and large silhouettes so map density reads correctly at multiple zoom levels.

### Pack B — Terrain and natural features

- Mountain peaks, ridges, foothills, cliffs, mesas, volcanoes
- Individual trees: pine, oak, dead tree, palm, jungle, autumn, snow-covered
- Forest clusters in sparse, medium, and dense variants
- Marsh, mangrove, reeds, bog pools, rocks, boulders, caves, waterfalls
- Desert dunes, oasis, badlands, icebergs, glaciers

### Pack C — Water and maritime

- Lakes/ponds/lagoon shapes (small, medium, large)
- River mouths, waterfalls, rapids, bridges, fords
- Ships, boats, fishing vessels, wrecks, docks, piers, harbors, anchors, sea monsters

### Pack D — Map furniture and decoration

- Compass roses in 4–6 styles
- Scale bars, north arrows, cartouches, title plates, legends
- Border ornaments, corner flourishes, banners, seals, heraldic icons
- Terrain symbols for mines, ruins, shrines, battlefields, portals, dragons, and resources

### Pack E — Biome material textures

Seamless tiles for grass, dense forest, dry grass, desert sand, snow, rock, swamp, volcanic ash, parchment, cobblestone, dirt, and paved stone. Provide at least 512×512 and 1024×1024 versions where possible.

## Preferred technical format

### Stamps

- Preferred: transparent PNG or SVG.
- PNG: RGBA, sRGB, no matte/white background, 512–2048 px on the longest side.
- SVG: self-contained, no external fonts, no linked images, viewBox included.
- Keep meaningful artwork inside the canvas; avoid excessive transparent padding.
- Use a consistent light direction across a pack (recommended: upper-left).
- Use consistent line weight and palette inside each style pack.
- Do not bake map shadows into assets unless the shadow style is intentionally part of the pack.

### Textures

- PNG or WebP, seamless/tileable on all edges.
- Prefer power-of-two dimensions: 512, 1024, or 2048.
- Include a neutral/base version and, when useful, a dark/detail version.
- Avoid visible seams, watermarks, and strong directional lighting.

## Naming and folder convention

```text
src/assets/stamps/
  settlements/
    settlement_hamlet_01.png
    settlement_hamlet_02.png
  castles/
    castle_keep_01.png
  mountains/
    mountain_peak_snow_01.png
  trees/
    tree_pine_01.png
  building_blocks/
    bridge_stone_01.png
  nature_props/
    prop_ruins_01.png
  water_maritime/
    ship_sloop_01.png
  decorations/
    compass_rose_01.svg
```

The current loader infers categories from folder and filename tokens. Use simple lowercase words separated by underscores: `tree`, `forest`, `mountain`, `castle`, `town`, `bridge`, `ship`, `ruin`, `compass`, and so on.

## Metadata requested for each asset batch

The current image-only loader can work without this, but metadata will be needed for production-quality placement. Please provide a sidecar JSON or spreadsheet with:

| Field | Example |
|---|---|
| `id` | `settlement_town_01` |
| `displayName` | `Town 01` |
| `category` | `settlements` |
| `tags` | `town, human, temperate, walled` |
| `defaultScale` | `1.0` |
| `anchor` | `center` or `bottom-center` |
| `recommendedLayer` | `3` |
| `recommendedSize` | `small`, `medium`, `large` |
| `stylePack` | `parchment_ink_v1` |
| `license/source` | creator or license name |

Anchor points matter: trees and buildings generally want `bottom-center`; lakes and mountain groups want `center`; banners and compass roses may need a custom anchor.

## Batch delivery checklist

For each pack, provide:

1. The folder of assets using the convention above.
2. One contact sheet showing all assets with filenames.
3. The style name and intended map genre.
4. The light direction and nominal scale reference.
5. The license/ownership status.
6. Optional metadata sidecar.
7. Three or four example map screenshots showing intended density and layering.

## Recommended first delivery

To unlock the biggest visible improvement first, provide:

- 10 hamlets, 10 villages, 8 towns, 6 cities, 8 castles/keeps, 8 forts/towers.
- 20 mountain/foothill assets and 20 tree assets in the same visual style.
- 8 forest cluster stamps, 8 swamp stamps, 8 ruins/props.
- 6 bridges, 6 piers, 6 ships, and 6 river mouth/waterfall assets.
- 4 compass roses, 4 scale bars, 4 cartouches, and 4 border ornaments.
- Grass, forest, desert, snow, rock, swamp, water, parchment, dirt, and stone seamless textures.

A smaller, coherent pack is better than a large mixed-style pack. Consistency of line weight, palette, transparent padding, and light direction will improve the map more than raw asset count.
