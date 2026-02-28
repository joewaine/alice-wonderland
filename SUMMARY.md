# Alice in Wonderland - 3D Platformer

## What It Is

A browser-based 3D platformer built around Lewis Carroll's *Alice's Adventures in Wonderland*. Alice explores Wonderland chapters, talks to story characters, collects items, and uses a size-changing mechanic to solve puzzles — all rendered in a Breath of the Wild-inspired cel-shaded art style.

---

## Core Tech Stack

| Layer | Technology |
|---|---|
| **Rendering** | Three.js (v0.183) — custom cel-shading GLSL shaders |
| **Physics** | Rapier3D (`@dimforge/rapier3d-compat`) — rigid body dynamics |
| **Language** | TypeScript (strict mode) |
| **Build Tool** | Vite 7 (ES2022 target, top-level await for async Rapier init) |
| **Audio** | Web Audio API — fully procedural, zero audio files |
| **UI** | Plain HTML/CSS overlays (no framework) |
| **Asset Pipeline** | `@gltf-transform` + DRACO compression for GLB models |

---

## Game Features

### Movement & Physics

- WASD movement with momentum/acceleration (not instant direction snaps)
- Jump with **coyote time** (8 frames of forgiveness after leaving a ledge), **jump buffering** (6 frames before landing), and **double jump**
- Landing lockout and squash animation for feel
- Swimming with buoyancy and water currents
- Air current zones, speed boost zones, bounce pads
- First-person / third-person camera toggle (V key)

### Size-Changing Mechanic

The core puzzle mechanic — Alice can shrink (Q) or grow (R) using pickups:

- **Small (0.5x):** Slower, lower jumps, fits through tight gaps
- **Normal (1.0x):** Baseline
- **Large (2.0x):** Faster, higher jumps, breaks fragile platforms

Size-gated areas require specific sizes to access, and breakable platforms add risk to being large.

### NPCs & Dialogue

- **25 story characters** as 3D models (White Rabbit, Cheshire Cat, Mad Hatter, Queen of Hearts, etc.)
- Press E to talk — dialogue cycles through lines pulled from the original book text
- NPC portraits rendered from their actual 3D models via an offscreen Three.js renderer
- Distance-based performance tiers: full animation nearby, reduced further away, static at distance
- NPCs face the player with smooth rotation during interaction

### Collectibles & Progression

- **Golden Keys** — unlock gates to the next chapter
- **Playing Cards** — scattered collectibles (with suit metadata)
- **Wonder Stars** — special collectibles
- Magnet attraction pulls collectibles toward the player within 3.5 units
- Chime audio feedback on pickup

### Quest System

- State machine: `locked → available → active → complete`
- Quests unlock areas, spawn NPCs, and gate progression
- Progress tracked with custom metrics, persisted to localStorage
- Quest notifications pop up on state changes

### UI Screens

- **Main Menu** — golden-themed title screen
- **Mission Select** — chapter picker showing locked/unlocked quests
- **HUD** — collectible counters, chapter title, size indicator, mute toggle
- **Dialogue Box** — character name, 3D portrait, dialogue text
- **Loading Screen** — during asset loading
- **Pause Menu** — ESC to pause
- **Performance Stats** — backtick key toggles FPS/frame time overlay

---

## Visual Style

### Cel-Shading (Custom GLSL)

- **CelShaderMaterial** — 3-step diffuse lighting (shadow/mid/highlight bands), rim lighting, texture support
- **OutlineEffect** — screen-space outlines on characters and objects
- Inspired by Breath of the Wild's aesthetic

### Procedural Textures

All textures generated at runtime via HTML Canvas — no texture image files:

- Grass (with painted blade strokes)
- Stone (with crack patterns)
- Wood (grain patterns)
- Hedge (noise-based)
- Marble (Voronoi-like)

### Procedural Audio

Every sound is synthesized with the Web Audio API — zero audio files in the project:

- **SFX:** Jump sweeps, landing thuds, collect chimes, size-change sparkles, gate unlock fanfares, surface-specific footsteps (grass/stone/wood)
- **Music:** Ambient procedural loops with mood-based scales (C minor for mysterious, C major for playful)

### Particles & Effects

- Burst effects on collectible pickup
- Ambient floating particles
- Rose petal particles in garden areas
- Foliage wind-sway animation

---

## APIs & External Services (Build-Time Only)

These are used during the **asset generation pipeline**, not at runtime:

| API | Purpose |
|---|---|
| **Anthropic Claude** | Generates level layouts (JSON) and NPC dialogue from prompts |
| **Tripo3D** | Text/image → 3D model generation for garden assets and characters |
| **ComfyUI Cloud** | Image generation for skyboxes and character reference art |
| **Project Gutenberg** | Fetches the full Alice in Wonderland text for authentic dialogue |

The production build has **zero external runtime dependencies** — all generated assets are pre-baked.

---

## Architecture

Modular manager-based architecture with callback-driven events:

```
src/
├── main.ts                    # Entry point
├── Game.ts                    # Main game loop orchestrator (biggest file)
├── engine/                    # Input, scene management, asset loading
├── player/                    # PlayerController, SizeManager
├── world/                     # LevelBuilder, collectibles, gates, pickups
├── npcs/                      # NPC controller, dialogue UI
├── camera/                    # Third-person follow camera with wall fade
├── animation/                 # Skeletal animation state machine
├── effects/                   # Particles, foliage animation
├── audio/                     # Procedural SFX and music synthesis
├── shaders/                   # Cel-shader GLSL, outline effect
├── ui/                        # Menu screens, HUD, quest notifications
├── api/                       # Tripo3D, ComfyUI, Claude, Gutenberg clients
├── quests/                    # Quest state machine
├── data/                      # Level data TypeScript interfaces
```

### Key Patterns

- **Manager classes** for centralized state (QuestManager, ParticleManager, etc.)
- **Callback pattern** for events (`onJump`, `onLand`, `onCollectiblePickup`)
- **Object pooling** for particles to reduce GC pressure
- **Pre-allocated vectors** cached in the game loop to avoid per-frame allocations
- **Tiered updates** — NPCs update at different rates based on distance from player
- **Mesh caching** — traversals cached to skip per-frame `traverse()` calls

---

## Asset Generation Workflow

The development cycle uses AI APIs to generate content, then bakes everything for production:

```
1. Write prompts describing desired content
        ↓
2. Claude API → Level JSON layouts + NPC dialogue
        ↓
3. Tripo3D API → 3D models (GLB) from text/image descriptions
   ComfyUI Cloud → Skybox images, character reference art
        ↓
4. Post-process: DRACO compression, polygon simplification
   (scripts/compress-models.ts, scripts/simplify-models.ts)
        ↓
5. Assets land in /public/assets/ — committed to repo
        ↓
6. npm run dev → Vite serves everything client-side
   npm run build → Production bundle to /dist
```

### Build Scripts

Located in `/scripts/`:

- `generate-garden-models.ts` — Tripo3D garden asset generation
- `generate-npc-models.ts` — Character model creation
- `generate-skyboxes.ts` — ComfyUI skybox images
- `generate-portraits.ts` — 3D → 2D portrait rendering
- `generate-levels-only.ts` — Claude-powered level data
- `compress-models.ts` / `simplify-models.ts` — Optimization

---

## Deployment

- **Render** (current target, base URL `/`)
- **Vercel** (configured via `vercel.json`)
- Pure client-side — no server needed at runtime

---

## By the Numbers

- **25** NPC character models
- **26** garden asset models
- **0** external audio files (all procedural)
- **0** external texture files (all procedural)
- **0** runtime API calls (all pre-generated)
