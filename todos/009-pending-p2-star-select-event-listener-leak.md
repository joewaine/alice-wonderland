---
status: pending
priority: p2
issue_id: "009"
tags: [memory-leak, event-listeners, ui]
dependencies: []
---

# StarSelect Keydown Listener Not Removed on Background Click

## Problem Statement

`StarSelect.ts` adds a `keydown` listener for ESC key handling (line 140), but only removes it when ESC is actually pressed (line 314). If the user closes the dialog by clicking the background, the listener persists.

## Findings

- **Line 140:** `document.addEventListener('keydown', this.handleKeyDown);`
- **Line 314:** `document.removeEventListener('keydown', this.handleKeyDown);` - only called when ESC pressed
- **Line 256:** `handleClose()` is called on background click but doesn't remove listener

If users repeatedly open and close the star select via background clicks, listeners accumulate.

## Proposed Solutions

### Option 1: Remove Listener in hide() Method

**Approach:** Add cleanup to the hide() method.

```typescript
hide(): void {
  document.removeEventListener('keydown', this.handleKeyDown);
  if (this.container) {
    this.container.style.display = 'none';
  }
}
```

**Pros:**
- Simple one-line fix
- Guarantees cleanup regardless of how dialog is closed

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Add the removeEventListener call to hide().

## Technical Details

**Affected files:**
- `src/ui/StarSelect.ts:256` - Add listener removal

## Acceptance Criteria

- [ ] Keydown listener removed in hide() method
- [ ] No listener accumulation when repeatedly opening/closing

## Work Log

### 2026-02-26 - Code Review Discovery

**By:** Claude Code

**Actions:**
- Identified incomplete cleanup path
- Verified correct handler storage pattern already exists
