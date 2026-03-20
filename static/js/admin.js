// ── CLOCK ──
function updateClock() {
  const now = new Date();
  const el = document.getElementById('liveClock');
  if (el) el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

// ── TAB SWITCHING ──
function switchTab(tab, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.snav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  btn.classList.add('active');
  const titles = { orders: 'Orders', menu: 'Menu Management', analytics: 'Analytics' };
  document.getElementById('topbarTitle').textContent = titles[tab] || tab;
  if (tab === 'analytics') renderDonut();
}

// ── ORDER FILTER ──
function filterOrders(status, btn) {
  document.querySelectorAll('.tab-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.order-card').forEach(card => {
    card.style.display = (status === 'all' || card.dataset.status === status) ? '' : 'none';
  });
}

// ── STATUS UPDATE ──
$(document).on('click', '.ocs-btn', function () {
  const id = $(this).data('id');
  const status = $(this).data('status');
  $.ajax({
    url: '/api/order/status',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ order_id: id, status: status }),
    success: function (res) {
      if (res.success) {
        const card = document.getElementById('oc-' + id);
        if (card) {
          card.dataset.status = status;
          card.querySelectorAll('.ocs-btn').forEach(b => b.classList.remove('active'));
          card.querySelectorAll('.ocs-btn').forEach(b => {
            if ($(b).data('status') === status) b.classList.add('active');
          });
          const badge = card.querySelector('.status-badge');
          if (badge) {
            badge.className = 'status-badge status-' + status.toLowerCase();
            badge.textContent = status;
          }
        }
        updateStats();
        showToast('Order updated to ' + status, 'success');
      }
    },
    error: function () { showToast('Failed to update status', 'error'); }
  });
});

// ── DELETE ORDER ──
$(document).on('click', '.oc-delete', function () {
  const id = $(this).data('id');
  if (!confirm('Delete this order?')) return;
  $.ajax({
    url: '/api/order/delete',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ order_id: id }),
    success: function (res) {
      if (res.success) {
        $('#oc-' + id).fadeOut(300, function () { $(this).remove(); });
        updateStats();
        showToast('Order deleted', 'success');
      }
    },
    error: function () { showToast('Failed to delete order', 'error'); }
  });
});

// ── CLEAR DONE ──
$('#clearDoneBtn').click(function () {
  if (!confirm('Clear all completed orders?')) return;
  $.ajax({
    url: '/api/orders/clear-completed',
    method: 'POST',
    success: function (res) {
      if (res.success) {
        document.querySelectorAll('.order-card').forEach(card => {
          if (card.dataset.status === 'Completed') card.remove();
        });
        updateStats();
        showToast('Cleared completed orders', 'success');
      }
    }
  });
});

// ── UPDATE STATS ──
function updateStats() {
  $.get('/api/stats', function (data) {
    $('#statPending').text(data.pending);
    $('#statPreparing').text(data.preparing);
    $('#statCompleted').text(data.completed);
    $('#statRevenue').text('₹' + data.revenue);
    $('#pendingBadge').text(data.pending);
    $('#qsTotal').text(data.total);
    $('#qsPending').text(data.pending);
    $('#qsPreparing').text(data.preparing);
    $('#qsCompleted').text(data.completed);
    $('#qsRevenue').text('₹' + data.revenue);
  });
}

// ── AVAILABILITY TOGGLE ──
$(document).on('change', '.avail-toggle', function () {
  const id = $(this).data('id');
  const available = $(this).is(':checked');
  $.ajax({
    url: '/api/menu/toggle',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ item_id: id, available: available }),
    success: function (res) {
      if (res.success) {
        const card = document.getElementById('mc-' + id);
        if (card) card.classList.toggle('unavailable', !available);
        showToast(available ? 'Item enabled' : 'Item disabled', 'success');
      }
    }
  });
});

// ── MODAL ──
const modal = document.getElementById('itemModalBackdrop');

$('#addItemBtn').click(function () {
  document.getElementById('modalTitle').textContent = 'Add Menu Item';
  document.getElementById('editItemId').value = '';
  document.getElementById('itemForm').reset();
  document.getElementById('fieldAvailable').checked = true;
  modal.classList.add('open');
});

$('#modalClose, #modalCancel').click(function () {
  modal.classList.remove('open');
});

$(document).on('click', '.edit-btn', function () {
  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('editItemId').value = $(this).data('id');
  document.getElementById('fieldName').value = $(this).data('name');
  document.getElementById('fieldEmoji').value = $(this).data('emoji');
  document.getElementById('fieldPrice').value = $(this).data('price');
  document.getElementById('fieldCategory').value = $(this).data('category');
  document.getElementById('fieldDesc').value = $(this).data('description');
  document.getElementById('fieldAvailable').checked = $(this).data('available') === 'true';
  modal.classList.add('open');
});

$('#itemForm').on('submit', function (e) {
  e.preventDefault();
  const id = document.getElementById('editItemId').value;
  const payload = {
    name: document.getElementById('fieldName').value,
    emoji: document.getElementById('fieldEmoji').value || '🍽️',
    price: parseFloat(document.getElementById('fieldPrice').value),
    category: document.getElementById('fieldCategory').value,
    description: document.getElementById('fieldDesc').value,
    available: document.getElementById('fieldAvailable').checked
  };
  const url = id ? '/api/menu/edit' : '/api/menu/add';
  if (id) payload.item_id = id;

  $('#modalSave').text('Saving...').prop('disabled', true);

  $.ajax({
    url: url,
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify(payload),
    success: function (res) {
      if (res.success) {
        modal.classList.remove('open');
        showToast(id ? 'Item updated' : 'Item added', 'success');
        setTimeout(() => location.reload(), 800);
      }
    },
    error: function () {
      showToast('Failed to save item', 'error');
      $('#modalSave').text('Save Item').prop('disabled', false);
    }
  });
});

// ── DELETE MENU ITEM ──
$(document).on('click', '.del-btn', function () {
  const id = $(this).data('id');
  if (!confirm('Delete this menu item?')) return;
  $.ajax({
    url: '/api/menu/delete',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({ item_id: id }),
    success: function (res) {
      if (res.success) {
        $('#mc-' + id).fadeOut(300, function () { $(this).remove(); });
        showToast('Item deleted', 'success');
      }
    }
  });
});

// ── DONUT CHART ──
function renderDonut() {
  $.get('/api/stats', function (data) {
    const pending = data.pending || 0;
    const preparing = data.preparing || 0;
    const completed = data.completed || 0;
    const total = pending + preparing + completed || 1;

    const size = 120, cx = 60, cy = 60, r = 45;
    const circ = 2 * Math.PI * r;

    function arc(value, offset, color) {
      const dash = (value / total) * circ;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="14"
        stroke-dasharray="${dash} ${circ}" stroke-dashoffset="${-offset}"
        style="transform:rotate(-90deg);transform-origin:center" />`;
    }

    const o1 = 0;
    const o2 = (pending / total) * circ;
    const o3 = o2 + (preparing / total) * circ;

    document.getElementById('donutRing').innerHTML = `
      <svg width="${size}" height="${size}" viewBox="0 0 120 120">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="hsl(30,8%,16%)" stroke-width="14"/>
        ${arc(pending, o1, '#FF9900')}
        ${arc(preparing, o2, '#E8612A')}
        ${arc(completed, o3, 'hsl(142,71%,45%)')}
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
          fill="white" font-size="18" font-weight="800" font-family="Outfit,sans-serif">${total}</text>
        <text x="${cx}" y="${cy + 16}" text-anchor="middle" dominant-baseline="middle"
          fill="hsl(30,10%,55%)" font-size="9" font-family="Space Grotesk,sans-serif">orders</text>
      </svg>`;

    document.getElementById('donutLegend').innerHTML = `
      <div class="dl-item"><span class="dl-dot" style="background:#FF9900"></span><span class="dl-label">Pending</span><span class="dl-count">${pending}</span></div>
      <div class="dl-item"><span class="dl-dot" style="background:#E8612A"></span><span class="dl-label">Preparing</span><span class="dl-count">${preparing}</span></div>
      <div class="dl-item"><span class="dl-dot" style="background:hsl(142,71%,45%)"></span><span class="dl-label">Done</span><span class="dl-count">${completed}</span></div>`;
  });
}