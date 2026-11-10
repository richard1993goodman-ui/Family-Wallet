import type { CapacitorConfig } from "@capacitor/cli";

// The app is server-rendered, so the native shell loads the live site; mobile/www is only the offline fallback.
const config: CapacitorConfig = {
  appId: "io.familywallet.app",
  appName: "The Family Wallet",
  webDir: "mobile/www",
  server: { url: "https://familywallet.io", cleartext: false },
  ios: { contentInset: "never", backgroundColor: "#fbf7f0", appendUserAgent: "FamilyWalletApp" },
  android: { backgroundColor: "#fbf7f0", appendUserAgent: "FamilyWalletApp" },
  plugins: {
    SplashScreen: { backgroundColor: "#fbf7f0", launchAutoHide: true, launchShowDuration: 800 },
    StatusBar: { style: "DEFAULT", backgroundColor: "#fbf7f0" },
  },
};

export default config;
