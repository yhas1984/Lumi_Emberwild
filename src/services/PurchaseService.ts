// ============================================================
// IAP - mock implementation. Swap for Google Play Billing later.
// ============================================================

export interface PurchaseService {
  canPurchase(): boolean;
  purchase(productId: string): Promise<boolean>;
}

export class MockPurchaseService implements PurchaseService {
  canPurchase(): boolean {
    return false; // not available in the browser prototype
  }

  purchase(_productId: string): Promise<boolean> {
    return Promise.resolve(false);
  }
}
