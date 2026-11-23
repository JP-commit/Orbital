import { Entity } from '../Entity';
import { Player } from '../Player';
import { WeaponSystem } from '../../systems/WeaponSystem';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { PRNG } from '../../core/PRNG';

export abstract class Enemy extends Entity {
  public hp: number;
  public maxHp: number;
  public scoreValue: number;
  public color: string;
  public hitFlashTimer: number = 0;

  constructor(x: number, y: number, radius: number, hp: number, scoreValue: number, color: string) {
    super(x, y, radius, 'enemy');
    this.hp = hp;
    this.maxHp = hp;
    this.scoreValue = scoreValue;
    this.color = color;
  }

  public takeDamage(damage: number): boolean {
    this.hp -= damage;
    this.hitFlashTimer = 0.12;
    if (this.hp <= 0) {
      this.dead = true;
      return true; // Destroyed
    }
    return false;
  }

  public abstract updateAI(
    dt: number,
    player: Player,
    weaponSystem: WeaponSystem,
    particles: ParticleSystem,
    prng: PRNG,
    spawnMineCallback?: (x: number, y: number) => void
  ): void;
}
