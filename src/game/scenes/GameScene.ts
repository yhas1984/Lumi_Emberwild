import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { GameManager } from "../../managers/GameManager";
import { Player } from "../../entities/Player";
import { Projectile } from "../../entities/Projectile";
import { Pickup } from "../../entities/Pickup";
import { Chest } from "../../entities/Chest";
import type { Enemy } from "../../enemies/Enemy";
import { Slime } from "../../enemies/Slime";
import { AncientGolem } from "../../bosses/AncientGolem";
import { CombatSystem } from "../../systems/CombatSystem";
import { XPSystem } from "../../systems/XPSystem";
import { WaveSpawner } from "../../systems/WaveSpawner";
import { FloatingText } from "../../systems/FloatingText";
import { Particles } from "../../systems/Particles";
import { ChainLightning } from "../../abilities/ChainLightning";
import { shakeCamera } from "../../utils/screenFx";
import { createAbility } from "../../abilities";
import type { AbilityBase } from "../../abilities/AbilityBase";
import type { AbilityContext } from "../../abilities/types";
import { Hud } from "../ui/Hud";
import { Button } from "../ui/Button";
import { Joystick } from "../ui/Joystick";
import { emitEvent, onEvent, offEvent } from "../../utils/events";
import { randInt } from "../../utils/rng";
import { clamp } from "../../utils/math";
import type { AbilityId, ChestLootResult, ChestType } from "../../types";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private debugHooked = false;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerProjectiles!: Phaser.Physics.Arcade.Group;
  private pickups!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private combat!: CombatSystem;
  private xp!: XPSystem;
  private waves!: WaveSpawner;
  private floatingText!: FloatingText;
  private particles!: Particles;
  private hud!: Hud;
  private joystick!: Joystick;
  private golem: AncientGolem | null = null;
  private ctx!: AbilityContext;
  private abilityInstances = new Map<AbilityId, AbilityBase>();
  private pendingLevelUps = 0;
  private paused = false;
  private ended = false;
  private bossSpawned = false;
  private onboarding = false;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private onReviveResult: (p: { accepted: boolean }) => void = () => {};
  private onDebugLevelUp: () => void = () => {};
  private onDebugSpawnBoss: () => void = () => {};
  private onDebugSpawnChest: () => void = () => {};

  constructor() {
    super("Game");
  }

  create(): void {
    // Scene instances are reused across restarts: reset accumulated state.
    this.abilityInstances = new Map<AbilityId, AbilityBase>();
    this.pendingLevelUps = 0;
    this.paused = false;
    this.ended = false;
    this.bossSpawned = false;
    this.onboarding = false;
    this.golem = null;
    const gm = GameManager.instance;
    gm.startRun();

    this.physics.world.setBounds(0, 0, GAME.worldWidth, GAME.worldHeight);
    this.cameras.main.setBounds(0, 0, GAME.worldWidth, GAME.worldHeight);
    this.cameras.main.setBackgroundColor("#131b33");

    this.add.tileSprite(0, 0, GAME.worldWidth, GAME.worldHeight, "ground_tile").setOrigin(0).setDepth(-5);
    const border = this.add.graphics();
    border.lineStyle(6, 0x2c3a5e, 1);
    border.strokeRect(24, 24, GAME.worldWidth - 48, GAME.worldHeight - 48);
    border.setDepth(-4);

    this.player = new Player(this, GAME.worldWidth / 2, GAME.worldHeight / 2);
    if (!this.debugHooked) {
      this.debugHooked = true;
      GameManager.instance.debug.player = this.player;
    }
    this.player.setName("player");
    this.player.onDeath = () => this.playerDied();
    this.tweens.add({
      targets: this.player,
      scale: 1.07,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.enemies = this.physics.add.group();
    this.playerProjectiles = this.physics.add.group();
    this.pickups = this.physics.add.group();
    this.enemyProjectiles = this.physics.add.group();

    // Ranged enemies fire projectiles at the player.
    this.physics.add.overlap(this.player, this.enemyProjectiles, (_p, projObj) => {
      const proj = projObj as Projectile;
      if (this.player.stats.health > 0) {
        this.player.takeDamage(proj.damage, proj.x, proj.y);
      }
      this.particles.burst(proj.x, proj.y, 0xb14dff, 4, 120);
      proj.destroy();
    });

    this.floatingText = new FloatingText(this);
    this.particles = new Particles(this);

    this.ctx = this.buildCtx();

    this.combat = new CombatSystem(this, this.player, this.enemies, this.playerProjectiles);
    this.combat.attachContext(this.ctx);
    this.combat.setupCollisions();
    this.combat.onEnemyKilled = (e) => this.handleEnemyKilled(e);

    this.xp = new XPSystem(this, this.player, this.pickups, this.floatingText, this.particles);
    this.xp.onLevelUp = (level) => this.onLevelUp(level);

    this.waves = new WaveSpawner(this, this.enemies, this.player);
    this.waves.onEnemySpawned = (e) => {
      this.combat.registerEnemy(e);
      if (e.def.behavior === "ranged") {
        e.onFireProjectile = (x, y, angle) => {
          const proj = new Projectile(this, x, y, "proj_enemy", angle, 220, e.damage, false);
          this.enemyProjectiles.add(proj);
        };
      }
    };
    this.waves.start();

    // First-run onboarding overlay (persisted per browser).
    if (!localStorage.getItem("lumi_onboarded")) {
      this.onboarding = true;
      const W = GAME.width;
      const H = GAME.height;
      const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x070a18, 0.82).setScrollFactor(0).setDepth(150);
      this.add.rectangle(W / 2, H / 2, 620, 520, 0x1a2342, 1).setScrollFactor(0).setDepth(151);
      this.add
        .text(W / 2, H / 2 - 170, "¡Bienvenida, Lumi!", {
          fontSize: "40px",
          fontStyle: "bold",
          color: "#ffd76b",
          stroke: "#101426",
          strokeThickness: 6,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(152);
      this.add
        .text(W / 2, H / 2 - 60, "Muévete con WASD / flechas (joystick en móvil).\n¡Tu ataque es automático!\n\nSobrevive 5 minutos, recoge XP,\nelige mejoras y derrota al Ancient Golem.", {
          fontSize: "24px",
          color: "#e8ecff",
          align: "center",
          lineSpacing: 10,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(152);
      const go = new Button(this, W / 2, H / 2 + 165, 280, 84, "¡Vamos!", () => {
        localStorage.setItem("lumi_onboarded", "1");
        this.onboarding = false;
        dim.destroy();
      }, { color: 0xff7a3d, fontSize: 30 });
      go.setScrollFactor(0).setDepth(153);
    }

    this.physics.add.overlap(this.player, this.enemies, (p, e) => {
      this.onPlayerHitEnemy(p as Player, e as Enemy);
    });

    this.hud = new Hud(this);
    this.hud.onPause = () => this.openPause();
    this.joystick = new Joystick(this, 150, 1120);

    this.keys = this.input.keyboard!.addKeys("W,A,S,D,UP,LEFT,DOWN,RIGHT") as Record<
      string,
      Phaser.Input.Keyboard.Key
    >;
    this.input.keyboard!.on("keydown-P", () => this.openPause());
    this.input.keyboard!.on("keydown-ESC", () => this.openPause());

    // Fixed HUD tap zone (screen-space): Phaser's hit test for scrollFactor-0
    // objects is misaligned when the camera follows the player, so the pause
    // button is handled by coordinates instead of an object hit test.
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (p.x > GAME.width - 100 && p.y < 100 && !this.paused && this.pendingLevelUps === 0 && !this.ended) {
        this.hud.flashPauseButton();
        this.openPause();
      }
    });

    this.game.events.on(Phaser.Core.Events.HIDDEN, this.onHidden, this);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResumed, this);
    this.onReviveResult = (p: { accepted: boolean }) => {
      if (p.accepted) {
        this.revivePlayer();
      } else {
        this.defeat();
      }
    };
    this.onDebugLevelUp = () => {
      if (!this.paused && !this.ended && gm.run) {
        this.onLevelUp(gm.run.level + 1);
      }
    };
    this.onDebugSpawnBoss = () => {
      if (!this.ended && !this.bossSpawned) {
        this.spawnBoss();
      }
    };
    this.onDebugSpawnChest = () => {
      if (!this.ended) {
        const types: ChestType[] = ["WOODEN", "SILVER", "GOLD", "MYTHIC"];
        const t = types[Math.floor(Math.random() * types.length)];
        this.spawnChest(this.player.x + randInt(-60, 60), this.player.y + randInt(-60, 60), t);
      }
    };
    onEvent("revive-result", this.onReviveResult);
    onEvent("debug-level-up", this.onDebugLevelUp);
    onEvent("debug-spawn-boss", this.onDebugSpawnBoss);
    onEvent("debug-spawn-chest", this.onDebugSpawnChest);
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResumed, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.onHidden, this);
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResumed, this);
      offEvent("revive-result", this.onReviveResult);
      offEvent("debug-level-up", this.onDebugLevelUp);
      offEvent("debug-spawn-boss", this.onDebugSpawnBoss);
      offEvent("debug-spawn-chest", this.onDebugSpawnChest);
    });

    this.syncAbilities();
  }

  update(time: number, delta: number): void {
    if (this.ended || this.paused || this.onboarding) {
      return;
    }
    const gm = GameManager.instance;
    if (!gm.run) {
      return;
    }
    gm.run.time += delta / 1000;
    const seconds = gm.run.time;
    this.hud.setTimer(GAME.runDuration - seconds);
    const minute = Math.floor(seconds / 60);

    let ax = 0;
    let ay = 0;
    const k = this.keys;
    if (k.A.isDown || k.LEFT.isDown) {
      ax -= 1;
    }
    if (k.D.isDown || k.RIGHT.isDown) {
      ax += 1;
    }
    if (k.W.isDown || k.UP.isDown) {
      ay -= 1;
    }
    if (k.S.isDown || k.DOWN.isDown) {
      ay += 1;
    }
    const joy = this.joystick.getVector();
    this.player.move(ax + joy.x, ay + joy.y);

    this.combat.update(time, delta);
    this.waves.update(time, minute);

    for (const child of this.enemies.getChildren()) {
      const e = child as Enemy;
      if (e.active) {
        e.update(time, delta, this.player.x, this.player.y);
      }
    }
    for (const child of this.playerProjectiles.getChildren()) {
      const p = child as Projectile;
      if (p.active) {
        p.update(time, delta);
      }
    }
    for (const child of this.pickups.getChildren()) {
      const p = child as Pickup;
      if (p.active) {
        p.update(time, delta, this.player.x, this.player.y, this.player.stats.magnet);
      }
    }
    for (const child of this.enemyProjectiles.getChildren()) {
      const p = child as Projectile;
      if (p.active) {
        p.update(time, delta);
      }
    }
    this.player.update(time, delta);

    this.ctx.time = time;
    this.ctx.delta = delta;
    for (const inst of this.abilityInstances.values()) {
      inst.update(this.ctx);
    }

    if (!this.bossSpawned && seconds >= GAME.bossAt) {
      this.spawnBoss();
    }
    if (this.golem && this.golem.active) {
      this.golem.update(time, delta, this.player.x, this.player.y);
    }
  }

  private buildCtx(): AbilityContext {
    return {
      scene: this,
      player: this.player,
      enemies: this.enemies,
      playerProjectiles: this.playerProjectiles,
      time: 0,
      delta: 0,
      damageEnemy: (enemy, amount, source) => this.combat.damageEnemy(enemy, amount, source),
      floatText: (x, y, text, color, size) => this.floatingText.add(x, y, text, color, size),
      burst: (x, y, color, count, speed, size) => this.particles.burst(x, y, color, count ?? 8, speed ?? 170, size ?? 1),
    };
  }

  private syncAbilities(): void {
    const run = GameManager.instance.run;
    if (!run) {
      return;
    }
    for (const [id, level] of run.abilities) {
      let inst = this.abilityInstances.get(id);
      if (!inst) {
        const created = createAbility(id, level);
        if (created) {
          inst = created;
          this.abilityInstances.set(id, created);
          created.onAcquired?.(this.ctx);
        }
      }
      if (inst) {
        inst.level = level;
      }
    }
    const chain = this.abilityInstances.get("chainLightning");
    this.combat.chainLightning = (chain as ChainLightning | undefined) ?? null;
    this.player.recomputeStats();
  }

  // ---- Level up flow ----
  private onLevelUp(level: number, count = 1): void {
    const gm = GameManager.instance;
    if ("vibrate" in navigator) {
      navigator.vibrate(60);
    }
    this.pendingLevelUps += count;
    gm.analytics.track("level_up", { level });
    this.floatingText.add(this.player.x, this.player.y - 60, "LEVEL UP!", 0xffd76b, 34);
    gm.audio.play("levelUp");
    this.particles.burst(this.player.x, this.player.y, 0xffd76b, 18, 260);
    this.openLevelUp();
  }

  private openLevelUp(): void {
    if (this.paused || this.ended || this.pendingLevelUps <= 0) {
      return;
    }
    this.pendingLevelUps--;
    this.paused = true;
    this.scene.pause();
    this.scene.launch("LevelUp");
  }

  private onResumed(): void {
    this.paused = false;
    this.syncAbilities();
    if (this.pendingLevelUps > 0) {
      this.openLevelUp();
    }
  }

  // ---- Pause ----
  private openPause(): void {
    if (this.ended || this.paused || this.pendingLevelUps > 0) {
      return;
    }
    this.paused = true;
    this.scene.pause();
    this.scene.launch("Pause");
  }

  private onHidden(): void {
    if (!this.ended && !this.paused && this.pendingLevelUps === 0) {
      this.openPause();
    }
  }

  // ---- Boss ----
  private spawnBoss(): void {
    const gm = GameManager.instance;
    this.bossSpawned = true;
    this.waves.stop();
    gm.audio.play("boss");
    gm.analytics.track("boss_started");
    const W = GAME.width;
    const text = this.add
      .text(W / 2, 320, "⚠ BOSS INCOMING ⚠", {
        fontSize: "46px",
        fontStyle: "bold",
        color: "#ff5f7a",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(120);
    text.setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 240,
      yoyo: true,
      repeat: 5,
      onComplete: () => text.destroy(),
    });
    this.time.delayedCall(3200, () => {
      if (this.ended) {
        return;
      }
      const x = clamp(this.player.x, 240, GAME.worldWidth - 240);
      const y = clamp(this.player.y - 430, 260, GAME.worldHeight - 260);
      this.golem = new AncientGolem(this, x, y);
      GameManager.instance.debug.golem = this.golem;
      this.golem.onDefeated = () => this.bossDefeated();
      this.golem.onPlayerDamage = (dmg) => this.player.takeDamage(dmg, this.golem!.x, this.golem!.y);
      this.golem.onSummonMinions = (x, y) => {
        for (let i = 0; i < 3; i++) {
          const ex = clamp(x + randInt(-40, 40), 60, GAME.worldWidth - 60);
          const ey = clamp(y + randInt(-40, 40), 60, GAME.worldHeight - 60);
          const minion = new Slime(this, ex, ey, Math.floor(gm.run?.time ?? 0) / 60, false);
          this.enemies.add(minion);
          this.combat.registerEnemy(minion);
        }
      };
      this.physics.add.overlap(this.player, this.golem, () => {
        if (this.player.stats.health > 0) {
          this.player.takeDamage(this.golem!.damage, this.golem!.x, this.golem!.y);
        }
      });
      this.physics.add.overlap(this.playerProjectiles, this.golem, (projObj) => {
        const proj = projObj as Projectile;
        this.golem!.takeDamage(proj.damage);
        this.particles.burst(proj.x, proj.y, 0xffb02e, 4, 130, 0.8);
        proj.destroy();
      });
      this.physics.add.overlap(this.player, this.golem.projectiles, (_p, projObj) => {
        const proj = projObj as Projectile;
        if (this.player.stats.health > 0) {
          this.player.takeDamage(proj.damage, proj.x, proj.y);
        }
        this.particles.burst(proj.x, proj.y, 0xb14dff, 5, 130);
        proj.destroy();
      });
    });
  }

  private bossDefeated(): void {
    if (this.ended || !this.golem) {
      return;
    }
    const gm = GameManager.instance;
    gm.save.update((d) => {
      d.statistics.totalBosses += 1;
    });
    gm.analytics.track("boss_defeated");
    gm.audio.play("bossDie");
    const g = this.golem;
    this.particles.burst(g.x, g.y, 0xff6b35, 34, 320);
    this.particles.burst(g.x, g.y, 0xffd76b, 20, 240);
    this.cameras.main.flash(300, 255, 230, 150);
    shakeCamera(this, 320, 0.015);
    const chestType: ChestType = Math.random() < GAME.chests.bossChestMythicChance ? "MYTHIC" : GAME.chests.bossChest;
    const chest = this.spawnChest(g.x, g.y, chestType);
    if (Math.random() < GAME.eggs.bossEggChance) {
      gm.addEgg();
      this.floatingText.add(g.x, g.y - 80, "🥚 Mysterious Egg dropped!", 0xb88fd8, 26);
      this.particles.burst(g.x, g.y - 40, 0xb88fd8, 12, 200);
    }
    this.time.delayedCall(700, () => {
      if (!chest.opened) {
        chest.open();
      }
    });
    this.tweens.add({
      targets: g,
      scale: 0.1,
      alpha: 0,
      duration: 450,
      ease: "Back.easeIn",
      onComplete: () => {
        g.destroy();
        this.golem = null;
        GameManager.instance.debug.golem = null;
      },
    });
    this.time.delayedCall(2400, () => this.victory());
  }

  // ---- Run end ----
  private victory(): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const gm = GameManager.instance;
    const result = gm.endRun(true, gm.run?.time ?? 0);
    gm.audio.play("victory");
    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.time.delayedCall(650, () => {
      this.scene.stop();
      this.scene.start("Victory", { result });
    });
  }

  private playerDied(): void {
    const gm = GameManager.instance;
    if (!gm.run || gm.run.reviveUsed || this.ended) {
      this.defeat();
      return;
    }
    this.paused = true;
    this.scene.pause();
    this.scene.launch("Revive");
  }

  private revivePlayer(): void {
    if (this.ended) {
      return;
    }
    const gm = GameManager.instance;
    if (gm.run) {
      gm.run.reviveUsed = true;
    }
    this.player.revive();
    this.player.grantInvulnerability(2000);
    this.particles.burst(this.player.x, this.player.y, 0x69db7c, 20, 260);
    this.cameras.main.flash(200, 120, 255, 150);
    gm.audio.play("victory");
  }

  private defeat(): void {
    if (this.ended) {
      return;
    }
    this.ended = true;
    const gm = GameManager.instance;
    const result = gm.endRun(false, gm.run?.time ?? 0);
    gm.audio.play("defeat");
    this.particles.burst(this.player.x, this.player.y, 0xff5f7a, 26, 240);
    shakeCamera(this, 300, 0.01);
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(750, () => {
      this.scene.stop();
      this.scene.start("Defeat", { result });
    });
  }

  // ---- Combat events ----
  private onPlayerHitEnemy(_player: Player, enemy: Enemy): void {
    this.player.takeDamage(enemy.damage, enemy.x, enemy.y);
    GameManager.instance.audio.play("hurt");
    shakeCamera(this, 70, 0.005);
    if ("vibrate" in navigator) {
      navigator.vibrate(30);
    }
  }

  private handleEnemyKilled(enemy: Enemy): void {
    const gm = GameManager.instance;
    gm.save.update((d) => {
      d.statistics.totalKills += 1;
    });
    const coinAmt = randInt(enemy.def.coins[0], enemy.def.coins[1]) * (enemy.elite ? 3 : 1);
    this.spawnPickup(enemy.x, enemy.y, "coin", coinAmt);
    this.spawnPickup(enemy.x + randInt(-14, 14), enemy.y + randInt(-14, 14), "xp", enemy.xpReward);
    if (enemy.elite && Math.random() < GAME.chests.eliteChestChance) {
      this.spawnChest(enemy.x, enemy.y, "WOODEN");
    }
    emitEvent("enemy-killed", { enemyId: enemy.def.id, elite: enemy.elite, x: enemy.x, y: enemy.y });
    gm.audio.play("enemyDie");
    this.particles.burst(enemy.x, enemy.y, enemy.def.color, enemy.elite ? 16 : 8, enemy.elite ? 240 : 160);
    const body = enemy.body as Phaser.Physics.Arcade.Body;
    body.enable = false;
    this.tweens.add({
      targets: enemy,
      scale: 0.05,
      alpha: 0,
      angle: enemy.angle + 100,
      duration: 230,
      ease: "Back.easeIn",
      onComplete: () => enemy.destroy(),
    });
  }

  private spawnPickup(x: number, y: number, kind: "xp" | "coin", value: number): void {
    const pickup = new Pickup(this, x, y, kind, value);
    this.pickups.add(pickup);
    pickup.setScale(0);
    this.tweens.add({ targets: pickup, scale: 1, duration: 160, ease: "Back.easeOut" });
  }

  private spawnChest(x: number, y: number, chestType: ChestType): Chest {
    const chest = new Chest(this, x, y, chestType);
    chest.onOpened = (loot) => this.applyChestLoot(chest, loot);
    this.physics.add.overlap(this.player, chest, () => {
      if (!chest.opened) {
        chest.open();
      }
    });
    return chest;
  }

  private applyChestLoot(chest: Chest, loot: ChestLootResult): void {
    const gm = GameManager.instance;
    gm.economy.addCoins(loot.coins);
    gm.economy.addGems(loot.gems);
    gm.save.update((d) => {
      d.statistics.totalChests += 1;
    });
    gm.analytics.track("chest_opened", { chest: chest.chestType, coins: loot.coins, gems: loot.gems });
    emitEvent("chest-opened", { chest: chest.chestType });
    gm.audio.play("chest");
    if (loot.coins > 0) {
      this.floatingText.add(chest.x, chest.y - 40, "+" + loot.coins + " coins", 0xffd76b, 26);
    }
    if (loot.gems > 0) {
      this.floatingText.add(chest.x, chest.y - 70, "+" + loot.gems + " gems", 0x5ee0f5, 24);
    }
    if (loot.egg) {
      gm.addEgg();
      this.floatingText.add(chest.x, chest.y - 100, "🥚 Mysterious Egg!", 0xb88fd8, 24);
      this.particles.burst(chest.x, chest.y, 0xb88fd8, 18, 220);
    }
    this.particles.burst(chest.x, chest.y, 0xffd76b, 16, 240);
  }
}