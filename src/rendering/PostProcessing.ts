/**
 * PostProcessing - Cinematic render pipeline
 *
 * RenderPass -> UnrealBloomPass -> GradePass (to screen).
 *
 * Deliberately no OutputPass: this game's materials (custom cel shaders,
 * canvas textures, the shader sky) are authored in display space, so adding
 * a linear->sRGB output transform would wash the whole frame toward white.
 * The grade pass supplies the filmic feel instead: gentle S-curve contrast,
 * vignette, chromatic aberration, animated grain, and a warm lift. The
 * vignette is driven at runtime (speed tunnel-vision) via setVignette().
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignetteIntensity: { value: 0.32 },
    uVignetteRadius: { value: 0.78 },   // Distance from center where darkening begins
    uAberration: { value: 0.0006 },
    uGrain: { value: 0.028 },
    uSaturation: { value: 1.06 },
    uWarmth: { value: 0.02 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVignetteIntensity;
    uniform float uVignetteRadius;
    uniform float uAberration;
    uniform float uGrain;
    uniform float uSaturation;
    uniform float uWarmth;

    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    void main() {
      vec2 center = vUv - 0.5;
      float dist = length(center);

      // Radial chromatic aberration, strongest at the edges
      vec2 caOffset = center * dist * dist * uAberration * 40.0;
      float r = texture2D(tDiffuse, vUv - caOffset).r;
      vec2 gb = texture2D(tDiffuse, vUv + caOffset * 0.5).gb;
      vec3 color = vec3(r, gb);

      // Gentle filmic S-curve: deepen shadows, roll off highlights
      color = clamp(color, 0.0, 1.0);
      color = mix(color, color * color * (3.0 - 2.0 * color), 0.35);

      // Warm lift: nudge shadows toward amber, keep highlights clean
      float luma = dot(color, vec3(0.299, 0.587, 0.114));
      color += vec3(uWarmth, uWarmth * 0.55, -uWarmth * 0.5) * (1.0 - luma);

      // Saturation
      color = mix(vec3(luma), color, uSaturation);

      // Filmic vignette (smooth falloff past the radius)
      float vig = smoothstep(uVignetteRadius, uVignetteRadius * 1.9, dist * 1.6);
      color *= 1.0 - vig * uVignetteIntensity;

      // Fine animated grain, weighted toward midtones
      float grain = hash(vUv * vec2(1920.0, 1080.0) + fract(uTime) * 61.7) - 0.5;
      color += grain * uGrain * (0.35 + 0.65 * (1.0 - abs(luma - 0.5) * 2.0));

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export class PostProcessing {
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private gradePass: ShaderPass;
  private time: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) {
    const size = renderer.getSize(new THREE.Vector2());

    // Multisampled target keeps geometry edges clean through the composer
    const target = new THREE.WebGLRenderTarget(size.x, size.y, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    // Built-in materials encode to display space on write (matching what
    // they'd do rendering straight to canvas); custom shaders already
    // author display-space values. Keeps the whole buffer consistent.
    target.texture.colorSpace = THREE.SRGBColorSpace;
    this.composer = new EffectComposer(renderer, target);

    this.composer.addPass(new RenderPass(scene, camera));

    // Subtle bloom: only genuinely bright things (sun, gold, particles) glow
    this.bloomPass = new UnrealBloomPass(size.clone(), 0.22, 0.55, 0.92);
    this.composer.addPass(this.bloomPass);

    // Display-space grade (final pass, renders to screen)
    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);
  }

  render(dt: number): void {
    this.time += dt;
    this.gradePass.uniforms.uTime.value = this.time;
    this.composer.render(dt);
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  /**
   * Drive the vignette at runtime.
   * intensity: 0..1 darkness at edges; radius: 0..1, smaller = tighter tunnel
   */
  setVignette(intensity: number, radius: number): void {
    this.gradePass.uniforms.uVignetteIntensity.value = intensity;
    this.gradePass.uniforms.uVignetteRadius.value = radius;
  }

  dispose(): void {
    this.composer.dispose();
  }
}
