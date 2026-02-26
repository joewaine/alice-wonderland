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

  // Route to specific builders for complex assets
  if (assetId.startsWith('hedge')) {
    return createHedgeFallback(assetId);
  } else if (assetId.startsWith('rose_bush')) {
    return createRoseBushFallback(assetId);
  } else if (assetId.startsWith('fountain')) {
    return createFountainFallback();
  } else if (assetId.startsWith('topiary')) {
    return createTopiaryFallback(assetId);
  } else if (assetId.startsWith('gazebo')) {
    return createGazeboFallback();
  }

  // Simple fallbacks for other assets
  const presetName = getMaterialPreset(assetId);
  const preset = MATERIAL_PRESETS[presetName];

  let geometry: THREE.BufferGeometry;

  if (assetId.startsWith('stone_path')) {
    geometry = createStonePath();
  } else if (assetId.startsWith('grass')) {
    geometry = new THREE.BoxGeometry(4, 0.3, 4);
  } else if (assetId.startsWith('stairs')) {
    geometry = new THREE.BoxGeometry(3, 0.5, 1);
  } else if (assetId.includes('bench')) {
    return createBenchFallback();
  } else if (assetId.includes('chair')) {
    return createChairFallback();
  } else if (assetId.includes('table')) {
    return createTableFallback();
  } else if (assetId.startsWith('lantern')) {
    return createLanternFallback();
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
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  addOutlinesToObject(group, { color: 0x2D3748, thickness: 0.015 });
  return group;
}

/**
 * Create organic-looking hedge with vertex noise
 * Supports straight, corner, and t-junction variants
 */
function createHedgeFallback(assetId: string): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['hedge'];

  const material = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xA8D8A8,
    rimColor: preset.rimColor,
    rimPower: 2.5,
    steps: 3,
  });

  // Create hedge segment with noise
  const createHedgeSegment = (width: number, depth: number): THREE.Mesh => {
    const geometry = new THREE.BoxGeometry(width, 2, depth, 8, 4, 2);
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      if (Math.abs(y) > 0.8 || Math.abs(x) > width * 0.45 || Math.abs(z) > depth * 0.4) {
        const noise = (Math.random() - 0.5) * 0.15;
        positions.setX(i, x + noise);
        positions.setY(i, y + noise * 0.5);
        positions.setZ(i, z + noise);
      }
    }
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material.clone());
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  // Build hedge shape based on variant
  if (assetId.includes('corner')) {
    // L-shaped corner hedge
    const seg1 = createHedgeSegment(4, 1);
    seg1.position.set(-1, 1, 0);
    group.add(seg1);

    const seg2 = createHedgeSegment(1, 4);
    seg2.position.set(1.5, 1, -1.5);
    group.add(seg2);
  } else if (assetId.includes('tjunction')) {
    // T-junction hedge
    const mainSeg = createHedgeSegment(6, 1);
    mainSeg.position.set(0, 1, 0);
    group.add(mainSeg);

    const branchSeg = createHedgeSegment(1, 3);
    branchSeg.position.set(0, 1, -2);
    group.add(branchSeg);
  } else {
    // Standard straight hedge
    const mainMesh = createHedgeSegment(4, 1);
    mainMesh.position.y = 1;
    group.add(mainMesh);
  }

  // Add leaf clusters on top
  const leafCount = assetId.includes('corner') || assetId.includes('tjunction') ? 8 : 5;
  for (let i = 0; i < leafCount; i++) {
    const leafGeo = new THREE.SphereGeometry(0.3, 6, 4);
    const leafMat = createCelShaderMaterial({
      color: new THREE.Color(0x3D7A37),
      shadowColor: 0x1A3518,
      highlightColor: 0xB8E8B8,
      rimColor: 0x88CC88,
      rimPower: 2.0,
      steps: 3,
    });
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    // Spread leaves across the hedge shape
    const spreadX = assetId.includes('corner') ? 4 : assetId.includes('tjunction') ? 5 : 3;
    const spreadZ = assetId.includes('corner') || assetId.includes('tjunction') ? 3 : 0.6;
    leaf.position.set(
      (Math.random() - 0.5) * spreadX,
      2.1 + Math.random() * 0.2,
      (Math.random() - 0.5) * spreadZ
    );
    leaf.scale.setScalar(0.8 + Math.random() * 0.4);
    leaf.castShadow = true;
    group.add(leaf);
  }

  addOutlinesToObject(group, { color: 0x1A3518, thickness: 0.012 });
  return group;
}

/**
 * Create rose bush with clustered flower spheres
 */
function createRoseBushFallback(assetId: string): THREE.Group {
  const group = new THREE.Group();

  // Determine rose color
  let roseColor = 0xC41E3A;
  let presetName: keyof typeof MATERIAL_PRESETS = 'rose_red';
  if (assetId.includes('white')) {
    roseColor = 0xFAFAFA;
    presetName = 'rose_white';
  } else if (assetId.includes('pink')) {
    roseColor = 0xFF69B4;
    presetName = 'rose_pink';
  }
  const preset = MATERIAL_PRESETS[presetName];

  // Green bush base
  const bushGeo = new THREE.SphereGeometry(0.6, 12, 8);
  const bushMat = createCelShaderMaterial({
    color: new THREE.Color(0x2D5A27),
    shadowColor: 0x1A3518,
    highlightColor: 0x88CC88,
    rimColor: 0x4A7C3F,
    rimPower: 2.5,
    steps: 3,
  });
  const bush = new THREE.Mesh(bushGeo, bushMat);
  bush.position.y = 0.4;
  bush.scale.set(1, 0.8, 1);
  bush.castShadow = true;
  group.add(bush);

  // Rose flower clusters
  const rosePositions = [
    { x: 0, y: 0.9, z: 0 },
    { x: 0.3, y: 0.7, z: 0.2 },
    { x: -0.25, y: 0.75, z: -0.15 },
    { x: 0.15, y: 0.65, z: -0.25 },
    { x: -0.2, y: 0.8, z: 0.2 },
  ];

  for (const pos of rosePositions) {
    const roseGeo = new THREE.SphereGeometry(0.15, 8, 6);
    const roseMat = createCelShaderMaterial({
      color: new THREE.Color(roseColor),
      shadowColor: preset.shadowColor,
      highlightColor: 0xFFF0F5,
      rimColor: preset.rimColor,
      rimPower: 2.0,
      steps: 3,
    });
    const rose = new THREE.Mesh(roseGeo, roseMat);
    rose.position.set(pos.x, pos.y, pos.z);
    rose.scale.setScalar(0.8 + Math.random() * 0.4);
    rose.castShadow = true;
    group.add(rose);
  }

  addOutlinesToObject(group, { color: 0x2D3748, thickness: 0.01 });
  return group;
}

/**
 * Create multi-tiered fountain
 */
function createFountainFallback(): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['marble'];

  // Base pool
  const poolGeo = new THREE.CylinderGeometry(2, 2.2, 0.5, 16);
  const poolMat = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xFFFFFF,
    rimColor: preset.rimColor,
    rimPower: 3.0,
    steps: 3,
  });
  const pool = new THREE.Mesh(poolGeo, poolMat);
  pool.position.y = 0.25;
  pool.castShadow = true;
  pool.receiveShadow = true;
  group.add(pool);

  // Water surface
  const waterGeo = new THREE.CylinderGeometry(1.8, 1.8, 0.1, 16);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x88CCDD,
    transparent: true,
    opacity: 0.6,
    metalness: 0.1,
    roughness: 0.2,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = 0.45;
  group.add(water);

  // Middle tier
  const midGeo = new THREE.CylinderGeometry(0.8, 1, 0.8, 12);
  const mid = new THREE.Mesh(midGeo, poolMat.clone());
  mid.position.y = 0.9;
  mid.castShadow = true;
  group.add(mid);

  // Central column
  const colGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.2, 8);
  const col = new THREE.Mesh(colGeo, poolMat.clone());
  col.position.y = 1.9;
  col.castShadow = true;
  group.add(col);

  // Top bowl
  const topGeo = new THREE.SphereGeometry(0.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const top = new THREE.Mesh(topGeo, poolMat.clone());
  top.position.y = 2.5;
  top.rotation.x = Math.PI;
  top.castShadow = true;
  group.add(top);

  addOutlinesToObject(group, { color: 0xA0A0A0, thickness: 0.015 });
  return group;
}

/**
 * Create topiary with specific shapes
 */
function createTopiaryFallback(assetId: string): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['grass'];

  const material = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xA8D8A8,
    rimColor: preset.rimColor,
    rimPower: 2.5,
    steps: 3,
  });

  // Pot/base
  const potGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.4, 8);
  const potMat = createCelShaderMaterial({
    color: new THREE.Color(0x8B4513),
    shadowColor: 0x5D3A1A,
    highlightColor: 0xD2B48C,
    rimColor: 0xA0522D,
    rimPower: 2.0,
    steps: 3,
  });
  const pot = new THREE.Mesh(potGeo, potMat);
  pot.position.y = 0.2;
  pot.castShadow = true;
  group.add(pot);

  // Stem
  const stemGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6);
  const stemMat = createCelShaderMaterial({
    color: new THREE.Color(0x3D2817),
    shadowColor: 0x1A1008,
    highlightColor: 0x6B4423,
    rimColor: 0x4A3520,
    rimPower: 2.0,
    steps: 3,
  });
  const stem = new THREE.Mesh(stemGeo, stemMat);
  stem.position.y = 0.7;
  group.add(stem);

  // Shape based on asset ID
  if (assetId.includes('sphere')) {
    const sphereGeo = new THREE.SphereGeometry(0.6, 12, 10);
    const sphere = new THREE.Mesh(sphereGeo, material);
    sphere.position.y = 1.5;
    sphere.castShadow = true;
    group.add(sphere);
  } else if (assetId.includes('spiral')) {
    // Stack of shrinking spheres for spiral effect
    for (let i = 0; i < 4; i++) {
      const size = 0.5 - i * 0.1;
      const spiralGeo = new THREE.SphereGeometry(size, 10, 8);
      const spiralMesh = new THREE.Mesh(spiralGeo, material.clone());
      spiralMesh.position.y = 1.1 + i * 0.35;
      spiralMesh.position.x = Math.sin(i * 0.8) * 0.1;
      spiralMesh.position.z = Math.cos(i * 0.8) * 0.1;
      spiralMesh.castShadow = true;
      group.add(spiralMesh);
    }
  } else if (assetId.includes('heart')) {
    // Heart approximation with two spheres
    const heartGeo = new THREE.SphereGeometry(0.4, 10, 8);
    const heart1 = new THREE.Mesh(heartGeo, material);
    heart1.position.set(-0.2, 1.5, 0);
    heart1.castShadow = true;
    group.add(heart1);

    const heart2 = new THREE.Mesh(heartGeo.clone(), material.clone());
    heart2.position.set(0.2, 1.5, 0);
    heart2.castShadow = true;
    group.add(heart2);

    // Bottom point
    const pointGeo = new THREE.ConeGeometry(0.35, 0.5, 8);
    const point = new THREE.Mesh(pointGeo, material.clone());
    point.position.y = 1.15;
    point.rotation.x = Math.PI;
    point.castShadow = true;
    group.add(point);
  }

  addOutlinesToObject(group, { color: 0x1A3518, thickness: 0.012 });
  return group;
}

/**
 * Create gazebo structure
 */
function createGazeboFallback(): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['wood'];

  const pillarMat = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xA1887F,
    rimColor: preset.rimColor,
    rimPower: 2.5,
    steps: 3,
  });

  // Floor
  const floorGeo = new THREE.CylinderGeometry(3, 3, 0.2, 6);
  const floor = new THREE.Mesh(floorGeo, pillarMat);
  floor.position.y = 0.1;
  floor.receiveShadow = true;
  group.add(floor);

  // Pillars
  const pillarGeo = new THREE.CylinderGeometry(0.15, 0.18, 3, 8);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const pillar = new THREE.Mesh(pillarGeo, pillarMat.clone());
    pillar.position.set(
      Math.cos(angle) * 2.5,
      1.7,
      Math.sin(angle) * 2.5
    );
    pillar.castShadow = true;
    group.add(pillar);
  }

  // Roof
  const roofGeo = new THREE.ConeGeometry(3.5, 1.5, 6);
  const roofMat = createCelShaderMaterial({
    color: new THREE.Color(0xB22222),
    shadowColor: 0x8B0000,
    highlightColor: 0xCD5C5C,
    rimColor: 0xDC143C,
    rimPower: 2.5,
    steps: 3,
  });
  const roof = new THREE.Mesh(roofGeo, roofMat);
  roof.position.y = 3.9;
  roof.castShadow = true;
  group.add(roof);

  addOutlinesToObject(group, { color: 0x2D3748, thickness: 0.015 });
  return group;
}

/**
 * Create stone path with irregular shapes
 */
function createStonePath(): THREE.BufferGeometry {
  const geometry = new THREE.BoxGeometry(4, 0.15, 4, 4, 1, 4);

  // Add slight irregularity
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    if (Math.abs(y) > 0.05) {
      const noise = (Math.random() - 0.5) * 0.05;
      positions.setY(i, y + noise);
    }
  }
  geometry.computeVertexNormals();

  return geometry;
}

/**
 * Create garden bench
 */
function createBenchFallback(): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['wood'];

  const woodMat = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xA1887F,
    rimColor: preset.rimColor,
    rimPower: 2.5,
    steps: 3,
  });

  // Seat
  const seatGeo = new THREE.BoxGeometry(2, 0.1, 0.5);
  const seat = new THREE.Mesh(seatGeo, woodMat);
  seat.position.y = 0.5;
  seat.castShadow = true;
  group.add(seat);

  // Back rest
  const backGeo = new THREE.BoxGeometry(2, 0.6, 0.08);
  const back = new THREE.Mesh(backGeo, woodMat.clone());
  back.position.set(0, 0.85, -0.2);
  back.castShadow = true;
  group.add(back);

  // Legs
  const legGeo = new THREE.BoxGeometry(0.1, 0.5, 0.4);
  const positions = [[-0.8, 0.25, 0], [0.8, 0.25, 0]];
  for (const [x, y, z] of positions) {
    const leg = new THREE.Mesh(legGeo, woodMat.clone());
    leg.position.set(x, y, z);
    leg.castShadow = true;
    group.add(leg);
  }

  addOutlinesToObject(group, { color: 0x2D3748, thickness: 0.012 });
  return group;
}

/**
 * Create ornate chair
 */
function createChairFallback(): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['wood'];

  const woodMat = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xA1887F,
    rimColor: preset.rimColor,
    rimPower: 2.5,
    steps: 3,
  });

  // Seat
  const seatGeo = new THREE.BoxGeometry(0.5, 0.08, 0.5);
  const seat = new THREE.Mesh(seatGeo, woodMat);
  seat.position.y = 0.45;
  seat.castShadow = true;
  group.add(seat);

  // Back
  const backGeo = new THREE.BoxGeometry(0.5, 0.7, 0.06);
  const back = new THREE.Mesh(backGeo, woodMat.clone());
  back.position.set(0, 0.8, -0.22);
  back.castShadow = true;
  group.add(back);

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.45, 6);
  const legPositions = [
    [-0.18, 0.225, 0.18],
    [0.18, 0.225, 0.18],
    [-0.18, 0.225, -0.18],
    [0.18, 0.225, -0.18],
  ];
  for (const [x, y, z] of legPositions) {
    const leg = new THREE.Mesh(legGeo, woodMat.clone());
    leg.position.set(x, y, z);
    leg.castShadow = true;
    group.add(leg);
  }

  addOutlinesToObject(group, { color: 0x2D3748, thickness: 0.01 });
  return group;
}

/**
 * Create tea table
 */
function createTableFallback(): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['wood'];

  const woodMat = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xA1887F,
    rimColor: preset.rimColor,
    rimPower: 2.5,
    steps: 3,
  });

  // Table top
  const topGeo = new THREE.CylinderGeometry(1.2, 1.2, 0.1, 12);
  const top = new THREE.Mesh(topGeo, woodMat);
  top.position.y = 0.8;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Central pedestal
  const pedestalGeo = new THREE.CylinderGeometry(0.15, 0.25, 0.75, 8);
  const pedestal = new THREE.Mesh(pedestalGeo, woodMat.clone());
  pedestal.position.y = 0.375;
  pedestal.castShadow = true;
  group.add(pedestal);

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.08, 12);
  const base = new THREE.Mesh(baseGeo, woodMat.clone());
  base.position.y = 0.04;
  base.receiveShadow = true;
  group.add(base);

  addOutlinesToObject(group, { color: 0x2D3748, thickness: 0.012 });
  return group;
}

/**
 * Create lantern
 */
function createLanternFallback(): THREE.Group {
  const group = new THREE.Group();
  const preset = MATERIAL_PRESETS['gold'];

  const goldMat = createCelShaderMaterial({
    color: new THREE.Color(preset.color),
    shadowColor: preset.shadowColor,
    highlightColor: 0xFFEC8B,
    rimColor: preset.rimColor,
    rimPower: 2.0,
    steps: 3,
  });

  // Base
  const baseGeo = new THREE.CylinderGeometry(0.15, 0.18, 0.1, 6);
  const base = new THREE.Mesh(baseGeo, goldMat);
  base.position.y = 0.05;
  base.castShadow = true;
  group.add(base);

  // Glass body (transparent cel-shader)
  const glassGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.3, 6);
  const glassMat = createCelShaderMaterial({
    color: new THREE.Color(0xFFE4B5),
    shadowColor: 0xDDC090,
    highlightColor: 0xFFF8DC,
    rimColor: 0xFFD700,
    rimPower: 2.0,
    transparent: true,
    opacity: 0.8,
  });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  glass.position.y = 0.25;
  group.add(glass);

  // Top cap
  const capGeo = new THREE.ConeGeometry(0.15, 0.15, 6);
  const cap = new THREE.Mesh(capGeo, goldMat.clone());
  cap.position.y = 0.47;
  cap.castShadow = true;
  group.add(cap);

  // Handle
  const handleGeo = new THREE.TorusGeometry(0.08, 0.02, 4, 8, Math.PI);
  const handle = new THREE.Mesh(handleGeo, goldMat.clone());
  handle.position.y = 0.55;
  handle.rotation.x = Math.PI;
  group.add(handle);

  addOutlinesToObject(group, { color: 0xB8860B, thickness: 0.008 });
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
