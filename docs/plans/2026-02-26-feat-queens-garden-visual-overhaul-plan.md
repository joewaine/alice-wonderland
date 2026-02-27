---
title: "feat: Queen's Garden Visual Overhaul"
type: feat
status: active
date: 2026-02-26
brainstorm: docs/brainstorms/2026-02-26-queens-garden-visual-overhaul-brainstorm.md
---

# Queen's Garden Visual Overhaul

## Overview

Transform Alice in Wonderland from a prototype into a polished showcase game with **Breath of the Wild-inspired** cel-shaded visuals. This overhaul replaces the existing 4 chapters with a single, beautifully crafted Queen's Garden level featuring:

- Custom cel-shading render pipeline
- AI-generated textured assets (Meshy/Tripo)
- Seamless painterly skybox (Blockade Labs)
- Fully animated Alice with skeletal rig (Mixamo)
- Animated NPCs with idle/talk animations

**Quality Bar:** Finished game feel, not a prototype.

## Technical Approach

### Asset Pipeline

```
Skybox:     Blockade Labs → 360° HDRI → CubeTexture with anisotropic filtering
Platforms:  Meshy/Tripo → Textured GLB → Cel-shader material
Characters: Meshy → Mixamo (rig + animate) → AnimationMixer integration
Props:      Meshy/Tripo → Textured GLB → Scene placement
```

### Rendering Stack

- **Cel-Shading:** Custom ShaderMaterial with stepped lighting
- **Outlines:** Inverted hull technique (scaled geometry with backface)
- **Shadows:** Hard-edge shadow maps (compatible with cel-shading)
- **Post-Processing:** Optional subtle bloom

---

## Implementation Phases

### Phase 1: Cel-Shader Foundation

Build the custom rendering pipeline before assets arrive.

#### 1.1 Create Cel-Shader Material

**File:** `src/shaders/CelShaderMaterial.ts` (new)

```typescript
// Custom ShaderMaterial with:
// - 3-step lighting (shadow, mid, highlight)
// - Rim lighting for depth
// - Support for textures
// - Hard shadow cutoff
```

**Tasks:**
- [x] Create vertex shader with normal/position output
- [x] Create fragment shader with stepped diffuse lighting
- [x] Add rim lighting uniform (camera-relative edge glow)
- [x] Support albedo texture sampling
- [ ] Add shadow map integration with hard cutoff (deferred - cel-shader handles shadows internally)

#### 1.2 Create Outline Effect

**File:** `src/shaders/OutlineEffect.ts` (new)

```typescript
// Inverted hull outline:
// - Clone geometry, scale slightly, flip normals
// - Render with solid color (dark outline)
// - Group original mesh + outline mesh
```

**Tasks:**
- [x] Create outline geometry generator (scale + invert)
- [x] Create outline material (unlit, single color)
- [x] Helper function: `createOutlinedMesh(geometry, material, outlineWidth)`

#### 1.3 Update Lighting for Cel-Shading

**File:** `src/Game.ts` (modify setupLighting)

**Tasks:**
- [x] Switch shadow type from `PCFSoftShadowMap` to `BasicShadowMap` (hard edges)
- [x] Adjust directional light angle for dramatic shadows
- [x] Reduce ambient intensity (cel-shading needs contrast)

---

### Phase 2: Skybox Generation

Create seamless painterly skybox via Blockade Labs.

#### 2.1 Generate Skybox

**External Tool:** Blockade Labs (https://skybox.blockadelabs.com/)

**Prompt Strategy:**
```
Style: Anime / Ghibli painterly
Prompt: "Soft blue sky with fluffy white clouds, hand-painted watercolor style,
        dreamy afternoon atmosphere, subtle golden hour lighting,
        whimsical storybook illustration"
Negative: "realistic, photorealistic, dark, stormy, night, ground, horizon"
```

**Tasks:**
- [ ] Generate 3-5 skybox candidates in Blockade Labs
- [ ] Select best match for BotW aesthetic
- [ ] Download as equirectangular HDRI
- [ ] Convert to cubemap format if needed

#### 2.2 Integrate New Skybox

**File:** `src/engine/SceneManager.ts` (modify loadSkybox)

**Tasks:**
- [ ] Replace chapter-based skybox loading with single Queen's Garden skybox
- [ ] Ensure anisotropic filtering configured (per existing learnings)
- [ ] Test 360° rotation for seam visibility
- [ ] Create matching gradient fallback

**File:** `public/assets/skyboxes/queens_garden.png` (new asset)

---

### Phase 3: Platform Assets

Replace procedural box geometry with organic textured meshes.

#### 3.1 Generate Platform Assets

**External Tool:** Meshy or Tripo AI

**Assets Needed:**

| Asset | Description | Dimensions |
|-------|-------------|------------|
| `hedge_straight.glb` | Straight hedge wall section | ~4x2x1 units |
| `hedge_corner.glb` | 90° hedge corner piece | ~2x2x2 units |
| `hedge_arch.glb` | Archway through hedge | ~3x3x1 units |
| `stone_path.glb` | Cobblestone path section | ~4x0.2x2 units |
| `rose_bush_red.glb` | Red rose decorative cluster | ~1x1x1 units |
| `rose_bush_white.glb` | White rose decorative cluster | ~1x1x1 units |
| `fountain.glb` | Royal garden fountain | ~4x3x4 units |
| `topiary.glb` | Shaped hedge decoration | ~2x3x2 units |

**Prompt Template:**
```
"Low-poly stylized [ITEM], cel-shaded game asset,
 Breath of the Wild art style, soft colors,
 clean topology, game-ready"
```

**Tasks:**
- [ ] Generate each asset in Meshy/Tripo
- [ ] Review and refine for style consistency
- [ ] Export as GLB with embedded textures
- [ ] Optimize polygon count (<5k per asset)

#### 3.2 Create Platform Asset Loader

**File:** `src/world/GardenAssetLoader.ts` (new)

```typescript
export class GardenAssetLoader {
  private assetCache: Map<string, THREE.Group> = new Map();

  async loadHedge(type: 'straight' | 'corner' | 'arch'): Promise<THREE.Group>
  async loadPath(): Promise<THREE.Group>
  async loadDecor(type: 'rose_red' | 'rose_white' | 'fountain' | 'topiary'): Promise<THREE.Group>
}
```

**Tasks:**
- [ ] Create asset loader with caching (mirror AssetLoader pattern)
- [ ] Apply cel-shader material to loaded meshes
- [ ] Add outline effect to each asset
- [ ] Implement fallback to colored box if asset fails

#### 3.3 Update LevelBuilder for Garden Assets

**File:** `src/world/LevelBuilder.ts` (modify buildPlatforms)

**Tasks:**
- [ ] Detect Queen's Garden level (chapter_number or level_id)
- [ ] Replace BoxGeometry creation with GardenAssetLoader calls
- [ ] Map platform types to asset types (e.g., `type: "hedge"` → hedge_straight.glb)
- [ ] Maintain physics collider as cuboid (simpler than mesh collider)

---

### Phase 4: Character Animation System

Implement skeletal animation before generating new character models.

#### 4.1 Create Animation State Manager

**File:** `src/animation/AnimationStateManager.ts` (new)

```typescript
export type AnimationState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'land' | 'groundPound';

export class AnimationStateManager {
  private mixer: THREE.AnimationMixer;
  private currentState: AnimationState = 'idle';
  private animations: Map<AnimationState, THREE.AnimationAction>;

  setState(newState: AnimationState, crossFadeDuration: number = 0.2): void
  update(dt: number): void
}
```

**Tasks:**
- [x] Create state machine with crossfade support
- [x] Define transition priorities (ground pound interrupts all)
- [x] Add hooks for PlayerController to trigger state changes
- [x] Support animation speed scaling (for size changes)

#### 4.2 Integrate Animation with PlayerController

**File:** `src/player/PlayerController.ts` (modify)

**Tasks:**
- [x] Add AnimationStateManager reference
- [x] Call `setState('walk')` when momentum > threshold
- [x] Call `setState('jump')` in performJump()
- [x] Call `setState('groundPound')` in startGroundPound()
- [x] Call `setState('land')` in landing callback
- [x] Handle size-scaled animation speed

#### 4.3 Update NPC Animation System

**File:** `src/npcs/NPCController.ts` (modify)

**Tasks:**
- [x] Add animation flag to NPCObject interface
- [x] Skip procedural bob animation when skeletal rig present
- [x] Create simple idle animation mixer per NPC
- [x] Add talk animation trigger on dialogue interaction

---

### Phase 5: Character Model Generation

Generate and rig new character models.

#### 5.1 Generate Alice Model

**External Tools:** Meshy → Mixamo

**Prompt:**
```
"Young girl Alice in Wonderland, blue dress with white apron,
 blonde hair with black headband, stylized cartoon proportions,
 Breath of the Wild character style, cel-shaded, T-pose for rigging"
```

**Tasks:**
- [ ] Generate Alice model in Meshy
- [ ] Upload to Mixamo for auto-rigging
- [ ] Download animations: Idle, Walk, Run, Jump, Land
- [ ] Export as single GLB with embedded animations
- [ ] Test at all three size states (small, normal, large)

**File:** `public/assets/models/alice_animated.glb` (new asset)

#### 5.2 Generate Queen of Hearts Model

**Primary NPC:** Queen of Hearts (the showcase's focal character)

| Character | Description | Animations |
|-----------|-------------|------------|
| Queen of Hearts | Red dress, crown, dramatic | Idle, Talk, Angry |

**Tasks:**
- [ ] Generate Queen model in Meshy
- [ ] Rig via Mixamo
- [ ] Apply cel-shader + outlines
- [ ] Export with embedded animations

**File:** `public/assets/models/queen_animated.glb` (new)

> **Future NPCs:** Card Soldiers and White Rabbit can be added after core showcase is complete.

#### 5.3 Update Game.ts Player Setup

**File:** `src/Game.ts` (modify setupPlayer)

**Tasks:**
- [ ] Load `alice_animated.glb` instead of `alice.glb`
- [ ] Extract animation clips from GLTF
- [ ] Create AnimationMixer and AnimationStateManager
- [ ] Adjust collider dimensions if model proportions differ
- [ ] Apply cel-shader material to all meshes

---

### Phase 6: Queen's Garden Level Assembly

Create the actual level layout.

#### 6.1 Design Level Layout

**File:** `public/assets/fallback/queens_garden.json` (new)

**Layout Concept:** Linear path through garden to Queen

```
[SPAWN] → [GATE] → [ROSE PATH] → [FOUNTAIN PLAZA] → [HEDGE CORRIDOR] → [QUEEN'S THRONE]
```

Detailed layout:
```
                 [QUEEN'S THRONE]
                       |
              [HEDGE CORRIDOR]
                       |
              [FOUNTAIN PLAZA]
                       |
    [ROSE GARDEN] ─── PATH ─── [ROSE GARDEN]
                       |
                 [MAIN GATE]
                       |
                 [SPAWN POINT]
```

**Tasks:**
- [ ] Define spawn point and gate position
- [ ] Create linear hedge corridor from gate to throne
- [ ] Position rose gardens flanking the path
- [ ] Add fountain as central landmark
- [ ] Place Queen at throne area
- [ ] Add golden key collectible
- [ ] Keep existing mechanics (air currents, size changes) available but not required

#### 6.2 Create Level Data JSON

```json
{
  "chapter_number": 1,
  "chapter_title": "The Queen's Garden",
  "setting": "Royal hedge maze with roses and card soldiers",
  "spawn_point": { "x": 0, "y": 2, "z": 0 },
  "gate_position": { "x": 0, "y": 2, "z": -50 },
  "platforms": [
    { "type": "hedge_straight", "position": {...}, "rotation": {...} },
    { "type": "stone_path", "position": {...} }
  ],
  "decorations": [
    { "type": "rose_bush_red", "position": {...} },
    { "type": "fountain", "position": {...} }
  ],
  "npcs": [
    { "model_id": "queen_animated", "name": "Queen of Hearts", "position": { "x": 0, "y": 2, "z": -80 }, "dialogue": [...] }
  ],
  "atmosphere": {
    "skybox": "queens_garden",
    "fog_color": "#e8f4e8",
    "fog_near": 30,
    "fog_far": 150
  }
}
```

**Tasks:**
- [ ] Create queens_garden.json with full level data
- [ ] Update SceneManager to load Queen's Garden as default
- [ ] Remove or archive existing chapter JSON files
- [ ] Test navigation through entire level

---

### Phase 7: Polish & Integration

Final quality pass.

#### 7.1 Visual Polish

**Tasks:**
- [ ] Fine-tune cel-shader parameters (step thresholds, rim intensity)
- [ ] Adjust outline width for screen size
- [ ] Add subtle bloom post-processing
- [ ] Test fog integration with new visuals
- [ ] Verify shadow quality and direction

#### 7.2 Animation Polish

**Tasks:**
- [ ] Tune crossfade durations between states
- [ ] Fix any foot sliding issues
- [ ] Ensure animations loop cleanly
- [ ] Test all states at all size scales

#### 7.3 Performance Validation

**Tasks:**
- [ ] Profile frame rate with new assets loaded
- [ ] Verify no memory leaks during play session
- [ ] Check asset load times
- [ ] Optimize if needed (LOD, texture compression)

#### 7.4 Cleanup

**Tasks:**
- [ ] Remove unused chapter files (chapter_1-4.json, chapter_1-4.png)
- [ ] Update UI to remove chapter selection (single level)
- [ ] Update any remaining references to old chapters
- [ ] Final playtest end-to-end

---

## Acceptance Criteria

### Functional Requirements

- [ ] Seamless painterly skybox (no visible seams at 360°)
- [ ] All platforms use textured organic assets (no solid color boxes)
- [ ] Alice has working walk/idle/jump/land animations
- [ ] Queen of Hearts has idle animation
- [ ] Cel-shading applied consistently to all characters and platforms
- [ ] Outlines visible on all cel-shaded objects
- [ ] Level is fully playable from spawn to gate

### Non-Functional Requirements

- [ ] Maintains 60fps on mid-range hardware
- [ ] Asset load time < 5 seconds
- [ ] No memory leaks during 10-minute play session
- [ ] Visual style matches BotW aesthetic target

### Quality Gates

- [ ] All assets follow consistent art direction
- [ ] No console errors during normal play
- [ ] Movement mechanics unchanged (momentum, double jump, etc.)
- [ ] Size changing works correctly with animated model

---

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI-generated assets don't match style | Medium | High | Generate multiple candidates, refine prompts, have fallback assets |
| Mixamo rig doesn't work with custom model | Low | High | Use Mixamo's auto-rigger, test early |
| Cel-shader performance impact | Low | Medium | Profile early, optimize uniform usage |
| Animation state bugs | Medium | Medium | Extensive state machine testing |
| Skybox seams visible | Low | High | Use Blockade Labs (designed for seamless), test rotation |

---

## Dependencies

- **Blockade Labs** - Skybox generation (free tier available)
- **Meshy/Tripo** - 3D model generation (subscription may be needed)
- **Mixamo** - Character rigging and animation (free with Adobe account)
- **Three.js r183** - Already in project

---

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-02-26-queens-garden-visual-overhaul-brainstorm.md`
- Asset loading patterns: `src/engine/AssetLoader.ts:22-48`
- Skybox implementation: `src/engine/SceneManager.ts:134-225`
- Texture filtering learnings: `docs/solutions/integration-issues/skybox-quality-seams-artifacts.md`
- Memory management: `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md`

### External
- Three.js Toon Shading: https://threejs.org/examples/#webgl_materials_toon
- Mixamo: https://www.mixamo.com/
- Blockade Labs: https://skybox.blockadelabs.com/
- Meshy AI: https://www.meshy.ai/
