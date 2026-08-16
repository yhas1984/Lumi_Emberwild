// ============================================================
// Ads - mock implementation. Never shows a real ad in the prototype.
// Swap for AdMob later (Capacitor plugin) behind the same interface.
// ============================================================

export type AdPlacement = "revive" | "double_rewards" | "bonus_chest";

export interface AdService {
  isAvailable(): boolean;
  watchRewardedAd(placement: AdPlacement): Promise<boolean>;
}

export class MockAdService implements AdService {
  isAvailable(): boolean {
    return true;
  }

  watchRewardedAd(_placement: AdPlacement): Promise<boolean> {
    // Simulates a short rewarded ad ("WATCH AD" button) then grants the reward.
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1200);
    });
  }
}
