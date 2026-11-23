import { Game } from '../core/Game';

export class DebugPanel {
  public visible: boolean = false;
  private container: HTMLElement;
  private game: Game;

  constructor(game: Game) {
    this.game = game;
    this.container = document.createElement('div');
    this.container.id = 'debug-panel';
    this.container.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 280px;
      background: rgba(8, 16, 28, 0.94);
      border: 1px solid #00f0ff;
      border-radius: 6px;
      box-shadow: 0 0 15px rgba(0, 240, 255, 0.4);
      padding: 12px;
      color: #00f0ff;
      font-family: "Courier New", monospace;
      font-size: 12px;
      z-index: 9999;
      display: none;
      backdrop-filter: blur(4px);
    `;

    this.buildUI();
    document.body.appendChild(this.container);
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #00f0ff; padding-bottom:6px; margin-bottom:8px;">
        <span style="font-weight:bold; color:#ffffff;">⚙ DEBUG CONSOLE</span>
        <span style="font-size:10px; color:#aaa;">[ \` ] to toggle</span>
      </div>
      <div id="debug-stats" style="margin-bottom:8px; line-height:1.4; color:#aeefff;"></div>
      <div style="display:flex; flex-direction:column; gap:5px;">
        <button id="btn-godmode" class="dbg-btn">Toggle God Mode (OFF)</button>
        <button id="btn-inffuel" class="dbg-btn">Toggle Infinite Fuel (OFF)</button>
        <button id="btn-refill" class="dbg-btn">Refill Hull & Fuel</button>
        <button id="btn-skipwave" class="dbg-btn">Next Wave (+1)</button>
        <div style="display:flex; gap:4px;">
          <button id="btn-spawn-ast" class="dbg-btn" style="flex:1;">+10 Asteroids</button>
          <button id="btn-clear-ast" class="dbg-btn" style="flex:1;">Clear Ast</button>
        </div>
        <div style="font-size:10px; color:#888; margin-top:4px;">EQUIP WEAPON:</div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
          <button id="btn-wpn-blaster" class="dbg-btn">Blaster</button>
          <button id="btn-wpn-spread" class="dbg-btn">Spread</button>
          <button id="btn-wpn-rapid" class="dbg-btn">Rapid</button>
          <button id="btn-wpn-laser" class="dbg-btn">Laser</button>
          <button id="btn-wpn-missile" class="dbg-btn" style="grid-column: span 2;">Missile</button>
        </div>
        <div style="font-size:10px; color:#888; margin-top:4px;">SPAWN PICKUP:</div>
        <div style="display:flex; gap:4px;">
          <button id="btn-pk-fuel" class="dbg-btn" style="flex:1;">+Fuel</button>
          <button id="btn-pk-shield" class="dbg-btn" style="flex:1;">+Shield</button>
          <button id="btn-pk-wpn" class="dbg-btn" style="flex:1;">+Wpn</button>
        </div>
        <div style="font-size:10px; color:#888; margin-top:4px;">SPAWN ENEMY:</div>
        <div style="display:flex; gap:4px;">
          <button id="btn-sp-drone" class="dbg-btn" style="flex:1;">Drone</button>
          <button id="btn-sp-raider" class="dbg-btn" style="flex:1;">Raider</button>
          <button id="btn-sp-minelayer" class="dbg-btn" style="flex:1;">MineLayer</button>
        </div>
        <div style="font-size:10px; color:#888; margin-top:4px;">SPECIAL EVENTS:</div>
        <div style="display:flex; gap:4px;">
          <button id="btn-ev-meteor" class="dbg-btn" style="flex:1;">Meteor</button>
          <button id="btn-ev-derelict" class="dbg-btn" style="flex:1;">Derelict</button>
          <button id="btn-ev-singularity" class="dbg-btn" style="flex:1;">Singularity</button>
        </div>
        <div style="font-size:10px; color:#888; margin-top:4px;">SPAWN BOSS:</div>
        <div style="display:flex; gap:4px;">
          <button id="btn-boss1" class="dbg-btn" style="flex:1;">Boss 1</button>
          <button id="btn-boss2" class="dbg-btn" style="flex:1;">Boss 2</button>
          <button id="btn-boss3" class="dbg-btn" style="flex:1;">Boss 3</button>
        </div>
      </div>
      <style>
        .dbg-btn {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid #00f0ff;
          color: #ffffff;
          padding: 4px 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          border-radius: 3px;
          transition: background 0.15s;
        }
        .dbg-btn:hover {
          background: rgba(0, 240, 255, 0.3);
        }
      </style>
    `;

    // Hook up buttons
    const btnGod = this.container.querySelector('#btn-godmode') as HTMLButtonElement;
    btnGod.onclick = () => {
      this.game.debugGodMode = !this.game.debugGodMode;
      btnGod.textContent = `Toggle God Mode (${this.game.debugGodMode ? 'ON' : 'OFF'})`;
      btnGod.style.borderColor = this.game.debugGodMode ? '#39ff14' : '#00f0ff';
    };

    const btnFuel = this.container.querySelector('#btn-inffuel') as HTMLButtonElement;
    btnFuel.onclick = () => {
      this.game.debugInfFuel = !this.game.debugInfFuel;
      btnFuel.textContent = `Toggle Infinite Fuel (${this.game.debugInfFuel ? 'ON' : 'OFF'})`;
      btnFuel.style.borderColor = this.game.debugInfFuel ? '#39ff14' : '#00f0ff';
    };

    const btnRefill = this.container.querySelector('#btn-refill') as HTMLButtonElement;
    btnRefill.onclick = () => {
      this.game.player.hull = this.game.player.maxHull;
      this.game.player.shield = this.game.player.maxShield;
      this.game.player.fuel = this.game.player.maxFuel;
    };

    const btnSkipWave = this.container.querySelector('#btn-skipwave') as HTMLButtonElement;
    btnSkipWave.onclick = () => {
      this.game.wave++;
    };

    const btnSpawnAst = this.container.querySelector('#btn-spawn-ast') as HTMLButtonElement;
    btnSpawnAst.onclick = () => {
      this.game.spawnAsteroids(10);
    };

    const btnClearAst = this.container.querySelector('#btn-clear-ast') as HTMLButtonElement;
    btnClearAst.onclick = () => {
      this.game.asteroids = [];
    };

    const btnWpnBlaster = this.container.querySelector('#btn-wpn-blaster') as HTMLButtonElement;
    btnWpnBlaster.onclick = () => this.game.weaponSystem.setWeapon('BLASTER');

    const btnWpnSpread = this.container.querySelector('#btn-wpn-spread') as HTMLButtonElement;
    btnWpnSpread.onclick = () => this.game.weaponSystem.setWeapon('SPREAD');

    const btnWpnRapid = this.container.querySelector('#btn-wpn-rapid') as HTMLButtonElement;
    btnWpnRapid.onclick = () => this.game.weaponSystem.setWeapon('RAPID');

    const btnWpnLaser = this.container.querySelector('#btn-wpn-laser') as HTMLButtonElement;
    btnWpnLaser.onclick = () => this.game.weaponSystem.setWeapon('LASER');

    const btnWpnMissile = this.container.querySelector('#btn-wpn-missile') as HTMLButtonElement;
    btnWpnMissile.onclick = () => this.game.weaponSystem.setWeapon('MISSILE');

    const btnPkFuel = this.container.querySelector('#btn-pk-fuel') as HTMLButtonElement;
    btnPkFuel.onclick = () => this.game.spawnPickup('FUEL');

    const btnPkShield = this.container.querySelector('#btn-pk-shield') as HTMLButtonElement;
    btnPkShield.onclick = () => this.game.spawnPickup('SHIELD');

    const btnPkWpn = this.container.querySelector('#btn-pk-wpn') as HTMLButtonElement;
    btnPkWpn.onclick = () => this.game.spawnPickup('WEAPON_SPREAD');

    const btnSpDrone = this.container.querySelector('#btn-sp-drone') as HTMLButtonElement;
    btnSpDrone.onclick = () => this.game.spawnEnemy('DRONE');

    const btnSpRaider = this.container.querySelector('#btn-sp-raider') as HTMLButtonElement;
    btnSpRaider.onclick = () => this.game.spawnEnemy('RAIDER');

    const btnSpMineLayer = this.container.querySelector('#btn-sp-minelayer') as HTMLButtonElement;
    btnSpMineLayer.onclick = () => this.game.spawnEnemy('MINELAYER');

    const btnEvMeteor = this.container.querySelector('#btn-ev-meteor') as HTMLButtonElement;
    btnEvMeteor.onclick = () => this.game.triggerEvent('METEOR');

    const btnEvDerelict = this.container.querySelector('#btn-ev-derelict') as HTMLButtonElement;
    btnEvDerelict.onclick = () => this.game.triggerEvent('DERELICT');

    const btnEvSingularity = this.container.querySelector('#btn-ev-singularity') as HTMLButtonElement;
    btnEvSingularity.onclick = () => this.game.triggerEvent('SINGULARITY');

    const btnBoss1 = this.container.querySelector('#btn-boss1') as HTMLButtonElement;
    btnBoss1.onclick = () => {
      this.game.spawnBoss(1);
    };
    const btnBoss2 = this.container.querySelector('#btn-boss2') as HTMLButtonElement;
    btnBoss2.onclick = () => {
      this.game.spawnBoss(2);
    };
    const btnBoss3 = this.container.querySelector('#btn-boss3') as HTMLButtonElement;
    btnBoss3.onclick = () => {
      this.game.spawnBoss(3);
    };
  }

  public updateStats(fps: number, entityCount: number): void {
    if (!this.visible) return;
    const statsDiv = this.container.querySelector('#debug-stats');
    if (statsDiv) {
      const p = this.game.player;
      statsDiv.innerHTML = `
        FPS: <b>${Math.round(fps)}</b> | Entities: <b>${entityCount}</b><br>
        Pos: (${Math.round(p.x)}, ${Math.round(p.y)})<br>
        Vel: ${Math.round(Math.hypot(p.vx, p.vy))} px/s<br>
        Fuel: ${Math.round(p.fuel)}/${p.maxFuel}<br>
        Shield: ${Math.round(p.shield)}/${p.maxShield}<br>
        Hull: ${Math.round(p.hull)}/${p.maxHull}
      `;
    }
  }
}
