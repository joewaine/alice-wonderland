---
status: done
priority: p3
issue_id: "040"
tags: [dom, cleanup, correctness]
dependencies: []
---

# HUD Injects Style Tags into Head Per Invocation

## Problem Statement

`showChapterComplete` and `showLevelComplete` each create a new `<style>` element with keyframe animations and append it to `document.head` on every call. If cleanup fails or multiple overlays show rapidly, style tags leak.

## Findings

- `src/ui/HUD.ts:412-420` - Style injection in showChapterComplete
- `src/ui/HUD.ts:515-522` - Style injection in showLevelComplete
- `src/ui/HUD.ts:355` - `popAnimationStyle` is correctly created once in constructor

## Proposed Solutions

### Option 1: Create Styles Once in Constructor

**Approach:** Follow the `popAnimationStyle` pattern — create all keyframe animation styles once in the constructor.

**Effort:** 15 minutes

**Risk:** Low

## Acceptance Criteria

- [ ] Animation styles created once, not per invocation
- [ ] No style tag leaks in document.head

## Work Log

### 2026-02-27 - Code Review Discovery

**By:** Claude Code (multi-agent review)
