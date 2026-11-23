import { Entity } from './Entity';
import { CONFIG } from '../config';
import { ParticleSystem } from '../systems/ParticleSystem';

export class Player extends Entity {
  public fuel: number = CONFIG.PLAYER.MAX_FUEL;
  public maxFuel: number = CONFIG.PLAYER.MAX_FUEL;

  public shield: number = CONFIG.PLAYER.MAX_SHIELD;
  public maxShield: number = CONFIG.PLAYER.MAX_SHIELD;
  private shieldRechargeTimer: number = 0;

  public hull: number = CONFIG.PLAYER.MAX_HULL;
  public maxHull: number = CONFIG.PLAYER.MAX_HULL;

  public isThrusting: boolean = false;
  public isBraking: boolean = false;
  public isOutOffuel: boolean = false;
  public hitFlashTimer: number = 0;
  public shieldHitTimer: number = 0;
  public isGodMode: boolean = false;
  public recoilOffset: number = 0; // Visual gun-kick offset

  // Invulnerability on spawn / respawn (seconds)
  public invulnerabilityTimer: number = 2.0;

  constructor(x: number, y: number) {
    super(x, y, CONFIG.PLAYER.RADIUS, 'player');
    this.rotation = -Math.PI / 2; // Facing upwards initially
  }

  public applyRecoil(force: number, visualKick: number = 3): void {
    if (this.dead) return;
    // Physical velocity impulse in the opposite direction of ship facing angle
    this.vx -= Math.cos(this.rotation) * force;
    this.vy -= Math.sin(this.rotation) * force;

    // Visual gun kickback offset along the longitudinal axis of the ship
    this.recoilOffset = Math.min(10, this.recoilOffset + visualKick);
  }

  public updatePhysics(
    dt: number,
    thrustInput: number,
    steerInput: number,
    brakeInput: boolean,
    particles: ParticleSystem,
    noBoundaries: boolean = false
  ): void {
    if (this.dead) return;

    // Timers
    if (this.invulnerabilityTimer > 0) this.invulnerabilityTimer -= dt;
    if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
    if (this.shieldHitTimer > 0) this.shieldHitTimer -= dt;
    if (this.recoilOffset > 0) this.recoilOffset = Math.max(0, this.recoilOffset - dt * 28);

    // Fuel consumption (unlimited if noBoundaries/godMode)
    const isBurningThrust = thrustInput > 0.05 && this.fuel > 0;
    if (isBurningThrust && !noBoundaries) {
      this.fuel = Math.max(0, this.fuel - CONFIG.PLAYER.FUEL_BURN_RATE * thrustInput * dt);
    }
    // Idle life-support drain
    if (!noBoundaries) {
      this.fuel = Math.max(0, this.fuel - CONFIG.PLAYER.FUEL_IDLE_RATE * dt);
    } else {
      this.fuel = this.maxFuel;
      this.shield = this.maxShield;
      this.hull = this.maxHull;
    }
    this.isOutOffuel = this.fuel <= 0;

    // Steering
    const steerSpeed = this.isOutOffuel
      ? CONFIG.PLAYER.ROTATION_SPEED * 0.4
      : CONFIG.PLAYER.ROTATION_SPEED;
    this.rotation += steerInput * steerSpeed * dt;

    // Thrust acceleration
    this.isThrusting = isBurningThrust;
    this.isBraking = brakeInput;

    if (isBurningThrust) {
      const accel = (noBoundaries ? CONFIG.PLAYER.ACCELERATION * 1.3 : CONFIG.PLAYER.ACCELERATION) * thrustInput;
      this.vx += Math.cos(this.rotation) * accel * dt;
      this.vy += Math.sin(this.rotation) * accel * dt;

      // Emit thruster particles
      particles.emitThruster(this.x, this.y, this.rotation, this.vx, this.vy);
    } else if (this.isOutOffuel && thrustInput > 0.05) {
      // Solar emergency crawl: weak forward drift
      const crawlAccel = CONFIG.PLAYER.EMERGENCY_SOLAR_SPEED * 0.5;
      this.vx += Math.cos(this.rotation) * crawlAccel * dt;
      this.vy += Math.sin(this.rotation) * crawlAccel * dt;
    }

    // Velocity damping: Newtonian drift or Retro-thruster braking
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (brakeInput) {
      const brakeFactor = Math.max(0, 1 - CONFIG.PLAYER.BRAKE_DAMPING * dt);
      this.vx *= brakeFactor;
      this.vy *= brakeFactor;

      if (currentSpeed > 30 && Math.random() < 0.3) {
        particles.emitBurst(this.x, this.y, 1, '#00e5ff', 0.4);
      }
    } else {
      const dragFactor = Math.max(0, 1 - CONFIG.PLAYER.VACUUM_DAMPING * dt);
      this.vx *= dragFactor;
      this.vy *= dragFactor;
    }

    // Velocity clamp (higher in god mode / no boundaries)
    const baseMaxSpeed = noBoundaries ? CONFIG.PLAYER.MAX_SPEED * 1.6 : CONFIG.PLAYER.MAX_SPEED;
    const maxAllowedSpeed = this.isOutOffuel ? CONFIG.PLAYER.EMERGENCY_SOLAR_SPEED : baseMaxSpeed;
    if (currentSpeed > maxAllowedSpeed) {
      const ratio = maxAllowedSpeed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // World Boundary collision & soft repulsion (DISABLED when noBoundaries is true!)
    if (!noBoundaries) {
      const padding = this.radius;
      if (this.x < padding) {
        this.x = padding;
        this.vx = Math.abs(this.vx) * 0.5;
      } else if (this.x > CONFIG.WORLD_WIDTH - padding) {
        this.x = CONFIG.WORLD_WIDTH - padding;
        this.vx = -Math.abs(this.vx) * 0.5;
      }
      if (this.y < padding) {
        this.y = padding;
        this.vy = Math.abs(this.vy) * 0.5;
      } else if (this.y > CONFIG.WORLD_HEIGHT - padding) {
        this.y = CONFIG.WORLD_HEIGHT - padding;
        this.vy = -Math.abs(this.vy) * 0.5;
      }
    }

    // Shield passive regeneration
    if (this.shieldRechargeTimer > 0) {
      this.shieldRechargeTimer -= dt;
    } else if (this.shield < this.maxShield) {
      this.shield = Math.min(this.maxShield, this.shield + CONFIG.PLAYER.SHIELD_RECHARGE_RATE * dt);
    }
  }

  // Required by Entity base class
  public update(dt: number): void {
    // Physics handled via updatePhysics
    if (this.shieldRechargeTimer > 0) this.shieldRechargeTimer -= dt;
  }

  public takeDamage(amount: number, particles?: ParticleSystem): void {
    if (this.dead || this.invulnerabilityTimer > 0 || this.isGodMode) return;

    this.shieldRechargeTimer = CONFIG.PLAYER.SHIELD_RECHARGE_DELAY;

    if (this.shield > 0) {
      this.shieldHitTimer = 0.2;
      if (this.shield >= amount) {
        this.shield -= amount;
        amount = 0;
      } else {
        amount -= this.shield;
        this.shield = 0;
        // Shield broke!
        if (particles) {
          particles.emitRing(this.x, this.y, '#00ffff', this.radius, this.radius + 40);
          particles.emitBurst(this.x, this.y, 16, '#00e5ff', 1.2);
        }
      }
    }

    if (amount > 0) {
      this.hull = Math.max(0, this.hull - amount);
      this.hitFlashTimer = 0.25;
      if (particles) {
        particles.emitBurst(this.x, this.y, 8, '#ff3366', 1.0);
      }
      if (this.hull <= 0) {
        this.dead = true;
        if (particles) {
          particles.emitBurst(this.x, this.y, 45, '#ff3366', 2.0);
          particles.emitRing(this.x, this.y, '#ff9900', 10, 120);
        }
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    // Invulnerability blinking
    if (this.invulnerabilityTimer > 0 && Math.floor(Date.now() / 80) % 2 === 0) {
      return;
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    if (this.recoilOffset > 0) {
      ctx.translate(-this.recoilOffset, 0);
    }

    // Hit Flash
    const isFlash = this.hitFlashTimer > 0;
    const strokeColor = isFlash ? '#ffffff' : '#00ffff';
    const fillColor = isFlash ? '#ffffff' : '#072435';

    ctx.lineWidth = 2.2;
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = fillColor;
    ctx.shadowColor = strokeColor;
    ctx.shadowBlur = isFlash ? 16 : 8;

    // Sleek fighter polygon
    ctx.beginPath();
    ctx.moveTo(18, 0);       // Nose
    ctx.lineTo(-12, -14);    // Left wingtip
    ctx.lineTo(-8, -5);      // Left engine inlet
    ctx.lineTo(-14, -4);     // Left engine exhaust
    ctx.lineTo(-14, 4);      // Right engine exhaust
    ctx.lineTo(-8, 5);       // Right engine inlet
    ctx.lineTo(-12, 14);     // Right wingtip
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cockpit canopy
    ctx.beginPath();
    ctx.arc(2, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00f0ff';
    ctx.fill();

    // Interior wing accents
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -8);
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 8);
    ctx.strokeStyle = '#00a8cc';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Shield Aura
    if (this.shield > 0) {
      const shieldRatio = this.shield / this.maxShield;
      const isShieldHit = this.shieldHitTimer > 0;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = isShieldHit ? '#ffffff' : '#00e5ff';
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = isShieldHit ? 18 : 6;
      ctx.lineWidth = isShieldHit ? 3.0 : 1.2;
      ctx.globalAlpha = isShieldHit ? 0.9 : 0.25 + shieldRatio * 0.35;
      ctx.stroke();
    }

    ctx.restore();
  }
}
