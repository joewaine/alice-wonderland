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
import { CameraController } from './camera/CameraController';
import { SizePickup } from './world/SizePickup';
import { NPCController } from './npcs/NPCController';
import { ParticleManager } from './effects/ParticleManager';
import { MainMenu } from './ui/MainMenu';
import { LoadingScreen } from './ui/LoadingScreen';
import { StarSelect } from './ui/StarSelect';
import { audioManager } from './audio/AudioManager';
import { musicManager } from './audio/MusicManager';
import { assetLoader } from './engine/AssetLoader';
import { applyCelShaderToObject, updateCelShaderLightDirection } from './shaders/CelShaderMaterial';
import { addOutlinesToObject } from './shaders/OutlineEffect';
import { AnimationStateManager } from './animation/AnimationStateManager';
import { QuestManager } from './quests/QuestManager';
import { AreaGate } from './world/AreaGate';
import { QuestNotification } from './ui/QuestNotification';
import { FoliageAnimator } from './effects/FoliageAnimator';
import { AreaIndicator } from './ui/AreaIndicator';

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

  // Foliage animation
  private foliageAnimator: FoliageAnimator;

  // Menu system
  private mainMenu: MainMenu;
  private loadingScreen: LoadingScreen;
  private starSelect: StarSelect;

  // Current player config (used by SizeManager callback)
  private baseSpeed: number = 14;
  private baseJump: number = 14;

  // Camera controller
  private cameraController: CameraController | null = null;

  // Player animation
  private playerAnimationManager: AnimationStateManager | null = null;
  private playerMixer: THREE.AnimationMixer | null = null;

  // HUD elements
  private instructionsDiv: HTMLDivElement | null = null;

  // Audio state
  private isMuted: boolean = false;
  private wasMutePressed: boolean = false;

  // Respawn state
  private isRespawning: boolean = false;

  // Squash/stretch animation
  private targetSquash: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private currentSquash: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  // Sun light reference for cel-shader sync
  private sunLight: THREE.DirectionalLight | null = null;

  // Pre-allocated vectors to avoid per-frame GC pressure
  private playerPosCache: THREE.Vector3 = new THREE.Vector3();
  private tempPosCache: THREE.Vector3 = new THREE.Vector3();

  // Quest system
  private questManager: QuestManager | null = null;
  private areaGates: AreaGate[] = [];
  private questNotification: QuestNotification;
  private areaIndicator: AreaIndicator;

  // Performance stats overlay
  private statsOverlay: HTMLDivElement | null = null;
  private showStats: boolean = false;
  private wasBacktickPressed: boolean = false;
  private frameTimeHistory: number[] = [];
  private lastStatsUpdate: number = 0;

  // Hitstop effect (freeze frames on ground pound impact)
  private hitstopRemaining: number = 0;

  constructor() {
    // Create renderer - BasicShadowMap for hard cel-shaded shadows
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // Hard edges for cel-shading

    // Setup DOM
    document.body.innerHTML = '';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.appendChild(this.renderer.domElement);

    // Create scene with Queen's Garden golden hour atmosphere
    this.scene = new THREE.Scene();

    // Golden hour sky (warm and inviting)
    const skyColor = new THREE.Color(0xFAD7A0);   // Golden
    const fogColor = new THREE.Color(0xFFE8C8);   // Warm peach fog
    this.scene.background = skyColor;  // Overridden by skybox when loaded

    // Atmospheric fog for depth - warm golden haze
    this.scene.fog = new THREE.Fog(fogColor, 40, 180);

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

    // Foliage animation (wind sway)
    this.foliageAnimator = new FoliageAnimator();

    // Main menu
    this.mainMenu = new MainMenu();

    // Loading screen
    this.loadingScreen = new LoadingScreen();

    // Star select UI
    this.starSelect = new StarSelect();

    // Quest notification UI
    this.questNotification = new QuestNotification();

    // Area name indicator
    this.areaIndicator = new AreaIndicator();

    // Handle window resize
    window.addEventListener('resize', () => this.onResize());

    // Show instructions
    this.showInstructions();

    // Create performance stats overlay (hidden by default)
    this.createStatsOverlay();
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
      await this.loadLevel();
      musicManager.play(); // Start background music
      this.start();
    };

    this.mainMenu.onResume = () => {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop();
    };

    this.mainMenu.onRestart = async () => {
      await this.loadLevel();
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
  private async loadLevel(): Promise<void> {
    if (!this.sceneManager || !this.world) return;

    try {
      // Clear old size pickups and camera zones
      this.clearSizePickups();
      this.cameraController?.clearZones();

      // Load The Queen's Garden
      await this.sceneManager.loadLevel();

      // Setup camera zones from level areas
      this.setupCameraZones();

      // Setup area indicator
      const areas = this.sceneManager.getAreas();
      this.areaIndicator.setAreas(areas);

      // Wire up NPCs for dialogue
      const npcs = this.sceneManager.getNPCs();
      this.npcController.setNPCs(npcs);

      // Initialize quest system
      await this.initializeQuestSystem();

      // Wire up air currents for player physics
      const airCurrentZones = this.sceneManager.getAirCurrentZones();
      this.playerController?.setAirCurrentZones(airCurrentZones);

      // Wire up water zones for swimming
      const waterZones = this.sceneManager.getWaterZones();
      this.playerController?.setWaterZones(waterZones);

      // Wire up speed boost zones
      const speedBoostZones = this.sceneManager.getSpeedBoostZones();
      this.playerController?.setSpeedBoostZones(speedBoostZones);

      // Setup ambient particles for atmosphere
      this.particleManager.createAmbientParticles(0xffeedd, 150);

      // Setup rose petals for Queen's Garden
      const gardenBounds = new THREE.Box3(
        new THREE.Vector3(-60, 0, -55),
        new THREE.Vector3(65, 20, 20)
      );
      this.particleManager.createRosePetals(gardenBounds, 100);

      // Setup foliage wind animation
      this.setupGardenFoliage();

      // Set garden music mood
      musicManager.setGardenMood();

      // Add size pickups for the level
      this.setupSizePickups();

      // Show star select UI if there are wonder stars
      const wonderStars = this.sceneManager.getWonderStars();
      if (wonderStars.length > 0) {
        this.showStarSelect();
      }

      // Sync cel-shader lighting after level loads
      this.syncCelShaderLighting();
    } catch (error) {
      console.error(`Failed to load The Queen's Garden:`, error);
    }
  }

  /**
   * Initialize quest system for levels with quests
   */
  private async initializeQuestSystem(): Promise<void> {
    if (!this.sceneManager || !this.world) return;

    // Clean up existing quest system
    this.cleanupQuestSystem();

    const quests = this.sceneManager.getQuests();
    const areas = this.sceneManager.getAreas();
    const npcData = this.sceneManager.getNPCData();

    // Skip if no quests
    if (quests.length === 0) {
      this.questManager = null;
      return;
    }

    // Create QuestManager for The Queen's Garden
    this.questManager = new QuestManager();
    this.questManager.initialize(quests, npcData);

    // Connect to NPCController
    this.npcController.setQuestManager(this.questManager);

    // Set up area gates for locked areas
    for (const area of areas) {
      if (area.locked_by_quest) {
        // Create a gate if area is locked and not yet unlocked
        if (!this.questManager.isAreaUnlocked(area.id)) {
          // Position gate at area entrance (center of bounds min edge)
          const gatePos = new THREE.Vector3(
            (area.bounds.min.x + area.bounds.max.x) / 2,
            (area.bounds.min.y + area.bounds.max.y) / 2,
            area.bounds.min.z  // Gate at the "entrance" z
          );
          const gateSize = new THREE.Vector3(
            area.bounds.max.x - area.bounds.min.x,
            area.bounds.max.y - area.bounds.min.y,
            2  // Gate thickness
          );

          const gate = new AreaGate(this.world, this.scene, {
            position: gatePos,
            size: gateSize,
            areaId: area.id,
            visible: true,
            color: 0x2D5A27  // Hedge green
          });

          this.areaGates.push(gate);
        }
      }
    }

    // Wire up callbacks
    this.questManager.callbacks.onAreaUnlocked = (areaId) => {
      // Find and unlock the corresponding gate
      const gate = this.areaGates.find(g => g.getAreaId() === areaId);
      if (gate) {
        gate.unlock();
        audioManager.playGateUnlock();
        // Create unlock particle effect at gate position
        this.particleManager.createGateUnlockEffect(gate.getPosition());
        // Show area unlocked notification
        const area = this.sceneManager?.getAreas().find(a => a.id === areaId);
        this.questNotification.showAreaUnlocked(area?.name || areaId);
      }
    };

    this.questManager.callbacks.onQuestStarted = (quest) => {
      // Show quest started notification
      console.log(`Quest started: ${quest.name}`);
      audioManager.playCollect();
      this.questNotification.showQuestStarted(quest.name);
    };

    this.questManager.callbacks.onQuestCompleted = (quest) => {
      // Show quest completed notification
      console.log(`Quest completed: ${quest.name}`);
      audioManager.playKeyCollect();
      this.questNotification.showQuestCompleted(quest.name);
    };

    console.log(`QuestManager initialized with ${quests.length} quests and ${this.areaGates.length} area gates`);
  }

  /**
   * Clean up quest system
   */
  private cleanupQuestSystem(): void {
    // Clean up area gates
    for (const gate of this.areaGates) {
      gate.cleanup();
    }
    this.areaGates = [];

    // Clean up quest manager
    if (this.questManager) {
      this.questManager.cleanup();
      this.questManager = null;
    }
  }

  /**
   * Show star select UI
   */
  private showStarSelect(): void {
    if (!this.sceneManager) return;

    const stars = this.sceneManager.getWonderStars();
    const collectedIds = this.sceneManager.getCollectedStarIds();

    // Pause game while selecting
    this.isRunning = false;

    this.starSelect.show(stars, collectedIds, {
      onStarSelected: (starId) => {
        this.sceneManager?.setActiveWonderStar(starId);

        // Spawn at star-specific location if specified
        const spawnPoint = this.sceneManager?.getActiveStarSpawn();
        if (spawnPoint) {
          this.spawnPlayerAt(spawnPoint);
        }

        // Resume game
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
      },
      onClose: () => {
        // No star selected, just play normally
        this.sceneManager?.setActiveWonderStar(null);
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
      }
    });
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
    this.cameraController?.reset();
  }

  /**
   * Setup lighting - Queen's Garden golden hour illumination
   * Warm, dramatic late-afternoon lighting with BotW cel-shaded style
   */
  private setupLighting(): void {
    // Warm ambient - golden hour glow
    const ambient = new THREE.AmbientLight(0xFFF8E0, 0.35);
    this.scene.add(ambient);

    // Golden sun at low angle for dramatic shadows
    const sun = new THREE.DirectionalLight(0xFFE4B5, 1.3);
    sun.position.set(25, 20, 20);  // Lower angle for longer shadows
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 200;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    this.scene.add(sun);

    // Store sun reference for cel-shader light direction sync
    this.sunLight = sun;

    // Sky/ground hemisphere - warm sky, green garden bounce
    const hemi = new THREE.HemisphereLight(0xFAD7A0, 0x7CB342, 0.4);
    this.scene.add(hemi);

    // Subtle fill light from opposite side (bounced light effect)
    const fill = new THREE.DirectionalLight(0xB3E5FC, 0.15);
    fill.position.set(-15, 10, -10);
    this.scene.add(fill);
  }

  /**
   * Sync cel-shader light direction with sun position
   */
  private syncCelShaderLighting(): void {
    if (this.sunLight) {
      updateCelShaderLightDirection(this.scene, this.sunLight.position);
    }
  }

  /**
   * Setup player
   */
  private async setupPlayer(): Promise<void> {
    if (!this.world) return;

    // Load Alice 3D model with animations
    try {
      const { model, animations } = await assetLoader.loadModelWithAnimations(
        `${import.meta.env.BASE_URL}assets/models/alice.glb`
      );

      // Calculate model bounds to properly ground it
      const box = new THREE.Box3().setFromObject(model);
      const modelHeight = box.max.y - box.min.y;

      // Scale model to match physics capsule height (capsule height = 0.5*2 + 0.4*2 = 1.8)
      const targetHeight = 1.8;
      const scaleFactor = targetHeight / modelHeight;
      model.scale.setScalar(scaleFactor);

      // Recalculate bounds after scaling
      box.setFromObject(model);

      // Position model so its feet are at y=0 relative to container
      // Physics capsule center is at body position, bottom is at y - (halfHeight + radius) = y - 0.9
      model.position.y = -box.min.y - 0.9;

      // Apply cel-shading and outlines to Alice
      applyCelShaderToObject(model, {
        rimColor: 0x88ccff,  // Soft blue rim for Alice
        rimPower: 2.5,
      });
      addOutlinesToObject(model, {
        color: 0x2a2a3e,  // Dark blue-ish outline
        thickness: 0.02,
      });

      // Wrap in container for positioning
      const container = new THREE.Group();
      container.add(model);
      this.playerMesh = container;
      this.playerMesh.castShadow = true;
      this.scene.add(this.playerMesh);

      // Setup animation if model has animations
      if (animations.length > 0) {
        this.playerMixer = new THREE.AnimationMixer(model);
        this.playerAnimationManager = new AnimationStateManager(this.playerMixer);
        this.playerAnimationManager.registerAnimationsFromGLTF(animations);
        console.log(`Loaded Alice with ${animations.length} animations:`,
          animations.map(a => a.name).join(', '));
      } else {
        console.log('Loaded Alice model (no animations found)');
      }

      console.log('Loaded Alice player model with cel-shading, scale:', scaleFactor.toFixed(2));
    } catch {
      // Fallback to capsule - sized to match physics (halfHeight=0.5, radius=0.4)
      console.log('Using fallback player capsule');
      const capsuleGeo = new THREE.CapsuleGeometry(0.4, 1.0, 8, 16);
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
      // Update camera for new player size
      this.cameraController?.setTargetDistance(8 * config.scale);
      this.cameraController?.setHeightOffset(2 * config.scale);

      // Update player controller multipliers and ground check
      const speedMult = config.moveSpeed / this.baseSpeed;
      const jumpMult = config.jumpForce / this.baseJump;
      this.playerController?.setMultipliers(speedMult, jumpMult);
      this.playerController?.setGroundCheckDistance(config.capsuleHeight + 0.6);

      // Scale animation speed based on size (small = faster, large = slower)
      this.playerController?.setAnimationSpeed(1.0 / config.scale);

      // Particle effect and audio on size change
      if (this.playerBody) {
        const pos = this.playerBody.translation();
        this.tempPosCache.set(pos.x, pos.y, pos.z);
        if (size === 'small') {
          this.particleManager.createSizeChangeBurst(this.tempPosCache, 'shrink');
          audioManager.playShrink();
        } else if (size === 'large') {
          this.particleManager.createSizeChangeBurst(this.tempPosCache, 'grow');
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
          // Sparkle burst for double jump
          if (this.playerBody) {
            const pos = this.playerBody.translation();
            this.tempPosCache.set(pos.x, pos.y, pos.z);
            this.particleManager.createDoubleJumpSparkle(this.tempPosCache);
          }
        } else {
          this.targetSquash.set(0.8, 1.3, 0.8);
        }
      },
      onLand: (fallSpeed) => {
        audioManager.playLand();
        if (this.playerBody) {
          const pos = this.playerBody.translation();
          this.tempPosCache.set(pos.x, pos.y, pos.z);
          const intensity = Math.min(fallSpeed / 15, 1.5);
          if (intensity > 0.2) {
            this.particleManager.createLandingDust(this.tempPosCache, intensity);
          }
        }
        this.targetSquash.set(1.3, 0.7, 1.3);
      },
      onGroundPound: () => {
        // Strong squash and screen shake
        this.targetSquash.set(1.5, 0.5, 1.5);
        audioManager.playLand(); // Use land sound for now
        // Track for wonder star challenges
        this.sceneManager?.trackGroundPound();
      },
      onGroundPoundLand: (position) => {
        // Screen shake for impact
        this.cameraController?.shake(0.4);

        // Hitstop freeze effect (50ms / 3 frames at 60fps)
        this.hitstopRemaining = 0.05;

        // Expanding ring shockwave effect
        this.particleManager.createGroundPoundShockwave(position);

        // Check for breakable platforms
        if (this.sceneManager && this.sizeManager) {
          const currentSize = this.sizeManager.getCurrentSize();
          const broke = this.sceneManager.tryBreakPlatform(position, currentSize);
          if (broke) {
            // Extra shake and particles for breaking
            this.cameraController?.shake(0.3);  // Additional shake for breaking
            this.particleManager.createLandingDust(position, 2.0);
            audioManager.playLand();
            // Track for wonder star challenges
            this.sceneManager.trackPlatformBreak();
          }
        }
      },
      onLongJump: () => {
        audioManager.playJump();
        this.targetSquash.set(0.6, 1.2, 1.4); // Stretch forward
        // Track for wonder star challenges
        this.sceneManager?.trackLongJump();
      },
      onFootstep: () => {
        audioManager.playFootstep();
      },
      onSpeedBoost: () => {
        // FOV kick for speed effect - kick to 68 degrees, return over 0.4s
        this.cameraController?.kickFOV(68, 0.4);
      },
    });

    // Initialize ground check distance for normal size
    this.playerController.setGroundCheckDistance(0.5 + 0.6);

    // Connect animation manager if available
    if (this.playerAnimationManager) {
      this.playerController.setAnimationManager(this.playerAnimationManager);
    }

    // Camera controller
    this.cameraController = new CameraController(this.camera, this.world, this.renderer);
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
   * Setup camera zones from level area data
   */
  private setupCameraZones(): void {
    if (!this.sceneManager || !this.cameraController) return;

    const areas = this.sceneManager.getAreas();
    if (!areas || areas.length === 0) return;

    const cameraZones: Array<{
      bounds: THREE.Box3;
      targetDistance: number;
      heightOffset: number;
    }> = [];

    for (const area of areas) {
      if (!area.camera_config) continue;

      const bounds = new THREE.Box3(
        new THREE.Vector3(area.bounds.min.x, area.bounds.min.y, area.bounds.min.z),
        new THREE.Vector3(area.bounds.max.x, area.bounds.max.y, area.bounds.max.z)
      );

      cameraZones.push({
        bounds,
        targetDistance: area.camera_config.targetDistance,
        heightOffset: area.camera_config.heightOffset,
      });
    }

    if (cameraZones.length > 0) {
      this.cameraController.setZones(cameraZones);
      console.log(`Game: Set up ${cameraZones.length} camera zones`);
    }
  }

  /**
   * Setup foliage animation for garden assets
   */
  private setupGardenFoliage(): void {
    this.foliageAnimator.clear();

    // Find foliage objects in the scene by traversing
    const foliageNames = ['hedge', 'rose', 'topiary', 'bush'];
    let count = 0;

    this.scene.traverse((object) => {
      // Check if this object's name or parent's name suggests foliage
      const name = object.name.toLowerCase();
      const parentName = object.parent?.name?.toLowerCase() || '';

      const isFoliage = foliageNames.some(f => name.includes(f) || parentName.includes(f));

      if (isFoliage && object instanceof THREE.Group) {
        // Different sway amounts based on type
        let swayAmount = 0.02;
        let swaySpeed = 1.2;

        if (name.includes('rose') || parentName.includes('rose')) {
          swayAmount = 0.04;  // Roses sway more
          swaySpeed = 1.5;
        } else if (name.includes('topiary') || parentName.includes('topiary')) {
          swayAmount = 0.015;  // Topiaries are stiffer
          swaySpeed = 0.8;
        }

        this.foliageAnimator.addFoliage(object, { swayAmount, swaySpeed });
        count++;
      }
    });

    // Also add any platforms that were created with garden asset IDs
    // by checking userData or by position matching known foliage locations
    if (this.sceneManager) {
      const platforms = this.sceneManager.getPlatformMeshes();
      for (const platform of platforms) {
        // Check if it's a group (garden asset) vs simple mesh
        if (platform instanceof THREE.Group) {
          this.foliageAnimator.addFoliage(platform, { swayAmount: 0.02, swaySpeed: 1.0 });
          count++;
        }
      }
    }

    if (count > 0) {
      console.log(`Game: Set up ${count} foliage objects for wind animation`);
    }
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

    // Hitstop freeze effect - skip physics/movement updates
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining -= dt;
      // Still render during hitstop (frozen frame)
      this.renderer.render(this.scene, this.camera);
      this.updateStats(dt);
      this.input.resetMouseDelta();
      return;
    }

    // Update systems
    this.updatePlayer(dt);
    this.updatePickups(dt);
    this.updateLevel(dt);
    this.updateParticles(dt);
    this.updatePhysics();

    // Render
    this.renderer.render(this.scene, this.camera);

    // Update performance stats overlay
    this.updateStats(dt);

    // Reset input
    this.input.resetMouseDelta();
  }

  /**
   * Update level systems
   */
  private updateLevel(dt: number): void {
    if (!this.sceneManager || !this.playerBody || !this.sizeManager) return;

    const pos = this.playerBody.translation();
    this.playerPosCache.set(pos.x, pos.y, pos.z);
    const playerRadius = this.sizeManager.config.capsuleRadius;

    this.sceneManager.update(dt, this.playerPosCache, playerRadius);

    // Update NPC interactions
    const isInteractPressed = this.input.isKeyDown('e');
    this.npcController.update(this.playerPosCache, isInteractPressed, dt);

    // Update area gates (unlock animations)
    for (const gate of this.areaGates) {
      gate.update(dt);
    }

    // Update quest position tracking
    if (this.questManager) {
      this.questManager.notifyReachedPosition(
        this.playerPosCache.x,
        this.playerPosCache.y,
        this.playerPosCache.z
      );
    }

    // Update area indicator
    this.areaIndicator.update(this.playerPosCache);
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

    // Size controls (Q to shrink, R to grow - E is reserved for interact)
    if (this.input.isKeyDown('q')) {
      this.sizeManager.shrink();
    }
    if (this.input.isKeyDown('r')) {
      this.sizeManager.grow();
    }

    // Update player controller (momentum-based movement, jumps, etc.)
    if (this.playerController && this.cameraController) {
      // Camera controller handles rotation from input
      this.playerController.setCameraYaw(this.cameraController.getYaw());
      this.playerController.update(dt, this.input);

      // Update skeletal animation
      this.playerController.updateAnimation(dt);

      // Return to normal squash when grounded and not jumping
      if (this.playerController.getIsGrounded() && !this.input.jump) {
        this.targetSquash.set(1, 1, 1);
      }

      // Footstep dust particles when walking on ground
      if (this.playerController.getIsGrounded()) {
        const vel = this.playerBody.linvel();
        const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
        if (horizontalSpeed > 2) {  // Only when moving at decent speed
          const pos = this.playerBody.translation();
          this.particleManager.createFootstepDust(
            new THREE.Vector3(pos.x, pos.y, pos.z),
            horizontalSpeed / 10
          );
        }
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

    // Update camera (handles wall collision, contextual zoom, smooth transitions)
    if (this.cameraController) {
      this.playerPosCache.set(pos.x, pos.y, pos.z);
      this.cameraController.update(dt, this.playerPosCache, this.input);
    }

    // Pickup collisions (reuse cached position)
    const playerRadius = this.sizeManager.config.capsuleRadius;

    for (const pickup of this.sizePickups) {
      if (pickup.checkOverlap(this.playerPosCache, playerRadius)) {
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
   * Update particle effects and foliage animation
   */
  private updateParticles(dt: number): void {
    if (!this.playerBody) return;

    const pos = this.playerBody.translation();
    this.playerPosCache.set(pos.x, pos.y, pos.z);
    this.particleManager.update(dt, this.playerPosCache);

    // Update foliage wind animation
    this.foliageAnimator.update(dt);
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
      <p style="margin:5px 0"><b>Shift</b> - Ground Pound</p>
      <p style="margin:5px 0"><b>Q/R</b> - Shrink/Grow</p>
      <p style="margin:5px 0"><b>E</b> - Talk to NPCs</p>
      <p style="margin:5px 0"><b>M</b> - Mute</p>
    `;
    document.body.appendChild(this.instructionsDiv);
  }

  /**
   * Create performance stats overlay
   */
  private createStatsOverlay(): void {
    this.statsOverlay = document.createElement('div');
    this.statsOverlay.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      background: rgba(0,0,0,0.8);
      padding: 10px;
      border-radius: 4px;
      pointer-events: none;
      display: none;
      min-width: 150px;
    `;
    document.body.appendChild(this.statsOverlay);
  }

  /**
   * Update performance stats display
   */
  private updateStats(dt: number): void {
    // Check for backtick toggle
    const isBacktickPressed = this.input.isKeyDown('`') || this.input.isKeyDown('Backquote');
    if (isBacktickPressed && !this.wasBacktickPressed) {
      this.showStats = !this.showStats;
      if (this.statsOverlay) {
        this.statsOverlay.style.display = this.showStats ? 'block' : 'none';
      }
    }
    this.wasBacktickPressed = isBacktickPressed;

    if (!this.showStats || !this.statsOverlay) return;

    // Track frame time
    const frameTime = dt * 1000;
    this.frameTimeHistory.push(frameTime);
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }

    // Only update display every 200ms
    const now = performance.now();
    if (now - this.lastStatsUpdate < 200) return;
    this.lastStatsUpdate = now;

    // Calculate average FPS
    const avgFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
    const fps = Math.round(1000 / avgFrameTime);

    // Get renderer info
    const info = this.renderer.info;
    const drawCalls = info.render.calls;
    const triangles = info.render.triangles;
    const textures = info.memory.textures;
    const geometries = info.memory.geometries;

    // FPS color indicator
    const fpsColor = fps >= 55 ? '#0f0' : fps >= 30 ? '#ff0' : '#f00';

    this.statsOverlay.innerHTML = `
      <div style="color:${fpsColor};font-size:16px;font-weight:bold">${fps} FPS</div>
      <div style="margin-top:5px">Frame: ${avgFrameTime.toFixed(1)}ms</div>
      <div>Draw calls: ${drawCalls}</div>
      <div>Triangles: ${(triangles / 1000).toFixed(1)}k</div>
      <div style="margin-top:5px;color:#888">Textures: ${textures}</div>
      <div style="color:#888">Geometries: ${geometries}</div>
    `;
  }
}
