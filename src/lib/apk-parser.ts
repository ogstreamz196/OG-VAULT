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

const ATTR = { versionCode: 0x0101021b, versionName: 0x0101021c, label: 0x01010001, icon: 0x01010002, name: 0x01010003, minSdk: 0x0101020c, targetSdk: 0x01010270, enabled: 0x0101000e };

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
      s += (buf[s] ?? 0) & 0x80 ? 2 : 1;
      let len = buf[s] ?? 0;
      if (len & 0x80) { len = ((len & 0x7f) << 8) | (buf[s + 1] ?? 0); s += 2; } else s += 1;
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
      const en = attr(el, "enabled"); current = en && en.type === 0x12 && en.num === 0 ? null : attr(el, "name")?.str ?? null; activityDepth = depth; hasMain = false; hasLauncher = false;
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

type ResVal = { type: number; value: number; density: number; str: string | null };

/** Looks up every config value of a resource id in resources.arsc. */
export function lookupRes(buf: Uint8Array, resId: number): ResVal[] {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const out: ResVal[] = [];
  let global: string[] = [];
  const pkgId = resId >>> 24, typeId = (resId >>> 16) & 0xff, idx = resId & 0xffff;
  let p = v.getUint16(2, true);
  while (p + 8 <= buf.length) {
    const t = v.getUint16(p, true), h = v.getUint16(p + 2, true), sz = v.getUint32(p + 4, true);
    if (!sz) break;
    if (t === 0x0001) global = readPool(v, buf, p, h);
    else if (t === 0x0200 && v.getUint32(p + 8, true) === pkgId) {
      let q = p + h;
      const end = p + sz;
      while (q + 8 <= end) {
        const tt = v.getUint16(q, true), th = v.getUint16(q + 2, true), ts = v.getUint32(q + 4, true);
        if (!ts) break;
        if (tt === 0x0201 && v.getUint8(q + 8) === typeId) {
          const flags = v.getUint8(q + 9), count = v.getUint32(q + 12, true), entriesStart = v.getUint32(q + 16, true);
          const density = v.getUint16(q + 20 + 14, true);
          let off = -1;
          if (flags & 1) {
            for (let i = 0; i < count; i++) { const e = q + th + i * 4; if (v.getUint16(e, true) === idx) { off = v.getUint16(e + 2, true) * 4; break; } }
          } else if (idx < count) {
            if (flags & 2) { const o = v.getUint16(q + th + idx * 2, true); off = o === 0xffff ? -1 : o * 4; }
            else { const o = v.getUint32(q + th + idx * 4, true); off = o === 0xffffffff ? -1 : o; }
          }
          if (off >= 0) {
            const e = q + entriesStart + off;
            const ef = v.getUint16(e + 2, true);
            let dt: number | null = null, data = 0;
            if (ef & 0x8) { dt = ef >> 8; data = v.getUint32(e + 4, true); }
            else if (!(ef & 1)) { dt = v.getUint8(e + 11); data = v.getUint32(e + 12, true); }
            if (dt !== null) out.push({ type: dt, value: data, density, str: dt === 0x03 ? global[data] ?? null : null });
          }
        }
        q += ts;
      }
    }
    p += sz;
  }
  return out;
}

const densRank = (d: number) => (d === 0xffff || d === 0xfffe ? -1 : d === 0 ? 1 : d);

async function resolveIcon(file: File, entries: Entry[], arsc: Uint8Array, resId: number, name: string, depth = 0): Promise<File | null> {
  if (depth > 3 || !resId) return null;
  const vals = lookupRes(arsc, resId).sort((a, b) => densRank(b.density) - densRank(a.density));
  for (const val of vals) {
    if (val.str && /\.(png|webp)$/i.test(val.str)) {
      const e = entries.find((x) => x.name === val.str);
      if (!e) continue;
      const ext = val.str.toLowerCase().endsWith(".webp") ? "webp" : "png";
      return new File([new Uint8Array(await extract(file, e))], `${name}.${ext}`, { type: `image/${ext}` });
    }
  }
  for (const val of vals) {
    if (val.type === 0x01) { const r = await resolveIcon(file, entries, arsc, val.value, name, depth + 1); if (r) return r; }
  }
  for (const val of vals) {
    if (val.str && val.str.endsWith(".xml")) {
      const e = entries.find((x) => x.name === val.str);
      if (!e) continue;
      // Adaptive icon: follow its layers, foreground first.
      const refs = parseAxml(await extract(file, e)).flatMap((el) => el.attrs.filter((a) => a.type === 0x01).map((a) => ({ a, el: el.name })));
      refs.sort((x, y) => Number(y.el === "foreground") - Number(x.el === "foreground"));
      for (const { a } of refs) { const r = await resolveIcon(file, entries, arsc, a.num, name, depth + 1); if (r) return r; }
    }
  }
  return null;
}

function iconResId(events: El[]): number {
  const app = events.find((e) => e.start && e.name === "application");
  const a = app?.attrs.find((x) => x.resId === ATTR.icon || x.name === "icon");
  return a && a.type === 0x01 ? a.num : 0;
}

export async function inspectApk(file: File): Promise<ApkInfo> {
  const entries = await readEntries(file);
  const manifest = entries.find((e) => e.name === "AndroidManifest.xml");
  if (!manifest) throw new Error("AndroidManifest.xml not found in APK");
  const events = parseAxml(await extract(file, manifest));
  const info = readManifest(events);
  const name = info.packageName ?? "icon";
  let icon: File | null = null;
  try {
    const arscEntry = entries.find((e) => e.name === "resources.arsc");
    const resId = iconResId(events);
    if (arscEntry && resId) icon = await resolveIcon(file, entries, await extract(file, arscEntry), resId, name);
  } catch { /* fall back below */ }
  if (!icon) {
    const icons = entries
      .filter((e) => /^res\/(mipmap|drawable)[^/]*\/(ic_launcher|app_icon|icon|ic_banner|banner)[^/]*\.(png|webp)$/i.test(e.name) && !/round|foreground|background/i.test(e.name))
      .sort((a, b) => b.size - a.size);
    if (icons[0]) {
      try {
        const ext = icons[0].name.endsWith(".webp") ? "webp" : "png";
        icon = new File([new Uint8Array(await extract(file, icons[0]))], `${name}.${ext}`, { type: `image/${ext}` });
      } catch { /* icon is optional */ }
    }
  }
  return { ...info, icon };
}
