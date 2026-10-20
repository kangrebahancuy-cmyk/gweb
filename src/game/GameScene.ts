import Phaser from "phaser";
import { STARTER_ATLAS_DATA_URI } from "./atlasData";
import { addItem, levelForXp } from "./rules";

type CropPlot = { id: number; x: number; y: number; plantedAt: number | null };
type SaveData = {
  inventory: Record<string, number>;
  gold: number;
  xp: number;
  harvested: number;
  questStarted: boolean;
  questComplete: boolean;
  plots: CropPlot[];
};
type HudState = SaveData & {
  health: number;
  panel: "none" | "inventory" | "skills" | "quest";
  message: string;
  playerLevel: number;
  farmingLevel: number;
  slimeKills: number;
};

const SAVE_KEY = "ero-prototype-save-v1";
const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1440;
const CROP_GROW_MS = 12_000;

function freshSave(): SaveData {
  return {
    inventory: { turnip_seed: 3, turnip: 0, slime_gel: 0 },
    gold: 15,
    xp: 0,
    harvested: 0,
    questStarted: false,
    questComplete: false,
    plots: [
      { id: 0, x: 490, y: 425, plantedAt: null },
      { id: 1, x: 548, y: 425, plantedAt: null },
      { id: 2, x: 490, y: 483, plantedAt: null },
      { id: 3, x: 548, y: 483, plantedAt: null }
    ]
  };
}

function loadSave(): SaveData {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return freshSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const defaults = freshSave();
    return {
      ...defaults,
      ...parsed,
      inventory: { ...defaults.inventory, ...(parsed.inventory ?? {}) },
      plots: defaults.plots.map((plot) => {
        const saved = parsed.plots?.find((item) => item.id === plot.id);
        return saved ? { ...plot, plantedAt: saved.plantedAt ?? null } : plot;
      })
    };
  } catch {
    return freshSave();
  }
}

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private save = freshSave();
  private health = 100;
  private panel: HudState["panel"] = "none";
  private message = "Welcome to Fernhollow. Talk to Mira to begin your first quest.";
  private messageUntil = 0;
  private slime!: Phaser.Physics.Arcade.Sprite;
  private slimeHealth = 3;
  private slimeAlive = true;
  private slimeRespawnAt = 0;
  private slimeKills = 0;
  private lastSlimeHit = 0;
  private lastPlayerHit = 0;
  private lastSaveAt = 0;
  private moveVector = new Phaser.Math.Vector2(0, 0);
  private joystickPointerId: number | null = null;
  private joystickOrigin = new Phaser.Math.Vector2(0, 0);
  private joystickKnob = new Phaser.Math.Vector2(0, 0);
  private touchGraphics!: Phaser.GameObjects.Graphics;
  private plotSprites = new Map<number, Phaser.GameObjects.Sprite>();
  private playerFacing: "down" | "up" | "left" | "right" = "down";
  private obstacles!: Phaser.Physics.Arcade.StaticGroup;
  private onUiActionBound = (event: Event) => {
    const custom = event as CustomEvent<string>;
    this.handleUiAction(custom.detail);
  };

  constructor() {
    super("GameScene");
  }

  preload(): void {
    this.load.image("starter-atlas", STARTER_ATLAS_DATA_URI);
    this.load.spritesheet(
      "player-sheet",
      "/assets/game/Pixel%20Art%20Character-TheGameAssetsMine-/PNG/Boy%20%20sheet%20wlaking%20and%20Idle.png",
      { frameWidth: 64, frameHeight: 64 }
    );
    this.load.spritesheet("slime-idle-sheet", "/assets/game/PNG/Slime1/Without_shadow/Slime1_Idle_without_shadow.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("slime-walk-sheet", "/assets/game/PNG/Slime1/Without_shadow/Slime1_Walk_without_shadow.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("slime-attack-sheet", "/assets/game/PNG/Slime1/Without_shadow/Slime1_Attack_without_shadow.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("slime-hurt-sheet", "/assets/game/PNG/Slime1/Without_shadow/Slime1_Hurt_without_shadow.png", { frameWidth: 64, frameHeight: 64 });
    this.load.spritesheet("slime-death-sheet", "/assets/game/PNG/Slime1/Without_shadow/Slime1_Death_without_shadow.png", { frameWidth: 64, frameHeight: 64 });
    this.load.image("farm-terrain", "/assets/game/Original/16x16/Tilesets%20(Compact)/vectoraith_tileset_farmingsims_terrain_summer_expanded.png");
    this.load.image("farm-buildings", "/assets/game/Original/16x16/Tilesets%20(Compact)/vectoraith_tileset_farmingsims_buildings.png");
    this.load.spritesheet("farm-produce", "/assets/game/Vegetables.png", { frameWidth: 32, frameHeight: 32 });
    this.load.image("farm-crops", "/assets/game/Original/16x16/Tilesets%20(Compact)/vectoraith_tileset_farmingsims_crops.png");
    this.load.image("farm-orchard", "/assets/game/Original/16x16/Tilesets%20(Compact)/vectoraith_tileset_farmingsims_orchard.png");
    this.load.image("farm-details", "/assets/game/Original/16x16/Tilesets%20(Compact)/vectoraith_tileset_farmingsims_details.png");
  }

  create(): void {
    this.save = loadSave();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(this.scale.width < 720 ? 0.82 : 1);
    this.createAtlasFrames();
    this.createAssetAnimations();
    this.drawWorld();
    this.createPlotSprites();
    this.obstacles = this.physics.add.staticGroup();
    this.createWorldObjects();

    this.player = this.physics.add.sprite(330, 350, "player-sheet", 2);
    this.player.setDepth(20);
    this.player.setDisplaySize(48, 48);
    this.player.play("player-idle-down");
    this.player.setCollideWorldBounds(true);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(20, 30);
    this.physics.add.collider(this.player, this.obstacles);

    this.slime = this.physics.add.sprite(1190, 720, "slime-idle-sheet", 0);
    this.slime.setDepth(20);
    this.slime.setDisplaySize(48, 48);
    this.slime.play("slime-idle");
    this.slime.setCollideWorldBounds(true);
    const slimeBody = this.slime.body as Phaser.Physics.Arcade.Body;
    slimeBody.setSize(28, 24);
    this.physics.add.collider(this.slime, this.obstacles);

    this.keys = this.input.keyboard!.addKeys(
      "W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,I,K,J,ESC"
    ) as Record<string, Phaser.Input.Keyboard.Key>;
    this.cameras.main.startFollow(this.player, true, 0.09, 0.09);
    this.cameras.main.setDeadzone(180, 100);
    this.setupTouchControls();
    this.scale.on("resize", this.handleResize, this);
    window.addEventListener("ero:action", this.onUiActionBound);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener("ero:action", this.onUiActionBound);
      this.scale.off("resize", this.handleResize, this);
    });
    this.saveGame();
    this.emitHud();
  }

  update(time: number, delta: number): void {
    const speed = 190;
    const keyboard = this.input.keyboard;
    const x = (keyboard?.checkDown(this.keys.D) || keyboard?.checkDown(this.keys.RIGHT) ? 1 : 0)
      - (keyboard?.checkDown(this.keys.A) || keyboard?.checkDown(this.keys.LEFT) ? 1 : 0);
    const y = (keyboard?.checkDown(this.keys.S) || keyboard?.checkDown(this.keys.DOWN) ? 1 : 0)
      - (keyboard?.checkDown(this.keys.W) || keyboard?.checkDown(this.keys.UP) ? 1 : 0);
    const vector = new Phaser.Math.Vector2(x + this.moveVector.x, y + this.moveVector.y);
    if (vector.length() > 1) vector.normalize();
    this.player.setVelocity(vector.x * speed, vector.y * speed);
    if (vector.lengthSq() > 0.02) {
      if (Math.abs(vector.x) > Math.abs(vector.y)) {
        this.playerFacing = vector.x < 0 ? "left" : "right";
      } else {
        this.playerFacing = vector.y < 0 ? "up" : "down";
      }
      this.player.setAngle(0);
      this.player.play(`player-walk-${this.playerFacing}`, true);
    } else {
      this.player.play(`player-idle-${this.playerFacing}`, true);
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.E)) this.interact();
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) this.attack();
    if (Phaser.Input.Keyboard.JustDown(this.keys.I)) this.togglePanel("inventory");
    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) this.togglePanel("skills");
    if (Phaser.Input.Keyboard.JustDown(this.keys.J)) this.togglePanel("quest");
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) this.togglePanel("none");

    this.updateSlime(time);
    this.updatePlots();
    if (time - this.lastSaveAt > 2500) this.saveGame();
    if (time > this.messageUntil && this.messageUntil !== 0) {
      this.message = "";
      this.messageUntil = 0;
      this.emitHud();
    }
    this.touchGraphics.clear();
    this.drawTouchControls();
    if (delta > 100) this.player.setVelocity(0, 0);
  }

  private createAtlasFrames(): void {
    const texture = this.textures.get("starter-atlas");
    if (!texture.has("player")) texture.add("player", 0, 0, 0, 64, 64);
    if (!texture.has("slime")) texture.add("slime", 0, 64, 0, 64, 64);
    if (!texture.has("turnip")) texture.add("turnip", 0, 0, 64, 32, 32);
    if (!texture.has("grass")) texture.add("grass", 0, 32, 64, 32, 32);
    const terrain = this.textures.get("farm-terrain");
    if (terrain && !terrain.has("grass-tile")) terrain.add("grass-tile", 0, 0, 0, 16, 16);
    if (terrain && !terrain.has("soil-bed")) terrain.add("soil-bed", 0, 0, 32, 32, 32);
    const buildings = this.textures.get("farm-buildings");
    if (buildings) {
      if (!buildings.has("farmhouse")) buildings.add("farmhouse", 0, 0, 0, 64, 64);
      if (!buildings.has("barn")) buildings.add("barn", 0, 96, 32, 128, 112);
      if (!buildings.has("small-house")) buildings.add("small-house", 0, 64, 192, 64, 64);
    }
    const produce = this.textures.get("farm-produce");
    if (produce && !produce.has("radish")) produce.add("radish", 0, 96, 64, 32, 32);
    const crops = this.textures.get("farm-crops");
    if (crops) {
      if (!crops.has("sprout")) crops.add("sprout", 0, 0, 0, 16, 16);
      if (!crops.has("young-crop")) crops.add("young-crop", 0, 32, 0, 16, 16);
    }
    const orchard = this.textures.get("farm-orchard");
    if (orchard) {
      if (!orchard.has("tree-green")) orchard.add("tree-green", 0, 64, 0, 32, 32);
      if (!orchard.has("tree-fruit")) orchard.add("tree-fruit", 0, 96, 0, 32, 32);
      if (!orchard.has("tree-blossom")) orchard.add("tree-blossom", 0, 32, 0, 32, 32);
    }
    const details = this.textures.get("farm-details");
    if (details && !details.has("flower-patch")) details.add("flower-patch", 0, 0, 64, 32, 32);
  }

  private createAssetAnimations(): void {
    const specs = [
      ["slime-idle", "slime-idle-sheet", 5, 7, -1],
      ["slime-walk", "slime-walk-sheet", 7, 10, -1],
      ["slime-attack", "slime-attack-sheet", 9, 12, 0],
      ["slime-hurt", "slime-hurt-sheet", 4, 12, 0],
      ["slime-death", "slime-death-sheet", 9, 12, 0]
    ] as const;
    for (const [key, texture, end, frameRate, repeat] of specs) {
      if (!this.anims.exists(key)) {
        this.anims.create({
          key,
          frames: this.anims.generateFrameNumbers(texture, { start: 0, end }),
          frameRate,
          repeat
        });
      }
    }

    // The supplied 640×640 character sheet is a 10×10 grid. Its first row
    // contains directional idle poses; rows 1–3 provide the walk cycle poses.
    const directions = [
      { key: "left", column: 0, idle: 0 },
      { key: "up", column: 1, idle: 1 },
      { key: "down", column: 2, idle: 2 },
      { key: "right", column: 3, idle: 3 }
    ] as const;
    for (const direction of directions) {
      const idleKey = `player-idle-${direction.key}`;
      if (!this.anims.exists(idleKey)) {
        this.anims.create({
          key: idleKey,
          frames: [{ key: "player-sheet", frame: direction.idle }],
          frameRate: 1,
          repeat: -1
        });
      }
      const walkKey = `player-walk-${direction.key}`;
      if (!this.anims.exists(walkKey)) {
        this.anims.create({
          key: walkKey,
          frames: [10 + direction.column, 20 + direction.column, 30 + direction.column]
            .map((frame) => ({ key: "player-sheet", frame })),
          frameRate: 8,
          repeat: -1
        });
      }
    }
  }

  private createPlotSprites(): void {
    for (const plot of this.save.plots) {
      const sprite = this.add.sprite(plot.x, plot.y - 8, "farm-crops", "sprout")
        .setDisplaySize(30, 30)
        .setDepth(14)
        .setVisible(false);
      this.plotSprites.set(plot.id, sprite);
    }
  }

  private drawWorld(): void {
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "farm-terrain", "grass-tile")
      .setOrigin(0, 0).setDepth(-101);
    const g = this.add.graphics().setDepth(-100);
    // Subtle grass variation gives the world texture without obscuring the imported sprites.
    for (let y = 16; y < WORLD_HEIGHT; y += 48) {
      for (let x = 16 + ((y / 48) % 2) * 18; x < WORLD_WIDTH; x += 48) {
        g.fillStyle(((x + y) / 48) % 3 === 0 ? 0x83a960 : 0x648d4b, 0.32);
        g.fillRect(x, y, 3, 3);
      }
    }
    // Main village lane and branching paths.
    g.fillStyle(0xbfa16b, 1).fillRoundedRect(80, 305, 1430, 62, 18);
    g.fillRoundedRect(400, 330, 58, 600, 16);
    g.fillRoundedRect(1040, 330, 54, 420, 14);
    g.lineStyle(3, 0x8b7049, 0.35).strokeRoundedRect(80, 305, 1430, 62, 18);

    // Farmyard, beds, and a small pond.
    g.fillStyle(0x9a7a4e, 1).fillRoundedRect(450, 390, 145, 135, 10);
    for (const plot of this.save.plots) {
      this.add.image(plot.x, plot.y, "farm-terrain", "soil-bed")
        .setDisplaySize(44, 36).setDepth(-98);
      g.lineStyle(2, 0x392c20, 0.45).strokeRoundedRect(plot.x - 22, plot.y - 18, 44, 36, 4);
    }
    g.fillStyle(0x5e9e9b, 1).fillEllipse(870, 935, 190, 112);
    g.lineStyle(8, 0xc9d6a1, 1).strokeEllipse(870, 935, 190, 112);

    // Imported buildings cropped from the Farming Sim tileset.
    this.add.image(285, 235, "farm-buildings", "farmhouse")
      .setDisplaySize(150, 135).setDepth(-90);
    this.add.image(760, 255, "farm-buildings", "barn")
      .setDisplaySize(190, 165).setDepth(-90);
    this.add.image(1425, 345, "farm-buildings", "small-house")
      .setDisplaySize(130, 120).setDepth(-90);

    // Tree clusters mark the forest edge and resource areas.
    const trees = [
      [100, 150], [150, 440], [180, 570], [220, 700], [320, 820], [170, 930],
      [760, 600], [830, 660], [910, 620], [980, 570], [1150, 480], [1250, 500],
      [1360, 650], [1480, 590], [1560, 720], [1450, 850], [1300, 930], [1110, 1060],
      [970, 1130], [650, 1110], [480, 1050], [260, 1120], [1630, 420], [1730, 520]
    ];
    trees.forEach(([x, y], i) => {
      const frame = i % 5 === 0 ? "tree-fruit" : i % 4 === 0 ? "tree-blossom" : "tree-green";
      this.add.image(x, y, "farm-orchard", frame)
        .setDisplaySize(60, 60)
        .setDepth(16);
    });
    // Small original details tiles soften the edges of the orchard and farm paths.
    [[650, 350], [690, 365], [1000, 430], [1060, 445], [1510, 650], [1580, 690]].forEach(([x, y]) => {
      this.add.image(x, y, "farm-details", "flower-patch")
        .setDisplaySize(32, 32)
        .setDepth(10)
        .setAlpha(0.95);
    });
    g.fillStyle(0xf0d8a3, 1).fillRoundedRect(1080, 750, 245, 28, 10);
    g.fillStyle(0x8b6d45, 1).fillRoundedRect(1090, 755, 225, 18, 7);
    g.fillStyle(0x315d39, 1).fillRoundedRect(1120, 765, 180, 5, 2);
    this.add.text(275, 155, "FERNHOLLOW", {
      fontFamily: "monospace", fontSize: "18px", color: "#f8f0d7",
      stroke: "#35472b", strokeThickness: 5, fontStyle: "bold"
    }).setDepth(1);
    this.add.text(455, 545, "YOUR FARM", {
      fontFamily: "monospace", fontSize: "12px", color: "#f8e8bf",
      stroke: "#4c3827", strokeThickness: 3
    }).setDepth(1);
    this.add.text(1358, 408, "GENERAL STORE", {
      fontFamily: "monospace", fontSize: "12px", color: "#f8f0d7",
      stroke: "#4c3827", strokeThickness: 3
    }).setDepth(1);
  }

  private createWorldObjects(): void {
    // Invisible colliders correspond to buildings and the tree trunks.
    const blocks = [
      [285, 240, 145, 95], [760, 250, 135, 90], [1425, 340, 145, 100],
      [100, 150, 28, 25], [150, 440, 28, 25], [180, 570, 28, 25], [220, 700, 28, 25],
      [320, 820, 28, 25], [170, 930, 28, 25], [760, 600, 28, 25], [830, 660, 28, 25],
      [910, 620, 28, 25], [980, 570, 28, 25], [1150, 480, 28, 25], [1250, 500, 28, 25],
      [1360, 650, 28, 25], [1480, 590, 28, 25], [1560, 720, 28, 25], [1450, 850, 28, 25],
      [1300, 930, 28, 25], [1110, 1060, 28, 25], [970, 1130, 28, 25], [650, 1110, 28, 25],
      [480, 1050, 28, 25], [260, 1120, 28, 25], [1630, 420, 28, 25], [1730, 520, 28, 25]
    ];
    blocks.forEach(([x, y, w, h]) => {
      const block = this.add.zone(x, y, w, h);
      this.physics.add.existing(block, true);
      this.obstacles.add(block);
    });
    const npc = this.add.sprite(420, 345, "player-sheet", 2)
      .setDisplaySize(40, 40).setTint(0xf4cf82).setDepth(18);
    this.add.text(420, 312, "Mira", {
      fontFamily: "monospace", fontSize: "13px", color: "#fff3c9",
      stroke: "#38432a", strokeThickness: 4
    }).setOrigin(0.5).setDepth(25);
    npc.setName("mira");
    this.add.sprite(1415, 440, "farm-produce", 11).setDisplaySize(28, 28).setDepth(18);
    this.add.text(1415, 463, "Market", {
      fontFamily: "monospace", fontSize: "11px", color: "#fff3c9",
      stroke: "#38432a", strokeThickness: 3
    }).setOrigin(0.5).setDepth(25);
  }

  private setupTouchControls(): void {
    this.touchGraphics = this.add.graphics().setScrollFactor(0).setDepth(1000);
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      const w = this.scale.width;
      const h = this.scale.height;
      if (pointer.x < w * 0.42 && pointer.y > h * 0.56) {
        this.joystickPointerId = pointer.id;
        this.joystickOrigin.set(pointer.x, pointer.y);
        this.joystickKnob.set(pointer.x, pointer.y);
        this.updateJoystick(pointer);
      } else if (pointer.x > w * 0.7 && pointer.y > h * 0.64) {
        const localY = h - pointer.y;
        if (localY < 94) this.interact();
        else if (localY < 158) this.attack();
        else this.interact();
      }
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId && pointer.isDown) this.updateJoystick(pointer);
    });
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.joystickPointerId) {
        this.joystickPointerId = null;
        this.moveVector.set(0, 0);
      }
    });
  }

  private updateJoystick(pointer: Phaser.Input.Pointer): void {
    const delta = new Phaser.Math.Vector2(pointer.x - this.joystickOrigin.x, pointer.y - this.joystickOrigin.y);
    if (delta.length() > 48) delta.setLength(48);
    this.joystickKnob.set(this.joystickOrigin.x + delta.x, this.joystickOrigin.y + delta.y);
    this.moveVector.set(delta.x / 48, delta.y / 48);
    if (this.moveVector.length() > 1) this.moveVector.normalize();
  }

  private drawTouchControls(): void {
    if (this.scale.width > 900 && !this.sys.game.device.input.touch) return;
    const g = this.touchGraphics;
    const w = this.scale.width;
    const h = this.scale.height;
    const bx = this.joystickPointerId === null ? 82 : this.joystickOrigin.x;
    const by = this.joystickPointerId === null ? h - 82 : this.joystickOrigin.y;
    const kx = this.joystickPointerId === null ? bx : this.joystickKnob.x;
    const ky = this.joystickPointerId === null ? by : this.joystickKnob.y;
    g.fillStyle(0x14241c, 0.45).fillCircle(bx, by, 48);
    g.lineStyle(3, 0xe9d9aa, 0.6).strokeCircle(bx, by, 48);
    g.fillStyle(0xe9d9aa, 0.6).fillCircle(kx, ky, 21);
    this.drawTouchButton(w - 75, h - 75, 0x486c45);
    this.drawTouchButton(w - 145, h - 145, 0x8d4b3e);
  }

  private drawTouchButton(x: number, y: number, color: number): void {
    this.touchGraphics.fillStyle(0x14241c, 0.55).fillCircle(x, y, 30);
    this.touchGraphics.fillStyle(color, 0.9).fillCircle(x, y, 24);
    this.touchGraphics.lineStyle(2, 0xe9d9aa, 0.9).strokeCircle(x, y, 24);
    // Labels for these buttons are rendered by the responsive React touch toolbar.
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.main.setZoom(gameSize.width < 720 ? 0.82 : 1);
  }

  private handleUiAction(action: string): void {
    if (action === "interact") this.interact();
    else if (action === "attack") this.attack();
    else if (action === "plant") this.plantOrHarvest();
    else if (action === "inventory") this.togglePanel("inventory");
    else if (action === "skills") this.togglePanel("skills");
    else if (action === "quest") this.togglePanel("quest");
    else if (action === "close") this.togglePanel("none");
    else if (action === "reset") {
      window.localStorage.removeItem(SAVE_KEY);
      this.save = freshSave();
      this.health = 100;
      this.message = "Local prototype save reset.";
      this.messageUntil = this.time.now + 2800;
      this.saveGame();
      this.emitHud();
    }
  }

  private interact(): void {
    const npcDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 420, 345);
    if (npcDistance < 90) {
      if (this.save.questComplete) {
        this.showMessage("Mira: Fernhollow is thriving thanks to you. Come back for more adventures!");
      } else if (!this.save.questStarted) {
        this.save.questStarted = true;
        this.showMessage("Mira: Could you grow and harvest one turnip for our village pantry? Your farm is just east of here.");
        this.togglePanel("quest");
      } else if (this.save.harvested > 0) {
        this.save.questComplete = true;
        this.save.gold += 25;
        this.save.xp += 50;
        this.showMessage("Quest complete! Mira rewards you with 25 gold and 50 Farming XP.");
      } else {
        this.showMessage("Mira: Plant a turnip seed in one of your farm plots, wait a little, then harvest it.");
      }
      this.saveGame();
      this.emitHud();
      return;
    }
    const plot = this.closestPlot();
    if (plot) {
      this.plantOrHarvest(plot);
      return;
    }
    const storeDistance = Phaser.Math.Distance.Between(this.player.x, this.player.y, 1415, 440);
    if (storeDistance < 90) {
      this.showMessage("General Store: A proper shop will open in a later milestone. For now, grow and gather!");
      return;
    }
    this.showMessage("Nothing to interact with nearby. Walk up to Mira or a farm plot.");
  }

  private closestPlot(): CropPlot | undefined {
    return this.save.plots
      .map((plot) => ({ plot, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, plot.x, plot.y) }))
      .filter((item) => item.distance < 78)
      .sort((a, b) => a.distance - b.distance)[0]?.plot;
  }

  private plantOrHarvest(target?: CropPlot): void {
    const plot = target ?? this.closestPlot();
    if (!plot) {
      this.showMessage("Move closer to a farm plot to plant or harvest.");
      return;
    }
    if (plot.plantedAt === null) {
      if ((this.save.inventory.turnip_seed ?? 0) < 1) {
        this.showMessage("You are out of turnip seeds. Seeds and shops arrive in a later update.");
        return;
      }
      this.save.inventory = { ...this.save.inventory, turnip_seed: this.save.inventory.turnip_seed - 1 };
      plot.plantedAt = Date.now();
      this.showMessage("Turnip planted! It will be ready in about 12 seconds.");
    } else if (Date.now() - plot.plantedAt >= CROP_GROW_MS) {
      plot.plantedAt = null;
      this.save.inventory = addItem(this.save.inventory, "turnip", 1);
      this.save.harvested += 1;
      this.save.xp += 15;
      this.showMessage("Harvested 1 turnip and earned 15 Farming XP.");
    } else {
      const remaining = Math.ceil((CROP_GROW_MS - (Date.now() - plot.plantedAt)) / 1000);
      this.showMessage(`Your turnip is growing. Check back in ${remaining}s.`);
    }
    this.saveGame();
    this.emitHud();
  }

  private updatePlots(): void {
    const now = Date.now();
    this.save.plots.forEach((plot) => {
      const sprite = this.plotSprites.get(plot.id);
      if (!sprite) return;
      if (plot.plantedAt === null) {
        sprite.setVisible(false);
        return;
      }
      const grown = now - plot.plantedAt >= CROP_GROW_MS;
      if (grown) {
        sprite.setTexture("farm-produce", 11).setDisplaySize(32, 32);
      } else {
        sprite.setTexture("farm-crops", "young-crop").setDisplaySize(30, 30);
      }
      sprite.setVisible(true);
    });
  }

  private attack(): void {
    if (!this.slimeAlive) {
      this.showMessage("The slime is recovering. It will return shortly.");
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.slime.x, this.slime.y);
    if (distance > 100) {
      this.showMessage("No enemy in range. Find the green slime near the eastern forest.");
      return;
    }
    if (this.time.now - this.lastSlimeHit < 550) return;
    this.lastSlimeHit = this.time.now;
    this.slimeHealth -= 1;
    if (this.slimeHealth <= 0) {
      this.slimeAlive = false;
      this.slime.setVelocity(0, 0);
      this.slime.play("slime-death", true);
      this.slime.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        this.slime.setVisible(false).setActive(false);
      });
      this.slimeKills += 1;
      this.save.xp += 20;
      this.save.gold += 5;
      this.save.inventory = addItem(this.save.inventory, "slime_gel", 1);
      this.slimeRespawnAt = this.time.now + 10_000;
      this.showMessage("Slime defeated! +20 Combat XP, +5 gold, +1 slime gel.");
      this.saveGame();
      this.emitHud();
    } else {
      this.slime.play("slime-hurt", true);
      this.slime.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.slimeAlive && this.slime.active) this.slime.play("slime-idle", true);
      });
      this.showMessage(`Hit! Slime health: ${this.slimeHealth}/3.`);
    }
  }

  private updateSlime(time: number): void {
    if (!this.slimeAlive) {
      if (time >= this.slimeRespawnAt) {
        this.slimeAlive = true;
        this.slimeHealth = 3;
        this.slime.setPosition(1190, 720).setVisible(true).setActive(true).clearTint();
        this.slime.play("slime-idle", true);
        this.showMessage("A green slime has returned to the forest.");
      }
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.slime.x, this.slime.y);
    if (distance < 260 && distance > 46) {
      const direction = new Phaser.Math.Vector2(this.player.x - this.slime.x, this.player.y - this.slime.y).normalize();
      this.slime.setVelocity(direction.x * 52, direction.y * 52);
      const animationKey = this.slime.anims.currentAnim?.key;
      if (animationKey !== "slime-walk" && animationKey !== "slime-hurt" && animationKey !== "slime-attack") {
        this.slime.play("slime-walk", true);
      }
    } else {
      this.slime.setVelocity(0, 0);
      const animationKey = this.slime.anims.currentAnim?.key;
      if (distance >= 46 && animationKey !== "slime-idle" && animationKey !== "slime-hurt" && animationKey !== "slime-attack") {
        this.slime.play("slime-idle", true);
      }
    }
    if (distance < 46 && time - this.lastPlayerHit > 1500) {
      this.lastPlayerHit = time;
      this.slime.play("slime-attack", true);
      this.health = Math.max(0, this.health - 8);
      if (this.health === 0) {
        this.health = 100;
        this.player.setPosition(330, 350);
        this.showMessage("You fainted and returned to Fernhollow. Your items were kept.");
      } else {
        this.showMessage("The slime hit you for 8 damage.");
      }
      this.emitHud();
    }
  }

  private togglePanel(panel: HudState["panel"]): void {
    this.panel = this.panel === panel ? "none" : panel;
    this.emitHud();
  }

  private showMessage(message: string): void {
    this.message = message;
    this.messageUntil = this.time.now + 4200;
    this.emitHud();
  }

  private saveGame(): void {
    this.lastSaveAt = this.time.now;
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(this.save));
    } catch {
      // Private browsing or storage quotas should not crash the game.
    }
  }

  private emitHud(): void {
    const state: HudState = {
      ...this.save,
      health: this.health,
      panel: this.panel,
      message: this.message,
      playerLevel: levelForXp(this.save.xp),
      farmingLevel: levelForXp(this.save.harvested * 15),
      slimeKills: this.slimeKills
    };
    window.dispatchEvent(new CustomEvent<HudState>("ero:hud", { detail: state }));
  }
}
