import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { catalogQuery, type AppRow } from "@/lib/catalog";
import { devicePackageVersion, isNativeAdb, isValidPackage, type PackageVersion } from "@/lib/adb-bridge";
import { installState, readLedger, type InstallState } from "@/lib/installed";

/**
 * Installed versions of every catalog app on this device, read from Android's PackageManager.
 * One shared query for the whole store; it refetches when the app regains focus, which is
 * what happens when the user comes back from the Package Installer.
 */
function useDeviceVersions(packages: string[]) {
  const [native, setNative] = useState(false);
  useEffect(() => setNative(isNativeAdb()), []);
  return useQuery({
    queryKey: ["device-versions", packages],
    enabled: native && packages.length > 0,
    staleTime: 15_000,
    refetchOnWindowFocus: "always",
    queryFn: async () => {
      const entries = await Promise.all(packages.map(async (p) => [p, await devicePackageVersion(p)] as const));
      const known = entries.filter((e): e is readonly [string, PackageVersion] => e[1] !== null);
      // An older APK without getPackageVersion answers nothing; fall back to the ledger.
      return known.length ? new Map(known) : null;
    },
  });
}

/** Returns a lookup for each app's install state: device truth on the APK, ledger in the browser. */
export function useInstallStates(): (app: Pick<AppRow, "id" | "build_number" | "package_name">) => InstallState {
  const { data } = useQuery(catalogQuery);
  const packages = Array.from(new Set((data?.apps ?? []).map((a) => a.package_name).filter((p) => p && isValidPackage(p)))).sort();
  const device = useDeviceVersions(packages);
  const [ledger, setLedger] = useState<ReturnType<typeof readLedger>>({});
  useEffect(() => setLedger(readLedger()), [data, device.data]);
  return (app) => installState(app, ledger, device.data?.get(app.package_name) ?? null);
}
