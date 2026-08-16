import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lumi.wildrealms",
  appName: "Lumi: Wild Realms",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
