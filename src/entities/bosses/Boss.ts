import { Entity } from '../Entity';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { Camera } from '../../core/Camera';
import { PRNG } from '../../core/PRNG';
import { Enemy } from '../enemies/Enemy';

export abstract class Boss extends Entity {
  public name: string;
  public hp: number;
  public maxHp: number;
  public phase: number = 1;
  public maxPhases: number = 3;
  public scoreValue: number;
  public color: string;
  public hitFlashTimer: number = 0;
  public encounterLevel: number = 1;

  constructor(
    x: number,
    y: number,
    radius: number,
    name: string,
    baseHp: number,
    scoreValue: number,
    color: string,
    encounterLevel: number = 1
  ) {
    super(x, y, radius, 'boss');
    this.name = name;
    this.encounterLevel = encounterLevel;
    // Scale HP with repeated appearances
    const scaledHp = Math.round(baseHp * (1 + (encounterLevel - 1) * 0.45));
    this.hp = scaledHp;
    this.maxHp = scaledHp;
    this.scoreValue = scoreValue * encounterLevel;
    this.color = color;
  }

  public takeDamage(damage: number): boolean {
    this.hp -= damage;
    this.hitFlashTimer = 0.12;
    if (this.hp <= 0) {
      this.dead = true;
      return true; // Boss defeated!
    }
    return false;
  }

  public abstract updateBossAI(
    dt: number,
    player: Player,
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    camera: Camera,
    prng: PRNG,
    spawnEnemyCallback: (enemy: Enemy) => void,
    spawnMineCallback: (x: number, y: number) => void
  ): void;

  public abstract renderTelegraphs(ctx: CanvasRenderingContext2D): void;

  public renderBossHealthBar(ctx: CanvasRenderingContext2D, width: number): void {
    if (this.dead) return;

    ctx.save();
    const barW = Math.min(520, width * 0.65);
    const barH = 14;
    const barX = (width - barW) / 2;
    const barY = 70;

    // Background container
    ctx.fillStyle = 'rgba(10, 15, 28, 0.88)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.roundRect(barX - 10, barY - 22, barW + 20, barH + 34, 6);
    ctx.fill();
    ctx.stroke();

    // Boss Name & Phase
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.fillStyle = this.color;
    ctx.textAlign = 'left';
    ctx.fillText(`${this.name.toUpperCase()} (PHASE ${this.phase}/${this.maxPhases})`, barX, barY - 6);

    // HP percentage
    const pct = Math.max(0, Math.min(100, Math.round((this.hp / this.maxHp) * 100)));
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${this.hp}/${this.maxHp} (${pct}%)`, barX + barW, barY - 6);

    // HP Bar background
    ctx.fillStyle = 'rgba(20, 25, 40, 0.9)';
    ctx.fillRect(barX, barY, barW, barH);

    // Filled HP
    const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));
    ctx.fillStyle = this.color;
    ctx.fillRect(barX, barY, barW * ratio, barH);

    // Subtle sheen highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(barX, barY, barW * ratio, barH * 0.4);

    ctx.restore();
  }
}
