/**
 * Cartomancer Fantasy Map Maker - Default Assets & Biome Textures
 * Built-in library of high-contrast biomes & stamp registry
 */

import { BiomeTexture, StampAsset } from '../types';

export const DEFAULT_BIOMES: BiomeTexture[] = [
  {
    id: 'lush_grass',
    name: 'Lush Meadow',
    color: '#5b8e3d',
    roughnessColor: '#436d29',
    detailType: 'grass',
    defaultElevation: 15,
  },
  {
    id: 'highland_forest',
    name: 'Highland Pine',
    color: '#345e33',
    roughnessColor: '#244524',
    detailType: 'grass',
    defaultElevation: 35,
  },
  {
    id: 'golden_sand',
    name: 'Golden Desert',
    color: '#d4a853',
    roughnessColor: '#be913c',
    detailType: 'sand',
    defaultElevation: 10,
  },
  {
    id: 'snow_peaks',
    name: 'Glacial Snow',
    color: '#e2edf8',
    roughnessColor: '#b8d2eb',
    detailType: 'snow',
    defaultElevation: 85,
  },
  {
    id: 'mountain_stone',
    name: 'Rocky Ridge',
    color: '#7a7672',
    roughnessColor: '#585552',
    detailType: 'rock',
    defaultElevation: 60,
  },
  {
    id: 'swamp_marsh',
    name: 'Murky Marsh',
    color: '#4a573e',
    roughnessColor: '#36402d',
    detailType: 'swamp',
    defaultElevation: 5,
  },
  {
    id: 'volcanic_ash',
    name: 'Volcanic Basalt',
    color: '#383032',
    roughnessColor: '#682522',
    detailType: 'volcanic',
    defaultElevation: 50,
  },
  {
    id: 'shallow_shallows',
    name: 'Coastal Lagoon',
    color: '#369ab8',
    roughnessColor: '#217894',
    detailType: 'water',
    defaultElevation: -5,
  },
  {
    id: 'deep_ocean',
    name: 'Abyssal Ocean',
    color: '#1a365d',
    roughnessColor: '#10243e',
    detailType: 'water',
    defaultElevation: -40,
  },
  {
    id: 'ancient_parchment',
    name: 'Aged Parchment',
    color: '#e4d3a8',
    roughnessColor: '#c9b483',
    detailType: 'parchment',
    defaultElevation: 20,
  },
  {
    id: 'cobblestone',
    name: 'Cobblestone',
    color: '#83868c',
    roughnessColor: '#63656b',
    detailType: 'cobble',
    defaultElevation: 18,
  },
  {
    id: 'red_mesa',
    name: 'Red Mesa Badlands',
    color: '#b85d38',
    roughnessColor: '#934323',
    detailType: 'sand',
    defaultElevation: 45,
  },
];

import { loadDiscoveredStamps } from '../utils/dynamicAssetLoader';

// Built-in stamp assets array auto-populated from /src/assets/stamps/ folder tree
export const DEFAULT_STAMP_ASSETS: StampAsset[] = loadDiscoveredStamps();
