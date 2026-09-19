/**
 * Cartomancer Fantasy Map Maker - Canny Edge Detection & Antique Parchment Inking Engine
 * Transforms full-color canvas renders into authentic hand-drawn fantasy parchment maps:
 * 1. Grayscale & Luminance extraction
 * 2. Gaussian smoothing
 * 3. Sobel gradient magnitude & direction
 * 4. Non-Maximum Suppression (NMS) for crisp thin ink linework
 * 5. Hysteresis thresholding driven by user drag-bar
 * 6. Parchment paper tone baking & antique ink compositing
 */

export interface ParchmentFilterOptions {
  enabled?: boolean;
  inkThreshold?: number; // 10 - 90 (default: 45)
  inkStrength?: number; // 0.4 - 1.0 (default: 0.9)
  paperTone?: 'warm_antique' | 'aged_vellum' | 'sepia_wash';
  includePaperGrain?: boolean;
  waterToneWash?: boolean;
}

export class CannyParchmentFilter {
  /**
   * Generates a parchment canvas from a source canvas
   */
  public static process(
    sourceCanvas: HTMLCanvasElement,
    options: ParchmentFilterOptions = {}
  ): HTMLCanvasElement {
    const {
      inkThreshold = 45,
      inkStrength = 0.9,
      paperTone = 'warm_antique',
      includePaperGrain = true,
      waterToneWash = true,
    } = options;

    const width = sourceCanvas.width;
    const height = sourceCanvas.height;

    // 1. Create working canvas and get pixel data
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return sourceCanvas;

    tempCtx.drawImage(sourceCanvas, 0, 0);
    const srcImgData = tempCtx.getImageData(0, 0, width, height);
    const srcPix = srcImgData.data;

    // 2. Grayscale buffer
    const gray = new Float32Array(width * height);
    for (let i = 0, p = 0; i < srcPix.length; i += 4, p++) {
      // Perceptual luminance formula
      gray[p] = 0.299 * srcPix[i] + 0.587 * srcPix[i + 1] + 0.114 * srcPix[i + 2];
    }

    // 3. Fast Gaussian 3x3 blur
    const blurred = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      const rowOffset = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = rowOffset + x;
        blurred[idx] =
          (gray[idx - width - 1] + 2 * gray[idx - width] + gray[idx - width + 1] +
           2 * gray[idx - 1] + 4 * gray[idx] + 2 * gray[idx + 1] +
           gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1]) / 16;
      }
    }

    // 4. Sobel Gradients (Magnitude & Quantized Direction)
    const magnitude = new Float32Array(width * height);
    const direction = new Uint8Array(width * height); // 0 = 0deg, 1 = 45deg, 2 = 90deg, 3 = 135deg

    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        // Sobel X
        const gx =
          -blurred[idx - width - 1] + blurred[idx - width + 1] -
          2 * blurred[idx - 1] + 2 * blurred[idx + 1] -
          blurred[idx + width - 1] + blurred[idx + width + 1];

        // Sobel Y
        const gy =
          -blurred[idx - width - 1] - 2 * blurred[idx - width] - blurred[idx - width + 1] +
          blurred[idx + width - 1] + 2 * blurred[idx + width] + blurred[idx + width + 1];

        const mag = Math.hypot(gx, gy);
        magnitude[idx] = mag;

        // Angle in radians (-PI to PI)
        let angle = Math.atan2(gy, gx) * (180 / Math.PI);
        if (angle < 0) angle += 180;

        if ((angle >= 0 && angle < 22.5) || (angle >= 157.5 && angle <= 180)) {
          direction[idx] = 0; // Horizontal
        } else if (angle >= 22.5 && angle < 67.5) {
          direction[idx] = 1; // 45 deg diagonal
        } else if (angle >= 67.5 && angle < 112.5) {
          direction[idx] = 2; // Vertical
        } else {
          direction[idx] = 3; // 135 deg diagonal
        }
      }
    }

    // 5. Non-Maximum Suppression (NMS)
    const nms = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        const mag = magnitude[idx];
        const dir = direction[idx];

        let q = 0;
        let r = 0;

        if (dir === 0) {
          q = magnitude[idx + 1];
          r = magnitude[idx - 1];
        } else if (dir === 1) {
          q = magnitude[idx - width + 1];
          r = magnitude[idx + width - 1];
        } else if (dir === 2) {
          q = magnitude[idx - width];
          r = magnitude[idx + width];
        } else if (dir === 3) {
          q = magnitude[idx - width - 1];
          r = magnitude[idx + width + 1];
        }

        if (mag >= q && mag >= r) {
          nms[idx] = mag;
        } else {
          nms[idx] = 0;
        }
      }
    }

    // 6. Double Thresholding (Hysteresis)
    // Scale user threshold (10..90) into sensitivity
    // Lower threshold = detects finer/lighter lines
    const highThreshold = Math.max(15, (100 - inkThreshold) * 1.8);
    const lowThreshold = highThreshold * 0.45;

    const edges = new Uint8Array(width * height); // 0 = none, 128 = weak, 255 = strong
    for (let i = 0; i < nms.length; i++) {
      const m = nms[i];
      if (m >= highThreshold) {
        edges[i] = 255;
      } else if (m >= lowThreshold) {
        edges[i] = 128;
      }
    }

    // Link weak edges connected to strong edges (8-neighborhood)
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const idx = row + x;
        if (edges[idx] === 128) {
          if (
            edges[idx - 1] === 255 || edges[idx + 1] === 255 ||
            edges[idx - width] === 255 || edges[idx + width] === 255 ||
            edges[idx - width - 1] === 255 || edges[idx - width + 1] === 255 ||
            edges[idx + width - 1] === 255 || edges[idx + width + 1] === 255
          ) {
            edges[idx] = 255;
          } else {
            edges[idx] = 0;
          }
        }
      }
    }

    // 7. Render Parchment Destination Canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;

    // A. Fill Parchment Paper Base
    const paperPalette = {
      warm_antique: { base: '#F4EBD0', shadow: '#E2D3AF', border: '#704214' },
      aged_vellum: { base: '#F7F2E4', shadow: '#E8DEC5', border: '#5C4033' },
      sepia_wash: { base: '#EAD7B0', shadow: '#D5BE91', border: '#4A2E18' },
    }[paperTone];

    // Background paper fill with subtle radial aged shading
    const bgGrad = outCtx.createRadialGradient(
      width * 0.5, height * 0.5, width * 0.2,
      width * 0.5, height * 0.5, width * 0.75
    );
    bgGrad.addColorStop(0, paperPalette.base);
    bgGrad.addColorStop(1, paperPalette.shadow);
    outCtx.fillStyle = bgGrad;
    outCtx.fillRect(0, 0, width, height);

    // B. Subtle Water / Land Wash Contrast
    if (waterToneWash) {
      // Paint gentle antique wash from original brightness
      const washData = outCtx.getImageData(0, 0, width, height);
      const outPix = washData.data;
      for (let i = 0, p = 0; i < srcPix.length; i += 4, p++) {
        // Luminance of source
        const lum = gray[p];
        // If land is lighter or darker, give land a warmer golden wash
        const wash = (255 - lum) * 0.08;
        outPix[i] = Math.max(0, outPix[i] - wash);
        outPix[i + 1] = Math.max(0, outPix[i + 1] - wash * 1.1);
        outPix[i + 2] = Math.max(0, outPix[i + 2] - wash * 1.3);
      }
      outCtx.putImageData(washData, 0, 0);
    }

    // C. Bake Paper Fiber / Grain
    if (includePaperGrain) {
      outCtx.save();
      outCtx.fillStyle = 'rgba(110, 75, 35, 0.035)';
      const grainStep = 3;
      for (let y = 0; y < height; y += grainStep) {
        for (let x = 0; x < width; x += grainStep) {
          if (Math.random() > 0.65) {
            outCtx.fillRect(x, y, 1, 1);
          }
        }
      }
      outCtx.restore();
    }

    // D. Composite Antique Charcoal/Sepia Ink Outlines
    const inkData = outCtx.getImageData(0, 0, width, height);
    const inkPix = inkData.data;

    // Ink tone: dark charcoal sepia #22150c
    const inkR = 34;
    const inkG = 21;
    const inkB = 12;

    for (let p = 0; p < edges.length; p++) {
      if (edges[p] === 255) {
        const i = p * 4;
        const alpha = Math.min(1.0, (nms[p] / highThreshold) * inkStrength);
        inkPix[i] = Math.round(inkPix[i] * (1 - alpha) + inkR * alpha);
        inkPix[i + 1] = Math.round(inkPix[i + 1] * (1 - alpha) + inkG * alpha);
        inkPix[i + 2] = Math.round(inkPix[i + 2] * (1 - alpha) + inkB * alpha);
      }
    }
    outCtx.putImageData(inkData, 0, 0);

    // E. Antique Cartographer Double-Line Border
    outCtx.save();
    outCtx.strokeStyle = paperPalette.border;
    outCtx.lineWidth = Math.max(3, Math.round(width * 0.003));
    outCtx.strokeRect(6, 6, width - 12, height - 12);

    outCtx.strokeStyle = paperPalette.border;
    outCtx.lineWidth = Math.max(1, Math.round(width * 0.001));
    outCtx.strokeRect(12, 12, width - 24, height - 24);
    outCtx.restore();

    return outCanvas;
  }
}
