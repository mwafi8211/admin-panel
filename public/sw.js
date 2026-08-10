// public/sw.js
// حط الملف ده في مجلد public/ في مشروعك (مش src/) عشان يتنشر زي ما هو على /admin-panel/sw.js

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// وصول إشعار Push جديد من الـ Edge Function
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'طلب جديد', body: event.data ? event.data.text() : '' };
  }

  const title = data.title || 'طلب جديد 🛍️';
  const options = {
    body: data.body || 'وصل طلب جديد في متجر السعادة الزوجية',
    icon: '/admin-panel/favicon.svg',
    badge: '/admin-panel/favicon.svg',
    dir: 'rtl',
    lang: 'ar',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/admin-panel/?tab=orders',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// الضغط على الإشعار -> يفتح/يركز على تاب الطلبات الجديدة
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin-panel/?tab=orders';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
