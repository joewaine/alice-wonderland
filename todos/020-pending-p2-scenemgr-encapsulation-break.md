---
status: pending
priority: p2
issue_id: "020"
tags: [architecture, encapsulation, code-quality]
dependencies: []
---

# Fix SceneManager Breaking LevelBuilder Encapsulation

## Problem Statement

The `SceneManager.tryBreakPlatform()` method directly accesses `LevelBuilder`'s private `world` property using bracket notation, bypassing encapsulation.

## Findings

**File:** `src/engine/SceneManager.ts`
**Line:** 420

```typescript
this.levelBuilder['world'].removeRigidBody(platform.body);
```

This is a code smell that will break if LevelBuilder internals change.

## Proposed Solutions

### Option 1: Add removeBody() Method to LevelBuilder

**Approach:** Add a public method to LevelBuilder that handles rigid body removal.

```typescript
// LevelBuilder.ts
removeBody(body: RAPIER.RigidBody): void {
  this.world.removeRigidBody(body);
}
```

**Pros:**
- Proper encapsulation
- LevelBuilder can add validation/cleanup logic

**Cons:**
- Minor API addition

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Add a proper public method to LevelBuilder.

## Technical Details

**Affected files:**
- `src/world/LevelBuilder.ts` - add removeBody() method
- `src/engine/SceneManager.ts:420` - call new method

## Acceptance Criteria

- [ ] LevelBuilder has removeBody() method
- [ ] SceneManager uses the public method
- [ ] No bracket notation access to private properties
- [ ] Platform breaking works correctly

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified encapsulation violation in SceneManager
