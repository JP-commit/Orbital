import { Entity } from './Entity';
import { WeaponType } from '../systems/WeaponSystem';
import { CONFIG } from '../config';

export type PickupType = 'FUEL' | 'SHIELD' | 'HULL' | 'WEAPON_SPREAD' | 'WEAPON_RAPID' | 'WEAPON_LASER' | 'WEAPON_MISSILE';

export class Pickup extends Entity {
  public pickupType: PickupType;
  public hoverTime: number = 0;
  public life: number = 40.0; // Despawns after 40s if uncollected
  public magnetRadius: number = 160;
  public color: string = '#ffffff';
  public label: string = '';

  constructor(x: number, y: number, pickupType: PickupType) {
    super(x, y, 14, 'pickup');
    this.pickupType = pickupType;
    this.hoverTime = Math.random() * Math.PI * 2;
    this.initVisuals();
  }

  private initVisuals(): void {
    switch (this.pickupType) {
      case 'FUEL':
        this.color = '#ffb300';
        this.label = 'FUEL';
        break;
      case 'SHIELD':
        this.color = '#00f0ff';
        this.label = 'SHIELD';
        break;
      case 'HULL':
        this.color = '#39ff14';
        this.label = 'REPAIR';
        break;
      case 'WEAPON_SPREAD':
        this.color = '#ff007f';
        this.label = 'SPREAD';
        break;
      case 'WEAPON_RAPID':
        this.color = '#ffe600';
        this.label = 'RAPID';
        break;
      case 'WEAPON_LASER':
        this.color = '#00ffaa';
        this.label = 'LASER';
        break;
      case 'WEAPON_MISSILE':
        this.color = '#ff5500';
        this.label = 'MISSILE';
        break;
    }
  }

  public update(dt: number): void {
    if (this.dead) return;

    this.hoverTime += dt * 3.0;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    // Drifting velocity damping
    this.vx *= (1 - 0.8 * dt);
    this.vy *= (1 - 0.8 * dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounds check
    const pad = 20;
    this.x = Math.max(pad, Math.min(CONFIG.WORLD_WIDTH - pad, this.x));
    this.y = Math.max(pad, Math.min(CONFIG.WORLD_HEIGHT - pad, this.y));
  }

  public attractToward(targetX: number, targetY: number, dt: number): void {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.hypot(dx, dy);

    if (dist < this.magnetRadius && dist > 1) {
      const pullSpeed = 380 * (1 - dist / this.magnetRadius) + 120;
      this.vx += (dx / dist) * pullSpeed * dt * 4;
      this.vy += (dy / dist) * pullSpeed * dt * 4;
    }
  }

  public getWeaponType(): WeaponType | null {
    switch (this.pickupType) {
      case 'WEAPON_SPREAD': return 'SPREAD';
      case 'WEAPON_RAPID': return 'RAPID';
      case 'WEAPON_LASER': return 'LASER';
      case 'WEAPON_MISSILE': return 'MISSILE';
      default: return null;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    // Blink when expiring
    if (this.life < 5 && Math.floor(Date.now() / 150) % 2 === 0) {
      return;
    }

    ctx.save();
    const bobOffset = Math.sin(this.hoverTime) * 3;
    ctx.translate(this.x, this.y + bobOffset);

    // Outer glowing halo
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.8;

    if (this.pickupType === 'FUEL') {
      // Hexagonal fuel cell
      ctx.fillStyle = 'rgba(255, 179, 0, 0.2)';
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const px = Math.cos(a) * 11;
        const py = Math.sin(a) * 11;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Fuel droplet icon
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI);
      ctx.lineTo(0, -5);
      ctx.closePath();
      ctx.fill();
    } else if (this.pickupType === 'SHIELD') {
      // Diamond shield generator
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Shield crest
      ctx.fillStyle = '#00f0ff';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.pickupType === 'HULL') {
      // Medical cross repair capsule
      ctx.fillStyle = 'rgba(57, 255, 20, 0.2)';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cross
      ctx.fillStyle = '#39ff14';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.fillRect(-2, -6, 4, 12);
    } else {
      // Weapon crate box
      ctx.fillStyle = 'rgba(255, 0, 128, 0.2)';
      ctx.strokeRect(-10, -10, 20, 20);
      ctx.fillRect(-10, -10, 20, 20);

      // Weapon initial badge
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const badge = this.label[0] || 'W';
      ctx.fillText(badge, 0, 1);
    }

    ctx.restore();
  }
}
