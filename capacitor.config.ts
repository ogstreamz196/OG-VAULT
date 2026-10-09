import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.ogstreamz.ogvault",
  appName: "OG VAULT",
  webDir: "dist/client",
  // Point the Firestick build at the hosted store so catalog updates ship instantly.
  server: {
    url: "https://id-preview--a5726f94-a9dd-489f-bd5c-00df653e48fc.lovable.app",
    cleartext: false,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    CapacitorHttp: { enabled: true },
  },
};

export default config;
