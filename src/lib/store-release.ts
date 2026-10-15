// Self-update for the 0G VAULT store APK itself. The boss publishes a release in Boss Controls
// (single-row `store_release`); devices compare it with the build they are running.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { devicePackageVersion, isNativeAdb } from "@/lib/adb-bridge";
import { isNative } from "@/lib/native-install";
import type { Tables } from "@/integrations/supabase/types";

export type StoreRelease = Tables<"store_release">;

export const STORE_PACKAGE = "ogvault.store";

/**
 * versionCode of every store APK built before devices could report their own version
 * (android/app/build.gradle shipped versionCode 1). Those APKs are treated as build 1.
 */
export const LEGACY_STORE_BUILD = 1;

export const storeReleaseQuery = queryOptions({
  queryKey: ["store-release"],
  staleTime: 5 * 60_000,
  refetchInterval: 30 * 60_000,
  queryFn: async (): Promise<StoreRelease | null> => {
    const { data, error } = await supabase.from("store_release").select("*").eq("id", 1).maybeSingle();
    // Never let a missing table or network hiccup break the store; just offer no update.
    if (error) return null;
    return data;
  },
});

/**
 * Build of the store APK this device is running, or null in a web browser (the website is
 * always the latest version, so there is nothing to self-update there).
 */
export async function runningStoreBuild(): Promise<number | null> {
  if (!isNative()) return null;
  if (!isNativeAdb()) return LEGACY_STORE_BUILD;
  const v = await devicePackageVersion(STORE_PACKAGE);
  return v?.installed && v.versionCode > 0 ? v.versionCode : LEGACY_STORE_BUILD;
}

/** True when a published release is newer than the running build and has an APK to install. */
export function isStoreUpdateAvailable(release: Pick<StoreRelease, "build_number" | "apk_url"> | null | undefined, running: number | null | undefined): boolean {
  return !!release?.apk_url && running != null && release.build_number > running;
}
