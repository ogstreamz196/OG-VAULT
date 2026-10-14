import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { BrandLoader } from "@/components/tv/BrandLoader";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { installState, readLedger, recordInstall, type InstallState } from "@/lib/installed";
import { appQuery } from "@/lib/catalog";
import { canDownloadApp as canSeeApp, tierFromAudiences } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { SignIn } from "@/components/tv/SignIn";
import { downloadAndInstallApk, isNative } from "@/lib/native-install";
import { logInstallEvent } from "@/lib/telemetry";
import { devicePackageVersion, isNativeAdb, launchLocalApp, openLocalAppSettings, isTvDevice, isLocallyInstalled, type PushStage } from "@/lib/adb-bridge";
import { AppIcon, TierBadge, TvShell } from "@/components/tv/TvShell";
import { VaultPassModal } from "@/components/tv/VaultPassModal";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/app/$id")({
  head: () => ({
    meta: [
      { title: "App details — 0G VAULT" },
      { name: "description", content: "App details, screenshots, changelog and install on 0G VAULT." },
      { property: "og:title", content: "App details — 0G VAULT" },
      { property: "og:description", content: "View screenshots, changelog and install this app from 0G VAULT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppDetail,
});

function AppDetail() {
  const { id } = Route.useParams();
  const router = useRouter();
  const { data: app, isLoading } = useQuery(appQuery(id));
  const { user, level, ready, isAdmin } = useAuth();
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [inst, setInst] = useState<InstallState>("none");
  const [pushing, setPushing] = useState<{ stage: PushStage; pct: number } | null>(null);
  const [onTv, setOnTv] = useState(false);
  const [passOpen, setPassOpen] = useState(false);
  const [nativeAdb, setNativeAdb] = useState(false);
  useEffect(() => { setNativeAdb(isNativeAdb()); isTvDevice().then(setOnTv); }, []);
  // Real installed version from the device; re-read when the user returns from the installer.
  const device = useQuery({
    queryKey: ["device-version", app?.package_name],
    enabled: nativeAdb && !!app?.package_name,
    staleTime: 5_000,
    refetchOnWindowFocus: "always",
    queryFn: () => devicePackageVersion(app!.package_name!),
  });
  // Older APKs can only say installed / not installed.
  const [legacyOnDevice, setLegacyOnDevice] = useState<boolean | null>(null);
  useEffect(() => {
    if (!app?.package_name || device.data !== null) return;
    isLocallyInstalled(app.package_name).then(setLegacyOnDevice);
  }, [app, device.data, progress]);
  const [ledgerTick, setLedgerTick] = useState(0);
  useEffect(() => {
    if (!app) return;
    let s = installState(app, readLedger(), device.data ?? null);
    if (!device.data && legacyOnDevice === true && s === "none") s = "installed";
    if (!device.data && legacyOnDevice === false) s = "none";
    setInst(s);
  }, [app, device.data, legacyOnDevice, ledgerTick]);
  const onDevice = device.data ? device.data.installed : legacyOnDevice;

  const back = () => {
    if (passOpen) return setPassOpen(false);
    if (shot) return setShot(null);
    if (router.history.canGoBack()) router.history.back();
    else router.navigate({ to: "/" });
  };

  async function install() {
    if (!app?.apk_url) return setStatus("No APK file is available for this app yet.");
    setStatus(null);
    setProgress(0);
    let downloaded = false;
    logInstallEvent(app.id, user?.id, "download_started");
    try {
      const r = await downloadAndInstallApk(app.apk_url, `${app.package_name || app.title}-${app.version}`, setProgress, () => {
        downloaded = true;
        logInstallEvent(app.id, user?.id, "download_completed");
      });
      if (r === "installed") logInstallEvent(app.id, user?.id, "install_prompted");
      else if (!downloaded) logInstallEvent(app.id, user?.id, "download_completed");
      recordInstall(app);
      setLedgerTick((t) => t + 1);
      void device.refetch();
      setStatus(r === "installed" ? "Installer opened — confirm on screen." : "Download complete.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Download failed";
      logInstallEvent(app.id, user?.id, downloaded ? "install_failed" : "download_failed", msg);
      setStatus(msg);
    } finally {
      setTimeout(() => setProgress(null), 800);
    }
  }

  if (!ready) return <BrandLoader />;
  if (!user) return <TvShell key="signin" onBack={() => false}><SignIn /></TvShell>;
  if (isLoading)
    return (
      <TvShell>
        <div className="flex flex-col gap-6 px-4 pt-24 sm:flex-row sm:px-14">
          <div className="skeleton h-28 w-28 rounded-3xl sm:h-48 sm:w-48" />
          <div className="flex-1 space-y-4"><div className="skeleton h-10 w-2/3 rounded" /><div className="skeleton h-5 w-1/2 rounded" /><div className="skeleton h-14 w-60 rounded-xl" /></div>
        </div>
      </TvShell>
    );
  if (!app)
    return (
      <TvShell>
        <div className="p-14 space-y-6">
          <p className="text-2xl">This app isn't available.</p>
          <Link data-nav to="/" className="tv-focus inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Back to store</Link>
        </div>
      </TvShell>
    );

  const allowed = canSeeApp(level, app.audiences);
  const cat = (app as { categories?: { name: string } | null }).categories?.name;

  return (
    <TvShell onBack={back}>
      <div className="relative min-h-screen">
        {app.banner_url && <img src={app.banner_url} alt="" className="absolute inset-x-0 top-0 h-[28.75rem] w-full object-cover opacity-30" />}
        <div className="absolute inset-x-0 top-0 h-[28.75rem]" style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
        <div className="relative px-4 sm:px-14 pt-10 pb-20">
          <button data-nav onClick={back} className="tv-focus rounded-xl bg-secondary px-5 py-2.5 font-semibold">‹ Back</button>

          <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:gap-10">
            <AppIcon title={app.title} url={app.icon_url} className="h-28 w-28 sm:h-48 sm:w-48 shrink-0 rounded-3xl text-6xl shadow-2xl" />
            <div className="flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <TierBadge tier={tierFromAudiences(app.audiences)} />
                {cat && <span className="text-sm uppercase tracking-widest text-muted-foreground">{cat}</span>}
              </div>
              <h1 className="text-4xl sm:text-6xl font-extrabold">{app.title}</h1>
              <p className="text-lg text-muted-foreground">
                Version {app.version} · Build {app.build_number}{app.file_size ? ` · ${app.file_size}` : ""}{app.package_name ? ` · ${app.package_name}` : ""}
              </p>
              {device.data?.installed && (
                <p className={`text-base font-semibold ${inst === "update" ? "text-glow" : "text-muted-foreground"}`}>
                  {inst === "update" ? "UPDATE AVAILABLE · " : ""}On this device: v{device.data.versionName || "?"} (build {device.data.versionCode})
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-2">
                {isAdmin && !isNative() && (
                  <Link data-nav to="/admin" search={{ edit: app.id }} className="tv-focus order-last rounded-xl border border-border bg-secondary px-6 py-4 text-lg font-semibold">✏️ Edit app</Link>
                )}
                {allowed ? (
                  <>
                    <button data-nav data-nav-autofocus onClick={install} disabled={progress !== null || pushing !== null} className={`tv-focus rounded-xl bg-primary px-6 sm:px-10 py-4 text-lg sm:text-xl font-bold text-primary-foreground disabled:opacity-70 ${inst === "update" && progress === null ? "update-glow" : ""}`}>
                      {progress !== null ? `Downloading ${progress}%` : inst === "update" ? `Update to v${app.version}` : inst === "installed" ? "Re-install" : isNative() ? "Download & Install" : "Download APK"}
                    </button>
                    {(onDevice ?? inst !== "none") && app.package_name && nativeAdb && (
                      <>
                        {inst !== "update" && <button data-nav onClick={() => launchLocalApp(app.package_name!).catch((e) => setStatus(e.message))} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Open App</button>}
                        <button data-nav onClick={() => openLocalAppSettings(app.package_name!).catch((e) => setStatus(e.message))} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Manage in Settings</button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-4">
                      <button data-nav onClick={() => setPassOpen(true)} className="tv-focus flex items-center gap-2 rounded-xl border border-vip/60 bg-vip/15 px-6 py-4 text-lg font-bold"><Lock className="h-5 w-5" />Vault Pass required</button>
                      <button data-nav data-nav-autofocus onClick={() => setPassOpen(true)} className="tv-focus rounded-xl bg-vip px-6 py-4 font-bold text-primary-foreground">Get Vault Pass</button>
                    </div>
                    <p className="text-muted-foreground">Visit <span className="font-bold text-foreground">ogbot.co.uk</span> and buy the Vault Pass from the store to unlock VIP apps.</p>
                  </div>
                )}
              </div>
              {(progress !== null || pushing) && (
                <InstallHud
                  pct={progress ?? pushing!.pct}
                  stages={pushing ? ["Downloading APK", "Streaming to Firestick", "Launching installer"] : ["Downloading APK", "Launching installer"]}
                  active={pushing ? (pushing.stage === "download" ? 0 : pushing.pct >= 100 ? 2 : 1) : progress! >= 100 ? 1 : 0}
                />
              )}
              {status && <p className="text-lg text-glow">{status}</p>}
            </div>
          </div>

          {app.screenshots.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold">Screenshots</h2>
              <div className="no-scrollbar mt-4 flex gap-6 overflow-x-auto py-4">
                {app.screenshots.map((s, i) => (
                  <button key={s + i} data-nav onClick={() => setShot(s)} className="tv-focus shrink-0 overflow-hidden rounded-2xl glass">
                    <img src={s} alt={`${app.title} screenshot ${i + 1}`} className="h-56 w-auto object-cover" />
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="glass mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl sm:grid-cols-4">
            {[
              ["Version", app.version],
              ["Build", String(app.build_number)],
              ["Size", app.file_size || "—"],
              ["Package", app.package_name || "—"],
            ].map(([k, v]) => (
              <div key={k} className="min-w-0 bg-card/60 p-4 sm:p-6">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">{k}</div>
                <div className="mt-1 truncate text-base font-bold sm:text-lg" title={v}>{v}</div>
              </div>
            ))}
          </section>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section className="glass rounded-2xl p-5 sm:p-8">
              <h2 className="text-2xl font-bold">About</h2>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{app.description || "No description yet."}</p>
            </section>
            <section className="glass rounded-2xl p-5 sm:p-8">
              <h2 className="text-2xl font-bold">What's new</h2>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{app.changelog.replace(/\\n/g, "\n") || "No changelog."}</p>
            </section>
          </div>
        </div>

        {shot && (
          <div data-nav-scope className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-10">
            <img src={shot} alt="" className="max-h-[85vh] max-w-full rounded-2xl" />
            <button data-nav data-nav-autofocus data-nav-dismiss autoFocus onClick={() => setShot(null)} className="tv-focus absolute right-10 top-10 rounded-xl bg-secondary px-5 py-2.5 font-semibold">Close</button>
          </div>
        )}
        <VaultPassModal open={passOpen} onClose={() => setPassOpen(false)} />
      </div>
    </TvShell>
  );
}

function InstallHud({ pct, stages, active }: { pct: number; stages: string[]; active: number }) {
  const r = 26, c = 2 * Math.PI * r;
  return (
    <div className="glass flex w-full max-w-xl items-center gap-5 rounded-2xl p-4">
      <svg viewBox="0 0 64 64" className="h-16 w-16 shrink-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--muted)" strokeWidth="6" />
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--glow)" strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .3s", filter: "drop-shadow(0 0 6px var(--glow))" }} />
        <text x="32" y="36" textAnchor="middle" className="rotate-90 fill-foreground text-[13px] font-bold" style={{ transformOrigin: "32px 32px" }}>{pct}%</text>
      </svg>
      <ol className="min-w-0 flex-1 space-y-1.5">
        {stages.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 text-sm font-semibold ${i < active ? "text-muted-foreground line-through" : i === active ? "text-glow" : "text-muted-foreground/60"}`}>
            <span className={`h-2 w-2 shrink-0 rounded-full ${i <= active ? "bg-glow" : "bg-muted"} ${i === active ? "animate-pulse" : ""}`} />{s}
          </li>
        ))}
      </ol>
    </div>
  );
}
