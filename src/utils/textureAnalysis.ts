/**
 * Cartomancer Fantasy Map Maker - Image & Texture Color Analysis Utilities
 * Safely extracts dominant colors, palettes, and terrain types from uploaded textures
 * without bitwise overflow or color corruption.
 */

import { BiomeTexture } from '../types';

export interface TextureAnalysisResult {
  dominantColor: string;
  roughnessColor: string;
  palette: string[];
  suggestedDetailType: BiomeTexture['detailType'];
  suggestedElevation: number;
}

/**
 * Convert RGB (0-255) to hex string (#rrggbb)
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Darken a hex color by a factor (e.g. 0.2 = 20% darker) for roughness/depth
 */
export function darkenHex(hex: string, factor: number = 0.25): string {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return '#333333';
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return rgbToHex(r * (1 - factor), g * (1 - factor), b * (1 - factor));
}

/**
 * Calculate HSL from RGB (r, g, b in 0..255)
 */
export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / d + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, l };
}

/**
 * Analyze an HTMLImageElement or Image data to extract dominant color, palette, and biome classification
 */
export function analyzeTextureImage(
  img: HTMLImageElement,
  fallbackName: string = ''
): TextureAnalysisResult {
  const canvas = document.createElement('canvas');
  const maxDim = 200; // Small sample size for instant analysis
  let w = img.naturalWidth || img.width || 64;
  let h = img.naturalHeight || img.height || 64;

  if (w > maxDim || h > maxDim) {
    const ratio = Math.min(maxDim / w, maxDim / h);
    w = Math.max(1, Math.round(w * ratio));
    h = Math.max(1, Math.round(h * ratio));
  }

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    // Default to grass if name indicates it
    const isGrass = /grass|green|meadow|lawn|pasture|field|forest/i.test(fallbackName);
    return {
      dominantColor: isGrass ? '#4d8236' : '#6b7280',
      roughnessColor: isGrass ? '#355c24' : '#4b5563',
      palette: [isGrass ? '#4d8236' : '#6b7280'],
      suggestedDetailType: isGrass ? 'grass' : 'rock',
      suggestedElevation: isGrass ? 20 : 50,
    };
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h).data;
  const totalPixels = w * h;

  // Step across pixels for fast sampling
  const step = Math.max(1, Math.floor(totalPixels / 2000));
  const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number; weight: number }>();
  let totalR = 0;
  let totalG = 0;
  let totalB = 0;
  let validCount = 0;

  for (let i = 0; i < imgData.length; i += step * 4) {
    const a = imgData[i + 3];
    if (a < 50) continue; // Skip transparent

    const r = imgData[i];
    const g = imgData[i + 1];
    const b = imgData[i + 2];

    totalR += r;
    totalG += g;
    totalB += b;
    validCount++;

    // Quantize into 16-step buckets (0, 16, 32... 240)
    const qr = Math.min(240, Math.floor(r / 16) * 16);
    const qg = Math.min(240, Math.floor(g / 16) * 16);
    const qb = Math.min(240, Math.floor(b / 16) * 16);
    const key = rgbToHex(qr, qg, qb);

    const hsl = rgbToHsl(r, g, b);
    // Give higher weight to colorful/saturated pixels over pure white or pitch black
    const saturationWeight = (hsl.s > 0.15 ? 1.5 : 0.7) * (hsl.l > 0.1 && hsl.l < 0.9 ? 1.2 : 0.6);

    const existing = colorBuckets.get(key);
    if (existing) {
      existing.count += 1;
      existing.weight += saturationWeight;
      existing.r = Math.round((existing.r + r) / 2);
      existing.g = Math.round((existing.g + g) / 2);
      existing.b = Math.round((existing.b + b) / 2);
    } else {
      colorBuckets.set(key, { count: 1, weight: saturationWeight, r, g, b });
    }
  }

  if (validCount === 0 || colorBuckets.size === 0) {
    return {
      dominantColor: '#4d8236',
      roughnessColor: '#355c24',
      palette: ['#4d8236'],
      suggestedDetailType: 'grass',
      suggestedElevation: 20,
    };
  }

  // Sort buckets by weighted prominence
  const sorted = Array.from(colorBuckets.values()).sort((a, b) => b.weight - a.weight);

  const top = sorted[0];
  const dominantColor = rgbToHex(top.r, top.g, top.b);
  const roughnessColor = darkenHex(dominantColor, 0.25);

  const palette = sorted.slice(0, 8).map((b) => rgbToHex(b.r, b.g, b.b));

  // Determine terrain detail type from dominant color & average HSL
  const avgR = totalR / validCount;
  const avgG = totalG / validCount;
  const avgB = totalB / validCount;
  const avgHsl = rgbToHsl(avgR, avgG, avgB);

  let suggestedDetailType: BiomeTexture['detailType'] = 'grass';
  let suggestedElevation = 20;

  const lowerName = fallbackName.toLowerCase();
  if (/grass|meadow|lawn|pasture|field|green|forest|wood|flora/i.test(lowerName)) {
    suggestedDetailType = 'grass';
    suggestedElevation = 20;
  } else if (/sand|desert|dune|beach/i.test(lowerName)) {
    suggestedDetailType = 'sand';
    suggestedElevation = 10;
  } else if (/snow|ice|frost|glacier/i.test(lowerName)) {
    suggestedDetailType = 'snow';
    suggestedElevation = 80;
  } else if (/rock|stone|cliff|mountain|crag|cobble/i.test(lowerName)) {
    suggestedDetailType = 'rock';
    suggestedElevation = 50;
  } else if (/swamp|marsh|bog/i.test(lowerName)) {
    suggestedDetailType = 'swamp';
    suggestedElevation = 5;
  } else {
    // Optical classification from hue & saturation:
    // Green: Hue 65° to 165°
    if (avgHsl.h >= 65 && avgHsl.h <= 165 && avgHsl.s > 0.15) {
      suggestedDetailType = 'grass';
      suggestedElevation = 20;
    }
    // Yellow/Gold/Sand: Hue 30° to 65°
    else if (avgHsl.h >= 30 && avgHsl.h < 65 && avgHsl.s > 0.2) {
      suggestedDetailType = 'sand';
      suggestedElevation = 10;
    }
    // Blue/Cyan/Water: Hue 165° to 255°
    else if (avgHsl.h > 165 && avgHsl.h <= 255 && avgHsl.s > 0.2) {
      suggestedDetailType = 'water';
      suggestedElevation = -5;
    }
    // Snow: Low saturation, very high lightness
    else if (avgHsl.s < 0.18 && avgHsl.l > 0.78) {
      suggestedDetailType = 'snow';
      suggestedElevation = 85;
    }
    // Dark volcanic: Low lightness
    else if (avgHsl.l < 0.22) {
      suggestedDetailType = 'volcanic';
      suggestedElevation = 40;
    }
    // Swamp: Olive-brown
    else if (avgHsl.h >= 50 && avgHsl.h <= 100 && avgHsl.l < 0.4) {
      suggestedDetailType = 'swamp';
      suggestedElevation = 5;
    }
    // Rock / Stone
    else {
      suggestedDetailType = 'rock';
      suggestedElevation = 45;
    }
  }

  return {
    dominantColor,
    roughnessColor,
    palette,
    suggestedDetailType,
    suggestedElevation,
  };
}
