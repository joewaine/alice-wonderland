---
status: pending
priority: p2
issue_id: "035"
tags: [correctness, three-js, rendering]
dependencies: []
---

# OutlineEffect Bypasses Three.js Scene Graph API

## Problem Statement

`OutlineEffect.ts` directly manipulates `parent.children` array and sets `outlineMesh.parent` manually, bypassing Three.js's `add()` method. This skips internal bookkeeping (event dispatch, matrix world updates) and may cause rendering issues on the first frame.

## Findings

- `src/shaders/OutlineEffect.ts:130-131` - `parent.children.splice(index, 0, outlineMesh)` and `outlineMesh.parent = parent`
- Three.js's `add()` method handles: `dispatchEvent({ type: 'added' })`, `matrixWorldNeedsUpdate`, removal from previous parent

## Proposed Solutions

### Option 1: Use parent.add() with Reordering

**Approach:** Use `parent.add(outlineMesh)` then reorder children if insertion position matters. Since outlines use `BackSide` rendering, visual ordering should be correct regardless.

**Effort:** 30 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] Outlines use standard Three.js `add()` API
- [ ] Visual appearance unchanged

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
