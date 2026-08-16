// ============================================================
// Auth abstraction. Local implementation = persistent anonymous
// profile. Swap for Supabase Auth later without touching game code.
// ============================================================

export interface UserProfile {
  playerId: string;
  displayName: string;
  createdAt: number;
}

export interface AuthService {
  isAuthenticated(): boolean;
  getUser(): UserProfile | null;
  signInAnonymously(): Promise<UserProfile>;
  signOut(): Promise<void>;
}

export class LocalAuthService implements AuthService {
  private profile: UserProfile | null = null;
  private readonly key = "lumi_auth";

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        this.profile = JSON.parse(raw) as UserProfile;
      }
    } catch (err) {
      console.warn("[auth] load failed", err);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(this.profile));
    } catch (err) {
      console.warn("[auth] persist failed", err);
    }
  }

  isAuthenticated(): boolean {
    return this.profile !== null;
  }

  getUser(): UserProfile | null {
    return this.profile;
  }

  async signInAnonymously(): Promise<UserProfile> {
    if (!this.profile) {
      this.profile = {
        playerId: "plr-" + Math.random().toString(36).slice(2, 10),
        displayName: "Lumi Explorer",
        createdAt: Date.now(),
      };
      this.persist();
    }
    return this.profile;
  }

  async signOut(): Promise<void> {
    this.profile = null;
    this.persist();
  }
}
