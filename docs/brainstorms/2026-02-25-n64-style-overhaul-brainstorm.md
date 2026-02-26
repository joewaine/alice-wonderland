# N64-Style Game Overhaul

## What We're Building

Transform Alice in Wonderland from a basic platformer into a polished N64-style collectathon inspired by Mario 64, Banjo-Kazooie, and DK64.

### Core Pillars

1. **Movement Feel** - Momentum-based physics with Mario 64-style moveset
2. **Distinct Chapters** - Each level has unique mechanics, not just different visuals
3. **Exploration Depth** - Multiple paths, secrets, reasons to backtrack
4. **N64 Charm** - Signature moves, memorable moments, juicy feedback

## Why This Approach

Current state problems:
- All 4 levels feel identical (same mechanics, same rectangular platforms)
- Movement feels slow and unresponsive (no momentum, instant stops)
- Lacking engagement (collect items, jump to gate, done)
- No exploration incentive (linear path to exit)

N64 platformers solved this with:
- Fluid, satisfying movement that's fun even without objectives
- Each world introducing new mechanics that change how you play
- Dense levels packed with secrets, shortcuts, and optional challenges
- Iconic moves that define the character (triple jump, ground pound)

## Key Decisions

### Movement System (Mario 64 Style)

| Move | Input | Description |
|------|-------|-------------|
| Run | WASD | Momentum-based, accelerates to top speed |
| Jump | Space | Height based on hold duration |
| Double Jump | Space x2 | Higher second jump with flip animation |
| Triple Jump | Space x3 while running | Highest jump, requires momentum |
| Ground Pound | Space → Crouch in air | Slam down, breaks certain platforms |
| Long Jump | Crouch + Jump while running | Horizontal distance jump |
| Wall Kick | Jump against wall | Bounce off walls to climb |
| Dive | Jump + Crouch | Forward dive, can roll out |

**Speed**: Increase base run speed from 8 to 12+ units. Add acceleration curve.

### Chapter Mechanics

| Chapter | Theme | Signature Mechanic | Key Challenge |
|---------|-------|-------------------|---------------|
| 1: Rabbit-Hole | Vertical descent | Controlled falling, air steering | Land on target platforms while falling |
| 2: Pool of Tears | Flooded world | Swimming, rising/falling water | Navigate as water levels change |
| 3: Caucus-Race | Racing arena | Speed boosts, timed races | Beat NPCs to checkpoints |
| 4: Rabbit's House | Size mastery | Giant destruction, tiny navigation | Master size switching under pressure |

### Level Design Principles

- **No more rectangular boxes** - Curved surfaces, slopes, varied geometry
- **Verticality** - Every level should have meaningful height variation
- **Multiple paths** - At least 2-3 routes to any objective
- **Hidden areas** - Secret collectibles off the beaten path
- **Moving elements** - Platforms, hazards, environmental changes

### Collectible Redesign

| Item | Purpose | Per Level |
|------|---------|-----------|
| Golden Key | Unlocks gate (required) | 1 |
| Wonder Stars | Major challenges (like Power Stars) | 5-7 |
| Playing Cards | Hidden throughout (like notes/jiggies) | 10-15 |
| Mushrooms | Size change pickups | As needed |

**Wonder Stars** are the main progression - each requires completing a specific challenge (race, puzzle, exploration, combat).

### Camera System

- **C-stick style** rotation (arrow keys or right-click drag)
- **Preset positions** per area (contextual camera)
- **Zoom levels** - Close for indoor, far for outdoor
- **Auto-adjust** when near walls

## Open Questions

*None - all major decisions captured above.*

## Technical Scope

### Must Have (MVP)
- [ ] Momentum-based movement with acceleration
- [ ] Double jump, ground pound, long jump
- [ ] 4 redesigned levels with distinct mechanics
- [ ] Swimming system (Chapter 2)
- [ ] Racing system (Chapter 3)
- [ ] Wonder Star challenges
- [ ] Improved camera controls

### Should Have
- [ ] Wall kick
- [ ] Triple jump
- [ ] Moving platforms
- [ ] Particle effects for all moves
- [ ] Sound effects for new moves

### Nice to Have
- [ ] Dive and roll
- [ ] NPC races with AI
- [ ] Speedrun timer
- [ ] Unlockable moves

## References

- **Mario 64**: Movement feel, camera system, star challenges
- **Banjo-Kazooie**: Collectible density, world design, character abilities
- **DK64**: Multiple characters (size states = different "characters")
- **Spyro**: Gliding, charging, gem collection

---

*Brainstorm created: 2026-02-25*
