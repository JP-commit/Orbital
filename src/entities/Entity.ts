export abstract class Entity {
  public x: number;
  public y: number;
  public vx: number = 0;
  public vy: number = 0;
  public radius: number;
  public rotation: number = 0;
  public dead: boolean = false;
  public tag: string;

  constructor(x: number, y: number, radius: number, tag: string = 'entity') {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.tag = tag;
  }

  public abstract update(dt: number): void;
  public abstract render(ctx: CanvasRenderingContext2D): void;
}
