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

  // Speech bubble indicators
  private speechBubbles: Map<NPCObject, THREE.Sprite> = new Map();
  private bubbleTexture: THREE.CanvasTexture | null = null;
  private bobTime: number = 0;

  // Idle animation (procedural)
  private idleTime: number = 0;

  // Skeletal animation tracking
  private animatedNPCs: Set<NPCObject> = new Set();

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

    // Create speech bubble texture
    this.bubbleTexture = this.createBubbleTexture();
  }

  /**
   * Create the speech bubble canvas texture
   */
  private createBubbleTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    // Draw speech bubble
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(32, 28, 24, 0, Math.PI * 2);
    ctx.fill();

    // Draw tail
    ctx.beginPath();
    ctx.moveTo(26, 48);
    ctx.lineTo(32, 60);
    ctx.lineTo(38, 48);
    ctx.fill();

    // Draw "..." dots
    ctx.fillStyle = '#666';
    ctx.beginPath();
    ctx.arc(22, 28, 4, 0, Math.PI * 2);
    ctx.arc(32, 28, 4, 0, Math.PI * 2);
    ctx.arc(42, 28, 4, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Set NPCs to manage
   */
  setNPCs(npcs: NPCObject[]): void {
    // Clean up old speech bubbles
    this.clearSpeechBubbles();
    this.animatedNPCs.clear();

    this.npcs = npcs;
    this.currentNPC = null;

    // Create speech bubbles for each NPC and detect animated NPCs
    if (this.bubbleTexture) {
      for (const npc of npcs) {
        const material = new THREE.SpriteMaterial({
          map: this.bubbleTexture,
          transparent: true,
          opacity: 0
        });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(0.8, 0.8, 1);

        // Position above NPC's head (local to NPC mesh)
        sprite.position.set(0, 2.5, 0);

        // Add as child of NPC mesh
        npc.mesh.add(sprite);
        this.speechBubbles.set(npc, sprite);

        // Track NPCs with skeletal animation
        if (npc.hasSkeletalAnimation && npc.mixer) {
          this.animatedNPCs.add(npc);

          // Start idle animation if available
          const idleAction = npc.animations?.get('idle');
          if (idleAction) {
            idleAction.play();
          }
        }
      }
    }
  }

  /**
   * Clear speech bubble sprites
   */
  private clearSpeechBubbles(): void {
    for (const [, sprite] of this.speechBubbles) {
      sprite.parent?.remove(sprite);
      sprite.material.dispose();
    }
    this.speechBubbles.clear();
  }

  /**
   * Update NPC interactions
   */
  update(
    playerPosition: THREE.Vector3,
    isInteractPressed: boolean,
    dt: number = 0.016
  ): void {
    // Update bob animation time
    this.bobTime += dt * 3;

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

    // Update speech bubble visibility and animation
    for (const [npc, sprite] of this.speechBubbles) {
      const distance = playerPosition.distanceTo(npc.position);
      const shouldShow = distance < this.interactDistance * 1.2 && !this.dialogueUI.getIsVisible();

      // Fade in/out
      const material = sprite.material as THREE.SpriteMaterial;
      const targetOpacity = shouldShow ? 1 : 0;
      material.opacity += (targetOpacity - material.opacity) * 0.1;

      // Bob up and down when visible (local coordinates)
      sprite.position.y = 2.5 + (shouldShow ? Math.sin(this.bobTime) * 0.15 : 0);
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

    // Update idle animation time
    this.idleTime += dt;

    // Make NPCs face the player and animate
    for (const npc of this.npcs) {
      // Face player
      const direction = new THREE.Vector3()
        .subVectors(playerPosition, npc.position)
        .normalize();
      const angle = Math.atan2(direction.x, direction.z);
      npc.mesh.rotation.y = angle;

      // Update skeletal animation if present
      if (this.animatedNPCs.has(npc) && npc.mixer) {
        npc.mixer.update(dt);
        // Skip procedural animation for skeletal NPCs
        continue;
      }

      // Procedural idle animation for non-skeletal NPCs
      // Subtle idle bob
      const bobOffset = Math.sin(this.idleTime * 2 + npc.position.x) * 0.05;
      npc.mesh.position.y = npc.position.y + bobOffset;

      // Subtle scale pulse
      const scalePulse = 1 + Math.sin(this.idleTime * 1.5 + npc.position.z) * 0.02;
      npc.mesh.scale.setScalar(scalePulse);
    }
  }

  /**
   * Start dialogue with an NPC
   */
  private startDialogue(npc: NPCObject): void {
    this.currentNPC = npc;
    npc.dialogueIndex = 0;

    // Trigger talk animation if available
    this.playNPCAnimation(npc, 'talk');

    const line = npc.dialogue[0] || 'Hello there!';
    this.dialogueUI.show(npc.name, line, npc.modelId);
  }

  /**
   * Play an animation on an NPC (with crossfade)
   */
  private playNPCAnimation(npc: NPCObject, animName: string): void {
    if (!npc.mixer || !npc.animations) return;

    const action = npc.animations.get(animName);
    if (!action) return;

    // Crossfade from current animation
    const currentAction = npc.animations.get('idle');
    if (currentAction && currentAction.isRunning()) {
      action.reset();
      action.crossFadeFrom(currentAction, 0.3, true);
    }
    action.play();
  }

  /**
   * Stop talk animation and return to idle
   */
  private stopNPCTalkAnimation(npc: NPCObject): void {
    if (!npc.mixer || !npc.animations) return;

    const talkAction = npc.animations.get('talk');
    const idleAction = npc.animations.get('idle');

    if (talkAction && idleAction) {
      idleAction.reset();
      idleAction.crossFadeFrom(talkAction, 0.3, true);
      idleAction.play();
    }
  }

  /**
   * Advance to next dialogue line or dismiss
   */
  private advanceDialogue(): void {
    if (!this.currentNPC) return;

    this.currentNPC.dialogueIndex++;

    if (this.currentNPC.dialogueIndex >= this.currentNPC.dialogue.length) {
      // End of dialogue - return to idle animation
      this.stopNPCTalkAnimation(this.currentNPC);
      this.dialogueUI.hide();
      this.currentNPC = null;
    } else {
      // Show next line
      const line = this.currentNPC.dialogue[this.currentNPC.dialogueIndex];
      this.dialogueUI.show(this.currentNPC.name, line, this.currentNPC.modelId);
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
    this.clearSpeechBubbles();
    if (this.bubbleTexture) {
      this.bubbleTexture.dispose();
    }
    document.body.removeChild(this.promptElement);
  }
}
