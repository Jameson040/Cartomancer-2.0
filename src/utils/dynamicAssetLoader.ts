/**
 * Cartomancer Fantasy Map Maker - Dynamic Folder Asset Auto-Discovery
 *
 * Scans /src/assets/stamps/ recursively. Any image placed into this directory or
 * any of its subfolders (mountains/, trees/, settlements/, etc.) is automatically
 * discovered, categorized, and integrated with zero code changes.
 */

import { StampAsset, StampCategory } from '../types';

// Map folder names to recognized StampCategory types
const FOLDER_TO_CATEGORY: Record<string, StampCategory> = {
  // Mountains
  mountains: 'mountains',
  mountain: 'mountains',
  hills: 'mountains',
  hill: 'mountains',
  peaks: 'mountains',
  peak: 'mountains',
  volcano: 'mountains',
  volcanoes: 'mountains',
  cliffs: 'mountains',
  cliff: 'mountains',
  rocks: 'mountains',
  rock: 'mountains',
  caves: 'mountains',
  cave: 'mountains',

  // Trees
  trees: 'trees',
  tree: 'trees',
  forest: 'trees',
  forests: 'trees',
  flora: 'trees',
  plant: 'trees',
  plants: 'trees',
  pines: 'trees',
  pine: 'trees',
  oaks: 'trees',
  oak: 'trees',
  jungle: 'trees',
  wood: 'trees',
  woods: 'trees',

  // Settlements
  settlements: 'settlements',
  settlement: 'settlements',
  cities: 'settlements',
  city: 'settlements',
  towns: 'settlements',
  town: 'settlements',
  villages: 'settlements',
  village: 'settlements',
  hamlets: 'settlements',
  hamlet: 'settlements',
  houses: 'settlements',
  dwellings: 'settlements',

  // Castles
  castles: 'castles',
  castle: 'castles',
  fortresses: 'castles',
  fortress: 'castles',
  spires: 'castles',
  spire: 'castles',
  towers: 'castles',
  tower: 'castles',
  citadels: 'castles',
  citadel: 'castles',
  keeps: 'castles',
  keep: 'castles',
  palaces: 'castles',

  // Building Blocks
  building_blocks: 'building_blocks',
  buildings: 'building_blocks',
  walls: 'building_blocks',
  wall: 'building_blocks',
  bridges: 'building_blocks',
  bridge: 'building_blocks',
  roads: 'building_blocks',
  road: 'building_blocks',
  gates: 'building_blocks',
  gate: 'building_blocks',

  // Nature Props
  nature_props: 'nature_props',
  props: 'nature_props',
  prop: 'nature_props',
  dungeons: 'nature_props',
  dungeon: 'nature_props',
  monsters: 'nature_props',
  monster: 'nature_props',
  relics: 'nature_props',
  relic: 'nature_props',
  ruins: 'nature_props',
  ruin: 'nature_props',
  camps: 'nature_props',
  camp: 'nature_props',
  skulls: 'nature_props',
  skull: 'nature_props',

  // Water & Maritime
  water_maritime: 'water_maritime',
  maritime: 'water_maritime',
  ships: 'water_maritime',
  ship: 'water_maritime',
  boats: 'water_maritime',
  boat: 'water_maritime',
  vessels: 'water_maritime',
  ocean: 'water_maritime',
  sea: 'water_maritime',
  islands: 'water_maritime',
  island: 'water_maritime',
  anchors: 'water_maritime',
  anchor: 'water_maritime',
  krakens: 'water_maritime',

  // Decorations
  decorations: 'decorations',
  decoration: 'decorations',
  compass: 'decorations',
  compasses: 'decorations',
  banners: 'decorations',
  banner: 'decorations',
  borders: 'decorations',
  border: 'decorations',
  frames: 'decorations',
  cartouches: 'decorations',
  ribbons: 'decorations',

  // Custom
  custom: 'custom',
};

// Formats a raw file name into clean, human-readable Title Case
function formatTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanSpaced = withoutExt.replace(/[-_]+/g, ' ');
  return cleanSpaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Sensible proportional scale by archetype
function getScaleForCategory(category: StampCategory): number {
  switch (category) {
    case 'mountains':
      return 1.4;
    case 'castles':
      return 1.2;
    case 'settlements':
      return 1.0;
    case 'trees':
      return 0.8;
    case 'nature_props':
      return 0.9;
    case 'decorations':
      return 1.0;
    default:
      return 1.0;
  }
}

// Vite dynamic glob: scans all supported image formats in /src/assets/stamps/
const stampFiles = import.meta.glob<{ default: string }>(
  '/src/assets/stamps/**/*.{png,PNG,jpg,JPG,jpeg,JPEG,svg,SVG,webp,WEBP,avif,AVIF,gif,GIF}',
  { eager: true }
);

/**
 * Discovers and returns all stamp assets currently present in the asset folders.
 */
export function loadDiscoveredStamps(): StampAsset[] {
  const discovered: StampAsset[] = [];

  for (const [filePath, moduleExport] of Object.entries(stampFiles)) {
    const relPath = filePath.replace(/^\/src\/assets\/stamps\//, '');
    const pathParts = relPath.split('/');

    let category: StampCategory = 'custom';
    const filename = pathParts[pathParts.length - 1];

    if (pathParts.length > 1) {
      const folderName = pathParts[0].toLowerCase();
      category = FOLDER_TO_CATEGORY[folderName] || 'custom';
    } else {
      // Directly in root folder, try matching keywords
      const lower = filename.toLowerCase();
      for (const [key, cat] of Object.entries(FOLDER_TO_CATEGORY)) {
        if (lower.includes(key)) {
          category = cat;
          break;
        }
      }
    }

    const title = formatTitle(filename);
    const cleanId = `discovered_${category}_${filename.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`;
    const exp = moduleExport as any;
    const imageUrl: string =
      typeof exp === 'string'
        ? exp
        : exp && typeof exp.default === 'string'
        ? exp.default
        : '';

    if (imageUrl) {
      discovered.push({
        id: cleanId,
        name: title,
        category,
        imageUrl,
        defaultScale: getScaleForCategory(category),
        tags: [category, 'folder_asset', ...pathParts.slice(0, -1)],
        isCustom: false,
      });
    }
  }

  return discovered;
}
