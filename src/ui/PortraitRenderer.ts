/**
 * PortraitRenderer - Renders 3D NPC models to portrait images
 *
 * Uses an offscreen Three.js renderer to capture a head/upper-body shot
 * of each NPC model. Caches results as data URLs for use in DialogueUI.
 */

import * as THREE from 'three';

export class PortraitRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cache: Map<string, string> = new Map();

  private static readonly SIZE = 200;  // Portrait resolution (square)

  constructor() {
    // Small offscreen renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(PortraitRenderer.SIZE, PortraitRenderer.SIZE);
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);

    // Scene with portrait lighting
    this.scene = new THREE.Scene();

    const keyLight = new THREE.DirectionalLight(0xfff5ee, 1.8);
    keyLight.position.set(2, 3, 4);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xb0c4de, 0.6);
    fillLight.position.set(-2, 1, 2);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd700, 0.4);
    rimLight.position.set(0, 2, -3);
    this.scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0x404060, 0.5);
    this.scene.add(ambient);

    // Camera
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  }

  /**
   * Get a cached portrait or render one from the NPC mesh
   */
  getPortrait(key: string, mesh: THREE.Object3D): string {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const dataUrl = this.render(mesh);
    this.cache.set(key, dataUrl);
    return dataUrl;
  }

  /**
   * Check if a portrait is already cached
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Render a Three.js object to a portrait data URL
   */
  private render(source: THREE.Object3D): string {
    // Clone the model so we don't disturb the scene
    const clone = source.clone(true);

    // Reset world transform — we only care about the model's own shape
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);

    this.scene.add(clone);

    // Measure the clone's bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Frame the upper portion (head & shoulders)
    // Target point: ~75% up the model height
    const frameTarget = new THREE.Vector3(
      center.x,
      box.min.y + size.y * 0.72,
      center.z
    );

    // Camera distance scales with model size — show upper ~40% of model
    const frameHeight = size.y * 0.45;
    const fovRad = THREE.MathUtils.degToRad(this.camera.fov);
    const dist = (frameHeight / 2) / Math.tan(fovRad / 2);

    // Slight angle from above for a flattering portrait
    this.camera.position.set(
      frameTarget.x + dist * 0.15,
      frameTarget.y + dist * 0.1,
      frameTarget.z + dist
    );
    this.camera.lookAt(frameTarget);

    // Render
    this.renderer.render(this.scene, this.camera);
    const dataUrl = this.renderer.domElement.toDataURL('image/png');

    // Cleanup
    this.scene.remove(clone);

    return dataUrl;
  }

  /**
   * Pre-render portraits for a batch of NPCs
   */
  renderBatch(npcs: { key: string; mesh: THREE.Object3D }[]): void {
    for (const { key, mesh } of npcs) {
      if (!this.cache.has(key)) {
        this.cache.set(key, this.render(mesh));
      }
    }
  }

  dispose(): void {
    this.renderer.dispose();
    this.cache.clear();
  }
}
