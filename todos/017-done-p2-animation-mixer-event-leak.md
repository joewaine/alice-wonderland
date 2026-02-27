---
status: done
priority: p2
issue_id: "017"
tags: [memory-leak, event-listeners, animation]
dependencies: []
---

# Fix AnimationStateManager Event Listener Leak

## Problem Statement

The `AnimationStateManager` adds a `finished` event listener to the mixer in the constructor but does not remove it in the `dispose()` method.

## Findings

**File:** `src/animation/AnimationStateManager.ts`

- **Line 63:** Event listener added: `this.mixer.addEventListener('finished', ...)`
- **Line 244:** `dispose()` method calls `stopAll()` but does NOT remove the event listener

## Proposed Solutions

### Option 1: Store Handler and Remove in dispose()

**Approach:** Store the event handler as a class property and remove it in dispose().

```typescript
private handleAnimationFinished = (e: THREE.Event) => { ... };

constructor(mixer: THREE.AnimationMixer) {
  this.mixer.addEventListener('finished', this.handleAnimationFinished);
}

dispose(): void {
  this.mixer.removeEventListener('finished', this.handleAnimationFinished);
  this.stopAll();
  this.animations.clear();
}
```

**Pros:**
- Proper cleanup
- Prevents memory leaks

**Cons:**
- Minor refactor needed

**Effort:** 10 minutes

**Risk:** Low

## Recommended Action

Implement Option 1. Store the handler reference and remove it in dispose().

## Technical Details

**Affected files:**
- `src/animation/AnimationStateManager.ts:63` - event listener setup
- `src/animation/AnimationStateManager.ts:244` - dispose() method

## Acceptance Criteria

- [ ] Event handler stored as class property
- [ ] dispose() removes the event listener
- [ ] No memory leaks when animation manager is disposed

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified missing event listener cleanup in AnimationStateManager
