// ── FIREBASE INIT ──
const firebaseConfig = {
  apiKey:            "AIzaSyCkYhlMglrzHuhuPAPZYXZct__iWYrPzZY",
  authDomain:        "scan2eat-9883e.firebaseapp.com",
  projectId:         "scan2eat-9883e",
  storageBucket:     "scan2eat-9883e.firebasestorage.app",
  messagingSenderId: "521928310906",
  appId:             "1:521928310906:web:856ccb1b9799672c48fbc3",
  measurementId:     "G-KRMZNZCF4L"
};

const VAPID_KEY = "BCgPoA3Tvd-frg0gKyQuWW6ncQD6Ds2bUo5aIB7STXNJaDSsfjilfKo5x_Dn7jMlb8ckhew7KIYOkj2pWgjTSQk";

// Only log on localhost
const isDev = window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1';

function devLog(...args) {
  if (isDev) console.log(...args);
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ── REGISTER SERVICE WORKER ──
async function initFirebaseMessaging() {
  try {
    const registration = await navigator.serviceWorker.register(
      '/static/firebase-messaging-sw.js'
    );
    devLog('SW registered');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      devLog('Notification permission denied');
      return;
    }

    const token = await messaging.getToken({
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });

    if (token) {
      // Only show token on localhost for debugging
      if (isDev) {
        console.log('FCM Token (dev only):', token);
      }
      saveFCMToken(token);
    }

  } catch(err) {
    devLog('Firebase messaging error:', err);
  }
}

// ── SAVE TOKEN TO SERVER ──
function saveFCMToken(token) {
  fetch('/api/fcm/save-token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token: token })
  })
  .then(r => r.json())
  .then(data => devLog('Token saved:', data))
  .catch(err => devLog('Token save error:', err));
}

// ── FOREGROUND MESSAGES ──
messaging.onMessage(function(payload) {
  devLog('Foreground message received');

  const title = payload.notification?.title || 'SCAN2EAT';
  const body  = payload.notification?.body  || 'Your order has been updated';

  playNotificationSound();
  showOrderNotification(title, body, payload.data);

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body:     body,
      tag:      'order-update',
      renotify: true,
    });
  }
});

// ── IN-APP NOTIFICATION BANNER ──
function showOrderNotification(title, body, data) {
  const existing = document.getElementById('orderNotifBanner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'orderNotifBanner';
  banner.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9999;
    background: var(--card);
    border: 1px solid hsl(142 71% 45%/0.4);
    border-radius: var(--radius);
    padding: 14px 20px;
    min-width: 300px;
    max-width: 420px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    display: flex;
    align-items: flex-start;
    gap: 12px;
    animation: slideIn 0.3s ease;
  `;

  banner.innerHTML = `
    <div style="width:36px;height:36px;border-radius:50%;
      background:hsl(142 71% 45%/0.15);border:1px solid hsl(142 71% 45%/0.3);
      display:flex;align-items:center;justify-content:center;flex-shrink:0">
      <svg viewBox="0 0 24 24" fill="none" stroke="hsl(142,71%,45%)"
        stroke-width="2.5" style="width:18px;height:18px">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    </div>
    <div style="flex:1;min-width:0">
      <div style="font-family:var(--font-d);font-weight:700;font-size:.92rem;
        color:var(--fg);margin-bottom:3px">${title}</div>
      <div style="font-size:.78rem;color:var(--muted-fg);line-height:1.4">${body}</div>
      ${data?.order_url ? `
        <a href="${data.order_url}" style="display:inline-block;margin-top:8px;
          font-size:.75rem;font-weight:700;color:var(--primary);text-decoration:none">
          View Order →
        </a>` : ''}
    </div>
    <button onclick="document.getElementById('orderNotifBanner').remove()"
      style="background:none;border:none;color:var(--muted-fg);cursor:pointer;
      font-size:1rem;padding:2px;flex-shrink:0;line-height:1">✕</button>
  `;

  document.body.appendChild(banner);
  setTimeout(() => { if (banner.parentNode) banner.remove(); }, 8000);
}

// ── NOTIFICATION SOUND ──
function playNotificationSound() {
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.15 },
      { freq: 659.25, start: 0.18, dur: 0.15 },
      { freq: 783.99, start: 0.36, dur: 0.15 },
      { freq: 1046.5, start: 0.54, dur: 0.3  },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch(e) {}
}

// ── INIT ON PAGE LOAD ──
document.addEventListener('DOMContentLoaded', function() {
  if ('serviceWorker' in navigator && 'Notification' in window) {
    setTimeout(initFirebaseMessaging, 2000);
  }
});