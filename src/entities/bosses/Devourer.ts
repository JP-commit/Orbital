import { Boss } from './Boss';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { Camera } from '../../core/Camera';
import { PRNG } from '../../core/PRNG';
import { Enemy } from '../enemies/Enemy';
import { CONFIG } from '../../config';

export class Devourer extends Boss {
  public speed: number = 90;
  private isSuctionActive: boolean = false;
  private suctionTimer: number = 0;
  private suctionCooldown: number = 6.0;

  // Charge state (Phase 2)
  private chargeState: 'IDLE' | 'TELEGRAPH' | 'DASH' = 'IDLE';
  private chargeTimer: number = 0;
  private chargeTargetAngle: number = 0;
  private chargeCooldown: number = 5.0;

  private missileCooldown: number = 3.5;
  private minefieldCooldown: number = 4.0;

  constructor(x: number, y: number, encounterLevel: number = 1) {
    const cfg = CONFIG.BOSSES.DEVOURER;
    super(x, y, cfg.RADIUS, 'The Devourer Mothership', cfg.HP, cfg.SCORE, cfg.COLOR, encounterLevel);
    this.maxPhases = 2;
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
    _prng: PRNG,
    _spawnEnemyCallback: (enemy: Enemy) => void,
    spawnMineCallback: (x: number, y: number) => void
  ): void {
    if (this.dead || player.dead) return;

    // Phase transition at 50% HP
    const hpRatio = this.hp / this.maxHp;
    if (hpRatio <= 0.50 && this.phase === 1) {
      this.phase = 2;
      this.isSuctionActive = false;
      camera.addTrauma(0.45);
      particles.emitRing(this.x, this.y, '#9d00ff', 30, 240);
      particles.emitBurst(this.x, this.y, 40, '#9d00ff', 2.0);
    }

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);

    // Turn toward player unless dashing
    if (this.chargeState !== 'DASH') {
      let angleDiff = targetAngle - this.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), (this.phase === 2 ? 3.0 : 1.4) * dt);
    }

    // Phase 1: Gravity Vortex Suction & Swarm Missiles
    if (this.phase === 1) {
      this.suctionCooldown -= dt;
      if (!this.isSuctionActive && this.suctionCooldown <= 0 && dist < 950) {
        this.isSuctionActive = true;
        this.suctionTimer = 3.5;
      }

      if (this.isSuctionActive) {
        this.suctionTimer -= dt;
        // Frontal gravity cone pulls player toward mandibles
        const suctionRange = 850;
        if (dist < suctionRange) {
          const pullStrength = 360 * (1 - dist / suctionRange) + 120;
          player.vx -= (dx / dist) * pullStrength * dt * 3.5;
          player.vy -= (dy / dist) * pullStrength * dt * 3.5;
          camera.addTrauma(0.08);

          // Condensing suction particle vortex
          if (Math.random() < 0.4) {
            particles.emitBurst(
              this.x + Math.cos(this.rotation) * 45,
              this.y + Math.sin(this.rotation) * 45,
              2,
              '#cc00ff',
              0.5
            );
          }
        }

        // Damage player if dragged directly into mandibles
        if (dist < this.radius + player.radius + 15) {
          player.takeDamage(85 * dt, particles);
          camera.addTrauma(0.35);
        }

        if (this.suctionTimer <= 0) {
          this.isSuctionActive = false;
          this.suctionCooldown = 6.5;
        }
      } else {
        // Standard forward creep
        this.vx = Math.cos(this.rotation) * this.speed;
        this.vy = Math.sin(this.rotation) * this.speed;
      }

      // Swarm Missiles
      this.missileCooldown -= dt;
      if (this.missileCooldown <= 0 && dist < 1100) {
        this.missileCooldown = 3.2;
        for (const side of [-1, 1]) {
          const p = weaponSystem.getFreeProjectile();
          if (p) {
            const launchAngle = this.rotation + side * 0.7;
            p.spawn(
              this.x + Math.cos(launchAngle) * this.radius,
              this.y + Math.sin(launchAngle) * this.radius,
              Math.cos(launchAngle) * 320,
              Math.sin(launchAngle) * 320,
              'ENEMY',
              25,
              3.5,
              '#9d00ff',
              5,
              true
            );
          }
        }
        particles.emitBurst(this.x, this.y, 6, '#9d00ff', 0.8);
      }
    }

    // Phase 2: High-Speed Ramming Charge & Minefields
    if (this.phase === 2) {
      this.chargeCooldown -= dt;
      if (this.chargeState === 'IDLE' && this.chargeCooldown <= 0) {
        this.chargeState = 'TELEGRAPH';
        this.chargeTimer = 1.2;
        this.chargeTargetAngle = targetAngle;
      } else if (this.chargeState === 'TELEGRAPH') {
        this.chargeTimer -= dt;
        this.vx *= (1 - 2 * dt);
        this.vy *= (1 - 2 * dt);
        // Warning exhaust glow
        particles.emitBurst(
          this.x - Math.cos(this.rotation) * this.radius,
          this.y - Math.sin(this.rotation) * this.radius,
          4,
          '#ff0055',
          1.2
        );
        if (this.chargeTimer <= 0) {
          this.chargeState = 'DASH';
          this.chargeTimer = 1.4;
          camera.addTrauma(0.4);
          const dashSpeed = 460;
          this.vx = Math.cos(this.chargeTargetAngle) * dashSpeed;
          this.vy = Math.sin(this.chargeTargetAngle) * dashSpeed;
        }
      } else if (this.chargeState === 'DASH') {
        this.chargeTimer -= dt;
        particles.emitThruster(this.x, this.y, this.chargeTargetAngle, this.vx, this.vy);

        // Ram player
        if (dist < this.radius + player.radius) {
          player.takeDamage(45, particles);
          camera.addTrauma(0.5);
          player.vx += Math.cos(this.chargeTargetAngle) * 400;
          player.vy += Math.sin(this.chargeTargetAngle) * 400;
        }

        if (this.chargeTimer <= 0) {
          this.chargeState = 'IDLE';
          this.chargeCooldown = 4.5;
        }
      }

      // Drop cluster mines during charge
      this.minefieldCooldown -= dt;
      if (this.minefieldCooldown <= 0) {
        this.minefieldCooldown = 3.5;
        const mineX = this.x - Math.cos(this.rotation) * (this.radius + 20);
        const mineY = this.y - Math.sin(this.rotation) * (this.radius + 20);
        spawnMineCallback(mineX, mineY);
      }
    }
  }

  public renderTelegraphs(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    // Gravity Vortex cone telegraph (Phase 1)
    if (this.isSuctionActive) {
      ctx.save();
      const noseX = this.x + Math.cos(this.rotation) * (this.radius * 0.7);
      const noseY = this.y + Math.sin(this.rotation) * (this.radius * 0.7);
      const coneRange = 850;
      const halfAngle = 0.45;

      const grad = ctx.createRadialGradient(noseX, noseY, 20, noseX, noseY, coneRange);
      grad.addColorStop(0, 'rgba(157, 0, 255, 0.45)');
      grad.addColorStop(1, 'rgba(157, 0, 255, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(noseX, noseY);
      ctx.arc(noseX, noseY, coneRange, this.rotation - halfAngle, this.rotation + halfAngle);
      ctx.closePath();
      ctx.fill();

      // Cone outline pulses
      ctx.strokeStyle = 'rgba(200, 0, 255, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }

    // Charge telegraph line (Phase 2)
    if (this.chargeState === 'TELEGRAPH') {
      ctx.save();
      ctx.strokeStyle = '#ff0055';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([12, 10]);
      ctx.shadowColor = '#ff0055';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + Math.cos(this.chargeTargetAngle) * 900, this.y + Math.sin(this.chargeTargetAngle) * 900);
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
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(157, 0, 255, 0.2)';
    ctx.lineWidth = 2.4;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = 12;

    // Bio-mechanical carapace body
    ctx.beginPath();
    ctx.moveTo(95, -25);     // Left mandible tip
    ctx.lineTo(60, -10);     // Left jaw joint
    ctx.lineTo(35, -45);     // Left front claw
    ctx.lineTo(-20, -75);    // Left armored flank
    ctx.lineTo(-65, -85);    // Left rear claw
    ctx.lineTo(-85, -35);    // Left engine pod
    ctx.lineTo(-100, 0);     // Stern spine
    ctx.lineTo(-85, 35);     // Right engine pod
    ctx.lineTo(-65, 85);     // Right rear claw
    ctx.lineTo(-20, 75);     // Right armored flank
    ctx.lineTo(35, 45);      // Right front claw
    ctx.lineTo(60, 10);      // Right jaw joint
    ctx.lineTo(95, 25);      // Right mandible tip
    ctx.lineTo(40, 0);       // Inner throat intake
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Intake glowing throat
    const throatPulse = 0.6 + 0.4 * Math.sin(Date.now() * 0.01);
    ctx.fillStyle = `rgba(255, 0, 200, ${throatPulse})`;
    ctx.beginPath();
    ctx.arc(42, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Carapace rib segments
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(10, -35); ctx.lineTo(10, 35);
    ctx.moveTo(-20, -50); ctx.lineTo(-20, 50);
    ctx.moveTo(-50, -45); ctx.lineTo(-50, 45);
    ctx.stroke();

    ctx.restore();
  }
}
