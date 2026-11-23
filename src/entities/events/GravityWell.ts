import { Entity } from '../Entity';
import { Player } from '../Player';
import { Asteroid } from '../Asteroid';
import { Enemy } from '../enemies/Enemy';
import { ParticleSystem } from '../../systems/ParticleSystem';
import { Camera } from '../../core/Camera';

export class GravityWell extends Entity {
  public pullRadius: number = 750;
  public gravityConstant: number = 38000;
  public swirlAngle: number = 0;
  public duration: number = 45.0; // Despawns after 45s

  constructor(x: number, y: number) {
    super(x, y, 32, 'gravity_well');
  }

  public update(dt: number): void {
    if (this.dead) return;

    this.swirlAngle += dt * 3.5;
    this.duration -= dt;
    if (this.duration <= 0) {
      this.dead = true;
    }
  }

  public applyGravity(
    player: Player,
    asteroids: Asteroid[],
    enemies: Enemy[],
    particles: ParticleSystem,
    camera: Camera,
    dt: number
  ): void {
    if (this.dead) return;

    // Pull Player
    if (!player.dead) {
      const dx = this.x - player.x;
      const dy = this.y - player.y;
      const dist = Math.hypot(dx, dy);

      if (dist < this.pullRadius && dist > 1) {
        const pull = (this.gravityConstant / (dist * dist + 1000)) * 60;
        player.vx += (dx / dist) * pull * dt;
        player.vy += (dy / dist) * pull * dt;

        // Extreme hazard in singularity center
        if (dist < this.radius + player.radius) {
          player.takeDamage(40 * dt, particles);
          camera.addTrauma(0.15);
        }
      }
    }

    // Pull Asteroids
    for (let i = 0; i < asteroids.length; i++) {
      const ast = asteroids[i];
      if (ast.dead) continue;
      const dx = this.x - ast.x;
      const dy = this.y - ast.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.pullRadius && dist > 1) {
        const pull = (this.gravityConstant / (dist * dist + 1000)) * 50;
        ast.vx += (dx / dist) * pull * dt;
        ast.vy += (dy / dist) * pull * dt;
      }
    }

    // Pull Enemies
    for (let i = 0; i < enemies.length; i++) {
      const en = enemies[i];
      if (en.dead) continue;
      const dx = this.x - en.x;
      const dy = this.y - en.y;
      const dist = Math.hypot(dx, dy);
      if (dist < this.pullRadius && dist > 1) {
        const pull = (this.gravityConstant / (dist * dist + 1000)) * 40;
        en.vx += (dx / dist) * pull * dt;
        en.vy += (dy / dist) * pull * dt;
      }
    }

    // Accretion disk particles
    if (Math.random() < 0.3) {
      const a = Math.random() * Math.PI * 2;
      const r = 50 + Math.random() * 120;
      particles.emitBurst(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 1, '#9d00ff', 0.4);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.dead) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Accretion disk glow
    const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, 120);
    grad.addColorStop(0, 'rgba(157, 0, 255, 0.6)');
    grad.addColorStop(0.4, 'rgba(0, 229, 255, 0.3)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    // Swirling event horizon spiral arms
    ctx.rotate(this.swirlAngle);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.6;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 12;

    const arms = 3;
    for (let i = 0; i < arms; i++) {
      const armAngle = (i * Math.PI * 2) / arms;
      ctx.beginPath();
      for (let r = 15; r < 90; r += 5) {
        const theta = armAngle + (r / 25);
        const px = Math.cos(theta) * r;
        const py = Math.sin(theta) * r;
        if (r === 15) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Black Hole Event Horizon (Pure Black Void Center)
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.0;
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}
