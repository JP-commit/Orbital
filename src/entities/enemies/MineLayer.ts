import { Enemy } from './Enemy';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { PRNG } from '../../core/PRNG';
import { CONFIG } from '../../config';

export class MineLayer extends Enemy {
  public speed: number;
  public mineCooldown: number;

  constructor(x: number, y: number, prng: PRNG) {
    const cfg = CONFIG.ENEMIES.MINELAYER;
    super(x, y, cfg.RADIUS, cfg.HP, cfg.SCORE, cfg.COLOR);
    this.speed = cfg.SPEED;
    this.mineCooldown = prng.range(2.0, 4.0);
  }

  public update(dt: number): void {
    if (this.dead) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Boundary bounce
    const pad = this.radius;
    if (this.x < pad) { this.x = pad; this.vx = Math.abs(this.vx); }
    else if (this.x > CONFIG.WORLD_WIDTH - pad) { this.x = CONFIG.WORLD_WIDTH - pad; this.vx = -Math.abs(this.vx); }
    if (this.y < pad) { this.y = pad; this.vy = Math.abs(this.vy); }
    else if (this.y > CONFIG.WORLD_HEIGHT - pad) { this.y = CONFIG.WORLD_HEIGHT - pad; this.vy = -Math.abs(this.vy); }
  }

  public updateAI(
    dt: number,
    player: Player,
    _weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    _prng: PRNG,
    spawnMineCallback?: (x: number, y: number) => void
  ): void {
    if (this.dead || player.dead) return;

    // Flee / steer away from player if close, otherwise cruise in sweeping arcs
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    let targetAngle = Math.atan2(dy, dx);
    if (dist < 500) {
      // Flee in opposite direction
      targetAngle += Math.PI;
    } else {
      // Perpendicular patrol
      targetAngle += Math.PI / 2;
    }

    let angleDiff = targetAngle - this.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 2.5 * dt);

    this.vx = Math.cos(this.rotation) * this.speed;
    this.vy = Math.sin(this.rotation) * this.speed;

    // Lay mine countdown
    this.mineCooldown -= dt;
    if (this.mineCooldown <= 0) {
      this.mineCooldown = CONFIG.ENEMIES.MINELAYER.MINE_INTERVAL;

      // Deploy mine behind ship
      const mineX = this.x - Math.cos(this.rotation) * (this.radius + 15);
      const mineY = this.y - Math.sin(this.rotation) * (this.radius + 15);

      if (spawnMineCallback) {
        spawnMineCallback(mineX, mineY);
      }
      particles.emitBurst(mineX, mineY, 8, '#cc00ff', 0.8);
      particles.emitRing(mineX, mineY, '#cc00ff', 5, 30);
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
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(204, 0, 255, 0.25)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 9;

    // Heavy trapezoidal hull with rear deploy bay
    ctx.beginPath();
    ctx.moveTo(18, 0);       // Armored nose
    ctx.lineTo(8, -16);
    ctx.lineTo(-14, -18);    // Left armored flank
    ctx.lineTo(-20, -8);
    ctx.lineTo(-14, 0);      // Inner deployment chute
    ctx.lineTo(-20, 8);
    ctx.lineTo(-14, 18);     // Right armored flank
    ctx.lineTo(8, 16);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Deployment hatch lights
    ctx.fillStyle = '#ff00aa';
    ctx.beginPath();
    ctx.arc(-16, -6, 2.5, 0, Math.PI * 2);
    ctx.arc(-16, 6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
