// ── LIVE CLOCK ──
function updateClock() {
  const el = document.getElementById('liveClock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}
setInterval(updateClock, 1000);
updateClock();

// ── TAB SWITCHING ──
function switchAdminTab(name, btn) {
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
  const section = document.getElementById('tab-' + name);
  if (section) section.classList.add('active');
  if (btn)     btn.classList.add('active');

  const filterBar = document.getElementById('orderFilterBar');
  if (filterBar) filterBar.style.display = (name === 'orders') ? '' : 'none';
}

// ── ORDER FILTER ──
let currentFilter = 'all';

function setOrderFilter(status, btn) {
  currentFilter = status;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  filterOrderCards();
}

function filterOrderCards() {
  const query = (document.getElementById('orderSearch')?.value || '').toLowerCase().trim();
  document.querySelectorAll('.order-card').forEach(card => {
    const status   = card.dataset.status || '';
    const customer = card.dataset.customer || '';
    const id       = card.dataset.id || '';
    const statusOk = (currentFilter === 'all' || status === currentFilter);
    const searchOk = (!query || customer.includes(query) || id.toLowerCase().includes(query));
    card.style.display = (statusOk && searchOk) ? '' : 'none';
  });
}

// ── KITCHEN TOGGLE ──
let kitchenOpen = document.getElementById('kitchenToggleBtn')
  ?.classList.contains('open') ?? true;

function toggleKitchen() {
  const newState = !kitchenOpen;
  const msg = newState
    ? 'Open the kitchen? Users will be able to place orders.'
    : 'Close the kitchen? Users will not be able to place new orders.';
  if (!confirm(msg)) return;

  $.ajax({
    url:         '/api/kitchen/toggle',
    method:      'POST',
    contentType: 'application/json',
    data:        JSON.stringify({ open: newState }),
    success: function(res) {
      if (!res.success) return;
      kitchenOpen = newState;
      const btn  = document.getElementById('kitchenToggleBtn');
      const text = document.getElementById('kitchenBtnText');
      if (newState) {
        btn.className  = 'kitchen-toggle open';
        text.textContent = 'Kitchen Open';
        showToast('Kitchen is now OPEN', 'success');
      } else {
        btn.className  = 'kitchen-toggle closed';
        text.textContent = 'Kitchen Closed';
        showToast('Kitchen is now CLOSED', 'error');
      }
    },
    error: function() { showToast('Failed to update kitchen status', 'error'); }
  });
}

// ── UPDATE ORDER STATUS ──
function updateOrderStatus(orderId, status, btn) {
  const card = document.getElementById('card-' + orderId);
  if (btn) {
    btn.textContent = 'Updating...';
    btn.disabled    = true;
  }

  $.ajax({
    url:         '/api/order/status',
    method:      'POST',
    contentType: 'application/json',
    data:        JSON.stringify({ order_id: orderId, status: status }),
    success: function(res) {
      if (!res.success) {
        showToast('Failed to update status', 'error');
        if (btn) { btn.textContent = 'Retry'; btn.disabled = false; }
        return;
      }

      // Update card
      if (card) {
        card.dataset.status = status;

        // Update accent bar
        const accent = card.querySelector('.order-card-accent');
        if (accent) accent.className = 'order-card-accent ' + status.toLowerCase();

        // Update status badge
        const badge = card.querySelector('.status-badge');
        if (badge) {
          badge.className   = 'status-badge ' + status.toLowerCase();
          badge.textContent = status;
        }

        // Rebuild action buttons
        const actions = card.querySelector('.card-actions');
        if (actions) {
          actions.innerHTML = buildActionButtons(orderId, status);
        }
      }

      refreshStats();
      showToast('Order marked as ' + status, 'success');
    },
    error: function() {
      showToast('Error updating status', 'error');
      if (btn) { btn.textContent = 'Retry'; btn.disabled = false; }
    }
  });
}

function buildActionButtons(orderId, status) {
  let html = '';
  if (status === 'Pending') {
    html += `<button class="card-btn preparing-btn" onclick="updateOrderStatus('${orderId}','Preparing',this)">Mark Preparing</button>`;
  }
  if (status === 'Preparing') {
    html += `<button class="card-btn ready-btn" onclick="updateOrderStatus('${orderId}','Ready',this)">Mark Ready</button>`;
  }
  if (status === 'Ready') {
    html += `<button class="card-btn complete-btn" onclick="updateOrderStatus('${orderId}','Completed',this)">Mark Done</button>`;
  }
  html += `<button class="card-btn receipt-btn" onclick="viewReceipt('${orderId}')">Receipt</button>`;
  html += `<button class="card-btn delete-btn" onclick="deleteOrder('${orderId}')">Delete</button>`;
  return html;
}

// ── DELETE ORDER ──
function deleteOrder(orderId) {
  if (!confirm('Delete this order?')) return;
  $.ajax({
    url:         '/api/order/delete',
    method:      'POST',
    contentType: 'application/json',
    data:        JSON.stringify({ order_id: orderId }),
    success: function(res) {
      if (res.success) {
        const card = document.getElementById('card-' + orderId);
        if (card) {
          card.style.transition = 'opacity .3s, transform .3s';
          card.style.opacity    = '0';
          card.style.transform  = 'scale(.95)';
          setTimeout(() => card.remove(), 300);
        }
        refreshStats();
        showToast('Order deleted', 'success');
      }
    }
  });
}

// ── CLEAR COMPLETED ──
function clearCompleted() {
  if (!confirm('Delete all completed orders?')) return;
  $.ajax({
    url:     '/api/orders/clear-completed',
    method:  'POST',
    contentType: 'application/json',
    success: function(res) {
      if (res.success) {
        document.querySelectorAll('.order-card[data-status="Completed"]').forEach(c => c.remove());
        refreshStats();
        showToast('Completed orders cleared', 'success');
      }
    }
  });
}

// ── DELETE ALL ──
function showDeleteAllConfirm() {
  document.getElementById('deleteAllDialog').classList.add('open');
}
function closeDeleteAllConfirm() {
  document.getElementById('deleteAllDialog').classList.remove('open');
}
function deleteAllOrders() {
  $.ajax({
    url:     '/api/orders/delete-all',
    method:  'POST',
    contentType: 'application/json',
    success: function(res) {
      if (res.success) {
        document.querySelectorAll('.order-card').forEach(c => c.remove());
        refreshStats();
        closeDeleteAllConfirm();
        showToast('All orders deleted', 'success');
      }
    }
  });
}

// ── REFRESH STATS ──
function refreshStats() {
  $.get('/api/stats', function(res) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('statPending',   res.pending);
    set('statPreparing', res.preparing);
    set('statCompleted', res.completed);
    set('statRevenue',   '₹' + res.revenue);
    set('pendingBadge',  res.pending);
  });
}

// ── REAL-TIME POLLING ──
let knownOrderIds = new Set();
document.querySelectorAll('.order-card').forEach(c => knownOrderIds.add(c.id));

function pollNewOrders() {
  $.get('/api/orders/latest', function(res) {
    if (!res.orders) return;
    res.orders.forEach(function(order) {
      const cardId = 'card-' + order._id;
      if (!document.getElementById(cardId)) {
        // New order — inject card at top
        const grid = document.getElementById('ordersGrid');
        if (!grid) return;
        const emptyState = grid.querySelector('.empty-state');
        if (emptyState) emptyState.remove();
        const cardHtml = buildOrderCard(order);
        grid.insertAdjacentHTML('afterbegin', cardHtml);
        playNewOrderSound();
        showToast('New order #' + order._id.slice(-6).toUpperCase() + ' received!', 'success');
        refreshStats();
      }
    });
  });
}

function buildOrderCard(order) {
  const statusClass = order.status.toLowerCase();
  const payClass    = order.payment_method === 'qr' ? 'upi' : 'cod';
  const payLabel    = order.payment_method === 'qr' ? 'UPI Paid' : 'Cash';
  const itemTags    = order.items.slice(0,4).map(i =>
    `<span class="item-tag">${i.name} ×${i.qty}</span>`).join('');
  const actionBtns  = buildActionButtons(order._id, order.status);

  return `
  <div class="order-card new-order" id="card-${order._id}"
    data-status="${order.status}"
    data-customer="${(order.customer_name||'').toLowerCase()}"
    data-id="${order._id.slice(-6).toUpperCase()}">
    <div class="order-card-accent ${statusClass}"></div>
    <div class="order-card-head">
      <div>
        <div class="order-card-id">#${order._id.slice(-6).toUpperCase()}</div>
        <div class="order-card-customer">${order.customer_name || 'Guest'}</div>
        <div class="order-card-time">${order.created_at_str || ''}</div>
      </div>
      <div class="order-card-right">
        <span class="status-badge ${statusClass}">${order.status}</span>
        <span class="payment-chip ${payClass}">${payLabel}</span>
      </div>
    </div>
    <div class="order-card-items">${itemTags}</div>
    <div class="order-card-footer">
      <div>
        <div class="order-total">₹${Math.round(order.total)}</div>
        ${order.estimated_mins ? `<div class="order-est"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>~${order.estimated_mins} mins</div>` : ''}
      </div>
    </div>
    <div class="card-actions">${actionBtns}</div>
  </div>`;
}

function playNewOrderSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [[880,.0,.1],[1100,.12,.1],[880,.24,.1],[1100,.36,.2]].forEach(([f,s,d]) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = f; o.type = 'square';
      g.gain.setValueAtTime(0.15, ctx.currentTime + s);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + s + d);
      o.start(ctx.currentTime + s);
      o.stop(ctx.currentTime + s + d + 0.05);
    });
  } catch(e) {}
}

// Poll every 8 seconds
setInterval(pollNewOrders, 8000);

// ── VIEW RECEIPT MODAL ──
function viewReceipt(orderId) {
  const modal = document.getElementById('receiptModalBackdrop');
  const body  = document.getElementById('receiptModalBody');
  if (!modal || !body) return;
  modal.classList.add('open');
  body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted-fg)">Loading receipt...</div>';

  $.get('/api/order/receipt/' + orderId, function(res) {
    if (!res.order) {
      body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted-fg)">Receipt not found.</div>';
      return;
    }
    const o = res.order;
    const itemsHtml = o.items.map(i => `
      <div class="receipt-modal-item">
        <img class="receipt-modal-img"
          src="${i.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=80'}"
          onerror="this.src='https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&q=80'"/>
        <div class="receipt-modal-name">${i.name}${i.note ? `<div style="font-size:.68rem;color:var(--muted-fg);font-style:italic">${i.note}</div>` : ''}</div>
        <div class="receipt-modal-qty">×${i.qty}</div>
        <div class="receipt-modal-price">₹${Math.round(i.price * i.qty)}</div>
      </div>`).join('');

    body.innerHTML = `
      <div style="text-align:center;margin-bottom:20px">
        <div style="font-family:var(--font-d);font-size:1.8rem;font-weight:900;
          background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent">
          #${o._id.slice(-6).toUpperCase()}
        </div>
        <div style="font-size:.78rem;color:var(--muted-fg);margin-top:4px">${o.created_at || ''}</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;flex-wrap:wrap">
        <span class="status-badge ${o.status.toLowerCase()}">${o.status}</span>
        <span class="payment-chip ${o.payment_method === 'qr' ? 'upi' : 'cod'}">
          ${o.payment_method === 'qr' ? 'Paid via UPI' : 'Cash on Counter'}
        </span>
      </div>
      <div style="background:var(--secondary);border-radius:var(--radius);padding:12px 14px;margin-bottom:16px;font-size:.82rem">
        <div style="display:flex;justify-content:space-between;color:var(--muted-fg);margin-bottom:4px">
          <span>Customer</span><span style="color:var(--fg);font-weight:600">${o.customer_name || 'Guest'}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--muted-fg)">
          <span>Order Type</span><span style="color:var(--fg);font-weight:600">${(o.order_type || 'dine-in').replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}</span>
        </div>
      </div>
      <div class="receipt-modal-items">${itemsHtml}</div>
      <div style="background:var(--secondary);border-radius:var(--radius);padding:12px 14px;font-size:.82rem">
        <div style="display:flex;justify-content:space-between;color:var(--muted-fg);margin-bottom:5px">
          <span>Subtotal</span><span>₹${Math.round(o.subtotal || o.total)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;color:var(--muted-fg);margin-bottom:8px">
          <span>GST (5%)</span><span>₹${Math.round(o.gst || 0)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-family:var(--font-d);font-weight:800;font-size:1rem;padding-top:8px;border-top:1px solid var(--border)">
          <span style="color:var(--fg)">Total</span>
          <span style="background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent">₹${Math.round(o.total)}</span>
        </div>
      </div>
      ${o.special_instructions ? `
        <div style="margin-top:12px;background:hsl(36,100%,50%/0.06);border:1px solid hsl(36,100%,50%/0.2);border-radius:var(--radius);padding:10px 14px;font-size:.78rem;color:var(--muted-fg)">
          <strong style="color:var(--primary)">Special Instructions:</strong> ${o.special_instructions}
        </div>` : ''}
    `;
  }).fail(function() {
    body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--muted-fg)">Failed to load receipt.</div>';
  });
}

function closeReceiptModal() {
  document.getElementById('receiptModalBackdrop')?.classList.remove('open');
}

// ── MENU ITEM MODAL ──
function openItemModal(id, name, price, category, description, image, veg) {
  const modal = document.getElementById('itemModalBackdrop');
  const title = document.getElementById('itemModalTitle');
  if (!modal) return;

  document.getElementById('editItemId').value  = id    || '';
  document.getElementById('fieldName').value   = name  || '';
  document.getElementById('fieldPrice').value  = price || '';
  document.getElementById('fieldDesc').value   = description || '';
  document.getElementById('fieldImage').value  = image || '';
  document.getElementById('fieldAvailable').checked = true;

  if (title) title.textContent = id ? 'Edit Menu Item' : 'Add Menu Item';

  const catSelect = document.getElementById('fieldCategory');
  if (catSelect && category) {
    for (let i = 0; i < catSelect.options.length; i++) {
      if (catSelect.options[i].value === category) {
        catSelect.selectedIndex = i;
        break;
      }
    }
  }

  const vegSelect = document.getElementById('fieldVeg');
  if (vegSelect && veg !== undefined) {
    vegSelect.value = veg === 'true' || veg === true ? 'true' : 'false';
  }

  modal.classList.add('open');
}

function closeItemModal() {
  document.getElementById('itemModalBackdrop')?.classList.remove('open');
  document.getElementById('itemForm')?.reset();
  document.getElementById('editItemId').value = '';
}

function saveItem(e) {
  e.preventDefault();
  const id      = document.getElementById('editItemId').value;
  const payload = {
    name:        document.getElementById('fieldName').value.trim(),
    price:       parseFloat(document.getElementById('fieldPrice').value),
    category:    document.getElementById('fieldCategory').value,
    description: document.getElementById('fieldDesc').value.trim(),
    image_url:   document.getElementById('fieldImage').value.trim(),
    available:   document.getElementById('fieldAvailable').checked,
    veg:         document.getElementById('fieldVeg').value === 'true',
  };
  if (id) payload.item_id = id;

  $.ajax({
    url:         id ? '/api/menu/edit' : '/api/menu/add',
    method:      'POST',
    contentType: 'application/json',
    data:        JSON.stringify(payload),
    success: function(res) {
      if (res.success) {
        showToast(id ? 'Item updated!' : 'Item added!', 'success');
        closeItemModal();
        setTimeout(() => location.reload(), 700);
      } else {
        showToast('Failed to save item', 'error');
      }
    },
    error: function() { showToast('Error saving item', 'error'); }
  });
}

// ── DELETE MENU ITEM ──
$(document).on('click', '.del-item-btn', function() {
  const id = $(this).data('id');
  if (!confirm('Delete this menu item?')) return;
  $.ajax({
    url:         '/api/menu/delete',
    method:      'POST',
    contentType: 'application/json',
    data:        JSON.stringify({ item_id: id }),
    success: function(res) {
      if (res.success) {
        const card = document.getElementById('mc-' + id);
        if (card) {
          card.style.transition = 'opacity .3s';
          card.style.opacity    = '0';
          setTimeout(() => card.remove(), 300);
        }
        showToast('Item deleted', 'success');
      }
    }
  });
});

// ── AVAILABILITY TOGGLE ──
$(document).on('change', '.avail-toggle', function() {
  const id        = $(this).data('id');
  const available = $(this).prop('checked');
  $.ajax({
    url:         '/api/menu/toggle',
    method:      'POST',
    contentType: 'application/json',
    data:        JSON.stringify({ item_id: id, available: available }),
    success: function(res) {
      if (res.success) {
        const card = document.getElementById('mc-' + id);
        if (card) card.classList.toggle('unavailable', !available);
        showToast(available ? 'Item available' : 'Item marked sold out', 'success');
      }
    }
  });
});

// ── CLOSE MODALS ON BACKDROP CLICK ──
document.getElementById('itemModalBackdrop')?.addEventListener('click', function(e) {
  if (e.target === this) closeItemModal();
});
document.getElementById('receiptModalBackdrop')?.addEventListener('click', function(e) {
  if (e.target === this) closeReceiptModal();
});