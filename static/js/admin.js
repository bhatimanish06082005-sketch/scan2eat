// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const el  = document.getElementById('liveClock');
  if (el) el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ── TAB SWITCHING ──
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('tab-' + name);
  if (panel) panel.classList.add('active');
  if (btn)   btn.classList.add('active');
  const titles = {
    orders:    'All Orders',
    qr:        'QR / UPI Orders',
    cod:       'Cash on Counter Orders',
    menu:      'Menu Management',
    analytics: 'Analytics'
  };
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = titles[name] || name;
}

// ── FILTER ORDERS ──
function filterOrders(status, btn, boardId) {
  const board = document.getElementById(boardId);
  if (!board) return;
  board.querySelectorAll('.order-card').forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
  const parent = btn.closest('.tab-filters');
  if (parent) parent.querySelectorAll('.tab-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── CLEAR DONE ──
function clearDone() {
  if (!confirm('Delete all Completed orders?')) return;
  $.ajax({
    url: '/api/orders/clear-completed',
    method: 'POST',
    contentType: 'application/json',
    success: function(res) {
      if (res.success) {
        document.querySelectorAll('.order-card[data-status="Completed"]').forEach(el => el.remove());
        showToast('Completed orders cleared ✅', 'success');
      }
    }
  });
}

// ── STATUS UPDATE ──
$(document).on('click', '.ocs-btn', function() {
  const btn    = $(this);
  const id     = btn.data('id');
  const status = btn.data('status');

  $.ajax({
    url: '/api/order/status',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ order_id: id, status: status }),
    success: function(res) {
      if (res.success) {
        // Update all buttons in this card
        const card = document.getElementById('oc-' + id);
        if (card) {
          card.dataset.status = status;
          card.querySelectorAll('.ocs-btn').forEach(b => b.classList.remove('active'));
          btn[0].classList.add('active');

          // Update status badge
          const badge = card.querySelector('.status-badge');
          if (badge) {
            badge.className = 'status-badge status-' + status.toLowerCase();
            badge.textContent = status;
          }
        }

        // Update stat cards
        refreshStats();
        showToast('Order marked as ' + status, 'success');
      } else {
        showToast('Failed to update status', 'error');
      }
    },
    error: function() {
      showToast('Error updating status', 'error');
    }
  });
});

// ── DELETE ORDER ──
$(document).on('click', '.oc-delete', function() {
  const id   = $(this).data('id');
  if (!confirm('Delete this order?')) return;
  $.ajax({
    url: '/api/order/delete',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ order_id: id }),
    success: function(res) {
      if (res.success) {
        const card = document.getElementById('oc-' + id);
        if (card) card.remove();
        refreshStats();
        showToast('Order deleted', 'success');
      }
    }
  });
});

// ── REFRESH STATS ──
function refreshStats() {
  $.get('/api/stats', function(res) {
    if (!res.success === false) {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('statPending',   res.pending);
      set('statPreparing', res.preparing);
      set('statCompleted', res.completed);
      set('pendingBadge',  res.pending);
    }
  });
}

// ── AVAILABILITY TOGGLE ──
$(document).on('change', '.avail-toggle', function() {
  const id        = $(this).data('id');
  const available = $(this).prop('checked');
  const card      = document.getElementById('mc-' + id);
  $.ajax({
    url: '/api/menu/toggle',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ item_id: id, available: available }),
    success: function(res) {
      if (res.success) {
        if (card) card.classList.toggle('unavailable', !available);
        showToast(available ? 'Item enabled ✅' : 'Item disabled', 'success');
      }
    }
  });
});

// ── MODAL ──
const modal       = document.getElementById('itemModalBackdrop');
const modalTitle  = document.getElementById('modalTitle');
const editItemId  = document.getElementById('editItemId');
const fieldName   = document.getElementById('fieldName');
const fieldEmoji  = document.getElementById('fieldEmoji');
const fieldPrice  = document.getElementById('fieldPrice');
const fieldCat    = document.getElementById('fieldCategory');
const fieldDesc   = document.getElementById('fieldDesc');
const fieldAvail  = document.getElementById('fieldAvailable');

function openModal(title) {
  if (modalTitle) modalTitle.textContent = title;
  if (modal) modal.classList.add('open');
}

function closeModal() {
  if (modal) modal.classList.remove('open');
  document.getElementById('itemForm').reset();
  if (editItemId) editItemId.value = '';
}

document.getElementById('addItemBtn')?.addEventListener('click', function() {
  openModal('Add Menu Item');
});
document.getElementById('modalClose')?.addEventListener('click',  closeModal);
document.getElementById('modalCancel')?.addEventListener('click', closeModal);
modal?.addEventListener('click', function(e) {
  if (e.target === modal) closeModal();
});

// ── EDIT BUTTON ──
$(document).on('click', '.edit-btn', function() {
  const btn = $(this);
  if (editItemId) editItemId.value        = btn.data('id');
  if (fieldName)  fieldName.value         = btn.data('name');
  if (fieldEmoji) fieldEmoji.value        = btn.data('emoji');
  if (fieldPrice) fieldPrice.value        = btn.data('price');
  if (fieldDesc)  fieldDesc.value         = btn.data('description');
  if (fieldAvail) fieldAvail.checked      = btn.data('available') === 'true';
  if (fieldCat) {
    const opts = fieldCat.options;
    for (let i = 0; i < opts.length; i++) {
      if (opts[i].value === btn.data('category')) { fieldCat.selectedIndex = i; break; }
    }
  }
  openModal('Edit Menu Item');
});

// ── DELETE MENU ITEM ──
$(document).on('click', '.del-btn', function() {
  const id = $(this).data('id');
  if (!confirm('Delete this menu item?')) return;
  $.ajax({
    url: '/api/menu/delete',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ item_id: id }),
    success: function(res) {
      if (res.success) {
        const card = document.getElementById('mc-' + id);
        if (card) card.remove();
        showToast('Item deleted', 'success');
      }
    }
  });
});

// ── SAVE ITEM FORM ──
document.getElementById('itemForm')?.addEventListener('submit', function(e) {
  e.preventDefault();
  const id      = editItemId?.value;
  const payload = {
    name:        fieldName?.value.trim(),
    emoji:       fieldEmoji?.value.trim() || '🍽️',
    price:       parseFloat(fieldPrice?.value),
    category:    fieldCat?.value,
    description: fieldDesc?.value.trim(),
    available:   fieldAvail?.checked,
  };
  if (!payload.name || !payload.price) {
    showToast('Name and price are required', 'error');
    return;
  }
  const url = id ? '/api/menu/edit' : '/api/menu/add';
  if (id) payload.item_id = id;

  $.ajax({
    url: url,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload),
    success: function(res) {
      if (res.success) {
        showToast(id ? 'Item updated ✅' : 'Item added ✅', 'success');
        closeModal();
        setTimeout(() => location.reload(), 800);
      } else {
        showToast('Failed to save item', 'error');
      }
    },
    error: function() {
      showToast('Error saving item', 'error');
    }
  });
});