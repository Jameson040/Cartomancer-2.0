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

  // Forts & Fortifications
  forts: 'forts',
  fort: 'forts',
  fortress: 'forts',
  fortresses: 'forts',
  rampart: 'forts',
  bastion: 'forts',
  outpost: 'forts',

  // Swamps & Marshes
  swamps: 'swamps',
  swamp: 'swamps',
  marsh: 'swamps',
  marshes: 'swamps',
  bog: 'swamps',
  bogs: 'swamps',
  fen: 'swamps',
  mangrove: 'swamps',

  // Lakes & Water bodies
  lakes: 'lakes',
  lake: 'lakes',
  pond: 'lakes',
  ponds: 'lakes',
  lagoon: 'lakes',
  lagoons: 'lakes',

  // Piers & Docks
  piers: 'piers',
  pier: 'piers',
  dock: 'piers',
  docks: 'piers',
  wharf: 'piers',
  jetty: 'piers',

  // Camping & Carriages
  camping_carriage: 'camping_carriage',
  camping: 'camping_carriage',
  camp: 'camping_carriage',
  camps: 'camping_carriage',
  carriage: 'camping_carriage',
  carriages: 'camping_carriage',
  wagon: 'camping_carriage',
  wagons: 'camping_carriage',
  cart: 'camping_carriage',
  tent: 'camping_carriage',
  tents: 'camping_carriage',
  caravan: 'camping_carriage',

  // Castles & Towers
  castles: 'castles',
  castle: 'castles',
  spires: 'castles',
  spire: 'castles',
  towers: 'castles',
  tower: 'castles',
  citadels: 'castles',
  citadel: 'castles',
  keeps: 'castles',
  keep: 'castles',
  palaces: 'castles',
  palace: 'castles',
  stronghold: 'castles',

  // Mountains & Relief
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

/**
 * Intelligent categorization based on folder name or filename
 */
export function inferCategoryFromName(nameOrPath: string): StampCategory {
  const clean = nameOrPath.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
  
  // Exact folder / token match
  for (const token of clean.split('_')) {
    if (token && FOLDER_TO_CATEGORY[token]) {
      return FOLDER_TO_CATEGORY[token];
    }
  }

  // Regex pattern matching
  if (/tree|forest|pine|oak|wood|flora|plant|bush|jungle|willow|grove/.test(clean)) return 'trees';
  if (/swamp|marsh|bog|fen|mangrove|mire|quagmire/.test(clean)) return 'swamps';
  if (/lake|pond|lagoon|reservoir/.test(clean)) return 'lakes';
  if (/pier|dock|wharf|quay|jetty/.test(clean)) return 'piers';
  if (/camp|carriage|wagon|cart|tent|caravan|yurt/.test(clean)) return 'camping_carriage';
  if (/fort|rampart|bastion|outpost/.test(clean)) return 'forts';
  if (/castle|spire|tower|citadel|keep|palace|stronghold/.test(clean)) return 'castles';
  if (/mountain|hill|peak|cliff|ridge|rock|cave|volcano|crag/.test(clean)) return 'mountains';
  if (/settlement|city|town|village|house|hamlet|farm|market|tavern|dwelling/.test(clean)) return 'settlements';
  if (/ship|boat|sea|maritime|ocean|anchor|kraken|vessel|harbor|isle|island/.test(clean)) return 'water_maritime';
  if (/building|wall|block|road|bridge|gate|fence|paved/.test(clean)) return 'building_blocks';
  if (/compass|banner|frame|cartouche|scroll|ribbon|border|badge|crest/.test(clean)) return 'decorations';
  if (/prop|chest|monster|relic|ruin|skull|dungeon|statue|altar/.test(clean)) return 'nature_props';

  // If a folder name exists and isn't recognized, return sanitized folder as category
  return clean || 'custom';
}

// Formats a raw file name into clean, human-readable Title Case
export function formatTitle(filename: string): string {
  const withoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanSpaced = withoutExt.replace(/[-_]+/g, ' ');
  return cleanSpaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Sensible proportional scale by archetype
export function getScaleForCategory(category: StampCategory): number {
  switch (category) {
    case 'mountains':
      return 1.4;
    case 'castles':
    case 'forts':
      return 1.2;
    case 'lakes':
      return 1.3;
    case 'piers':
      return 1.1;
    case 'swamps':
      return 1.0;
    case 'camping_carriage':
      return 0.9;
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
      category = FOLDER_TO_CATEGORY[folderName] || inferCategoryFromName(folderName) || inferCategoryFromName(filename);
    } else {
      category = inferCategoryFromName(filename);
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
