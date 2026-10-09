// Native APK download + install for the Capacitor (Android / Firestick) build.
// In a browser it falls back to a normal file download.
import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export async function downloadAndInstallApk(
  url: string,
  fileName: string,
  onProgress: (pct: number) => void,
  onStage?: (stage: "downloaded") => void,
): Promise<"installed" | "downloaded"> {
  const safeName = fileName.replace(/[^a-z0-9._-]/gi, "_") + (fileName.endsWith(".apk") ? "" : ".apk");

  if (!isNative()) {
    // Web fallback: stream with progress, then trigger browser download.
    const res = await fetch(url);
    if (!res.ok || !res.body) throw new Error(`Download failed (${res.status})`);
    const total = Number(res.headers.get("content-length")) || 0;
    const reader = res.body.getReader();
    const chunks: BlobPart[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      onProgress(total ? Math.round((got / total) * 100) : Math.min(95, Math.round(got / 1e6)));
    }
    onProgress(100);
    const blobUrl = URL.createObjectURL(new Blob(chunks, { type: "application/vnd.android.package-archive" }));
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = safeName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
    return "downloaded";
  }

  const { Filesystem, Directory } = await import("@capacitor/filesystem");
  const { FileOpener } = await import("@capacitor-community/file-opener");

  const listener = await Filesystem.addListener("progress", (p) => {
    if (p.contentLength) onProgress(Math.round((p.bytes / p.contentLength) * 100));
  });
  try {
    // Storage cleanup: clear APKs left from earlier installs before downloading a new one.
    try {
      const { files } = await Filesystem.readdir({ path: "", directory: Directory.Cache });
      await Promise.all(files.filter((f) => f.name.endsWith(".apk")).map((f) => Filesystem.deleteFile({ path: f.name, directory: Directory.Cache }).catch(() => {})));
    } catch { /* cache may be empty */ }
    const result = await Filesystem.downloadFile({
      url,
      path: safeName,
      directory: Directory.Cache,
      progress: true,
    });
    onProgress(100);
    onStage?.("downloaded");
    const path = result.path ?? (await Filesystem.getUri({ path: safeName, directory: Directory.Cache })).uri;
    // Opening an APK with this MIME type launches the Android Package Installer.
    await FileOpener.open({ filePath: path, contentType: "application/vnd.android.package-archive" });
    return "installed";
  } finally {
    await listener.remove();
  }
}
