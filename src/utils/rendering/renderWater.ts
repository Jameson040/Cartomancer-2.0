/**
 * Renders oceanic gradients, atmospheric depth vignette, and painterly wave swells.
 */
export function renderWater(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  deepColor: string,
  shallowColor: string
): void {
  ctx.save();

  // 1. Multi-stop atmospheric oceanic gradient
  const linearGrad = ctx.createLinearGradient(width * 0.25, 0, width * 0.75, height);
  linearGrad.addColorStop(0, shallowColor); // Northern cooler misty waters
  linearGrad.addColorStop(0.45, deepColor);  // Central deep ocean body
  linearGrad.addColorStop(1, '#0e2423');    // Deep abyssal depth

  ctx.fillStyle = linearGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Radial atmospheric depth vignette
  const radialGrad = ctx.createRadialGradient(
    width * 0.48,
    height * 0.45,
    width * 0.15,
    width * 0.5,
    height * 0.5,
    width * 0.78
  );
  radialGrad.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
  radialGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.0)');
  radialGrad.addColorStop(1, 'rgba(4, 14, 14, 0.4)');

  ctx.fillStyle = radialGrad;
  ctx.fillRect(0, 0, width, height);

  // 3. Flowing oceanic bathymetric wave swells (gentle painterly bezier currents)
  ctx.save();
  ctx.lineWidth = 1.2;
  const waveStep = 48;
  for (let y = 16; y < height; y += waveStep) {
    const waveAlpha = 0.035 + ((Math.sin(y * 0.02) + 1) * 0.03);
    ctx.strokeStyle = `rgba(165, 225, 230, ${waveAlpha})`;
    ctx.beginPath();
    const waveLen = 130;
    const xOffset = (y % (waveStep * 2) === 0) ? 35 : 0;
    for (let x = -50 + xOffset; x < width + 50; x += waveLen) {
      ctx.moveTo(x, y);
      ctx.bezierCurveTo(
        x + waveLen * 0.35,
        y - 4.5,
        x + waveLen * 0.65,
        y + 4.5,
        x + waveLen,
        y
      );
    }
    ctx.stroke();
  }
  ctx.restore();

  ctx.restore();
}
