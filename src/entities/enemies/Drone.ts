import { Enemy } from './Enemy';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { PRNG } from '../../core/PRNG';
import { CONFIG } from '../../config';

export class Drone extends Enemy {
  public speed: number;
  public ramDamage: number;

  constructor(x: number, y: number) {
    const cfg = CONFIG.ENEMIES.DRONE;
    super(x, y, cfg.RADIUS, cfg.HP, cfg.SCORE, cfg.COLOR);
    this.speed = cfg.SPEED;
    this.ramDamage = cfg.DAMAGE;
  }

  public update(dt: number): void {
    if (this.dead) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Arena boundary clamp
    const pad = this.radius;
    this.x = Math.max(pad, Math.min(CONFIG.WORLD_WIDTH - pad, this.x));
    this.y = Math.max(pad, Math.min(CONFIG.WORLD_HEIGHT - pad, this.y));
  }

  public updateAI(
    dt: number,
    player: Player,
    _weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    _prng: PRNG
  ): void {
    if (this.dead || player.dead) return;

    // Steer directly toward player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 1) {
      const targetAngle = Math.atan2(dy, dx);
      // Smooth rotation
      let angleDiff = targetAngle - this.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 5.5 * dt);

      // Accelerate forward
      this.vx = Math.cos(this.rotation) * this.speed;
      this.vy = Math.sin(this.rotation) * this.speed;

      // Thruster spark
      if (Math.random() < 0.25) {
        particles.emitBurst(
          this.x - Math.cos(this.rotation) * this.radius,
          this.y - Math.sin(this.rotation) * this.radius,
          1,
          this.color,
          0.3
        );
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const isHit = this.hitFlashTimer > 0;
    const strokeColor = isHit ? '#ffffff' : this.color;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(255, 51, 102, 0.25)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;

    // Aggressive chevron delta wing
    ctx.beginPath();
    ctx.moveTo(14, 0);       // Nose
    ctx.lineTo(-10, -12);    // Left tip
    ctx.lineTo(-4, 0);       // Inner notch
    ctx.lineTo(-10, 12);     // Right tip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Central pulsing red sensor
    ctx.fillStyle = strokeColor;
    ctx.beginPath();
    ctx.arc(2, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
