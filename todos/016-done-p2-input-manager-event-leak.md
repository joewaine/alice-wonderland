---
status: done
priority: p2
issue_id: "016"
tags: [memory-leak, event-listeners, input]
dependencies: []
---

# Add dispose() Method to InputManager

## Problem Statement

The `InputManager` class adds event listeners in its constructor but has no `removeEventListener` calls or `dispose()` method. This causes memory leaks if the game is restarted or components are recreated.

## Findings

**File:** `src/engine/InputManager.ts`
**Lines:** 21-43

Multiple `window.addEventListener` calls with no corresponding cleanup:
- `keydown` listener
- `keyup` listener
- `mousedown` listener
- `mouseup` listener
- `mousemove` listener

## Proposed Solutions

### Option 1: Add dispose() Method with Stored Handlers

**Approach:** Store event handlers as class properties and add a `dispose()` method.

```typescript
private handleKeyDown = (e: KeyboardEvent) => { ... };
private handleKeyUp = (e: KeyboardEvent) => { ... };
// etc.

dispose(): void {
  window.removeEventListener('keydown', this.handleKeyDown);
  window.removeEventListener('keyup', this.handleKeyUp);
  // etc.
}
```

**Pros:**
- Follows pattern from CameraController.ts
- Enables proper cleanup

**Cons:**
- Requires refactoring anonymous functions

**Effort:** 20 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Follow the dispose pattern already used in CameraController.ts (lines 360-366).

## Technical Details

**Affected files:**
- `src/engine/InputManager.ts:21-43` - event listener setup

**Related components:**
- CameraController.ts (reference implementation)
- Game.ts (should call dispose when cleaning up)

## Acceptance Criteria

- [ ] InputManager has dispose() method
- [ ] All event handlers stored as class properties
- [ ] dispose() removes all listeners
- [ ] No memory leaks on game restart

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified missing dispose pattern in InputManager
