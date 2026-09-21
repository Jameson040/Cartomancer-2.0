/**
 * Color manipulation and conversion utilities
 */

/**
 * Converts a hex or rgb string to an rgba string with custom alpha.
 * Prevents black-border fringe artifacts when blending transparency.
 */
export function hexToRgba(hexOrColor: string, alpha: number): string {
  if (!hexOrColor) return `rgba(200, 200, 200, ${alpha})`;
  if (hexOrColor.startsWith('#')) {
    let c = hexOrColor.substring(1);
    if (c.length === 3) {
      c = c.split('').map((x) => x + x).join('');
    }
    const r = parseInt(c.substring(0, 2), 16) || 0;
    const g = parseInt(c.substring(2, 4), 16) || 0;
    const b = parseInt(c.substring(4, 6), 16) || 0;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } else if (hexOrColor.startsWith('rgb')) {
    const parts = hexOrColor.match(/\d+/g);
    if (parts && parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
  }
  return `rgba(200, 200, 200, ${alpha})`;
}
