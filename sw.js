/* Time Budget service worker (step 04d_pwa_install, 2026-11-24).
   Keeps a copy of the app on the device so it opens without internet.
   Lives at the site root so it also covers ../mockup/ (the preview tabs).
   - Pages (HTML): try the network first (3 s), else the saved copy -> updates arrive by themselves when online.
   - Everything else (pictures, scripts, fonts): saved copy first, refreshed in the background.
   Your taps are NOT here: they stay in the browser's localStorage (key sam10.timeBudget.v1). */
const VERSION = 'tb-2026-11-24a';          // change this to force every device to re-download the core files
const CACHE = VERSION;
const TILES = ['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a08', 'a09'];
const APP_ASSETS = ['a01_e1_00001_.png','a01_e2_00001_.png','a01_e3_00001_.png','a02_e1_00001_.png','a02_e2_00001_.png','a02_e3_00001_.png',
  'a03_e1_00001_.png','a03_e2_00001_.png','a03_e3_00001_.png','a04_e1_00001_.png','a04_e2_00001_.png','a04_e3_00001_.png',
  'a05_e1_00001_.png','a05_e2_00001_.png','a05_e3_00001_.png','a06_e1_00001_.png','a06_e2_00001_.png','a06_e3_00001_.png',
  'a08_e1_00001_.png','a08_e2_00001_.png','a08_e3_00001_.png','a09_e1_00001_.png','a09_e2_00001_.png','a09_e3_00001_.png',
  'background_rgba_00001_.png','background_rgba_00002_.png','background_rgba_00003_.png',
  'stuck_background.png','stuck_person.png','stuck_question.png','stuck_yarn.png',
  'sleep_background.png','sleep_moon.png','sleep_sleeper.png','sleep_star.png'];
const CORE = [
  'app/index.html', 'app/timer.html', 'app/manifest.webmanifest',
  'app/icons/icon-192.png', 'app/icons/icon-512.png', 'app/icons/icon-maskable-512.png', 'app/icons/apple-touch-icon.png',
  ...APP_ASSETS.map(f => 'app/assets/' + f),
  // preview tabs (designs only) + the shared bar they load
  'mockup/02a_plans/plans.html', 'mockup/02b_categories/categories.html', 'mockup/02c_overviews/overviews.html',
  'mockup/02d_rewards/rewards.html', 'mockup/02e_settings/settings.html', 'mockup/02f_content/content.html',
  'mockup/06_checkin/checkin.html', 'mockup/07_journey/journey.html', 'mockup/08_yes_check/yes_check.html',
  'mockup/_shared/nav.js', 'mockup/_shared/nav.css',
  // tile art used by the tab bar's running tile
  ...TILES.flatMap(t => [1, 2, 3].map(e => `mockup/v6/assets/${t}_e${e}_00001_.png`)),
  ...[1, 2, 3].map(n => `mockup/v6/assets/background_rgba_0000${n}_.png`)
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  // one missing file must not block the install, so add them one by one
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(p => c.add(new Request(p, { cache: 'reload' })).catch(() => null))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('tb-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function keep(req, res) {
  if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
  return res;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  if (!same && !FONT_HOSTS.includes(url.hostname)) return;

  if (req.mode === 'navigate' || req.destination === 'document' || req.destination === 'iframe') {
    // network first, 3 s limit, then the saved copy (ignore ?fast / #hash so test links still open offline)
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('app/index.html'));
      const timer = setTimeout(() => { fallback().then(r => { if (r && !done) { done = true; resolve(r); } }); }, 3000);
      fetch(req).then(res => { keep(req, res); clearTimeout(timer); if (!done) { done = true; resolve(res); } })
        .catch(() => { clearTimeout(timer); fallback().then(r => { if (!done) { done = true; resolve(r || Response.error()); } }); });
    }));
    return;
  }

  // saved copy first, refresh in the background
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => keep(req, res)).catch(() => hit);
    return hit || net;
  }));
});
