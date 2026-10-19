/**
 * Renders landmass mask with concentric coastal ripples, auto-beaching, luminous shelves, and copperplate hatching.
 * Uses a persistent offscreen scratch canvas to avoid per-frame allocations on large 2K/4K maps.
 */

let landScratchCanvas: HTMLCanvasElement | null = null;
let landScratchCtx: CanvasRenderingContext2D | null = null;

function getLandScratchCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (!landScratchCanvas) {
    landScratchCanvas = document.createElement('canvas');
    landScratchCtx = landScratchCanvas.getContext('2d');
  }
  if (landScratchCanvas.width !== width || landScratchCanvas.height !== height) {
    landScratchCanvas.width = width;
    landScratchCanvas.height = height;
  }
  if (!landScratchCtx) return null;
  landScratchCtx.globalCompositeOperation = 'source-over';
  landScratchCtx.clearRect(0, 0, width, height);
  return { canvas: landScratchCanvas, ctx: landScratchCtx };
}

export function renderLandmassWithCoastlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  maskCanvas: HTMLCanvasElement,
  ripples: number,
  coastlineColor: string,
  shallowColor: string,
  autoBeaching: boolean = false,
  coastlineHatching: boolean = false
): void {
  ctx.save();

  // Step A0: Luminous shallow water shelf & coastal glow (vibrant ambient halo around all coasts)
  ctx.save();
  ctx.shadowColor = shallowColor || '#5ea89e';
  ctx.shadowBlur = 22;
  ctx.drawImage(maskCanvas, 0, 0, width, height);
  ctx.restore();

  ctx.save();
  ctx.shadowColor = shallowColor || '#76c4b8';
  ctx.shadowBlur = 10;
  ctx.drawImage(maskCanvas, 0, 0, width, height);
  ctx.restore();

  // Step A0.5: Optional beach and surf treatment based on the binary landmask.
  if (autoBeaching) {
    ctx.save();
    ctx.shadowColor = '#d4b982';
    ctx.shadowBlur = 8;
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 18;
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.restore();
  }

  // Step A1: Coastal ripples around landmass
  if (ripples > 0) {
    ctx.save();
    for (let i = ripples; i >= 1; i--) {
      const blurAmount = i * 4.5;
      ctx.shadowColor = shallowColor;
      ctx.shadowBlur = blurAmount;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
      ctx.drawImage(maskCanvas, 0, 0, width, height);
    }
    ctx.restore();

    // Sharp white/cyan foam contour edge
    ctx.save();
    ctx.shadowColor = coastlineColor;
    ctx.shadowBlur = 4;
    ctx.drawImage(maskCanvas, 0, 0, width, height);
    ctx.restore();
  }

  // Step A2: Historical Copperplate Hatching (concentric engraving pen lines)
  if (coastlineHatching) {
    ctx.save();
    for (let r = 1; r <= 3; r++) {
      ctx.shadowColor = 'rgba(43, 35, 24, 0.45)';
      ctx.shadowBlur = r * 3;
      ctx.drawImage(maskCanvas, 0, 0, width, height);
    }
    ctx.restore();
  }

  // Step B: Solid land base fill (reusing persistent scratch canvas)
  const scratch = getLandScratchCanvas(width, height);
  if (scratch) {
    const { canvas: tempCanvas, ctx: tCtx } = scratch;
    tCtx.drawImage(maskCanvas, 0, 0, width, height);
    tCtx.globalCompositeOperation = 'source-in';
    tCtx.fillStyle = '#e8d8b5'; // Natural parchment / limestone base
    tCtx.fillRect(0, 0, width, height);

    ctx.drawImage(tempCanvas, 0, 0, width, height);
  }

  // Step C: Coastline dark ink stroke
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = '#2b2318';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#2b2318';
  ctx.shadowBlur = 1.5;
  ctx.drawImage(maskCanvas, 0, 0, width, height);
  ctx.restore();

  ctx.restore();
}
