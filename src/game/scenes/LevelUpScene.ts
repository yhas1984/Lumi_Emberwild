import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { ABILITIES, isAbilityMaxed } from "../../data/abilities";
import { RARITY_WEIGHTS } from "../../data/rarity";
import { GameManager } from "../../managers/GameManager";
import { weightedPick } from "../../utils/rng";
import { Card } from "../ui/Card";
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
    if (offers.length < 3) {
      for (const def of Object.values(ABILITIES)) {
        if (offers.length >= 3) {
          break;
        }
        if (!used.has(def.id)) {
          used.add(def.id);
          offers.push({ def, level: gm.abilityLevel(def.id) + 1 });
        }
      }
    }
    return offers;
  }

  private pick(id: AbilityId): void {
    const gm = GameManager.instance;
    gm.addAbility(id);
    gm.audio.play("uiClick");
    this.scene.stop();
    this.scene.resume("Game");
  }
}
