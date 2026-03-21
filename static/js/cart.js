// ── ORDER TYPE ──
let orderType = 'dine-in';

function setOrderType(type, btn) {
  orderType = type;
  document.querySelectorAll('.ot-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const badge     = document.getElementById('orderTypeBadge');
  const badgeText = document.getElementById('orderTypeBadgeText');
  const sideBadge = document.getElementById('sideOrderTypeBadge');
  const sideText  = document.getElementById('sideOrderTypeText');

  if (type === 'dine-in') {
    if (badge)     badge.className = 'order-type-badge dine';
    if (badgeText) badgeText.textContent = 'Dining at canteen';
    if (sideBadge) sideBadge.className = 'order-type-badge dine';
    if (sideText)  sideText.textContent = 'Dine In — Eat at canteen';
  } else {
    if (badge)     badge.className = 'order-type-badge take';
    if (badgeText) badgeText.textContent = 'Packing to take away';
    if (sideBadge) sideBadge.className = 'order-type-badge take';
    if (sideText)  sideText.textContent = 'Take Away — Collect at counter';
  }
}

// ── SEARCH ──
function initSearch() {
  const searchInput = document.getElementById('menuSearch');
  if (!searchInput) return;
  searchInput.addEventListener('input', function() {
    const query = this.value.trim().toLowerCase();
    document.querySelectorAll('.food-card').forEach(card => {
      const name = card.querySelector('.food-card-name')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.food-card-desc')?.textContent.toLowerCase() || '';
      card.style.display = (!query || name.includes(query) || desc.includes(query)) ? '' : 'none';
    });
  });
}

// ── VEG FILTER ──
let vegFilter = 'all';

function setVegFilter(type, btn) {
  if (vegFilter === type) {
    vegFilter = 'all';
    document.querySelectorAll('.veg-filter-btn').forEach(b => b.classList.remove('active'));
  } else {
    vegFilter = type;
    document.querySelectorAll('.veg-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  applyFilters();
}

// ── CATEGORY FILTER ──
let catFilter = 'All';

function filterCat(cat, btn) {
  catFilter = cat;
  document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}

function applyFilters() {
  document.querySelectorAll('.food-card').forEach(card => {
    const cardCat = card.dataset.cat;
    const cardVeg = card.dataset.veg;
    const catOk   = (catFilter === 'All' || cardCat === catFilter);
    const vegOk   = (vegFilter === 'all' ||
                    (vegFilter === 'veg'    && cardVeg === 'veg') ||
                    (vegFilter === 'nonveg' && cardVeg === 'nonveg'));
    card.style.display = (catOk && vegOk) ? '' : 'none';
  });
}

// ── CART ──
let cart = {};

function addToCart(btn) {
  if (!document.body.dataset.userId) {
    showLoginPrompt();
    return;
  }
  const id    = btn.dataset.id;
  const name  = btn.dataset.name;
  const price = parseFloat(btn.dataset.price);
  const image = btn.dataset.image || '';

  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = { id, name, price, image, qty: 1, note: '' };
  }

  const ctrl   = document.getElementById('ctrl-' + id);
  const qnum   = document.getElementById('qnum-' + id);
  const addbtn = document.getElementById('addbtn-' + id);
  if (ctrl)   ctrl.classList.add('visible');
  if (qnum)   qnum.textContent = cart[id].qty;
  if (addbtn) addbtn.style.display = 'none';

  updateBubble(id);
  renderCart();
  showToast(name + ' added!', 'success');
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) {
    delete cart[id];
    const ctrl   = document.getElementById('ctrl-' + id);
    const addbtn = document.getElementById('addbtn-' + id);
    const bubble = document.getElementById('bubble-' + id);
    if (ctrl)   ctrl.classList.remove('visible');
    if (addbtn) addbtn.style.display = '';
    if (bubble) bubble.classList.add('hidden');
  } else {
    const qnum = document.getElementById('qnum-' + id);
    if (qnum) qnum.textContent = cart[id].qty;
    updateBubble(id);
  }
  renderCart();
}

function updateBubble(id) {
  const bubble = document.getElementById('bubble-' + id);
  if (!bubble) return;
  const qty = cart[id] ? cart[id].qty : 0;
  bubble.textContent = qty;
  bubble.classList.toggle('hidden', qty === 0);
}

function updateNote(id, note) {
  if (cart[id]) cart[id].note = note;
}

// ── LOGIN PROMPT ──
function showLoginPrompt() {
  const existing = document.getElementById('loginPrompt');
  if (existing) existing.remove();
  const prompt = document.createElement('div');
  prompt.id = 'loginPrompt';
  prompt.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,0.75);
    backdrop-filter:blur(8px);z-index:500;
    display:flex;align-items:center;justify-content:center;
    padding:20px;animation:fadeIn .2s ease;
  `;
  prompt.innerHTML = `
    <div style="background:var(--card);border:1px solid var(--border);
      border-radius:calc(var(--radius)*1.5);padding:32px;max-width:360px;
      width:100%;text-align:center;animation:scaleIn .3s cubic-bezier(.34,1.56,.64,1)">
      <div style="width:56px;height:56px;border-radius:50%;
        background:hsl(36,100%,50%/0.12);border:1px solid hsl(36,100%,50%/0.2);
        display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2"
          style="width:24px;height:24px">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      </div>
      <h2 style="font-family:var(--font-d);font-size:1.3rem;font-weight:800;
        margin-bottom:8px;color:var(--fg)">Login Required</h2>
      <p style="font-size:.85rem;color:var(--muted-fg);margin-bottom:24px;line-height:1.5">
        Please login or register to add items and place orders.
      </p>
      <div style="display:flex;gap:10px">
        <a href="/auth?tab=login"
          style="flex:1;padding:12px;border-radius:var(--radius);
          background:var(--secondary);border:1px solid var(--border);
          color:var(--fg);font-family:var(--font-d);font-weight:700;
          font-size:.88rem;text-decoration:none;
          display:flex;align-items:center;justify-content:center">
          Login
        </a>
        <a href="/auth?tab=register"
          style="flex:1;padding:12px;border-radius:var(--radius);
          background:var(--grad);border:none;color:var(--primary-fg);
          font-family:var(--font-d);font-weight:700;font-size:.88rem;
          text-decoration:none;display:flex;align-items:center;
          justify-content:center;box-shadow:var(--glow)">
          Register
        </a>
      </div>
      <button onclick="document.getElementById('loginPrompt').remove()"
        style="margin-top:14px;background:none;border:none;
        color:var(--muted-fg);font-size:.8rem;cursor:pointer;
        font-family:var(--font-b)">
        Maybe later
      </button>
    </div>
  `;
  document.body.appendChild(prompt);
  prompt.addEventListener('click', e => {
    if (e.target === prompt) prompt.remove();
  });
}

// ── RENDER CART ──
function renderCart() {
  const items    = Object.values(cart);
  const count    = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gst      = subtotal * 0.05;
  const total    = subtotal + gst;

  // SIDE CART
  const sideItems  = document.getElementById('sideCartItems');
  const sideFooter = document.getElementById('sideCartFooter');
  const countPill  = document.getElementById('cartCountPill');

  if (sideItems) {
    if (items.length === 0) {
      sideItems.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <p>Your cart is empty</p>
          <span>Add items to get started</span>
        </div>`;
      if (sideFooter) sideFooter.style.display = 'none';
    } else {
      sideItems.innerHTML = items.map(i => `
        <div class="cart-item">
          <img class="ci-img" src="${i.image}" alt="${i.name}"
            onerror="this.style.display='none'"/>
          <div class="ci-info">
            <div class="ci-name">${i.name}</div>
            <div class="ci-price">₹${(i.price * i.qty).toFixed(0)}</div>
            <input type="text" placeholder="Add note..."
              value="${i.note || ''}"
              onchange="updateNote('${i.id}', this.value)"
              style="width:100%;margin-top:4px;background:hsl(30,8%,18%);
              border:1px solid var(--border);border-radius:4px;
              padding:3px 8px;color:var(--muted-fg);font-size:.68rem;
              outline:none;font-family:var(--font-b)"/>
          </div>
          <div class="ci-qty">
            <button class="ci-qty-btn" onclick="changeQty('${i.id}',-1)">−</button>
            <span class="ci-qty-num">${i.qty}</span>
            <button class="ci-qty-btn" onclick="changeQty('${i.id}',1)">+</button>
          </div>
        </div>`).join('');
      if (sideFooter) sideFooter.style.display = '';
      const sub   = document.getElementById('sideSubtotal');
      const gstEl = document.getElementById('sideGST');
      const totEl = document.getElementById('sideTotal');
      if (sub)   sub.textContent   = '₹' + subtotal.toFixed(0);
      if (gstEl) gstEl.textContent = '₹' + gst.toFixed(0);
      if (totEl) totEl.textContent = '₹' + total.toFixed(0);
    }
    if (countPill) countPill.textContent = count + ' item' + (count !== 1 ? 's' : '');
  }

  // DRAWER
  const drawerItems  = document.getElementById('drawerItems');
  const drawerFooter = document.getElementById('drawerFooter');
  if (drawerItems) {
    if (items.length === 0) {
      drawerItems.innerHTML = `
        <div class="cart-empty-state">
          <div class="cart-empty-icon-box">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/>
            </svg>
          </div>
          <p>Add items from the menu</p>
        </div>`;
      if (drawerFooter) drawerFooter.style.display = 'none';
    } else {
      drawerItems.innerHTML = items.map(i => `
        <div class="cart-item">
          <img class="ci-img" src="${i.image}" alt="${i.name}"
            onerror="this.style.display='none'"/>
          <div class="ci-info">
            <div class="ci-name">${i.name}</div>
            <div class="ci-price">₹${(i.price * i.qty).toFixed(0)}</div>
            <input type="text" placeholder="Add note..."
              value="${i.note || ''}"
              onchange="updateNote('${i.id}', this.value)"
              style="width:100%;margin-top:4px;background:hsl(30,8%,18%);
              border:1px solid var(--border);border-radius:4px;
              padding:3px 8px;color:var(--muted-fg);font-size:.68rem;
              outline:none;font-family:var(--font-b)"/>
          </div>
          <div class="ci-qty">
            <button class="ci-qty-btn" onclick="changeQty('${i.id}',-1)">−</button>
            <span class="ci-qty-num">${i.qty}</span>
            <button class="ci-qty-btn" onclick="changeQty('${i.id}',1)">+</button>
          </div>
        </div>`).join('');
      if (drawerFooter) drawerFooter.style.display = '';
      const sub   = document.getElementById('drSubtotal');
      const gstEl = document.getElementById('drGST');
      const totEl = document.getElementById('drTotal');
      if (sub)   sub.textContent   = '₹' + subtotal.toFixed(0);
      if (gstEl) gstEl.textContent = '₹' + gst.toFixed(0);
      if (totEl) totEl.textContent = '₹' + total.toFixed(0);
    }
  }

  // MOBILE FAB
  const fab      = document.getElementById('mobileFab');
  const fabBadge = document.getElementById('fabBadge');
  const fabText  = document.getElementById('fabText');
  if (fab) {
    fab.classList.toggle('hidden', count === 0);
    if (fabBadge) fabBadge.textContent = '₹' + total.toFixed(0);
    if (fabText)  fabText.textContent  = count + ' item' + (count !== 1 ? 's' : '');
  }
}

// ── DRAWER OPEN/CLOSE ──
function openDrawer() {
  document.getElementById('orderDrawer')?.classList.add('open');
  document.getElementById('drawerBackdrop')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('orderDrawer')?.classList.remove('open');
  document.getElementById('drawerBackdrop')?.classList.remove('open');
  document.body.style.overflow = '';
}

// ── PLACE ORDER ──
function resetPlaceBtn() {
  const txt  = document.getElementById('placeOrderText');
  const spin = document.getElementById('orderSpinner');
  const btn  = document.getElementById('placeOrderBtn');
  if (txt)  txt.textContent = 'Place Order';
  if (spin) spin.classList.add('hidden');
  if (btn)  btn.disabled = false;
}

function placeOrder() {
  const items = Object.values(cart);
  if (items.length === 0) {
    showToast('Your cart is empty!', 'error');
    return;
  }

  const nameInput = document.getElementById('customerName');
  const name      = nameInput?.value.trim() || '';
  if (!name) {
    if (nameInput) {
      nameInput.focus();
      nameInput.style.borderColor = 'var(--danger)';
    }
    showToast('Please enter your name to continue', 'error');
    return;
  }
  if (nameInput) nameInput.style.borderColor = '';

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gst      = subtotal * 0.05;
  const total    = subtotal + gst;

  const txt  = document.getElementById('placeOrderText');
  const spin = document.getElementById('orderSpinner');
  const btn  = document.getElementById('placeOrderBtn');
  if (txt)  txt.textContent = 'Placing...';
  if (spin) spin.classList.remove('hidden');
  if (btn)  btn.disabled = true;

  $.ajax({
    url:         '/order',
    method:      'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      items: items.map(i => ({
        id:    i.id,
        name:  i.name,
        price: i.price,
        qty:   i.qty,
        image: i.image,
        note:  i.note || '',
      })),
      total:                parseFloat(total.toFixed(2)),
      order_type:           orderType,
      customer_name:        name,
      special_instructions: items.map(i => i.note).filter(Boolean).join(', '),
    }),
    success: function(res) {
      if (!res.success) {
        showToast(res.message || 'Failed to place order', 'error');
        resetPlaceBtn();
        return;
      }
      window.location.href = '/payment/' + res.order_id;
    },
    error: function() {
      showToast('Failed to place order. Try again.', 'error');
      resetPlaceBtn();
    }
  });
}

// ── REORDER ──
function handleReorder() {
  const reorderData = sessionStorage.getItem('reorder_items');
  if (!reorderData) return;
  if (!window.location.search.includes('reorder=1')) return;

  try {
    const items = JSON.parse(reorderData);
    sessionStorage.removeItem('reorder_items');

    setTimeout(function() {
      let added = 0;
      items.forEach(function(item) {
        document.querySelectorAll('.add-btn').forEach(function(btn) {
          if (btn.dataset.name &&
            btn.dataset.name.trim().toLowerCase() ===
            item.name.trim().toLowerCase() &&
            !btn.disabled) {
            for (let i = 0; i < (item.qty || 1); i++) {
              addToCart(btn);
            }
            added++;
          }
        });
      });
      if (added > 0) {
        openDrawer();
        showToast(added + ' item(s) added from previous order!', 'success');
      } else {
        showToast('Some items may no longer be available', 'error');
      }
    }, 1000);
  } catch(e) {
    console.log('Reorder error:', e);
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', function() {
  initSearch();
  handleReorder();
});