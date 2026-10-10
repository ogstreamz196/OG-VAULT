/**
 * Browser-side APK inspector: reads only the ZIP central directory plus
 * AndroidManifest.xml (and the launcher icon) — never loads the whole APK.
 */
export type ApkInfo = {
  packageName: string | null;
  versionName: string | null;
  versionCode: number | null;
  label: string | null;
  minSdk: number | null;
  targetSdk: number | null;
  launchActivity: string | null;
  isTvApp: boolean;
  icon: File | null;
};

type Entry = { name: string; method: number; compSize: number; size: number; localOffset: number };

async function bytes(file: Blob, start: number, end: number) {
  return new Uint8Array(await file.slice(start, end).arrayBuffer());
}

async function readEntries(file: File): Promise<Entry[]> {
  const tailLen = Math.min(file.size, 65557);
  const tail = await bytes(file, file.size - tailLen, file.size);
  const dv = new DataView(tail.buffer);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Not a valid APK (zip) file");
  const cdSize = dv.getUint32(eocd + 12, true);
  const cdOff = dv.getUint32(eocd + 16, true);
  const cd = await bytes(file, cdOff, cdOff + cdSize);
  const c = new DataView(cd.buffer);
  const out: Entry[] = [];
  const dec = new TextDecoder();
  let p = 0;
  while (p + 46 <= cd.length && c.getUint32(p, true) === 0x02014b50) {
    const nameLen = c.getUint16(p + 28, true), extra = c.getUint16(p + 30, true), comment = c.getUint16(p + 32, true);
    out.push({ name: dec.decode(cd.subarray(p + 46, p + 46 + nameLen)), method: c.getUint16(p + 10, true), compSize: c.getUint32(p + 20, true), size: c.getUint32(p + 24, true), localOffset: c.getUint32(p + 42, true) });
    p += 46 + nameLen + extra + comment;
  }
  return out;
}

async function extract(file: File, e: Entry): Promise<Uint8Array> {
  const h = await bytes(file, e.localOffset, e.localOffset + 30);
  const hv = new DataView(h.buffer);
  const start = e.localOffset + 30 + hv.getUint16(26, true) + hv.getUint16(28, true);
  const raw = file.slice(start, start + e.compSize);
  if (e.method === 0) return new Uint8Array(await raw.arrayBuffer());
  if (e.method !== 8) throw new Error("Unsupported compression in APK");
  const stream = raw.stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const ATTR = { versionCode: 0x0101021b, versionName: 0x0101021c, label: 0x01010001, icon: 0x01010002, name: 0x01010003, minSdk: 0x0101020c, targetSdk: 0x01010270 };

type Attr = { name: string; resId: number; str: string | null; num: number; type: number };
type El = { name: string; attrs: Attr[]; start: boolean };

/** Decodes Android binary XML into a flat list of start/end element events. */
export function parseAxml(buf: Uint8Array): El[] {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let strings: string[] = [];
  let resMap: number[] = [];
  const events: El[] = [];
  let p = v.getUint16(2, true); // skip file header
  while (p + 8 <= buf.length) {
    const type = v.getUint16(p, true), hsize = v.getUint16(p + 2, true), size = v.getUint32(p + 4, true);
    if (size === 0) break;
    if (type === 0x0001) strings = readPool(v, buf, p, hsize);
    else if (type === 0x0180) { resMap = []; for (let i = p + hsize; i < p + size; i += 4) resMap.push(v.getUint32(i, true)); }
    else if (type === 0x0102 || type === 0x0103) {
      const nameIdx = v.getUint32(p + 20, true);
      const el: El = { name: strings[nameIdx] ?? "", attrs: [], start: type === 0x0102 };
      if (type === 0x0102) {
        const attrStart = v.getUint16(p + 24, true), attrSize = v.getUint16(p + 26, true), count = v.getUint16(p + 28, true);
        for (let i = 0; i < count; i++) {
          const a = p + 16 + attrStart + i * attrSize;
          const n = v.getUint32(a + 4, true), raw = v.getUint32(a + 8, true), dt = v.getUint8(a + 15), data = v.getUint32(a + 16, true);
          el.attrs.push({ name: strings[n] ?? "", resId: resMap[n] ?? 0, str: dt === 0x03 ? strings[data] ?? null : raw !== 0xffffffff ? strings[raw] ?? null : null, num: data, type: dt });
        }
      }
      events.push(el);
    }
    p += size;
  }
  return events;
}

function readPool(v: DataView, buf: Uint8Array, p: number, hsize: number): string[] {
  const count = v.getUint32(p + 8, true), flags = v.getUint32(p + 16, true), strStart = v.getUint32(p + 20, true);
  const utf8 = (flags & 0x100) !== 0;
  const out: string[] = [];
  const dec8 = new TextDecoder("utf-8"), dec16 = new TextDecoder("utf-16le");
  for (let i = 0; i < count; i++) {
    let s = p + strStart + v.getUint32(p + hsize + i * 4, true);
    if (utf8) {
      s += buf[s] & 0x80 ? 2 : 1;
      let len = buf[s];
      if (len & 0x80) { len = ((len & 0x7f) << 8) | buf[s + 1]; s += 2; } else s += 1;
      out.push(dec8.decode(buf.subarray(s, s + len)));
    } else {
      let len = v.getUint16(s, true);
      if (len & 0x8000) { len = ((len & 0x7fff) << 16) | v.getUint16(s + 2, true); s += 4; } else s += 2;
      out.push(dec16.decode(buf.subarray(s, s + len * 2)));
    }
  }
  return out;
}

const attr = (el: El, key: keyof typeof ATTR) => el.attrs.find((a) => a.resId === ATTR[key] || a.name === key);
const num = (a?: Attr) => (a ? (a.type >= 0x10 && a.type <= 0x1f ? a.num : a.str && /^\d+$/.test(a.str) ? Number(a.str) : null) : null);

export function readManifest(events: El[]) {
  const info = { packageName: null as string | null, versionName: null as string | null, versionCode: null as number | null, label: null as string | null, minSdk: null as number | null, targetSdk: null as number | null, launchActivity: null as string | null, isTvApp: false };
  let current: string | null = null, hasMain = false, hasLauncher = false, depth = 0, activityDepth = -1;
  let tvActivity: string | null = null, phoneActivity: string | null = null;
  for (const el of events) {
    if (!el.start) {
      if (depth === activityDepth && current) {
        if (hasMain && hasLauncher === true) phoneActivity ??= current;
        activityDepth = -1; current = null;
      }
      depth--; continue;
    }
    depth++;
    if (el.name === "manifest") {
      info.packageName = el.attrs.find((a) => a.name === "package")?.str ?? null;
      info.versionName = attr(el, "versionName")?.str ?? null;
      info.versionCode = num(attr(el, "versionCode"));
    } else if (el.name === "uses-sdk") {
      info.minSdk = num(attr(el, "minSdk")); info.targetSdk = num(attr(el, "targetSdk"));
    } else if (el.name === "application") {
      const l = attr(el, "label"); info.label = l?.str ?? null;
    } else if (el.name === "activity" || el.name === "activity-alias") {
      current = attr(el, "name")?.str ?? null; activityDepth = depth; hasMain = false; hasLauncher = false;
    } else if (current && el.name === "action" && attr(el, "name")?.str === "android.intent.action.MAIN") hasMain = true;
    else if (current && el.name === "category") {
      const c = attr(el, "name")?.str;
      if (c === "android.intent.category.LAUNCHER") hasLauncher = true;
      if (c === "android.intent.category.LEANBACK_LAUNCHER") { info.isTvApp = true; tvActivity ??= current; }
    }
  }
  let act = tvActivity ?? phoneActivity;
  if (act && info.packageName && act.startsWith(".")) act = info.packageName + act;
  info.launchActivity = act;
  return info;
}

export async function inspectApk(file: File): Promise<ApkInfo> {
  const entries = await readEntries(file);
  const manifest = entries.find((e) => e.name === "AndroidManifest.xml");
  if (!manifest) throw new Error("AndroidManifest.xml not found in APK");
  const info = readManifest(parseAxml(await extract(file, manifest)));
  let icon: File | null = null;
  const icons = entries
    .filter((e) => /^res\/(mipmap|drawable)[^/]*\/(ic_launcher|app_icon|icon|ic_banner|banner)[^/]*\.(png|webp)$/i.test(e.name) && !/round|foreground|background/i.test(e.name))
    .sort((a, b) => b.size - a.size);
  if (icons[0]) {
    try {
      const data = await extract(file, icons[0]);
      const ext = icons[0].name.endsWith(".webp") ? "webp" : "png";
      icon = new File([data], `${info.packageName ?? "icon"}.${ext}`, { type: `image/${ext}` });
    } catch { /* icon is optional */ }
  }
  return { ...info, icon };
}
