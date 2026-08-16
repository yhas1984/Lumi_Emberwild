import { SaveManager } from "./SaveManager";
import { emitEvent } from "../utils/events";

// Single gateway for all coin/gem mutations. Components never touch
// currency directly; they call addCoins/addGems/spendCoins/spendGems.
export class EconomyManager {
  private save: SaveManager;

  private constructor(save: SaveManager) {
    this.save = save;
  }

  static create(save: SaveManager): EconomyManager {
    return new EconomyManager(save);
  }

  get coins(): number {
    return this.save.get().currency.coins;
  }

  get gems(): number {
    return this.save.get().currency.gems;
  }

  addCoins(amount: number): void {
    const value = Math.floor(amount);
    if (value <= 0) {
      return;
    }
    this.save.update((d) => {
      d.currency.coins += value;
      d.statistics.totalCoins += value;
    });
    this.emit();
  }

  addGems(amount: number): void {
    const value = Math.floor(amount);
    if (value <= 0) {
      return;
    }
    this.save.update((d) => {
      d.currency.gems += value;
    });
    this.emit();
  }

  spendCoins(amount: number): boolean {
    const value = Math.floor(amount);
    if (this.coins < value || value <= 0) {
      return false;
    }
    this.save.update((d) => {
      d.currency.coins -= value;
    });
    this.emit();
    return true;
  }

  spendGems(amount: number): boolean {
    const value = Math.floor(amount);
    if (this.gems < value || value <= 0) {
      return false;
    }
    this.save.update((d) => {
      d.currency.gems -= value;
    });
    this.emit();
    return true;
  }

  private emit(): void {
    emitEvent("economy-changed", { coins: this.coins, gems: this.gems });
  }
}
