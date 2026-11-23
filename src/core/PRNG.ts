// Deterministic 32-bit PRNG using Mulberry32 algorithm
export class PRNG {
  private state: number;
  public readonly seed: number;

  constructor(seed?: number | string) {
    if (typeof seed === 'string') {
      this.seed = PRNG.hashString(seed);
    } else if (typeof seed === 'number' && !isNaN(seed)) {
      this.seed = seed >>> 0;
    } else {
      this.seed = (Math.random() * 0xffffffff) >>> 0;
    }
    this.state = this.seed;
  }

  // Convert any string to 32-bit unsigned integer hash
  public static hashString(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  // Returns float in [0, 1)
  public next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Float in [min, max)
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  // Integer in [min, max]
  public rangeInt(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  // Pick random element from array
  public choice<T>(array: readonly T[] | T[]): T {
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  // Returns true with given probability [0, 1]
  public chance(probability: number): boolean {
    return this.next() < probability;
  }

  // Angle in radians [-PI, PI]
  public angle(): number {
    return this.range(-Math.PI, Math.PI);
  }

  // Reset to original seed
  public reset(): void {
    this.state = this.seed;
  }
}
