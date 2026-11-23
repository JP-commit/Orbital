import { Entity } from './Entity';

export type ProjectileType = 'BLASTER' | 'SPREAD' | 'RAPID' | 'LASER' | 'MISSILE' | 'ENEMY';

export class Projectile extends Entity {
  public type: ProjectileType = 'BLASTER';
  public damage: number = 25;
  public life: number = 1.5;
  public maxLife: number = 1.5;
  public color: string = '#00ffff';
  public isEnemy: boolean = false;
  public homingTarget: Entity | null = null;
  public turnRate: number = 4.5;
  public speed: number = 800;

  constructor() {
    super(0, 0, 4, 'projectile');
    this.dead = true; // start dormant in pool
  }

  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    type: ProjectileType,
    damage: number,
    lifetime: number,
    color: string,
    radius: number = 4,
    isEnemy: boolean = false,
    homingTarget: Entity | null = null
  ): void {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.type = type;
    this.damage = damage;
    this.life = lifetime;
    this.maxLife = lifetime;
    this.color = color;
    this.radius = radius;
    this.isEnemy = isEnemy;
    this.homingTarget = homingTarget;
    this.speed = Math.hypot(vx, vy);
    this.rotation = Math.atan2(vy, vx);
    this.dead = false;
    this.tag = isEnemy ? 'enemy_bullet' : 'player_bullet';
  }

  public update(dt: number): void {
    if (this.dead) return;

    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    // Homing missile steering
    if (this.type === 'MISSILE' && this.homingTarget && !this.homingTarget.dead) {
      const targetAngle = Math.atan2(this.homingTarget.y - this.y, this.homingTarget.x - this.x);
      let angleDiff = targetAngle - this.rotation;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      this.rotation += Math.sign(angleDiff) * Math.min(Math.abs(angleDiff), this.turnRate * dt);
      this.speed = Math.min(850, this.speed + 400 * dt);
      this.vx = Math.cos(this.rotation) * this.speed;
      this.vy = Math.sin(this.rotation) * this.speed;
    } else {
      this.rotation = Math.atan2(this.vy, this.vx);
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.shadowColor = this.color;
    ctx.shadowBlur = 8;
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#ffffff';

    if (this.type === 'MISSILE') {
      // Missile body
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Sleek glowing laser capsule
      ctx.lineWidth = 1.5;
      const len = this.type === 'RAPID' ? 10 : 14;
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.strokeStyle = this.color;
      ctx.stroke();

      // White core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-len / 3, 0);
      ctx.lineTo(len / 3, 0);
      ctx.stroke();
    }

    ctx.restore();
  }
}
