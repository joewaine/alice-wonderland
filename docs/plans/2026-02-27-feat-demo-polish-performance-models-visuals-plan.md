---
title: "feat: Demo polish — performance, models, and visual quality"
type: feat
status: active
date: 2026-02-27
brainstorm: docs/brainstorms/2026-02-27-demo-polish-brainstorm.md
---

# Demo Polish: Performance, Models, and Visual Quality

## Overview

Make the Alice in Wonderland 3D platformer demo-ready by: compressing all GLB models (~190MB → ~40MB), generating the 10 missing NPC models and all 25 garden environment models via Tripo3D, and implementing key performance optimizations (particle pooling, ray cleanup). The game should run smoothly with no purple capsule fallbacks and a visually rich garden environment.

## Problem Statement

Three visible gaps undermine the demo:

1. **10 NPCs render as purple capsules** — queen_of_hearts, cheshire_cat, mad_hatter, march_hare, dormouse, king/knave_of_hearts, card_painter, flamingo, hedgehog
2. **All 25 garden environment assets are procedural fallbacks** — colored boxes, stacked cylinders, and basic geometry instead of actual 3D models
3. **~190MB of uncompressed model data** with no Draco compression and several unresolved performance issues (particle creation per-frame, physics ray leak)

## Technical Approach

### Dependency Graph

```
Phase 1: Compression Foundation ─────────────────┐
  (install tooling, compress existing 14 models,  │
   wire DRACOLoader)                              │
                                                  ├──> Phase 4: Performance
Phase 2: Generate Missing NPCs ──> Compress ──────┤      Optimization
  (10 NPC models via Tripo3D)                     │
                                                  ├──> Phase 5: Integration
Phase 3: Generate Garden Assets ──> Compress ─────┘      & Polish
  (25 environment models via Tripo3D)
```

Phase 1 and Phases 2/3 can start in parallel. Phase 4's particle pooling and ray cleanup are independent of asset work and can also start early.

### Architecture

```
Asset Pipeline (build-time):
  Tripo3D API → raw .glb → gltf-transform (Draco + simplify) → compressed .glb

Runtime Loading:
  GLTFLoader + DRACOLoader → clone from cache → apply cel-shader → add outlines → place in scene
```

---

## Implementation Phases

### Phase 1: Compression Foundation

**Goal:** Install compression tooling, integrate DRACOLoader, compress existing 14 models.

#### 1.1 Install dependencies

```bash
npm install --save-dev @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf
```

Also copy Three.js Draco decoder files to public:

```bash
cp node_modules/three/examples/jsm/libs/draco/ public/draco/
```

#### 1.2 Create compression script

**New file:** `scripts/compress-models.ts`

- Reads all `.glb` files from `public/assets/models/` and `public/assets/models/garden/`
- Applies Draco compression via gltf-transform with conservative settings:
  - Position quantization: 14 bits (safe for skeletal animation)
  - Normal quantization: 10 bits
  - Texture coord quantization: 12 bits
- Optionally applies mesh simplification (target: <10K triangles per model)
- Writes compressed files back in-place (or to a `compressed/` staging dir first for validation)
- Logs before/after sizes for each model
- Skip files that are already compressed (check for Draco extension in GLB)

#### 1.3 Wire DRACOLoader into AssetLoader

**Modify:** `src/engine/AssetLoader.ts`

- Import `DRACOLoader` from `three/examples/jsm/loaders/DRACOLoader`
- Create DRACOLoader instance, set decoder path to `/draco/`
- Call `gltfLoader.setDRACOLoader(dracoLoader)` in constructor
- DRACOLoader handles mixed compressed/uncompressed GLBs transparently — no conditional logic needed

#### 1.4 Compress existing 14 models and validate

- Run compression script on existing models
- Boot the game and verify all 14 NPCs still render correctly
- Check: cel-shader materials applied, outlines render, name labels show, breathing animation works
- Check: any models with skeletal animations still animate correctly (no joint popping)

**Acceptance criteria:**
- [x] gltf-transform and draco3d installed — `package.json`
- [x] Draco decoder files copied to `public/draco/`
- [x] Compression script at `scripts/compress-models.ts`
- [x] DRACOLoader wired into AssetLoader — `src/engine/AssetLoader.ts`
- [x] All 14 existing models compressed (87.7% avg reduction, 230MB → 28MB)
- [ ] Game boots and all existing NPCs render correctly with compressed models

---

### Phase 2: Generate Missing NPC Models

**Goal:** Generate 10 missing character models via Tripo3D so no NPCs show as capsule fallbacks.

#### 2.1 Add missing NPCs to generation script

**Modify:** `scripts/generate-npc-models.ts`

Add prompt definitions for the 10 missing characters. Follow the existing N64 low-poly style prompt pattern:

```
"low poly 3D character, N64 video game style, [CHARACTER] from Alice in Wonderland,
[DESCRIPTION], standing upright, simple geometry, bright colors, cute cartoon style"
```

Missing characters and their descriptions:

| model_id | Description |
|---|---|
| `queen_of_hearts` | Imposing queen in red and black dress with heart motifs, crown, angry expression |
| `king_of_hearts` | Small timid king in red robes with heart-shaped crown |
| `knave_of_hearts` | Young guard/servant in playing card outfit with hearts |
| `cheshire_cat` | Wide grinning purple-pink striped cat, distinctive smile |
| `mad_hatter` | Eccentric man with oversized top hat, bowtie, wild hair |
| `march_hare` | Scruffy brown hare with wild eyes, holding teacup |
| `dormouse` | Tiny sleepy mouse curled up, often eyes closed |
| `card_painter` | Playing card soldier with paintbrush, flat card-like body |
| `flamingo` | Pink flamingo standing on one leg, used as croquet mallet |
| `hedgehog` | Small round hedgehog curled into ball, used as croquet ball |

#### 2.2 Run generation and review

- Execute `npx tsx scripts/generate-npc-models.ts`
- Script already skips existing models (incremental)
- Review each generated model visually (open GLBs in a viewer)
- Re-generate any that are malformed or off-style (change prompt, re-run)

#### 2.3 Normalize and compress

- Run compression script from Phase 1 on new models
- Verify scale/orientation consistency with existing models (Y-up, feet at origin)
- If scale is off: add a normalization step to compression script that auto-scales to match a target bounding box height

**Acceptance criteria:**
- [x] 10 new NPC prompts added to `scripts/generate-npc-models.ts`
- [x] All 10 models generated and saved to `public/assets/models/`
- [ ] Models reviewed for visual quality and style consistency
- [x] Models compressed with Draco
- [ ] Game boots with all 24 NPCs showing real 3D models (no purple capsules)

---

### Phase 3: Generate Garden Environment Models

**Goal:** Generate all 25 garden asset types via Tripo3D to replace procedural fallbacks.

#### 3.1 Create garden asset generation script

**New file:** `scripts/generate-garden-models.ts`

Structure mirrors `generate-npc-models.ts` but for environment assets. Key differences:
- Output directory: `public/assets/models/garden/`
- Prompts emphasize "game prop" and "environment asset" not "character"
- Style: "low poly stylized [ITEM], cel-shaded game asset, Breath of the Wild art style, soft colors, clean topology, game-ready"

Asset prompts for all 25 types:

| asset_id | Prompt description |
|---|---|
| `hedge_straight` | Straight garden hedge wall, trimmed boxwood, rectangular |
| `hedge_corner` | L-shaped garden hedge corner piece |
| `hedge_tjunction` | T-shaped garden hedge junction |
| `stone_path` | Straight cobblestone garden path segment |
| `stone_path_curved` | Curved cobblestone garden path segment |
| `grass_platform` | Grassy platform with dirt edges, flat top |
| `fountain` | Ornate garden fountain, tiered with water basin |
| `gazebo` | Victorian garden gazebo with pillars and domed roof |
| `throne` | Ornate red and gold throne, Queen of Hearts style |
| `rose_bush_red` | Red rose bush with flowers and green leaves |
| `rose_bush_white` | White rose bush with flowers and green leaves |
| `rose_bush_pink` | Pink rose bush with flowers and green leaves |
| `topiary_sphere` | Trimmed garden topiary in sphere shape |
| `topiary_spiral` | Trimmed garden topiary in spiral cone shape |
| `topiary_heart` | Trimmed garden topiary in heart shape |
| `garden_bench` | Ornate wrought-iron garden bench |
| `lantern` | Victorian garden lantern on pole |
| `tea_table` | Small round tea party table with tablecloth |
| `chair_ornate` | Ornate garden chair, Victorian style |
| `playing_card` | Giant playing card standing upright |
| `stairs_stone` | Short stone staircase, 4-5 steps |
| `stairs_grass` | Grassy stepped hillside, natural steps |
| `hedge_arch` | Garden hedge archway, trimmed passage |
| `pillar_stone` | Stone garden pillar/column |
| `gate_ornate` | Ornate wrought-iron garden gate |

#### 3.2 Run generation, review, normalize

- Same flow as Phase 2: generate, review, re-generate failures
- Environment assets are simpler than characters — expect higher success rate
- Normalize scale to match existing platform dimensions in level data

#### 3.3 Compress and validate

- Run compression script on all garden models
- Boot game and verify garden assets load instead of procedural fallbacks
- Check: cel-shader materials applied correctly, outlines render, shadows cast

**Acceptance criteria:**
- [x] Generation script at `scripts/generate-garden-models.ts`
- [x] All 25 garden asset models generated and saved to `public/assets/models/garden/`
- [ ] Models reviewed for visual quality
- [x] Models compressed with Draco
- [ ] Game boots with real 3D garden assets (no colored boxes/cylinders)

---

### Phase 4: Performance Optimization

**Goal:** Smooth runtime performance — no stuttering during gameplay.

#### 4.1 Particle object pooling

**Modify:** `src/effects/ParticleManager.ts`

Currently creates new `THREE.Points` per particle burst. Implement object pooling:

- Pre-allocate a pool of particle system objects at init
- `acquire()` returns an inactive system from pool, resets its state
- `release()` marks system as inactive and hides it
- Pool grows if exhausted (but warn in dev mode)
- Reset must clear: position, color, lifetime, velocity, opacity for every particle in the system

Reference: Todo #030 from pre-demo cleanup plan.

#### 4.2 Physics ray disposal

**Modify:** `src/camera/CameraController.ts`

The camera controller creates a RAPIER Ray for wall collision detection. Ensure:
- Ray is pre-allocated once (already done per research, but verify cleanup)
- No new Ray allocations per frame
- Proper disposal in `destroy()` method

Reference: Todo #037 from pre-demo cleanup plan.

#### 4.3 Instance repeated garden assets

**Modify:** `src/world/GardenAssetLoader.ts`

Many garden assets are placed multiple times (hedges, rose bushes, paths). Use Three.js `InstancedMesh` for repeated placements of the same asset type:
- Group placements by asset_id
- If count > 1 for an asset_id, use `InstancedMesh` with instance matrices
- Reduces draw calls significantly (e.g., 20 hedge placements → 1 draw call)

#### 4.4 Profile and tune

- Use the built-in stats overlay (backtick toggle) to measure FPS
- Identify any remaining frame drops
- Check memory usage in Chrome DevTools → Performance tab
- Verify no GC pauses from particle creation

**Acceptance criteria:**
- [x] Particle pooling implemented — `src/effects/ParticleManager.ts`
- [x] Physics ray properly managed — `src/camera/CameraController.ts`
- [x] Instanced meshes evaluated — only 35 placements (max 7 per type), ~70 draw calls total; InstancedMesh deferred as unnecessary for current asset count
- [ ] No visible stuttering during gameplay
- [ ] Stats overlay shows stable frame rate

---

### Phase 5: Integration & Polish

**Goal:** Everything works together smoothly for the demo.

#### 5.1 Full playthrough test

- Walk through entire Queen's Garden level
- Interact with every NPC — verify dialogue, portraits, and 3D model presence
- Trigger all collectibles, challenges, and zone transitions
- Test size change mechanics near NPCs and environment assets

#### 5.2 Visual consistency check

- Verify cel-shader renders consistently on all new models
- Check outline thickness and color are uniform
- Verify shadow casting/receiving on all assets
- Check that fog, bloom, and lighting interact well with new geometry

#### 5.3 Performance validation

- Play for 5+ minutes without frame drops
- Monitor memory in DevTools — verify no steady climb (leak)
- Test on a non-development machine if possible

**Acceptance criteria:**
- [ ] All NPCs render with 3D models
- [ ] All garden assets render with 3D models
- [ ] Cel-shader and outlines consistent across all assets
- [ ] No frame drops during extended play
- [ ] No memory leaks

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tripo3D models arrive at wrong scale/orientation | High | Medium | Add auto-normalization in compression script (target bounding box, Y-up enforcement) |
| Draco compression breaks skeletal animations | Medium | High | Use conservative quantization (14-bit position), test each model individually |
| Tripo3D API rate limits or downtime | Medium | High | Implement retry with exponential backoff, skip-if-exists logic already present |
| Browser memory blowout with 35+ models | Medium | High | Instanced meshes for repeated assets, monitor GPU memory in DevTools |
| Some models fail generation entirely | Medium | Low | Existing fallback system handles gracefully — iterate on prompts |
| DRACOLoader WASM path breaks in production build | Low | High | Verify Draco decoder files are in Vite's `public/` and path resolves correctly |

## Dependencies & Prerequisites

- **Tripo3D API key** — available in `config.json` ✓
- **Node.js + npx tsx** — already configured ✓
- **gltf-transform + draco3d** — needs install (Phase 1.1)
- **Three.js DRACOLoader** — bundled with three.js, needs wiring (Phase 1.3)

## Key Files

| File | Role |
|---|---|
| `scripts/generate-npc-models.ts` | NPC model generation via Tripo3D |
| `scripts/generate-garden-models.ts` | Garden asset generation (new) |
| `scripts/compress-models.ts` | GLB compression pipeline (new) |
| `src/engine/AssetLoader.ts` | Model loading + DRACOLoader integration |
| `src/world/GardenAssetLoader.ts` | Garden asset loading + instancing |
| `src/world/LevelBuilder.ts` | NPC placement from level JSON |
| `src/effects/ParticleManager.ts` | Particle pooling |
| `src/camera/CameraController.ts` | Physics ray cleanup |
| `public/assets/models/` | NPC model directory |
| `public/assets/models/garden/` | Garden asset directory |
| `public/draco/` | Draco WASM decoder files (new) |

## References

- Brainstorm: `docs/brainstorms/2026-02-27-demo-polish-brainstorm.md`
- Pre-demo cleanup: `docs/plans/2026-02-27-refactor-pre-demo-task-cleanup-plan.md`
- Performance learnings: `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md`
- Skybox quality: `docs/solutions/integration-issues/skybox-quality-seams-artifacts.md`
- Queen's Garden overhaul: `docs/plans/2026-02-26-feat-queens-garden-visual-overhaul-plan.md`
