// ── TOAST ──
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast ' + type;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '❌'}</span>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}