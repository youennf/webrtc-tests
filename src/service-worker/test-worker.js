/*  eslint-disable no-restricted-globals, no-undef */
importScripts('batchsdk-shared-worker.js');
// const assetPath = new URL(location).searchParams.get('assetPath');
// const cacheName = `lmfr-${assetPath}`;
// const cacheableFiles = [
//   '/',
//   `${assetPath}css/home.css`,
//   `${assetPath}js/home.bundle.js`,
//   `${assetPath}js/vendor.bundle.js`,
//   `${assetPath}js/common.bundle.js`,
// ];
// 
// const isCacheable = (url) => {
//   const urlObject = new URL(url);
//   return urlObject.hostname.match(/(((loc|tst|stg|prd)?-?lemonde)|lemde)\.fr$/gm) !== null
//       && cacheableFiles.indexOf(urlObject.pathname) !== -1
//       && urlObject.search === '';
// };
// 
// self.addEventListener('install', (e) => {
//   e.waitUntil(
//     caches.open(cacheName).then(cache => cache
//       .addAll(cacheableFiles)
//       .then(self.skipWaiting)),
//   );
// });
// 
// self.addEventListener('activate', (event) => {
//   event.waitUntil(
//     caches.keys().then(keyList => Promise.all(
//       keyList.filter(key => key !== cacheName).map(key => caches.delete(key)),
//     )),
//   );
// });
/*
self.addEventListener('fetch', (event) => {
  if (isCacheable(event.request.url)) {
    event.respondWith(caches.open(cacheName)
      .then(cache => fetch(event.request)
        .then((response) => {
          cache.put(event.request, response.clone());
          return response;
        })
        .catch(() => cache.match(event.request)))
      .catch(() => fetch(event.request)));
  }
});
*/

addEventListener("fetch", async (e) => {
});
