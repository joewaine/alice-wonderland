---
status: pending
priority: p2
issue_id: "032"
tags: [resource-leak, cleanup, architecture]
dependencies: []
---

# Game.ts Has No dispose() Method — Full Resource Leak

## Problem Statement

The `Game` class creates numerous resources (renderer, composer, DOM elements, event listeners, subsystems) but has no `dispose()` method. If the game is ever re-instantiated (HMR during dev, SPA navigation), everything leaks.

Additionally, `cameraController.dispose()` is never called despite CameraController having a proper dispose method (fixed in todo 007).

## Findings

- `src/Game.ts:239` - `window.addEventListener('resize', ...)` with anonymous arrow — can never be removed
- `src/Game.ts` - No calls to `cameraController.dispose()`, `particleManager.dispose()`, `npcController.dispose()`
- DOM elements appended to body: `instructionsDiv`, `statsOverlay`, `vignetteOverlay` — never removed
- `renderer`, `composer`, `playerMixer` — never disposed
- `src/player/PlayerController.ts` - Has no `dispose()` method at all (RAPIER objects not freed)

## Proposed Solutions

### Option 1: Add dispose() to Game and PlayerController

**Approach:** Add a `dispose()` method that tears down all subsystems, removes event listeners (store handler references), removes DOM elements, and disposes Three.js resources.

**Effort:** 2-3 hours

**Risk:** Low

## Acceptance Criteria

- [ ] Game.dispose() exists and cleans up all resources
- [ ] All subsystem dispose() methods are called
- [ ] All event listeners are removable (stored references)
- [ ] DOM elements removed from body
- [ ] HMR doesn't leak resources

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)

**Actions:**
- All 6 agents flagged missing dispose as an issue
- Learnings agent confirmed cameraController.dispose() never called despite todo 007 fix
