import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { ABILITIES, isAbilityMaxed } from "../../data/abilities";
import { RARITY_WEIGHTS } from "../../data/rarity";
import { GameManager } from "../../managers/GameManager";
import { weightedPick } from "../../utils/rng";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import type { AbilityDef, AbilityId } from "../../types";

export class LevelUpScene extends Phaser.Scene {
  constructor() {
    super("LevelUp");
  }

  create(): void {
    const W = GAME.width;
    const H = GAME.height;
    this.add.rectangle(W / 2, H / 2, W, H, 0x070a18, 0.74).setDepth(-1);
    const title = this.add
      .text(W / 2, 250, "LEVEL UP!", {
        fontSize: "66px",
        fontStyle: "bold",
        color: "#ffd76b",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(W / 2, 320, "Choose one power", {
        fontSize: "26px",
        color: "#c6d2ff",
      })
      .setOrigin(0.5);
    this.tweens.add({
      targets: title,
      scale: 1.06,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const offers = this.rollOffers();
    if (offers.length === 0) {
      // Every power is at max level: nothing to pick, just continue.
      this.add
        .text(W / 2, 560, "¡Todos los poderes están al máximo!", {
          fontSize: "28px",
          fontStyle: "bold",
          color: "#ffd76b",
          stroke: "#101426",
          strokeThickness: 6,
        })
        .setOrigin(0.5);
      new Button(this, W / 2, H * 0.62, 320, 88, "Continue", () => this.finish(), {
        color: 0x38b26a,
        fontSize: 26,
      });
      return;
    }
    const centers = [W / 2 - 242, W / 2, W / 2 + 242];
    offers.forEach((offer, i) => {
      const card = new Card(this, centers[i], H * 0.62, offer.def, offer.level, () => this.pick(offer.def.id));
      card.setY(H + 140);
      this.tweens.add({
        targets: card,
        y: H * 0.62,
        duration: 400,
        delay: i * 90,
        ease: "Back.easeOut",
      });
    });
  }

  private rollOffers(): Array<{ def: AbilityDef; level: number }> {
    const gm = GameManager.instance;
    const offers: Array<{ def: AbilityDef; level: number }> = [];
    const used = new Set<AbilityId>();
    // Never offer a maxed ability: fewer than 3 offers (even 0) is correct.
    const pool = Object.values(ABILITIES).filter((d) => !isAbilityMaxed(d.id, gm.abilityLevel(d.id)));
    while (offers.length < 3) {
      const candidates = pool.filter((d) => !used.has(d.id));
      if (candidates.length === 0) {
        break;
      }
      const def = weightedPick(candidates, (d) => RARITY_WEIGHTS[d.rarity]);
      used.add(def.id);
      offers.push({ def, level: gm.abilityLevel(def.id) + 1 });
    }
    return offers;
  }

  private pick(id: AbilityId): void {
    const gm = GameManager.instance;
    // Defensive: never "upgrade" a maxed ability (level stays at its cap).
    if (!isAbilityMaxed(id, gm.abilityLevel(id))) {
      gm.addAbility(id);
    }
    this.finish();
  }

  private finish(): void {
    GameManager.instance.audio.play("uiClick");
    this.scene.stop();
    this.scene.resume("Game");
  }
}
