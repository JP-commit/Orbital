import { CONFIG } from '../config';
import { PRNG } from './PRNG';
import { InputManager } from './InputManager';
import { Camera } from './Camera';
import { Player } from '../entities/Player';
import { Asteroid, AsteroidSize } from '../entities/Asteroid';
import { Pickup, PickupType } from '../entities/Pickup';
import { Enemy } from '../entities/enemies/Enemy';
import { Drone } from '../entities/enemies/Drone';
import { Raider } from '../entities/enemies/Raider';
import { MineLayer } from '../entities/enemies/MineLayer';
import { Mine } from '../entities/enemies/Mine';
import { Boss } from '../entities/bosses/Boss';
import { Dreadnought } from '../entities/bosses/Dreadnought';
import { PulsarCore } from '../entities/bosses/PulsarCore';
import { Devourer } from '../entities/bosses/Devourer';
import { WeaponSystem } from '../systems/WeaponSystem';
import { CollisionSystem } from '../systems/CollisionSystem';
import { WaveManager } from '../systems/WaveManager';
import { EventManager } from '../systems/EventManager';
import { AudioManager } from '../systems/AudioManager';
import { ParticleSystem } from '../systems/ParticleSystem';
import { FloatingTextSystem } from '../ui/FloatingText';
import { Starfield } from '../systems/Starfield';
import { HUD, RadarThreat } from '../ui/HUD';
import { DebugPanel } from '../ui/DebugPanel';
import { SettingsMenu } from '../ui/SettingsMenu';

export enum GameState {
  TITLE,
  PLAYING,
  PAUSED,
  GAME_OVER,
}

export class Game {
  public canvas: HTMLCanvasElement;
  public ctx: CanvasRenderingContext2D;

  public prng: PRNG;
  public input: InputManager;
  public camera: Camera;
  public player: Player;
  public asteroids: Asteroid[] = [];
  public enemies: Enemy[] = [];
  public mines: Mine[] = [];
  public boss: Boss | null = null;
  public pickups: Pickup[] = [];
  public weaponSystem: WeaponSystem;
  public collisionSystem: CollisionSystem;
  public waveManager: WaveManager;
  public eventManager: EventManager;
  public audio: AudioManager;
  public particles: ParticleSystem;
  public floatingTexts: FloatingTextSystem;
  public starfield: Starfield;
  public hud: HUD;
  public debugPanel: DebugPanel;
  public settingsMenu: SettingsMenu;

  public state: GameState = GameState.PLAYING;
  public score: number = 0;
  public highScore: number = 0;
  public seed: number;

  // Stats tracking
  public asteroidsDestroyed: number = 0;
  public enemiesKilled: number = 0;
  public bossesKilled: number = 0;

  // Debug toggles
  public debugGodMode: boolean = false;
  public debugInfFuel: boolean = false;

  // Loop timing
  private lastTime: number = 0;
  private accumulatedTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;

  constructor(canvas: HTMLCanvasElement, customSeed?: number) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D rendering context');
    this.ctx = ctx;

    // Load High Score
    this.loadHighScore();

    // Initialize PRNG
    this.seed = customSeed ?? (Math.floor(Math.random() * 900000) + 100000);
    this.prng = new PRNG(this.seed);

    // Initialize subsystems
    this.input = new InputManager();
    this.camera = new Camera(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
    this.particles = new ParticleSystem(800);
    this.floatingTexts = new FloatingTextSystem();
    this.starfield = new Starfield(this.prng);
    this.player = new Player(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
    this.weaponSystem = new WeaponSystem();
    this.collisionSystem = new CollisionSystem();
    this.waveManager = new WaveManager(1);
    this.eventManager = new EventManager();
    this.audio = new AudioManager();
    this.hud = new HUD();
    this.debugPanel = new DebugPanel(this);
    this.settingsMenu = new SettingsMenu(this.audio, this.input);

    this.setupWindowListeners();
    this.resizeCanvas();
    this.spawnInitialPickups(14);
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('orbital_highscore');
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      // ignore
    }
  }

  private saveHighScore(): void {
    try {
      if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('orbital_highscore', this.highScore.toString());
      }
    } catch {
      // ignore
    }
  }

  public get wave(): number {
    return this.waveManager.currentWave;
  }

  public set wave(val: number) {
    this.waveManager.currentWave = val;
    this.waveManager.reset(val);
  }

  private setupWindowListeners(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    // Auto audio context initialization on first interaction
    const initAudio = () => {
      this.audio.init();
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('mousedown', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    window.addEventListener('keydown', initAudio);
    window.addEventListener('mousedown', initAudio);
    window.addEventListener('touchstart', initAudio);

    // Auto-pause when tab loses focus
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
      }
    });

    window.addEventListener('blur', () => {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
      }
    });
  }

  public resizeCanvas(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }

  public spawnAsteroids(count: number, sizeOverride?: AsteroidSize): void {
    const sizes: AsteroidSize[] = ['LARGE', 'LARGE', 'MEDIUM', 'SMALL'];
    for (let i = 0; i < count; i++) {
      const size = sizeOverride ?? this.prng.choice(sizes);
      const angle = this.prng.angle();
      const dist = this.prng.range(500, 1800);
      const x = Math.max(100, Math.min(CONFIG.WORLD_WIDTH - 100, this.player.x + Math.cos(angle) * dist));
      const y = Math.max(100, Math.min(CONFIG.WORLD_HEIGHT - 100, this.player.y + Math.sin(angle) * dist));
      this.asteroids.push(new Asteroid(x, y, size, this.prng));
    }
  }

  public spawnEnemy(type: 'DRONE' | 'RAIDER' | 'MINELAYER'): void {
    const angle = this.prng.angle();
    const dist = this.prng.range(450, 750);
    const x = Math.max(150, Math.min(CONFIG.WORLD_WIDTH - 150, this.player.x + Math.cos(angle) * dist));
    const y = Math.max(150, Math.min(CONFIG.WORLD_HEIGHT - 150, this.player.y + Math.sin(angle) * dist));

    if (type === 'DRONE') {
      this.enemies.push(new Drone(x, y));
    } else if (type === 'RAIDER') {
      this.enemies.push(new Raider(x, y, this.prng));
    } else if (type === 'MINELAYER') {
      this.enemies.push(new MineLayer(x, y, this.prng));
    }
  }

  public spawnBoss(bossType: 1 | 2 | 3): void {
    const angle = this.prng.angle();
    const dist = 550;
    const x = Math.max(250, Math.min(CONFIG.WORLD_WIDTH - 250, this.player.x + Math.cos(angle) * dist));
    const y = Math.max(250, Math.min(CONFIG.WORLD_HEIGHT - 250, this.player.y + Math.sin(angle) * dist));

    if (bossType === 1) {
      this.boss = new Dreadnought(x, y, 1);
    } else if (bossType === 2) {
      this.boss = new PulsarCore(x, y, 1);
    } else {
      this.boss = new Devourer(x, y, 1);
    }

    this.audio.playBossAlarm();
    this.audio.setBossMusic(true);
    this.waveManager.showWaveBanner('⚠ BOSS ENGAGING ⚠', this.boss.name.toUpperCase(), '#ff0055');
  }

  public triggerEvent(type: 'METEOR' | 'DERELICT' | 'SINGULARITY'): void {
    if (type === 'METEOR') {
      const buffer: Asteroid[] = [];
      this.eventManager.triggerMeteorStorm(this.player, buffer, this.prng, (t, s, c) => {
        this.waveManager.showWaveBanner(t, s, c);
      });
      this.asteroids.push(...buffer);
      this.audio.playBossAlarm();
    } else if (type === 'DERELICT') {
      this.eventManager.spawnDerelict(this.player, this.prng, (t, s, c) => {
        this.waveManager.showWaveBanner(t, s, c);
      });
      this.audio.playPickup();
    } else {
      this.eventManager.spawnGravityWell(this.player, this.prng, (t, s, c) => {
        this.waveManager.showWaveBanner(t, s, c);
      });
      this.audio.playBossAlarm();
    }
  }

  public spawnPickup(type: PickupType, x?: number, y?: number): void {
    const px = x ?? this.player.x + (Math.random() - 0.5) * 200;
    const py = y ?? this.player.y + (Math.random() - 0.5) * 200;
    this.pickups.push(new Pickup(px, py, type));
  }

  private spawnInitialPickups(count: number): void {
    this.pickups = [];
    const types: PickupType[] = ['FUEL', 'FUEL', 'SHIELD', 'WEAPON_SPREAD', 'WEAPON_RAPID', 'WEAPON_LASER', 'WEAPON_MISSILE'];
    for (let i = 0; i < count; i++) {
      const type = this.prng.choice(types);
      const x = this.prng.range(200, CONFIG.WORLD_WIDTH - 200);
      const y = this.prng.range(200, CONFIG.WORLD_HEIGHT - 200);
      this.pickups.push(new Pickup(x, y, type));
    }
  }

  public start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(currentTime: number): void {
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Track FPS
    this.frameCount++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 0.5) {
      this.fps = this.frameCount / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    const dt = Math.min(rawDt, CONFIG.MAX_ACCUMULATED_TIME);

    // Handle Input Toggles
    if (this.input.debugJustPressed) {
      this.debugPanel.toggle();
    }
    if (this.input.pauseJustPressed) {
      if (this.state === GameState.PLAYING) {
        this.state = GameState.PAUSED;
      } else if (this.state === GameState.PAUSED) {
        this.state = GameState.PLAYING;
      }
    }

    // Fixed timestep physics update
    if (this.state === GameState.PLAYING) {
      this.accumulatedTime += dt;
      while (this.accumulatedTime >= CONFIG.FIXED_STEP) {
        this.fixedUpdate(CONFIG.FIXED_STEP);
        this.accumulatedTime -= CONFIG.FIXED_STEP;
      }
    }

    // Render frame
    this.render();

    // Clear frame inputs
    this.input.clearJustPressed();

    // Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  private fixedUpdate(fixedDt: number): void {
    // God mode & infinite fuel debug cheats
    if (this.debugGodMode) {
      this.player.hull = this.player.maxHull;
      this.player.shield = this.player.maxShield;
    }
    if (this.debugInfFuel) {
      this.player.fuel = this.player.maxFuel;
    }

    // Update Player physics
    this.player.updatePhysics(
      fixedDt,
      this.input.thrust,
      this.input.steer,
      this.input.brake,
      this.particles
    );

    // Audio: thruster engine sound modulation
    this.audio.updateThrusterSound(this.input.thrust, this.player.isThrusting);

    // Wave Manager progression
    const totalThreats = this.asteroids.length + this.enemies.length + (this.boss && !this.boss.dead ? 1 : 0);
    this.waveManager.update(
      fixedDt,
      totalThreats,
      this.prng,
      this.player.x,
      this.player.y,
      (_waveNum, asteroidsToSpawn, enemiesToSpawn, bossToSpawn) => {
        for (let i = 0; i < asteroidsToSpawn.length; i++) {
          const a = asteroidsToSpawn[i];
          this.asteroids.push(new Asteroid(a.x, a.y, a.size, this.prng));
        }
        for (let i = 0; i < enemiesToSpawn.length; i++) {
          this.enemies.push(enemiesToSpawn[i]);
        }
        if (bossToSpawn) {
          this.boss = bossToSpawn;
          this.audio.playBossAlarm();
          this.audio.setBossMusic(true);
        }
      },
      (_waveNum, bonusScore) => {
        this.score += bonusScore;
        this.floatingTexts.spawn(this.player.x, this.player.y - 45, `+${bonusScore} SECTOR CLEAR BONUS!`, '#39ff14', 16);
        this.audio.playPickup();
      }
    );

    // Buffers for newly created items
    const newAsteroidsFromSplits: Asteroid[] = [];
    const newPickupsFromDrops: Pickup[] = [];

    // Weapon firing
    const allTargets: (Asteroid | Enemy | Boss)[] = [...this.asteroids, ...this.enemies];
    if (this.boss && !this.boss.dead) allTargets.push(this.boss);

    const prevWeapon = this.weaponSystem.currentWeapon.type;
    const prevFireCooldown = (this.weaponSystem as unknown as { fireCooldownTimer: number }).fireCooldownTimer;

    this.weaponSystem.tryFire(
      this.player,
      this.input.fire,
      allTargets,
      fixedDt,
      (target, dmg, hitX, hitY) => {
        if (target instanceof Asteroid || target instanceof Enemy || target instanceof Boss) {
          this.collisionSystem.handleLaserHit(
            target,
            dmg,
            hitX,
            hitY,
            newAsteroidsFromSplits,
            newPickupsFromDrops,
            this.particles,
            this.floatingTexts,
            this.camera,
            this.prng,
            (s) => {
              this.score += s;
              this.audio.playExplosion('small');
            }
          );
        }
      }
    );

    // SFX for weapon discharge
    if (this.input.fire && !this.player.dead && prevFireCooldown <= 0) {
      if (prevWeapon === 'BLASTER') this.audio.playBlaster();
      else if (prevWeapon === 'SPREAD') this.audio.playSpread();
      else if (prevWeapon === 'RAPID') this.audio.playRapid();
      else if (prevWeapon === 'MISSILE') this.audio.playMissileLaunch();
    }
    this.audio.setLaserBeam(this.weaponSystem.isLaserActive);
    this.weaponSystem.update(fixedDt);

    // Update Asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      this.asteroids[i].update(fixedDt);
    }

    // Update Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].updateAI(
        fixedDt,
        this.player,
        this.weaponSystem,
        this.particles,
        this.prng,
        (mx, my) => {
          this.mines.push(new Mine(mx, my));
          this.audio.playExplosion('small');
        }
      );
      this.enemies[i].update(fixedDt);
    }

    // Update Boss AI
    if (this.boss && !this.boss.dead) {
      this.boss.updateBossAI(
        fixedDt,
        this.player,
        this.weaponSystem,
        this.particles,
        this.camera,
        this.prng,
        (spawnedEnemy) => {
          this.enemies.push(spawnedEnemy);
        },
        (mx, my) => {
          this.mines.push(new Mine(mx, my));
        }
      );
      this.boss.update(fixedDt);
    } else {
      this.audio.setBossMusic(false);
    }

    // Update Mines
    for (let i = 0; i < this.mines.length; i++) {
      this.mines[i].update(fixedDt);
    }

    // Update Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      this.pickups[i].update(fixedDt);
    }

    // Update Event Manager (Meteor storms, derelicts, gravity wells)
    this.eventManager.update(
      fixedDt,
      this.wave,
      this.waveManager.isBossWave(this.wave),
      this.player,
      this.asteroids,
      this.enemies,
      newAsteroidsFromSplits,
      newPickupsFromDrops,
      this.particles,
      this.camera,
      this.floatingTexts,
      this.prng,
      (title, sub, col) => {
        this.waveManager.showWaveBanner(title, sub, col);
        this.audio.playBossAlarm();
      }
    );

    // Collisions
    const prevScore = this.score;
    this.collisionSystem.resolveCollisions(
      this.player,
      this.asteroids,
      newAsteroidsFromSplits,
      this.enemies,
      this.mines,
      this.boss,
      this.pickups,
      newPickupsFromDrops,
      this.weaponSystem,
      this.particles,
      this.floatingTexts,
      this.camera,
      this.prng,
      (scoreGained) => {
        this.score += scoreGained;
      }
    );

    // Audio SFX on state changes
    if (this.score > prevScore) {
      this.audio.playExplosion('medium');
    }
    if (newPickupsFromDrops.length > 0) {
      this.audio.playPickup();
    }

    // Filter dead entities
    if (newAsteroidsFromSplits.length > 0) this.asteroids.push(...newAsteroidsFromSplits);
    if (newPickupsFromDrops.length > 0) this.pickups.push(...newPickupsFromDrops);
    this.asteroids = this.asteroids.filter((a) => !a.dead);
    this.enemies = this.enemies.filter((e) => !e.dead);
    this.mines = this.mines.filter((m) => !m.dead);
    this.pickups = this.pickups.filter((p) => !p.dead);
    if (this.boss && this.boss.dead) {
      this.bossesKilled++;
      this.audio.playExplosion('large');
      this.boss = null;
    }

    // Update Particles & Floating Text
    this.particles.update(fixedDt);
    this.floatingTexts.update(fixedDt);

    // Update Camera tracking player with screen shake setting check
    this.camera.update(this.player.x, this.player.y, fixedDt, this.settingsMenu.visualSettings.screenShake);

    // Check game over
    if (this.player.dead && this.state === GameState.PLAYING) {
      this.state = GameState.GAME_OVER;
      this.audio.playExplosion('large');
      this.saveHighScore();
    }

    // Update debug stats
    const activeProjectiles = this.weaponSystem.projectiles.filter((p) => !p.dead).length;
    const totalEntities = 1 + this.asteroids.length + this.enemies.length + this.mines.length + (this.boss ? 1 : 0) + this.pickups.length + activeProjectiles;
    this.debugPanel.updateStats(this.fps, totalEntities);
  }

  private render(): void {
    const { width, height } = this.canvas;

    // Clear screen
    this.ctx.fillStyle = '#030812';
    this.ctx.fillRect(0, 0, width, height);

    // Apply Camera transform for world objects
    this.camera.applyTransform(this.ctx);

    // 1. Starfield, Nebulae & Arena Boundaries
    this.starfield.render(this.ctx, this.camera);

    // 2. Procedural Events (Derelict salvage & Gravity well singularity)
    this.eventManager.render(this.ctx, this.camera);

    // 3. Boss Telegraphs
    if (this.boss && !this.boss.dead) {
      this.boss.renderTelegraphs(this.ctx);
    }

    // 4. Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (this.camera.isInView(p.x, p.y, p.radius)) {
        p.render(this.ctx);
      }
    }

    // 5. Asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const ast = this.asteroids[i];
      if (this.camera.isInView(ast.x, ast.y, ast.radius)) {
        ast.render(this.ctx);
      }
    }

    // 6. Mines
    for (let i = 0; i < this.mines.length; i++) {
      const mine = this.mines[i];
      if (this.camera.isInView(mine.x, mine.y, mine.radius)) {
        mine.render(this.ctx);
      }
    }

    // 7. Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const en = this.enemies[i];
      if (this.camera.isInView(en.x, en.y, en.radius)) {
        en.render(this.ctx);
      }
    }

    // 8. Boss
    if (this.boss && !this.boss.dead) {
      this.boss.render(this.ctx);
    }

    // 9. Projectiles & Laser Ray
    this.weaponSystem.render(this.ctx);

    // 10. Particles
    this.particles.render(this.ctx);

    // 11. Player Ship
    this.player.render(this.ctx);

    // 12. Floating Combat / Pickup Text
    this.floatingTexts.render(this.ctx);

    // Restore Camera transform
    this.camera.restoreTransform(this.ctx);

    // 13. Screen-Space Boss Health Bar
    if (this.boss && !this.boss.dead) {
      this.boss.renderBossHealthBar(this.ctx, width);
    }

    // 14. Screen-Space HUD
    const radarThreats: RadarThreat[] = [
      ...this.asteroids.map(a => ({ x: a.x, y: a.y, type: 'asteroid' as const })),
      ...this.enemies.map(e => ({ x: e.x, y: e.y, type: 'enemy' as const })),
      ...this.mines.map(m => ({ x: m.x, y: m.y, type: 'mine' as const })),
    ];
    if (this.boss && !this.boss.dead) {
      radarThreats.push({ x: this.boss.x, y: this.boss.y, type: 'enemy' });
    }
    const pickupRadarData = this.pickups.map(p => ({ x: p.x, y: p.y, color: p.color }));

    this.hud.render(
      this.ctx,
      width,
      height,
      this.player,
      this.weaponSystem.currentWeapon,
      this.score,
      this.wave,
      this.fps,
      this.seed,
      radarThreats,
      pickupRadarData
    );

    // 15. Wave Announcement Banner
    this.waveManager.renderBanner(this.ctx, width, height);

    // 16. Settings gear button (top right corner, next to radar)
    this.renderSettingsButton(width, height);

    // 17. State Overlays (Paused, Game Over)
    if (this.state === GameState.PAUSED) {
      this.renderPausedOverlay(width, height);
    } else if (this.state === GameState.GAME_OVER) {
      this.renderGameOverOverlay(width, height);
    }
  }

  private renderSettingsButton(width: number, height: number): void {
    this.ctx.save();
    const btnX = width - 42;
    const btnY = height - 170;
    this.ctx.fillStyle = 'rgba(5, 15, 25, 0.8)';
    this.ctx.strokeStyle = '#00f0ff';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(btnX, btnY, 14, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.font = '14px sans-serif';
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('⚙', btnX, btnY);
    this.ctx.restore();
  }

  private renderPausedOverlay(width: number, height: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(2, 8, 16, 0.75)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 36px "Courier New", monospace';
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 15;
    this.ctx.fillText('SYSTEM PAUSED', width / 2, height / 2 - 40);

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('Press [ESC] or [P] to Resume Mission', width / 2, height / 2 + 5);
    this.ctx.fillText('Press [O] to Open Settings Menu', width / 2, height / 2 + 35);
    this.ctx.restore();
  }

  private renderGameOverOverlay(width: number, height: number): void {
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(18, 4, 10, 0.88)';
    this.ctx.fillRect(0, 0, width, height);

    this.ctx.textAlign = 'center';
    this.ctx.font = 'bold 42px "Courier New", monospace';
    this.ctx.fillStyle = '#ff3366';
    this.ctx.shadowColor = '#ff3366';
    this.ctx.shadowBlur = 20;
    this.ctx.fillText('HULL CRITICAL - SHIP DESTROYED', width / 2, height / 2 - 80);

    this.ctx.font = 'bold 22px "Courier New", monospace';
    this.ctx.fillStyle = '#ffffff';
    this.ctx.shadowBlur = 5;
    this.ctx.fillText(`FINAL SCORE: ${this.score.toLocaleString()}`, width / 2, height / 2 - 30);

    this.ctx.font = '16px "Courier New", monospace';
    this.ctx.fillStyle = '#ffe600';
    this.ctx.fillText(`PERSONAL BEST: ${Math.max(this.score, this.highScore).toLocaleString()}`, width / 2, height / 2);

    this.ctx.font = '15px "Courier New", monospace';
    this.ctx.fillStyle = '#aeefff';
    this.ctx.fillText(`SECTOR WAVE REACHED: ${this.wave}`, width / 2, height / 2 + 30);

    this.ctx.font = 'bold 16px "Courier New", monospace';
    this.ctx.fillStyle = '#00f0ff';
    this.ctx.shadowColor = '#00f0ff';
    this.ctx.shadowBlur = 8;
    this.ctx.fillText(`RUN SEED: ${this.seed}`, width / 2, height / 2 + 65);

    this.ctx.font = '14px "Courier New", monospace';
    this.ctx.fillStyle = '#cccccc';
    this.ctx.shadowBlur = 0;
    this.ctx.fillText('Press [R] to Replay Seed | [SPACE] for New Random Run', width / 2, height / 2 + 105);
    this.ctx.fillText('Or click Settings [O] to adjust audio / visuals', width / 2, height / 2 + 130);
    this.ctx.restore();
  }

  public restart(useSameSeed: boolean = false, customSeed?: number): void {
    if (customSeed !== undefined) {
      this.seed = customSeed;
    } else if (!useSameSeed) {
      this.seed = Math.floor(Math.random() * 900000) + 100000;
    }
    this.prng = new PRNG(this.seed);
    this.starfield = new Starfield(this.prng);
    this.player = new Player(CONFIG.WORLD_WIDTH / 2, CONFIG.WORLD_HEIGHT / 2);
    this.weaponSystem.reset();
    this.particles.reset();
    this.floatingTexts.reset();
    this.eventManager.reset();
    this.asteroids = [];
    this.enemies = [];
    this.mines = [];
    this.boss = null;
    this.score = 0;
    this.waveManager.reset(1);
    this.state = GameState.PLAYING;
    this.spawnInitialPickups(14);
  }
}
