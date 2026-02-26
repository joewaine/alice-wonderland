/**
 * CelShaderMaterial - Breath of the Wild-inspired cel-shading
 *
 * Features:
 * - 3-step diffuse lighting (shadow, mid, highlight)
 * - Rim lighting for depth and character pop
 * - Texture support with cel-shaded lighting
 * - Hard shadow cutoff for stylized look
 */

import * as THREE from 'three';

export interface CelShaderOptions {
  color?: THREE.Color | number;
  map?: THREE.Texture | null;
  shadowColor?: THREE.Color | number;
  highlightColor?: THREE.Color | number;
  rimColor?: THREE.Color | number;
  rimPower?: number;
  steps?: number;
  transparent?: boolean;
  opacity?: number;
}

const defaultOptions: Required<CelShaderOptions> = {
  color: new THREE.Color(0xffffff),
  map: null,
  shadowColor: new THREE.Color(0x6b5b7a),    // Purple-ish shadow (BotW style)
  highlightColor: new THREE.Color(0xfff8e7), // Warm highlight
  rimColor: new THREE.Color(0xadd8e6),       // Soft blue rim
  rimPower: 2.0,
  steps: 3,
  transparent: false,
  opacity: 1.0,
};

// Vertex shader - passes normals and view direction to fragment
const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Fragment shader - stepped lighting with rim
const fragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uShadowColor;
  uniform vec3 uHighlightColor;
  uniform vec3 uRimColor;
  uniform float uRimPower;
  uniform float uSteps;
  uniform sampler2D uMap;
  uniform bool uHasMap;
  uniform vec3 uLightDirection;
  uniform float uAmbientIntensity;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying vec2 vUv;

  void main() {
    // Base color (from texture or uniform)
    vec3 baseColor = uHasMap ? texture2D(uMap, vUv).rgb * uColor : uColor;

    // Diffuse lighting - dot product with light direction
    vec3 normal = normalize(vNormal);
    vec3 lightDir = normalize(uLightDirection);
    float NdotL = dot(normal, lightDir);

    // Step the lighting for cel-shaded look
    // Map from [-1, 1] to [0, 1] then quantize
    float lightIntensity = (NdotL + 1.0) * 0.5;
    lightIntensity = floor(lightIntensity * uSteps) / uSteps;

    // Create color bands: shadow -> mid -> highlight
    vec3 shadedColor;
    if (lightIntensity < 0.33) {
      // Shadow band - mix shadow color with base
      shadedColor = mix(uShadowColor, baseColor, 0.3);
    } else if (lightIntensity < 0.66) {
      // Mid band - base color
      shadedColor = baseColor;
    } else {
      // Highlight band - mix with highlight color
      shadedColor = mix(baseColor, uHighlightColor, 0.3);
    }

    // Add ambient to prevent pure black shadows
    shadedColor = mix(shadedColor, baseColor, uAmbientIntensity);

    // Rim lighting - fresnel-like effect at grazing angles
    vec3 viewDir = normalize(vViewPosition);
    float rimFactor = 1.0 - max(dot(normal, viewDir), 0.0);
    rimFactor = pow(rimFactor, uRimPower);

    // Apply rim only on lit side (subtle)
    rimFactor *= smoothstep(0.0, 0.3, NdotL + 0.3);
    vec3 finalColor = mix(shadedColor, uRimColor, rimFactor * 0.5);

    gl_FragColor = vec4(finalColor, uOpacity);
  }
`;

/**
 * Create a cel-shaded material
 */
export function createCelShaderMaterial(options: CelShaderOptions = {}): THREE.ShaderMaterial {
  const opts = { ...defaultOptions, ...options };

  const color = opts.color instanceof THREE.Color ? opts.color : new THREE.Color(opts.color);
  const shadowColor = opts.shadowColor instanceof THREE.Color ? opts.shadowColor : new THREE.Color(opts.shadowColor);
  const highlightColor = opts.highlightColor instanceof THREE.Color ? opts.highlightColor : new THREE.Color(opts.highlightColor);
  const rimColor = opts.rimColor instanceof THREE.Color ? opts.rimColor : new THREE.Color(opts.rimColor);

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: color },
      uShadowColor: { value: shadowColor },
      uHighlightColor: { value: highlightColor },
      uRimColor: { value: rimColor },
      uRimPower: { value: opts.rimPower },
      uSteps: { value: opts.steps },
      uMap: { value: opts.map },
      uHasMap: { value: opts.map !== null },
      uLightDirection: { value: new THREE.Vector3(0.5, 1, 0.3).normalize() },
      uAmbientIntensity: { value: 0.3 },
      uOpacity: { value: opts.opacity },
    },
    transparent: opts.transparent,
    side: opts.transparent ? THREE.DoubleSide : THREE.FrontSide,
  });

  return material;
}

/**
 * Apply cel-shader to all meshes in an object hierarchy
 * Preserves original textures when available
 */
export function applyCelShaderToObject(
  object: THREE.Object3D,
  options: CelShaderOptions = {}
): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalMaterial = child.material as THREE.MeshStandardMaterial;

      // Extract texture and color from original material if available
      const materialOptions: CelShaderOptions = { ...options };

      if (originalMaterial.map) {
        materialOptions.map = originalMaterial.map;
      }
      if (originalMaterial.color && !options.color) {
        materialOptions.color = originalMaterial.color;
      }

      child.material = createCelShaderMaterial(materialOptions);
    }
  });
}

/**
 * Update light direction for all cel-shaded materials in scene
 */
export function updateCelShaderLightDirection(
  scene: THREE.Scene,
  lightDirection: THREE.Vector3
): void {
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
      if (child.material.uniforms.uLightDirection) {
        child.material.uniforms.uLightDirection.value.copy(lightDirection).normalize();
      }
    }
  });
}
