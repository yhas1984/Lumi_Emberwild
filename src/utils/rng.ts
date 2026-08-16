// ============================================================
// Random helpers (Math.random based, real RNG)
// ============================================================

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function chance(p: number): boolean {
  return Math.random() < p;
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function weightedPick<T>(items: T[], weightFn: (item: T) => number): T {
  if (items.length === 0) {
    throw new Error("weightedPick: empty items");
  }
  const total = items.reduce((sum, it) => sum + weightFn(it), 0);
  let roll = Math.random() * total;
  for (const it of items) {
    roll -= weightFn(it);
    if (roll <= 0) {
      return it;
    }
  }
  return items[items.length - 1];
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}
