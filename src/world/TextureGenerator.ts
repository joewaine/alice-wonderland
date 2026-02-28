/**
 * TextureGenerator - Procedural canvas-based textures for surfaces
 *
 * Generates and caches tiling textures at runtime using HTML Canvas.
 * Each texture is designed to complement the cel-shader's color multiplication
 * (uMap * uColor) so existing cel-shading colors still work.
 */

import * as THREE from 'three';

export type SurfaceTextureType = 'grass' | 'stone' | 'wood' | 'hedge' | 'marble';

const SIZE = 512;
const textureCache = new Map<SurfaceTextureType, THREE.CanvasTexture>();

/**
 * Get a cached canvas texture for the given surface type.
 * Textures use RepeatWrapping for tiling.
 */
export function getTexture(type: SurfaceTextureType): THREE.CanvasTexture {
  const cached = textureCache.get(type);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d')!;

  switch (type) {
    case 'grass':
      generateGrass(ctx);
      break;
    case 'stone':
      generateStone(ctx);
      break;
    case 'wood':
      generateWood(ctx);
      break;
    case 'hedge':
      generateHedge(ctx);
      break;
    case 'marble':
      generateMarble(ctx);
      break;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  textureCache.set(type, texture);
  return texture;
}

// --- Texture Generators ---

/** Seeded pseudo-random for repeatable noise */
function seededRandom(x: number, y: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function generateGrass(ctx: CanvasRenderingContext2D): void {
  // Base green fill — neutral so cel-shader color tinting works
  ctx.fillStyle = '#b8d8a8';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle noise variation
  for (let x = 0; x < SIZE; x += 4) {
    for (let y = 0; y < SIZE; y += 4) {
      const r = seededRandom(x, y);
      const brightness = 160 + Math.floor(r * 40);
      ctx.fillStyle = `rgb(${brightness - 30}, ${brightness}, ${brightness - 40})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // Blade/tuft patterns — short vertical strokes
  for (let i = 0; i < 600; i++) {
    const x = seededRandom(i, 0) * SIZE;
    const y = seededRandom(0, i) * SIZE;
    const height = 6 + seededRandom(i, i) * 10;
    const shade = 120 + Math.floor(seededRandom(i * 3, i * 7) * 60);
    ctx.strokeStyle = `rgb(${shade - 20}, ${shade}, ${shade - 30})`;
    ctx.lineWidth = 1 + seededRandom(i, i * 2);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (seededRandom(i * 5, 0) - 0.5) * 4, y - height);
    ctx.stroke();
  }
}

function generateStone(ctx: CanvasRenderingContext2D): void {
  // Tan/gray base
  ctx.fillStyle = '#c8b898';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Pebble-like noise
  for (let x = 0; x < SIZE; x += 3) {
    for (let y = 0; y < SIZE; y += 3) {
      const r = seededRandom(x, y);
      const base = 170 + Math.floor(r * 40);
      ctx.fillStyle = `rgb(${base}, ${base - 10}, ${base - 20})`;
      ctx.fillRect(x, y, 3, 3);
    }
  }

  // Crack lines
  ctx.strokeStyle = 'rgba(100, 80, 60, 0.3)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 20; i++) {
    let cx = seededRandom(i * 13, 7) * SIZE;
    let cy = seededRandom(7, i * 13) * SIZE;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 6; j++) {
      cx += (seededRandom(i + j, j) - 0.5) * 60;
      cy += (seededRandom(j, i + j) - 0.5) * 60;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  // Weathering spots
  for (let i = 0; i < 40; i++) {
    const x = seededRandom(i * 3, 99) * SIZE;
    const y = seededRandom(99, i * 3) * SIZE;
    const r = 3 + seededRandom(i, i) * 8;
    ctx.fillStyle = `rgba(140, 120, 90, ${0.1 + seededRandom(i, 0) * 0.15})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function generateWood(ctx: CanvasRenderingContext2D): void {
  // Brown base
  ctx.fillStyle = '#a08060';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Horizontal grain lines
  for (let y = 0; y < SIZE; y += 2) {
    const r = seededRandom(0, y);
    const brightness = 140 + Math.floor(r * 40);
    const variation = Math.sin(y * 0.05 + seededRandom(y, 0) * 3) * 15;
    const b = brightness + variation;
    ctx.fillStyle = `rgb(${b}, ${b - 25}, ${b - 50})`;
    ctx.fillRect(0, y, SIZE, 2);
  }

  // Knot patterns
  for (let i = 0; i < 5; i++) {
    const kx = seededRandom(i * 17, 31) * SIZE;
    const ky = seededRandom(31, i * 17) * SIZE;
    const kr = 10 + seededRandom(i, i) * 20;

    // Concentric rings
    for (let ring = kr; ring > 2; ring -= 3) {
      const shade = 100 + Math.floor((ring / kr) * 60);
      ctx.strokeStyle = `rgb(${shade}, ${shade - 20}, ${shade - 40})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(kx, ky, ring, ring * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Knot center
    ctx.fillStyle = 'rgba(80, 50, 30, 0.6)';
    ctx.beginPath();
    ctx.arc(kx, ky, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function generateHedge(ctx: CanvasRenderingContext2D): void {
  // Dark green base
  ctx.fillStyle = '#4a8040';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Overlapping leaf-like circles
  for (let i = 0; i < 400; i++) {
    const x = seededRandom(i, 0) * SIZE;
    const y = seededRandom(0, i) * SIZE;
    const r = 5 + seededRandom(i, i) * 12;
    const shade = 80 + Math.floor(seededRandom(i * 2, i * 3) * 80);
    ctx.fillStyle = `rgba(${shade - 20}, ${shade}, ${shade - 30}, 0.5)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smaller highlight leaves
  for (let i = 0; i < 200; i++) {
    const x = seededRandom(i + 500, 0) * SIZE;
    const y = seededRandom(0, i + 500) * SIZE;
    const r = 2 + seededRandom(i + 500, i + 500) * 5;
    const shade = 140 + Math.floor(seededRandom(i * 5, i * 7) * 40);
    ctx.fillStyle = `rgba(${shade - 30}, ${shade}, ${shade - 20}, 0.4)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function generateMarble(ctx: CanvasRenderingContext2D): void {
  // White/light gray base
  ctx.fillStyle = '#e8e4e0';
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Subtle noise
  for (let x = 0; x < SIZE; x += 4) {
    for (let y = 0; y < SIZE; y += 4) {
      const r = seededRandom(x, y);
      const brightness = 220 + Math.floor(r * 25);
      ctx.fillStyle = `rgb(${brightness}, ${brightness - 2}, ${brightness - 5})`;
      ctx.fillRect(x, y, 4, 4);
    }
  }

  // Vein patterns — thin winding lines
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    let vx = seededRandom(i * 19, 41) * SIZE;
    let vy = seededRandom(41, i * 19) * SIZE;
    const alpha = 0.08 + seededRandom(i, 0) * 0.1;
    ctx.strokeStyle = `rgba(160, 150, 140, ${alpha})`;
    ctx.beginPath();
    ctx.moveTo(vx, vy);
    for (let j = 0; j < 15; j++) {
      vx += (seededRandom(i + j * 3, j) - 0.5) * 80;
      vy += (seededRandom(j, i + j * 3) - 0.3) * 50;
      ctx.lineTo(vx, vy);
    }
    ctx.stroke();
  }
}
