import Phaser from "phaser";
import { GAME } from "../../data/gameConfig";
import { SHOP_ITEMS } from "../../data/shop";
import type { ShopItemDef } from "../../types";
import { GameManager } from "../../managers/GameManager";
import { onEvent, offEvent } from "../../utils/events";
import { gradientBg, softOrb } from "../ui/Panels";
import { Button } from "../ui/Button";
import { roundedRectTexture } from "../../utils/textureFactory";
import type { ChestType } from "../../types";

// Simple shop: fixed transparent gem costs; eggs hatch instantly.
export class ShopScene extends Phaser.Scene {
  private gemsText!: Phaser.GameObjects.Text;
  private boundEco: (p: { coins: number; gems: number }) => void = () => this.refresh();
  private buttons: Button[] = [];

  constructor() {
    super("Shop");
  }

  create(): void {
    // Scene instances are reused across restarts: reset accumulated state.
    this.buttons = [];
    const W = GAME.width;
    const gm = GameManager.instance;
    gradientBg(this, 0x1c2750, 0x0d1226);
    softOrb(this, 90, 240, 120, 0x5ee0f5, 0.1);
    softOrb(this, W - 90, 900, 150, 0xffd76b, 0.08);

    this.add
      .text(W / 2, 130, "SHOP", {
        fontSize: "52px",
        fontStyle: "bold",
        color: "#ffffff",
        stroke: "#101426",
        strokeThickness: 8,
      })
      .setOrigin(0.5);
    new Button(this, 62, 84, 76, 76, "←", () => {
      gm.audio.play("uiClick");
      GameManager.instance.nav.showMenu();
    }, { color: 0x2c3a5e, fontSize: 32, radius: 38 });

    roundedRectTexture(this, "shop_gems_chip", 240, 60, 30, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2, 220, "shop_gems_chip").setDepth(1);
    this.add.image(W / 2 - 80, 220, "gem").setDepth(2);
    this.gemsText = this.add
      .text(W / 2 - 44, 220, "0", { fontSize: "26px", fontStyle: "bold", color: "#5ee0f5" })
      .setOrigin(0, 0.5)
      .setDepth(2);

    SHOP_ITEMS.forEach((item, i) => this.buildItem(i, item));

    // Bonus chest: watch a (mocked) rewarded ad for a free chest.
    const bonusY = 780;
    roundedRectTexture(this, "shop_bonus", 620, 140, 24, 0x1a2342, 0x131a33, 0xffb02e);
    this.add.image(W / 2, bonusY, "shop_bonus");
    this.add.text(W / 2 - 250, bonusY - 26, "🎁", { fontSize: "48px" }).setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 180, bonusY - 30, "BONUS CHEST", { fontSize: "24px", fontStyle: "bold", color: "#ffd76b" })
      .setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 180, bonusY + 6, "Watch a rewarded ad (mock) to earn a free chest!", {
        fontSize: "15px",
        color: "#9fb0e0",
      })
      .setOrigin(0, 0.5);
    const bonusBtn = new Button(this, W / 2 + 160, bonusY + 14, 190, 66, "WATCH AD", () => this.bonusChest(bonusBtn), {
      color: 0xffb02e,
      fontSize: 19,
    });

    onEvent("economy-changed", this.boundEco);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offEvent("economy-changed", this.boundEco);
    });
    this.refresh();
  }

  private buildItem(i: number, item: ShopItemDef): void {
    const W = GAME.width;
    const y = 360 + i * 190;
    const key = "shop_item_" + item.id;
    roundedRectTexture(this, key, 620, 160, 24, 0x1a2342, 0x131a33, 0x3b4a7a);
    this.add.image(W / 2, y, key);
    this.add.text(W / 2 - 250, y - 20, item.emoji, { fontSize: "58px" }).setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 170, y - 24, item.name, { fontSize: "26px", fontStyle: "bold", color: "#ffffff" })
      .setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 170, y + 10, item.description, { fontSize: "17px", color: "#9fb0e0" })
      .setOrigin(0, 0.5);
    this.add
      .text(W / 2 - 170, y + 44, item.costGems + " 💎", { fontSize: "19px", fontStyle: "bold", color: "#5ee0f5" })
      .setOrigin(0, 0.5);
    const btn = new Button(this, W / 2 + 210, y, 170, 62, "Buy", () => this.buy(item), { color: 0x38b26a, fontSize: 22 });
    this.buttons.push(btn);
  }

  private buy(item: ShopItemDef): void {
    const gm = GameManager.instance;
    if (!gm.economy.spendGems(item.costGems)) {
      gm.audio.play("error");
      return;
    }
    gm.audio.play("chest");
    if (item.kind === "egg") {
      this.scene.launch("EggHatch", { count: 1 });
    } else if (item.kind === "coins" && item.amount) {
      gm.economy.addCoins(item.amount);
      this.cameras.main.flash(140, 255, 220, 120);
    }
    this.refresh();
  }

  private bonusChest(btn: Button): void {
    const gm = GameManager.instance;
    gm.analytics.track("rewarded_ad_requested", { placement: "bonus_chest" });
    btn.setDisabled(true);
    btn.setLabel("Watching ad...");
    gm.ads.watchRewardedAd("bonus_chest").then((ok) => {
      if (!ok || !this.scene.isActive()) {
        btn.setDisabled(false);
        btn.setLabel("WATCH AD");
        return;
      }
      const types: Array<{ type: ChestType; weight: number }> = [
        { type: "WOODEN", weight: 50 },
        { type: "SILVER", weight: 30 },
        { type: "GOLD", weight: 15 },
        { type: "MYTHIC", weight: 5 },
      ];
      const total = types.reduce((s, t) => s + t.weight, 0);
      let roll = Math.random() * total;
      let chest: ChestType = "WOODEN";
      for (const t of types) {
        roll -= t.weight;
        if (roll <= 0) {
          chest = t.type;
          break;
        }
      }
      const loot = gm.loot.rollChest(chest);
      gm.economy.addCoins(loot.coins);
      gm.economy.addGems(loot.gems);
      gm.audio.play("chest");
      this.cameras.main.flash(180, 255, 220, 120);
      this.add
        .text(GAME.width / 2, 700, "Bonus chest: +" + loot.coins + " 🪙  +" + loot.gems + " 💎", {
          fontSize: "24px",
          fontStyle: "bold",
          color: "#ffd76b",
          stroke: "#101426",
          strokeThickness: 5,
        })
        .setOrigin(0.5);
      btn.setDisabled(false);
      btn.setLabel("WATCH AD");
    });
  }

  private refresh(): void {
    const gm = GameManager.instance;
    this.gemsText.setText(String(gm.economy.gems));
    SHOP_ITEMS.forEach((item, i) => {
      this.buttons[i].setDisabled(gm.economy.gems < item.costGems);
    });
  }
}