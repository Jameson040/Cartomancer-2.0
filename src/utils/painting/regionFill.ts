export type FillRegion = 'land' | 'water';

/** Fills one contiguous land/water region without scanning unrelated regions. */
export function fillContiguousRegion(
  maskCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  x: number,
  y: number,
  region: FillRegion,
  color: string,
  alpha = 1
): boolean {
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const targetCtx = targetCanvas.getContext('2d');
  if (!maskCtx || !targetCtx) return false;
  const px = Math.round(Math.max(0, Math.min(maskCanvas.width - 1, x)));
  const py = Math.round(Math.max(0, Math.min(maskCanvas.height - 1, y)));
  const mask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data;
  const target = targetCtx.getImageData(0, 0, targetCanvas.width, targetCanvas.height);
  const landAt = (index: number) => mask[index * 4 + 3] >= 40;
  const targetLand = region === 'land';
  const start = py * maskCanvas.width + px;
  if (landAt(start) !== targetLand) return false;
  const visited = new Uint8Array(maskCanvas.width * maskCanvas.height);
  const queue = new Int32Array(maskCanvas.width * maskCanvas.height);
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  visited[start] = 1;
  const fill = document.createElement('canvas');
  fill.width = maskCanvas.width;
  fill.height = maskCanvas.height;
  const fillCtx = fill.getContext('2d')!;
  fillCtx.fillStyle = color;
  fillCtx.globalAlpha = alpha;
  while (head < tail) {
    const index = queue[head++];
    const cx = index % maskCanvas.width;
    const cy = Math.floor(index / maskCanvas.width);
    target.data[index * 4] = 0;
    target.data[index * 4 + 1] = 0;
    target.data[index * 4 + 2] = 0;
    target.data[index * 4 + 3] = 0;
    fillCtx.fillRect(cx, cy, 1, 1);
    const neighbors = [index - 1, index + 1, index - maskCanvas.width, index + maskCanvas.width];
    for (const next of neighbors) {
      if (next < 0 || next >= visited.length || visited[next]) continue;
      const nx = next % maskCanvas.width;
      if (Math.abs(nx - cx) > 1 || landAt(next) !== targetLand) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }
  targetCtx.putImageData(target, 0, 0);
  targetCtx.save();
  targetCtx.globalCompositeOperation = 'source-over';
  targetCtx.drawImage(fill, 0, 0);
  targetCtx.restore();
  return true;
}
