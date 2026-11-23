# 🚀 Orbital – Space Survival

A high-performance, browser-based 2D procedural space survival shooter built with **TypeScript**, **HTML5 Canvas**, and **Vite**.

![Orbital Space Survival](https://raw.githubusercontent.com/antigravity/orbital/main/banner.png)

---

## 🌟 Concept

You pilot an agile starfighter stranded in a treacherous deep-space asteroid sector. Maneuver through zero-gravity space with authentic Newtonian inertia, blast irregular asteroids, scavenge fuel canisters and shield boosters, acquire powerful military-grade weapons, survive escalating procedural enemy waves, and defeat colossal multi-phase bosses. Every run is procedurally generated using deterministic seeded random number generation, allowing seeds to be shared and replayed.

---

## 🎮 Controls

### ⌨️ Desktop Keyboard & Mouse
| Action | Key(s) | Description |
| :--- | :--- | :--- |
| **Thrust Forward** | `W` or `↑ Up Arrow` | Fires main engine thrusters (consumes fuel, emits particle plume) |
| **Rotate Ship** | `A` / `D` or `←` / `→` | Adjusts ship heading with angular momentum |
| **Retro-Brake** | `S` or `↓ Down Arrow` / `Shift` | Fires retro-thrusters to rapidly arrest drift velocity |
| **Primary Fire** | `Space` | Discharges active weapon system |
| **Mission Settings**| `O` (or click gear ⚙) | Opens audio volume sliders and visual toggles |
| **Pause / Resume** | `Escape` or `P` | Pauses simulation and game clock |
| **Debug Console** | Backtick (`` ` ``) or `~` | Toggles developer cheats, wave jump, and spawner |
| **Replay Seed** | `R` (on Game Over) | Restarts run with identical procedural seed |
| **New Run** | `Space` (on Game Over) | Generates new random sector seed |

### 📱 Mobile Touch Controls & Fullscreen
- **⛶ Fullscreen Button** (top-left): Tap to toggle full-screen immersive mode on any mobile device or browser.
- **Virtual Analog Joystick** (bottom-left): Smooth multi-touch thumb tracking for directional steering and forward thrust.
- **Fire Button** (bottom-right): Dedicated high-visibility touch button with active glow to fire equipped weapons.
- **Brake Button** (bottom-right): Dedicated touch button to activate counter-damping retro thrusters.
- **Mobile Menu Buttons** (top-right): Quick touch buttons for `⏸ Pause` and `⚙ Settings`.
- **Game Over & Pause Actions**: Responsive on-screen touch buttons for `🚀 NEW MISSION`, `🔁 REPLAY SEED`, and `▶ RESUME MISSION`.

### 🎮 Gamepad Support
- **Left Analog Stick**: Steer and thrust forward.
- **Right Trigger (`RT`) / `A` Button**: Primary fire.
- **Left Trigger (`LT`) / `B` Button**: Retro-brake.
- **Start Button**: Pause game.

---

## 🛠️ Tech Stack & Architecture

- **Engine**: Pure Vanilla TypeScript + Native HTML5 2D Canvas. Zero bulky runtime frameworks.
- **Physics**: 60 Hz fixed-timestep accumulator loop (`dt = 1/60`) ensuring consistent Newtonian flight across 60Hz, 120Hz, and 144Hz monitors.
- **Deterministic PRNG**: Seeded `Mulberry32` algorithm powering 100% reproducible sector generation, starfields, nebulae, asteroid polygons, and loot drops.
- **Performance**:
  - **Spatial Partitioning**: 2D Uniform Spatial Hash Grid ($O(1)$ neighbor lookups) for broadphase collisions.
  - **Zero-GC Object Pools**: Pre-allocated pools for 300+ projectiles and 800+ particles for stutter-free 60 FPS gameplay.
- **Audio Synthesizer**: Native **Web Audio API** procedural sound synthesizer generating real-time laser sweeps, explosions, thruster pink noise, and dynamic ambient synth space music. Zero external audio file requests or latency.
- **Storage**: Persistent high scores and settings saved in `localStorage`.
- **Tuning**: Centralized configuration file in [`src/config.ts`](file:///home/jp/Documents/Orbital/src/config.ts).

---

## 🪐 Core Gameplay Systems

### 1. Newtonian Inertial Navigation
- The ship preserves linear and angular momentum.
- Active thrust burns fuel; retro-braking applies heavy counter-damping.
- When fuel hits 0, thrusters cut out, ship drifts purely on Newton inertia, and emergency solar panels limit speed to a low-power crawl until fuel is scavenged.

### 2. Procedural Asteroids
- **3 Sizes**: Large, Medium, Small.
- Procedural irregular polygon vertices with seeded angular jitter.
- Large asteroids fracture into 2 Mediums; Mediums split into 2 Smalls; Smalls shatter into debris and drop loot.

### 3. Weapons Arsenal
| Weapon | Description | Ammo / Duration |
| :--- | :--- | :--- |
| **Standard Blaster** | Cyan laser bolt, high accuracy and reliability | Infinite |
| **Spread Shot** | 5-way wide fan blast; devastating against swarms | 75 rounds |
| **Rapid Vulcan** | High-velocity dual-mount plasma gatling gun | 200 rounds |
| **Laser Beam** | Piercing continuous green ray that shreds multiple targets | 9.0 seconds |
| **Homing Missiles** | Dual self-steering ordnance tracking nearest hostiles | 25 salvos |

### 4. Hostile Enemy Types
- **Chaser Drone**: Fast kamikaze interceptor that hunts down and rams the player.
- **Raider**: Strafing combat fighter maintaining orbital standoff distance while firing twin laser volleys.
- **MineLayer**: Armored heavy ship that deploys proximity explosive mines with flashing arm fuses.

### 5. Multi-Phase Giant Boss Fights (Every 5 Waves)
- **The Leviathan Dreadnought** (Wave 5, 20): Giant carrier with automated turrets, drone hangars, telegraphed sweeping death lasers, and core meltdown ring barrages.
- **The Pulsar Core Sentinel** (Wave 10, 25): Crystalline entity with 4 revolving kinetic deflector shields, dual spiral laser spirals, and gravitational shockwaves.
- **The Devourer Mothership** (Wave 15, 30): Bio-mechanical arachnid fortress with a frontal gravity suction vortex and high-speed ramming charges.

### 6. Procedural Space Hazards & Events
- **Meteor Storm**: High-velocity asteroid hail crossing the arena.
- **Derelict Freighter**: Stranded wreckage containing massive salvage cargo caches.
- **Singularity Anomaly**: Swirling black hole exerting continuous gravitational pull on all nearby matter.

---

## ⚙️ Installation & Development

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Quick Start
```bash
# 1. Clone or navigate to repository
cd Orbital

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open your browser at `http://localhost:5173/` (or the printed port).

### Production Build
```bash
# Typecheck and bundle optimized production assets into dist/
npm run build

# Preview production build locally
npm run preview
```

---

## 🧭 Space Survival Guide

1. **Conserve Fuel**: Do not hold `W` continuously! Tap thrust to build momentum, let Newton carry you through space, and use `Shift` / `S` only when you need to stop.
2. **Watch the Tactical Radar**: Amber dots are asteroids, red dots are hostiles, orange crosses are mines, and green/cyan/magenta dots are fuel and weapon drops.
3. **Pulsar Core Strategy**: Do not fire directly into its revolving blue shields in Phase 1; orbit around to angle shots through the openings.
4. **Devourer Mandibles**: When the Devourer activates its purple suction cone, turn 90 degrees and apply maximum thrust to escape the event horizon!
5. **Debug Menu**: Press backtick (`` ` ``) at any time to toggle God Mode, infinite fuel, skip waves, or spawn specific bosses.
