/**
 * Game - Main game class
 *
 * Initializes Three.js, Rapier physics, and manages the game loop.
 * Coordinates level loading, player, and all game systems.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { InputManager } from './engine/InputManager';
import { SceneManager } from './engine/SceneManager';
import { SizeManager } from './player/SizeManager';
import { PlayerController } from './player/PlayerController';
import { SizePickup } from './world/SizePickup';
import { NPCController } from './npcs/NPCController';
import { ParticleManager } from './effects/ParticleManager';
import { MainMenu } from './ui/MainMenu';
import { LoadingScreen } from './ui/LoadingScreen';
import { audioManager } from './audio/AudioManager';
import { musicManager } from './audio/MusicManager';
import { assetLoader } from './engine/AssetLoader';

export class Game {
  // Three.js core
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Rapier physics
  private world: RAPIER.World | null = null;
  private physicsReady: boolean = false;

  // Input handling
  private input: InputManager;

  // Level management
  private sceneManager: SceneManager | null = null;

  // Game state
  private isRunning: boolean = false;
  private lastTime: number = 0;

  // Player
  private playerBody: RAPIER.RigidBody | null = null;
  private playerMesh: THREE.Object3D | null = null;
  private sizeManager: SizeManager | null = null;
  private playerController: PlayerController | null = null;

  // Size pickups (spawned per level)
  private sizePickups: SizePickup[] = [];

  // NPC system
  private npcController: NPCController;

  // Particle effects
  private particleManager: ParticleManager;

  // Menu system
  private mainMenu: MainMenu;
  private loadingScreen: LoadingScreen;

  // Current player config (used by SizeManager callback)
  private baseSpeed: number = 14;
  private baseJump: number = 14;

  // Third-person camera settings
  private cameraYaw: number = 0;
  private cameraPitch: number = 0.3;
  private cameraDistance: number = 8;
  private cameraHeightOffset: number = 2;

  // HUD elements
  private instructionsDiv: HTMLDivElement | null = null;

  // Audio state
  private isMuted: boolean = false;
  private wasMutePressed: boolean = false;

  // Respawn state
  private isRespawning: boolean = false;

  // Chapter switch debounce
  private lastChapterKey: string = '';

  // Squash/stretch animation
  private targetSquash: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private currentSquash: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  // Chapter loading state
  private isLoadingChapter: boolean = false;

  constructor() {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Setup DOM
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(this.renderer.domElement);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Input manager
    this.input = new InputManager();

    // NPC controller
    this.npcController = new NPCController();

    // Particle effects
    this.particleManager = new ParticleManager(this.scene);

    // Main menu
    this.mainMenu = new MainMenu();

    // Loading screen
    this.loadingScreen = new LoadingScreen();

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());

    // Show instructions
    this.showInstructions();
  }

  /**
   * Initialize the game
   */
  async init(): Promise<void> {
    console.log('Initializing game...');

    // Show loading screen
    this.loadingScreen.show();
    this.loadingScreen.setProgress(10, 'Initializing physics...');

    // Initialize Rapier physics
    await RAPIER.init();
    console.log('Rapier physics initialized');
    this.loadingScreen.setProgress(30, 'Creating world...');

    // Create physics world
    const gravity = new RAPIER.Vector3(0, -20, 0);
    this.world = new RAPIER.World(gravity);
    this.physicsReady = true;
    this.loadingScreen.setProgress(50, 'Setting up player...');

    // Setup base systems
    this.setupLighting();
    await this.setupPlayer();
    this.loadingScreen.setProgress(70, 'Preparing levels...');

    // Create scene manager for level loading
    this.sceneManager = new SceneManager(this.scene, this.world, this.renderer);

    // Handle player spawning
    this.sceneManager.onPlayerSpawn = (position) => {
      this.spawnPlayerAt(position);
    };

    // Handle chapter transitions
    this.sceneManager.onChapterComplete = async (nextChapter) => {
      await this.loadChapter(nextChapter);
    };

    // Handle collectible particle effects
    this.sceneManager.onCollectiblePickup = (type, position) => {
      const color = type === 'key' ? 0xffd700 : type === 'star' ? 0xffff00 : 0xff6b6b;
      this.particleManager.createCollectBurst(position, color);
      // Audio feedback
      if (type === 'key') {
        audioManager.playKeyCollect();
      } else {
        audioManager.playCollect();
      }
    };

    // Handle gate unlock particle effects
    this.sceneManager.onGateUnlock = (position) => {
      this.particleManager.createGateUnlockEffect(position);
      audioManager.playGateUnlock();
    };

    // Setup menu callbacks
    this.mainMenu.onStart = async () => {
      audioManager.init(); // Initialize audio on first user interaction
      await this.loadChapter(1);
      musicManager.play(); // Start background music
      this.start();
    };

    this.mainMenu.onResume = () => {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop();
    };

    this.mainMenu.onRestart = async () => {
      await this.loadChapter(this.sceneManager?.getCurrentChapter() || 1);
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop();
    };

    // Complete loading and show main menu
    this.loadingScreen.setProgress(100, 'Welcome to Wonderland!');
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause to show completion
    this.loadingScreen.hide();
    this.mainMenu.show();

    console.log('Game initialized!');
  }

  /**
   * Load a chapter level
   */
  private async loadChapter(chapterNumber: number): Promise<void> {
    if (!this.sceneManager || !this.world || this.isLoadingChapter) return;

    this.isLoadingChapter = true;

    try {
      // Clear old size pickups
      this.clearSizePickups();

      // Load the level
      await this.sceneManager.loadLevel(chapterNumber);

      // Wire up NPCs for dialogue
      const npcs = this.sceneManager.getNPCs();
      this.npcController.setNPCs(npcs);

      // Wire up air currents for player physics
      const airCurrentZones = this.sceneManager.getAirCurrentZones();
      this.playerController?.setAirCurrentZones(airCurrentZones);

      // Setup ambient particles for atmosphere
      this.particleManager.createAmbientParticles(0xffeedd, 150);

      // Update music mood for chapter
      musicManager.setChapterMood(chapterNumber);

      // Add size pickups for the level
      this.setupSizePickups();
    } catch (error) {
      console.error(`Failed to load chapter ${chapterNumber}:`, error);
      // Fall back to chapter 1 if not already on it
      if (chapterNumber !== 1) {
        console.log('Falling back to chapter 1');
        this.isLoadingChapter = false;
        await this.loadChapter(1);
      }
    } finally {
      this.isLoadingChapter = false;
    }
  }

  /**
   * Handle player death - fade to black, respawn, fade back in
   */
  private async handleDeath(): Promise<void> {
    if (!this.sceneManager || this.isRespawning) return;

    this.isRespawning = true;

    try {
      // Play falling sound
      audioManager.playFall();

      // Fade to black
      await this.sceneManager.fadeToBlack();

      // Respawn player
      this.spawnPlayerAt(new THREE.Vector3(0, 5, 0));

      // Play respawn sound
      audioManager.playRespawn();

      // Fade back in
      await this.sceneManager.fadeIn();
    } finally {
      this.isRespawning = false;
    }
  }

  /**
   * Spawn player at position
   */
  private spawnPlayerAt(position: THREE.Vector3): void {
    if (!this.playerBody) return;

    this.playerBody.setTranslation(
      new RAPIER.Vector3(position.x, position.y + 2, position.z),
      true
    );
    this.playerBody.setLinvel(new RAPIER.Vector3(0, 0, 0), true);

    if (this.sizeManager) {
      this.sizeManager.reset();
    }

    // Reset camera
    this.cameraYaw = 0;
    this.cameraPitch = 0.3;
  }

  /**
   * Setup lighting
   */
  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -50;
    sun.shadow.camera.right = 50;
    sun.shadow.camera.top = 50;
    sun.shadow.camera.bottom = -50;
    this.scene.add(sun);

    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x88cc88, 0.4);
    this.scene.add(hemi);
  }

  /**
   * Setup player
   */
  private async setupPlayer(): Promise<void> {
    if (!this.world) return;

    // Load Alice 3D model
    try {
      const model = await assetLoader.loadModel(`${import.meta.env.BASE_URL}assets/models/alice.glb`);

      // Scale down and center
      model.scale.setScalar(0.5);

      // Ground the model
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = -box.min.y * 0.5;

      // Wrap in container for positioning
      const container = new THREE.Group();
      container.add(model);
      this.playerMesh = container;
      this.playerMesh.castShadow = true;
      this.scene.add(this.playerMesh);

      console.log('Loaded Alice player model');
    } catch {
      // Fallback to capsule
      console.log('Using fallback player capsule');
      const capsuleGeo = new THREE.CapsuleGeometry(0.4, 1, 8, 16);
      const capsuleMat = new THREE.MeshStandardMaterial({ color: 0x4fc3f7 });
      this.playerMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
      this.playerMesh.castShadow = true;
      this.scene.add(this.playerMesh);
    }

    // Player physics
    const playerBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(0, 5, 0)
      .lockRotations();
    this.playerBody = this.world.createRigidBody(playerBodyDesc);

    const playerColliderDesc = RAPIER.ColliderDesc.capsule(0.5, 0.4);
    playerColliderDesc.setFriction(0.5);
    this.world.createCollider(playerColliderDesc, this.playerBody);

    // Size manager
    this.sizeManager = new SizeManager(this.world, this.playerBody);
    this.sizeManager.setPlayerMesh(this.playerMesh);

    this.sizeManager.onSizeChange = (size, config) => {
      this.cameraDistance = 8 * config.scale;
      this.cameraHeightOffset = 2 * config.scale;

      // Update player controller multipliers and ground check
      const speedMult = config.moveSpeed / this.baseSpeed;
      const jumpMult = config.jumpForce / this.baseJump;
      this.playerController?.setMultipliers(speedMult, jumpMult);
      this.playerController?.setGroundCheckDistance(config.capsuleHeight + 0.6);

      // Particle effect and audio on size change
      if (this.playerBody) {
        const pos = this.playerBody.translation();
        const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);
        if (size === 'small') {
          this.particleManager.createSizeChangeBurst(playerPos, 'shrink');
          audioManager.playShrink();
        } else if (size === 'large') {
          this.particleManager.createSizeChangeBurst(playerPos, 'grow');
          audioManager.playGrow();
        }
      }

      // Update HUD size indicator
      this.sceneManager?.updateSize(size);
    };

    // Player controller with momentum physics
    this.playerController = new PlayerController(this.world, this.playerBody);
    this.playerController.setCallbacks({
      onJump: (isDoubleJump) => {
        audioManager.playJump();
        // Different squash for double jump
        if (isDoubleJump) {
          this.targetSquash.set(0.7, 1.4, 0.7);
        } else {
          this.targetSquash.set(0.8, 1.3, 0.8);
        }
      },
      onLand: (fallSpeed) => {
        audioManager.playLand();
        if (this.playerBody) {
          const pos = this.playerBody.translation();
          const landPos = new THREE.Vector3(pos.x, pos.y, pos.z);
          const intensity = Math.min(fallSpeed / 15, 1.5);
          if (intensity > 0.2) {
            this.particleManager.createLandingDust(landPos, intensity);
          }
        }
        this.targetSquash.set(1.3, 0.7, 1.3);
      },
      onGroundPound: () => {
        // Strong squash and screen shake
        this.targetSquash.set(1.5, 0.5, 1.5);
        audioManager.playLand(); // Use land sound for now
      },
      onLongJump: () => {
        audioManager.playJump();
        this.targetSquash.set(0.6, 1.2, 1.4); // Stretch forward
      },
      onFootstep: () => {
        audioManager.playFootstep();
      },
    });

    // Initialize ground check distance for normal size
    this.playerController.setGroundCheckDistance(0.5 + 0.6);

    this.camera.position.set(0, 5, 10);
  }

  /**
   * Setup size pickups for the level
   */
  private setupSizePickups(): void {
    if (!this.world) return;

    // Scatter some mushrooms and potions
    const positions = [
      { pos: new THREE.Vector3(5, 0.5, 5), type: 'shrink' as const },
      { pos: new THREE.Vector3(-5, 0.5, 8), type: 'shrink' as const },
      { pos: new THREE.Vector3(8, 0.5, -5), type: 'grow' as const },
      { pos: new THREE.Vector3(-8, 0.5, -8), type: 'grow' as const },
    ];

    for (const { pos, type } of positions) {
      this.sizePickups.push(new SizePickup(this.world, this.scene, pos, type));
    }
  }

  /**
   * Clear size pickups
   */
  private clearSizePickups(): void {
    for (const pickup of this.sizePickups) {
      pickup.dispose(this.scene);
    }
    this.sizePickups = [];
  }

  /**
   * Start the game loop
   */
  start(): void {
    if (!this.physicsReady) {
      console.error('Cannot start: physics not initialized');
      return;
    }

    this.isRunning = true;
    this.lastTime = performance.now();
    this.gameLoop();
  }

  /**
   * Main game loop
   */
  private gameLoop(): void {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.gameLoop());

    // Check if paused
    if (this.mainMenu.getIsPaused()) {
      this.renderer.render(this.scene, this.camera);
      return;
    }

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Update systems
    this.updatePlayer(dt);
    this.updatePickups(dt);
    this.updateLevel(dt);
    this.updateParticles(dt);
    this.updatePhysics();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Reset input
    this.input.resetMouseDelta();
  }

  /**
   * Update level systems
   */
  private updateLevel(dt: number): void {
    if (!this.sceneManager || !this.playerBody || !this.sizeManager) return;

    const pos = this.playerBody.translation();
    const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const playerRadius = this.sizeManager.config.capsuleRadius;

    this.sceneManager.update(dt, playerPos, playerRadius);

    // Update NPC interactions
    const isInteractPressed = this.input.isKeyDown('e');
    this.npcController.update(playerPos, isInteractPressed, dt);
  }

  /**
   * Update player movement and camera
   */
  private updatePlayer(dt: number): void {
    if (!this.playerBody || !this.world || !this.sizeManager) return;

    // Mute toggle (M key)
    const isMutePressed = this.input.isKeyDown('m');
    if (isMutePressed && !this.wasMutePressed) {
      this.isMuted = !this.isMuted;
      audioManager.setMuted(this.isMuted);
      musicManager.setMuted(this.isMuted);
      this.sceneManager?.setMuted(this.isMuted);
    }
    this.wasMutePressed = isMutePressed;

    // Debug: Jump to chapter (1-4 keys)
    let chapterKeyPressed = '';
    for (let i = 1; i <= 4; i++) {
      if (this.input.isKeyDown(i.toString())) {
        chapterKeyPressed = i.toString();
        break;
      }
    }
    if (chapterKeyPressed && chapterKeyPressed !== this.lastChapterKey) {
      this.loadChapter(parseInt(chapterKeyPressed));
    }
    this.lastChapterKey = chapterKeyPressed;

    // Size controls (Q to shrink, R to grow - E is reserved for interact)
    if (this.input.isKeyDown('q')) {
      this.sizeManager.shrink();
    }
    if (this.input.isKeyDown('r')) {
      this.sizeManager.grow();
    }

    // Camera orbit from arrow keys
    const cameraSpeed = 2.5 * 0.016;
    if (this.input.lookLeft) this.cameraYaw += cameraSpeed;
    if (this.input.lookRight) this.cameraYaw -= cameraSpeed;
    if (this.input.lookUp) this.cameraPitch -= cameraSpeed * 0.5;
    if (this.input.lookDown) this.cameraPitch += cameraSpeed * 0.5;
    this.cameraPitch = Math.max(0.1, Math.min(1.2, this.cameraPitch));

    // Update player controller (momentum-based movement, jumps, etc.)
    if (this.playerController) {
      this.playerController.setCameraYaw(this.cameraYaw);
      this.playerController.update(dt, this.input);

      // Return to normal squash when grounded and not jumping
      if (this.playerController.getIsGrounded() && !this.input.jump) {
        this.targetSquash.set(1, 1, 1);
      }
    }

    // Animate squash/stretch
    this.currentSquash.lerp(this.targetSquash, 0.2);

    // Position
    const pos = this.playerBody.translation();

    // Respawn if fallen (with fade effect)
    if (pos.y < -50 && !this.isRespawning) {
      this.handleDeath();
    }

    // Update player mesh
    if (this.playerMesh) {
      this.playerMesh.position.set(pos.x, pos.y, pos.z);

      // Apply squash/stretch (combine with size scale)
      const sizeScale = this.sizeManager?.config.scale || 1;
      this.playerMesh.scale.set(
        this.currentSquash.x * sizeScale,
        this.currentSquash.y * sizeScale,
        this.currentSquash.z * sizeScale
      );
    }

    // Camera
    const camX = pos.x + Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;
    const camY = pos.y + Math.sin(this.cameraPitch) * this.cameraDistance + this.cameraHeightOffset;
    const camZ = pos.z + Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * this.cameraDistance;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(pos.x, pos.y + this.cameraHeightOffset * 0.5, pos.z);

    // Pickup collisions
    const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    const playerRadius = this.sizeManager.config.capsuleRadius;

    for (const pickup of this.sizePickups) {
      if (pickup.checkOverlap(playerPos, playerRadius)) {
        pickup.collect();
        if (pickup.type === 'shrink') {
          this.sizeManager.shrink();
        } else {
          this.sizeManager.grow();
        }
      }
    }
  }

  /**
   * Update pickups
   */
  private updatePickups(dt: number): void {
    for (const pickup of this.sizePickups) {
      pickup.update(dt);
    }
  }

  /**
   * Update particle effects
   */
  private updateParticles(dt: number): void {
    if (!this.playerBody) return;

    const pos = this.playerBody.translation();
    const playerPos = new THREE.Vector3(pos.x, pos.y, pos.z);
    this.particleManager.update(dt, playerPos);
  }

  /**
   * Step physics
   */
  private updatePhysics(): void {
    if (!this.world) return;
    this.world.step();
  }

  /**
   * Handle resize
   */
  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * Show controls
   */
  private showInstructions(): void {
    this.instructionsDiv = document.createElement('div');
    this.instructionsDiv.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      color: white;
      font-family: monospace;
      font-size: 14px;
      background: rgba(0,0,0,0.7);
      padding: 15px;
      border-radius: 8px;
      pointer-events: none;
    `;
    this.instructionsDiv.innerHTML = `
      <p style="margin:0"><b>WASD</b> - Move</p>
      <p style="margin:5px 0"><b>Arrow Keys</b> - Camera</p>
      <p style="margin:5px 0"><b>Space</b> - Jump</p>
      <p style="margin:5px 0"><b>Q/R</b> - Shrink/Grow</p>
      <p style="margin:5px 0"><b>E</b> - Talk to NPCs</p>
      <p style="margin:5px 0"><b>M</b> - Mute</p>
      <p style="margin:5px 0"><b>1-4</b> - Jump to Chapter</p>
    `;
    document.body.appendChild(this.instructionsDiv);
  }
}
