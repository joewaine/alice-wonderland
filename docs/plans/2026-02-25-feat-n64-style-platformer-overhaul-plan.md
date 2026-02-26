---
title: "feat: N64-Style Platformer Overhaul"
type: feat
status: active
date: 2026-02-25
brainstorm: docs/brainstorms/2026-02-25-n64-style-overhaul-brainstorm.md
---

# N64-Style Platformer Overhaul

## Overview

Transform Alice in Wonderland from a basic platformer into a polished N64-style collectathon inspired by Mario 64, Banjo-Kazooie, and DK64. This involves rebuilding the movement system, redesigning all 4 chapters with unique mechanics, and adding exploration depth.

## Problem Statement

Current issues:
- All 4 levels feel identical (same mechanics, rectangular platforms)
- Movement feels slow and unresponsive (instant velocity, no momentum)
- Lacking engagement (collect items, jump to gate, done)
- No exploration incentive (linear path to exit)
- Base run speed of 8 units is too slow

## Proposed Solution

### Core Systems

1. **Momentum-Based Movement** - Replace instant velocity with acceleration/deceleration
2. **Mario 64 Moveset** - Double jump, ground pound, long jump, wall kick
3. **Distinct Chapter Mechanics** - Unique gameplay per chapter
4. **Wonder Star Challenges** - Multiple objectives per level

---

## Technical Approach

### Phase 1: Movement System Overhaul

**Files:** `src/Game.ts`, `src/player/PlayerController.ts` (new)

#### 1.1 Extract Player Controller

Create dedicated `PlayerController.ts` to encapsulate movement logic currently scattered in `Game.ts:513-675`.

```typescript
// src/player/PlayerController.ts
export class PlayerController {
  // Momentum state
  private momentum: THREE.Vector3 = new THREE.Vector3();
  private isGrounded: boolean = false;
  private jumpCount: number = 0;
  private lastGroundedTime: number = 0;

  // Tuning constants
  private readonly GROUND_ACCEL = 0.8;
  private readonly AIR_ACCEL = 0.3;
  private readonly GROUND_FRICTION = 0.85;
  private readonly AIR_FRICTION = 0.98;
  private readonly MAX_SPEED = 14;
  private readonly JUMP_FORCE = 14;
  private readonly DOUBLE_JUMP_FORCE = 12;
  private readonly COYOTE_TIME = 150; // ms
}
```

**Tasks:**
- [x] Create `src/player/PlayerController.ts`
- [x] Move movement logic from `Game.ts:555-603`
- [x] Add momentum vector state
- [x] Implement acceleration/deceleration curves
- [x] Add coyote time (150ms jump grace period)
- [x] Add jump buffering (100ms input storage)

#### 1.2 Implement Momentum Physics

Replace `setLinvel()` with impulse-based movement:

```typescript
// Current (instant - Game.ts:576-578)
playerBody.setLinvel(new RAPIER.Vector3(worldX * speed, vel.y, worldZ * speed), true);

// New (momentum-based)
const accel = this.isGrounded ? this.GROUND_ACCEL : this.AIR_ACCEL;
const friction = this.isGrounded ? this.GROUND_FRICTION : this.AIR_FRICTION;

// Apply input as acceleration
this.momentum.x += inputX * accel;
this.momentum.z += inputZ * accel;

// Apply friction
this.momentum.x *= friction;
this.momentum.z *= friction;

// Clamp to max speed
const speed = this.momentum.length();
if (speed > this.MAX_SPEED) {
  this.momentum.multiplyScalar(this.MAX_SPEED / speed);
}

// Apply to physics body
playerBody.setLinvel(new RAPIER.Vector3(this.momentum.x, vel.y, this.momentum.z), true);
```

**Tasks:**
- [x] Replace instant velocity with momentum accumulation
- [x] Tune GROUND_ACCEL (0.6-1.0 range)
- [x] Tune AIR_ACCEL (0.2-0.4 range, less control in air)
- [x] Tune friction values for snappy stops
- [x] Increase MAX_SPEED from 8 to 14+

#### 1.3 Advanced Moves

| Move | Implementation | Priority |
|------|---------------|----------|
| Double Jump | Track `jumpCount`, allow 2nd jump in air | Must Have |
| Ground Pound | Detect crouch in air → apply downward impulse | Must Have |
| Long Jump | Crouch + Jump while running → horizontal boost | Must Have |
| Wall Kick | Detect wall contact → reflect momentum | Should Have |
| Triple Jump | Track momentum + timing → highest jump | Should Have |

```typescript
// Double Jump
if (input.jump && this.jumpCount < 2) {
  const force = this.jumpCount === 0 ? this.JUMP_FORCE : this.DOUBLE_JUMP_FORCE;
  this.applyJump(force);
  this.jumpCount++;
}

// Ground Pound
if (input.crouch && !this.isGrounded) {
  this.momentum.set(0, 0, 0);
  playerBody.setLinvel(new RAPIER.Vector3(0, -25, 0), true);
  this.isGroundPounding = true;
}

// Long Jump
if (input.crouch && input.jump && this.isGrounded && speed > 5) {
  const dir = this.momentum.clone().normalize();
  this.momentum.add(dir.multiplyScalar(8)); // Horizontal boost
  this.applyJump(this.JUMP_FORCE * 0.7); // Lower vertical
}
```

**Tasks:**
- [x] Implement double jump with flip animation trigger
- [x] Implement ground pound with shake effect
- [x] Implement long jump with momentum requirement
- [ ] Add wall detection raycast for wall kick
- [ ] Implement triple jump (momentum + timing window)

---

### Phase 2: Chapter 1 - Vertical Descent

**Files:** `public/assets/fallback/chapter_1.json`, `src/world/LevelBuilder.ts`

#### 2.1 Level Redesign

Replace current flat layout with vertical shaft:
- Start at top (y=100)
- Gate at bottom (y=0)
- Floating platforms at various heights
- Air currents that affect falling speed

```json
{
  "chapter_number": 1,
  "chapter_title": "Down the Rabbit-Hole",
  "setting": "Endless vertical descent through floating objects",
  "spawn_point": { "x": 0, "y": 100, "z": 0 },
  "gate_position": { "x": 0, "y": 2, "z": 0 },
  "platforms": [
    { "position": {"x": 0, "y": 95, "z": 0}, "size": {"x": 8, "y": 1, "z": 8}, "type": "solid" },
    { "position": {"x": 5, "y": 85, "z": 3}, "size": {"x": 4, "y": 1, "z": 4}, "type": "bouncy" },
    // ... descending platforms
  ],
  "air_currents": [
    { "position": {"x": 0, "y": 50, "z": 0}, "size": {"x": 10, "y": 20, "z": 10}, "force": -0.5 }
  ]
}
```

#### 2.2 Air Steering Mechanic

```typescript
// In PlayerController - detect falling state
if (!this.isGrounded && vel.y < -2) {
  // Enhanced air control while falling
  this.momentum.x += inputX * this.AIR_ACCEL * 1.5;
  this.momentum.z += inputZ * this.AIR_ACCEL * 1.5;

  // Check for air current zones
  for (const current of this.airCurrents) {
    if (current.bounds.containsPoint(playerPos)) {
      vel.y += current.force; // Slow or speed falling
    }
  }
}
```

**Tasks:**
- [x] Redesign chapter_1.json with vertical layout
- [x] Add `air_currents` to LevelData interface
- [x] Implement air current physics in LevelBuilder
- [x] Place Wonder Stars at challenging descent targets
- [ ] Add visual indicators for air currents (particles)

---

### Phase 3: Chapter 2 - Swimming

**Files:** `src/data/LevelData.ts`, `src/world/LevelBuilder.ts`, `src/player/PlayerController.ts`

#### 3.1 Water Volume System

Extend platform types:

```typescript
// src/data/LevelData.ts
interface Platform {
  position: Vector3;
  size: Vector3;
  type: 'solid' | 'bouncy' | 'water' | 'current';
  color?: string;
  requires_size?: 'small' | 'normal' | 'large';
  // Water properties
  water_surface_y?: number;  // Top of water
  current_direction?: Vector3;  // For flowing water
}
```

#### 3.2 Swimming Physics

```typescript
// In PlayerController
private inWater: boolean = false;
private waterSurfaceY: number = 0;

update(dt: number) {
  this.checkWaterZones();

  if (this.inWater) {
    // Reduced gravity
    const buoyancy = (this.waterSurfaceY - playerPos.y) * 0.5;
    playerBody.applyImpulse(new RAPIER.Vector3(0, buoyancy, 0), true);

    // Swimming controls
    if (input.jump) {
      // Swim up
      this.momentum.y += 0.5;
    }
    if (input.crouch) {
      // Dive down
      this.momentum.y -= 0.3;
    }

    // Water drag
    this.momentum.multiplyScalar(0.95);
  }
}
```

#### 3.3 Rising/Falling Water

```typescript
// In SceneManager - water level changes
private waterLevel: number = 0;
private targetWaterLevel: number = 0;

updateWater(dt: number) {
  // Lerp water level
  this.waterLevel += (this.targetWaterLevel - this.waterLevel) * dt * 0.5;

  // Update water mesh position
  this.waterMesh.position.y = this.waterLevel;

  // Update physics zones
  for (const zone of this.waterZones) {
    zone.bounds.max.y = this.waterLevel;
  }
}

// Trigger water level changes
setWaterLevel(level: number) {
  this.targetWaterLevel = level;
}
```

**Tasks:**
- [x] Add water type to LevelData.ts Platform interface
- [x] Create water volume detection in LevelBuilder
- [x] Implement swimming physics (buoyancy, drag)
- [x] Add swim up/dive down controls
- [ ] Implement rising/falling water system
- [x] Redesign chapter_2.json with water puzzles
- [ ] Add water surface shader effect

---

### Phase 4: Chapter 3 - Racing

**Files:** `src/racing/RaceManager.ts` (new), `src/world/SpeedBoost.ts` (new)

#### 4.1 Race System

```typescript
// src/racing/RaceManager.ts
export class RaceManager {
  private checkpoints: THREE.Vector3[] = [];
  private currentCheckpoint: number = 0;
  private raceTime: number = 0;
  private isRacing: boolean = false;
  private bestTime: number = Infinity;

  startRace() {
    this.currentCheckpoint = 0;
    this.raceTime = 0;
    this.isRacing = true;
  }

  update(dt: number, playerPos: THREE.Vector3) {
    if (!this.isRacing) return;

    this.raceTime += dt;

    // Check checkpoint proximity
    const checkpoint = this.checkpoints[this.currentCheckpoint];
    if (playerPos.distanceTo(checkpoint) < 3) {
      this.currentCheckpoint++;

      if (this.currentCheckpoint >= this.checkpoints.length) {
        this.finishRace();
      }
    }
  }
}
```

#### 4.2 Speed Boosts

```typescript
// src/world/SpeedBoost.ts
export class SpeedBoost {
  private mesh: THREE.Mesh;
  private bounds: THREE.Box3;
  private boostForce: number = 15;
  private cooldown: number = 0;

  checkPlayer(playerPos: THREE.Vector3, playerController: PlayerController) {
    if (this.cooldown > 0) return;

    if (this.bounds.containsPoint(playerPos)) {
      const direction = new THREE.Vector3(0, 0, 1); // Forward
      playerController.applyBoost(direction, this.boostForce);
      this.cooldown = 1.0; // 1 second cooldown
    }
  }
}
```

**Tasks:**
- [x] Create RaceManager.ts with checkpoint system
- [x] Create SpeedBoost.ts for boost pads
- [ ] Add race HUD (timer, checkpoint counter)
- [ ] Implement NPC racers (simple AI following path)
- [x] Redesign chapter_3.json with race track layout
- [ ] Add Wonder Stars for beating time targets

---

### Phase 5: Chapter 4 - Size Mastery

**Files:** `src/player/SizeManager.ts`, `public/assets/fallback/chapter_4.json`

#### 5.1 Destructible Objects

```typescript
// In LevelBuilder - breakable platforms
interface Platform {
  // ... existing
  breakable?: boolean;
  break_requires_size?: 'large';  // Only large Alice can break
}

// Check ground pound impact
if (this.isGroundPounding && platform.breakable) {
  if (this.sizeManager.currentSize === platform.break_requires_size) {
    this.destroyPlatform(platform);
    this.spawnDebris(platform.position);
  }
}
```

#### 5.2 Size-Gated Progression

Level designed to require frequent size changes:
- Giant sections: break walls, push heavy objects
- Tiny sections: crawl through keyholes, avoid detection
- Timed size puzzles: shrink before ceiling crushes you

**Tasks:**
- [ ] Add breakable property to platforms
- [ ] Implement destruction effects (debris, sound)
- [ ] Add size-specific interaction prompts
- [ ] Redesign chapter_4.json with size puzzles
- [ ] Create pressure plates that trigger size-dependent events

---

### Phase 6: Wonder Star System

**Files:** `src/world/WonderStar.ts` (new), `src/data/LevelData.ts`

#### 6.1 Star Challenges

Each Wonder Star requires completing a specific challenge:

```typescript
interface WonderStar {
  id: string;
  name: string;
  position: Vector3;
  challenge_type: 'exploration' | 'race' | 'puzzle' | 'combat' | 'collection';
  requirements: {
    // For exploration
    reach_position?: Vector3;
    // For race
    beat_time?: number;
    // For puzzle
    activate_switches?: string[];
    // For collection
    collect_items?: number;
  };
  hint: string;
}
```

#### 6.2 Star Select Screen

When entering a level, show available stars:
- Collected stars shown as gold
- Uncollected shown as outline
- Selecting a star spawns you near its challenge

**Tasks:**
- [ ] Create WonderStar.ts challenge system
- [ ] Add star_challenges to LevelData interface
- [ ] Implement star select UI overlay
- [ ] Add 5-7 unique challenges per chapter
- [ ] Track star collection in save state

---

### Phase 7: Camera System

**Files:** `src/Game.ts`, `src/camera/CameraController.ts` (new)

#### 7.1 Camera Improvements

```typescript
// src/camera/CameraController.ts
export class CameraController {
  private targetDistance: number = 8;
  private targetYaw: number = 0;
  private targetPitch: number = 0.3;

  // C-stick style manual rotation
  rotate(dx: number, dy: number) {
    this.targetYaw += dx * 0.003;
    this.targetPitch = clamp(this.targetPitch + dy * 0.003, -0.5, 1.2);
  }

  // Auto-adjust when near walls
  update(dt: number, playerPos: THREE.Vector3) {
    // Raycast to find obstacles
    const idealPos = this.getIdealPosition(playerPos);
    const hit = this.raycastToPlayer(idealPos, playerPos);

    if (hit) {
      // Move camera closer to avoid clipping
      this.currentDistance = hit.distance * 0.9;
    } else {
      // Lerp back to target distance
      this.currentDistance = lerp(this.currentDistance, this.targetDistance, dt * 3);
    }
  }
}
```

**Tasks:**
- [ ] Extract camera logic to CameraController.ts
- [ ] Add manual rotation (arrow keys / right-click drag)
- [ ] Implement wall collision avoidance
- [ ] Add contextual zoom (close indoors, far outdoors)
- [ ] Smooth camera transitions between zones

---

### Phase 8: Polish & Juice

#### 8.1 Particle Effects

| Action | Effect |
|--------|--------|
| Jump | Dust puff at feet |
| Double Jump | Sparkle spiral |
| Ground Pound | Shockwave + debris |
| Long Jump | Speed lines |
| Land | Impact dust based on height |
| Collect Star | Burst of particles + screen flash |

#### 8.2 Sound Effects

| Action | Sound |
|--------|-------|
| Jump | "boing" with pitch variation |
| Double Jump | Higher pitch "boing" + whoosh |
| Ground Pound | Impact thud + rumble |
| Land | Thud scaled to fall height |
| Speed Boost | Whoosh + acceleration |
| Star Collect | Triumphant jingle |

**Tasks:**
- [ ] Add particle system for movement effects
- [ ] Create procedural sound effects for new moves
- [ ] Add screen shake for impacts
- [ ] Implement squash/stretch on player mesh
- [ ] Add motion blur during speed boosts

---

## Acceptance Criteria

### Functional Requirements
- [ ] Player movement uses momentum (no instant stops)
- [ ] Double jump, ground pound, long jump all functional
- [ ] Each chapter has unique mechanic (descent, swim, race, size)
- [ ] Wonder Stars provide multiple objectives per level
- [ ] Camera can be manually rotated and avoids walls

### Non-Functional Requirements
- [ ] Maintains 60fps on mid-range hardware
- [ ] Movement feels responsive (< 50ms input latency)
- [ ] All moves have audio/visual feedback

### Quality Gates
- [ ] Each chapter is distinctly playable
- [ ] No console errors during normal play
- [ ] All Wonder Stars achievable

---

## Implementation Phases

| Phase | Focus | Estimated Scope |
|-------|-------|-----------------|
| 1 | Movement System | Core foundation |
| 2 | Chapter 1 Redesign | Vertical descent |
| 3 | Chapter 2 Swimming | Water mechanics |
| 4 | Chapter 3 Racing | Speed/competition |
| 5 | Chapter 4 Size | Destruction/puzzles |
| 6 | Wonder Stars | Challenge system |
| 7 | Camera | Manual control |
| 8 | Polish | Juice/feedback |

**Recommended order:** Complete Phase 1 first (movement is foundation), then phases 2-5 can be parallelized.

---

## Dependencies & Prerequisites

- Existing Rapier.js physics setup
- Current SizeManager architecture
- CollectibleManager for star tracking

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Movement feels wrong | Medium | High | Extensive playtesting, tuning constants |
| Swimming is frustrating | Medium | Medium | Optional, can skip if time-constrained |
| Scope creep | High | High | Strict phase gates, MVP first |

---

## References

### Internal
- Brainstorm: `docs/brainstorms/2026-02-25-n64-style-overhaul-brainstorm.md`
- Performance patterns: `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md`
- Current movement: `src/Game.ts:513-675`

### External
- Mario 64 movement analysis: https://www.youtube.com/watch?v=2uyDqkp6k-o
- Platformer feel: https://www.youtube.com/watch?v=yorTG9at90g

---

*Plan created: 2026-02-25*
