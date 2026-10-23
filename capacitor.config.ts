import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: 'ogvault.store',
  appName: "0G VAULT - APP STORE",
  webDir: "dist/client",
  // Point the Firestick build at the hosted store so catalog updates ship instantly.
  server: {
    url: "https://vault.ogstreamz.co.uk",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
