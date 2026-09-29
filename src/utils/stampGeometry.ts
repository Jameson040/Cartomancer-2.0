/** Shared stamp layout math used by rendering, hit testing, and transform handles. */

export interface StampGeometry {
  width: number;
  height: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerY: number;
}

export function getStampGeometry(
  rawWidth: number,
  rawHeight: number,
  scale: number,
  padding = 0
): StampGeometry {
  const width = Math.max(1, rawWidth * scale * 0.7);
  const height = Math.max(1, rawHeight * scale * 0.7);
  const centerY = -height * 0.25;
  return {
    width,
    height,
    left: -width / 2 - padding,
    top: -height * 0.75 - padding,
    right: width / 2 + padding,
    bottom: height * 0.25 + padding,
    centerY,
  };
}

export function worldToStampLocal(
  x: number,
  y: number,
  stampX: number,
  stampY: number,
  rotation: number
): { x: number; y: number } {
  const dx = x - stampX;
  const dy = y - stampY;
  const radians = (-rotation * Math.PI) / 180;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}
