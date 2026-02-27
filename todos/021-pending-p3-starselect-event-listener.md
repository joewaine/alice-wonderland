---
status: pending
priority: p3
issue_id: "021"
tags: [memory-leak, event-listeners, ui]
dependencies: []
---

# Fix StarSelect Event Listener Not Removed on Selection

## Problem Statement

The StarSelect keydown event listener is only removed when ESC is pressed, not when a star is selected, potentially leaving a dangling listener.

## Findings

**File:** `src/ui/StarSelect.ts`

- **Line 140:** `document.addEventListener('keydown', this.handleKeyDown);`
- **Line 314:** Listener only removed in ESC handler, not in `handleStarSelect()`

## Proposed Solutions

### Option 1: Remove Listener in hide()

**Approach:** Move the removeEventListener call to the `hide()` method so it's always cleaned up.

```typescript
hide(): void {
  document.removeEventListener('keydown', this.handleKeyDown);
  // ... rest of hide logic
}
```

**Pros:**
- Covers all exit paths

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Move the removeEventListener to the `hide()` method.

## Technical Details

**Affected files:**
- `src/ui/StarSelect.ts:314` - move cleanup to hide()

## Acceptance Criteria

- [ ] Listener removed in hide() method
- [ ] No dangling listeners after star selection
- [ ] ESC still works to close

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified incomplete event listener cleanup
