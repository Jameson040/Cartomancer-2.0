/**
 * Renders labels, text arcs, banners, plaques, and selection bounding boxes.
 */
import { PlacedText } from '../../types';

export function renderLabels(
  ctx: CanvasRenderingContext2D,
  labels: PlacedText[],
  selectedLabelId?: string | null
): void {
  for (const label of labels) {
    ctx.save();
    ctx.translate(label.x, label.y);

    if (label.rotation !== 0) {
      ctx.rotate((label.rotation * Math.PI) / 180);
    }

    const effectiveFontSize = Math.max(8, Math.round(label.fontSize * (label.scale ?? 1.0)));
    ctx.font = `bold ${effectiveFontSize}px ${label.fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const metrics = ctx.measureText(label.text);
    const textW = metrics.width + label.letterSpacing * label.text.length;
    const textH = effectiveFontSize * 1.35;

    const boxColor = label.boxColor || '#fef3c7';
    const boxBorderColor = label.boxBorderColor || '#92400e';
    const boxOpacity = label.boxOpacity ?? 0.88;

    // Banner background styling
    if (label.bannerStyle === 'box_simple') {
      ctx.save();
      ctx.globalAlpha = boxOpacity;
      const padX = 16;
      const padY = 6;
      const bx = -textW / 2 - padX;
      const by = -textH / 2 - padY;
      const bw = textW + padX * 2;
      const bh = textH + padY * 2;

      ctx.fillStyle = boxColor;
      ctx.strokeStyle = boxBorderColor;
      ctx.lineWidth = 2;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    } else if (label.bannerStyle === 'parchment_ribbon') {
      ctx.save();
      ctx.globalAlpha = boxOpacity;
      const padX = 26;
      const padY = 8;
      const bx = -textW / 2 - padX;
      const by = -textH / 2 - padY;
      const bw = textW + padX * 2;
      const bh = textH + padY * 2;

      // Ribbon notch tail left & right
      ctx.fillStyle = boxBorderColor;
      ctx.beginPath();
      ctx.moveTo(bx, by + 4);
      ctx.lineTo(bx - 12, by + bh / 2);
      ctx.lineTo(bx, by + bh - 4);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(bx + bw, by + 4);
      ctx.lineTo(bx + bw + 12, by + bh / 2);
      ctx.lineTo(bx + bw, by + bh - 4);
      ctx.fill();

      // Banner plaque
      ctx.fillStyle = boxColor;
      ctx.strokeStyle = boxBorderColor;
      ctx.lineWidth = 2.5;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    } else if (label.bannerStyle === 'stone_plaque') {
      ctx.save();
      ctx.globalAlpha = boxOpacity;
      const padX = 20;
      const padY = 8;
      const bx = -textW / 2 - padX;
      const by = -textH / 2 - padY;
      const bw = textW + padX * 2;
      const bh = textH + padY * 2;

      ctx.fillStyle = boxColor || '#334155';
      ctx.strokeStyle = boxBorderColor || '#94a3b8';
      ctx.lineWidth = 3;
      ctx.fillRect(bx, by, bw, bh);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.restore();
    } else if (label.bannerStyle === 'royal_banner' || label.bannerStyle === 'scroll') {
      ctx.save();
      ctx.globalAlpha = boxOpacity;
      const padX = 24;
      const padY = 10;
      const bx = -textW / 2 - padX;
      const by = -textH / 2 - padY;
      const bw = textW + padX * 2;
      const bh = textH + padY * 2;

      ctx.fillStyle = boxColor;
      ctx.strokeStyle = boxBorderColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(bx, by, bw, bh, 8);
      } else {
        ctx.rect(bx, by, bw, bh);
      }
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Render Text Glyphs
    const curvature = label.curvature || 0;
    if (Math.abs(curvature) > 1) {
      const chars = label.text.split('');
      const charCount = chars.length;
      const isSmile = curvature < 0;
      const R = Math.max(90, (charCount * effectiveFontSize * 0.8) / (Math.abs(curvature) * 0.035));
      const totalAngle = (charCount * (effectiveFontSize * 0.65 + label.letterSpacing)) / R;
      const startAngle = -totalAngle / 2;

      ctx.save();
      for (let c = 0; c < charCount; c++) {
        const char = chars[c];
        const angle = startAngle + (c / Math.max(1, charCount - 1)) * totalAngle;
        const charX = R * Math.sin(angle);
        const charY = isSmile ? -R * (1 - Math.cos(angle)) : R * (1 - Math.cos(angle));
        const charRot = isSmile ? -angle : angle;

        ctx.save();
        ctx.translate(charX, charY);
        ctx.rotate(charRot);

        if (label.stylePreset === 'imperial_spaced') {
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 4;
        }

        if (label.strokeWidth > 0) {
          ctx.strokeStyle = label.strokeColor;
          ctx.lineWidth = label.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(char, 0, 0);
        }
        ctx.fillStyle = label.color;
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    } else {
      if (label.stylePreset === 'imperial_spaced') {
        ctx.save();
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 6;
        if (label.strokeWidth > 0) {
          ctx.strokeStyle = label.strokeColor;
          ctx.lineWidth = label.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(label.text, 0, 0);
        }
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, 0, 0);
        ctx.restore();
      } else {
        if (label.strokeWidth > 0) {
          ctx.strokeStyle = label.strokeColor;
          ctx.lineWidth = label.strokeWidth;
          ctx.lineJoin = 'round';
          ctx.strokeText(label.text, 0, 0);
        }
        ctx.fillStyle = label.color;
        ctx.fillText(label.text, 0, 0);
      }
    }

    // Selection indicator for label
    if (selectedLabelId === label.id) {
      const padX = label.bannerStyle !== 'none' ? 32 : 12;
      const padY = label.bannerStyle !== 'none' ? 12 : 8;
      const bx = -textW / 2 - padX;
      const by = -textH / 2 - padY;
      const bw = textW + padX * 2;
      const bh = textH + padY * 2;

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(bx, by, bw, bh);
      ctx.setLineDash([]);

      // Rotation stem and knob
      ctx.beginPath();
      ctx.moveTo(0, by);
      ctx.lineTo(0, by - 16);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, by - 16, 5, 0, Math.PI * 2);
      ctx.fill();

      // Corner handles
      const handleSize = 6;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      const corners = [
        [bx, by],
        [bx + bw, by],
        [bx, by + bh],
        [bx + bw, by + bh],
      ];
      for (const [hx, hy] of corners) {
        ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      }
    }

    ctx.restore();
  }
}
