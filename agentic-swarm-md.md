# AGENTIC_SWARM.md
# Autonomous Visual & Feel Polish System for Three.js Game

---

## 0. How To Use This File

Feed this entire file as context to your LLM coding agent (Claude Code, Cursor, Aider, etc.).
Then prompt: **"Read AGENTIC_SWARM.md. Run Cycle 1 starting with the StyleBible phase."**

The agent will create the directory structure, analyze your codebase, and begin
iterating through the phases below. Each phase produces artifacts in `/swarm/`
that subsequent phases consume.

---

## 1. Directory Structure — Create On First Run

```
/swarm/
  style/
    style_bible.json          # Extracted visual rules
    color_profiles.json       # Palette definitions
    lighting_profiles.json    # Light rig presets
  probes/
    scenes.ts                 # Deterministic test scenes
    screenshots/              # Before/after captures
    metrics.json              # Scored results per cycle
  reports/
    cycle_log.md              # Running log of all changes
    material_audit.md         # PBR compliance scan
    performance_report.md     # FPS + bundle size tracking
    gameplay_tuning.md        # Feel adjustments log
  patches/
    *.patch                   # Every change as a reviewable diff
```

---

## 2. The Cycle

Every improvement cycle follows this exact order. **Do not skip phases.**

```
┌─────────────────────────────────────────────────┐
│  PHASE 1: Analyze  →  StyleBible + Audit        │
│  PHASE 2: Light    →  Renderer + Lighting       │
│  PHASE 3: Surface  →  Materials + Shaders       │
│  PHASE 4: Move     →  Camera + Feel + Juice     │
│  PHASE 5: Verify   →  QA + Performance + Report │
└─────────────────────────────────────────────────┘
         ↑                                    │
         └────────── next cycle ──────────────┘
```

---

## 3. Phase Definitions

### PHASE 1 — ANALYZE

**Goal:** Understand what exists before touching anything.

**Step 1.1 — Codebase Scan**
- Find ALL files containing: `THREE.`, `renderer`, `scene`, `camera`, `material`, `light`, `postprocessing`, `EffectComposer`
- Map the scene graph hierarchy
- List every material type in use
- List every light in use (type, intensity, color, shadow settings)
- List current postprocessing stack (if any)
- Output: summary at top of `/swarm/reports/cycle_log.md`

**Step 1.2 — Style Bible Generation**
Analyze existing visuals + any reference images in `/references/` (if provided).
Produce `/swarm/style/style_bible.json`:

```json
{
  "target_mood": "atmospheric / gritty / dreamy / clean / etc",
  "palette": {
    "primary": ["#hex1", "#hex2", "#hex3"],
    "accent": ["#hex4"],
    "shadow_tint": "#hex5",
    "fog_color": "#hex6"
  },
  "lighting": {
    "key_fill_ratio": 2.5,
    "shadow_type": "soft",
    "ambient_intensity": 0.4,
    "env_map_intensity": 1.0
  },
  "post": {
    "tone_mapping": "ACESFilmic",
    "exposure": 1.0,
    "bloom": { "enabled": true, "intensity": 0.3, "threshold": 0.85 },
    "fog": { "type": "exponential2", "density": 0.005 }
  },
  "rules": [
    "No pure black shadows — always tinted",
    "Bloom only on emissive + sky — never full-screen glow",
    "Fog must separate foreground from background",
    "Maximum 3 dominant hues per scene"
  ]
}
```

**Step 1.3 — Material Audit**
Scan every material. For each, flag:
- Albedo too bright (> 0.8 luminance) or too dark (< 0.03)
- Metalness on non-metal objects
- Missing roughness variation
- Emissive used as fake lighting (anti-pattern)
- Missing normal maps on large surfaces
Output: `/swarm/reports/material_audit.md`

**CHECKPOINT: Commit nothing yet. Just reports.**

---

### PHASE 2 — LIGHT

**Goal:** Establish the foundational look via renderer config + lighting.

**Allowed changes:**
- `renderer.toneMapping` and `renderer.toneMappingExposure`
- `renderer.outputColorSpace`
- `renderer.shadowMap.type` and shadow resolution
- Add/modify fog
- Adjust existing lights (intensity, color, shadow bias)
- Add fill/rim lights if scene has < 2 lights
- Add or configure postprocessing: Bloom, SSAO, ColorCorrection
- Add environment map for ambient lighting

**Process:**
1. Record current state (screenshot probe scenes)
2. Apply changes ONE category at a time (tone mapping first, then shadows, then fog, etc.)
3. After each sub-change, evaluate:
   - Does foreground pop from background? (depth separation)
   - Are shadows readable, not crushed?
   - Is the palette consistent with style_bible.json?
   - Any overexposed areas?
4. Log every parameter change in cycle_log.md

**Performance gate:** If FPS drops > 15%, revert and try lower-cost alternative.

---

### PHASE 3 — SURFACE

**Goal:** Make materials and shaders match the style bible.

**Allowed changes:**
- Fix all issues flagged in material_audit.md
- Adjust roughness/metalness ranges
- Add detail normal maps or roughness variation
- Introduce custom shader effects (ONLY from this approved list):
  - Rim/fresnel lighting
  - Distance-based desaturation (aerial perspective)
  - Shadow color tinting
  - Subtle dithered transparency
  - Vertex displacement for organic feel (grass, water, cloth)

**Banned:**
- Toon/cel shading (unless style_bible specifies it)
- Outline passes (expensive, usually ugly)
- Full-screen distortion effects
- Any shader over 80 ALU instructions without justification

**Process:**
1. Fix audit issues first (PBR correctness)
2. Then add expressive shaders one at a time
3. Each addition must cite which style_bible.json rule it serves

---

### PHASE 4 — MOVE

**Goal:** Make the game FEEL better. Camera, controls, juice.

**4A — Camera**
- Add smoothing/damping if camera is raw-attached to player
- Implement dead zone (small movements don't jerk camera)
- Add subtle look-ahead in movement direction
- Ensure player is always readable (not occluded, not at screen edge)
- Optional: rule-of-thirds bias for exploration moments

**4B — Input & Feel**
Review and improve (where applicable):
- Coyote time (allow jump briefly after leaving edge): ~80-120ms
- Input buffering (queue jump if pressed slightly early): ~100ms
- Acceleration curves (don't use linear lerp for movement)
- Landing recovery frames
- Turn responsiveness

**4C — Juice**
Add subtle feedback layers:
- Screenshake on impacts (short duration, < 100ms, low amplitude)
- FOV kick on speed boost / dash
- Hitstop on collisions (1-3 frame pause)
- Particle bursts on key interactions
- Camera trauma system (additive shake from multiple sources, decaying)

**All changes must:**
- Be toggleable via a config object
- Have before/after metrics logged in gameplay_tuning.md
- Not alter core game rules (win/lose conditions, health values, etc.)

---

### PHASE 5 — VERIFY

**Goal:** Prove the cycle improved things. Catch regressions.

**5.1 — Performance Test**
Measure and record in `/swarm/reports/performance_report.md`:
- FPS (avg, 1% low) on probe scenes
- Draw calls
- Triangle count
- Texture memory
- Shader compile time

**Budgets (hard limits):**
| Metric              | Desktop Target | Laptop Target |
|---------------------|---------------|---------------|
| FPS                 | 60            | 45            |
| Draw calls          | < 200         | < 150         |
| Texture memory      | < 256MB       | < 128MB       |

If any budget is exceeded, the offending change MUST be reverted or optimized.

**5.2 — Visual Comparison**
Re-render all probe scenes. Place before/after in `/swarm/probes/screenshots/`.
For each pair, note:
- Depth separation: improved / same / worse
- Color cohesion: improved / same / worse
- Readability: improved / same / worse
- Overall mood alignment with style_bible: improved / same / worse

**5.3 — Cycle Summary**
Append to cycle_log.md:
```
## Cycle [N] Summary
Date: [date]
Changes applied: [count]
Reverted: [count]
FPS delta: [before] → [after]
Visual improvements: [list]
Remaining issues: [list]
Next cycle priorities: [list]
```

---

## 4. The Prime Directive

**Beautiful means INTENTIONAL, not flashy.**

```
GOOD                              BAD
─────────────────────────────     ─────────────────────────────
Tinted shadows                    Pure black shadows
Subtle depth fog                  Pea-soup fog everywhere
Bloom on light sources only       Bloom on everything
Muted palette + 1 accent          Rainbow vomit
Camera that breathes              Camera that's welded to player
3-frame hitstop                   Screen shaking constantly
Quiet moments between action      Non-stop particle spam
```

Every change must pass this test:
> "If I showed this to a game artist, would they say it looks DESIGNED
> rather than DEFAULT or OVERDONE?"

---

## 5. Reference Styles Quick-Select

If the user hasn't specified a style, ask. Otherwise pick the closest:

| Style Tag       | References                              | Key Traits                                    |
|----------------|-----------------------------------------|-----------------------------------------------|
| `atmospheric`  | Inside, Limbo, Little Nightmares        | Deep shadows, limited palette, fog, silhouette |
| `painterly`    | Zelda BOTW/TOTK, Gris, Okami           | Soft edges, color washes, stylized lighting    |
| `cyberpunk`    | Ghostrunner, Cloudpunk, VA-11 HALL-A   | Neon accents, dark base, bloom, wet surfaces   |
| `clean`        | Monument Valley, Journey, Sky           | Geometric, pastel, strong silhouettes          |
| `gritty`       | Dark Souls, Bloodborne, Stalker        | Desaturated, high contrast, particle dust      |
| `retro`        | Hyper Light Drifter, Celeste, Shovel K | Limited palette, pixel-aware, crisp            |

---

## 6. Quick-Start Prompt Templates

### First run:
```
Read AGENTIC_SWARM.md at the project root.
Run Phase 1 (Analyze). Scan the codebase, generate the style bible,
and produce the material audit. Do not change any code yet.
```

### After analysis:
```
Read the style bible and material audit in /swarm/.
The target style is [atmospheric / painterly / etc].
Run Phase 2 (Light). Apply renderer and lighting improvements.
Show me before/after for each change.
```

### Full auto cycle:
```
Read AGENTIC_SWARM.md. Run a full cycle (Phases 1-5).
Target style: [style_tag].
Pause before Phase 4 (Move) for my approval on feel changes.
Log everything in /swarm/reports/.
```

---

## 7. Agent Behavioral Rules

1. **Read before writing.** Always scan existing code before modifying.
2. **One concern per commit.** Don't bundle lighting + material + camera changes.
3. **Show your math.** Every parameter choice needs a one-line justification.
4. **Revert fast.** If a change doesn't measurably improve things, undo it.
5. **Never delete gameplay.** You polish the gem, you don't reshape it.
6. **Name everything.** No magic numbers. Use constants with descriptive names.
7. **Log obsessively.** Future cycles depend on past cycle data.
8. **Ask when uncertain.** If the style bible doesn't cover a decision, ask the user.

---

## 8. Extending The Swarm

To add new agent capabilities, append a new phase section following this template:

```markdown
### PHASE N — [NAME]
**Goal:** [one sentence]
**Allowed changes:** [explicit list]
**Banned:** [explicit list]
**Process:** [numbered steps]
**Metrics:** [how to measure success]
```

Then insert it into the cycle order in Section 2.

---

*End of AGENTIC_SWARM.md — Feed this to your agent and let it cook.*
