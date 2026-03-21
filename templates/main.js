// ── TOAST ──
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span style="width:8px;height:8px;border-radius:50%;background:${type === 'success' ? 'var(--success)' : 'var(--danger)'};flex-shrink:0"></span>
    <span style="flex:1">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── PUSH NOTIFICATIONS ──
async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

function sendPushNotification(title, body, icon) {
  if (Notification.permission === 'granted') {
    const n = new Notification(title, {
      body: body,
      icon: icon || '/static/img/logo.png',
      badge: '/static/img/logo.png',
      vibrate: [200, 100, 200],
      tag: 'order-update',
      renotify: true,
    });
    setTimeout(() => n.close(), 8000);
  }
}

function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [
      { freq: 523.25, start: 0,    dur: 0.15 },
      { freq: 659.25, start: 0.15, dur: 0.15 },
      { freq: 783.99, start: 0.30, dur: 0.15 },
      { freq: 1046.5, start: 0.45, dur: 0.3  },
    ];
    notes.forEach(({ freq, start, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.05);
    });
  } catch(e) {}
}

// Request permission on page load
document.addEventListener('DOMContentLoaded', function() {
  if ('Notification' in window && Notification.permission === 'default') {
    setTimeout(requestNotificationPermission, 3000);
  }
});