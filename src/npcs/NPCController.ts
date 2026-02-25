/**
 * NPCController - Manages NPC interactions
 *
 * Detects when player is near an NPC and presses E to interact.
 * Shows dialogue and cycles through dialogue lines.
 */

import * as THREE from 'three';
import type { NPCObject } from '../world/LevelBuilder';
import { DialogueUI } from './DialogueUI';

export class NPCController {
  private npcs: NPCObject[] = [];
  private dialogueUI: DialogueUI;
  private currentNPC: NPCObject | null = null;
  private interactDistance: number = 3;
  private wasInteractPressed: boolean = false;

  // Interaction prompt
  private promptElement: HTMLDivElement;

  constructor() {
    this.dialogueUI = new DialogueUI();

    // Create interaction prompt
    this.promptElement = document.createElement('div');
    this.promptElement.style.cssText = `
      position: absolute;
      bottom: 200px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.8);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 16px;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
      z-index: 150;
    `;
    document.body.appendChild(this.promptElement);

    // Handle dialogue dismiss
    this.dialogueUI.onDismiss = () => {
      this.currentNPC = null;
    };
  }

  /**
   * Set NPCs to manage
   */
  setNPCs(npcs: NPCObject[]): void {
    this.npcs = npcs;
    this.currentNPC = null;
  }

  /**
   * Update NPC interactions
   */
  update(
    playerPosition: THREE.Vector3,
    isInteractPressed: boolean
  ): void {
    // Check if player walked away from current NPC
    if (this.currentNPC && this.dialogueUI.getIsVisible()) {
      const distance = playerPosition.distanceTo(this.currentNPC.position);
      if (distance > this.interactDistance * 1.5) {
        this.dialogueUI.hide();
        this.currentNPC = null;
      }
    }

    // Find nearest NPC in range
    let nearestNPC: NPCObject | null = null;
    let nearestDistance = Infinity;

    for (const npc of this.npcs) {
      const distance = playerPosition.distanceTo(npc.position);
      if (distance < this.interactDistance && distance < nearestDistance) {
        nearestNPC = npc;
        nearestDistance = distance;
      }
    }

    // Show/hide interaction prompt
    if (nearestNPC && !this.dialogueUI.getIsVisible()) {
      this.promptElement.textContent = `Press E to talk to ${nearestNPC.name}`;
      this.promptElement.style.opacity = '1';
    } else {
      this.promptElement.style.opacity = '0';
    }

    // Handle interaction (on key down, not held)
    const interactJustPressed = isInteractPressed && !this.wasInteractPressed;
    this.wasInteractPressed = isInteractPressed;

    if (interactJustPressed) {
      if (this.dialogueUI.getIsVisible()) {
        // Dismiss current dialogue or advance to next line
        if (this.currentNPC) {
          this.advanceDialogue();
        }
      } else if (nearestNPC) {
        // Start dialogue with nearest NPC
        this.startDialogue(nearestNPC);
      }
    }

    // Make NPCs face the player (simple rotation)
    for (const npc of this.npcs) {
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, npc.position)
        .normalize();
      const angle = Math.atan2(direction.x, direction.z);
      npc.mesh.rotation.y = angle;
    }
  }

  /**
   * Start dialogue with an NPC
   */
  private startDialogue(npc: NPCObject): void {
    this.currentNPC = npc;
    npc.dialogueIndex = 0;

    const line = npc.dialogue[0] || 'Hello there!';
    this.dialogueUI.show(npc.name, line);
  }

  /**
   * Advance to next dialogue line or dismiss
   */
  private advanceDialogue(): void {
    if (!this.currentNPC) return;

    this.currentNPC.dialogueIndex++;

    if (this.currentNPC.dialogueIndex >= this.currentNPC.dialogue.length) {
      // End of dialogue
      this.dialogueUI.hide();
      this.currentNPC = null;
    } else {
      // Show next line
      const line = this.currentNPC.dialogue[this.currentNPC.dialogueIndex];
      this.dialogueUI.show(this.currentNPC.name, line);
    }
  }

  /**
   * Check if in dialogue
   */
  isInDialogue(): boolean {
    return this.dialogueUI.getIsVisible();
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.dialogueUI.dispose();
    document.body.removeChild(this.promptElement);
  }
}
