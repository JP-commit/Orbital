import { Enemy } from './Enemy';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { PRNG } from '../../core/PRNG';
import { CONFIG } from '../../config';

export class Raider extends Enemy {
  public speed: number;
  public fireCooldown: number = 0;
  public circleDirection: number = 1;
  public strafeTimer: number = 0;

  constructor(x: number, y: number, prng: PRNG) {
    const cfg = CONFIG.ENEMIES.RAIDER;
    super(x, y, cfg.RADIUS, cfg.HP, cfg.SCORE, cfg.COLOR);
    this.speed = cfg.SPEED;
    this.fireCooldown = prng.range(0.5, 1.5);
    this.circleDirection = prng.chance(0.5) ? 1 : -1;
  }

  public update(dt: number): void {
    if (this.dead) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds clamp
    const pad = this.radius;
    this.x = Math.max(pad, Math.min(CONFIG.WORLD_WIDTH - pad, this.x));
    this.y = Math.max(pad, Math.min(CONFIG.WORLD_HEIGHT - pad, this.y));
  }

  public updateAI(
    dt: number,
    player: Player,
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    prng: PRNG
  ): void {
    if (this.dead || player.dead) return;

    this.strafeTimer += dt;
    if (this.strafeTimer > 4.0) {
      this.strafeTimer = 0;
      if (prng.chance(0.4)) this.circleDirection *= -1;
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    // Aim rotation toward player
    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - this.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), 4.0 * dt);

    // Movement: maintain standoff distance 320px + orbit laterally
    let moveVx = 0;
    let moveVy = 0;

    const desiredDist = 320;
    if (dist > desiredDist + 60) {
      // Approach
      moveVx += Math.cos(targetAngle) * this.speed;
      moveVy += Math.sin(targetAngle) * this.speed;
    } else if (dist < desiredDist - 60) {
      // Back away
      moveVx -= Math.cos(targetAngle) * this.speed;
      moveVy -= Math.sin(targetAngle) * this.speed;
    }

    // Lateral strafe
    const perpAngle = targetAngle + (Math.PI / 2) * this.circleDirection;
    moveVx += Math.cos(perpAngle) * (this.speed * 0.85);
    moveVy += Math.sin(perpAngle) * (this.speed * 0.85);

    this.vx = moveVx;
    this.vy = moveVy;

    // Firing logic
    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && dist < 650) {
      this.fireCooldown = 1 / CONFIG.ENEMIES.RAIDER.FIRE_RATE + prng.range(-0.15, 0.25);

      // Fire twin enemy blaster bolts from outriggers
      for (const side of [-1, 1]) {
        const p = weaponSystem.getFreeProjectile();
        if (p) {
          const perpX = Math.cos(this.rotation + Math.PI / 2) * (side * 10);
          const perpY = Math.sin(this.rotation + Math.PI / 2) * (side * 10);
          const gunX = this.x + Math.cos(this.rotation) * 12 + perpX;
          const gunY = this.y + Math.sin(this.rotation) * 12 + perpY;

          // Lead target slightly
          const bulletSpeed = 520;
          const leadTime = dist / bulletSpeed;
          const aimX = player.x + player.vx * leadTime * 0.5 - gunX;
          const aimY = player.y + player.vy * leadTime * 0.5 - gunY;
          const fireAngle = Math.atan2(aimY, aimX) + prng.range(-0.06, 0.06);

          p.spawn(
            gunX,
            gunY,
            Math.cos(fireAngle) * bulletSpeed,
            Math.sin(fireAngle) * bulletSpeed,
            'ENEMY',
            CONFIG.ENEMIES.RAIDER.DAMAGE,
            2.0,
            '#ff5500',
            4,
            true
          );
        }
      }
      particles.emitBurst(this.x + Math.cos(this.rotation) * 14, this.y + Math.sin(this.rotation) * 14, 4, '#ff9900', 0.6);
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
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(255, 153, 0, 0.25)';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 8;

    // Heavy twin-nacelle attack ship
    ctx.beginPath();
    ctx.moveTo(16, 0);       // Central nose
    ctx.lineTo(6, -8);
    ctx.lineTo(-12, -14);    // Left gun pod
    ctx.lineTo(-6, -6);
    ctx.lineTo(-14, 0);      // Rear engine
    ctx.lineTo(-6, 6);
    ctx.lineTo(-12, 14);     // Right gun pod
    ctx.lineTo(6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Gun barrels
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(4, -14);
    ctx.moveTo(-12, 14);
    ctx.lineTo(4, 14);
    ctx.stroke();

    ctx.restore();
  }
}
