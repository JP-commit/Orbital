import { Entity } from '../Entity';
import { Player } from '../Player';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { FloatingTextSystem } from '../../ui/FloatingText';
import { Pickup, PickupType } from '../Pickup';

export class DerelictShip extends Entity {
  public isSalvaged: boolean = false;
  public beaconPulse: number = 0;
  public salvageRange: number = 95;

  constructor(x: number, y: number) {
    super(x, y, 42, 'derelict');
    this.rotation = Math.random() * Math.PI * 2;
  }

  public update(dt: number): void {
    if (this.dead) return;
    this.beaconPulse += dt * 3.5;
    this.rotation += 0.05 * dt;
  }

  public checkSalvage(
    player: Player,
    newPickupsOut: Pickup[],
    particles: ParticleSystem,
    floatingTexts: FloatingTextSystem
  ): boolean {
    if (this.dead || this.isSalvaged) return false;

    const dist = Math.hypot(player.x - this.x, player.y - this.y);
    if (dist < this.salvageRange) {
      this.isSalvaged = true;
      floatingTexts.spawn(this.x, this.y - 30, 'DERELICT RECOVERED: SALVAGE SECURED!', '#ffe600', 15);
      particles.emitRing(this.x, this.y, '#ffe600', 20, 120);
      particles.emitBurst(this.x, this.y, 35, '#00e5ff', 1.8);

      // Eject salvage cache
      const rewards: PickupType[] = ['FUEL', 'SHIELD', 'HULL', 'WEAPON_LASER', 'WEAPON_MISSILE'];
      for (let i = 0; i < rewards.length; i++) {
        const a = (i * Math.PI * 2) / rewards.length;
        const px = this.x + Math.cos(a) * 45;
        const py = this.y + Math.sin(a) * 45;
        newPickupsOut.push(new Pickup(px, py, rewards[i]));
      }
      return true;
    }
    return false;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Drifting ruined freighter hull
    ctx.strokeStyle = this.isSalvaged ? 'rgba(100, 150, 180, 0.4)' : '#ffe600';
    ctx.fillStyle = 'rgba(20, 30, 45, 0.75)';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = this.isSalvaged ? 'transparent' : '#ffe600';
    ctx.shadowBlur = this.isSalvaged ? 0 : 10;

    // Split hull silhouette
    ctx.beginPath();
    ctx.moveTo(35, -12);
    ctx.lineTo(25, -28);
    ctx.lineTo(-30, -32);
    ctx.lineTo(-42, -15);
    ctx.lineTo(-25, 0); // Fracture break
    ctx.lineTo(-42, 15);
    ctx.lineTo(-30, 32);
    ctx.lineTo(25, 28);
    ctx.lineTo(35, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Emergency beacon strobe
    if (!this.isSalvaged) {
      const strobe = 0.5 + 0.5 * Math.sin(this.beaconPulse);
      ctx.fillStyle = `rgba(255, 230, 0, ${strobe})`;
      ctx.beginPath();
      ctx.arc(10, 0, 6, 0, Math.PI * 2);
      ctx.fill();

      // Salvage perimeter dotted ring
      ctx.strokeStyle = 'rgba(255, 230, 0, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(0, 0, this.salvageRange, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
