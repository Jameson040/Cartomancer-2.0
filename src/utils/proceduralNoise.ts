/**
 * Cartomancer Fantasy Map Maker - Procedural Noise & Terrain Dynamics
 * Provides fast 2D Perlin/Simplex noise, FBM, fractal coastline jitter,
 * Worley cellular patterns, hydraulic erosion simulation, and color temperature jitter.
 */

// Permutation table for fast pseudo-random gradient lookups
const PERM = new Uint8Array(512);
const P = [
  151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,
  8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,
  35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,
  134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,
  55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,
  18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,
  250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,
  189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,
  172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,
  228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,
  107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,
  138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180
];
for (let i = 0; i < 256; i++) {
  PERM[i] = P[i];
  PERM[256 + i] = P[i];
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a);
}

function grad2d(hash: number, x: number, y: number): number {
  const h = hash & 7;
  const u = h < 4 ? x : y;
  const v = h < 4 ? y : x;
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
}

/**
 * 2D Perlin Noise in range [-1, 1]
 */
export function noise2D(x: number, y: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);

  const u = fade(xf);
  const v = fade(yf);

  const A = PERM[X] + Y;
  const B = PERM[X + 1] + Y;

  return lerp(
    v,
    lerp(u, grad2d(PERM[A], xf, yf), grad2d(PERM[B], xf - 1, yf)),
    lerp(u, grad2d(PERM[A + 1], xf, yf - 1), grad2d(PERM[B + 1], xf - 1, yf - 1))
  );
}

/**
 * Fractional Brownian Motion (Multi-octave noise) in range [-1, 1]
 */
export function fbm2D(x: number, y: number, octaves = 4, persistence = 0.5, lacunarity = 2.0): number {
  let total = 0;
  let frequency = 1;
  let amplitude = 1;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    total += noise2D(x * frequency, y * frequency) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return total / maxValue;
}

/**
 * Generates an organic, fractured polygon outline for coastline / land sculpting.
 * Instead of a rigid circle, this yields natural bays, crags, and peninsulas.
 */
export function generateFractalDabPoints(
  cx: number,
  cy: number,
  baseRadius: number,
  roughness: number = 0.4,
  numSteps: number = 24
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const angleStep = (Math.PI * 2) / numSteps;

  for (let i = 0; i < numSteps; i++) {
    const angle = i * angleStep;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);

    // Sample noise space offset by spatial coordinates
    const n = fbm2D((cx + nx * baseRadius) * 0.02, (cy + ny * baseRadius) * 0.02, 3, 0.5);
    const r = baseRadius * (1.0 + n * roughness);

    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  return points;
}

/**
 * Renders a natural fractal dab directly into a 2D canvas context.
 */
export function drawFractalDab(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  roughness: number,
  fillStyle: string,
  alpha: number
) {
  if (roughness <= 0.05) {
    // Fall back to fast radial gradient circle
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, fillStyle);
    grad.addColorStop(1, 'transparent');
    ctx.globalAlpha = alpha;
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const points = generateFractalDabPoints(cx, cy, radius, roughness, 28);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = points[i - 1];
    const mx = (curr.x + prev.x) / 2;
    const my = (curr.y + prev.y) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, mx, my);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Worley / Cellular Noise generator for generating procedural cracked stone,
 * cobblestone, or reptilian scales as a repeatable seamless pattern.
 */
export function generateCellularNoiseCanvas(
  size: number = 128,
  numCells: number = 24,
  baseColorHex: string = '#78716c',
  creviceColorHex: string = '#292524'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Generate random feature points
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < numCells; i++) {
    points.push({
      x: Math.random() * size,
      y: Math.random() * size,
    });
  }

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Parse colors
  const bc = hexToRgb(baseColorHex) || { r: 120, g: 113, b: 108 };
  const cc = hexToRgb(creviceColorHex) || { r: 41, g: 37, b: 36 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let minDist = Infinity;
      let secondMinDist = Infinity;

      // Wrap-around toroidal distance for seamless tiling
      for (const p of points) {
        for (let ox = -size; ox <= size; ox += size) {
          for (let oy = -size; oy <= size; oy += size) {
            const dx = x - (p.x + ox);
            const dy = y - (p.y + oy);
            const d = Math.hypot(dx, dy);
            if (d < minDist) {
              secondMinDist = minDist;
              minDist = d;
            } else if (d < secondMinDist) {
              secondMinDist = d;
            }
          }
        }
      }

      // Edge border detection (F2 - F1)
      const edge = Math.min(1, Math.max(0, (secondMinDist - minDist) / (size / numCells)));
      const idx = (y * size + x) * 4;

      data[idx] = Math.round(lerp(edge, cc.r, bc.r));
      data[idx + 1] = Math.round(lerp(edge, cc.g, bc.g));
      data[idx + 2] = Math.round(lerp(edge, cc.b, bc.b));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Procedural Simplex-style organic moss/grass canvas texture
 */
export function generateOrganicFbmPatternCanvas(
  size: number = 128,
  primaryHex: string = '#22c55e',
  accentHex: string = '#15803d'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const c1 = hexToRgb(primaryHex) || { r: 34, g: 197, b: 94 };
  const c2 = hexToRgb(accentHex) || { r: 21, g: 128, b: 61 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 4;
      const ny = (y / size) * 4;
      const n = (fbm2D(nx, ny, 4, 0.5) + 1) * 0.5; // normalized 0..1
      const idx = (y * size + x) * 4;

      data[idx] = Math.round(lerp(n, c1.r, c2.r));
      data[idx + 1] = Math.round(lerp(n, c1.g, c2.g));
      data[idx + 2] = Math.round(lerp(n, c1.b, c2.b));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Fast Hydraulic Erosion simulation pass.
 * Calculates slope drainage, carries sediment down valleys, and deposits on alluvial plains.
 */
export function simulateHydraulicErosion(
  elevationCanvas: HTMLCanvasElement,
  iterations: number = 5000,
  rainIntensity: number = 0.5
) {
  const width = elevationCanvas.width;
  const height = elevationCanvas.height;
  const ctx = elevationCanvas.getContext('2d');
  if (!ctx) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Convert 8-bit grayscale to height array
  const h = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    h[i] = data[i * 4];
  }

  // Droplet parameters
  const inertia = 0.05;
  const sedimentCapacityFactor = 4;
  const minSedimentCapacity = 0.01;
  const erodeSpeed = 0.3 * rainIntensity;
  const depositSpeed = 0.3 * rainIntensity;
  const maxDropletLifetime = 30;

  for (let iter = 0; iter < iterations; iter++) {
    let posX = Math.random() * (width - 2) + 1;
    let posY = Math.random() * (height - 2) + 1;
    let dirX = 0;
    let dirY = 0;
    let speed = 1;
    let water = 1;
    let sediment = 0;

    for (let step = 0; step < maxDropletLifetime; step++) {
      const nodeX = Math.floor(posX);
      const nodeY = Math.floor(posY);
      const xOffset = posX - nodeX;
      const yOffset = posY - nodeY;

      // Calculate height and slope via bilinear interpolation
      const idx00 = nodeY * width + nodeX;
      const idx10 = idx00 + 1;
      const idx01 = (nodeY + 1) * width + nodeX;
      const idx11 = idx01 + 1;

      const h00 = h[idx00];
      const h10 = h[idx10];
      const h01 = h[idx01];
      const h11 = h[idx11];

      const gradX = (h10 - h00) * (1 - yOffset) + (h11 - h01) * yOffset;
      const gradY = (h01 - h00) * (1 - xOffset) + (h11 - h10) * xOffset;

      // Update droplet direction with momentum
      dirX = dirX * inertia - gradX * (1 - inertia);
      dirY = dirY * inertia - gradY * (1 - inertia);

      const len = Math.hypot(dirX, dirY);
      if (len === 0) break;
      dirX /= len;
      dirY /= len;

      posX += dirX;
      posY += dirY;

      if (posX < 1 || posX >= width - 2 || posY < 1 || posY >= height - 2) {
        break;
      }

      // Height diff
      const currentHeight = h00 * (1 - xOffset) * (1 - yOffset) +
                            h10 * xOffset * (1 - yOffset) +
                            h01 * (1 - xOffset) * yOffset +
                            h11 * xOffset * yOffset;
      const nextNodeX = Math.floor(posX);
      const nextNodeY = Math.floor(posY);
      const nextHeight = h[nextNodeY * width + nextNodeX];
      const deltaH = nextHeight - currentHeight;

      // Capacity based on slope and speed
      const sedimentCapacity = Math.max(-deltaH * speed * water * sedimentCapacityFactor, minSedimentCapacity);

      if (sediment > sedimentCapacity || deltaH > 0) {
        // Deposit sediment
        const amountToDeposit = deltaH > 0
          ? Math.min(deltaH, sediment)
          : (sediment - sedimentCapacity) * depositSpeed;
        sediment -= amountToDeposit;
        h[idx00] += amountToDeposit * 0.25;
        h[idx10] += amountToDeposit * 0.25;
        h[idx01] += amountToDeposit * 0.25;
        h[idx11] += amountToDeposit * 0.25;
      } else {
        // Erode terrain
        const amountToErode = Math.min((sedimentCapacity - sediment) * erodeSpeed, -deltaH);
        sediment += amountToErode;
        h[idx00] = Math.max(0, h[idx00] - amountToErode * 0.25);
        h[idx10] = Math.max(0, h[idx10] - amountToErode * 0.25);
        h[idx01] = Math.max(0, h[idx01] - amountToErode * 0.25);
        h[idx11] = Math.max(0, h[idx11] - amountToErode * 0.25);
      }

      speed = Math.sqrt(speed * speed + Math.abs(deltaH) * 2);
      water *= 0.98; // evaporation
    }
  }

  // Write back to canvas
  for (let i = 0; i < width * height; i++) {
    const val = Math.min(255, Math.max(0, Math.round(h[i])));
    data[i * 4] = val;
    data[i * 4 + 1] = val;
    data[i * 4 + 2] = val;
    data[i * 4 + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Dual-Tone Organic Color Jitter.
 * Subtly shifts hue, saturation, and brightness for natural foliage and ground textures.
 */
export function applyColorJitter(baseHex: string, jitterFactor: number = 0.2): string {
  if (jitterFactor <= 0) return baseHex;
  const rgb = hexToRgb(baseHex);
  if (!rgb) return baseHex;

  // Convert to HSL
  let { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);

  // Apply subtle random drift
  const hueShift = (Math.random() - 0.5) * (jitterFactor * 40); // +/- up to 20 deg hue
  const satShift = (Math.random() - 0.5) * (jitterFactor * 0.25);
  const lightShift = (Math.random() - 0.5) * (jitterFactor * 0.2);

  h = (h + hueShift + 360) % 360;
  s = Math.max(0, Math.min(1, s + satShift));
  l = Math.max(0.05, Math.min(0.95, l + lightShift));

  const newRgb = hslToRgb(h, s, l);
  return rgbToHex(newRgb.r, newRgb.g, newRgb.b);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  return { h, s, l };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, (h / 360) + 1/3);
    g = hue2rgb(p, q, (h / 360));
    b = hue2rgb(p, q, (h / 360) - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Turbulence Modulation: Combine the brush stroke with 3-octave Simplex/Perlin noise
 * so elevation dabs produce craggy ridgelines, serrated granite crags, and broken shoulders
 * rather than uniform airbrushed circles.
 */
export function drawTurbulentElevationDab(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  roughness: number = 0.45,
  grayVal: number,
  alpha: number,
  profile: 'gaussian' | 'plateau' | 'ridge' | 'terraced' = 'gaussian'
): void {
  const steps = 32;
  const points: { x: number; y: number }[] = [];
  const angleStep = (Math.PI * 2) / steps;

  for (let i = 0; i < steps; i++) {
    const angle = i * angleStep;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    // 3-octave FBM noise around boundary
    const n = fbm2D((cx + nx * radius) * 0.04, (cy + ny * radius) * 0.04, 3, 0.55);
    const r = radius * Math.max(0.25, 1.0 + n * roughness);
    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + Math.sin(angle) * r,
    });
  }

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    const prev = points[i - 1];
    ctx.quadraticCurveTo(prev.x, prev.y, (curr.x + prev.x) / 2, (curr.y + prev.y) / 2);
  }
  ctx.closePath();
  ctx.clip();

  // Internal turbulent radial fill
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * (1 + roughness * 0.4));
  const innerColor = `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha})`;
  const outerColor = `rgba(${grayVal}, ${grayVal}, ${grayVal}, 0)`;

  if (profile === 'plateau') {
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.65, innerColor);
    grad.addColorStop(1, outerColor);
  } else if (profile === 'ridge') {
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.2, `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha * 0.85})`);
    grad.addColorStop(0.55, `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha * 0.35})`);
    grad.addColorStop(1, outerColor);
  } else if (profile === 'terraced') {
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.3, innerColor);
    grad.addColorStop(0.31, `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha * 0.7})`);
    grad.addColorStop(0.65, `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha * 0.7})`);
    grad.addColorStop(0.66, `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha * 0.35})`);
    grad.addColorStop(1, outerColor);
  } else {
    grad.addColorStop(0, innerColor);
    grad.addColorStop(0.4, `rgba(${grayVal}, ${grayVal}, ${grayVal}, ${alpha * 0.6})`);
    grad.addColorStop(1, outerColor);
  }

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

