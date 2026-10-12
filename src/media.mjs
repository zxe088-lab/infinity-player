export const LIMIT = 30000;
export function httpsUrl(value, allowHTTP = false) {
  let url;
  try { url = new URL(String(value).trim()); } catch { throw new Error('أدخل رابطًا صحيحًا يبدأ بـ https://'); }
  if ((url.protocol !== 'https:' && !(allowHTTP && url.protocol === 'http:')) || !url.hostname || url.username || url.password) throw new Error('نقبل روابط HTTPS الآمنة فقط، بدون بيانات دخول داخل عنوان الخادم.');
  return url;
}
export function validMediaUrl(value, allowHTTP = false) {
  try { return httpsUrl(value, allowHTTP).href; } catch { return null; }
}
export function normalizeServer(value, allowHTTP = false) {
  const u = httpsUrl(value, allowHTTP);
  u.search = ''; u.hash = '';
  u.pathname = u.pathname.replace(/\/(player_api\.php|get\.php)\/?$/, '').replace(/\/+$/, '');
  return u.href.replace(/\/$/, '');
}
export function apiUrl(profile, action, extra = {}) {
  const u = new URL(normalizeServer(profile.server, profile.allowHTTP === true) + '/player_api.php');
  u.searchParams.set('username', profile.username);
  u.searchParams.set('password', profile.password);
  if (action) u.searchParams.set('action', action);
  Object.entries(extra).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  return u.href;
}
export function streamUrl(profile, kind, id, extension) {
  if (!/^\d+$/.test(String(id))) throw new Error('معرّف الوسائط غير صالح.');
  const folder = kind === 'live' ? 'live' : kind === 'movie' ? 'movie' : 'series';
  const ext = /^[a-zA-Z0-9]{1,8}$/.test(extension || '') ? extension : (kind === 'live' ? 'm3u8' : 'mp4');
  return `${normalizeServer(profile.server, profile.allowHTTP === true)}/${folder}/${encodeURIComponent(profile.username)}/${encodeURIComponent(profile.password)}/${id}.${ext}`;
}
function splitInfo(line) {
  let quoted = false;
  for (let i=0; i<line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    if (line[i] === ',' && !quoted) return [line.slice(0,i), line.slice(i+1).trim()];
  }
  return [line, ''];
}
export function parseM3U(text, baseUrl, allowHTTP = false) {
  if (typeof text !== 'string' || !text.trim().startsWith('#EXTM3U')) throw new Error('الملف ليس قائمة M3U صالحة.');
  if (/#EXT-X-(TARGETDURATION|STREAM-INF|MEDIA-SEQUENCE)/.test(text)) throw new Error('هذا رابط بث HLS مباشر. أضفه من خيار «رابط فيديو».');
  const items = []; let pending = null; let skipped = 0; const seen = new Set();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith('#EXTINF:')) {
      const [meta,name] = splitInfo(line); const attrs = {};
      for (const m of meta.matchAll(/([\w-]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
      let artwork=null;
      try {if(attrs['tvg-logo']) artwork=validMediaUrl(new URL(attrs['tvg-logo'],baseUrl).href,allowHTTP);}catch{}
      pending = {name: name || attrs['tvg-name'] || 'بدون عنوان', group: attrs['group-title'] || 'عام',artwork};
    } else if (line && !line.startsWith('#')) {
      let url;
      try { url = validMediaUrl(new URL(line, baseUrl).href, allowHTTP); } catch {}
      if (!url) { skipped++; pending = null; continue; }
      if (!seen.has(url)) {
        seen.add(url);
        items.push({id: url, url, name: pending?.name || 'وسائط', group: pending?.group || 'عام', kind: 'playlist',artwork:pending?.artwork||null});
      }
      pending = null;
      if (items.length >= LIMIT) break;
    }
  }
  if (!items.length) throw new Error('لا توجد روابط مسموحة في القائمة. راجع إعداد السماح بـ HTTP للمصدر.');
  return {items, skipped};
}
export async function requestText(url, fetcher = fetch, allowHTTP = false) {
  httpsUrl(url, allowHTTP);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetcher(url, {signal: controller.signal, redirect: 'error'});
    if (!r.ok) throw new Error('تعذّر الاتصال بالمصدر. تحقق من الرابط وصلاحية الاشتراك.');
    const length = Number(r.headers?.get('content-length') || 0);
    if (length > 12 * 1024 * 1024) throw new Error('القائمة كبيرة جدًا. استخدم قائمة أصغر.');
    const text = await r.text();
    if (text.length > 12 * 1024 * 1024) throw new Error('القائمة كبيرة جدًا. استخدم قائمة أصغر.');
    return text;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('انتهت مهلة الاتصال. حاول مرة أخرى.');
    // Do not expose underlying networking errors containing account URLs.
    if (/^(تعذّر|القائمة)/.test(e.message || '')) throw e;
    throw new Error('تعذّر الاتصال الآمن بالمصدر. تحقق من الشبكة والرابط.');
  } finally { clearTimeout(timer); }
}
export async function requestJSON(url, allowHTTP = false) {
  const text = await requestText(url, fetch, allowHTTP);
  try { return JSON.parse(text); } catch { throw new Error('المصدر أعاد بيانات غير صالحة.'); }
}
export async function validateProfile(p) {
  if (!p.name?.trim()) throw new Error('أدخل اسم القائمة.');
  if (JSON.stringify(p).length > 1500) throw new Error('بيانات القائمة طويلة جدًا للحفظ الآمن.');
  if (p.type === 'xtream') {
    if (!p.username?.trim() || !p.password) throw new Error('أدخل اسم المستخدم وكلمة المرور.');
    const result = await requestJSON(apiUrl(p), p.allowHTTP === true);
    if (Number(result?.user_info?.auth) !== 1 || (result.user_info.status && result.user_info.status.toLowerCase() !== 'active')) throw new Error('بيانات الدخول غير صحيحة أو الاشتراك غير نشط.');
  } else {
    httpsUrl(p.url, p.allowHTTP === true);
    if (p.type === 'm3u') parseM3U(await requestText(p.url, fetch, p.allowHTTP === true), p.url, p.allowHTTP === true);
  }
}
export async function loadCatalog(p, kind) {
  if (p.type === 'direct') return {items:[{id:p.id, name:p.name, url:p.url, kind:'direct', group:'فيديو'}],skipped:0};
  if (p.type === 'm3u') return parseM3U(await requestText(p.url, fetch, p.allowHTTP === true), p.url, p.allowHTTP === true);
  const actions = {live: ['get_live_streams','get_live_categories'], movie:['get_vod_streams','get_vod_categories'], series:['get_series','get_series_categories']};
  const pair = actions[kind] || actions.live;
  const [rows, cats] = await Promise.all([requestJSON(apiUrl(p,pair[0]), p.allowHTTP === true), requestJSON(apiUrl(p,pair[1]), p.allowHTTP === true).catch(() => [])]);
  if (!Array.isArray(rows)) throw new Error('المصدر لم يُرجع قائمة محتوى صالحة.');
  const groups = new Map((Array.isArray(cats)?cats:[]).map(c=>[String(c.category_id),String(c.category_name)]));
  return {items: rows.slice(0,LIMIT).filter(r=>/^\d+$/.test(String(r.stream_id ?? r.series_id))).map(r=>({
    id:String(r.stream_id ?? r.series_id), name:String(r.name || 'بدون عنوان'), kind,
    group: groups.get(String(r.category_id)) || 'عام',
    artwork:validMediaUrl(r.stream_icon || r.cover || '',p.allowHTTP===true),
    extension:r.container_extension || (kind === 'live'?'m3u8':'mp4'),
    url:kind==='series'?null:streamUrl(p,kind,r.stream_id,r.container_extension || (kind==='live'?'m3u8':'mp4'))
  })), skipped: Math.max(0,rows.length-LIMIT)};
}
export async function loadEpisodes(p, id) {
  const data = await requestJSON(apiUrl(p,'get_series_info',{series_id:id}), p.allowHTTP === true);
  const seasons = data?.episodes;
  if (!seasons || typeof seasons !== 'object') throw new Error('لا توجد حلقات متاحة لهذا المسلسل.');
  return Object.entries(seasons).sort((a,b)=>Number(a[0])-Number(b[0])).flatMap(([season,rows])=>(Array.isArray(rows)?rows:[]).filter(r=>/^\d+$/.test(String(r.id))).map(r=>({
    id:String(r.id),name:String(r.title || `حلقة ${r.episode_num || ''}`),group:`الموسم ${season}`,kind:'episode',
    url:streamUrl(p,'episode',r.id,r.container_extension || 'mp4')
  })));
}
export function filterItems(items, search, group, onlyFavorites, favorites, keyFor) {
  const q = search.trim().toLocaleLowerCase();
  return items.filter(i=>(!q || i.name.toLocaleLowerCase().includes(q)) && (!group || i.group===group) && (!onlyFavorites || favorites.includes(keyFor(i))));
}
export function stableKey(item) {
  const s = `${item.kind}:${item.id}`;
  let a=2166136261, b=5381;
  for (let i=0;i<s.length;i++) { a=Math.imul(a ^ s.charCodeAt(i),16777619); b=Math.imul(b,33)^s.charCodeAt(i); }
  return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');
}

export function localFilename(id,name) {
  if(!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("معرّف الملف غير صالح.");
  const ext=String(name).match(/\.([a-zA-Z0-9]{1,8})$/)?.[1]?.toLowerCase() || "mp4";
  return `${id}.${ext}`;
}
