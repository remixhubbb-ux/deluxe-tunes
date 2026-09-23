import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.deluxetunes.app",
  appName: "Deluxe Tunes",
  webDir: "dist",
  bundledWebRuntime: false,
  server: { cleartext: false },
};

export default config;
