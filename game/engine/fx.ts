import { TAU, rand } from './util';
import { INK, star } from './art';

export type ParticleType = 'dot' | 'star' | 'ring' | 'tear' | 'rock' | 'heart' | 'note' | 'drop';

export interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; color: string; type: ParticleType; r: number; rot: number;
}

const GRAVITY: Record<ParticleType, number> = { dot: -30, star: 0, ring: 0, tear: 170, rock: 520, heart: -40, note: -50, drop: 380 };

/** World-space particles: sparkles on success, bubbles, tears, falling rocks. */
export class Fx {
  list: Particle[] = [];

  burst(x: number, y: number, n: number, color: string, type: ParticleType = 'dot', speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU), s = rand(speed * 0.4, speed);
      this.list.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: rand(0.5, 0.9), color, type, r: rand(3, 7), rot: rand(0, TAU) });
    }
  }
  ring(x: number, y: number, color = '#ffffff') {
    this.list.push({ x, y, vx: 0, vy: 0, life: 0, max: 0.45, color, type: 'ring', r: 8, rot: 0 });
  }
  add(p: Partial<Particle> & { x: number; y: number; type: ParticleType }) {
    this.list.push({ vx: 0, vy: 0, life: 0, max: 1, color: '#fff', r: 6, rot: 0, ...p });
  }
  celebrate(x: number, y: number) {
    this.burst(x, y, 18, '#ffe066', 'star', 220);
    this.burst(x, y, 10, '#ff86c1', 'heart', 160);
    this.ring(x, y, '#ffffff');
  }

  update(dt: number) {
    const l = this.list;
    for (let i = l.length - 1; i >= 0; i--) {
      const p = l[i];
      p.life += dt;
      if (p.life > p.max) { l.splice(i, 1); continue; }
      p.vy += GRAVITY[p.type] * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += dt * 4;
    }
  }

  draw(c: CanvasRenderingContext2D) {
    for (const p of this.list) {
      const k = p.life / p.max;
      switch (p.type) {
        case 'dot':
          c.fillStyle = p.color; c.beginPath(); c.arc(p.x, p.y, p.r * (1 - k), 0, TAU); c.fill(); break;
        case 'star':
          star(c, p.x, p.y, p.r * 1.4 * (1 - k * 0.6), p.color); break;
        case 'ring':
          c.globalAlpha = 1 - k; c.lineWidth = 4; c.strokeStyle = p.color;
          c.beginPath(); c.arc(p.x, p.y, 8 + k * 34, 0, TAU); c.stroke(); c.globalAlpha = 1; break;
        case 'tear':
        case 'drop': {
          c.save(); c.translate(p.x, p.y); c.globalAlpha = 1 - k * k;
          const s = p.r / 6;
          c.scale(s, s);
          c.beginPath(); c.moveTo(0, -12); c.quadraticCurveTo(9, 2, 0, 7); c.quadraticCurveTo(-9, 2, 0, -12);
          c.fillStyle = p.color; c.fill(); c.lineWidth = 2.5; c.strokeStyle = INK; c.stroke(); c.restore(); break;
        }
        case 'rock':
          c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
          c.fillStyle = p.color; c.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
          c.lineWidth = 2; c.strokeStyle = INK; c.strokeRect(-p.r, -p.r, p.r * 2, p.r * 2); c.restore(); break;
        case 'heart': {
          c.save(); c.translate(p.x, p.y); c.globalAlpha = 1 - k; const s = p.r / 7; c.scale(s, s);
          c.beginPath(); c.moveTo(0, 6); c.bezierCurveTo(-12, -2, -6, -12, 0, -5); c.bezierCurveTo(6, -12, 12, -2, 0, 6);
          c.fillStyle = p.color; c.fill(); c.lineWidth = 2; c.strokeStyle = INK; c.stroke(); c.restore(); break;
        }
        case 'note': {
          c.save(); c.translate(p.x, p.y); c.globalAlpha = 1 - k; c.fillStyle = INK; c.strokeStyle = INK; c.lineWidth = 2.5;
          c.beginPath(); c.ellipse(0, 0, 5, 4, -0.4, 0, TAU); c.fill();
          c.beginPath(); c.moveTo(4.5, -1); c.lineTo(4.5, -16); c.lineTo(10, -12); c.stroke(); c.restore(); break;
        }
      }
    }
  }

  clear() { this.list.length = 0; }
}
