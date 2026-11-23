import { Boss } from './Boss';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { Camera } from '../../core/Camera';
import { PRNG } from '../../core/PRNG';
import { Enemy } from '../enemies/Enemy';
import { CONFIG } from '../../config';

interface OrbitalShield {
  angle: number;
  width: number;
  height: number;
  active: boolean;
}

export class PulsarCore extends Boss {
  public speed: number = 85;
  private orbitAngle: number = 0;
  private shields: OrbitalShield[] = [];
  private spiralFireTimer: number = 0;
  private spiralAngle: number = 0;
  private shockwaveCooldown: number = 4.5;
  private salvoCooldown: number = 2.5;

  constructor(x: number, y: number, encounterLevel: number = 1) {
    const cfg = CONFIG.BOSSES.PULSAR_CORE;
    super(x, y, cfg.RADIUS, 'Pulsar Core Sentinel', cfg.HP, cfg.SCORE, cfg.COLOR, encounterLevel);
    this.maxPhases = 2;

    // 4 orbital deflector shields
    for (let i = 0; i < 4; i++) {
      this.shields.push({
        angle: (i * Math.PI) / 2,
        width: 32,
        height: 10,
        active: true,
      });
    }
  }

  public update(dt: number): void {
    if (this.dead) return;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Revolve orbital shields
    const orbitSpeed = this.phase === 2 ? 2.4 : 1.2;
    this.orbitAngle += orbitSpeed * dt;
    for (let i = 0; i < this.shields.length; i++) {
      this.shields[i].angle = this.orbitAngle + (i * Math.PI) / 2;
    }

    // Boundary clamp
    const pad = this.radius + 30;
    this.x = Math.max(pad, Math.min(CONFIG.WORLD_WIDTH - pad, this.x));
    this.y = Math.max(pad, Math.min(CONFIG.WORLD_HEIGHT - pad, this.y));
  }

  public updateBossAI(
    dt: number,
    player: Player,
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    camera: Camera,
    prng: PRNG,
    _spawnEnemyCallback: (enemy: Enemy) => void,
    _spawnMineCallback: (x: number, y: number) => void
  ): void {
    if (this.dead || player.dead) return;

    // Phase transition at 50% HP
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio <= 0.50 && this.phase === 1) {
      this.phase = 2;
      camera.addTrauma(0.4);
      particles.emitRing(this.x, this.y, '#00e5ff', 30, 220);
      particles.emitBurst(this.x, this.y, 35, '#00e5ff', 2.0);
    }

    // Smooth movement toward arena center / tracking player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);

    this.rotation += (this.phase === 2 ? 1.8 : 0.8) * dt;

    // Maintain 350px distance
    const targetAngle = Math.atan2(dy, dx);
    const desiredDist = 380;
    let moveSpeed = 0;
    if (dist > desiredDist + 50) moveSpeed = this.speed;
    else if (dist < desiredDist - 50) moveSpeed = -this.speed * 0.7;

    this.vx = Math.cos(targetAngle) * moveSpeed;
    this.vy = Math.sin(targetAngle) * moveSpeed;

    // Attack 1: Dual Rotating Spiral Laser Stream
    this.spiralFireTimer -= dt;
    if (this.spiralFireTimer <= 0 && dist < 1100) {
      this.spiralFireTimer = this.phase === 2 ? 0.08 : 0.14;
      this.spiralAngle += 0.35;

      for (const offset of [0, Math.PI]) {
        const fireAngle = this.spiralAngle + offset;
        const p = weaponSystem.getFreeProjectile();
        if (p) {
          p.spawn(
            this.x + Math.cos(fireAngle) * (this.radius * 0.6),
            this.y + Math.sin(fireAngle) * (this.radius * 0.6),
            Math.cos(fireAngle) * 420,
            Math.sin(fireAngle) * 420,
            'ENEMY',
            14,
            2.5,
            '#00e5ff',
            3.5,
            true
          );
        }
      }
    }

    // Phase 2: Gravitational Shockwave Pulse & Photon Salvos
    if (this.phase === 2) {
      this.shockwaveCooldown -= dt;
      if (this.shockwaveCooldown <= 0) {
        this.shockwaveCooldown = 5.0;
        camera.addTrauma(0.4);
        particles.emitRing(this.x, this.y, '#00e5ff', 20, 280);

        // Repel player if close
        if (dist < 350) {
          const repelForce = 500 * (1 - dist / 350) + 150;
          player.vx += (dx / dist) * repelForce;
          player.vy += (dy / dist) * repelForce;
          player.takeDamage(20, particles);
        }
      }

      this.salvoCooldown -= dt;
      if (this.salvoCooldown <= 0 && dist < 900) {
        this.salvoCooldown = 2.8;
        // Targeted 5-photon burst
        for (let i = -2; i <= 2; i++) {
          const aimAngle = targetAngle + i * 0.12 + prng.range(-0.04, 0.04);
          const p = weaponSystem.getFreeProjectile();
          if (p) {
            p.spawn(
              this.x + Math.cos(aimAngle) * this.radius,
              this.y + Math.sin(aimAngle) * this.radius,
              Math.cos(aimAngle) * 580,
              Math.sin(aimAngle) * 580,
              'ENEMY',
              20,
              2.0,
              '#38bdf8',
              4,
              true
            );
          }
        }
      }
    }
  }

  // Intercept player bullets by orbital shields in Phase 1
  public checkShieldBlock(bulletX: number, bulletY: number, particles: ParticleSystem): boolean {
    if (this.phase >= 2) return false;

    const shieldOrbitRadius = this.radius + 22;
    for (let i = 0; i < this.shields.length; i++) {
      const s = this.shields[i];
      if (!s.active) continue;

      const sx = this.x + Math.cos(s.angle) * shieldOrbitRadius;
      const sy = this.y + Math.sin(s.angle) * shieldOrbitRadius;
      const dist = Math.hypot(bulletX - sx, bulletY - sy);

      if (dist < 22) {
        // Shield absorbed the hit!
        particles.emitBurst(bulletX, bulletY, 8, '#00e5ff', 1.0);
        particles.emitRing(sx, sy, '#00e5ff', 5, 25);
        return true;
      }
    }
    return false;
  }

  public renderTelegraphs(_ctx: CanvasRenderingContext2D): void {
    // Shockwave handled via particle rings
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    const isHit = this.hitFlashTimer > 0;
    const strokeColor = isHit ? '#ffffff' : this.color;

    // 1. Orbital Kinetic Deflector Shields
    const shieldOrbitRadius = this.radius + 22;
    for (let i = 0; i < this.shields.length; i++) {
      const s = this.shields[i];
      const sx = Math.cos(s.angle) * shieldOrbitRadius;
      const sy = Math.sin(s.angle) * shieldOrbitRadius;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(s.angle + Math.PI / 2);

      ctx.strokeStyle = '#00f0ff';
      ctx.fillStyle = 'rgba(0, 240, 255, 0.35)';
      ctx.lineWidth = 2.0;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.roundRect(-s.width / 2, -s.height / 2, s.width, s.height, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 2. Central Crystalline Geometric Core
    ctx.rotate(this.rotation);
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(0, 180, 255, 0.2)';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 14;

    // Octagram crystal geometry
    const points = 8;
    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const a = (i * Math.PI * 2) / points;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.72;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Singularity center
    const singPulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.008);
    ctx.fillStyle = `rgba(255, 255, 255, ${singPulse})`;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
