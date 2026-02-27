---
status: pending
priority: p2
issue_id: "037"
tags: [resource-leak, rapier, cleanup]
dependencies: ["032"]
---

# CameraController RAPIER Ray Leak + dispose() Never Called

## Problem Statement

CameraController creates a `RAPIER.Ray` in its constructor (backed by WASM memory) but never frees it in `dispose()`. Additionally, `Game.ts` never calls `cameraController.dispose()` despite todo 007 establishing this requirement.

## Findings

- `src/camera/CameraController.ts:180` - `new RAPIER.Ray(...)` created, never freed
- `src/camera/CameraController.ts:628-634` - `dispose()` removes event listeners but not RAPIER Ray
- `src/Game.ts` - No call to `cameraController.dispose()` anywhere

## Proposed Solutions

### Option 1: Free Ray in dispose() + Call from Game.ts

**Approach:** Add `this.ray.free()` to CameraController.dispose(). Add `this.cameraController?.dispose()` to Game.ts cleanup.

**Effort:** 15 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] RAPIER Ray freed in dispose()
- [ ] Game.ts calls cameraController.dispose() during cleanup

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)

**Actions:**
- Learnings researcher confirmed todo 007 required Game.ts to call dispose — not done
