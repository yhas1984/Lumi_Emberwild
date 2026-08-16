// ============================================================
// Native bridge stubs (Capacitor).
// These show HOW AdMob / Google Play Billing plug in later.
// The web prototype keeps using the mock services (AdService,
// PurchaseService) — nothing here requires API keys or plugins yet.
// ============================================================

// When the native plugins are installed (@capacitor/admob,
// @capacitor/purchases), replace MockAdService / MockPurchaseService
// with implementations that call Capacitor.Plugins.<name> here.
// The game code only depends on the service interfaces, so the swap
// is contained to the service constructors in GameManager.

export function isNativePlatform(): boolean {
  return typeof window !== "undefined" && "Capacitor" in window;
}

export interface NativeAdBridge {
  showRewarded(placement: string): Promise<boolean>;
}

export interface NativePurchaseBridge {
  purchase(productId: string): Promise<boolean>;
}

// Placeholder implementations: behave like the web mocks on device.
export class CapacitorAdBridge implements NativeAdBridge {
  async showRewarded(_placement: string): Promise<boolean> {
    // TODO(android): wire @capacitor/admob once the plugin and AdMob
    // credentials are available.
    return true;
  }
}

export class CapacitorPurchaseBridge implements NativePurchaseBridge {
  async purchase(_productId: string): Promise<boolean> {
    // TODO(android): wire @capacitor/purchases + Google Play Console.
    return false;
  }
}
