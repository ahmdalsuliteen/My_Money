/* فلوسي — Service Worker: عمل بدون إنترنت + تذكيرات الخلفية */
const V = 'flousi-v5';
const SHELL = ['./', './index.html', './app.js', './manifest.json', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png'];
const CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'flousi-meta').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  // الصفحة: الشبكة أولاً ثم النسخة المحفوظة (تحديثات فورية + تعمل بدون إنترنت)
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('./index.html', cp)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // ملفات الموقع نفسه: الشبكة أولاً (تحديثات الأمان تصل فوراً) ثم النسخة المحفوظة بدون إنترنت
  if (u.origin === location.origin) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; }).catch(() => caches.match(r)));
    return;
  }
  // مكتبات Firebase والخطوط: نسخة محفوظة + تحديث بالخلفية (لا نخزّن أي طلب بيانات/حسابات)
  if (CDN.test(r.url)) {
    e.respondWith(caches.open(V).then(c => c.match(r).then(h => {
      const net = fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }).catch(() => h);
      return h || net;
    })));
  }
});

/* ---------- تذكيرات بالخلفية (أندرويد/كروم المثبّت) ---------- */
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function computeDue(cfg) {
  const out = [], t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const DAY = 864e5, on = (y, m, day) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()));
  if (cfg.salaryDay > 0) {
    let d = on(t0.getFullYear(), t0.getMonth(), cfg.salaryDay);
    if (d < t0) d = on(t0.getFullYear(), t0.getMonth() + 1, cfg.salaryDay);
    const left = Math.round((d - t0) / DAY);
    if (left <= cfg.salaryLead) out.push({ k: 'sal:' + iso(d), text: left === 0 ? 'اليوم نزول الراتب 🎉 وزّع الباقي' : left === 1 ? 'غداً نزول الراتب — أدخل الباقي الفعلي' : `باقي ${left} أيام على نزول الراتب` });
  }
  const p = (cfg.debt || [])[0];
  if (p) {
    const [y, m, dd] = p.d.split('-').map(Number), left = Math.round((new Date(y, m - 1, dd) - t0) / DAY);
    if (left <= cfg.debtLead) out.push({ k: 'debt:' + p.d, text: left < 0 ? `قسط ${cfg.debtName} متأخر ${-left} يوم` : left === 0 ? `اليوم موعد قسط ${cfg.debtName}` : `قسط ${cfg.debtName} بعد ${left} ${left === 1 ? 'يوم' : left <= 10 ? 'أيام' : 'يوماً'}` });
  }
  return out;
}
async function checkReminders() {
  const c = await caches.open('flousi-meta');
  const r = await c.match('cfg'); if (!r) return;
  const cfg = await r.json(); if (!cfg.notif) return;
  const sr = await c.match('seen'), seen = sr ? await sr.json() : {}, today = iso(new Date());
  let changed = false;
  for (const x of computeDue(cfg)) {
    if (seen[x.k] === today) continue;
    seen[x.k] = today; changed = true;
    await self.registration.showNotification('فلوسي', { body: x.text, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: x.k, dir: 'rtl', lang: 'ar' });
  }
  if (changed) await c.put('seen', new Response(JSON.stringify(seen)));
}
self.addEventListener('periodicsync', e => { if (e.tag === 'flousi-reminders') e.waitUntil(checkReminders()); });
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow('./');
  }));
});
