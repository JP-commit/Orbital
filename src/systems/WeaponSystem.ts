import { Projectile } from '../entities/Projectile';
import { Player } from '../entities/Player';
import { CONFIG } from '../config';
import { Entity } from '../entities/Entity';
import { ParticleSystem } from './ParticleSystem';

export type WeaponType = 'BLASTER' | 'SPREAD' | 'RAPID' | 'LASER' | 'MISSILE';

export interface WeaponState {
  type: WeaponType;
  ammo: number;       // Infinity for blaster
  duration: number;   // for laser
  maxDuration: number;
}

export class WeaponSystem {
  public projectiles: Projectile[] = [];
  public currentWeapon: WeaponState = {
    type: 'BLASTER',
    ammo: Infinity,
    duration: 0,
    maxDuration: 0,
  };

  public isGodMode: boolean = false;
  public isLaserActive: boolean = false;
  public laserRay = { startX: 0, startY: 0, endX: 0, endY: 0 };

  private fireCooldownTimer: number = 0;
  private readonly maxProjectiles: number = 300;

  constructor() {
    for (let i = 0; i < this.maxProjectiles; i++) {
      this.projectiles.push(new Projectile());
    }
  }

  public getFreeProjectile(): Projectile | null {
    for (let i = 0; i < this.maxProjectiles; i++) {
      if (this.projectiles[i].dead) {
        return this.projectiles[i];
      }
    }
    return null;
  }

  public setWeapon(type: WeaponType): void {
    if (type === 'BLASTER') {
      this.currentWeapon = { type: 'BLASTER', ammo: Infinity, duration: 0, maxDuration: 0 };
    } else if (type === 'SPREAD') {
      this.currentWeapon = { type: 'SPREAD', ammo: CONFIG.WEAPONS.SPREAD.DEFAULT_AMMO, duration: 0, maxDuration: 0 };
    } else if (type === 'RAPID') {
      this.currentWeapon = { type: 'RAPID', ammo: CONFIG.WEAPONS.RAPID.DEFAULT_AMMO, duration: 0, maxDuration: 0 };
    } else if (type === 'LASER') {
      this.currentWeapon = { type: 'LASER', ammo: Infinity, duration: CONFIG.WEAPONS.LASER.DURATION, maxDuration: CONFIG.WEAPONS.LASER.DURATION };
    } else if (type === 'MISSILE') {
      this.currentWeapon = { type: 'MISSILE', ammo: CONFIG.WEAPONS.MISSILE.DEFAULT_AMMO, duration: 0, maxDuration: 0 };
    }
  }

  public update(dt: number): void {
    if (this.fireCooldownTimer > 0) {
      this.fireCooldownTimer -= dt;
    }

    // Laser duration countdown (never depletes in God Mode)
    if (this.currentWeapon.type === 'LASER') {
      if (!this.isGodMode) {
        this.currentWeapon.duration -= dt;
        if (this.currentWeapon.duration <= 0) {
          this.setWeapon('BLASTER');
        }
      } else {
        this.currentWeapon.duration = this.currentWeapon.maxDuration || 9.0;
      }
    }

    // Update active projectiles
    for (let i = 0; i < this.maxProjectiles; i++) {
      if (!this.projectiles[i].dead) {
        this.projectiles[i].update(dt);
      }
    }
  }

  public tryFire(
    player: Player,
    isFiring: boolean,
    potentialTargets: Entity[] = [],
    dt: number = 1 / 60,
    onLaserHit?: (target: Entity, damage: number, hitX: number, hitY: number) => void,
    onRecoil?: (cameraTrauma: number) => void,
    particles?: ParticleSystem
  ): void {
    this.isLaserActive = false;
    if (!isFiring || player.dead) return;

    const angle = player.rotation;
    const noseX = player.x + Math.cos(angle) * (player.radius + 4);
    const noseY = player.y + Math.sin(angle) * (player.radius + 4);

    if (this.currentWeapon.type === 'LASER') {
      // Continuous Laser Beam Ray-Cast
      this.isLaserActive = true;
      const laserCfg = CONFIG.WEAPONS.LASER;
      player.applyRecoil(laserCfg.RECOIL_PER_SEC * dt, laserCfg.VISUAL_RECOIL);
      if (onRecoil && Math.random() < 0.25) {
        onRecoil(0.015);
      }

      const range = laserCfg.RANGE;
      const endX = noseX + Math.cos(angle) * range;
      const endY = noseY + Math.sin(angle) * range;
      this.laserRay = { startX: noseX, startY: noseY, endX, endY };

      const laserDmg = laserCfg.DAMAGE_PER_SEC * dt;

      // Piercing ray-to-circle intersection
      for (let i = 0; i < potentialTargets.length; i++) {
        const target = potentialTargets[i];
        if (target.dead) continue;

        // Vector from nose to target
        const tx = target.x - noseX;
        const ty = target.y - noseY;
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);

        // Projection
        const proj = tx * dirX + ty * dirY;
        if (proj > 0 && proj < range) {
          const perpDistSq = (tx * tx + ty * ty) - proj * proj;
          if (perpDistSq <= (target.radius + 10) * (target.radius + 10)) {
            // Hit by laser beam!
            const hitX = noseX + dirX * proj;
            const hitY = noseY + dirY * proj;
            if (onLaserHit) {
              onLaserHit(target, laserDmg, hitX, hitY);
            }
          }
        }
      }
      return;
    }

    if (this.fireCooldownTimer > 0) return;

    switch (this.currentWeapon.type) {
      case 'BLASTER': {
        const cfg = CONFIG.WEAPONS.BLASTER;
        this.fireCooldownTimer = 1 / cfg.FIRE_RATE;
        player.applyRecoil(cfg.RECOIL, cfg.VISUAL_RECOIL);
        if (onRecoil) onRecoil(0.04);
        if (particles) particles.emitBurst(noseX, noseY, 2, cfg.COLOR, 0.4);

        const p = this.getFreeProjectile();
        if (p) {
          p.spawn(
            noseX,
            noseY,
            player.vx * 0.3 + Math.cos(angle) * cfg.SPEED,
            player.vy * 0.3 + Math.sin(angle) * cfg.SPEED,
            'BLASTER',
            cfg.DAMAGE,
            cfg.LIFETIME,
            cfg.COLOR,
            4,
            false
          );
        }
        break;
      }

      case 'SPREAD': {
        const cfg = CONFIG.WEAPONS.SPREAD;
        this.fireCooldownTimer = 1 / cfg.FIRE_RATE;
        player.applyRecoil(cfg.RECOIL, cfg.VISUAL_RECOIL);
        if (onRecoil) onRecoil(0.14);
        if (particles) particles.emitBurst(noseX, noseY, 6, cfg.COLOR, 0.8);

        const count = cfg.COUNT;
        const halfSpread = cfg.SPREAD_ANGLE / 2;
        const step = cfg.SPREAD_ANGLE / (count - 1);

        for (let i = 0; i < count; i++) {
          const p = this.getFreeProjectile();
          if (!p) break;
          const pelletAngle = angle - halfSpread + i * step;
          p.spawn(
            noseX,
            noseY,
            player.vx * 0.2 + Math.cos(pelletAngle) * cfg.SPEED,
            player.vy * 0.2 + Math.sin(pelletAngle) * cfg.SPEED,
            'SPREAD',
            cfg.DAMAGE,
            cfg.LIFETIME,
            cfg.COLOR,
            3.5,
            false
          );
        }
        if (!this.isGodMode) {
          this.currentWeapon.ammo--;
          if (this.currentWeapon.ammo <= 0) this.setWeapon('BLASTER');
        }
        break;
      }

      case 'RAPID': {
        const cfg = CONFIG.WEAPONS.RAPID;
        this.fireCooldownTimer = 1 / cfg.FIRE_RATE;
        player.applyRecoil(cfg.RECOIL, cfg.VISUAL_RECOIL);
        if (onRecoil) onRecoil(0.02);

        // Alternating wing mounts
        const wingOffset = (Math.random() > 0.5 ? 1 : -1) * 8;
        const perpX = Math.cos(angle + Math.PI / 2) * wingOffset;
        const perpY = Math.sin(angle + Math.PI / 2) * wingOffset;
        if (particles) particles.emitBurst(noseX + perpX, noseY + perpY, 1, cfg.COLOR, 0.3);

        const p = this.getFreeProjectile();
        if (p) {
          const jitter = (Math.random() - 0.5) * 0.08;
          p.spawn(
            noseX + perpX,
            noseY + perpY,
            player.vx * 0.2 + Math.cos(angle + jitter) * cfg.SPEED,
            player.vy * 0.2 + Math.sin(angle + jitter) * cfg.SPEED,
            'RAPID',
            cfg.DAMAGE,
            cfg.LIFETIME,
            cfg.COLOR,
            3,
            false
          );
        }
        if (!this.isGodMode) {
          this.currentWeapon.ammo--;
          if (this.currentWeapon.ammo <= 0) this.setWeapon('BLASTER');
        }
        break;
      }

      case 'MISSILE': {
        const cfg = CONFIG.WEAPONS.MISSILE;
        this.fireCooldownTimer = 1 / cfg.FIRE_RATE;
        player.applyRecoil(cfg.RECOIL, cfg.VISUAL_RECOIL);
        if (onRecoil) onRecoil(0.09);
        if (particles) particles.emitBurst(player.x, player.y, 4, '#ff9900', 0.6);

        // Find nearest threat in front
        let nearestTarget: Entity | null = null;
        let minDist = 800;
        for (const target of potentialTargets) {
          if (target.dead) continue;
          const dist = Math.hypot(target.x - player.x, target.y - player.y);
          if (dist < minDist) {
            minDist = dist;
            nearestTarget = target;
          }
        }

        // Fire dual missiles
        for (const side of [-1, 1]) {
          const p = this.getFreeProjectile();
          if (!p) break;
          const perpX = Math.cos(angle + Math.PI / 2) * (side * 10);
          const perpY = Math.sin(angle + Math.PI / 2) * (side * 10);
          const launchAngle = angle + side * 0.2;
          p.spawn(
            player.x + perpX,
            player.y + perpY,
            Math.cos(launchAngle) * cfg.INITIAL_SPEED,
            Math.sin(launchAngle) * cfg.INITIAL_SPEED,
            'MISSILE',
            cfg.DAMAGE,
            cfg.LIFETIME,
            cfg.COLOR,
            5,
            false,
            nearestTarget
          );
        }
        if (!this.isGodMode) {
          this.currentWeapon.ammo--;
          if (this.currentWeapon.ammo <= 0) this.setWeapon('BLASTER');
        }
        break;
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    // Projectiles
    for (let i = 0; i < this.maxProjectiles; i++) {
      if (!this.projectiles[i].dead) {
        this.projectiles[i].render(ctx);
      }
    }

    // Laser Beam Ray Render
    if (this.isLaserActive) {
      ctx.save();
      ctx.shadowColor = '#00ffaa';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#00ffaa';
      ctx.lineWidth = 4.0;
      ctx.beginPath();
      ctx.moveTo(this.laserRay.startX, this.laserRay.startY);
      ctx.lineTo(this.laserRay.endX, this.laserRay.endY);
      ctx.stroke();

      // Core white ray
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(this.laserRay.startX, this.laserRay.startY);
      ctx.lineTo(this.laserRay.endX, this.laserRay.endY);
      ctx.stroke();
      ctx.restore();
    }
  }

  public reset(): void {
    for (let i = 0; i < this.maxProjectiles; i++) {
      this.projectiles[i].dead = true;
    }
    this.setWeapon('BLASTER');
  }
}
