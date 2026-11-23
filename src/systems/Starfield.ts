import { PRNG } from '../core/PRNG';
import { CONFIG } from '../config';
import { Camera } from '../core/Camera';

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  layer: number; // 0: far, 1: mid, 2: near
  color: string;
}

interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
}

export class Starfield {
  private stars: Star[] = [];
  private nebulae: Nebula[] = [];

  constructor(prng: PRNG) {
    this.generate(prng);
  }

  public generate(prng: PRNG): void {
    this.stars = [];
    this.nebulae = [];

    // Nebulae clusters
    const nebulaColors = [
      'rgba(80, 20, 140, 0.12)',
      'rgba(20, 80, 160, 0.12)',
      'rgba(140, 30, 80, 0.10)',
      'rgba(20, 140, 120, 0.10)',
    ];

    for (let i = 0; i < 18; i++) {
      this.nebulae.push({
        x: prng.range(100, CONFIG.WORLD_WIDTH - 100),
        y: prng.range(100, CONFIG.WORLD_HEIGHT - 100),
        radius: prng.range(300, 750),
        color: prng.choice(nebulaColors),
      });
    }

    // Parallax stars
    const starColors = ['#ffffff', '#aeefff', '#ffd8a8', '#ffb3ba'];
    const starCount = 1400;

    for (let i = 0; i < starCount; i++) {
      const layer = prng.rangeInt(0, 2);
      this.stars.push({
        x: prng.range(0, CONFIG.WORLD_WIDTH),
        y: prng.range(0, CONFIG.WORLD_HEIGHT),
        size: layer === 2 ? prng.range(1.5, 2.4) : layer === 1 ? prng.range(1.0, 1.6) : prng.range(0.6, 1.1),
        alpha: prng.range(0.4, 0.95),
        layer,
        color: prng.choice(starColors),
      });
    }
  }

  public render(ctx: CanvasRenderingContext2D, camera: Camera, noBoundaries: boolean = false): void {
    // 1. Nebulae
    for (const neb of this.nebulae) {
      if (!camera.isInView(neb.x, neb.y, neb.radius)) continue;
      const grad = ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.radius);
      grad.addColorStop(0, neb.color);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Stars with infinite wrapping around camera in no-boundaries space
    const camLeft = camera.x - camera.viewportWidth / 2;
    const camTop = camera.y - camera.viewportHeight / 2;
    const camRight = camera.x + camera.viewportWidth / 2;
    const camBottom = camera.y + camera.viewportHeight / 2;

    const tileW = CONFIG.WORLD_WIDTH;
    const tileH = CONFIG.WORLD_HEIGHT;

    const minTileX = Math.floor(camLeft / tileW);
    const maxTileX = Math.floor(camRight / tileW);
    const minTileY = Math.floor(camTop / tileH);
    const maxTileY = Math.floor(camBottom / tileH);

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const offX = tx * tileW;
        const offY = ty * tileH;

        for (let i = 0; i < this.stars.length; i++) {
          const star = this.stars[i];
          const sx = star.x + offX;
          const sy = star.y + offY;

          if (sx < camLeft - 5 || sx > camRight + 5 || sy < camTop - 5 || sy > camBottom + 5) continue;

          const twinkle = 0.8 + 0.2 * Math.sin(Date.now() * 0.003 + star.x);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = star.alpha * twinkle;
          ctx.beginPath();
          ctx.arc(sx, sy, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1.0;

    // 3. World Boundary Lines & Hazard Grid
    ctx.save();
    if (!noBoundaries) {
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00f0ff';
      ctx.shadowBlur = 12;
      ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);

      // Hazard warning dash-line perimeter
      ctx.strokeStyle = 'rgba(255, 50, 80, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([15, 15]);
      ctx.strokeRect(
        CONFIG.BOUNDARY_WARN_DIST,
        CONFIG.BOUNDARY_WARN_DIST,
        CONFIG.WORLD_WIDTH - 2 * CONFIG.BOUNDARY_WARN_DIST,
        CONFIG.WORLD_HEIGHT - 2 * CONFIG.BOUNDARY_WARN_DIST
      );
    } else {
      // Golden dashed boundary marking original sector perimeter (unbounded space)
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 2;
      ctx.setLineDash([25, 20]);
      ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
    }
    ctx.restore();
  }
}
