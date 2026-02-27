/**
 * OutlineEffect - Inverted hull outline for cel-shaded objects
 *
 * Creates cartoon-style outlines by rendering a scaled-up version
 * of the mesh with inverted normals (backface only) behind the original.
 */

import * as THREE from 'three';

export interface OutlineOptions {
  color?: THREE.Color | number;
  thickness?: number;
}

const defaultOptions: Required<OutlineOptions> = {
  color: new THREE.Color(0x1a1a2e), // Dark blue-black (softer than pure black)
  thickness: 0.03,
};

// Vertex shader - pushes vertices along normals
const outlineVertexShader = /* glsl */ `
  uniform float uThickness;

  void main() {
    // Push vertices outward along normal
    vec3 newPosition = position + normal * uThickness;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Fragment shader - solid color
const outlineFragmentShader = /* glsl */ `
  uniform vec3 uColor;

  void main() {
    gl_FragColor = vec4(uColor, 1.0);
  }
`;

/**
 * Create outline material
 */
export function createOutlineMaterial(options: OutlineOptions = {}): THREE.ShaderMaterial {
  const opts = { ...defaultOptions, ...options };
  const color = opts.color instanceof THREE.Color ? opts.color : new THREE.Color(opts.color);

  return new THREE.ShaderMaterial({
    vertexShader: outlineVertexShader,
    fragmentShader: outlineFragmentShader,
    uniforms: {
      uColor: { value: color },
      uThickness: { value: opts.thickness },
    },
    side: THREE.BackSide, // Only render backfaces (creates outline effect)
  });
}

/**
 * Add outlines to all meshes in an object hierarchy
 *
 * Creates outline meshes as siblings in the hierarchy.
 * Skips meshes that already have outlines.
 */
export function addOutlinesToObject(
  object: THREE.Object3D,
  options: OutlineOptions = {}
): void {
  const meshesToOutline: THREE.Mesh[] = [];

  // Collect meshes (can't modify during traverse)
  object.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.name.endsWith('_outline')) {
      meshesToOutline.push(child);
    }
  });

  // Add outline mesh for each
  for (const mesh of meshesToOutline) {
    const parent = mesh.parent;
    if (!parent) continue;

    // Check if outline already exists
    const existingOutline = parent.children.find(
      (c) => c.name === `${mesh.name}_outline`
    );
    if (existingOutline) continue;

    // Create outline mesh
    const outlineMesh = new THREE.Mesh(mesh.geometry, createOutlineMaterial(options));
    outlineMesh.name = `${mesh.name}_outline`;

    // Match transforms
    outlineMesh.position.copy(mesh.position);
    outlineMesh.rotation.copy(mesh.rotation);
    outlineMesh.scale.copy(mesh.scale);

    // Add outline via Three.js API (depth buffer handles render order for opaque objects)
    parent.add(outlineMesh);
  }
}

