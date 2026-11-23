export interface FloatingMessage {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  vy: number;
  fontSize: number;
}

export class FloatingTextSystem {
  private messages: FloatingMessage[] = [];

  public spawn(x: number, y: number, text: string, color: string = '#00f0ff', fontSize: number = 13): void {
    this.messages.push({
      x,
      y,
      text,
      color,
      life: 1.2,
      maxLife: 1.2,
      vy: -35,
      fontSize,
    });
  }

  public update(dt: number): void {
    for (let i = 0; i < this.messages.length; i++) {
      const m = this.messages[i];
      m.life -= dt;
      m.y += m.vy * dt;
    }
    this.messages = this.messages.filter(m => m.life > 0);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.textAlign = 'center';
    for (let i = 0; i < this.messages.length; i++) {
      const m = this.messages[i];
      const alpha = Math.max(0, m.life / m.maxLife);
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${m.fontSize}px "Courier New", monospace`;
      ctx.fillStyle = m.color;
      ctx.shadowColor = m.color;
      ctx.shadowBlur = 6;
      ctx.fillText(m.text, m.x, m.y);
    }
    ctx.restore();
  }

  public reset(): void {
    this.messages = [];
  }
}
