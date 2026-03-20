/* =====================================================
   QUEUELESS — main.js
   Shared utilities loaded on every page
   ===================================================== */

'use strict';

// ── Toast Notification System ────────────────────────
window.showToast = function(message, type = 'info', duration = 3500) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warn: '⚠️' };
  const $container = $('#toastContainer');
  const $toast = $(`
    <div class="toast ${type}">
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <span class="toast-msg">${message}</span>
      <button class="toast-close">✕</button>
    </div>
  `);
  $container.append($toast);

  $toast.find('.toast-close').on('click', function() {
    $toast.fadeOut(200, function() { $(this).remove(); });
  });

  setTimeout(function() {
    $toast.fadeOut(300, function() { $(this).remove(); });
  }, duration);
};

// ── Confirm Dialog ────────────────────────────────────
window.confirmAction = function(message) {
  return window.confirm(message);
};
