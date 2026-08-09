/**
 * WonderlandSky - Animated golden-hour sky dome
 *
 * A single inverted sphere with a shader that layers:
 *  - a zenith-to-horizon golden-hour gradient
 *  - a sun disk with layered atmospheric glow, positioned from the scene sun
 *  - two depths of FBM clouds drifting at different speeds, lit warm sunside
 *  - a faint horizon haze that reads as distance
 *
 * Everything animates from a single uTime uniform; call update(dt) each frame.
 */

import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vWorldDir;

  void main() {
    // Direction from origin — the dome is camera-centered so position works
    vWorldDir = normalize(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDirection;

  varying vec3 vWorldDir;

  // --- Value noise + FBM for clouds ---
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = p * 2.03 + vec2(19.7, 7.3);
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float elevation = dir.y;                  // -1 nadir .. 1 zenith
    vec3 sunDir = normalize(uSunDirection);

    // --- Golden hour gradient ---
    vec3 zenith  = vec3(0.255, 0.502, 0.729); // Deep afternoon blue
    vec3 mid     = vec3(0.639, 0.827, 0.894); // Soft light blue
    vec3 golden  = vec3(1.000, 0.878, 0.647); // Amber band
    vec3 horizon = vec3(1.000, 0.784, 0.573); // Peach at horizon
    vec3 below   = vec3(0.769, 0.851, 0.702); // Green haze below horizon

    vec3 sky;
    if (elevation > 0.35) {
      sky = mix(mid, zenith, smoothstep(0.35, 0.9, elevation));
    } else if (elevation > 0.12) {
      sky = mix(golden, mid, smoothstep(0.12, 0.35, elevation));
    } else if (elevation > 0.0) {
      sky = mix(horizon, golden, smoothstep(0.0, 0.12, elevation));
    } else {
      sky = mix(horizon, below, smoothstep(0.0, -0.25, elevation));
    }

    // --- Sun disk + layered glow ---
    float sunDot = dot(dir, sunDir);
    float glow = pow(max(sunDot, 0.0), 6.0) * 0.35        // Wide atmosphere
               + pow(max(sunDot, 0.0), 60.0) * 0.55;      // Tight halo
    float disk = smoothstep(0.9993, 0.9997, sunDot);      // Crisp disk
    vec3 sunColor = vec3(1.0, 0.96, 0.86);
    sky += sunColor * glow;
    sky = mix(sky, vec3(1.0, 0.99, 0.94), disk);

    // --- Clouds: project view ray onto a virtual plane above the camera ---
    if (elevation > 0.02) {
      vec2 cloudUv = dir.xz / (elevation + 0.15);

      // Far layer: slow, soft
      float farClouds = fbm(cloudUv * 0.9 + vec2(uTime * 0.006, uTime * 0.0015));
      float farMask = smoothstep(0.52, 0.78, farClouds);

      // Near layer: faster, more defined, offset so shapes don't align
      float nearClouds = fbm(cloudUv * 1.9 + vec2(uTime * 0.014, -uTime * 0.003) + 37.0);
      float nearMask = smoothstep(0.55, 0.85, nearClouds);

      // Fade clouds toward horizon and zenith so they sit in a natural band
      float band = smoothstep(0.02, 0.15, elevation) * (1.0 - smoothstep(0.55, 0.95, elevation));

      // Warm-lit on the sun side, cool violet shadow away from it
      float sunSide = max(sunDot, 0.0);
      vec3 cloudLit    = mix(vec3(0.98, 0.93, 0.88), vec3(1.0, 0.9, 0.75), sunSide);
      vec3 cloudShadow = vec3(0.72, 0.68, 0.78);

      float farAmount = farMask * band * 0.5;
      sky = mix(sky, mix(cloudShadow, cloudLit, 0.5 + sunSide * 0.4), farAmount);

      float nearAmount = nearMask * band * 0.75;
      float nearShading = smoothstep(0.4, 0.9, nearClouds); // Denser core = darker base
      vec3 nearColor = mix(cloudLit, cloudShadow, nearShading * 0.45 * (1.0 - sunSide * 0.5));
      sky = mix(sky, nearColor, nearAmount);
    }

    // --- Horizon haze: soft warm veil that sells distance ---
    float haze = 1.0 - smoothstep(0.0, 0.22, abs(elevation));
    sky = mix(sky, vec3(1.0, 0.91, 0.78), haze * 0.25);

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export class WonderlandSky {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(scene: THREE.Scene, sunPosition: THREE.Vector3) {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uSunDirection: { value: sunPosition.clone().normalize() },
      },
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });

    const geometry = new THREE.SphereGeometry(700, 48, 24);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = -1;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  update(dt: number, cameraPosition: THREE.Vector3): void {
    this.material.uniforms.uTime.value += dt;
    // Keep the dome centered on the camera so it reads as infinitely far
    this.mesh.position.copy(cameraPosition);
  }

  dispose(scene: THREE.Scene): void {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
