/**
 * CelShaderMaterial - Breath of the Wild-inspired cel-shading
 *
 * Built on MeshToonMaterial with a shared 3-step gradient ramp, so cel
 * surfaces get everything the old hand-rolled ShaderMaterial lacked:
 * cast/received shadows, fog, and correct color management. A rim-light
 * term is injected via onBeforeCompile for the characteristic sky-bounce
 * edge glow.
 *
 * The factory keeps the original createCelShaderMaterial(options) API;
 * shadowColor/highlightColor are accepted for compatibility but banding
 * now comes from the gradient ramp.
 */

import * as THREE from 'three';

export interface CelShaderOptions {
  color?: THREE.Color | number;
  map?: THREE.Texture | null;
  shadowColor?: THREE.Color | number;    // Accepted for API compatibility
  highlightColor?: THREE.Color | number; // Accepted for API compatibility
  rimColor?: THREE.Color | number;
  rimPower?: number;
  transparent?: boolean;
  opacity?: number;
}

const defaultOptions = {
  color: 0xffffff as THREE.Color | number,
  map: null as THREE.Texture | null,
  rimColor: 0xadd8e6 as THREE.Color | number, // Soft blue rim
  rimPower: 2.0,
  transparent: false,
  opacity: 1.0,
};

// Shared 3-step toon ramp: shadow / mid / highlight
let sharedGradientMap: THREE.DataTexture | null = null;

function getGradientMap(): THREE.DataTexture {
  if (!sharedGradientMap) {
    const data = new Uint8Array([150, 215, 255]);
    sharedGradientMap = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
    sharedGradientMap.minFilter = THREE.NearestFilter;
    sharedGradientMap.magFilter = THREE.NearestFilter;
    sharedGradientMap.needsUpdate = true;
  }
  return sharedGradientMap;
}

/**
 * Create a cel-shaded material
 */
export function createCelShaderMaterial(options: CelShaderOptions = {}): THREE.MeshToonMaterial {
  const opts = { ...defaultOptions, ...options };

  const color = opts.color instanceof THREE.Color ? opts.color.clone() : new THREE.Color(opts.color);
  const rimColor = opts.rimColor instanceof THREE.Color ? opts.rimColor.clone() : new THREE.Color(opts.rimColor);
  const rimPower = opts.rimPower;

  const material = new THREE.MeshToonMaterial({
    color,
    map: opts.map ?? null,
    gradientMap: getGradientMap(),
    transparent: opts.transparent,
    opacity: opts.opacity,
    side: opts.transparent ? THREE.DoubleSide : THREE.FrontSide,
  });

  // Inject rim lighting just before the final color write
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRimColor = { value: rimColor };
    shader.uniforms.uRimPower = { value: rimPower };
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform vec3 uRimColor;\nuniform float uRimPower;'
      )
      .replace(
        '#include <opaque_fragment>',
        /* glsl */ `
        {
          vec3 rimView = normalize( vViewPosition );
          float rimFactor = pow( 1.0 - saturate( dot( normalize( normal ), rimView ) ), uRimPower );
          outgoingLight = mix( outgoingLight, uRimColor, rimFactor * 0.3 );
        }
        #include <opaque_fragment>`
      );
  };
  // Distinguish the patched program in three's shader cache
  material.customProgramCacheKey = () => 'cel-rim';

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
 * Legacy hook: the old ShaderMaterial needed its light direction synced by
 * hand. MeshToonMaterial is lit by the scene's real lights, so this is a
 * no-op kept for call-site compatibility.
 */
export function updateCelShaderLightDirection(
  _scene: THREE.Scene,
  _lightDirection: THREE.Vector3
): void {
  // Intentionally a no-op
}
