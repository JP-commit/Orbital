// High-performance object-pooled particle system
export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  endSize: number;
  life: number;
  maxLife: number;
  color: string;
  alpha: number;
  decay: number;
  type: 'spark' | 'smoke' | 'ring' | 'debris';
}

export class ParticleSystem {
  private pool: Particle[] = [];
  private maxParticles: number = 800;

  constructor(maxParticles: number = 800) {
    this.maxParticles = maxParticles;
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        size: 1,
        endSize: 0,
        life: 0,
        maxLife: 1,
        color: '#ffffff',
        alpha: 1,
        decay: 1,
        type: 'spark',
      });
    }
  }

  private getFreeParticle(): Particle | null {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.pool[i].active) {
        return this.pool[i];
      }
    }
    return null;
  }

  // Thruster particle plume behind the ship
  public emitThruster(x: number, y: number, angle: number, shipVx: number, shipVy: number): void {
    const p = this.getFreeParticle();
    if (!p) return;

    // Opposite of ship heading + slight cone spread
    const plumeAngle = angle + Math.PI + (Math.random() - 0.5) * 0.45;
    const speed = 120 + Math.random() * 180;

    p.active = true;
    p.x = x + Math.cos(angle + Math.PI) * 12;
    p.y = y + Math.sin(angle + Math.PI) * 12;
    p.vx = shipVx * 0.4 + Math.cos(plumeAngle) * speed;
    p.vy = shipVy * 0.4 + Math.sin(plumeAngle) * speed;
    p.size = 3.5 + Math.random() * 3.0;
    p.endSize = 0.5;
    p.maxLife = 0.25 + Math.random() * 0.2;
    p.life = p.maxLife;
    p.color = Math.random() > 0.4 ? '#00e5ff' : '#ff9900';
    p.alpha = 0.9;
    p.decay = 1 / p.maxLife;
    p.type = 'smoke';
  }

  // Radial spark burst for hits or explosions
  public emitBurst(x: number, y: number, count: number, color: string, speedScale: number = 1.0): void {
    for (let i = 0; i < count; i++) {
      const p = this.getFreeParticle();
      if (!p) break;

      const angle = Math.random() * 2 * Math.PI;
      const speed = (60 + Math.random() * 240) * speedScale;

      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.size = 2 + Math.random() * 3.5;
      p.endSize = 0.5;
      p.maxLife = 0.4 + Math.random() * 0.5;
      p.life = p.maxLife;
      p.color = color;
      p.alpha = 1.0;
      p.decay = 1 / p.maxLife;
      p.type = 'spark';
    }
  }

  // Shockwave ring (shield breaks, large explosions)
  public emitRing(x: number, y: number, color: string, startRadius: number = 10, endRadius: number = 80): void {
    const p = this.getFreeParticle();
    if (!p) return;

    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = 0;
    p.vy = 0;
    p.size = startRadius;
    p.endSize = endRadius;
    p.maxLife = 0.45;
    p.life = p.maxLife;
    p.color = color;
    p.alpha = 0.85;
    p.decay = 1 / p.maxLife;
    p.type = 'ring';
  }

  public update(dt: number): void {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Friction / slowdown
      if (p.type === 'spark' || p.type === 'smoke') {
        p.vx *= (1 - 1.2 * dt);
        p.vy *= (1 - 1.2 * dt);
      }

      const progress = 1 - (p.life / p.maxLife);
      p.alpha = (1 - progress);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      const progress = 1 - (p.life / p.maxLife);
      const currentSize = p.size + (p.endSize - p.size) * progress;

      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'ring') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5 * (1 - progress);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(1, currentSize), 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, currentSize), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  public reset(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool[i].active = false;
    }
  }
}
