/**
 * TextureGenerator - Procedural surface detail textures
 *
 * Canvas-painted, tileable detail maps for platform surfaces. These multiply
 * against the platform's base color inside the cel shader, so every texture
 * is painted near-white with low-contrast variation: enough grain to read as
 * material, never enough to fight the cel bands.
 *
 * Textures are generated once per type and cached; callers may freely set
 * .repeat (wrap is RepeatWrapping).
 */

import * as THREE from 'three';

export type SurfaceTextureType = 'grass' | 'stone' | 'hedge' | 'marble' | 'wood';

const SIZE = 256;

const textureCache = new Map<SurfaceTextureType, THREE.Texture>();

/** Deterministic pseudo-random so textures are stable across reloads */
function makeRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 19487171) % 2147483647;
    return (s & 0xffff) / 0x10000;
  };
}

function makeCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

/** Fine multiplicative noise over the whole tile, wrap-safe (per-pixel) */
function addNoise(ctx: CanvasRenderingContext2D, rng: () => number, amount: number): void {
  const image = ctx.getImageData(0, 0, SIZE, SIZE);
  const d = image.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 1 - amount + rng() * amount * 2;
    d[i] = Math.min(255, d[i] * n);
    d[i + 1] = Math.min(255, d[i + 1] * n);
    d[i + 2] = Math.min(255, d[i + 2] * n);
  }
  ctx.putImageData(image, 0, 0);
}

/**
 * Draw a mark and its 8 wrapped copies so the tile seams disappear.
 */
function wrapped(_ctx: CanvasRenderingContext2D, draw: (ox: number, oy: number) => void): void {
  for (let ox = -1; ox <= 1; ox++) {
    for (let oy = -1; oy <= 1; oy++) {
      draw(ox * SIZE, oy * SIZE);
    }
  }
}

function paintGrass(ctx: CanvasRenderingContext2D, rng: () => number): void {
  ctx.fillStyle = '#f4f6ee';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Short blade strokes in two tones
  for (let i = 0; i < 900; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const len = 3 + rng() * 6;
    const lean = (rng() - 0.5) * 3;
    ctx.strokeStyle = rng() > 0.5 ? 'rgba(190, 205, 170, 0.35)' : 'rgba(230, 240, 215, 0.5)';
    ctx.lineWidth = 1;
    wrapped(ctx, (ox, oy) => {
      ctx.beginPath();
      ctx.moveTo(x + ox, y + oy);
      ctx.lineTo(x + lean + ox, y - len + oy);
      ctx.stroke();
    });
  }
  addNoise(ctx, rng, 0.03);
}

function paintHedge(ctx: CanvasRenderingContext2D, rng: () => number): void {
  ctx.fillStyle = '#eef2e6';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Dense leaf clusters: overlapping soft ellipses
  for (let i = 0; i < 600; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 2 + rng() * 4;
    const angle = rng() * Math.PI;
    const tone = 210 + Math.floor(rng() * 40);
    ctx.fillStyle = `rgba(${tone - 20}, ${tone}, ${tone - 30}, 0.4)`;
    wrapped(ctx, (ox, oy) => {
      ctx.beginPath();
      ctx.ellipse(x + ox, y + oy, r, r * 0.6, angle, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  addNoise(ctx, rng, 0.045);
}

function paintStone(ctx: CanvasRenderingContext2D, rng: () => number): void {
  ctx.fillStyle = '#f2efe8';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Mottled patches
  for (let i = 0; i < 70; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    const r = 8 + rng() * 26;
    const tone = 225 + Math.floor(rng() * 25);
    ctx.fillStyle = `rgba(${tone}, ${tone - 3}, ${tone - 8}, 0.35)`;
    wrapped(ctx, (ox, oy) => {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // Hairline cracks
  for (let i = 0; i < 14; i++) {
    let x = rng() * SIZE;
    let y = rng() * SIZE;
    ctx.strokeStyle = 'rgba(160, 155, 145, 0.3)';
    ctx.lineWidth = 0.8;
    const segments = 4 + Math.floor(rng() * 5);
    const startX = x;
    const startY = y;
    wrapped(ctx, (ox, oy) => {
      let cx = startX;
      let cy = startY;
      let cRng = makeRng(i * 733 + 17);
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy);
      for (let s = 0; s < segments; s++) {
        cx += (cRng() - 0.5) * 30;
        cy += (cRng() - 0.5) * 30;
        ctx.lineTo(cx + ox, cy + oy);
      }
      ctx.stroke();
    });
    void x; void y;
  }
  addNoise(ctx, rng, 0.025);
}

function paintMarble(ctx: CanvasRenderingContext2D, rng: () => number): void {
  ctx.fillStyle = '#f7f6f4';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Soft veins: long wandering translucent curves
  for (let i = 0; i < 10; i++) {
    const startX = rng() * SIZE;
    const startY = rng() * SIZE;
    const veinSeed = Math.floor(rng() * 100000);
    ctx.strokeStyle = `rgba(200, 202, 212, ${0.18 + rng() * 0.15})`;
    ctx.lineWidth = 1 + rng() * 1.5;
    wrapped(ctx, (ox, oy) => {
      const vRng = makeRng(veinSeed);
      let cx = startX;
      let cy = startY;
      ctx.beginPath();
      ctx.moveTo(cx + ox, cy + oy);
      for (let s = 0; s < 9; s++) {
        const nx = cx + (vRng() - 0.5) * 60;
        const ny = cy + (vRng() - 0.5) * 60;
        ctx.quadraticCurveTo(
          cx + (vRng() - 0.5) * 24 + ox,
          cy + (vRng() - 0.5) * 24 + oy,
          nx + ox,
          ny + oy
        );
        cx = nx;
        cy = ny;
      }
      ctx.stroke();
    });
  }
  addNoise(ctx, rng, 0.012);
}

function paintWood(ctx: CanvasRenderingContext2D, rng: () => number): void {
  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Vertical grain lines with slight waver
  for (let i = 0; i < 40; i++) {
    const x = (i / 40) * SIZE + (rng() - 0.5) * 6;
    const waver = 2 + rng() * 4;
    const grainSeed = Math.floor(rng() * 100000);
    ctx.strokeStyle = `rgba(205, 190, 165, ${0.2 + rng() * 0.25})`;
    ctx.lineWidth = 0.8 + rng() * 1.2;
    wrapped(ctx, (ox, oy) => {
      const gRng = makeRng(grainSeed);
      ctx.beginPath();
      ctx.moveTo(x + ox, oy);
      for (let y = 0; y <= SIZE; y += 16) {
        ctx.lineTo(x + Math.sin(y * 0.05 + gRng() * 6) * waver + ox, y + oy);
      }
      ctx.stroke();
    });
  }

  // A few knots
  for (let i = 0; i < 4; i++) {
    const x = rng() * SIZE;
    const y = rng() * SIZE;
    ctx.strokeStyle = 'rgba(185, 168, 140, 0.35)';
    ctx.lineWidth = 1;
    wrapped(ctx, (ox, oy) => {
      for (let ring = 2; ring < 8; ring += 2) {
        ctx.beginPath();
        ctx.ellipse(x + ox, y + oy, ring, ring * 1.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }
  addNoise(ctx, rng, 0.02);
}

const painters: Record<SurfaceTextureType, (ctx: CanvasRenderingContext2D, rng: () => number) => void> = {
  grass: paintGrass,
  hedge: paintHedge,
  stone: paintStone,
  marble: paintMarble,
  wood: paintWood,
};

/**
 * Get (or lazily build) the shared detail texture for a surface type.
 * Note: the returned texture is shared — callers set .repeat per mesh, so
 * meshes of the same type share tiling state. Clone if that ever matters.
 */
export function getTexture(type: SurfaceTextureType): THREE.Texture {
  const cached = textureCache.get(type);
  if (cached) return cached;

  const [canvas, ctx] = makeCanvas();
  painters[type](ctx, makeRng(type.length * 7919 + 101));

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  textureCache.set(type, texture);
  return texture;
}
