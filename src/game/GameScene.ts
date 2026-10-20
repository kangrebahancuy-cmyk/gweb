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
  private cropGraphics!: Phaser.GameObjects.Graphics;
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
  }

  create(): void {
    this.save = loadSave();
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setZoom(this.scale.width < 720 ? 0.82 : 1);
    this.createAtlasFrames();
    this.drawWorld();
    this.cropGraphics = this.add.graphics().setDepth(12);
    this.obstacles = this.physics.add.staticGroup();
    this.createWorldObjects();

    this.player = this.physics.add.sprite(330, 350, "starter-atlas", "player");
    this.player.setDepth(20);
    this.player.setDisplaySize(48, 48);
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.001);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24);
    body.setOffset(20, 30);
    this.physics.add.collider(this.player, this.obstacles);

    this.slime = this.physics.add.sprite(1190, 720, "starter-atlas", "slime");
    this.slime.setDepth(20);
    this.slime.setDisplaySize(48, 48);
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
      this.player.setFlipX(vector.x < -0.05);
      this.player.setAngle(0);
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
  }

  private drawWorld(): void {
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "starter-atlas", "grass")
      .setOrigin(0, 0).setDepth(-101).setAlpha(0.9);
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
      g.fillStyle(0x5d422d, 1).fillRoundedRect(plot.x - 22, plot.y - 18, 44, 36, 4);
      g.lineStyle(2, 0x392c20, 0.55).strokeRoundedRect(plot.x - 22, plot.y - 18, 44, 36, 4);
    }
    g.fillStyle(0x5e9e9b, 1).fillEllipse(870, 935, 190, 112);
    g.lineStyle(8, 0xc9d6a1, 1).strokeEllipse(870, 935, 190, 112);

    // Original house and general store shapes.
    this.drawBuilding(g, 210, 185, 150, 115, 0xdbc28a, 0x9d5140);
    this.drawBuilding(g, 690, 205, 140, 100, 0xd7c58f, 0x526e48);
    this.drawBuilding(g, 1350, 290, 150, 110, 0xd8bf87, 0x805c38);
    g.fillStyle(0xf4e8c9, 1).fillRoundedRect(700, 215, 120, 80, 5);
    g.fillStyle(0xf4e8c9, 1).fillRoundedRect(1360, 300, 130, 90, 5);

    // Tree clusters mark the forest edge and resource areas.
    const trees = [
      [100, 150], [150, 440], [180, 570], [220, 700], [320, 820], [170, 930],
      [760, 600], [830, 660], [910, 620], [980, 570], [1150, 480], [1250, 500],
      [1360, 650], [1480, 590], [1560, 720], [1450, 850], [1300, 930], [1110, 1060],
      [970, 1130], [650, 1110], [480, 1050], [260, 1120], [1630, 420], [1730, 520]
    ];
    trees.forEach(([x, y], i) => {
      g.fillStyle(0x5d4730, 1).fillRoundedRect(x - 6, y + 12, 12, 24, 4);
      g.fillStyle(i % 3 === 0 ? 0x315f3b : 0x3e7042, 1).fillCircle(x, y, 28);
      g.fillStyle(0x6f9b51, 1).fillCircle(x - 8, y - 7, 17);
      g.fillStyle(0x8bb45c, 0.75).fillCircle(x + 7, y - 11, 9);
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

  private drawBuilding(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, wall: number, roof: number): void {
    g.fillStyle(0x4c432e, 0.25).fillEllipse(x + w / 2, y + h + 8, w + 30, 24);
    g.fillStyle(wall, 1).fillRect(x, y + 25, w, h - 25);
    g.fillStyle(roof, 1);
    g.fillTriangle(x - 14, y + 30, x + w / 2, y - 20, x + w + 14, y + 30);
    g.fillStyle(0x6c4931, 1).fillRoundedRect(x + w / 2 - 13, y + h - 42, 26, 42, 4);
    g.fillStyle(0xb4d4d0, 1).fillRect(x + 18, y + 45, 22, 20);
    g.fillRect(x + w - 40, y + 45, 22, 20);
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
    const npc = this.add.sprite(420, 345, "starter-atlas", "player")
      .setDisplaySize(40, 40).setTint(0xf4cf82).setDepth(18);
    this.add.text(420, 312, "Mira", {
      fontFamily: "monospace", fontSize: "13px", color: "#fff3c9",
      stroke: "#38432a", strokeThickness: 4
    }).setOrigin(0.5).setDepth(25);
    npc.setName("mira");
    this.add.sprite(1415, 440, "starter-atlas", "turnip").setDisplaySize(24, 24).setDepth(18);
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
    if (this.scale.width > 900 && !this.input.manager.game.device.input.touch) return;
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
    const g = this.cropGraphics;
    g.clear();
    this.save.plots.forEach((plot) => {
      if (plot.plantedAt === null) return;
      const grown = now - plot.plantedAt >= CROP_GROW_MS;
      g.fillStyle(grown ? 0x5c9d38 : 0x567d32, 1).fillRoundedRect(plot.x - 10, plot.y - 12, 20, 24, 4);
      if (grown) {
        g.fillStyle(0xe2c96f, 1).fillCircle(plot.x, plot.y - 4, 8);
        g.fillStyle(0x6b8e3c, 1).fillEllipse(plot.x - 6, plot.y - 10, 12, 5);
      } else {
        g.fillStyle(0x8ebd5b, 1).fillEllipse(plot.x, plot.y - 7, 12, 6);
      }
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
    this.slime.setTint(0xffffff);
    this.time.delayedCall(130, () => this.slime.clearTint());
    if (this.slimeHealth <= 0) {
      this.slimeAlive = false;
      this.slime.setVisible(false);
      this.slime.setActive(false);
      this.slime.setVelocity(0, 0);
      this.slimeKills += 1;
      this.save.xp += 20;
      this.save.gold += 5;
      this.save.inventory = addItem(this.save.inventory, "slime_gel", 1);
      this.slimeRespawnAt = this.time.now + 10_000;
      this.showMessage("Slime defeated! +20 Combat XP, +5 gold, +1 slime gel.");
      this.saveGame();
      this.emitHud();
    } else {
      this.showMessage(`Hit! Slime health: ${this.slimeHealth}/3.`);
    }
  }

  private updateSlime(time: number): void {
    if (!this.slimeAlive) {
      if (time >= this.slimeRespawnAt) {
        this.slimeAlive = true;
        this.slimeHealth = 3;
        this.slime.setPosition(1190, 720).setVisible(true).setActive(true).clearTint();
        this.showMessage("A green slime has returned to the forest.");
      }
      return;
    }
    const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.slime.x, this.slime.y);
    if (distance < 260 && distance > 46) {
      const direction = new Phaser.Math.Vector2(this.player.x - this.slime.x, this.player.y - this.slime.y).normalize();
      this.slime.setVelocity(direction.x * 52, direction.y * 52);
    } else {
      this.slime.setVelocity(0, 0);
    }
    if (distance < 46 && time - this.lastPlayerHit > 1500) {
      this.lastPlayerHit = time;
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
