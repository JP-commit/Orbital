import { AudioManager } from '../systems/AudioManager';
import { InputManager } from '../core/InputManager';

export interface VisualSettings {
  screenShake: boolean;
  reducedFlashing: boolean;
}

export class SettingsMenu {
  public visible: boolean = false;
  private container: HTMLElement;
  private audio: AudioManager;
  private input: InputManager;

  public visualSettings: VisualSettings = {
    screenShake: true,
    reducedFlashing: false,
  };

  constructor(audio: AudioManager, input: InputManager) {
    this.audio = audio;
    this.input = input;
    this.loadVisualSettings();

    this.container = document.createElement('div');
    this.container.id = 'settings-modal';
    this.container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 420px;
      max-width: 92vw;
      background: rgba(5, 12, 24, 0.96);
      border: 1px solid #00f0ff;
      border-radius: 8px;
      box-shadow: 0 0 25px rgba(0, 240, 255, 0.4);
      padding: 22px;
      color: #ffffff;
      font-family: "Courier New", monospace;
      font-size: 13px;
      z-index: 99999;
      display: none;
      backdrop-filter: blur(8px);
    `;

    this.buildUI();
    document.body.appendChild(this.container);
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
        <button id="btn-close-settings" style="background:none; border:none; color:#ff3366; font-size:18px; cursor:pointer; font-weight:bold;">✕</button>
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
          • Thrust: [W] / [↑]<br>
          • Rotate: [A] [D] / [←] [→]<br>
          • Brake: [S] / [Shift]<br>
          • Primary Fire: [SPACE]<br>
          • Pause: [ESC] or [P]<br>
          • Mission Settings: [O]<br>
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
          transition: background 0.15s;
        }
        .st-btn:hover {
          background: rgba(0, 240, 255, 0.35);
        }
      </style>
    `;

    // Sliders
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

  private refreshValues(): void {
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
