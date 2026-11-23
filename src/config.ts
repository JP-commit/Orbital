// Centralized game configuration and tuning values
export const CONFIG = {
  // World & Arena
  WORLD_WIDTH: 4000,
  WORLD_HEIGHT: 4000,
  BOUNDARY_WARN_DIST: 300,
  BOUNDARY_DAMAGE: 10, // DPS if outside boundary

  // Simulation
  FIXED_STEP: 1 / 60,
  MAX_ACCUMULATED_TIME: 0.25, // prevents spiral of death

  // Player Physics & Stats
  PLAYER: {
    RADIUS: 18,
    ACCELERATION: 550,
    ROTATION_SPEED: 4.2, // rad/s
    MAX_SPEED: 480,
    VACUUM_DAMPING: 0.25, // natural Newtonian drift damping
    BRAKE_DAMPING: 3.2,   // active retro-thrusters brake damping
    EMERGENCY_SOLAR_SPEED: 70, // crawl speed when out of fuel

    MAX_HULL: 100,
    MAX_SHIELD: 100,
    SHIELD_RECHARGE_DELAY: 3.5, // seconds without damage before recharge
    SHIELD_RECHARGE_RATE: 20,   // shield units per second

    MAX_FUEL: 100,
    FUEL_BURN_RATE: 10.0, // units/sec while full thrusting
    FUEL_IDLE_RATE: 0.3,  // units/sec life-support passive drain
  },

  // Weapons Matrix
  WEAPONS: {
    BLASTER: {
      NAME: 'Blaster',
      FIRE_RATE: 5.5, // shots/sec
      SPEED: 820,
      DAMAGE: 25,
      LIFETIME: 1.6,
      COLOR: '#00ffff',
      AMMO: Infinity,
      RECOIL: 16, // px/s backward kick per shot
      VISUAL_RECOIL: 3.5, // px hull kickback
    },
    SPREAD: {
      NAME: 'Spread Shot',
      FIRE_RATE: 3.8,
      SPEED: 760,
      DAMAGE: 18,
      COUNT: 5,
      SPREAD_ANGLE: 0.52, // ~30 degrees total
      LIFETIME: 1.2,
      COLOR: '#ff007f',
      DEFAULT_AMMO: 75,
      RECOIL: 56, // Heavy shotgun kickback
      VISUAL_RECOIL: 7.5,
    },
    RAPID: {
      NAME: 'Rapid Vulcan',
      FIRE_RATE: 14.0,
      SPEED: 950,
      DAMAGE: 14,
      LIFETIME: 1.4,
      COLOR: '#ffe600',
      DEFAULT_AMMO: 200,
      RECOIL: 5.5, // Rapid micro-pulses
      VISUAL_RECOIL: 1.8,
    },
    LASER: {
      NAME: 'Laser Beam',
      FIRE_RATE: 60, // tick based
      RANGE: 700,
      DAMAGE_PER_SEC: 120,
      DURATION: 9.0, // seconds
      COLOR: '#39ff14',
      RECOIL_PER_SEC: 32, // Continuous photon radiation pressure
      VISUAL_RECOIL: 0.8,
    },
    MISSILE: {
      NAME: 'Homing Missiles',
      FIRE_RATE: 2.2,
      INITIAL_SPEED: 350,
      MAX_SPEED: 750,
      TURN_RATE: 4.5,
      DAMAGE: 65,
      LIFETIME: 3.2,
      COLOR: '#ff5500',
      DEFAULT_AMMO: 25,
      RECOIL: 38, // Ordnance ejection back-blast
      VISUAL_RECOIL: 5.0,
    }
  },

  // Asteroid Settings
  ASTEROIDS: {
    LARGE: { RADIUS: 52, HP: 75, SPEED_MIN: 25, SPEED_MAX: 65, SCORE: 50, VERTICES: 12, JITTER: 0.35 },
    MEDIUM: { RADIUS: 28, HP: 35, SPEED_MIN: 45, SPEED_MAX: 110, SCORE: 100, VERTICES: 10, JITTER: 0.30 },
    SMALL: { RADIUS: 14, HP: 15, SPEED_MIN: 70, SPEED_MAX: 170, SCORE: 150, VERTICES: 8, JITTER: 0.25 },
    SPLIT_COUNT: 2,
    LOOT_DROP_CHANCE: 0.32,
  },

  // Enemy Types
  ENEMIES: {
    DRONE: { RADIUS: 16, HP: 30, SPEED: 240, DAMAGE: 25, SCORE: 200, COLOR: '#ff3366' },
    RAIDER: { RADIUS: 22, HP: 70, SPEED: 160, DAMAGE: 15, FIRE_RATE: 1.2, SCORE: 400, COLOR: '#ff9900' },
    MINELAYER: { RADIUS: 26, HP: 110, SPEED: 110, MINE_INTERVAL: 4.0, SCORE: 500, COLOR: '#cc00ff' },
    MINE: { RADIUS: 12, HP: 15, DETECT_RADIUS: 180, EXPLODE_RADIUS: 90, DAMAGE: 45, COLOR: '#ff0033' },
  },

  // Boss Encounters (Every 5 waves)
  BOSS_INTERVAL: 5,
  BOSSES: {
    DREADNOUGHT: { RADIUS: 90, HP: 2200, SPEED: 80, SCORE: 5000, COLOR: '#ff0055' },
    PULSAR_CORE: { RADIUS: 70, HP: 2600, SPEED: 100, SCORE: 7500, COLOR: '#00e5ff' },
    DEVOURER: { RADIUS: 105, HP: 3400, SPEED: 120, SCORE: 10000, COLOR: '#9d00ff' },
  },

  // Wave Budget Formula parameters: Budget = BASE * (1 + wave * SCALE)^EXPONENT
  WAVE: {
    BASE_BUDGET: 60,
    SCALE: 0.35,
    EXPONENT: 1.25,
    INTERMISSION_DURATION: 3.5, // seconds between waves
  },

  // Drop Table Probabilities
  DROPS: {
    FUEL: 0.40,
    SHIELD: 0.25,
    WEAPON: 0.25,
    HULL_NANITE: 0.10,
  },

  // Visuals & Camera
  CAMERA: {
    LERP: 0.12,
    MAX_SHAKE: 30,
    TRAUMA_DECAY: 1.4, // per second
  },

  // Audio Defaults
  AUDIO: {
    MASTER_VOL: 0.7,
    SFX_VOL: 0.8,
    MUSIC_VOL: 0.5,
  }
} as const;
