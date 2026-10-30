/* 冲刺背诵手册 · 离线缓存
   页面（HTML）：网络优先 → 永远拿最新版；断网回退缓存
   图片/图标：缓存优先 → 读到过的页自动存下来，断网也能翻
   首次打开只预缓存外壳，页面图按阅读顺序边看边存，不拖慢首屏。
*/
const CACHE = 'sprint-2027-v1';
const SHELL = [
  './',
  './index.html',
  './up-pages.html',
  './down-pages.html',
  './book-all.html',
  './manifest.webmanifest',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isHTML(req, url) {
  return req.mode === 'navigate'
    || (req.headers.get('accept') || '').indexOf('text/html') >= 0
    || url.pathname.endsWith('/')
    || url.pathname.endsWith('.html')
    || url.pathname.endsWith('.webmanifest');
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (isHTML(req, url)) {
    // 网络优先
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
        }
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：缓存优先，顺手回填
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(res => {
        if (res && res.status === 200 && (res.type === 'basic' || res.type === 'default')) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy).catch(() => {}));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
