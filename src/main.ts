import { Game, GameState } from './core/Game';
import { InputManager } from './core/InputManager';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element #game-canvas not found');
  }

  const game = new Game(canvas);

  // Mobile Touch Elements
  const mobileControls = document.getElementById('mobile-controls');
  const joystickArea = document.getElementById('joystick-area');
  const fireBtn = document.getElementById('touch-fire');
  const brakeBtn = document.getElementById('touch-brake');
  const fsBtn = document.getElementById('btn-fullscreen');
  const fsIcon = document.getElementById('fs-icon');
  const fsLabel = document.getElementById('fs-label');
  const mobileSettingsBtn = document.getElementById('btn-mobile-settings');
  const mobilePauseBtn = document.getElementById('btn-mobile-pause');
  const mobileOverlayActions = document.getElementById('mobile-overlay-actions');
  const actionPrimary = document.getElementById('btn-action-primary');
  const actionSecondary = document.getElementById('btn-action-secondary');

  // Auto-detect and show touch controls on mobile or touch-capable devices
  const isTouchDevice = InputManager.isTouchDevice();
  if (mobileControls) {
    if (isTouchDevice) {
      mobileControls.style.display = 'flex';
    }
    // Also show if touch is first used anywhere on screen
    window.addEventListener('touchstart', () => {
      mobileControls.style.display = 'flex';
    }, { once: true });
  }

  // Hook touch inputs
  if (joystickArea && fireBtn && brakeBtn) {
    game.input.setupTouchControls(joystickArea, fireBtn, brakeBtn);
  }

  // Fullscreen button handling (supports all vendor prefixes and iOS/Android)
  const isCurrentlyFullscreen = (): boolean => {
    const doc = document as unknown as {
      fullscreenElement?: Element;
      webkitFullscreenElement?: Element;
      mozFullScreenElement?: Element;
      msFullscreenElement?: Element;
    };
    return !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
  };

  const updateFullscreenUI = () => {
    const isFs = isCurrentlyFullscreen();
    if (fsIcon) fsIcon.textContent = isFs ? '✕' : '⛶';
    if (fsLabel) fsLabel.textContent = isFs ? 'EXIT' : 'FULLSCREEN';
    setTimeout(() => game.resizeCanvas(), 100);
  };

  if (fsBtn) {
    fsBtn.addEventListener('click', () => {
      game.audio.init();

      const doc = document as unknown as {
        exitFullscreen?: () => Promise<void>;
        webkitExitFullscreen?: () => void;
      };
      const docEl = document.documentElement as unknown as {
        requestFullscreen?: () => Promise<void>;
        webkitRequestFullscreen?: () => void;
      };

      if (!isCurrentlyFullscreen()) {
        if (docEl.requestFullscreen) {
          docEl.requestFullscreen().catch(() => {});
        } else if (docEl.webkitRequestFullscreen) {
          docEl.webkitRequestFullscreen();
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        }
      }
      updateFullscreenUI();
    });

    document.addEventListener('fullscreenchange', updateFullscreenUI);
    document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
  }

  // Mobile Top Bar buttons: Settings & Pause
  if (mobileSettingsBtn) {
    mobileSettingsBtn.addEventListener('click', () => {
      game.audio.init();
      game.settingsMenu.toggle();
    });
  }

  if (mobilePauseBtn) {
    mobilePauseBtn.addEventListener('click', () => {
      game.audio.init();
      game.input.pauseTriggered = true;
    });
  }

  // Mobile Overlay Action Buttons (Resume, Replay, New Run)
  if (actionPrimary) {
    actionPrimary.addEventListener('click', () => {
      game.audio.init();
      if (game.state === GameState.PAUSED) {
        game.state = GameState.PLAYING;
      } else if (game.state === GameState.GAME_OVER) {
        game.restart(false); // New run
      }
    });
  }

  if (actionSecondary) {
    actionSecondary.addEventListener('click', () => {
      game.audio.init();
      if (game.state === GameState.PAUSED) {
        game.settingsMenu.toggle();
      } else if (game.state === GameState.GAME_OVER) {
        game.restart(true); // Same seed
      }
    });
  }

  // Sync mobile modal actions based on game state
  setInterval(() => {
    if (!mobileOverlayActions || !actionPrimary || !actionSecondary) return;

    if (game.state === GameState.GAME_OVER) {
      mobileOverlayActions.style.display = 'flex';
      actionPrimary.textContent = '🚀 NEW MISSION';
      actionSecondary.style.display = 'block';
      actionSecondary.textContent = '🔁 REPLAY SEED';
    } else if (game.state === GameState.PAUSED) {
      mobileOverlayActions.style.display = 'flex';
      actionPrimary.textContent = '▶ RESUME MISSION';
      actionSecondary.style.display = 'block';
      actionSecondary.textContent = '⚙ MISSION SETTINGS';
    } else {
      mobileOverlayActions.style.display = 'none';
    }
  }, 100);

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyO') {
      game.settingsMenu.toggle();
    }
    if (game.state === GameState.GAME_OVER) {
      if (e.code === 'KeyR') {
        game.restart(true); // Same seed replay
      } else if (e.code === 'Space') {
        game.restart(false); // New random seed
      }
    }
  });

  // Canvas click listener for settings button (gear)
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const btnX = canvas.width - 42;
    const btnY = canvas.height - 170;
    const dist = Math.hypot(clickX - btnX, clickY - btnY);
    if (dist < 25) {
      game.settingsMenu.toggle();
    }
  });

  // Start game loop
  game.start();

  // Expose to window for debugging & testing
  (window as unknown as { orbitalGame: Game }).orbitalGame = game;
  console.log('Orbital – Space Survival initialized! Seed:', game.seed);
});
