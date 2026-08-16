import type { ShopItemDef } from "../types";

// Simple shop catalog: fixed, transparent gem costs. No real IAP.
export const SHOP_ITEMS: ShopItemDef[] = [
  { id: "egg", name: "Mysterious Egg", emoji: "🥚", description: "Hatch a random creature instantly.", costGems: 40, kind: "egg" },
  { id: "coins1000", name: "Coin Pouch", emoji: "💰", description: "Instantly gain 1,000 coins.", costGems: 15, kind: "coins", amount: 1000 },
];
