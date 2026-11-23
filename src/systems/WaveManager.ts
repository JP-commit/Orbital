import { PRNG } from '../core/PRNG';
import { CONFIG } from '../config';
import type { AsteroidSize } from '../entities/Asteroid';
import { Enemy } from '../entities/enemies/Enemy';
import { Drone } from '../entities/enemies/Drone';
import { Raider } from '../entities/enemies/Raider';
import { MineLayer } from '../entities/enemies/MineLayer';
import { Boss } from '../entities/bosses/Boss';
import { Dreadnought } from '../entities/bosses/Dreadnought';
import { PulsarCore } from '../entities/bosses/PulsarCore';
import { Devourer } from '../entities/bosses/Devourer';

export enum WaveState {
  INTERMISSION,
  IN_PROGRESS,
}

export interface WaveBanner {
  title: string;
  subtitle: string;
  alpha: number;
  timer: number;
  color: string;
}

export class WaveManager {
  public currentWave: number = 1;
  public state: WaveState = WaveState.INTERMISSION;
  public intermissionTimer: number = CONFIG.WAVE.INTERMISSION_DURATION;
  public banner: WaveBanner | null = null;

  constructor(initialWave: number = 1) {
    this.currentWave = initialWave;
    this.showWaveBanner(`SECTOR WAVE ${this.currentWave}`, 'PREPARE FOR HOSTILE INVASION', '#00f0ff');
  }

  public getBudget(wave: number): number {
    return Math.round(
      CONFIG.WAVE.BASE_BUDGET * Math.pow(1 + wave * CONFIG.WAVE.SCALE, CONFIG.WAVE.EXPONENT)
    );
  }

  public isBossWave(wave: number): boolean {
    return wave % CONFIG.BOSS_INTERVAL === 0;
  }

  public showWaveBanner(title: string, subtitle: string, color: string = '#00f0ff'): void {
    this.banner = {
      title,
      subtitle,
      alpha: 1.0,
      timer: 3.2,
      color,
    };
  }

  public update(
    dt: number,
    activeThreatsCount: number,
    prng: PRNG,
    playerX: number,
    playerY: number,
    onStartWave: (
      wave: number,
      asteroidsToSpawn: { x: number; y: number; size: AsteroidSize }[],
      enemiesToSpawn: Enemy[],
      bossToSpawn: Boss | null
    ) => void,
    onWaveCleared: (wave: number, bonusScore: number) => void
  ): void {
    // Banner fade
    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer < 0.8) {
        this.banner.alpha = Math.max(0, this.banner.timer / 0.8);
      }
      if (this.banner.timer <= 0) {
        this.banner = null;
      }
    }

    if (this.state === WaveState.INTERMISSION) {
      this.intermissionTimer -= dt;
      if (this.intermissionTimer <= 0) {
        this.state = WaveState.IN_PROGRESS;

        if (this.isBossWave(this.currentWave)) {
          // Boss wave!
          const boss = this.generateBoss(this.currentWave, playerX, playerY);
          this.showWaveBanner(`⚠ BOSS ALERT: WAVE ${this.currentWave} ⚠`, `${boss.name.toUpperCase()} ENGAGING`, '#ff0055');
          onStartWave(this.currentWave, [], [], boss);
        } else {
          // Normal wave
          const waveEntities = this.generateWaveEntities(this.currentWave, prng);
          this.showWaveBanner(`WAVE ${this.currentWave} ACTIVE`, 'CLEAR ALL HOSTILES', '#ff3366');
          onStartWave(this.currentWave, waveEntities.asteroids, waveEntities.enemies, null);
        }
      }
    } else if (this.state === WaveState.IN_PROGRESS) {
      // Check if all threats in this wave are cleared
      if (activeThreatsCount === 0) {
        const bonus = this.isBossWave(this.currentWave) ? this.currentWave * 1000 : this.currentWave * 250;
        onWaveCleared(this.currentWave, bonus);
        const clearMsg = this.isBossWave(this.currentWave) ? 'BOSS ANNIHILATED!' : `WAVE ${this.currentWave} CLEARED!`;
        this.showWaveBanner(clearMsg, `+${bonus} SECTOR BONUS`, '#39ff14');
        this.currentWave++;
        this.state = WaveState.INTERMISSION;
        this.intermissionTimer = CONFIG.WAVE.INTERMISSION_DURATION;
      }
    }
  }

  public generateBoss(wave: number, playerX: number, playerY: number): Boss {
    const bossIndex = Math.floor(wave / CONFIG.BOSS_INTERVAL);
    const encounterLevel = Math.max(1, Math.floor((bossIndex - 1) / 3) + 1);

    // Spawn 650px away from player
    const spawnAngle = Math.random() * Math.PI * 2;
    const spawnX = Math.max(300, Math.min(CONFIG.WORLD_WIDTH - 300, playerX + Math.cos(spawnAngle) * 650));
    const spawnY = Math.max(300, Math.min(CONFIG.WORLD_HEIGHT - 300, playerY + Math.sin(spawnAngle) * 650));

    const cycle = (bossIndex - 1) % 3;
    if (cycle === 0) {
      return new Dreadnought(spawnX, spawnY, encounterLevel);
    } else if (cycle === 1) {
      return new PulsarCore(spawnX, spawnY, encounterLevel);
    } else {
      return new Devourer(spawnX, spawnY, encounterLevel);
    }
  }

  // Procedural difficulty budget solver
  public generateWaveEntities(
    wave: number,
    prng: PRNG
  ): { asteroids: { x: number; y: number; size: AsteroidSize }[]; enemies: Enemy[] } {
    let budget = this.getBudget(wave);
    const asteroids: { x: number; y: number; size: AsteroidSize }[] = [];
    const enemies: Enemy[] = [];

    const COST_AST_LARGE = 25;
    const COST_AST_MED = 12;
    const COST_AST_SM = 6;
    const COST_DRONE = 18;
    const COST_RAIDER = 35;
    const COST_MINELAYER = 45;

    const baseAsteroids = 6 + Math.min(18, wave * 2);
    for (let i = 0; i < baseAsteroids; i++) {
      const size: AsteroidSize = prng.choice(['LARGE', 'MEDIUM', 'SMALL']);
      const x = prng.range(200, CONFIG.WORLD_WIDTH - 200);
      const y = prng.range(200, CONFIG.WORLD_HEIGHT - 200);
      asteroids.push({ x, y, size });
    }

    while (budget > 6) {
      const roll = prng.next();

      if (wave >= 3 && roll < 0.25 && budget >= COST_MINELAYER) {
        const x = prng.range(300, CONFIG.WORLD_WIDTH - 300);
        const y = prng.range(300, CONFIG.WORLD_HEIGHT - 300);
        enemies.push(new MineLayer(x, y, prng));
        budget -= COST_MINELAYER;
      } else if (wave >= 2 && roll < 0.55 && budget >= COST_RAIDER) {
        const x = prng.range(250, CONFIG.WORLD_WIDTH - 250);
        const y = prng.range(250, CONFIG.WORLD_HEIGHT - 250);
        enemies.push(new Raider(x, y, prng));
        budget -= COST_RAIDER;
      } else if (budget >= COST_DRONE && roll < 0.85) {
        const x = prng.range(200, CONFIG.WORLD_WIDTH - 200);
        const y = prng.range(200, CONFIG.WORLD_HEIGHT - 200);
        enemies.push(new Drone(x, y));
        budget -= COST_DRONE;
      } else if (budget >= COST_AST_LARGE) {
        const x = prng.range(200, CONFIG.WORLD_WIDTH - 200);
        const y = prng.range(200, CONFIG.WORLD_HEIGHT - 200);
        asteroids.push({ x, y, size: 'LARGE' });
        budget -= COST_AST_LARGE;
      } else if (budget >= COST_AST_MED) {
        const x = prng.range(200, CONFIG.WORLD_WIDTH - 200);
        const y = prng.range(200, CONFIG.WORLD_HEIGHT - 200);
        asteroids.push({ x, y, size: 'MEDIUM' });
        budget -= COST_AST_MED;
      } else if (budget >= COST_AST_SM) {
        const x = prng.range(200, CONFIG.WORLD_WIDTH - 200);
        const y = prng.range(200, CONFIG.WORLD_HEIGHT - 200);
        asteroids.push({ x, y, size: 'SMALL' });
        budget -= COST_AST_SM;
      } else {
        break;
      }
    }

    return { asteroids, enemies };
  }

  public renderBanner(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.banner) return;

    ctx.save();
    ctx.globalAlpha = this.banner.alpha;
    ctx.textAlign = 'center';

    ctx.fillStyle = 'rgba(5, 12, 24, 0.85)';
    ctx.strokeStyle = this.banner.color;
    ctx.lineWidth = 2;
    ctx.shadowColor = this.banner.color;
    ctx.shadowBlur = 15;

    const bannerH = 75;
    const bannerY = height * 0.28;
    ctx.fillRect(0, bannerY - bannerH / 2, width, bannerH);
    ctx.strokeRect(0, bannerY - bannerH / 2, width, bannerH);

    ctx.font = 'bold 32px "Courier New", monospace';
    ctx.fillStyle = this.banner.color;
    ctx.fillText(this.banner.title, width / 2, bannerY + 2);

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.fillText(this.banner.subtitle, width / 2, bannerY + 24);

    ctx.restore();
  }

  public reset(startWave: number = 1): void {
    this.currentWave = startWave;
    this.state = WaveState.INTERMISSION;
    this.intermissionTimer = CONFIG.WAVE.INTERMISSION_DURATION;
    this.showWaveBanner(`SECTOR WAVE ${this.currentWave}`, 'PREPARE FOR HOSTILE INVASION', '#00f0ff');
  }
}
