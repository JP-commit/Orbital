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
    pickups: { x: number; y: number; color: string }[] = []
  ): void {
    ctx.save();

    // 1. Top-Left Status Panel: Hull, Shield, Fuel Bars
    const panelX = 20;
    const panelY = 20;
    const barWidth = 180;
    const barHeight = 12;

    ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX - 10, panelY - 10, barWidth + 80, 115, 6);
    ctx.fill();
    ctx.stroke();

    // Hull Bar
    this.drawBar(
      ctx,
      panelX + 60,
      panelY + 5,
      barWidth,
      barHeight,
      player.hull,
      player.maxHull,
      '#ff3366',
      'HULL'
    );

    // Shield Bar
    this.drawBar(
      ctx,
      panelX + 60,
      panelY + 30,
      barWidth,
      barHeight,
      player.shield,
      player.maxShield,
      '#00e5ff',
      'SHIELD'
    );

    // Fuel Bar
    const fuelColor = player.fuel < 25 ? '#ff3333' : '#ffb300';
    this.drawBar(
      ctx,
      panelX + 60,
      panelY + 55,
      barWidth,
      barHeight,
      player.fuel,
      player.maxFuel,
      fuelColor,
      'FUEL'
    );

    // Low Fuel Warning Banner
    if (player.fuel < 25 && !player.dead) {
      const blink = Math.floor(Date.now() / 250) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#ff3333';
        ctx.font = 'bold 12px "Courier New", monospace';
        ctx.fillText(player.fuel <= 0 ? '⚠ EMERGENCY SOLAR CRAWL' : '⚠ LOW FUEL WARNING', panelX, panelY + 95);
      }
    }

    // 2. Weapon Card (Bottom-Left)
    this.drawWeaponCard(ctx, 20, height - 80, weapon);

    // 3. Top-Center Wave & Score Banner
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.fillText(`SCORE: ${score.toLocaleString()}`, width / 2, 35);

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#00f0ff';
    ctx.shadowBlur = 4;
    ctx.fillText(`SECTOR WAVE ${wave}`, width / 2, 58);

    // 4. Top-Right Telemetry & Seed
    ctx.textAlign = 'right';
    ctx.font = '12px "Courier New", monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.shadowBlur = 0;
    ctx.fillText(`FPS: ${Math.round(fps)}`, width - 20, 30);
    ctx.fillText(`SEED: ${seed}`, width - 20, 48);
    const speed = Math.round(Math.hypot(player.vx, player.vy));
    ctx.fillText(`VELOCITY: ${speed} KM/S`, width - 20, 66);
    ctx.fillText(`POS: ${Math.round(player.x)}, ${Math.round(player.y)}`, width - 20, 84);

    // 5. Tactical Radar / Minimap (Bottom-Right)
    this.drawRadar(ctx, width - 140, height - 140, 120, player, threats, pickups);

    ctx.restore();
  }

  private drawWeaponCard(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    weapon: WeaponState
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
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
    const col = wpnColors[weapon.type] || '#ffffff';

    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 6;
    ctx.textAlign = 'left';
    ctx.fillText(`WEAPON: ${weapon.type}`, x + 12, y + 22);

    ctx.shadowBlur = 0;
    ctx.font = '11px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';

    if (weapon.type === 'BLASTER') {
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
    label: string
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
    ctx.fillText(`${Math.round(val)}/${maxVal}`, x + w / 2, y + h - 3);

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
    ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
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

    // Draw Pickups
    for (let i = 0; i < pickups.length; i++) {
      const px = x + pickups[i].x * scaleX;
      const py = y + pickups[i].y * scaleY;
      ctx.fillStyle = pickups[i].color;
      ctx.beginPath();
      ctx.arc(px, py, 2.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player blip
    const px = x + player.x * scaleX;
    const py = y + player.y * scaleY;

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
    ctx.lineTo(px + Math.cos(player.rotation) * 8, py + Math.sin(player.rotation) * 8);
    ctx.stroke();

    ctx.font = '9px "Courier New", monospace';
    ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('SECTOR RADAR', x + 4, y - 4);

    ctx.restore();
  }
}
