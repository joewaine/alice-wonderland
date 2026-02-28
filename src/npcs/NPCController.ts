/**
 * NPCController - Manages NPC interactions
 *
 * Detects when player is near an NPC and presses E to interact.
 * Shows dialogue and cycles through dialogue lines.
 * Integrates with QuestManager for quest-aware dialogue.
 */

import * as THREE from 'three';
import type { NPCObject } from '../world/LevelBuilder';
import { DialogueUI } from './DialogueUI';
import type { QuestManager } from '../quests/QuestManager';
import type { ParticleManager } from '../effects/ParticleManager';
import { PortraitRenderer } from '../ui/PortraitRenderer';

export class NPCController {
  private npcs: NPCObject[] = [];
  private dialogueUI: DialogueUI;
  private currentNPC: NPCObject | null = null;
  private interactDistance: number = 3;
  private wasInteractPressed: boolean = false;

  // Quest system integration
  private questManager: QuestManager | null = null;
  private currentDialogue: string[] = [];  // Quest-aware dialogue for current NPC

  // Callbacks
  public onDialogueComplete: ((npcName: string) => void) | null = null;
  public onDialogueStart: (() => void) | null = null;
  public onDialogueEnd: (() => void) | null = null;

  // Interaction prompt
  private promptElement: HTMLDivElement;

  // Speech bubble indicators
  private speechBubbles: Map<NPCObject, THREE.Sprite> = new Map();
  private bubbleTexture: THREE.CanvasTexture | null = null;
  private bobTime: number = 0;

  // Breathing animation
  private breathingPhaseOffsets: Map<NPCObject, number> = new Map();
  private breathingTime: number = 0;
  private readonly BREATHING_FREQUENCY = 2.5; // ~0.4 Hz (radians/sec)
  private readonly BREATHING_SCALE_MIN = 1.0;
  private readonly BREATHING_SCALE_MAX = 1.015;

  // Idle animation (procedural)
  private idleTime: number = 0;

  // Skeletal animation tracking
  private animatedNPCs: Set<NPCObject> = new Set();

  // Performance: Tiered update distances
  private readonly TIER_DISTANCES = {
    FULL: 10,      // Full animation, face player, speech bubble
    REDUCED: 25,   // Half-rate animation, no facing
    STATIC: 50     // No animation, frozen pose
  };
  private frameCount: number = 0;

  // Portrait rendering from 3D models
  private portraitRenderer: PortraitRenderer = new PortraitRenderer();

  // Performance: Mesh cache for avoiding traversal
  private meshCache: Map<NPCObject, THREE.Mesh[]> = new Map();

  // Pre-allocated vector to avoid per-frame GC pressure
  private directionCache: THREE.Vector3 = new THREE.Vector3();
  private readonly NPC_ROTATION_SPEED = 5; // radians/sec for smooth turning

  // Proximity particle effect
  private particleManager: ParticleManager | null = null;
  private lastProximityParticleTime: Map<NPCObject, number> = new Map();
  private readonly PROXIMITY_PARTICLE_INTERVAL = 0.5;  // Seconds between particle spawns per NPC

  constructor(questManager?: QuestManager) {
    this.questManager = questManager || null;
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

    // Handle dialogue dismiss (player walked away or timeout)
    this.dialogueUI.onDismiss = () => {
      this.currentNPC = null;
      // Notify dialogue ended (for camera focus)
      this.onDialogueEnd?.();
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
    // Clean up old speech bubbles and mesh cache
    this.clearSpeechBubbles();
    this.animatedNPCs.clear();
    this.meshCache.clear();
    this.breathingPhaseOffsets.clear();

    this.npcs = npcs;
    this.currentNPC = null;

    // Pre-render portraits from 3D models
    const portraitBatch = npcs
      .filter(npc => npc.modelId)
      .map(npc => ({ key: npc.modelId!, mesh: npc.mesh }));
    this.portraitRenderer.renderBatch(portraitBatch);

    // Create speech bubbles for each NPC, detect animated NPCs, cache meshes, and assign breathing phase
    for (const npc of npcs) {
      // Assign random phase offset for breathing variety
      this.breathingPhaseOffsets.set(npc, Math.random() * Math.PI * 2);
      // Cache mesh references for performance (avoid traversal in update loop)
      const meshes: THREE.Mesh[] = [];
      npc.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
      this.meshCache.set(npc, meshes);

      // Create speech bubble
      if (this.bubbleTexture) {
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
      }

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

    // Spawn proximity glow particles for NPCs within talk range
    if (this.particleManager && !this.dialogueUI.getIsVisible()) {
      const now = performance.now() / 1000;
      for (const npc of this.npcs) {
        const distance = playerPosition.distanceTo(npc.position);
        if (distance < this.interactDistance) {
          const lastTime = this.lastProximityParticleTime.get(npc) || 0;
          if (now - lastTime >= this.PROXIMITY_PARTICLE_INTERVAL) {
            this.particleManager.createNPCProximityGlow(npc.position);
            this.lastProximityParticleTime.set(npc, now);
          }
        }
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

    // Update idle animation time, breathing time, and frame counter
    this.idleTime += dt;
    this.breathingTime += dt;
    this.frameCount++;

    // Tiered NPC updates based on distance from player
    for (const npc of this.npcs) {
      const distance = playerPosition.distanceTo(npc.position);

      if (distance < this.TIER_DISTANCES.FULL) {
        // FULL TIER: Full animation, face player, speech bubble
        this.updateNPCFull(npc, playerPosition, dt);
      } else if (distance < this.TIER_DISTANCES.REDUCED) {
        // REDUCED TIER: Half-rate animation, no facing
        this.updateNPCReduced(npc, dt);
      } else if (distance < this.TIER_DISTANCES.STATIC) {
        // STATIC TIER: No animation updates, frozen pose
        this.updateNPCStatic(npc);
      }
      // Beyond STATIC: NPC culled by Three.js frustum culling (no update needed)
    }
  }

  /**
   * Full-tier NPC update: animation + facing + speech bubble
   */
  private updateNPCFull(npc: NPCObject, playerPosition: THREE.Vector3, dt: number): void {
    // Smooth turn to face player
    this.directionCache.subVectors(playerPosition, npc.position).normalize();
    const targetAngle = Math.atan2(this.directionCache.x, this.directionCache.z);
    let angleDiff = targetAngle - npc.mesh.rotation.y;
    // Wrap to shortest path [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    npc.mesh.rotation.y += angleDiff * Math.min(1, this.NPC_ROTATION_SPEED * dt);

    // Apply breathing animation (subtle Y scale oscillation)
    const breathingPhase = this.breathingPhaseOffsets.get(npc) || 0;
    const breathingT = (Math.sin(this.breathingTime * this.BREATHING_FREQUENCY + breathingPhase) + 1) * 0.5;
    const breathingScaleY = this.BREATHING_SCALE_MIN + breathingT * (this.BREATHING_SCALE_MAX - this.BREATHING_SCALE_MIN);

    // Update skeletal animation if present
    if (this.animatedNPCs.has(npc) && npc.mixer) {
      npc.mixer.update(dt);
      // Apply breathing to skeletal NPCs too
      npc.mesh.scale.set(1, breathingScaleY, 1);
      return;
    }

    // Procedural idle animation for non-skeletal NPCs
    const bobOffset = Math.sin(this.idleTime * 2 + npc.position.x) * 0.05;
    npc.mesh.position.y = npc.position.y + bobOffset;

    const scalePulse = 1 + Math.sin(this.idleTime * 1.5 + npc.position.z) * 0.02;
    npc.mesh.scale.set(scalePulse, scalePulse * breathingScaleY, scalePulse);
  }

  /**
   * Reduced-tier NPC update: half-rate animation, no facing
   */
  private updateNPCReduced(npc: NPCObject, dt: number): void {
    // Only animate every other frame
    if (this.frameCount % 2 !== 0) return;

    // Apply breathing animation (subtle Y scale oscillation)
    const breathingPhase = this.breathingPhaseOffsets.get(npc) || 0;
    const breathingT = (Math.sin(this.breathingTime * this.BREATHING_FREQUENCY + breathingPhase) + 1) * 0.5;
    const breathingScaleY = this.BREATHING_SCALE_MIN + breathingT * (this.BREATHING_SCALE_MAX - this.BREATHING_SCALE_MIN);

    // Update skeletal animation at double delta to compensate
    if (this.animatedNPCs.has(npc) && npc.mixer) {
      npc.mixer.update(dt * 2);
      npc.mesh.scale.set(1, breathingScaleY, 1);
      return;
    }

    // Reduced procedural animation
    const bobOffset = Math.sin(this.idleTime * 2 + npc.position.x) * 0.03;
    npc.mesh.position.y = npc.position.y + bobOffset;
    npc.mesh.scale.set(1, breathingScaleY, 1);
  }

  /**
   * Static-tier NPC update: no animation, just ensure visibility
   */
  private updateNPCStatic(npc: NPCObject): void {
    // Reset to neutral pose
    npc.mesh.position.y = npc.position.y;
    npc.mesh.scale.setScalar(1);

    // Hide speech bubble for distant NPCs
    const sprite = this.speechBubbles.get(npc);
    if (sprite) {
      const material = sprite.material as THREE.SpriteMaterial;
      material.opacity = 0;
    }
  }

  /**
   * Start dialogue with an NPC
   */
  private startDialogue(npc: NPCObject): void {
    this.currentNPC = npc;
    npc.dialogueIndex = 0;

    // Get quest-aware dialogue if QuestManager is available
    if (this.questManager) {
      this.currentDialogue = this.questManager.getDialogueForNPC(npc.name, npc.dialogue);
    } else {
      this.currentDialogue = npc.dialogue;
    }

    // Trigger talk animation if available
    this.playNPCAnimation(npc, 'talk');

    const line = this.currentDialogue[0] || 'Hello there!';
    const portraitUrl = npc.modelId ? this.portraitRenderer.getPortrait(npc.modelId, npc.mesh) : undefined;
    this.dialogueUI.show(npc.name, line, npc.modelId, undefined, portraitUrl);

    // Notify dialogue started (for camera focus)
    this.onDialogueStart?.();
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

    if (this.currentNPC.dialogueIndex >= this.currentDialogue.length) {
      // End of dialogue - handle quest integration
      this.completeDialogue(this.currentNPC);

      // Return to idle animation
      this.stopNPCTalkAnimation(this.currentNPC);
      this.dialogueUI.hide();
      this.currentNPC = null;
      this.currentDialogue = [];

      // Notify dialogue ended (for camera focus)
      this.onDialogueEnd?.();
    } else {
      // Show next line
      const line = this.currentDialogue[this.currentNPC.dialogueIndex];
      const portraitUrl = this.currentNPC.modelId ? this.portraitRenderer.getPortrait(this.currentNPC.modelId, this.currentNPC.mesh) : undefined;
      this.dialogueUI.show(this.currentNPC.name, line, this.currentNPC.modelId, undefined, portraitUrl);
    }
  }

  /**
   * Handle dialogue completion - quest integration
   */
  private completeDialogue(npc: NPCObject): void {
    if (!this.questManager) {
      this.onDialogueComplete?.(npc.name);
      return;
    }

    // Notify QuestManager that player talked to this NPC
    // This may complete "talk_to_npc" requirements
    this.questManager.notifyTalkedToNPC(npc.name);

    // Check if this NPC has an available quest to auto-start
    const availableQuest = this.questManager.getAvailableQuestFrom(npc.name);
    if (availableQuest) {
      this.questManager.startQuest(availableQuest.id);
      console.log(`NPCController: Auto-started quest "${availableQuest.name}"`);
    }

    this.onDialogueComplete?.(npc.name);
  }

  /**
   * Check if in dialogue
   */
  isInDialogue(): boolean {
    return this.dialogueUI.getIsVisible();
  }

  /**
   * Set QuestManager for quest-aware dialogue
   */
  setQuestManager(questManager: QuestManager): void {
    this.questManager = questManager;
  }

  /**
   * Set ParticleManager for proximity glow effects
   */
  setParticleManager(particleManager: ParticleManager): void {
    this.particleManager = particleManager;
  }

  /**
   * Get current QuestManager
   */
  getQuestManager(): QuestManager | null {
    return this.questManager;
  }

  /**
   * Clean up
   */
  dispose(): void {
    this.dialogueUI.dispose();
    this.portraitRenderer.dispose();
    this.clearSpeechBubbles();
    if (this.bubbleTexture) {
      this.bubbleTexture.dispose();
    }
    document.body.removeChild(this.promptElement);
  }
}
