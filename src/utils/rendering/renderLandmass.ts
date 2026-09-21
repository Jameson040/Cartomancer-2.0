/**
 * Renders landmass mask with concentric coastal ripples, auto-beaching, luminous shelves, and copperplate hatching.
 */
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

  // Step A0.5: Auto-beaching (warm golden shallow sand barrier & turquoise surf)
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

  // Step B: Solid land base fill
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tCtx = tempCanvas.getContext('2d');
  if (tCtx) {
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
