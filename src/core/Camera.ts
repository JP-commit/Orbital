import { CONFIG } from '../config';

export class Camera {
  public x: number = 0;
  public y: number = 0;
  public viewportWidth: number = 1280;
  public viewportHeight: number = 720;

  // Shake trauma (0 to 1)
  private trauma: number = 0;
  private shakeOffset = { x: 0, y: 0 };
  private shakeAngle: number = 0;

  constructor(initialX: number = 0, initialY: number = 0) {
    this.x = initialX;
    this.y = initialY;
  }

  public resize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  // Smoothly track target (player)
  public update(targetX: number, targetY: number, dt: number, allowShake: boolean = true): void {
    const lerpFactor = 1 - Math.exp(-CONFIG.CAMERA.LERP * 60 * dt);
    this.x += (targetX - this.x) * lerpFactor;
    this.y += (targetY - this.y) * lerpFactor;

    // Decay trauma
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - CONFIG.CAMERA.TRAUMA_DECAY * dt);
    }

    if (allowShake && this.trauma > 0) {
      const shakeAmount = this.trauma * this.trauma * CONFIG.CAMERA.MAX_SHAKE;
      const angle = (Math.random() - 0.5) * 2 * Math.PI;
      this.shakeOffset.x = Math.cos(angle) * shakeAmount;
      this.shakeOffset.y = Math.sin(angle) * shakeAmount;
      this.shakeAngle = (Math.random() - 0.5) * 0.04 * this.trauma;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
      this.shakeAngle = 0;
    }
  }

  // Add trauma from explosions, hits, collisions (0.1 to 1.0)
  public addTrauma(amount: number): void {
    this.trauma = Math.min(1.0, this.trauma + amount);
  }

  // World coordinates to screen coordinates
  public worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.x + this.viewportWidth / 2 + this.shakeOffset.x,
      y: worldY - this.y + this.viewportHeight / 2 + this.shakeOffset.y,
    };
  }

  // Screen coordinates to world coordinates
  public screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX - this.viewportWidth / 2 + this.x - this.shakeOffset.x,
      y: screenY - this.viewportHeight / 2 + this.y - this.shakeOffset.y,
    };
  }

  // Fast bounding check for frustum culling
  public isInView(worldX: number, worldY: number, radius: number): boolean {
    const left = this.x - this.viewportWidth / 2 - radius;
    const right = this.x + this.viewportWidth / 2 + radius;
    const top = this.y - this.viewportHeight / 2 - radius;
    const bottom = this.y + this.viewportHeight / 2 + radius;
    return worldX >= left && worldX <= right && worldY >= top && worldY <= bottom;
  }

  // Apply camera transformation onto Canvas 2D context
  public applyTransform(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(
      this.viewportWidth / 2 + this.shakeOffset.x,
      this.viewportHeight / 2 + this.shakeOffset.y
    );
    if (this.shakeAngle !== 0) {
      ctx.rotate(this.shakeAngle);
    }
    ctx.translate(-this.x, -this.y);
  }

  public restoreTransform(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}
