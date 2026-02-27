---
status: done
priority: p1
issue_id: "007"
tags: [memory-leak, event-listeners, camera]
dependencies: []
---

# CameraController Missing dispose() Method - Event Listener Memory Leak

## Problem Statement

`CameraController.ts` adds 5 event listeners to the canvas in `setupMouseEvents()` but provides no way to remove them. When the camera controller is recreated (level reload, scene change), listeners accumulate causing memory leaks and potential duplicate event handling.

This violates the documented pattern in `docs/solutions/performance-issues/mesh-caching-memory-race-conditions.md`: "Every dynamically created element must have a corresponding cleanup path."

## Findings

- **Lines 108-143:** Five event listeners added using inline arrow functions
- No `dispose()` method exists in the class
- Arrow functions cannot be removed because no reference is stored
- `StarSelect.ts` demonstrates the correct pattern: storing handler references

**Affected listeners:**
1. `mousedown` (line 108)
2. `mouseup` (line 118)
3. `mousemove` (line 124)
4. `mouseleave` (line 136)
5. `contextmenu` (line 141)

## Proposed Solutions

### Option 1: Store Handler References and Add dispose()

**Approach:** Refactor to store event handlers as class properties and implement dispose().

```typescript
private canvas: HTMLElement | null = null;
private handleMouseDown = (e: MouseEvent): void => { /* ... */ };
private handleMouseUp = (e: MouseEvent): void => { /* ... */ };
private handleMouseMove = (e: MouseEvent): void => { /* ... */ };
private handleMouseLeave = (): void => { /* ... */ };
private handleContextMenu = (e: Event): void => { /* ... */ };

dispose(): void {
  if (this.canvas) {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
    this.canvas.removeEventListener('contextmenu', this.handleContextMenu);
    this.canvas = null;
  }
}
```

**Pros:**
- Clean pattern matching existing codebase (ParticleManager, WonderStarManager)
- Explicit cleanup
- Testable

**Cons:**
- Requires refactoring setupMouseEvents()

**Effort:** 30-45 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Also update `Game.ts` to call `cameraController.dispose()` during cleanup.

## Technical Details

**Affected files:**
- `src/camera/CameraController.ts:107-144` - Add stored handlers
- `src/camera/CameraController.ts` - Add dispose() method
- `src/Game.ts` - Call dispose() on camera controller during cleanup

**Related components:**
- InputManager (also has event listeners but pre-existing issue)
- StarSelect (demonstrates correct pattern)

## Acceptance Criteria

- [ ] Event handlers stored as class properties
- [ ] dispose() method removes all listeners
- [ ] Game.ts calls dispose() appropriately
- [ ] No memory leak on level reload

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified missing dispose pattern
- Compared against existing cleanup patterns in codebase
- Found violation of documented memory leak prevention pattern
