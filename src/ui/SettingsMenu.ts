import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../core/InputManager';
import type { Game } from '../core/Game';
import type { WeaponType } from '../systems/WeaponSystem';

export interface VisualSettings {
  screenShake: boolean;
  reducedFlashing: boolean;
}

export class SettingsMenu {
  public visible: boolean = false;
  private container: HTMLElement;
  private audio: AudioManager;
  private input: InputManager;
  private game?: Game;

  public visualSettings: VisualSettings = {
    screenShake: true,
    reducedFlashing: false,
  };

  constructor(audio: AudioManager, input: InputManager, game?: Game) {
    this.audio = audio;
    this.input = input;
    this.game = game;
    this.loadVisualSettings();

    this.container = document.createElement('div');
    this.container.id = 'settings-modal';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      max-width: 94vw;
      max-height: 90vh;
      overflow-y: auto;
      background: rgba(5, 12, 24, 0.97);
      border: 1.5px solid #00f0ff;
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.45);
      padding: 20px;
      color: #ffffff;
      font-family: "Courier New", monospace;
      font-size: 13px;
      z-index: 99999;
      display: none;
      backdrop-filter: blur(10px);
    `;

    this.buildUI();
    document.body.appendChild(this.container);
  }

  public setGame(game: Game): void {
    this.game = game;
    this.refreshValues();
  }

  public getInput(): InputManager {
    return this.input;
  }

  private loadVisualSettings(): void {
    try {
      const saved = localStorage.getItem('orbital_visual_settings');
      if (saved) {
        this.visualSettings = { ...this.visualSettings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }

  private saveVisualSettings(): void {
    try {
      localStorage.setItem('orbital_visual_settings', JSON.stringify(this.visualSettings));
    } catch {
      // ignore
    }
  }

  public toggle(): void {
    this.visible = !this.visible;
    this.container.style.display = this.visible ? 'block' : 'none';
    if (this.visible) {
      this.refreshValues();
    }
  }

  private buildUI(): void {
    this.container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #00f0ff; padding-bottom:8px; margin-bottom:14px;">
        <span style="font-weight:bold; font-size:16px; color:#00f0ff; text-shadow:0 0 8px #00f0ff;">⚙ MISSION SETTINGS</span>
        <button id="btn-close-settings" style="background:none; border:none; color:#ff3366; font-size:20px; cursor:pointer; font-weight:bold; line-height:1;">✕</button>
      </div>

      <!-- GOD MODE OVERRIDE SECTION -->
      <div style="margin-bottom:16px; padding:12px; background:rgba(255, 215, 0, 0.07); border:1.5px solid #ffd700; border-radius:6px; box-shadow:0 0 14px rgba(255, 215, 0, 0.25);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="color:#ffd700; font-weight:bold; font-size:13px; text-shadow:0 0 8px #ffd700;">⚡ GOD MODE (UNLIMITED CHEATS)</span>
          <span id="godmode-status-tag" style="font-size:10px; color:#aaa; font-weight:bold; padding:2px 6px; border:1px solid #777; border-radius:3px;">INACTIVE</span>
        </div>
        <p style="font-size:11px; color:#ffec80; margin-bottom:10px; line-height:1.4;">
          Unlimited Hull, Shield, Fuel & Ammo. Deep space boundary pushback disabled. Relentless enemy swarms summoned!
        </p>

        <!-- God Mode Main Toggle -->
        <button id="btn-toggle-godmode" class="st-btn" style="width:100%; border-color:#ffd700; color:#ffd700; font-weight:bold; margin-bottom:12px; padding:9px; font-size:13px;">
          ⚡ ACTIVATE GOD MODE
        </button>

        <!-- Weapon Arsenal Selection -->
        <div style="font-size:11px; color:#aeefff; font-weight:bold; margin-bottom:6px;">
          SELECT WEAPON ARSENAL (UNLIMITED CAPACITY):
        </div>
        <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; margin-bottom:10px;">
          <button class="st-btn-wpn" data-wpn="BLASTER">🔫 BLASTER</button>
          <button class="st-btn-wpn" data-wpn="SPREAD">💥 SPREAD SHOT</button>
          <button class="st-btn-wpn" data-wpn="RAPID">⚡ RAPID VULCAN</button>
          <button class="st-btn-wpn" data-wpn="LASER">🔴 LASER BEAM</button>
          <button class="st-btn-wpn" style="grid-column: span 2;" data-wpn="MISSILE">🚀 HOMING MISSILES</button>
        </div>

        <!-- Swarm Summoner -->
        <button id="btn-summon-swarm" class="st-btn" style="width:100%; border-color:#ff0055; color:#ff3366; font-weight:bold; padding:8px;">
          🔥 SUMMON ENEMY SWARM (+15)
        </button>
      </div>

      <!-- Audio Section -->
      <div style="margin-bottom:14px;">
        <div style="color:#00f0ff; font-weight:bold; margin-bottom:6px;">AUDIO SYNTHESIZER</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>Master Volume</span>
            <input type="range" id="vol-master" min="0" max="1" step="0.05" style="width:140px; cursor:pointer;">
          </label>
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>SFX Volume</span>
            <input type="range" id="vol-sfx" min="0" max="1" step="0.05" style="width:140px; cursor:pointer;">
          </label>
          <label style="display:flex; justify-content:space-between; align-items:center;">
            <span>Music Volume</span>
            <input type="range" id="vol-music" min="0" max="1" step="0.05" style="width:140px; cursor:pointer;">
          </label>
          <button id="btn-mute" class="st-btn" style="margin-top:4px;">Mute Audio: OFF</button>
        </div>
      </div>

      <!-- Visuals & Accessibility -->
      <div style="margin-bottom:14px;">
        <div style="color:#00f0ff; font-weight:bold; margin-bottom:6px;">VISUALS & ACCESSIBILITY</div>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <span>Screen Shake</span>
            <input type="checkbox" id="chk-shake" style="cursor:pointer; width:16px; height:16px;">
          </label>
          <label style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
            <span>Reduce Flashing (Photosensitive)</span>
            <input type="checkbox" id="chk-flash" style="cursor:pointer; width:16px; height:16px;">
          </label>
          <button id="btn-toggle-touch" class="st-btn" style="margin-top:4px;">Mobile Touch Controls: ON</button>
        </div>
      </div>

      <!-- Controls Guide -->
      <div>
        <div style="color:#00f0ff; font-weight:bold; margin-bottom:6px;">CONTROLS OVERVIEW</div>
        <div id="controls-list" style="font-size:11px; color:#aeefff; line-height:1.5;">
          • Thrust: [W] / [↑] / Virtual Joystick<br>
          • Rotate: [A] [D] / [←] [→] / Virtual Joystick<br>
          • Brake: [S] / [Shift] / Touch BRAKE<br>
          • Primary Fire: [SPACE] / Touch FIRE<br>
          • Pause: [ESC] or [P] / Top-Right [⏸]<br>
          • Mission Settings: [O] / Top-Right [⚙]<br>
          • Debug Console: [\`] Backtick
        </div>
      </div>

      <style>
        .st-btn {
          background: rgba(0, 240, 255, 0.15);
          border: 1px solid #00f0ff;
          color: #ffffff;
          padding: 6px 12px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
          border-radius: 4px;
          transition: background 0.15s, transform 0.08s;
        }
        .st-btn:hover {
          background: rgba(0, 240, 255, 0.35);
        }
        .st-btn:active {
          transform: scale(0.98);
        }
        .st-btn-wpn {
          background: rgba(0, 240, 255, 0.1);
          border: 1px solid rgba(0, 240, 255, 0.4);
          color: #aeefff;
          padding: 7px 8px;
          cursor: pointer;
          font-family: inherit;
          font-size: 11px;
          border-radius: 4px;
          text-align: center;
          transition: all 0.15s;
        }
        .st-btn-wpn:hover {
          background: rgba(0, 240, 255, 0.28);
          border-color: #00f0ff;
          color: #ffffff;
        }
        .st-btn-wpn.active-wpn {
          background: rgba(255, 215, 0, 0.28) !important;
          border-color: #ffd700 !important;
          color: #ffd700 !important;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.45);
          font-weight: bold;
        }
      </style>
    `;

    // God Mode Toggle Button
    const btnToggleGodmode = this.container.querySelector('#btn-toggle-godmode') as HTMLButtonElement;
    btnToggleGodmode.onclick = () => {
      if (this.game) {
        this.game.setGodMode(!this.game.debugGodMode);
        this.refreshValues();
      }
    };

    // Weapon Selection Buttons
    const wpnButtons = this.container.querySelectorAll('.st-btn-wpn');
    wpnButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const wpn = target.getAttribute('data-wpn') as WeaponType;
        if (this.game && wpn) {
          this.game.weaponSystem.setWeapon(wpn);
          this.game.audio.playPickup();
          this.game.floatingTexts.spawn(this.game.player.x, this.game.player.y - 40, `EQUIPPED: ${wpn}`, '#00ffff', 14);
          this.refreshValues();
        }
      });
    });

    // Swarm Summoner
    const btnSummonSwarm = this.container.querySelector('#btn-summon-swarm') as HTMLButtonElement;
    btnSummonSwarm.onclick = () => {
      if (this.game) {
        this.game.spawnEnemySwarm(15);
        this.game.audio.playBossAlarm();
        this.game.floatingTexts.spawn(this.game.player.x, this.game.player.y - 50, '🔥 RELENTLESS SWARM SUMMONED!', '#ff0055', 18);
        this.game.waveManager.showWaveBanner('🔥 ENEMY SWARM INCOMING 🔥', '15 HOSTILE RAIDERS & DRONES DETECTED', '#ff0055');
      }
    };

    // Audio Sliders
    const masterSlider = this.container.querySelector('#vol-master') as HTMLInputElement;
    masterSlider.oninput = () => this.audio.setMasterVolume(parseFloat(masterSlider.value));

    const sfxSlider = this.container.querySelector('#vol-sfx') as HTMLInputElement;
    sfxSlider.oninput = () => this.audio.setSfxVolume(parseFloat(sfxSlider.value));

    const musicSlider = this.container.querySelector('#vol-music') as HTMLInputElement;
    musicSlider.oninput = () => this.audio.setMusicVolume(parseFloat(musicSlider.value));

    const muteBtn = this.container.querySelector('#btn-mute') as HTMLButtonElement;
    muteBtn.onclick = () => {
      const isMuted = this.audio.toggleMute();
      muteBtn.textContent = `Mute Audio: ${isMuted ? 'ON' : 'OFF'}`;
      muteBtn.style.borderColor = isMuted ? '#ff3366' : '#00f0ff';
    };

    // Checkboxes
    const chkShake = this.container.querySelector('#chk-shake') as HTMLInputElement;
    chkShake.onchange = () => {
      this.visualSettings.screenShake = chkShake.checked;
      this.saveVisualSettings();
    };

    const chkFlash = this.container.querySelector('#chk-flash') as HTMLInputElement;
    chkFlash.onchange = () => {
      this.visualSettings.reducedFlashing = chkFlash.checked;
      this.saveVisualSettings();
    };

    const btnToggleTouch = this.container.querySelector('#btn-toggle-touch') as HTMLButtonElement;
    btnToggleTouch.onclick = () => {
      const controls = document.getElementById('mobile-controls');
      if (controls) {
        const isShown = controls.style.display === 'flex';
        controls.style.display = isShown ? 'none' : 'flex';
        btnToggleTouch.textContent = `Mobile Touch Controls: ${!isShown ? 'ON' : 'OFF'}`;
        btnToggleTouch.style.borderColor = !isShown ? '#39ff14' : '#ff3366';
      }
    };

    // Close button
    const closeBtn = this.container.querySelector('#btn-close-settings') as HTMLButtonElement;
    closeBtn.onclick = () => this.toggle();
  }

  public refreshValues(): void {
    // God mode UI sync
    const isGod = this.game ? this.game.debugGodMode : false;
    const btnToggleGodmode = this.container.querySelector('#btn-toggle-godmode') as HTMLButtonElement;
    const godModeTag = this.container.querySelector('#godmode-status-tag') as HTMLElement;

    if (btnToggleGodmode && godModeTag) {
      if (isGod) {
        btnToggleGodmode.textContent = '⚡ GOD MODE: ACTIVE (CLICK TO DISABLE)';
        btnToggleGodmode.style.background = 'rgba(255, 215, 0, 0.35)';
        btnToggleGodmode.style.borderColor = '#ffd700';
        btnToggleGodmode.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.6)';
        godModeTag.textContent = 'ACTIVE';
        godModeTag.style.color = '#ffd700';
        godModeTag.style.borderColor = '#ffd700';
      } else {
        btnToggleGodmode.textContent = '⚡ ACTIVATE GOD MODE';
        btnToggleGodmode.style.background = 'rgba(255, 215, 0, 0.12)';
        btnToggleGodmode.style.borderColor = '#ffd700';
        btnToggleGodmode.style.boxShadow = 'none';
        godModeTag.textContent = 'INACTIVE';
        godModeTag.style.color = '#aaa';
        godModeTag.style.borderColor = '#777';
      }
    }

    // Active weapon button sync
    const activeWpn = this.game ? this.game.weaponSystem.currentWeapon.type : 'BLASTER';
    const wpnButtons = this.container.querySelectorAll('.st-btn-wpn');
    wpnButtons.forEach((btn) => {
      const wpn = btn.getAttribute('data-wpn');
      if (wpn === activeWpn) {
        btn.classList.add('active-wpn');
      } else {
        btn.classList.remove('active-wpn');
      }
    });

    const masterSlider = this.container.querySelector('#vol-master') as HTMLInputElement;
    if (masterSlider) masterSlider.value = this.audio.masterVolume.toString();

    const sfxSlider = this.container.querySelector('#vol-sfx') as HTMLInputElement;
    if (sfxSlider) sfxSlider.value = this.audio.sfxVolume.toString();

    const musicSlider = this.container.querySelector('#vol-music') as HTMLInputElement;
    if (musicSlider) musicSlider.value = this.audio.musicVolume.toString();

    const muteBtn = this.container.querySelector('#btn-mute') as HTMLButtonElement;
    if (muteBtn) {
      muteBtn.textContent = `Mute Audio: ${this.audio.muted ? 'ON' : 'OFF'}`;
      muteBtn.style.borderColor = this.audio.muted ? '#ff3366' : '#00f0ff';
    }

    const chkShake = this.container.querySelector('#chk-shake') as HTMLInputElement;
    if (chkShake) chkShake.checked = this.visualSettings.screenShake;

    const chkFlash = this.container.querySelector('#chk-flash') as HTMLInputElement;
    if (chkFlash) chkFlash.checked = this.visualSettings.reducedFlashing;
  }
}
