import { Entity } from './Entity';
import { CONFIG } from '../config';
import { PRNG } from '../core/PRNG';

export type AsteroidSize = 'LARGE' | 'MEDIUM' | 'SMALL';

interface Point {
  x: number;
  y: number;
}

export class Asteroid extends Entity {
  public sizeType: AsteroidSize;
  public hp: number;
  public maxHp: number;
  public angularVelocity: number;
  public vertices: Point[] = [];
  public hitFlashTimer: number = 0;
  public scoreValue: number;

  constructor(x: number, y: number, sizeType: AsteroidSize, prng: PRNG, initialVx?: number, initialVy?: number) {
    const cfg = CONFIG.ASTEROIDS[sizeType];
    super(x, y, cfg.RADIUS, 'asteroid');

    this.sizeType = sizeType;
    this.hp = cfg.HP;
    this.maxHp = cfg.HP;
    this.scoreValue = cfg.SCORE;

    // Angular velocity (-1.2 to 1.2 rad/s)
    this.angularVelocity = prng.range(-1.2, 1.2);
    this.rotation = prng.angle();

    // Linear velocity if not provided
    if (initialVx !== undefined && initialVy !== undefined) {
      this.vx = initialVx;
      this.vy = initialVy;
    } else {
      const speed = prng.range(cfg.SPEED_MIN, cfg.SPEED_MAX);
      const moveAngle = prng.angle();
      this.vx = Math.cos(moveAngle) * speed;
      this.vy = Math.sin(moveAngle) * speed;
    }

    // Procedural polygon vertices
    this.generateVertices(prng, cfg.VERTICES, cfg.RADIUS, cfg.JITTER);
  }

  private generateVertices(prng: PRNG, vertexCount: number, baseRadius: number, jitter: number): void {
    this.vertices = [];
    const step = (Math.PI * 2) / vertexCount;

    for (let i = 0; i < vertexCount; i++) {
      const angle = i * step + prng.range(-step * 0.2, step * 0.2);
      const r = baseRadius * (1 + prng.range(-jitter, jitter));
      this.vertices.push({
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    }
  }

  public update(dt: number): void {
    if (this.dead) return;

    this.rotation += this.angularVelocity * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= dt;
    }

    // Bounce off world boundary with padding
    const pad = this.radius;
    if (this.x < pad) {
      this.x = pad;
      this.vx = Math.abs(this.vx);
    } else if (this.x > CONFIG.WORLD_WIDTH - pad) {
      this.x = CONFIG.WORLD_WIDTH - pad;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y < pad) {
      this.y = pad;
      this.vy = Math.abs(this.vy);
    } else if (this.y > CONFIG.WORLD_HEIGHT - pad) {
      this.y = CONFIG.WORLD_HEIGHT - pad;
      this.vy = -Math.abs(this.vy);
    }
  }

  public takeDamage(damage: number): boolean {
    this.hp -= damage;
    this.hitFlashTimer = 0.12;
    if (this.hp <= 0) {
      this.dead = true;
      return true; // Destroyed
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead || this.vertices.length < 3) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const isHit = this.hitFlashTimer > 0;
    const strokeColor = isHit ? '#ffffff' : this.sizeType === 'LARGE' ? '#f59e0b' : this.sizeType === 'MEDIUM' ? '#94a3b8' : '#38bdf8';
    const fillColor = isHit ? 'rgba(255,255,255,0.4)' : 'rgba(15, 23, 42, 0.85)';

    ctx.lineWidth = 1.8;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = isHit ? 14 : 5;

    // Draw procedural irregular polygon
    ctx.beginPath();
    ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
    for (let i = 1; i < this.vertices.length; i++) {
      ctx.lineTo(this.vertices[i].x, this.vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Interior facet lines for 3D geometric rock look
    if (!isHit && this.vertices.length >= 6) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(this.vertices[0].x, this.vertices[0].y);
      ctx.lineTo(0, 0);
      ctx.lineTo(this.vertices[Math.floor(this.vertices.length / 2)].x, this.vertices[Math.floor(this.vertices.length / 2)].y);
      ctx.moveTo(0, 0);
      ctx.lineTo(this.vertices[Math.floor(this.vertices.length * 0.75)].x, this.vertices[Math.floor(this.vertices.length * 0.75)].y);
      ctx.stroke();
    }

    ctx.restore();
  }
}
