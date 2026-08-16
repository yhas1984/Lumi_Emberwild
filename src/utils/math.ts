// ============================================================
// Math helpers
// ============================================================

export function dist(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function angleTo(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function hexToRgb(color: number): { r: number; g: number; b: number } {
  return { r: (color >> 16) & 255, g: (color >> 8) & 255, b: color & 255 };
}

export function rgba(color: number, alpha: number): string {
  const { r, g, b } = hexToRgb(color);
  return "rgba(" + r + "," + g + "," + b + "," + alpha + ")";
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

export function romanNumeral(level: number): string {
  const table: Array<[number, string]> = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let n = level;
  let out = "";
  for (const [value, sym] of table) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out;
}
