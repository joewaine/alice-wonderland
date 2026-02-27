---
status: pending
priority: p2
issue_id: "018"
tags: [architecture, refactoring, maintainability]
dependencies: []
---

# Refactor Game.ts God Class

## Problem Statement

The `Game` class (843 lines) handles too many responsibilities, making it difficult to test, modify, and extend. Changes to player behavior require modifying the central Game class.

## Findings

**File:** `src/Game.ts`
**Lines:** 28-871

Current responsibilities:
- Three.js renderer/scene setup
- Physics world initialization
- Player setup and management
- Size pickup management
- Camera controller coordination
- Audio control
- Input handling delegation
- Chapter loading
- Death/respawn logic
- HUD coordination
- Squash/stretch animation
- Lighting setup
- Game loop management

Evidence:
- 30+ private properties
- 20+ private methods
- Direct management of player mesh, physics body, animations, pickups, camera, particles

## Proposed Solutions

### Option 1: Extract PlayerManager

**Approach:** Create a `PlayerManager` class that owns player mesh, physics body, size manager, controller, and animations.

**Pros:**
- Player logic isolated and testable
- Game.ts reduced by ~200 lines
- Clear ownership of player state

**Cons:**
- Requires careful coordination between managers
- Some callbacks need restructuring

**Effort:** 4-6 hours

**Risk:** Medium

### Option 2: Extract LevelSessionManager

**Approach:** Create a `LevelSessionManager` for chapter loading and level-specific state (size pickups, camera zones).

**Pros:**
- Chapter transitions isolated
- Cleaner restart/respawn logic

**Cons:**
- Still leaves Game.ts large

**Effort:** 2-3 hours

**Risk:** Low

## Recommended Action

Start with Option 2 (lower risk), then consider Option 1 in a future refactor.

## Technical Details

**Affected files:**
- `src/Game.ts` - main refactoring target
- New: `src/managers/PlayerManager.ts`
- New: `src/managers/LevelSessionManager.ts`

## Acceptance Criteria

- [ ] Game.ts under 500 lines
- [ ] Clear separation of concerns
- [ ] All existing functionality preserved
- [ ] No regression in gameplay

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified God class anti-pattern in Game.ts
- Proposed extraction strategies
