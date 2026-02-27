---
status: done
priority: p2
issue_id: "052"
tags: [ui, dead-code]
dependencies: []
---

# On-screen instructions still show "Shift - Ground Pound"

## Problem Statement

The in-game control instructions displayed to players still list "Shift - Ground Pound" as a control. Ground pound was removed in this PR. This will confuse players.

## Findings

- `src/Game.ts:1399` — `<p style="margin:5px 0"><b>Shift</b> - Ground Pound</p>` in HTML string

## Proposed Solutions

### Option 1: Remove the ground pound line

**Approach:** Delete the line from the instructions HTML.

**Effort:** 1 minute

**Risk:** None

## Technical Details

**Affected files:**
- `src/Game.ts:1399` — delete ground pound instruction line

## Acceptance Criteria

- [ ] No reference to ground pound in on-screen controls
- [ ] Instructions only show valid controls (WASD, Space, mouse)

## Work Log

### 2026-02-27 - Initial Discovery

**By:** Claude Code (PR #6 review)
