/**
 * AssetLoader - Loads GLB models and textures
 *
 * Uses Three.js GLTF loader with fallbacks to primitive geometry
 * when models aren't available.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  private gltfLoader: GLTFLoader;
  private loadedModels: Map<string, THREE.Group> = new Map();

  constructor() {
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Load a GLB model, returning a clone
   */
  async loadModel(path: string): Promise<THREE.Group> {
    // Check cache
    if (this.loadedModels.has(path)) {
      return this.loadedModels.get(path)!.clone();
    }

    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      const model = gltf.scene;

      // Enable shadows
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      // Cache original
      this.loadedModels.set(path, model);

      return model.clone();
    } catch (error) {
      console.warn(`Failed to load model ${path}:`, error);
      throw error;
    }
  }

  /**
   * Load a GLB model with animations (for characters)
   * Returns both the model and animation clips
   */
  async loadModelWithAnimations(path: string): Promise<{
    model: THREE.Group;
    animations: THREE.AnimationClip[];
  }> {
    try {
      const gltf = await this.gltfLoader.loadAsync(path);
      const model = gltf.scene;

      // Enable shadows
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      return {
        model,
        animations: gltf.animations || []
      };
    } catch (error) {
      console.warn(`Failed to load animated model ${path}:`, error);
      throw error;
    }
  }

  /**
   * Load model with fallback to primitive
   */
  async loadModelWithFallback(
    path: string,
    fallbackColor: number = 0x888888
  ): Promise<THREE.Group> {
    try {
      return await this.loadModel(path);
    } catch {
      console.log(`Using fallback geometry for ${path}`);
      return this.createFallbackModel(fallbackColor);
    }
  }

  /**
   * Create simple fallback geometry
   */
  private createFallbackModel(color: number): THREE.Group {
    const group = new THREE.Group();

    // Simple capsule as fallback
    const geo = new THREE.CapsuleGeometry(0.4, 1, 4, 8);
    const mat = new THREE.MeshStandardMaterial({ color });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.position.y = 0.9;
    group.add(mesh);

    return group;
  }

  /**
   * Load a texture
   */
  async loadTexture(path: string): Promise<THREE.Texture> {
    const loader = new THREE.TextureLoader();
    return loader.loadAsync(path);
  }

  /**
   * Preload multiple models
   */
  async preloadModels(paths: string[]): Promise<void> {
    const promises = paths.map(path =>
      this.loadModel(path).catch(() => {
        console.warn(`Preload failed for ${path}`);
      })
    );
    await Promise.all(promises);
  }

  /**
   * Clear cache and dispose resources
   */
  dispose(): void {
    for (const model of this.loadedModels.values()) {
      model.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    this.loadedModels.clear();
  }
}

// Singleton instance
export const assetLoader = new AssetLoader();
