import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { installState, recordInstall, type InstallState } from "@/lib/installed";
import { appQuery } from "@/lib/catalog";
import { canSeeApp, tierFromAudiences } from "@/lib/access";
import { useAuth } from "@/hooks/use-auth";
import { SignIn } from "@/components/tv/SignIn";
import { downloadAndInstallApk, isNative } from "@/lib/native-install";
import { logInstallEvent } from "@/lib/telemetry";
import { adbConnect, adbInstall, isConnected, isNativeAdb, launchLocalApp, openLocalAppSettings, savedHost, type PushStage } from "@/lib/adb-bridge";
import { AppIcon, TierBadge, TvShell } from "@/components/tv/TvShell";

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
  const { user, level, ready } = useAuth();
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [inst, setInst] = useState<InstallState>("none");
  const [pushing, setPushing] = useState<{ stage: PushStage; pct: number } | null>(null);
  useEffect(() => { if (app) setInst(installState(app)); }, [app]);

  const back = () => (shot ? setShot(null) : router.navigate({ to: "/" }));

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
      setInst("installed");
      setStatus(r === "installed" ? "Installer opened — confirm on screen." : "Download complete.");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Download failed";
      logInstallEvent(app.id, user?.id, downloaded ? "install_failed" : "download_failed", msg);
      setStatus(msg);
    } finally {
      setTimeout(() => setProgress(null), 800);
    }
  }

  async function sendToStick() {
    if (!app?.apk_url) return setStatus("No APK file is available for this app yet.");
    setStatus(null);
    try {
      if (!isConnected()) {
        const host = savedHost();
        if (!host) { setStatus("Connect your Firestick first in Tools."); router.navigate({ to: "/tools" }); return; }
        setStatus(`Connecting to ${host}… accept the prompt on your TV.`);
        await adbConnect(host, 5555);
      }
      setPushing({ stage: "download", pct: 0 });
      logInstallEvent(app.id, user?.id, "download_started");
      let pushed = false;
      const out = await adbInstall(app.apk_url, (stage, pct) => {
        if (stage === "push" && !pushed) { pushed = true; logInstallEvent(app.id, user?.id, "download_completed"); }
        setPushing({ stage, pct });
      });
      if (!/success/i.test(out)) throw new Error(out || "Install failed");
      logInstallEvent(app.id, user?.id, "install_prompted");
      setStatus(`Installed on your Firestick ✓`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Send failed";
      logInstallEvent(app.id, user?.id, "install_failed", msg);
      setStatus(msg);
    } finally { setPushing(null); }
  }

  if (!ready) return <div className="min-h-screen bg-background" />;
  if (!user) return <TvShell key="signin" onBack={() => {}}><SignIn /></TvShell>;
  if (isLoading) return <TvShell><p className="p-14 text-2xl text-muted-foreground">Loading…</p></TvShell>;
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
        {app.banner_url && <img src={app.banner_url} alt="" className="absolute inset-x-0 top-0 h-[460px] w-full object-cover opacity-30" />}
        <div className="absolute inset-x-0 top-0 h-[460px]" style={{ background: "linear-gradient(to bottom, transparent, var(--background))" }} />
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

              <div className="flex flex-wrap items-center gap-4 pt-2">
                {allowed ? (
                  <>
                    <button data-nav data-nav-autofocus onClick={install} disabled={progress !== null || pushing !== null} className="tv-focus rounded-xl bg-primary px-6 sm:px-10 py-4 text-lg sm:text-xl font-bold text-primary-foreground disabled:opacity-70">
                      {progress !== null ? `Downloading ${progress}%` : inst === "update" ? "Update available — Install" : inst === "installed" ? "Re-install" : isNative() ? "Download & Install" : "Download APK"}
                    </button>
                    <button data-nav onClick={sendToStick} disabled={progress !== null || pushing !== null} className="tv-focus rounded-xl border border-glow/60 px-6 py-4 text-lg font-bold text-glow disabled:opacity-70">
                      {pushing ? `${pushing.stage === "download" ? "Downloading to phone" : "Pushing to TV"} ${pushing.pct}%` : "⚡ Send to Firestick"}
                    </button>
                    {inst !== "none" && app.package_name && isNativeAdb() && (
                      <>
                        <button data-nav onClick={() => launchLocalApp(app.package_name!).catch((e) => setStatus(e.message))} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Open App</button>
                        <button data-nav onClick={() => openLocalAppSettings(app.package_name!).catch((e) => setStatus(e.message))} className="tv-focus rounded-xl bg-secondary px-6 py-4 text-lg font-semibold">Manage in Settings</button>
                      </>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="rounded-xl border border-vip/60 bg-vip/15 px-6 py-4 text-lg">VIP access required to install this app</span>
                    <Link data-nav data-nav-autofocus to="/category/$slug" params={{ slug: "og-vip-access" }} className="tv-focus rounded-xl bg-vip px-6 py-4 font-bold text-primary-foreground">Unlock VIP</Link>
                  </div>
                )}
              </div>
              {progress !== null && (
                <div className="h-3 w-full max-w-xl overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-glow transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
              {pushing && (
                <div className="h-3 w-full max-w-xl overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary transition-all" style={{ width: `${pushing.pct}%` }} />
                </div>
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

          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <section className="glass rounded-2xl p-8">
              <h2 className="text-2xl font-bold">About</h2>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{app.description || "No description yet."}</p>
            </section>
            <section className="glass rounded-2xl p-8">
              <h2 className="text-2xl font-bold">What's new</h2>
              <p className="mt-3 whitespace-pre-line text-lg leading-relaxed text-muted-foreground">{app.changelog.replace(/\\n/g, "\n") || "No changelog."}</p>
            </section>
          </div>
        </div>

        {shot && (
          <div data-nav-scope className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-10">
            <img src={shot} alt="" className="max-h-[85vh] max-w-full rounded-2xl" />
            <button data-nav data-nav-autofocus autoFocus onClick={() => setShot(null)} className="tv-focus absolute right-10 top-10 rounded-xl bg-secondary px-5 py-2.5 font-semibold">Close</button>
          </div>
        )}
      </div>
    </TvShell>
  );
}
