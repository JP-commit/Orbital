import { Boss } from './Boss';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { Camera } from '../../core/Camera';
import { PRNG } from '../../core/PRNG';
import { Enemy } from '../enemies/Enemy';
import { Drone } from '../enemies/Drone';
import { CONFIG } from '../../config';

export class Dreadnought extends Boss {
  public speed: number = 75;
  private turretCooldown: number = 1.8;
  private spawnDroneCooldown: number = 10.0;
  private ringBarrageCooldown: number = 2.0;

  // Sweeping Laser State (Phase 2 & 3)
  private laserState: 'IDLE' | 'TELEGRAPH' | 'FIRING' = 'IDLE';
  private laserTimer: number = 0;
  private laserStartAngle: number = 0;
  private laserEndAngle: number = 0;
  private currentLaserAngle: number = 0;
  private laserCooldown: number = 6.0;

  constructor(x: number, y: number, encounterLevel: number = 1) {
    const cfg = CONFIG.BOSSES.DREADNOUGHT;
    super(x, y, cfg.RADIUS, 'Leviathan Dreadnought', cfg.HP, cfg.SCORE, cfg.COLOR, encounterLevel);
    this.maxPhases = 3;
    this.rotation = Math.PI / 2;
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

  public updateBossAI(
    dt: number,
    player: Player,
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    camera: Camera,
    prng: PRNG,
    spawnEnemyCallback: (enemy: Enemy) => void,
    _spawnMineCallback: (x: number, y: number) => void
  ): void {
    if (this.dead || player.dead) return;

    // Phase transitions based on HP
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio > 0.60) {
      this.phase = 1;
    } else if (hpRatio > 0.25) {
      this.phase = 2;
    } else {
      this.phase = 3;
    }

    // Steering toward player
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // Rotate toward player
    const turnRate = this.phase === 3 ? 2.5 : 1.2;
    let angleDiff = targetAngle - this.rotation;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), turnRate * dt);

    // Movement
    const currentSpeed = this.phase === 3 ? this.speed * 1.6 : this.speed;
    if (this.laserState !== 'FIRING') {
      this.vx = Math.cos(this.rotation) * currentSpeed;
      this.vy = Math.sin(this.rotation) * currentSpeed;
    } else {
      this.vx *= (1 - 2 * dt);
      this.vy *= (1 - 2 * dt);
    }

    // Phase 1: Turret volleys & Escort drone spawns
    this.turretCooldown -= dt;
    if (this.turretCooldown <= 0 && dist < 1200) {
      this.turretCooldown = this.phase === 3 ? 1.0 : 1.8;
      // Fire 4 angled turrets
      const turretAngles = [-0.6, -0.2, 0.2, 0.6];
      for (let i = 0; i < turretAngles.length; i++) {
        const fireAngle = this.rotation + turretAngles[i];
        const p = weaponSystem.getFreeProjectile();
        if (p) {
          const spawnDist = this.radius * 0.8;
          p.spawn(
            this.x + Math.cos(fireAngle) * spawnDist,
            this.y + Math.sin(fireAngle) * spawnDist,
            Math.cos(fireAngle) * 440,
            Math.sin(fireAngle) * 440,
            'ENEMY',
            18,
            2.5,
            '#ff0055',
            4,
            true
          );
        }
      }
      particles.emitBurst(this.x, this.y, 6, '#ff0055', 0.8);
    }

    // Spawn drones periodically (Phase 1 and 2)
    this.spawnDroneCooldown -= dt;
    if (this.spawnDroneCooldown <= 0 && this.phase <= 2) {
      this.spawnDroneCooldown = 11.0;
      for (const side of [-1, 1]) {
        const droneAngle = this.rotation + Math.PI + side * 0.5;
        const droneX = this.x + Math.cos(droneAngle) * (this.radius + 20);
        const droneY = this.y + Math.sin(droneAngle) * (this.radius + 20);
        spawnEnemyCallback(new Drone(droneX, droneY));
        particles.emitBurst(droneX, droneY, 8, '#ff3366', 1.0);
      }
    }

    // Phase 2 & 3: Sweeping Telegraphed Death Laser
    if (this.phase >= 2) {
      this.laserCooldown -= dt;
      if (this.laserState === 'IDLE' && this.laserCooldown <= 0 && dist < 1000) {
        // Start telegraph
        this.laserState = 'TELEGRAPH';
        this.laserTimer = 1.4;
        this.laserStartAngle = targetAngle - 0.75;
        this.laserEndAngle = targetAngle + 0.75;
        this.currentLaserAngle = this.laserStartAngle;
      } else if (this.laserState === 'TELEGRAPH') {
        this.laserTimer -= dt;
        // Condense charge particles at nose
        particles.emitBurst(
          this.x + Math.cos(this.rotation) * this.radius,
          this.y + Math.sin(this.rotation) * this.radius,
          2,
          '#ff0033',
          0.4
        );
        if (this.laserTimer <= 0) {
          this.laserState = 'FIRING';
          this.laserTimer = 1.3;
          camera.addTrauma(0.3);
        }
      } else if (this.laserState === 'FIRING') {
        this.laserTimer -= dt;
        const progress = 1 - this.laserTimer / 1.3;
        this.currentLaserAngle = this.laserStartAngle + (this.laserEndAngle - this.laserStartAngle) * progress;

        // Check if sweeping laser hits player
        const beamRange = 900;
        const noseX = this.x + Math.cos(this.rotation) * this.radius;
        const noseY = this.y + Math.sin(this.rotation) * this.radius;
        const toPlayerAngle = Math.atan2(player.y - noseY, player.x - noseX);
        let diff = toPlayerAngle - this.currentLaserAngle;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;

        if (Math.abs(diff) < 0.12 && dist < beamRange) {
          player.takeDamage(120 * dt, particles);
          camera.addTrauma(0.2);
          particles.emitBurst(player.x, player.y, 3, '#ff0033', 1.0);
        }

        if (this.laserTimer <= 0) {
          this.laserState = 'IDLE';
          this.laserCooldown = this.phase === 3 ? 4.5 : 7.0;
        }
      }
    }

    // Phase 3: Core Meltdown 360-degree Ring Barrage
    if (this.phase === 3) {
      this.ringBarrageCooldown -= dt;
      if (this.ringBarrageCooldown <= 0) {
        this.ringBarrageCooldown = 2.4;
        const pellets = 16;
        for (let i = 0; i < pellets; i++) {
          const a = (i * Math.PI * 2) / pellets + prng.range(-0.1, 0.1);
          const p = weaponSystem.getFreeProjectile();
          if (p) {
            p.spawn(
              this.x + Math.cos(a) * (this.radius * 0.7),
              this.y + Math.sin(a) * (this.radius * 0.7),
              Math.cos(a) * 360,
              Math.sin(a) * 360,
              'ENEMY',
              15,
              3.0,
              '#ff0033',
              4.5,
              true
            );
          }
        }
        camera.addTrauma(0.25);
        particles.emitRing(this.x, this.y, '#ff0033', 20, 100);
      }
    }
  }

  public renderTelegraphs(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    const noseX = this.x + Math.cos(this.rotation) * this.radius;
    const noseY = this.y + Math.sin(this.rotation) * this.radius;
    const beamRange = 900;

    if (this.laserState === 'TELEGRAPH') {
      ctx.save();
      // Glowing red aim guidance cone
      ctx.strokeStyle = 'rgba(255, 0, 80, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(noseX + Math.cos(this.laserStartAngle) * beamRange, noseY + Math.sin(this.laserStartAngle) * beamRange);
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(noseX + Math.cos(this.laserEndAngle) * beamRange, noseY + Math.sin(this.laserEndAngle) * beamRange);
      ctx.stroke();

      // Sweeping guide needle
      ctx.strokeStyle = '#ff0033';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 10;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(noseX + Math.cos(this.currentLaserAngle) * beamRange, noseY + Math.sin(this.currentLaserAngle) * beamRange);
      ctx.stroke();
      ctx.restore();
    } else if (this.laserState === 'FIRING') {
      ctx.save();
      // Lethal concentrated sweeping beam
      const endX = noseX + Math.cos(this.currentLaserAngle) * beamRange;
      const endY = noseY + Math.sin(this.currentLaserAngle) * beamRange;

      ctx.strokeStyle = '#ff0033';
      ctx.shadowColor = '#ff0033';
      ctx.shadowBlur = 24;
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // White hot core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
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
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(255, 0, 85, 0.2)';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 12;

    // Heavy battleship hull outline
    ctx.beginPath();
    ctx.moveTo(85, 0);        // Forward prow
    ctx.lineTo(55, -35);      // Forward armor angle
    ctx.lineTo(25, -65);      // Front wing root
    ctx.lineTo(-40, -80);     // Main armored flank
    ctx.lineTo(-75, -50);     // Rear engine pod left
    ctx.lineTo(-65, -25);     // Rear notch
    ctx.lineTo(-85, -15);     // Main engine
    ctx.lineTo(-85, 15);      // Main engine
    ctx.lineTo(-65, 25);      // Rear notch
    ctx.lineTo(-75, 50);      // Rear engine pod right
    ctx.lineTo(-40, 80);      // Main armored flank
    ctx.lineTo(25, 65);       // Front wing root
    ctx.lineTo(55, 35);       // Forward armor angle
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Twin forward prongs (Phase 2 & 3 exposed)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, -20);
    ctx.lineTo(80, -20);
    ctx.moveTo(40, 20);
    ctx.lineTo(80, 20);
    ctx.stroke();

    // Core Reactor (Pulsing bright red / core meltdown in Phase 3)
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * (this.phase === 3 ? 0.015 : 0.005));
    ctx.fillStyle = `rgba(255, 0, 50, ${pulse})`;
    ctx.shadowColor = '#ff0033';
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(0, 0, this.phase === 3 ? 24 : 18, 0, Math.PI * 2);
    ctx.fill();

    // Turret Hardpoints
    const turrets = [
      { x: 30, y: -45 },
      { x: 30, y: 45 },
      { x: -20, y: -55 },
      { x: -20, y: 55 },
    ];
    ctx.fillStyle = '#ff0055';
    for (const t of turrets) {
      ctx.beginPath();
      ctx.arc(t.x, t.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }
}
