import { PRNG } from '../core/PRNG';
import { CONFIG } from '../config';
import { Asteroid } from '../entities/Asteroid';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/enemies/Enemy';
import { DerelictShip } from '../entities/events/DerelictShip';
import { GravityWell } from '../entities/events/GravityWell';
import { ParticleSystem } from './ParticleSystem';
import { Camera } from '../core/Camera';
import { FloatingTextSystem } from '../ui/FloatingText';
import { Pickup } from '../entities/Pickup';

export class EventManager {
  public derelicts: DerelictShip[] = [];
  public gravityWells: GravityWell[] = [];
  private eventCooldown: number = 25.0;

  public update(
    dt: number,
    wave: number,
    isBossWave: boolean,
    player: Player,
    asteroids: Asteroid[],
    enemies: Enemy[],
    newAsteroidsOut: Asteroid[],
    newPickupsOut: Pickup[],
    particles: ParticleSystem,
    camera: Camera,
    floatingTexts: FloatingTextSystem,
    prng: PRNG,
    onShowBanner: (title: string, subtitle: string, color: string) => void
  ): void {
    // Update existing Derelicts
    for (let i = 0; i < this.derelicts.length; i++) {
      const d = this.derelicts[i];
      d.update(dt);
      d.checkSalvage(player, newPickupsOut, particles, floatingTexts);
    }
    this.derelicts = this.derelicts.filter((d) => !d.dead);

    // Update existing Gravity Wells
    for (let i = 0; i < this.gravityWells.length; i++) {
      const g = this.gravityWells[i];
      g.update(dt);
      g.applyGravity(player, asteroids, enemies, particles, camera, dt);
    }
    this.gravityWells = this.gravityWells.filter((g) => !g.dead);

    // Periodic roll for procedural events during regular survival waves
    if (wave >= 3 && !isBossWave) {
      this.eventCooldown -= dt;
      if (this.eventCooldown <= 0) {
        this.eventCooldown = prng.range(35.0, 65.0);

        const roll = prng.next();
        if (roll < 0.35) {
          this.triggerMeteorStorm(player, newAsteroidsOut, prng, onShowBanner);
        } else if (roll < 0.70 && this.derelicts.length === 0) {
          this.spawnDerelict(player, prng, onShowBanner);
        } else if (this.gravityWells.length === 0) {
          this.spawnGravityWell(player, prng, onShowBanner);
        }
      }
    }
  }

  // Meteor Storm: High-velocity asteroid hail across the arena
  public triggerMeteorStorm(
    player: Player,
    newAsteroidsOut: Asteroid[],
    prng: PRNG,
    onShowBanner?: (title: string, subtitle: string, color: string) => void
  ): void {
    if (onShowBanner) {
      onShowBanner('⚠ METEOR STORM INCOMING ⚠', 'HIGH-VELOCITY COLLISION HAZARD', '#ff5500');
    }

    const stormAngle = prng.angle();
    const count = prng.rangeInt(10, 16);

    for (let i = 0; i < count; i++) {
      // Spawn on perimeter along storm trajectory
      const offset = (i - count / 2) * 90;
      const spawnDist = 900;
      const spawnX = player.x - Math.cos(stormAngle) * spawnDist - Math.sin(stormAngle) * offset;
      const spawnY = player.y - Math.sin(stormAngle) * spawnDist + Math.cos(stormAngle) * offset;

      const speed = prng.range(260, 420);
      const vx = Math.cos(stormAngle) * speed;
      const vy = Math.sin(stormAngle) * speed;

      const size = prng.choice(['MEDIUM', 'SMALL'] as const);
      newAsteroidsOut.push(new Asteroid(spawnX, spawnY, size, prng, vx, vy));
    }
  }

  // Abandoned Derelict Ship salvage
  public spawnDerelict(
    player: Player,
    prng: PRNG,
    onShowBanner?: (title: string, subtitle: string, color: string) => void
  ): DerelictShip {
    if (onShowBanner) {
      onShowBanner('DERELICT FREIGHTER LOCATED', 'RECOVER VALUABLE SALVAGE CARGO', '#ffe600');
    }

    const a = prng.angle();
    const dist = prng.range(500, 850);
    const x = Math.max(300, Math.min(CONFIG.WORLD_WIDTH - 300, player.x + Math.cos(a) * dist));
    const y = Math.max(300, Math.min(CONFIG.WORLD_HEIGHT - 300, player.y + Math.sin(a) * dist));

    const derelict = new DerelictShip(x, y);
    this.derelicts.push(derelict);
    return derelict;
  }

  // Gravitational Singularity
  public spawnGravityWell(
    player: Player,
    prng: PRNG,
    onShowBanner?: (title: string, subtitle: string, color: string) => void
  ): GravityWell {
    if (onShowBanner) {
      onShowBanner('SINGULARITY ANOMALY DETECTED', 'GRAVITATIONAL VORTEX FORMING', '#9d00ff');
    }

    const a = prng.angle();
    const dist = prng.range(550, 850);
    const x = Math.max(400, Math.min(CONFIG.WORLD_WIDTH - 400, player.x + Math.cos(a) * dist));
    const y = Math.max(400, Math.min(CONFIG.WORLD_HEIGHT - 400, player.y + Math.sin(a) * dist));

    const well = new GravityWell(x, y);
    this.gravityWells.push(well);
    return well;
  }

  public render(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // Render Derelicts
    for (let i = 0; i < this.derelicts.length; i++) {
      const d = this.derelicts[i];
      if (camera.isInView(d.x, d.y, d.salvageRange + 20)) {
        d.render(ctx);
      }
    }

    // Render Gravity Wells
    for (let i = 0; i < this.gravityWells.length; i++) {
      const g = this.gravityWells[i];
      if (camera.isInView(g.x, g.y, g.pullRadius)) {
        g.render(ctx);
      }
    }
  }

  public reset(): void {
    this.derelicts = [];
    this.gravityWells = [];
    this.eventCooldown = 25.0;
  }
}
