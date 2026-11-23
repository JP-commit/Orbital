import { SpatialHash } from '../core/SpatialHash';
import { Player } from '../entities/Player';
import { Asteroid, AsteroidSize } from '../entities/Asteroid';
import { Enemy } from '../entities/enemies/Enemy';
import { Drone } from '../entities/enemies/Drone';
import { Mine } from '../entities/enemies/Mine';
import { Boss } from '../entities/bosses/Boss';
import { PulsarCore } from '../entities/bosses/PulsarCore';
import { Pickup, PickupType } from '../entities/Pickup';
import { WeaponSystem } from './WeaponSystem';
import { ParticleSystem } from './ParticleSystem';
import { FloatingTextSystem } from '../ui/FloatingText';
import { Camera } from '../core/Camera';
import { PRNG } from '../core/PRNG';
import { CONFIG } from '../config';

export class CollisionSystem {
  public spatialHash: SpatialHash;

  constructor() {
    this.spatialHash = new SpatialHash(160);
  }

  public resolveCollisions(
    player: Player,
    asteroids: Asteroid[],
    newAsteroidsOut: Asteroid[],
    enemies: Enemy[],
    mines: Mine[],
    boss: Boss | null,
    pickups: Pickup[],
    newPickupsOut: Pickup[],
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem,
    camera: Camera,
    prng: PRNG,
    onScoreEarned: (score: number) => void
  ): void {
    // 1. Clear and populate spatial hash with collidable targets
    this.spatialHash.clear();
    for (let i = 0; i < asteroids.length; i++) {
      if (!asteroids[i].dead) this.spatialHash.insert(asteroids[i]);
    }
    for (let i = 0; i < enemies.length; i++) {
      if (!enemies[i].dead) this.spatialHash.insert(enemies[i]);
    }
    for (let i = 0; i < mines.length; i++) {
      if (!mines[i].dead) this.spatialHash.insert(mines[i]);
    }
    if (boss && !boss.dead) {
      this.spatialHash.insert(boss);
    }

    // 2. Projectiles vs Targets
    const projectiles = weaponSystem.projectiles;
    for (let i = 0; i < projectiles.length; i++) {
      const p = projectiles[i];
      if (p.dead) continue;

      if (!p.isEnemy) {
        // PLAYER BULLET vs (Asteroids, Enemies, Mines, Boss)
        const candidates = this.spatialHash.query(p.x, p.y, p.radius + 100);
        for (let j = 0; j < candidates.length; j++) {
          const target = candidates[j];
          if (target.dead) continue;

          // Check Boss Shield blocking first
          if (target instanceof PulsarCore) {
            if (target.checkShieldBlock(p.x, p.y, particles)) {
              p.dead = true;
              break;
            }
          }

          const distSq = (p.x - target.x) ** 2 + (p.y - target.y) ** 2;
          const totalRadius = p.radius + target.radius;

          if (distSq <= totalRadius * totalRadius) {
            p.dead = true;
            particles.emitBurst(p.x, p.y, 6, p.color, 0.8);

            if (target instanceof Asteroid) {
              const destroyed = target.takeDamage(p.damage);
              if (destroyed) {
                this.handleAsteroidDestroyed(target, newAsteroidsOut, newPickupsOut, particles, floatingTexts, camera, prng, onScoreEarned);
              }
            } else if (target instanceof Enemy) {
              const destroyed = target.takeDamage(p.damage);
              if (destroyed) {
                this.handleEnemyDestroyed(target, newPickupsOut, particles, floatingTexts, camera, prng, onScoreEarned);
              }
            } else if (target instanceof Mine) {
              const destroyed = target.takeDamage(p.damage);
              if (destroyed) {
                target.explode(particles, camera);
                this.handleMineExplosion(target, player, asteroids, enemies, boss, particles);
              }
            } else if (target instanceof Boss) {
              const defeated = target.takeDamage(p.damage);
              floatingTexts.spawn(p.x, p.y - 10, `${Math.round(p.damage)}`, '#ff0055', 10);
              if (defeated) {
                this.handleBossDefeated(target, newPickupsOut, particles, floatingTexts, camera, onScoreEarned);
              }
            }
            break;
          }
        }
      } else {
        // ENEMY BULLET vs Player
        if (!player.dead) {
          const distSq = (p.x - player.x) ** 2 + (p.y - player.y) ** 2;
          const totalRadius = p.radius + player.radius;
          if (distSq <= totalRadius * totalRadius) {
            p.dead = true;
            player.takeDamage(p.damage, particles);
            camera.addTrauma(0.2);
            particles.emitBurst(p.x, p.y, 8, '#ff3366', 1.0);
          }
        }
      }
    }

    // 3. Player vs Pickups
    for (let i = 0; i < pickups.length; i++) {
      const pickup = pickups[i];
      if (pickup.dead) continue;

      pickup.attractToward(player.x, player.y, 1 / 60);

      const dist = Math.hypot(player.x - pickup.x, player.y - pickup.y);
      if (dist < player.radius + pickup.radius) {
        pickup.dead = true;
        this.applyPickup(player, pickup, weaponSystem, particles, floatingTexts);
      }
    }

    // 4. Mines logic & triggers
    for (let i = 0; i < mines.length; i++) {
      const mine = mines[i];
      if (mine.dead) continue;

      const detonated = mine.checkTrigger(player, 1 / 60);
      if (detonated) {
        mine.explode(particles, camera);
        this.handleMineExplosion(mine, player, asteroids, enemies, boss, particles);
      }
    }

    // 5. Player vs Boss Body Collision
    if (boss && !boss.dead && !player.dead) {
      const bDist = Math.hypot(player.x - boss.x, player.y - boss.y);
      if (bDist < player.radius + boss.radius) {
        player.takeDamage(35, particles);
        camera.addTrauma(0.4);
        const nx = (player.x - boss.x) / (bDist || 1);
        const ny = (player.y - boss.y) / (bDist || 1);
        player.vx += nx * 350;
        player.vy += ny * 350;
        particles.emitBurst(player.x, player.y, 15, boss.color, 1.2);
      }
    }

    // 6. Player vs Enemies (Ramming Drone, Collisions)
    if (!player.dead) {
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];
        if (enemy.dead) continue;

        const dist = Math.hypot(player.x - enemy.x, player.y - enemy.y);
        if (dist < player.radius + enemy.radius) {
          if (enemy instanceof Drone) {
            enemy.dead = true;
            player.takeDamage(enemy.ramDamage, particles);
            camera.addTrauma(0.4);
            particles.emitBurst(enemy.x, enemy.y, 20, enemy.color, 1.5);
            particles.emitRing(enemy.x, enemy.y, enemy.color, 10, 60);
          } else {
            player.takeDamage(15, particles);
            camera.addTrauma(0.25);
            const nx = (player.x - enemy.x) / (dist || 1);
            const ny = (player.y - enemy.y) / (dist || 1);
            player.vx += nx * 180;
            player.vy += ny * 180;
            enemy.vx -= nx * 140;
            enemy.vy -= ny * 140;
          }
        }
      }

      // 7. Player vs Asteroids
      const nearby = this.spatialHash.query(player.x, player.y, player.radius + 60);
      for (let i = 0; i < nearby.length; i++) {
        const ast = nearby[i];
        if (ast.dead || !(ast instanceof Asteroid)) continue;

        const dx = player.x - ast.x;
        const dy = player.y - ast.y;
        const dist = Math.hypot(dx, dy);
        const minDist = player.radius + ast.radius;

        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;

          const overlap = minDist - dist;
          player.x += nx * overlap * 0.6;
          player.y += ny * overlap * 0.6;
          ast.x -= nx * overlap * 0.4;
          ast.y -= ny * overlap * 0.4;

          const relVx = player.vx - ast.vx;
          const relVy = player.vy - ast.vy;
          const impactSpeed = -(relVx * nx + relVy * ny);

          if (impactSpeed > 0) {
            const restitution = 0.65;
            const impulse = impactSpeed * (1 + restitution);

            player.vx += nx * impulse * 0.8;
            player.vy += ny * impulse * 0.8;
            ast.vx -= nx * impulse * 0.4;
            ast.vy -= ny * impulse * 0.4;

            const damage = Math.max(15, Math.min(45, Math.round(impactSpeed * 0.15)));
            player.takeDamage(damage, particles);
            camera.addTrauma(0.35);

            particles.emitBurst(player.x - nx * player.radius, player.y - ny * player.radius, 12, '#ff9900', 1.0);
          }
        }
      }
    }
  }

  private handleMineExplosion(
    mine: Mine,
    player: Player,
    asteroids: Asteroid[],
    enemies: Enemy[],
    boss: Boss | null,
    particles: ParticleSystem
  ): void {
    const radius = CONFIG.ENEMIES.MINE.EXPLODE_RADIUS;
    const dmg = CONFIG.ENEMIES.MINE.DAMAGE;

    if (!player.dead) {
      const pDist = Math.hypot(player.x - mine.x, player.y - mine.y);
      if (pDist < radius) {
        player.takeDamage(dmg * (1 - (pDist / radius) * 0.5), particles);
      }
    }

    for (let i = 0; i < asteroids.length; i++) {
      const ast = asteroids[i];
      if (ast.dead) continue;
      const d = Math.hypot(ast.x - mine.x, ast.y - mine.y);
      if (d < radius + ast.radius) {
        ast.takeDamage(dmg);
      }
    }

    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (en.dead) continue;
      const d = Math.hypot(en.x - mine.x, en.y - mine.y);
      if (d < radius + en.radius) {
        en.takeDamage(dmg);
      }
    }

    if (boss && !boss.dead) {
      const bDist = Math.hypot(boss.x - mine.x, boss.y - mine.y);
      if (bDist < radius + boss.radius) {
        boss.takeDamage(dmg * 0.8);
      }
    }
  }

  public handleLaserHit(
    target: Asteroid | Enemy | Boss,
    damage: number,
    hitX: number,
    hitY: number,
    newAsteroidsOut: Asteroid[],
    newPickupsOut: Pickup[],
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem,
    camera: Camera,
    prng: PRNG,
    onScoreEarned: (score: number) => void
  ): void {
    particles.emitBurst(hitX, hitY, 2, '#00ffaa', 0.5);

    if (target instanceof Boss) {
      const defeated = target.takeDamage(damage);
      if (defeated) {
        this.handleBossDefeated(target, newPickupsOut, particles, floatingTexts, camera, onScoreEarned);
      }
      return;
    }

    const destroyed = target.takeDamage(damage);
    if (destroyed) {
      if (target instanceof Asteroid) {
        this.handleAsteroidDestroyed(target, newAsteroidsOut, newPickupsOut, particles, floatingTexts, camera, prng, onScoreEarned);
      } else if (target instanceof Enemy) {
        this.handleEnemyDestroyed(target, newPickupsOut, particles, floatingTexts, camera, prng, onScoreEarned);
      }
    }
  }

  private handleBossDefeated(
    boss: Boss,
    newPickupsOut: Pickup[],
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem,
    camera: Camera,
    onScoreEarned: (score: number) => void
  ): void {
    onScoreEarned(boss.scoreValue);
    floatingTexts.spawn(boss.x, boss.y, `+${boss.scoreValue} BOSS VICTORY!`, '#ffe600', 18);
    camera.addTrauma(0.8);

    // Grand cascade of explosions
    particles.emitBurst(boss.x, boss.y, 60, boss.color, 2.5);
    particles.emitBurst(boss.x, boss.y, 40, '#ffffff', 2.0);
    particles.emitRing(boss.x, boss.y, boss.color, 20, 260);
    particles.emitRing(boss.x, boss.y, '#ffffff', 10, 180);

    // Guaranteed loot drop feast!
    const guaranteedDrops: PickupType[] = ['FUEL', 'SHIELD', 'HULL', 'WEAPON_LASER', 'WEAPON_MISSILE'];
    for (let i = 0; i < guaranteedDrops.length; i++) {
      const dropAngle = (i * Math.PI * 2) / guaranteedDrops.length;
      const dx = boss.x + Math.cos(dropAngle) * 45;
      const dy = boss.y + Math.sin(dropAngle) * 45;
      newPickupsOut.push(new Pickup(dx, dy, guaranteedDrops[i]));
    }
  }

  private handleEnemyDestroyed(
    target: Enemy,
    newPickupsOut: Pickup[],
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem,
    camera: Camera,
    prng: PRNG,
    onScoreEarned: (score: number) => void
  ): void {
    onScoreEarned(target.scoreValue);
    floatingTexts.spawn(target.x, target.y, `+${target.scoreValue}`, '#00f0ff', 13);
    camera.addTrauma(0.2);

    particles.emitBurst(target.x, target.y, 28, target.color, 1.4);
    particles.emitBurst(target.x, target.y, 16, '#ffffff', 1.0);
    particles.emitRing(target.x, target.y, target.color, 10, target.radius * 2);

    if (prng.chance(0.50)) {
      const dropType = this.rollDropType(prng);
      newPickupsOut.push(new Pickup(target.x, target.y, dropType));
    }
  }

  private handleAsteroidDestroyed(
    target: Asteroid,
    newAsteroidsOut: Asteroid[],
    newPickupsOut: Pickup[],
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem,
    camera: Camera,
    prng: PRNG,
    onScoreEarned: (score: number) => void
  ): void {
    onScoreEarned(target.scoreValue);
    floatingTexts.spawn(target.x, target.y, `+${target.scoreValue}`, '#ffffff', 11);
    camera.addTrauma(target.sizeType === 'LARGE' ? 0.25 : 0.12);

    const color = target.sizeType === 'LARGE' ? '#f59e0b' : target.sizeType === 'MEDIUM' ? '#94a3b8' : '#38bdf8';
    particles.emitBurst(target.x, target.y, target.sizeType === 'LARGE' ? 24 : 14, color, 1.2);
    particles.emitRing(target.x, target.y, color, target.radius * 0.5, target.radius * 1.5);

    this.splitAsteroid(target, newAsteroidsOut, prng);

    if (prng.chance(CONFIG.ASTEROIDS.LOOT_DROP_CHANCE)) {
      const dropType = this.rollDropType(prng);
      newPickupsOut.push(new Pickup(target.x, target.y, dropType));
    }
  }

  private splitAsteroid(parent: Asteroid, newAsteroidsOut: Asteroid[], prng: PRNG): void {
    let nextSize: AsteroidSize | null = null;
    if (parent.sizeType === 'LARGE') nextSize = 'MEDIUM';
    else if (parent.sizeType === 'MEDIUM') nextSize = 'SMALL';

    if (!nextSize) return;

    const parentSpeed = Math.hypot(parent.vx, parent.vy);
    const parentAngle = Math.atan2(parent.vy, parent.vx);

    for (let i = 0; i < 2; i++) {
      const divergence = (i === 0 ? 1 : -1) * prng.range(0.4, 0.7);
      const splitAngle = parentAngle + divergence;
      const speed = Math.max(50, parentSpeed * prng.range(1.2, 1.6));
      const childVx = Math.cos(splitAngle) * speed;
      const childVy = Math.sin(splitAngle) * speed;

      const child = new Asteroid(
        parent.x + Math.cos(splitAngle) * (parent.radius * 0.5),
        parent.y + Math.sin(splitAngle) * (parent.radius * 0.5),
        nextSize,
        prng,
        childVx,
        childVy
      );
      newAsteroidsOut.push(child);
    }
  }

  private rollDropType(prng: PRNG): PickupType {
    const roll = prng.next();
    if (roll < CONFIG.DROPS.FUEL) {
      return 'FUEL';
    } else if (roll < CONFIG.DROPS.FUEL + CONFIG.DROPS.SHIELD) {
      return 'SHIELD';
    } else if (roll < CONFIG.DROPS.FUEL + CONFIG.DROPS.SHIELD + CONFIG.DROPS.WEAPON) {
      const weapons: PickupType[] = ['WEAPON_SPREAD', 'WEAPON_RAPID', 'WEAPON_LASER', 'WEAPON_MISSILE'];
      return prng.choice(weapons);
    } else {
      return 'HULL';
    }
  }

  private applyPickup(
    player: Player,
    pickup: Pickup,
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem
  ): void {
    particles.emitRing(pickup.x, pickup.y, pickup.color, 10, 50);
    particles.emitBurst(pickup.x, pickup.y, 16, pickup.color, 1.2);

    switch (pickup.pickupType) {
      case 'FUEL': {
        const gain = 35;
        player.fuel = Math.min(player.maxFuel, player.fuel + gain);
        floatingTexts.spawn(player.x, player.y - 25, `+${gain} FUEL`, pickup.color, 14);
        break;
      }
      case 'SHIELD': {
        const gain = 50;
        player.shield = Math.min(player.maxShield, player.shield + gain);
        floatingTexts.spawn(player.x, player.y - 25, `+${gain} SHIELD`, pickup.color, 14);
        break;
      }
      case 'HULL': {
        const gain = 30;
        player.hull = Math.min(player.maxHull, player.hull + gain);
        floatingTexts.spawn(player.x, player.y - 25, `+${gain} REPAIR`, pickup.color, 14);
        break;
      }
      case 'WEAPON_SPREAD': {
        weaponSystem.setWeapon('SPREAD');
        floatingTexts.spawn(player.x, player.y - 25, 'SPREAD SHOT!', pickup.color, 15);
        break;
      }
      case 'WEAPON_RAPID': {
        weaponSystem.setWeapon('RAPID');
        floatingTexts.spawn(player.x, player.y - 25, 'RAPID VULCAN!', pickup.color, 15);
        break;
      }
      case 'WEAPON_LASER': {
        weaponSystem.setWeapon('LASER');
        floatingTexts.spawn(player.x, player.y - 25, 'LASER BEAM!', pickup.color, 15);
        break;
      }
      case 'WEAPON_MISSILE': {
        weaponSystem.setWeapon('MISSILE');
        floatingTexts.spawn(player.x, player.y - 25, 'HOMING MISSILES!', pickup.color, 15);
        break;
      }
    }
  }
}
