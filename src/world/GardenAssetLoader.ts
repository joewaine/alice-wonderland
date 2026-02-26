/**
 * GardenAssetLoader - Loads and styles garden assets for Queen's Garden level
 *
 * Wraps AssetLoader to apply cel-shading and outlines to garden GLB models.
 * Falls back to procedural geometry when assets aren't available.
 */

import * as THREE from 'three';
import { assetLoader } from '../engine/AssetLoader';
import { createCelShaderMaterial } from '../shaders/CelShaderMaterial';
import { addOutlinesToObject } from '../shaders/OutlineEffect';

// Asset ID to path mapping
const GARDEN_ASSETS: Record<string, string> = {
  // Platforms / Walls
  'hedge_straight': 'assets/models/garden/hedge_straight.glb',
  'hedge_corner': 'assets/models/garden/hedge_corner.glb',
  'hedge_tjunction': 'assets/models/garden/hedge_tjunction.glb',
  'stone_path': 'assets/models/garden/stone_path.glb',
  'stone_path_curved': 'assets/models/garden/stone_path_curved.glb',
  'grass_platform': 'assets/models/garden/grass_platform.glb',

  // Centerpieces
  'fountain': 'assets/models/garden/fountain.glb',
  'gazebo': 'assets/models/garden/gazebo.glb',
  'throne': 'assets/models/garden/throne.glb',

  // Decorations
  'rose_bush_red': 'assets/models/garden/rose_bush_red.glb',
  'rose_bush_white': 'assets/models/garden/rose_bush_white.glb',
  'rose_bush_pink': 'assets/models/garden/rose_bush_pink.glb',
  'topiary_sphere': 'assets/models/garden/topiary_sphere.glb',
  'topiary_spiral': 'assets/models/garden/topiary_spiral.glb',
  'topiary_heart': 'assets/models/garden/topiary_heart.glb',

  // Props
  'garden_bench': 'assets/models/garden/garden_bench.glb',
  'lantern': 'assets/models/garden/lantern.glb',
  'tea_table': 'assets/models/garden/tea_table.glb',
  'chair_ornate': 'assets/models/garden/chair_ornate.glb',
  'playing_card': 'assets/models/garden/playing_card.glb',

  // Stairs
  'stairs_stone': 'assets/models/garden/stairs_stone.glb',
  'stairs_grass': 'assets/models/garden/stairs_grass.glb',
};

// Material presets based on style_bible.json
const MATERIAL_PRESETS: Record<string, {
  color: number;
  shadowColor: number;
  rimColor: number;
  emissive?: number;
}> = {
  'hedge': { color: 0x2D5A27, shadowColor: 0x1A3518, rimColor: 0x88CC88 },
  'rose_red': { color: 0xC41E3A, shadowColor: 0x8B0000, rimColor: 0xFF6B6B, emissive: 0.1 },
  'rose_white': { color: 0xFAFAFA, shadowColor: 0xE8E8E8, rimColor: 0xFFFFFF },
  'rose_pink': { color: 0xFF69B4, shadowColor: 0xDB7093, rimColor: 0xFFB6C1 },
  'stone': { color: 0xD2B48C, shadowColor: 0x8B7355, rimColor: 0xE8DCC4 },
  'marble': { color: 0xFAFAFA, shadowColor: 0xC0C0C0, rimColor: 0xFFFFFF },
  'gold': { color: 0xFFD700, shadowColor: 0xB8860B, rimColor: 0xFFEC8B, emissive: 0.05 },
  'grass': { color: 0x4A7C3F, shadowColor: 0x2D5A27, rimColor: 0x7CCD7C },
  'wood': { color: 0x5D4037, shadowColor: 0x3E2723, rimColor: 0x8D6E63 },
};

// Map asset prefixes to material presets
function getMaterialPreset(assetId: string): keyof typeof MATERIAL_PRESETS {
  if (assetId.startsWith('hedge')) return 'hedge';
  if (assetId.startsWith('rose_bush_red')) return 'rose_red';
  if (assetId.startsWith('rose_bush_white')) return 'rose_white';
  if (assetId.startsWith('rose_bush_pink')) return 'rose_pink';
  if (assetId.startsWith('stone') || assetId.startsWith('stairs_stone')) return 'stone';
  if (assetId.startsWith('fountain') || assetId.startsWith('throne')) return 'marble';
  if (assetId.startsWith('topiary') || assetId.startsWith('grass')) return 'grass';
  if (assetId.includes('chair') || assetId.includes('bench') || assetId.includes('table') || assetId.startsWith('gazebo')) return 'wood';
  if (assetId.startsWith('lantern')) return 'gold';
  return 'stone';  // Default
}

/**
 * Load a garden asset by ID, applying cel-shader and outlines
 */
export async function loadGardenAsset(assetId: string): Promise<THREE.Group> {
  const path = GARDEN_ASSETS[assetId];

  if (!path) {
    console.warn(`GardenAssetLoader: Unknown asset ID "${assetId}", using fallback`);
    return createFallbackAsset(assetId);
  }

  try {
    const model = await assetLoader.loadModel(path);
    applyGardenStyling(model, assetId);
    return model;
  } catch (error) {
    console.warn(`GardenAssetLoader: Failed to load "${assetId}", using fallback`);
    return createFallbackAsset(assetId);
  }
}

/**
 * Apply cel-shader material and outlines to a garden model
 */
function applyGardenStyling(model: THREE.Group, assetId: string): void {
  const presetName = getMaterialPreset(assetId);
  const preset = MATERIAL_PRESETS[presetName];

  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Get original color if available, otherwise use preset
      let color = preset.color;
      const originalMat = child.material as THREE.MeshStandardMaterial;
      if (originalMat?.color) {
        // Blend original color with preset (favor original)
        color = originalMat.color.getHex();
      }

      // Create cel-shader material
      child.material = createCelShaderMaterial({
        color: new THREE.Color(color),
        shadowColor: preset.shadowColor,
        highlightColor: 0xFFF8E7,
        rimColor: preset.rimColor,
        rimPower: 3.0,
        steps: 3,
      });

      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  // Add outlines
  const outlineThickness = assetId.includes('rose') ? 0.012 : 0.015;
  addOutlinesToObject(model, {
    color: 0x2D3748,
    thickness: outlineThickness,
  });
}

/**
 * Create a fallback procedural mesh when asset isn't available
 */
function createFallbackAsset(assetId: string): THREE.Group {
  const group = new THREE.Group();
  const presetName = getMaterialPreset(assetId);
  const preset = MATERIAL_PRESETS[presetName];

  let geometry: THREE.BufferGeometry;
  let scale = 1;

  // Choose geometry based on asset type
  if (assetId.startsWith('hedge')) {
    geometry = new THREE.BoxGeometry(4, 2, 1);
  } else if (assetId.startsWith('stone_path')) {
    geometry = new THREE.BoxGeometry(4, 0.2, 4);
  } else if (assetId.startsWith('grass')) {
    geometry = new THREE.BoxGeometry(4, 0.3, 4);
  } else if (assetId.startsWith('fountain')) {
    geometry = new THREE.CylinderGeometry(1.5, 2, 1.5, 16);
  } else if (assetId.startsWith('rose_bush')) {
    geometry = new THREE.SphereGeometry(0.8, 12, 8);
    scale = 1;
  } else if (assetId.startsWith('topiary')) {
    geometry = new THREE.SphereGeometry(1, 12, 8);
  } else if (assetId.startsWith('stairs')) {
    // Create simple stair shape
    geometry = new THREE.BoxGeometry(3, 0.5, 1);
  } else if (assetId.includes('bench') || assetId.includes('chair')) {
    geometry = new THREE.BoxGeometry(1.5, 0.8, 0.8);
  } else if (assetId.includes('table')) {
    geometry = new THREE.CylinderGeometry(0.8, 0.8, 0.8, 8);
  } else if (assetId.startsWith('lantern')) {
    geometry = new THREE.OctahedronGeometry(0.3);
  } else if (assetId.startsWith('gazebo')) {
    geometry = new THREE.CylinderGeometry(3, 3, 3, 6);
  } else {
    geometry = new THREE.BoxGeometry(2, 1, 2);
  }

  const material = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xFFF8E7,
    rimColor: preset.rimColor,
    rimPower: 3.0,
    steps: 3,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.setScalar(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // Add outlines
  addOutlinesToObject(group, {
    color: 0x2D3748,
    thickness: 0.015,
  });

  return group;
}

/**
 * Check if an asset ID has a registered path
 */
export function hasGardenAsset(assetId: string): boolean {
  return assetId in GARDEN_ASSETS;
}

/**
 * Get all registered asset IDs
 */
export function getGardenAssetIds(): string[] {
  return Object.keys(GARDEN_ASSETS);
}

/**
 * Preload garden assets for faster level loading
 */
export async function preloadGardenAssets(assetIds: string[]): Promise<void> {
  const paths = assetIds
    .filter(id => id in GARDEN_ASSETS)
    .map(id => GARDEN_ASSETS[id]);

  await assetLoader.preloadModels(paths);
}
