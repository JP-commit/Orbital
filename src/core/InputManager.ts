// Comprehensive Input Manager: Keyboard, Gamepad API, and Robust Multi-Touch Controls
export interface KeyBindings {
  thrust: string[];
  rotateLeft: string[];
  rotateRight: string[];
  brake: string[];
  fire: string[];
  pause: string[];
  debug: string[];
}

export class InputManager {
  private keys: Map<string, boolean> = new Map();
  private justPressedKeys: Set<string> = new Set();
  private bindings: KeyBindings = {
    thrust: ['KeyW', 'ArrowUp'],
    rotateLeft: ['KeyA', 'ArrowLeft'],
    rotateRight: ['KeyD', 'ArrowRight'],
    brake: ['KeyS', 'ArrowDown', 'ShiftLeft', 'ShiftRight'],
    fire: ['Space'],
    pause: ['Escape', 'KeyP'],
    debug: ['Backquote', 'Tilde'],
  };

  // Virtual Joystick & Multi-Touch state
  public touchActive: boolean = false;
  private joystickStart = { x: 0, y: 0 };
  public joystickDelta = { x: 0, y: 0 };
  public isJoystickActive: boolean = false;
  private joystickTouchId: number | null = null;
  private joystickThumb: HTMLElement | null = null;

  public touchBraking: boolean = false;
  public touchFiring: boolean = false;
  public pauseTriggered: boolean = false;

  // Gamepad state
  private gamepadIndex: number | null = null;

  constructor() {
    this.setupKeyboardListeners();
    this.setupGamepadListeners();
    this.loadCustomBindings();
  }

  public static isTouchDevice(): boolean {
    return ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) return;

      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }

      if (!this.keys.get(e.code)) {
        this.justPressedKeys.add(e.code);
      }
      this.keys.set(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this.justPressedKeys.clear();
    });
  }

  private setupGamepadListeners(): void {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = e.gamepad.index;
      console.log(`Gamepad connected at index ${e.gamepad.index}: ${e.gamepad.id}`);
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      if (this.gamepadIndex === e.gamepad.index) {
        this.gamepadIndex = null;
        console.log('Gamepad disconnected');
      }
    });
  }

  // Multi-Touch setup with strict Touch.identifier isolation
  public setupTouchControls(
    joystickZone: HTMLElement,
    fireBtn: HTMLElement,
    brakeBtn: HTMLElement
  ): void {
    this.touchActive = true;
    this.joystickThumb = joystickZone.querySelector('#joystick-thumb') as HTMLElement;

    // Joystick touch start
    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.joystickTouchId !== null) return; // already tracking a finger

      const touch = e.changedTouches[0];
      this.joystickTouchId = touch.identifier;
      this.isJoystickActive = true;

      const rect = joystickZone.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      this.joystickStart = { x: centerX, y: centerY };
      this.updateJoystickPosition(touch.clientX, touch.clientY);
    }, { passive: false });

    // Global touchmove with identifier check
    window.addEventListener('touchmove', (e) => {
      if (!this.isJoystickActive || this.joystickTouchId === null) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.joystickTouchId) {
          this.updateJoystickPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: false });

    // Touch end/cancel with identifier check
    const releaseJoystick = (e: TouchEvent) => {
      if (this.joystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === this.joystickTouchId) {
          this.isJoystickActive = false;
          this.joystickTouchId = null;
          this.joystickDelta = { x: 0, y: 0 };
          if (this.joystickThumb) {
            this.joystickThumb.style.transform = 'translate(0px, 0px)';
          }
          break;
        }
      }
    };

    window.addEventListener('touchend', releaseJoystick);
    window.addEventListener('touchcancel', releaseJoystick);

    // Fire button (isolated touch handling)
    let fireTouchId: number | null = null;
    fireBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      fireTouchId = e.changedTouches[0].identifier;
      this.touchFiring = true;
      fireBtn.classList.add('active');
    }, { passive: false });

    const endFire = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === fireTouchId) {
          fireTouchId = null;
          this.touchFiring = false;
          fireBtn.classList.remove('active');
          break;
        }
      }
    };
    window.addEventListener('touchend', endFire);
    window.addEventListener('touchcancel', endFire);

    // Brake button (isolated touch handling)
    let brakeTouchId: number | null = null;
    brakeBtn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      brakeTouchId = e.changedTouches[0].identifier;
      this.touchBraking = true;
      brakeBtn.classList.add('active');
    }, { passive: false });

    const endBrake = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === brakeTouchId) {
          brakeTouchId = null;
          this.touchBraking = false;
          brakeBtn.classList.remove('active');
          break;
        }
      }
    };
    window.addEventListener('touchend', endBrake);
    window.addEventListener('touchcancel', endBrake);
  }

  private updateJoystickPosition(clientX: number, clientY: number): void {
    const dx = clientX - this.joystickStart.x;
    const dy = clientY - this.joystickStart.y;
    const maxRadius = 50;
    const dist = Math.hypot(dx, dy);

    let normX = dx;
    let normY = dy;

    if (dist > maxRadius) {
      normX = (dx / dist) * maxRadius;
      normY = (dy / dist) * maxRadius;
    }

    this.joystickDelta = {
      x: normX / maxRadius,
      y: normY / maxRadius,
    };

    if (this.joystickThumb) {
      this.joystickThumb.style.transform = `translate(${normX}px, ${normY}px)`;
    }
  }

  public clearJustPressed(): void {
    this.justPressedKeys.clear();
    this.pauseTriggered = false;
  }

  private isBindingDown(codes: string[]): boolean {
    return codes.some((code) => !!this.keys.get(code));
  }

  private isBindingJustPressed(codes: string[]): boolean {
    return codes.some((code) => this.justPressedKeys.has(code));
  }

  private pollGamepad(): Gamepad | null {
    if (this.gamepadIndex === null) return null;
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    return gamepads[this.gamepadIndex] || null;
  }

  // --- Dynamic Input Calculations ---
  public get thrust(): number {
    let val = 0;
    if (this.isBindingDown(this.bindings.thrust)) val = 1.0;

    // Joystick Y (upwards drag is negative Y)
    if (this.isJoystickActive && this.joystickDelta.y < -0.15) {
      val = Math.max(val, Math.min(1.0, -this.joystickDelta.y));
    }

    const gp = this.pollGamepad();
    if (gp) {
      if (gp.axes[1] < -0.2) val = Math.max(val, -gp.axes[1]);
      if (gp.buttons[7] && gp.buttons[7].value > 0.1) val = Math.max(val, gp.buttons[7].value);
      if (gp.buttons[0] && gp.buttons[0].pressed) val = Math.max(val, 1.0);
    }

    return val;
  }

  public get steer(): number {
    let dir = 0;
    if (this.isBindingDown(this.bindings.rotateLeft)) dir -= 1;
    if (this.isBindingDown(this.bindings.rotateRight)) dir += 1;

    if (this.isJoystickActive && Math.abs(this.joystickDelta.x) > 0.12) {
      dir += this.joystickDelta.x;
    }

    const gp = this.pollGamepad();
    if (gp && Math.abs(gp.axes[0]) > 0.2) {
      dir += gp.axes[0];
    }

    return Math.max(-1, Math.min(1, dir));
  }

  public get brake(): boolean {
    if (this.isBindingDown(this.bindings.brake)) return true;
    if (this.touchBraking) return true;

    const gp = this.pollGamepad();
    if (gp) {
      if (gp.buttons[1] && gp.buttons[1].pressed) return true;
      if (gp.buttons[6] && gp.buttons[6].value > 0.2) return true;
    }

    return false;
  }

  public get fire(): boolean {
    if (this.isBindingDown(this.bindings.fire)) return true;
    if (this.touchFiring) return true;

    const gp = this.pollGamepad();
    if (gp) {
      if (gp.buttons[2] && gp.buttons[2].pressed) return true;
      if (gp.buttons[5] && gp.buttons[5].pressed) return true;
    }

    return false;
  }

  public get pauseJustPressed(): boolean {
    if (this.pauseTriggered) return true;
    if (this.isBindingJustPressed(this.bindings.pause)) return true;

    const gp = this.pollGamepad();
    if (gp && gp.buttons[9] && gp.buttons[9].pressed) return true;

    return false;
  }

  public get debugJustPressed(): boolean {
    return this.isBindingJustPressed(this.bindings.debug);
  }

  public getBindings(): KeyBindings {
    return { ...this.bindings };
  }

  public setBinding(action: keyof KeyBindings, codes: string[]): void {
    this.bindings[action] = codes;
    try {
      localStorage.setItem('orbital_bindings', JSON.stringify(this.bindings));
    } catch {
      // storage unavailable
    }
  }

  private loadCustomBindings(): void {
    try {
      const saved = localStorage.getItem('orbital_bindings');
      if (saved) {
        this.bindings = { ...this.bindings, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
  }
}
