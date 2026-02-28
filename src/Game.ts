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
  private playerFacingAngle: number = 0; // Current facing direction (radians)
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

  // Current player config (used by SizeManager callback)
  private baseSpeed: number = 11;
  private baseJump: number = 11;

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

  // View toggle state
  private wasViewTogglePressed: boolean = false;

  // Respawn state
  private isRespawning: boolean = false;

  // Squash/stretch animation
  private targetSquash: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private currentSquash: THREE.Vector3 = new THREE.Vector3(1, 1, 1);

  // Breathing animation (idle state)
  private breathingPhase: number = 0;
  private readonly BREATHING_FREQUENCY: number = 0.5; // Hz (cycles per second)

  // Landing squash animation
  private landingSquashTimer: number = 0;
  private readonly LANDING_SQUASH_DURATION: number = 0.15; // seconds

  // Sun light reference for cel-shader sync
  private sunLight: THREE.DirectionalLight | null = null;

  // Pre-allocated vectors to avoid per-frame GC pressure
  private playerPosCache: THREE.Vector3 = new THREE.Vector3();
  private tempPosCache: THREE.Vector3 = new THREE.Vector3();
  private playerVelocityCache: THREE.Vector3 = new THREE.Vector3();
  private boundsCache: THREE.Box3 = new THREE.Box3();

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

  // Screen vignette overlay
  private vignetteOverlay: HTMLDivElement | null = null;
  private currentVignetteIntensity: number = 0.3;  // Base vignette darkness
  private targetVignetteIntensity: number = 0.3;

  // Slow motion effect (for water entry, etc.)
  private timeScale: number = 1.0;
  private timeScaleTarget: number = 1.0;
  private timeScaleRemaining: number = 0;

  // Bounce pad detection
  private prevVerticalVelocity: number = 0;
  private bouncePadCooldown: number = 0;

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
    // (Initialize scene first so we can set up post-processing)
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

    // Connect particle manager to NPC controller for proximity effects
    this.npcController.setParticleManager(this.particleManager);

    // Foliage animation (wind sway)
    this.foliageAnimator = new FoliageAnimator();

    // Main menu
    this.mainMenu = new MainMenu();

    // Loading screen
    this.loadingScreen = new LoadingScreen();

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

    // Create cinematic vignette overlay
    this.createVignetteOverlay();
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
    const gravity = new RAPIER.Vector3(0, -22, 0);
    this.world = new RAPIER.World(gravity);
    this.physicsReady = true;
    this.loadingScreen.setProgress(50, 'Setting up player...');

    // Setup base systems
    this.setupLighting();
    await this.setupPlayer();

    // Wire up NPC dialogue callbacks for camera focus
    this.npcController.onDialogueStart = () => {
      this.cameraController?.setDialogueFocus(true);
    };
    this.npcController.onDialogueEnd = () => {
      this.cameraController?.setDialogueFocus(false);
    };

    this.loadingScreen.setProgress(70, 'Preparing levels...');

    // Create scene manager for level loading
    this.sceneManager = new SceneManager(this.scene, this.world, this.renderer);

    // Handle player spawning
    this.sceneManager.onPlayerSpawn = (position) => {
      this.spawnPlayerAt(position);
    };

    // Handle collectible particle effects
    this.sceneManager.onCollectiblePickup = (type, position) => {
      const color = type === 'key' ? 0xffd700 : 0xff6b6b;
      this.particleManager.createCollectBurst(position, color);

      // Create trail particles arcing toward UI counter (cards only)
      if (type === 'card') {
        this.particleManager.createCollectTrail(position, 0xff6b6b);  // Red
      }

      // Audio feedback
      if (type === 'key') {
        audioManager.playKeyCollect();
        // Subtle FOV bump for key collection (60 -> 62 degrees, return over 0.2s)
        this.cameraController?.kickFOV(62, 0.2);
      } else {
        audioManager.playCollect();
        // Small screen shake for card collection
        this.cameraController?.shake(0.1);
      }
    };

    // Handle gate unlock particle effects
    this.sceneManager.onGateUnlock = (position) => {
      this.particleManager.createGateUnlockEffect(position);
      audioManager.playGateUnlock();
    };

    // Handle gate enter celebration (level complete)
    this.sceneManager.onGateEnter = (position) => {
      // Large spiral burst of golden particles
      this.particleManager.createGateEnterCelebration(position);
      // Strong screen shake for victory impact
      this.cameraController?.shake(0.4);
      // Big FOV kick (60 -> 75 degrees over 0.5s)
      this.cameraController?.kickFOV(75, 0.5);
    };

    // Handle collectible magnet drift particle effects
    this.sceneManager.onCollectibleMagnetDrift = (position, direction) => {
      this.particleManager.createMagnetTrail(position, direction);
    };

    // Handle checkpoint activation - screen flash and sound
    this.sceneManager.onCheckpointActivated = () => {
      this.sceneManager?.flashScreen();
      audioManager.playCheckpoint();
    };

    // Handle breakable platform stress - crumble particle warning
    this.sceneManager.onBreakablePlatformStress = (position, intensity) => {
      this.particleManager.createCrumbleParticles(position, intensity);
    };

    // Setup menu callbacks
    this.mainMenu.onStart = async () => {
      audioManager.init(); // Initialize audio on first user interaction
      await this.loadLevel();
      this.startFirstAvailableQuest();
    };

    this.mainMenu.onResume = () => {
      this.isRunning = true;
      this.lastTime = performance.now();
      this.gameLoop();
    };

    this.mainMenu.onRestart = async () => {
      await this.loadLevel();
      this.startFirstAvailableQuest();
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

      // Set platform meshes as occludables for camera wall fade-through
      const platformMeshes = this.sceneManager.getPlatformMeshes();
      this.cameraController?.setOccludables(platformMeshes);

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

      // Sync cel-shader lighting after level loads
      this.syncCelShaderLighting();

      // Start ambient garden sounds
      audioManager.startAmbience();
    } catch (error) {
      console.error(`Failed to load The Queen's Garden:`, error);
    }
  }

  /**
   * Auto-start the first available quest and begin gameplay
   */
  private startFirstAvailableQuest(): void {
    this.mainMenu.pauseEnabled = true;

    if (this.questManager) {
      const missions = this.questManager.getAllQuests();
      const firstAvailable = missions.find(m => m.status === 'available');
      if (firstAvailable) {
        this.questManager.startQuest(firstAvailable.quest.id);
        const objective = this.getMissionObjectiveText(firstAvailable.quest);
        this.sceneManager?.showMessage(`${firstAvailable.quest.name}: ${objective}`);
      }
    }

    musicManager.play();
    this.start();
  }

  /**
   * Get human-readable objective text for a quest
   */
  private getMissionObjectiveText(quest: import('./data/LevelData').Quest): string {
    const req = quest.requirements;
    if (req.talk_to_npc) return `Find and talk to ${req.talk_to_npc}`;
    if (req.reach_position) return 'Reach the gazebo on the hill';
    if (req.complete_quest) return 'Complete the prerequisite quest first';
    return quest.dialogue_before[0] || 'Complete the mission objectives';
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

      // Visual celebration: particle burst at player position
      if (this.playerBody) {
        const pos = this.playerBody.translation();
        this.tempPosCache.set(pos.x, pos.y, pos.z);
        this.particleManager.createQuestCompleteBurst(this.tempPosCache);
      }

      // Screen shake for impact
      this.cameraController?.shake(0.3);

      // Fanfare audio
      audioManager.playKeyCollect();

      // UI notification
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
   * Handle player death - fade to black, respawn, fade back in
   */
  private async handleDeath(): Promise<void> {
    if (!this.sceneManager || this.isRespawning || !this.playerBody) return;

    this.isRespawning = true;

    try {
      // Capture death position for visual effect
      const deathPos = this.playerBody.translation();
      const deathPosition = new THREE.Vector3(deathPos.x, deathPos.y, deathPos.z);

      // Play falling sound
      audioManager.playFall();

      // Death effect - dark particles dispersing at death location
      this.particleManager.createDeathEffect(deathPosition);

      // Fade to black
      await this.sceneManager.fadeToBlack();

      // Respawn player
      const respawnPos = new THREE.Vector3(0, 5, 0);
      this.spawnPlayerAt(respawnPos);

      // Play respawn sound
      audioManager.playRespawn();

      // Visual effects for respawn
      this.particleManager.createRespawnEffect(respawnPos);
      this.cameraController?.shake(0.15);
      this.cameraController?.kickFOV(58, 0.3);  // Brief FOV pull-in for "arrival" feel

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
    // Warm ambient - golden hour glow (slightly brighter to compensate for no bloom)
    const ambient = new THREE.AmbientLight(0xFFF8E0, 0.4);
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
      // Distance multipliers: small=0.6x (closer), normal=1.0x, large=1.4x (wider)
      const sizeDistanceMultipliers: Record<string, number> = {
        small: 0.6,
        normal: 1.0,
        large: 1.4
      };
      this.cameraController?.setSizeDistanceMultiplier(sizeDistanceMultipliers[size]);
      this.cameraController?.setHeightOffset(2 * config.scale);

      // Update player controller multipliers and ground check
      const speedMult = config.moveSpeed / this.baseSpeed;
      const jumpMult = config.jumpForce / this.baseJump;
      this.playerController?.setMultipliers(speedMult, jumpMult);
      this.playerController?.setGroundCheckDistance(config.capsuleHeight + 0.6);

      // Scale animation speed based on size (small = faster, large = slower)
      this.playerController?.setAnimationSpeed(1.0 / config.scale);

      // Particle effect, audio, and screen effects on size change
      if (this.playerBody) {
        const pos = this.playerBody.translation();
        this.tempPosCache.set(pos.x, pos.y, pos.z);
        if (size === 'small') {
          this.particleManager.createSizeChangeBurst(this.tempPosCache, false);  // shrinking
          audioManager.playShrink();
          // Screen shake and FOV narrow for shrink
          this.cameraController?.shake(0.2);
          this.cameraController?.kickFOV(55, 0.3);
        } else if (size === 'large') {
          this.particleManager.createSizeChangeBurst(this.tempPosCache, true);  // growing
          audioManager.playGrow();
          // Screen shake and FOV widen for grow
          this.cameraController?.shake(0.2);
          this.cameraController?.kickFOV(68, 0.3);
        }
      }

      // Update HUD size indicator
      this.sceneManager?.updateSize(size);
    };

    // Player controller with momentum physics
    this.playerController = new PlayerController(this.world, this.playerBody);
    this.playerController.setCallbacks({
      onJumpAnticipation: (_isDoubleJump) => {
        // Brief squash before jump - wider and shorter for "crouch" feel
        this.targetSquash.set(1.2, 0.8, 1.2);
        // Small dust puff at feet when player squats
        if (this.playerBody) {
          const pos = this.playerBody.translation();
          this.tempPosCache.set(pos.x, pos.y, pos.z);
          this.particleManager.createRunDustPuff(this.tempPosCache);
        }
      },
      onJump: (isDoubleJump) => {
        audioManager.playJump(isDoubleJump);
        // Different squash for double jump
        if (isDoubleJump) {
          this.targetSquash.set(0.7, 1.4, 0.7);
          // Sparkle burst and expanding ring for double jump
          if (this.playerBody) {
            const pos = this.playerBody.translation();
            this.tempPosCache.set(pos.x, pos.y, pos.z);
            this.particleManager.createDoubleJumpSparkle(this.tempPosCache);
            this.particleManager.createDoubleJumpRing(this.tempPosCache);
          }
        } else {
          this.targetSquash.set(0.8, 1.3, 0.8);
        }
      },
      onLand: (fallSpeed, surface) => {
        audioManager.playLand();
        if (this.playerBody) {
          const pos = this.playerBody.translation();
          this.tempPosCache.set(pos.x, pos.y, pos.z);
          const intensity = Math.min(fallSpeed / 15, 1.5);
          if (intensity > 0.2) {
            this.particleManager.createLandingDust(this.tempPosCache, intensity, surface);
          }
        }
        // Start landing squash animation timer
        this.landingSquashTimer = this.LANDING_SQUASH_DURATION;

        // Camera dip based on fall speed
        if (fallSpeed >= 15) {
          // Hard landing
          this.cameraController?.dip(0.6);
          // Camera shake for high falls - scales from 0.1 at fallSpeed 15 to 0.3 at fallSpeed 25+
          const shakeIntensity = Math.min(0.3, 0.1 + (fallSpeed - 15) * 0.02);
          this.cameraController?.shake(shakeIntensity);
        } else if (fallSpeed >= 8) {
          // Medium landing
          this.cameraController?.dip(0.3);
        }
        // Light landing (fallSpeed < 8): no dip
      },
      onFootstep: (surface) => {
        audioManager.playFootstep(surface);
      },
      onSpeedBoost: () => {
        // FOV kick for speed effect - kick to 68 degrees, return over 0.4s
        this.cameraController?.kickFOV(68, 0.4);
        audioManager.playSpeedBoost();
      },
      onSpeedBoostActive: (position, direction) => {
        // Trail particles while in speed boost zone
        this.particleManager.createSpeedBoostTrail(position, direction);
      },
      onWaterEnter: (position) => {
        // High intensity splash when entering water
        this.particleManager.createWaterSplash(position, 1.5);

        // Brief slow motion effect for impactful water entry
        this.timeScale = 0.3;
        this.timeScaleTarget = 1.0;
        this.timeScaleRemaining = 0.15;

        // Camera effects: slight FOV dip and subtle shake
        this.cameraController?.kickFOV(56, 0.25);
        this.cameraController?.shake(0.15);
      },
      onWaterExit: (position) => {
        // Lower intensity splash when exiting water
        this.particleManager.createWaterSplash(position, 0.8);

        // Camera effects: subtle FOV pop and small shake
        this.cameraController?.kickFOV(62, 0.2);
        this.cameraController?.shake(0.1);
      },
      onSwimmingSplash: (position) => {
        // Low intensity splash while swimming
        this.particleManager.createWaterSplash(position, 0.4);
      },
    });

    // Initialize ground check distance for normal size
    this.playerController.setGroundCheckDistance(0.5 + 0.6);

    // Connect animation manager if available
    if (this.playerAnimationManager) {
      this.playerController.setAnimationManager(this.playerAnimationManager);
    }

    // Camera controller
    this.cameraController = new CameraController(this.camera, this.renderer);
    if (this.playerMesh) {
      this.cameraController.setPlayerMesh(this.playerMesh);
    }
    // When pointer lock exits (Escape), revert player mesh visibility
    this.cameraController.onViewModeChange = (isFirstPerson: boolean) => {
      if (this.playerMesh) {
        this.playerMesh.visible = !isFirstPerson;
      }
    };
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
   * Clear size pickups and stop ambient sounds
   */
  private clearSizePickups(): void {
    for (const pickup of this.sizePickups) {
      pickup.dispose(this.scene);
    }
    this.sizePickups = [];

    // Stop ambient sounds when unloading level
    audioManager.stopAmbience();
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

    // Slow motion effect - gradually restore time scale
    let scaledDt = dt;
    if (this.timeScaleRemaining > 0) {
      this.timeScaleRemaining -= dt;
      if (this.timeScaleRemaining <= 0) {
        // Snap back to normal time
        this.timeScale = this.timeScaleTarget;
      }
      scaledDt = dt * this.timeScale;
    }

    // Update systems (scaledDt for gameplay, dt for UI-related timing)
    this.updatePlayer(scaledDt);
    this.updatePickups(dt);
    this.updateLevel(scaledDt);
    this.updateParticles(scaledDt);
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
      // Stop/start ambience based on mute state
      if (this.isMuted) {
        audioManager.stopAmbience();
      } else {
        audioManager.startAmbience();
      }
    }
    this.wasMutePressed = isMutePressed;

    // View toggle (V key) - switch between first-person and third-person
    const isViewTogglePressed = this.input.isKeyDown('v');
    if (isViewTogglePressed && !this.wasViewTogglePressed && this.cameraController) {
      const isFirstPerson = this.cameraController.toggleViewMode();
      if (this.playerMesh) {
        this.playerMesh.visible = !isFirstPerson;
      }
    }
    this.wasViewTogglePressed = isViewTogglePressed;

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

      // Bounce pad detection: detect velocity reversal while near a bouncy platform
      const vel = this.playerBody.linvel();
      if (this.bouncePadCooldown > 0) {
        this.bouncePadCooldown -= dt;
      } else if (this.prevVerticalVelocity < -2 && vel.y > 2 && this.sceneManager) {
        // Velocity went from falling to rising - check if near a bouncy platform
        const playerPos = this.playerBody.translation();
        this.tempPosCache.set(playerPos.x, playerPos.y, playerPos.z);

        for (const platform of this.sceneManager.getBouncyPlatforms()) {
          const mesh = platform.mesh;
          this.boundsCache.setFromObject(mesh);
          // Expand bounds slightly for detection
          this.boundsCache.expandByScalar(0.5);

          if (this.tempPosCache.x >= this.boundsCache.min.x && this.tempPosCache.x <= this.boundsCache.max.x &&
              this.tempPosCache.z >= this.boundsCache.min.z && this.tempPosCache.z <= this.boundsCache.max.z &&
              this.tempPosCache.y >= this.boundsCache.max.y - 1 && this.tempPosCache.y <= this.boundsCache.max.y + 2) {
            // Player bounced off this platform - create particle effect and sound
            this.particleManager.createBouncePadEffect(this.tempPosCache);
            audioManager.playBounce();
            this.bouncePadCooldown = 0.3;  // Cooldown to prevent multiple effects
            // Squash effect for bounce
            this.targetSquash.set(1.3, 0.8, 1.3);
            break;
          }
        }
      }
      this.prevVerticalVelocity = vel.y;

      // Speed-based vignette effect: intensifies at high speeds
      this.updateSpeedVignette(vel.x, vel.z, dt);

      // Compute horizontal speed once for breathing + footstep + dust checks
      const horizontalSpeed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);

      // Return to normal squash when grounded and not jumping
      // Apply subtle breathing animation when idle
      if (this.playerController.getIsGrounded() && !this.input.jump) {
        const hasInput = this.input.forward || this.input.backward ||
                         this.input.left || this.input.right;

        // Idle state: grounded, no input, low velocity
        if (!hasInput && horizontalSpeed < 0.5) {
          // Update breathing phase
          this.breathingPhase += dt * this.BREATHING_FREQUENCY * Math.PI * 2;
          if (this.breathingPhase > Math.PI * 2) {
            this.breathingPhase -= Math.PI * 2;
          }

          // Subtle breathing oscillation
          // Scale Y: 1.0 to 1.02 (very subtle)
          // Scale XZ: inverse (1.0 to 0.99)
          const breathAmount = Math.sin(this.breathingPhase);
          const scaleY = 1.0 + breathAmount * 0.02;
          const scaleXZ = 1.0 - breathAmount * 0.01;

          this.targetSquash.set(scaleXZ, scaleY, scaleXZ);
        } else {
          // Moving - reset breathing and return to normal
          this.breathingPhase = 0;
          this.targetSquash.set(1, 1, 1);
        }
      }

      // Footstep dust particles when walking on ground
      if (this.playerController.getIsGrounded()) {
        if (horizontalSpeed > 2) {  // Only when moving at decent speed
          const pos = this.playerBody.translation();
          this.tempPosCache.set(pos.x, pos.y, pos.z);
          this.particleManager.createFootstepDust(
            this.tempPosCache,
            horizontalSpeed / 10
          );
        }

        // Run dust puffs when at 80%+ max speed
        const maxSpeed = 11;
        if (horizontalSpeed > maxSpeed * 0.8) {
          const pos = this.playerBody.translation();
          // Position slightly behind player based on velocity direction
          const behindX = pos.x - (vel.x / horizontalSpeed) * 0.3;
          const behindZ = pos.z - (vel.z / horizontalSpeed) * 0.3;
          this.tempPosCache.set(behindX, pos.y, behindZ);
          this.particleManager.createRunDustPuff(
            this.tempPosCache
          );
        }

        // Detect surface type for footstep sounds
        if (this.sceneManager) {
          const pos = this.playerBody.translation();
          this.tempPosCache.set(pos.x, pos.y, pos.z);
          const surfaceType = this.sceneManager.getSurfaceTypeAt(this.tempPosCache);
          this.playerController.setCurrentSurface(surfaceType);
        }
      }
    }

    // Animate landing squash with easeOut curve
    if (this.landingSquashTimer > 0) {
      this.landingSquashTimer -= dt;
      // EaseOut: starts squashed, returns to normal
      const t = Math.max(0, this.landingSquashTimer / this.LANDING_SQUASH_DURATION);
      const easeOut = t * t; // Quadratic easeOut (inverted: 1->0 becomes squash->normal)
      // Squash: Y down to 0.85, XZ up to 1.1 at peak (t=1), return to 1.0 at t=0
      const squashY = 1.0 - 0.15 * easeOut;    // 0.85 -> 1.0
      const squashXZ = 1.0 + 0.1 * easeOut;    // 1.1 -> 1.0
      this.currentSquash.set(squashXZ, squashY, squashXZ);
    } else {
      // Normal squash/stretch animation (lerp to target)
      this.currentSquash.lerp(this.targetSquash, 0.2);
    }

    // Position
    const pos = this.playerBody.translation();

    // Respawn if fallen (with fade effect)
    if (pos.y < -50 && !this.isRespawning) {
      this.handleDeath();
    }

    // Update player mesh
    if (this.playerMesh) {
      this.playerMesh.position.set(pos.x, pos.y, pos.z);

      // Rotate Alice to face movement direction
      if (this.playerController) {
        const momentum = this.playerController.getMomentum();
        const hSpeed = momentum.x * momentum.x + momentum.z * momentum.z;
        if (hSpeed > 0.5) {
          // Target angle from momentum direction
          const targetAngle = Math.atan2(momentum.x, momentum.z);
          // Smooth rotation lerp (handle wrapping around PI/-PI)
          let diff = targetAngle - this.playerFacingAngle;
          if (diff > Math.PI) diff -= Math.PI * 2;
          if (diff < -Math.PI) diff += Math.PI * 2;
          this.playerFacingAngle += diff * Math.min(1, 12 * dt);
        }
        this.playerMesh.rotation.y = this.playerFacingAngle;
      }

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

      // Get player velocity for camera look-ahead (copy to cache to avoid allocation)
      if (this.playerController) {
        const momentum = this.playerController.getMomentum();
        this.playerVelocityCache.copy(momentum);

        // Tell camera to orbit behind Alice when moving
        const hSpeed = momentum.x * momentum.x + momentum.z * momentum.z;
        this.cameraController.setPlayerFacing(hSpeed > 0.5 ? this.playerFacingAngle : null);
      }

      this.cameraController.update(dt, this.playerPosCache, this.playerVelocityCache);

      // Enable underwater wobble when player is below water surface
      const isUnderwater = this.playerController?.isUnderwater() ?? false;
      this.cameraController.setUnderwaterWobble(isUnderwater);

      // Spawn bubble particles when swimming underwater
      if (isUnderwater && this.playerController?.getIsInWater()) {
        const swimPos = this.playerBody.translation();
        this.tempPosCache.set(swimPos.x, swimPos.y, swimPos.z);
        this.particleManager.createSwimmingBubbles(this.tempPosCache);
      }
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

    // Spawn ambient dust motes around player for atmosphere
    this.particleManager.createAmbientDust(this.playerPosCache);

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
      <p style="margin:5px 0"><b>Shift</b> - Sprint</p>
      <p style="margin:5px 0"><b>Q/R</b> - Shrink/Grow</p>
      <p style="margin:5px 0"><b>E</b> - Talk to NPCs</p>
      <p style="margin:5px 0"><b>V</b> - Toggle View (1st/3rd Person)</p>
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
   * Create cinematic vignette overlay
   * Subtle darkening at screen edges to draw focus to center
   */
  private createVignetteOverlay(): void {
    this.vignetteOverlay = document.createElement('div');
    this.vignetteOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      background: radial-gradient(
        ellipse at center,
        transparent 50%,
        rgba(0, 0, 0, 0.3) 100%
      );
      z-index: 100;
    `;
    document.body.appendChild(this.vignetteOverlay);
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

  /**
   * Update speed-based vignette intensity
   * At high speeds (>80% max), darken and tighten the vignette for a "tunnel vision" effect
   */
  private updateSpeedVignette(velX: number, velZ: number, dt: number): void {
    if (!this.vignetteOverlay) return;

    const horizontalSpeed = Math.sqrt(velX * velX + velZ * velZ);
    const maxSpeed = 11;
    const speedThreshold = maxSpeed * 0.8;  // Effect starts at 80% max speed

    // Base vignette intensity (always present)
    const baseIntensity = 0.3;
    // Max additional intensity at full speed
    const maxSpeedIntensity = 0.5;

    if (horizontalSpeed > speedThreshold) {
      // Calculate how far above threshold (0 to 1)
      const speedFactor = Math.min((horizontalSpeed - speedThreshold) / (maxSpeed - speedThreshold), 1);
      // Target intensity increases with speed
      this.targetVignetteIntensity = baseIntensity + (maxSpeedIntensity - baseIntensity) * speedFactor;
    } else {
      // Return to base intensity
      this.targetVignetteIntensity = baseIntensity;
    }

    // Smooth lerp toward target
    const lerpSpeed = 5;  // Higher = faster response
    this.currentVignetteIntensity += (this.targetVignetteIntensity - this.currentVignetteIntensity) * lerpSpeed * dt;

    // Also tighten the vignette radius at high speeds for more pronounced tunnel effect
    // Base: 50% transparent center, at high speed: 35% transparent center
    const baseRadius = 50;
    const minRadius = 35;
    const speedFactor = (this.currentVignetteIntensity - baseIntensity) / (maxSpeedIntensity - baseIntensity);
    const currentRadius = baseRadius - (baseRadius - minRadius) * speedFactor;

    // Update CSS gradient
    this.vignetteOverlay.style.background = `radial-gradient(
      ellipse at center,
      transparent ${currentRadius}%,
      rgba(0, 0, 0, ${this.currentVignetteIntensity.toFixed(2)}) 100%
    )`;
  }
}
