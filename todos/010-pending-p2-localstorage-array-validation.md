---
status: pending
priority: p2
issue_id: "010"
tags: [validation, localStorage, robustness]
dependencies: []
---

# localStorage Parsing Missing Array Validation

## Problem Statement

`WonderStarManager.getCollectedStarIds()` parses localStorage data but doesn't validate the result is actually an array. If corrupted data parses as a non-array (e.g., `{}`), subsequent array operations will fail.

## Findings

- **Lines 402-424:** `getCollectedStarIds()` uses try-catch but doesn't validate parsed type

```typescript
private getCollectedStarIds(): string[] {
  try {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];  // Could return non-array
  } catch {
    return [];
  }
}
```

If `stored` contains `"{}"` or `"null"` or `"123"`, `JSON.parse()` succeeds but returns a non-array.

## Proposed Solutions

### Option 1: Add Array.isArray Check

**Approach:** Validate the parsed result before returning.

```typescript
private getCollectedStarIds(): string[] {
  try {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
```

**Pros:**
- Simple defensive check
- Handles all edge cases

**Cons:**
- None

**Effort:** 5 minutes

**Risk:** Low

## Recommended Action

Add Array.isArray validation.

## Technical Details

**Affected files:**
- `src/world/WonderStarManager.ts:402-424`

## Acceptance Criteria

- [ ] Parsed localStorage data validated as array
- [ ] Non-array data returns empty array gracefully

## Work Log

### 2026-02-26 - Security Review Discovery

**By:** Claude Code

**Actions:**
- Identified missing type validation
- Proposed defensive fix
