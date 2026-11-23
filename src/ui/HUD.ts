import { Player } from '../entities/Player';
import { CONFIG } from '../config';
import { WeaponState } from '../systems/WeaponSystem';

export interface RadarThreat {
  x: number;
  y: number;
  type: 'asteroid' | 'enemy' | 'mine';
}

export class HUD {
  public render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    player: Player,
    weapon: WeaponState,
    score: number,
    wave: number,
    fps: number,
    seed: number,
    threats: RadarThreat[] = [],
    pickups: { x: number; y: number; color: string }[] = [],
    isMobileMode: boolean = false,
    isGodMode: boolean = false
  ): void {
    ctx.save();

    // 1. Top-Left Status Panel: Hull, Shield, Fuel Bars
    const panelX = 20;
    const panelY = isMobileMode ? 64 : 20; // Lower on mobile to clear fullscreen button (top: 15..50)
    const barWidth = isMobileMode ? 140 : 180;
    const barHeight = 12;

    ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
    ctx.strokeStyle = isGodMode ? '#ffd700' : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = isGodMode ? 1.5 : 1;
    ctx.shadowColor = isGodMode ? '#ffd700' : 'transparent';
    ctx.shadowBlur = isGodMode ? 8 : 0;
    ctx.beginPath();
    ctx.roundRect(panelX - 10, panelY - 10, barWidth + 80, 115, 6);
    ctx.fill();
    ctx.stroke();

    // God Mode Badge on Status Panel
    if (isGodMode) {
      ctx.font = 'bold 10px "Courier New", monospace';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'left';
      ctx.fillText('⚡ GOD MODE ACTIVE', panelX, panelY - 14);
    }

    // Hull Bar
    this.drawBar(
      ctx,
      panelX + 60,
      panelY + 5,
      barWidth,
      barHeight,
      isGodMode ? player.maxHull : player.hull,
      player.maxHull,
      '#ff3366',
      'HULL',
      isGodMode
    );

    // Shield Bar
    this.drawBar(
      ctx,
      panelX + 60,
      panelY + 30,
      barWidth,
      barHeight,
      isGodMode ? player.maxShield : player.shield,
      player.maxShield,
      '#00e5ff',
      'SHIELD',
      isGodMode
    );

    // Fuel Bar
    const fuelColor = isGodMode ? '#ffd700' : player.fuel < 25 ? '#ff3333' : '#ffb300';
    this.drawBar(
      ctx,
      panelX + 60,
      panelY + 55,
      barWidth,
      barHeight,
      isGodMode ? player.maxFuel : player.fuel,
      player.maxFuel,
      fuelColor,
      'FUEL',
      isGodMode
    );

    // Low Fuel Warning Banner (Suppressed in God Mode)
    if (!isGodMode && player.fuel < 25 && !player.dead) {
      const blink = Math.floor(Date.now() / 250) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillText(player.fuel <= 0 ? '⚠ EMERGENCY SOLAR CRAWL' : '⚠ LOW FUEL WARNING', panelX, panelY + 95);
      }
    }

    // 2. Weapon Card (Top-Left under status on mobile; Bottom-Left on desktop)
    const weaponY = isMobileMode ? panelY + 120 : height - 80;
    this.drawWeaponCard(ctx, 20, weaponY, weapon, isGodMode);

    // 3. Top-Center Wave & Score Banner
    ctx.textAlign = 'center';
    ctx.font = isMobileMode ? 'bold 18px "Courier New", monospace' : 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText(`SCORE: ${score.toLocaleString()}`, width / 2, isMobileMode ? 28 : 35);

    ctx.font = isMobileMode ? '12px "Courier New", monospace' : '14px "Courier New", monospace';
    ctx.fillStyle = isGodMode ? '#ffd700' : '#00f0ff';
    ctx.shadowBlur = 4;
    const sectorText = isGodMode ? `SECTOR WAVE ${wave} (UNLIMITED SWARM)` : `SECTOR WAVE ${wave}`;
    ctx.fillText(sectorText, width / 2, isMobileMode ? 46 : 58);

    const speed = Math.round(Math.hypot(player.vx, player.vy));

    // 4. Tactical Radar / Minimap Positioning
    // In mobile mode: TOP RIGHT below the pause button!
    // In desktop mode: BOTTOM RIGHT!
    let radarX = 0;
    let radarY = 0;
    let radarSize = 0;

    if (isMobileMode) {
      radarSize = 110;
      radarX = width - radarSize - 16;
      radarY = 56; // Directly below mobile top-right pause & settings buttons (which sit at y: 15..50)
      this.drawRadar(ctx, radarX, radarY, radarSize, player, threats, pickups);

      // Mobile Telemetry cleanly tucked under the radar
      const teleY = radarY + radarSize + 14;
      ctx.textAlign = 'right';
      ctx.font = '10px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.shadowBlur = 0;
      ctx.fillText(`FPS: ${Math.round(fps)} | SEED: ${seed}`, width - 16, teleY);
      ctx.fillText(`${speed} KM/S | (${Math.round(player.x)}, ${Math.round(player.y)})`, width - 16, teleY + 13);
    } else {
      // Desktop: Minimap at bottom right
      radarSize = 120;
      radarX = width - 140;
      radarY = height - 140;
      this.drawRadar(ctx, radarX, radarY, radarSize, player, threats, pickups);

      // Desktop Telemetry at top right
      ctx.textAlign = 'right';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.shadowBlur = 0;
      ctx.fillText(`FPS: ${Math.round(fps)}`, width - 20, 30);
      ctx.fillText(`SEED: ${seed}`, width - 20, 48);
      ctx.fillText(`VELOCITY: ${speed} KM/S`, width - 20, 66);
      ctx.fillText(`POS: ${Math.round(player.x)}, ${Math.round(player.y)}`, width - 20, 84);
    }

    ctx.restore();
  }

  private drawWeaponCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    weapon: WeaponState,
    isGodMode: boolean = false
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
    ctx.strokeStyle = isGodMode ? '#ffd700' : 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, 190, 60, 6);
    ctx.fill();
    ctx.stroke();

    const wpnColors: Record<string, string> = {
      BLASTER: '#00ffff',
      SPREAD: '#ff007f',
      RAPID: '#ffe600',
      LASER: '#00ffaa',
      MISSILE: '#ff5500',
    };
    const col = isGodMode ? '#ffd700' : wpnColors[weapon.type] || '#ffffff';

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.textAlign = 'left';
    ctx.fillText(`WEAPON: ${weapon.type}`, x + 12, y + 22);

    ctx.shadowBlur = 0;
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';

    if (isGodMode) {
      ctx.fillStyle = '#ffd700';
      ctx.fillText('AMMO: ∞ (UNLIMITED)', x + 12, y + 42);
    } else if (weapon.type === 'BLASTER') {
      ctx.fillText('AMMO: ∞ (STANDARD)', x + 12, y + 42);
    } else if (weapon.type === 'LASER') {
      const remainingSec = Math.max(0, weapon.duration).toFixed(1);
      ctx.fillText(`DURATION: ${remainingSec}s`, x + 12, y + 42);

      const ratio = weapon.duration / (weapon.maxDuration || 1);
      ctx.fillStyle = 'rgba(0, 255, 170, 0.3)';
      ctx.fillRect(x + 12, y + 47, 166, 4);
      ctx.fillStyle = '#00ffaa';
      ctx.fillRect(x + 12, y + 47, 166 * ratio, 4);
    } else {
      ctx.fillText(`AMMO: ${weapon.ammo} ROUNDS`, x + 12, y + 42);
    }

    ctx.restore();
  }

  private drawBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    val: number,
    maxVal: number,
    color: string,
    label: string,
    isGodMode: boolean = false
  ): void {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = color;
    ctx.fillText(label, x - 10, y + h - 2);

    ctx.fillStyle = 'rgba(20, 30, 45, 0.9)';
    ctx.fillRect(x, y, w, h);

    const ratio = Math.max(0, Math.min(1, val / maxVal));
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fillRect(x, y, w * ratio, h);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, w, h);

    ctx.textAlign = 'center';
    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 0;
    const valueText = isGodMode ? '∞' : `${Math.round(val)}/${maxVal}`;
    ctx.fillText(valueText, x + w / 2, y + h - 3);

    ctx.restore();
  }

  private drawRadar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    player: Player,
    threats: RadarThreat[] = [],
    pickups: { x: number; y: number; color: string }[] = []
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 15, 25, 0.88)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, size, size);
    ctx.fillRect(x, y, size, size);

    ctx.strokeStyle = 'rgba(0, 240, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(x + size / 2, y);
    ctx.lineTo(x + size / 2, y + size);
    ctx.moveTo(x, y + size / 2);
    ctx.lineTo(x + size, y + size / 2);
    ctx.stroke();

    const scaleX = size / CONFIG.WORLD_WIDTH;
    const scaleY = size / CONFIG.WORLD_HEIGHT;

    // Draw Threats (Asteroids, Enemies, Mines)
    for (let i = 0; i < threats.length; i++) {
      const t = threats[i];
      const tx = x + t.x * scaleX;
      const ty = y + t.y * scaleY;
      if (tx >= x && tx <= x + size && ty >= y && ty <= y + size) {
        if (t.type === 'enemy') {
          ctx.fillStyle = '#ff0033';
          ctx.fillRect(tx - 1.5, ty - 1.5, 3, 3);
        } else if (t.type === 'mine') {
          ctx.fillStyle = '#ff8800';
          ctx.fillRect(tx - 1, ty - 1, 2, 2);
        } else {
          ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
          ctx.fillRect(tx - 1, ty - 1, 2, 2);
        }
      }
    }

    // Draw Pickups
    for (let i = 0; i < pickups.length; i++) {
      const px = x + pickups[i].x * scaleX;
      const py = y + pickups[i].y * scaleY;
      if (px >= x && px <= x + size && py >= y && py <= y + size) {
        ctx.fillStyle = pickups[i].color;
        ctx.beginPath();
        ctx.arc(px, py, 2.0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Player blip (clamped inside radar if player flies outside world bounds)
    const rawPx = x + player.x * scaleX;
    const rawPy = y + player.y * scaleY;
    const px = Math.max(x + 3, Math.min(x + size - 3, rawPx));
    const py = Math.max(y + 3, Math.min(y + size - 3, rawPy));

    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();

    // Heading indicator
    ctx.strokeStyle = '#00ffff';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(player.rotation) * 7, py + Math.sin(player.rotation) * 7);
    ctx.stroke();

    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
    ctx.textAlign = 'left';
    ctx.fillText('SECTOR RADAR', x + 4, y - 4);

    ctx.restore();
  }
}
