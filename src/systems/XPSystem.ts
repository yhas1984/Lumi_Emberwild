import Phaser from "phaser";
import { GAME } from "../data/gameConfig";
import { GameManager } from "../managers/GameManager";
import { Player } from "../entities/Player";
import { Pickup } from "../entities/Pickup";
import { emitEvent } from "../utils/events";
import type { FloatingText } from "./FloatingText";
import type { Particles } from "./Particles";

// XP crystals and coin collection, magnet pickup and level ups.
export class XPSystem {
  onLevelUp: ((level: number, count?: number) => void) | null = null;

  private scene: Phaser.Scene;
  private player: Player;
  private pickups: Phaser.Physics.Arcade.Group;
  private floatingText: FloatingText;
  private particles: Particles;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    pickups: Phaser.Physics.Arcade.Group,
    floatingText: FloatingText,
    particles: Particles
  ) {
    this.scene = scene;
    this.player = player;
    this.pickups = pickups;
    this.floatingText = floatingText;
    this.particles = particles;
    scene.physics.add.overlap(this.player, this.pickups, (_p, puObj) => {
      this.collect(puObj as Pickup);
    });
  }

  private collect(pickup: Pickup): void {
    const gm = GameManager.instance;
    const run = gm.run;
    if (!run || !pickup.active) {
      return;
    }
    const st = this.player.stats;
    if (pickup.kind === "xp") {
      const gained = Math.round(pickup.value * st.xpGain);
      run.xp += gained;
      let gainedLevels = 0;
      while (run.xp >= GAME.xpToNext(run.level)) {
        run.xp -= GAME.xpToNext(run.level);
        run.level += 1;
        gainedLevels += 1;
      }
      emitEvent("player-xp", { level: run.level, xp: run.xp, toNext: GAME.xpToNext(run.level) });
      this.floatingText.add(pickup.x, pickup.y - 14, "+" + gained + " XP", 0x38d9ff, 18);
      this.particles.burst(pickup.x, pickup.y, 0x38d9ff, 5, 110, 0.7);
      gm.audio.play("xp");
      if (gainedLevels > 0 && this.onLevelUp) {
        this.onLevelUp(run.level, gainedLevels);
      }
    } else if (pickup.kind === "coin") {
      const amount = Math.round(pickup.value * st.coinGain);
      gm.economy.addCoins(amount);
      run.coinsEarned += amount;
      this.floatingText.add(pickup.x, pickup.y - 14, "+" + amount, 0xffd76b, 18);
      this.particles.burst(pickup.x, pickup.y, 0xffd76b, 4, 100, 0.6);
      gm.audio.play("pickup");
    }
    // collection animation then remove
    this.scene.tweens.add({
      targets: pickup,
      scale: { from: 1, to: 1.7 },
      alpha: 0,
      duration: 130,
      onComplete: () => {
        pickup.destroy();
      },
    });
  }
}