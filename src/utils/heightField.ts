/** Lightweight, quantized terrain heightfield. Allocate only when enabled. */
export interface NumericHeightField {
  cellSize: number;
  width: number;
  height: number;
  seaLevel: number;
  minHeight: number;
  maxHeight: number;
  /** Canonical storage: 16-bit normalized values, not floating point meters. */
  values: Uint16Array;
}

export function createHeightField(width: number, height: number, cellSize = 4, seaLevel = 0, minHeight = -1000, maxHeight = 20000): NumericHeightField {
  const gridWidth = Math.ceil(width / cellSize);
  const gridHeight = Math.ceil(height / cellSize);
  const values = new Uint16Array(gridWidth * gridHeight);
  values.fill(Math.round(((seaLevel - minHeight) / (maxHeight - minHeight)) * 65535));
  return { cellSize, width: gridWidth, height: gridHeight, seaLevel, minHeight, maxHeight, values };
}

export function encodeHeight(field: NumericHeightField, meters: number): number {
  const normalized = Math.max(0, Math.min(1, (meters - field.minHeight) / (field.maxHeight - field.minHeight)));
  return Math.round(normalized * 65535);
}

export function decodeHeight(field: NumericHeightField, encoded: number): number {
  return field.minHeight + (encoded / 65535) * (field.maxHeight - field.minHeight);
}

export function heightFieldIndex(field: NumericHeightField, x: number, y: number): number {
  const gx = Math.max(0, Math.min(field.width - 1, Math.floor(x / field.cellSize)));
  const gy = Math.max(0, Math.min(field.height - 1, Math.floor(y / field.cellSize)));
  return gy * field.width + gx;
}

export function sampleHeight(field: NumericHeightField, x: number, y: number): number {
  return decodeHeight(field, field.values[heightFieldIndex(field, x, y)]);
}

export function serializeHeightField(field: NumericHeightField): string {
  const bytes = new Uint8Array(field.values.buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}

export function deserializeHeightField(data: string, metadata: Omit<NumericHeightField, 'values'>): NumericHeightField | null {
  try {
    const binary = atob(data);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const values = new Uint16Array(buffer);
    const expected = metadata.width * metadata.height;
    if (values.length !== expected) return null;
    return { ...metadata, values };
  } catch { return null; }
}

export function paintHeight(field: NumericHeightField, x: number, y: number, radius: number, deltaMeters: number, landMask?: HTMLCanvasElement, mode: 'raise' | 'lower' | 'plateau' | 'smooth' = 'raise'): void {
  const maskCtx = landMask?.getContext('2d', { willReadFrequently: true });
  const mask = maskCtx && landMask ? maskCtx.getImageData(0, 0, landMask.width, landMask.height).data : null;
  const minX = Math.max(0, Math.floor((x - radius) / field.cellSize));
  const maxX = Math.min(field.width - 1, Math.ceil((x + radius) / field.cellSize));
  const minY = Math.max(0, Math.floor((y - radius) / field.cellSize));
  const maxY = Math.min(field.height - 1, Math.ceil((y + radius) / field.cellSize));
  for (let gy = minY; gy <= maxY; gy++) for (let gx = minX; gx <= maxX; gx++) {
    const px = gx * field.cellSize + field.cellSize / 2;
    const py = gy * field.cellSize + field.cellSize / 2;
    if (Math.hypot(px - x, py - y) > radius) continue;
    if (mask && mask[(Math.min(landMask!.height - 1, Math.round(py)) * landMask!.width + Math.min(landMask!.width - 1, Math.round(px))) * 4 + 3] < 40) continue;
    const falloff = 1 - Math.hypot(px - x, py - y) / Math.max(1, radius);
    const index = gy * field.width + gx;
    const current = decodeHeight(field, field.values[index]);
    let next = current + deltaMeters * falloff;
    if (mode === 'plateau') next = current + (deltaMeters - current) * falloff;
    if (mode === 'smooth') {
      const left = decodeHeight(field, field.values[gy * field.width + Math.max(0, gx - 1)]);
      const right = decodeHeight(field, field.values[gy * field.width + Math.min(field.width - 1, gx + 1)]);
      const up = decodeHeight(field, field.values[Math.max(0, gy - 1) * field.width + gx]);
      const down = decodeHeight(field, field.values[Math.min(field.height - 1, gy + 1) * field.width + gx]);
      next = current + (((left + right + up + down) / 4) - current) * falloff;
    }
    field.values[index] = encodeHeight(field, next);
  }
}
