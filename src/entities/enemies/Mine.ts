import { Entity } from '../Entity';
import { Player } from '../Player';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { Camera } from '../../core/Camera';
import { CONFIG } from '../../config';

export class Mine extends Entity {
  public hp: number;
  public maxHp: number;
  public armTimer: number = 1.0;
  public fuseTimer: number = 0.8;
  public isTriggered: boolean = false;
  public pulseTime: number = 0;
  public hitFlashTimer: number = 0;

  constructor(x: number, y: number) {
    const cfg = CONFIG.ENEMIES.MINE;
    super(x, y, cfg.RADIUS, 'mine');
    this.hp = cfg.HP;
    this.maxHp = cfg.HP;
  }

  public update(dt: number): void {
    if (this.dead) return;

    this.pulseTime += dt * 4;
    if (this.armTimer > 0) this.armTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    // Drifting slowdown
    this.vx *= (1 - 0.5 * dt);
    this.vy *= (1 - 0.5 * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  public checkTrigger(player: Player, dt: number): boolean {
    if (this.dead || this.armTimer > 0) return false;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < CONFIG.ENEMIES.MINE.DETECT_RADIUS) {
      this.isTriggered = true;
    }

    if (this.isTriggered) {
      this.fuseTimer -= dt;
      if (this.fuseTimer <= 0) {
        this.dead = true;
        return true; // Detonate!
      }
    }
    return false;
  }

  public takeDamage(damage: number): boolean {
    this.hp -= damage;
    this.hitFlashTimer = 0.12;
    if (this.hp <= 0) {
      this.dead = true;
      return true; // Detonated by shot!
    }
    return false;
  }

  public explode(particles: ParticleSystem, camera: Camera): void {
    camera.addTrauma(0.3);
    particles.emitBurst(this.x, this.y, 24, '#ff0033', 1.4);
    particles.emitBurst(this.x, this.y, 16, '#ff9900', 1.0);
    particles.emitRing(this.x, this.y, '#ff0055', 10, CONFIG.ENEMIES.MINE.EXPLODE_RADIUS);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const isFlashing = this.hitFlashTimer > 0 || (this.isTriggered && Math.floor(Date.now() / 80) % 2 === 0);
    const strokeColor = isFlashing ? '#ffffff' : '#ff0055';
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = isFlashing ? '#ffffff' : 'rgba(255, 0, 85, 0.3)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = this.isTriggered ? 16 : 8;

    // Spiked naval-mine geometry
    const spikes = 8;
    ctx.beginPath();
    for (let i = 0; i < spikes; i++) {
      const a = (i * Math.PI * 2) / spikes;
      const outerR = this.radius + 4;
      const innerR = this.radius - 2;
      ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
      const nextA = a + Math.PI / spikes;
      ctx.lineTo(Math.cos(nextA) * innerR, Math.sin(nextA) * innerR);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central pulsing red blinking eye
    const pulse = 0.6 + 0.4 * Math.sin(this.pulseTime * (this.isTriggered ? 3 : 1));
    ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
