importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            "AIzaSyCkYhlMglrzHuhuPAPZYXZct__iWYrPzZY",
  authDomain:        "scan2eat-9883e.firebaseapp.com",
  projectId:         "scan2eat-9883e",
  storageBucket:     "scan2eat-9883e.firebasestorage.app",
  messagingSenderId: "521928310906",
  appId:             "1:521928310906:web:856ccb1b9799672c48fbc3"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('Background message received:', payload);

  const title = payload.notification?.title || 'SCAN2EAT';
  const body  = payload.notification?.body  || 'Your order has been updated';

  const options = {
    body:    body,
    icon:    '/static/img/icon.png',
    badge:   '/static/img/icon.png',
    vibrate: [200, 100, 200, 100, 200],
    tag:     'order-update',
    renotify: true,
    data:    payload.data || {},
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'close', title: 'Close' }
    ]
  };

  self.registration.showNotification(title, options);
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    const url = event.notification.data?.order_url || '/my-orders';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(function(clientList) {
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});