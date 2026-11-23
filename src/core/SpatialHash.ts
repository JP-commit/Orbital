import { Entity } from '../entities/Entity';

// High-performance 2D Uniform Spatial Hash Grid for O(1) broadphase collision queries
export class SpatialHash {
  public readonly cellSize: number;
  private grid: Map<number, Entity[]> = new Map();

  constructor(cellSize: number = 160) {
    this.cellSize = cellSize;
  }

  public clear(): void {
    this.grid.clear();
  }

  // Fast integer hash for cell coordinates (cx, cy)
  private hashKey(cx: number, cy: number): number {
    return ((cx * 73856093) ^ (cy * 19349663)) >>> 0;
  }

  // Insert entity across all cells its bounding circle overlaps
  public insert(entity: Entity): void {
    const minX = Math.floor((entity.x - entity.radius) / this.cellSize);
    const maxX = Math.floor((entity.x + entity.radius) / this.cellSize);
    const minY = Math.floor((entity.y - entity.radius) / this.cellSize);
    const maxY = Math.floor((entity.y + entity.radius) / this.cellSize);

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = this.hashKey(cx, cy);
        let cell = this.grid.get(key);
        if (!cell) {
          cell = [];
          this.grid.set(key, cell);
        }
        cell.push(entity);
      }
    }
  }

  // Query nearby potential colliders within radius of (x, y)
  public query(x: number, y: number, radius: number): Entity[] {
    const minX = Math.floor((x - radius) / this.cellSize);
    const maxX = Math.floor((x + radius) / this.cellSize);
    const minY = Math.floor((y - radius) / this.cellSize);
    const maxY = Math.floor((y + radius) / this.cellSize);

    const candidates: Set<Entity> = new Set();

    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const key = this.hashKey(cx, cy);
        const cell = this.grid.get(key);
        if (cell) {
          for (let i = 0; i < cell.length; i++) {
            candidates.add(cell[i]);
          }
        }
      }
    }

    return Array.from(candidates);
  }
}
