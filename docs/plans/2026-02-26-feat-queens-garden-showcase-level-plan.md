# feat: The Queen's Garden - Showcase Level

---
title: "feat: The Queen's Garden Showcase Level"
type: feat
status: active
date: 2026-02-26
brainstorm: docs/brainstorms/2026-02-26-queens-garden-level-brainstorm.md
---

## Overview

Create "The Queen's Garden" as a **showcase level** demonstrating stunning BotW-inspired visuals, polished vertical exploration, and meaningful character interactions. This is a new chapter designed to be the most impressive level in the game.

**Scope for first pass:** 3 areas to 100% quality:
1. **Queen's Court** (central hub, Y=0)
2. **Rose Garden** (lower area, Y=-5)
3. **Tea Party Terrace** (upper area, Y=15)

## Problem Statement

The current chapters are functional but use procedural geometry (boxes) without environmental textures or compelling NPC quests. To demonstrate the game's potential, we need one level that achieves visual excellence with:

- Lush BotW-style vegetation and architecture
- Meaningful character interactions that unlock progression
- Vertical exploration that feels rewarding
- 60 FPS performance with 8+ animated NPCs

## Proposed Solution

Build The Queen's Garden using the existing engine with targeted extensions:

1. **New level data** (`queens_garden.json`) with 3 interconnected rooms
2. **Quest system extension** to NPCController for unlock-based progression
3. **Asset pipeline** using ComfyCloud → Tripo → Mixamo → Three.js
4. **Style bible** enforcing visual consistency
5. **Performance tiering** for NPC animation updates

---

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    queens_garden.json                        │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐  │
│  │ atmosphere  │ │  platforms  │ │       npcs[]         │  │
│  │ (lighting)  │ │ (w/ assets) │ │ (with quest_ids)     │  │
│  └─────────────┘ └─────────────┘ └──────────────────────┘  │
│  ┌─────────────┐ ┌─────────────┐ ┌──────────────────────┐  │
│  │   areas[]   │ │  quests[]   │ │    wonder_stars[]    │  │
│  │ (per room)  │ │ (unlocks)   │ │   (challenges)       │  │
│  └─────────────┘ └─────────────┘ └──────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     LevelBuilder.ts                          │
│  - buildArea(area) → platforms, decorations, gates           │
│  - loadGardenAssets(assetId) → GLB models with cel-shader   │
│  - setupAreaGates(quests) → invisible barriers + triggers    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    NPCController.ts                          │
│  - questStates: Map<string, QuestState>                      │
│  - checkQuestProgress(questId) → updates unlock triggers     │
│  - tieredUpdate(dt) → distance-based animation throttling    │
└─────────────────────────────────────────────────────────────┘
```

### Level Layout (Elevation Map)

```
                    Y=15  ┌─────────────────┐
                          │  Tea Party      │ ← Hatter, March Hare, Dormouse
                          │  Terrace        │
                          └────────┬────────┘
                                   │ stairs (locked by quest)
                    Y=0   ┌────────┴────────┐
                          │  Queen's        │ ← Queen, King, Knave, White Rabbit
                          │  Court          │    (Hub - always accessible)
                          └────────┬────────┘
                                   │ stairs (always open)
                    Y=-5  ┌────────┴────────┐
                          │  Rose           │ ← Card Gardeners (painting roses)
                          │  Garden         │
                          └─────────────────┘
```

### Implementation Phases

---

## Phase 1: Data Structures & Style Bible

**Goal:** Extend type system and lock down visual parameters before any code.

### 1.1 Extend LevelData.ts

Add these interfaces:

```typescript
// src/data/LevelData.ts

interface Quest {
  id: string;                    // "quest_paint_roses"
  name: string;                  // "Paint the Roses Red"
  giver_npc: string;             // NPC ID who gives quest
  dialogue_before: string[];     // Lines before accepting
  dialogue_during: string[];     // Lines while in progress
  dialogue_after: string[];      // Lines after completion
  requirements: QuestRequirements;
  rewards: QuestRewards;
}

interface QuestRequirements {
  talk_to_npc?: string;          // Must talk to this NPC
  reach_position?: Vector3;      // Must reach this location
  collect_items?: { type: string; count: number }[];
  complete_quest?: string;       // Prerequisite quest ID
}

interface QuestRewards {
  unlock_area?: string;          // Area ID to make accessible
  spawn_npc?: string;            // Make NPC appear
  give_item?: string;            // Item to add to inventory
}

interface Area {
  id: string;                    // "tea_party_terrace"
  name: string;                  // "Tea Party Terrace"
  bounds: { min: Vector3; max: Vector3 };
  locked_by_quest?: string;      // Quest that unlocks this area
  camera_config?: {
    targetDistance: number;
    heightOffset: number;
  };
}

// Extend existing NPC interface
interface NPC {
  name: string;
  position: Vector3;
  model_id: string;
  dialogue: string[];
  quest_ids?: string[];          // Quests this NPC can give
  appears_after_quest?: string;  // Only visible after quest complete
}
```

### 1.2 Create style_bible.json

```json
// swarm/style/style_bible.json
{
  "target_mood": "painterly whimsical garden",
  "palette": {
    "primary": ["#2D5A27", "#1E4620", "#3D7A37"],
    "accent": ["#C41E3A", "#FFD700", "#FFFFFF"],
    "shadow_tint": "#4A3B5C",
    "fog_color": "#E8F4E8"
  },
  "lighting": {
    "sun_angle": 25,
    "sun_color": "#FFF4E0",
    "sun_intensity": 1.2,
    "ambient_color": "#8FAADC",
    "ambient_intensity": 0.4,
    "shadow_type": "BasicShadowMap"
  },
  "cel_shader": {
    "steps": 3,
    "shadow_color": "#4A3B5C",
    "highlight_color": "#FFF8E7",
    "rim_color": "#88CCAA",
    "rim_power": 3.0
  },
  "fog": {
    "type": "Fog",
    "near": 40,
    "far": 120
  },
  "materials": {
    "hedge": { "color": "#2D5A27", "shadow": "#1A3518", "rim": "#88CC88" },
    "rose_red": { "color": "#C41E3A", "shadow": "#8B0000", "rim": "#FF6B6B" },
    "stone_path": { "color": "#D2B48C", "shadow": "#8B7355", "rim": "#E8DCC4" },
    "marble": { "color": "#FAFAFA", "shadow": "#C0C0C0", "rim": "#FFFFFF" }
  },
  "rules": [
    "No pure black shadows - always purple-tinted",
    "Bloom only on emissive (roses, lanterns) - never full-screen",
    "Fog separates foreground from background",
    "Maximum 3 dominant hues per room",
    "Outlines are dark blue-gray (#2D3748), 0.015-0.02 thickness"
  ]
}
```

### 1.3 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/data/LevelData.ts` | ~~Modify~~ ✅ | Add Quest, Area, extended NPC interfaces |
| `swarm/style/style_bible.json` | ~~Create~~ ✅ | Visual consistency rules |
| `swarm/style/color_profiles.json` | ~~Create~~ ✅ | Per-room color variations |

---

## Phase 2: Quest System

**Goal:** Extend NPCController to track quests and trigger area unlocks.

### 2.1 QuestManager Class

```typescript
// src/quests/QuestManager.ts

interface QuestState {
  status: 'locked' | 'available' | 'active' | 'complete';
  progress: Record<string, number>;  // "roses_painted": 2
}

class QuestManager {
  private quests: Map<string, Quest>;
  private questStates: Map<string, QuestState>;
  private unlockedAreas: Set<string>;

  constructor(quests: Quest[]) {
    // Initialize all quests as locked
    // Check prerequisites to mark some as available
  }

  startQuest(questId: string): void {
    // Mark active, update NPC dialogue
  }

  updateProgress(questId: string, key: string, value: number): void {
    // Track partial completion
  }

  completeQuest(questId: string): void {
    // Mark complete, process rewards, unlock areas
  }

  isAreaUnlocked(areaId: string): boolean {
    return this.unlockedAreas.has(areaId);
  }

  getDialogueForNPC(npcId: string): string[] {
    // Return appropriate dialogue based on quest state
  }

  save(): void {
    localStorage.setItem('quest_progress', JSON.stringify({
      states: Object.fromEntries(this.questStates),
      unlocked: Array.from(this.unlockedAreas)
    }));
  }

  load(): void {
    // Restore from localStorage
  }
}
```

### 2.2 Integrate with NPCController

```typescript
// src/npcs/NPCController.ts modifications

class NPCController {
  private questManager: QuestManager;

  // Modify startDialogue to check quest state
  startDialogue(npc: NPCObject): void {
    const dialogue = this.questManager.getDialogueForNPC(npc.name);
    // ... existing dialogue logic with quest-aware lines
  }

  // Add quest acceptance on dialogue end
  completeDialogue(npc: NPCObject): void {
    const availableQuest = this.questManager.getAvailableQuestFrom(npc.name);
    if (availableQuest) {
      this.questManager.startQuest(availableQuest.id);
      // Show quest accepted UI
    }
  }
}
```

### 2.3 Area Gates

```typescript
// src/world/AreaGate.ts

class AreaGate {
  private mesh: THREE.Mesh;        // Visual barrier (hedge wall)
  private collider: RAPIER.Collider;
  private areaId: string;

  constructor(position: Vector3, size: Vector3, areaId: string) {
    // Create invisible collider + optional visual
  }

  unlock(): void {
    // Remove collider, play unlock animation
    this.world.removeCollider(this.collider);
    // Animate hedge walls parting or fading
  }
}
```

### 2.4 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/quests/QuestManager.ts` | Create | Quest state machine |
| `src/world/AreaGate.ts` | Create | Blocking barriers that unlock |
| `src/npcs/NPCController.ts` | Modify | Integrate quest dialogue |
| `src/Game.ts` | Modify | Initialize QuestManager |

---

## Phase 3: Asset Pipeline

**Goal:** Generate and integrate garden assets via external tools.

### 3.1 Asset Generation Workflow

```
┌──────────────────┐     ┌──────────────┐     ┌────────────────┐
│  ComfyCloud      │────▶│    Tripo     │────▶│   Three.js     │
│  (Text-to-Image) │     │  (Image→GLB) │     │ (Cel-shader)   │
└──────────────────┘     └──────────────┘     └────────────────┘
         │                      │                     │
         ▼                      ▼                     ▼
   Reference images      Textured GLB          Styled meshes
   for consistency       with UVs              in scene
```

### 3.2 Required Assets (Phase 1 - 3 Areas)

**Environment Assets:**
| Asset | Type | Variations | Poly Budget |
|-------|------|------------|-------------|
| hedge_wall | Platform | straight, corner, T-junction | 500 |
| rose_bush | Decoration | red, white, pink | 800 |
| stone_path | Ground | straight, curved | 200 |
| fountain | Centerpiece | 1 | 2000 |
| gazebo | Structure | 1 | 3000 |
| topiary | Decoration | sphere, spiral, animal | 600 |
| garden_bench | Prop | 1 | 400 |
| lantern | Prop | 1 | 300 |
| tea_table | Prop | 1 | 500 |
| chair | Prop | 3 styles | 400 |

**Character Models (8 for 3 areas):**
| Character | Location | Poly Budget | Animations |
|-----------|----------|-------------|------------|
| Queen of Hearts | Queen's Court | 8000 | idle, talk, angry |
| King of Hearts | Queen's Court | 6000 | idle, talk |
| Knave of Hearts | Queen's Court | 6000 | idle, talk, nervous |
| White Rabbit | Queen's Court | 5000 | idle, talk, check_watch |
| Card Gardener 1 | Rose Garden | 4000 | idle, paint |
| Card Gardener 2 | Rose Garden | 4000 | idle, paint |
| Hatter | Tea Party | 8000 | idle, talk, pour_tea |
| March Hare | Tea Party | 6000 | idle, talk, throw |

### 3.3 Asset Loading Extension

```typescript
// src/world/GardenAssetLoader.ts

const GARDEN_ASSETS: Record<string, string> = {
  'hedge_straight': 'assets/models/garden/hedge_straight.glb',
  'hedge_corner': 'assets/models/garden/hedge_corner.glb',
  'rose_bush_red': 'assets/models/garden/rose_bush_red.glb',
  'fountain': 'assets/models/garden/fountain.glb',
  // ... etc
};

async function loadGardenAsset(assetId: string): Promise<THREE.Group> {
  const path = GARDEN_ASSETS[assetId];
  const model = await assetLoader.loadModel(path);

  // Apply cel-shader to all meshes
  model.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalColor = (child.material as THREE.MeshStandardMaterial).color;
      child.material = createCelShaderMaterial({
        color: originalColor.getHex(),
        ...STYLE_BIBLE.cel_shader
      });
    }
  });

  // Add outlines
  addOutlinesToObject(model, 0.015, 0x2D3748);

  return model;
}
```

### 3.4 Platform Asset Mapping in Level JSON

```json
{
  "platforms": [
    {
      "position": [0, 0, 0],
      "size": [4, 2, 1],
      "type": "solid",
      "asset_id": "hedge_straight"
    },
    {
      "position": [4, 0, 0],
      "size": [2, 2, 2],
      "type": "solid",
      "asset_id": "hedge_corner",
      "rotation": [0, 90, 0]
    }
  ]
}
```

### 3.5 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/world/GardenAssetLoader.ts` | Create | Asset loading with cel-shader |
| `src/world/LevelBuilder.ts` | Modify | Support asset_id on platforms |
| `public/assets/models/garden/` | Create | Asset directory |
| `public/assets/fallback/queens_garden.json` | Create | Level data |

---

## Phase 4: Level Assembly

**Goal:** Build the actual level data and connect all systems.

### 4.1 Level JSON Structure

```json
// public/assets/fallback/queens_garden.json
{
  "chapter_number": 5,
  "chapter_title": "The Queen's Garden",
  "setting": "A magnificent vertical garden with hedge mazes, rose gardens, and the Queen's grand court.",

  "atmosphere": {
    "sky_color": "#87CEEB",
    "fog_color": "#E8F4E8",
    "fog_near": 40,
    "fog_far": 120,
    "ambient_light": "#8FAADC"
  },

  "spawn_point": { "x": 0, "y": 1, "z": 0 },
  "gate_position": { "x": 0, "y": 16, "z": -10 },

  "areas": [
    {
      "id": "queens_court",
      "name": "Queen's Court",
      "bounds": { "min": [-20, -2, -20], "max": [20, 8, 20] },
      "locked_by_quest": null
    },
    {
      "id": "rose_garden",
      "name": "Rose Garden",
      "bounds": { "min": [-30, -8, -40], "max": [30, -2, -20] },
      "locked_by_quest": null
    },
    {
      "id": "tea_party",
      "name": "Tea Party Terrace",
      "bounds": { "min": [-15, 12, -15], "max": [15, 20, 15] },
      "locked_by_quest": "quest_find_rabbit"
    }
  ],

  "quests": [
    {
      "id": "quest_find_rabbit",
      "name": "Find the White Rabbit",
      "giver_npc": "Queen of Hearts",
      "dialogue_before": [
        "OFF WITH THEIR HEADS!",
        "Oh, you. Have you seen that blasted Rabbit?",
        "He's late! ALWAYS late!",
        "Find him and bring him to me!"
      ],
      "dialogue_during": [
        "Well? Where is he?",
        "I don't have all day!"
      ],
      "dialogue_after": [
        "Hmph. About time.",
        "You may proceed to the Tea Party.",
        "Don't dawdle!"
      ],
      "requirements": {
        "talk_to_npc": "White Rabbit"
      },
      "rewards": {
        "unlock_area": "tea_party"
      }
    }
  ],

  "platforms": [
    // Queen's Court - central hub
    { "position": [0, -0.5, 0], "size": [30, 1, 30], "type": "solid", "asset_id": "stone_path" },
    { "position": [0, 0, 0], "size": [3, 2, 3], "type": "solid", "asset_id": "fountain" },
    // ... more platforms
  ],

  "npcs": [
    {
      "name": "Queen of Hearts",
      "position": { "x": 0, "y": 0, "z": -8 },
      "model_id": "queen_of_hearts",
      "dialogue": ["OFF WITH THEIR HEADS!"],
      "quest_ids": ["quest_find_rabbit"]
    },
    {
      "name": "White Rabbit",
      "position": { "x": 12, "y": 0, "z": 5 },
      "model_id": "white_rabbit",
      "dialogue": [
        "Oh dear! Oh dear!",
        "I shall be too late!",
        "The Queen! She sent you?",
        "Tell her I'm coming, I'm coming!"
      ]
    }
    // ... more NPCs
  ],

  "wonder_stars": [
    {
      "id": "qg_star_1",
      "name": "Garden Explorer",
      "position": { "x": 0, "y": 18, "z": 0 },
      "challenge_type": "exploration",
      "requirements": { "reach_position": { "x": 0, "y": 17, "z": -8 } },
      "hint": "Reach the top of the Tea Party Terrace"
    }
  ]
}
```

### 4.2 Vertical Navigation

Since current PlayerController has:
- Double jump (reaches ~24 units)
- Long jump (horizontal boost)
- Ground pound (downward)

For 15-20 unit elevation changes, we need **stairs/ramps**:

```typescript
// src/world/LevelBuilder.ts - add stair building

function buildStairs(
  start: Vector3,
  end: Vector3,
  stepCount: number
): THREE.Group {
  const stairs = new THREE.Group();
  const stepHeight = (end.y - start.y) / stepCount;
  const stepDepth = start.distanceTo(new Vector3(end.x, start.y, end.z)) / stepCount;

  for (let i = 0; i < stepCount; i++) {
    const stepGeo = new THREE.BoxGeometry(2, stepHeight, stepDepth);
    const stepMat = createCelShaderMaterial({ color: 0xD2B48C, ...STYLE_BIBLE.cel_shader });
    const step = new THREE.Mesh(stepGeo, stepMat);

    step.position.set(
      start.x,
      start.y + stepHeight * (i + 0.5),
      start.z - stepDepth * i
    );

    stairs.add(step);
    // Also create physics collider for each step
  }

  return stairs;
}
```

### 4.3 Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `public/assets/fallback/queens_garden.json` | Create | Full level data |
| `src/world/LevelBuilder.ts` | Modify | Add stair builder, asset loading |
| `src/engine/SceneManager.ts` | Modify | Load chapter 5 |

---

## Phase 5: Performance Optimization

**Goal:** Maintain 60 FPS with 8+ animated NPCs.

### 5.1 Tiered NPC Updates

```typescript
// src/npcs/NPCController.ts

private readonly TIER_DISTANCES = {
  FULL: 10,      // Full animation, face player, speech bubble
  REDUCED: 25,   // Half-rate animation, no facing
  STATIC: 50     // No animation, frozen pose
};

update(playerPos: THREE.Vector3, dt: number): void {
  for (const npc of this.npcs) {
    const distance = playerPos.distanceTo(npc.position);

    if (distance < this.TIER_DISTANCES.FULL) {
      // Full update
      npc.mixer?.update(dt);
      this.updateFacing(npc, playerPos);
      this.updateSpeechBubble(npc, distance);
    } else if (distance < this.TIER_DISTANCES.REDUCED) {
      // Reduced - animate every other frame
      if (this.frameCount % 2 === 0) {
        npc.mixer?.update(dt * 2);
      }
      this.hideSpeechBubble(npc);
    } else if (distance < this.TIER_DISTANCES.STATIC) {
      // Static - no animation updates
      this.hideSpeechBubble(npc);
    }
    // Beyond STATIC: NPC culled by Three.js frustum culling
  }

  this.frameCount++;
}
```

### 5.2 Mesh Caching (Following docs/solutions patterns)

```typescript
// Cache mesh references at init, not in update loop
private meshCache: Map<NPCObject, THREE.Mesh[]> = new Map();

initializeNPCs(npcs: NPCObject[]): void {
  for (const npc of npcs) {
    const meshes: THREE.Mesh[] = [];
    npc.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child);
      }
    });
    this.meshCache.set(npc, meshes);
  }
}
```

### 5.3 Performance Budget

| Metric | Target | Measurement |
|--------|--------|-------------|
| FPS | 60 | `stats.js` overlay |
| Draw calls | < 150 | `renderer.info.render.calls` |
| Triangles | < 200k | `renderer.info.render.triangles` |
| NPC update time | < 2ms | Performance.now() delta |
| Texture memory | < 128MB | Chrome DevTools |

### 5.4 Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/npcs/NPCController.ts` | Modify | Add tiered updates, mesh caching |
| `src/Game.ts` | Modify | Add performance monitoring |

---

## Phase 6: Visual Polish (AGENTIC_SWARM)

**Goal:** Apply the visual polish methodology from agentic-swarm-md.md.

### 6.1 Run AGENTIC_SWARM Cycle

After basic level is playable, execute:

1. **Phase 1 - Analyze:** Verify style_bible.json matches actual materials
2. **Phase 2 - Light:** Fine-tune sun angle, fog density, ambient levels
3. **Phase 3 - Surface:** Add wind animation to foliage, particle effects (rose petals)
4. **Phase 4 - Move:** Configure camera zones per area
5. **Phase 5 - Verify:** Screenshot comparison, performance validation

### 6.2 Particle Effects

```typescript
// src/effects/GardenParticles.ts

class RosePetalEmitter {
  private particles: THREE.Points;
  private velocities: Float32Array;

  constructor(bounds: THREE.Box3) {
    // Create 50-100 petal particles
    // Pink/red colors
    // Slow drift with slight rotation
  }

  update(dt: number, wind: THREE.Vector3): void {
    // Update positions based on wind + gravity
    // Reset when below bounds
  }
}
```

### 6.3 Camera Zones

```typescript
// Define zones for each area in queens_garden.json or code

const GARDEN_CAMERA_ZONES: CameraZone[] = [
  {
    bounds: new THREE.Box3(
      new THREE.Vector3(-20, -2, -20),
      new THREE.Vector3(20, 8, 20)
    ),
    targetDistance: 10,
    heightOffset: 3
  },
  // Tea Party - tighter camera for intimate space
  {
    bounds: new THREE.Box3(
      new THREE.Vector3(-15, 12, -15),
      new THREE.Vector3(15, 20, 15)
    ),
    targetDistance: 6,
    heightOffset: 2
  }
];
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Player spawns in Queen's Court and can explore freely
- [ ] Talking to Queen of Hearts starts "Find the White Rabbit" quest
- [ ] Finding White Rabbit completes quest and unlocks Tea Party Terrace
- [ ] Stairs connect all three areas with smooth platforming
- [ ] 8 NPCs have working dialogue and animations
- [ ] Wonder Star challenge is completable
- [ ] Level can be won by reaching the gate at Tea Party

### Non-Functional Requirements

- [ ] 60 FPS on desktop (MacBook Pro M1 baseline)
- [ ] No frame drops when 4+ NPCs visible
- [ ] Load time < 5 seconds
- [ ] Cel-shader consistent across all objects
- [ ] No visible texture seams on skybox

### Quality Gates

- [ ] Screenshots match BotW reference aesthetic
- [ ] Quest state persists across browser refresh
- [ ] No console errors during normal play
- [ ] Code review approval for new systems

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Visual quality | "Could be BotW concept art" | Peer review + screenshot comparison |
| Frame rate | 60 FPS sustained | stats.js during 5-min playthrough |
| Quest completion | 90% of testers complete | User testing session |
| Enjoyment | "Would play more" rating | Post-play survey |

---

## Dependencies & Prerequisites

1. **External tools needed:**
   - ComfyCloud account (image generation)
   - Tripo account (image-to-3D)
   - Mixamo (character rigging)
   - Blender (asset cleanup)

2. **Existing systems used:**
   - CelShaderMaterial ✓
   - OutlineEffect ✓
   - NPCController ✓
   - AssetLoader ✓
   - WonderStarManager ✓

3. **Must complete before:**
   - Resolve existing event listener leaks (see todos/)
   - Merge current N64 overhaul branch

---

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Asset generation quality inconsistent | High | Medium | Batch similar assets together, use style reference images |
| Quest system scope creep | Medium | High | Strict MVP: 1 quest for first pass, no branching |
| Performance with 8 NPCs | Medium | Medium | Tiered updates already planned, test early |
| Vertical navigation feels awkward | Low | High | Current movement system is polished, just need good stair placement |
| Integration complexity | Medium | Medium | Phase gates with testing between each |

---

## Resource Requirements

**Time estimate:** Not provided (per guidelines)

**Skills needed:**
- Three.js development
- 3D asset generation (AI tools)
- Character animation (Mixamo)
- Level design (platform placement)

**External services:**
- ComfyCloud credits for image generation
- Tripo credits for 3D conversion
- Blockade Labs for skybox (optional)

---

## Future Considerations

After Phase 1 (3 areas), the remaining 4 areas can be added:

- **Cheshire Cat's Perch** (Y=25) - Mysterious floating platforms
- **Mushroom Grove** (Y=8) - Caterpillar and Duchess
- **Mock Turtle Grotto** (Y=-15) - Underground water area
- **Overlook Tower** (Y=40) - Final challenge, panoramic view

Each follows same pattern: define in JSON, create assets, add NPCs/quests.

---

## Documentation Plan

- [ ] Update CLAUDE.md with Queen's Garden conventions
- [ ] Add asset generation prompts to docs/
- [ ] Document quest system API
- [ ] Create level design guidelines for future chapters

---

## References & Research

### Internal References
- Brainstorm: `docs/brainstorms/2026-02-26-queens-garden-level-brainstorm.md`
- Existing visual overhaul plan: `docs/plans/2026-02-26-feat-queens-garden-visual-overhaul-plan.md`
- N64 overhaul: `docs/plans/2026-02-25-feat-n64-style-platformer-overhaul-plan.md`
- Performance patterns: `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md`
- Skybox patterns: `docs/solutions/integration-issues/skybox-quality-seams-artifacts.md`

### Key Implementation Files
- Level data types: `src/data/LevelData.ts:1-165`
- Level building: `src/world/LevelBuilder.ts:118-179`
- Cel-shader: `src/shaders/CelShaderMaterial.ts:113-139`
- NPC system: `src/npcs/NPCController.ts:157-320`
- Camera zones: `src/camera/CameraController.ts:338-354`
- Asset loading: `src/engine/AssetLoader.ts:22-48`

### External References
- AGENTIC_SWARM methodology: `agentic-swarm-md.md`
- BotW visual references: `inspo/` folder (330+ images)
- Tripo API: https://www.tripo3d.ai/
- Mixamo: https://www.mixamo.com/

---

## Next Steps Summary

1. **Extend LevelData.ts** with Quest, Area interfaces
2. **Create style_bible.json** in swarm/style/
3. **Build QuestManager.ts** with state machine
4. **Create queens_garden.json** with 3 areas
5. **Generate first 4 character models** via Tripo pipeline
6. **Integrate and test** basic quest flow
7. **Run AGENTIC_SWARM** polish cycle
8. **Performance validation** at 60 FPS target
