/**
 * Renders atmospheric filters, day/night lighting cycles, seasonal particle fills, and antique vignettes.
 */
import { AtmosphereFilter } from '../../types';

export function renderAtmosphereLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  atmosphere: AtmosphereFilter
): void {
  ctx.save();

  // 1. Ambient Lighting & Day-Night cycle
  const timeOfDay = atmosphere.timeOfDay || 'day';
  const intensity = atmosphere.lightIntensity ?? 0.7;

  if (intensity > 0) {
    if (timeOfDay === 'golden_hour') {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, `rgba(255, 190, 60, ${0.45 * intensity})`);
      grad.addColorStop(1, `rgba(217, 119, 6, ${0.35 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (timeOfDay === 'sunset') {
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      const grad = ctx.createLinearGradient(0, height * 0.3, width, height);
      grad.addColorStop(0, `rgba(239, 68, 68, ${0.35 * intensity})`);
      grad.addColorStop(0.6, `rgba(245, 158, 11, ${0.4 * intensity})`);
      grad.addColorStop(1, `rgba(76, 29, 149, ${0.5 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (timeOfDay === 'twilight') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, `rgba(30, 27, 75, ${0.48 * intensity})`);
      grad.addColorStop(1, `rgba(88, 28, 135, ${0.38 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (timeOfDay === 'night') {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      const grad = ctx.createRadialGradient(
        width * 0.4,
        height * 0.35,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.75
      );
      grad.addColorStop(0, `rgba(15, 23, 42, ${0.65 * intensity})`);
      grad.addColorStop(1, `rgba(2, 6, 23, ${0.85 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      // Moonlit specular tint
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = `rgba(186, 230, 253, ${0.12 * intensity})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (timeOfDay === 'torchlight') {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const grad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        width * 0.05,
        width * 0.5,
        height * 0.5,
        width * 0.65
      );
      grad.addColorStop(0, `rgba(251, 146, 60, ${0.55 * intensity})`);
      grad.addColorStop(0.7, `rgba(180, 83, 9, ${0.35 * intensity})`);
      grad.addColorStop(1, `rgba(15, 23, 42, ${0.6 * intensity})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (timeOfDay === 'overcast') {
      ctx.save();
      ctx.globalCompositeOperation = 'color';
      ctx.fillStyle = `rgba(100, 116, 139, ${0.4 * intensity})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    } else if (timeOfDay === 'day' && (atmosphere.warmth ?? 0) !== 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'soft-light';
      const w = atmosphere.warmth;
      ctx.fillStyle =
        w > 0
          ? `rgba(254, 240, 138, ${Math.abs(w) * 0.3 * intensity})`
          : `rgba(186, 230, 253, ${Math.abs(w) * 0.3 * intensity})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }

  // 2. Static Particle Physics / Seasonal Fill (deterministic static fill)
  const season = atmosphere.seasonFill || 'none';
  if (season !== 'none') {
    const density = atmosphere.seasonDensity ?? 0.5;
    const baseSize = atmosphere.seasonParticleSize ?? 2;
    const particleCount = Math.round(((width * height) / 3800) * density);

    ctx.save();
    for (let i = 0; i < particleCount; i++) {
      const hash1 = Math.abs(Math.sin(i * 12.9898 + 78.233) * 43758.5453) % 1;
      const hash2 = Math.abs(Math.sin(i * 93.9898 + 67.345) * 24634.6345) % 1;
      const hash3 = Math.abs(Math.sin(i * 45.1234 + 19.876) * 58372.1294) % 1;

      const px = hash1 * width;
      const py = hash2 * height;
      const pSize = Math.max(0.8, baseSize * (0.5 + hash3 * 0.9));
      const pAlpha = 0.25 + hash3 * 0.65;

      if (season === 'snow_winter') {
        const isIceBlue = hash3 > 0.7;
        ctx.fillStyle = isIceBlue
          ? `rgba(224, 242, 254, ${pAlpha * 0.9})`
          : `rgba(255, 255, 255, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === 'autumn_leaves') {
        const hues = ['#d97706', '#b45309', '#dc2626', '#ca8a04', '#92400e'];
        const color = hues[Math.floor(hash3 * hues.length)];
        ctx.fillStyle = color;
        ctx.globalAlpha = pAlpha * 0.85;
        ctx.beginPath();
        ctx.ellipse(px, py, pSize * 1.4, pSize * 0.8, hash3 * Math.PI, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === 'spring_blossom') {
        const hues = ['rgba(251, 207, 232, ', 'rgba(244, 114, 182, ', 'rgba(254, 240, 138, '];
        const colorPrefix = hues[Math.floor(hash3 * hues.length)];
        ctx.fillStyle = `${colorPrefix}${pAlpha * 0.75})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize * 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else if (season === 'desert_sand') {
        ctx.fillStyle = `rgba(217, 119, 6, ${pAlpha * 0.45})`;
        ctx.beginPath();
        ctx.arc(px, py, pSize * 0.75, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  // 3. Antique Vignette Edge Falloff
  const vignette = atmosphere.vignette ?? 0;
  if (vignette > 0.05) {
    ctx.save();
    const vigGrad = ctx.createRadialGradient(
      width * 0.5,
      height * 0.5,
      Math.min(width, height) * 0.35,
      width * 0.5,
      height * 0.5,
      Math.max(width, height) * 0.75
    );
    vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vigGrad.addColorStop(0.7, `rgba(20, 15, 10, ${vignette * 0.4})`);
    vigGrad.addColorStop(1, `rgba(15, 10, 5, ${vignette * 0.85})`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  ctx.restore();
}
