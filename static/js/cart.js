// ── ORDER TYPE ──
let orderType = 'dine-in';
function setOrderType(type, btn) {
  orderType = type;
  document.querySelectorAll('.ot-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ── CATEGORY FILTER ──
function filterCat(cat, btn) {
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.remove('active');
    const pill = b.querySelector('.cat-pill');
    if (pill) pill.remove();
  });
  btn.classList.add('active');
  if (!btn.querySelector('.cat-pill')) {
    const pill = document.createElement('span');
    pill.className = 'cat-pill';
    btn.prepend(pill);
  }
  document.querySelectorAll('.food-card').forEach(card => {
    card.style.display = (cat === 'All' || card.dataset.cat === cat) ? '' : 'none';
  });
}

// ── CART STATE ──
let cart = {};

function addToCart(btn) {
  const id    = btn.dataset.id;
  const name  = btn.dataset.name;
  const price = parseFloat(btn.dataset.price);
  const emoji = btn.dataset.emoji;
  if (cart[id]) {
    cart[id].qty++;
  } else {
    cart[id] = { id, name, price, emoji, qty: 1 };
  }
  updateBubble(id);
  renderCart();
  showToast('Added ' + name + ' to cart', 'success');
}

function updateBubble(id) {
  const bubble = document.getElementById('bubble-' + id);
  if (!bubble) return;
  const qty = cart[id] ? cart[id].qty : 0;
  bubble.textContent = qty;
  bubble.classList.toggle('hidden', qty === 0);
}

function changeQty(id, delta) {
  if (!cart[id]) return;
  cart[id].qty += delta;
  if (cart[id].qty <= 0) delete cart[id];
  updateBubble(id);
  renderCart();
}

function renderCart() {
  const items    = Object.values(cart);
  const count    = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gst      = subtotal * 0.05;
  const total    = subtotal + gst;

  // ── Side cart (desktop) ──
  const sideItems  = document.getElementById('sideCartItems');
  const sideFooter = document.getElementById('sideCartFooter');
  const sideTotal  = document.getElementById('sideTotal');
  const countPill  = document.getElementById('cartCountPill');

  if (sideItems) {
    if (items.length === 0) {
      sideItems.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛍️</div><p>Your cart is empty</p><span>Add items to get started</span></div>';
      if (sideFooter) sideFooter.style.display = 'none';
    } else {
      sideItems.innerHTML = items.map(i => `
        <div class="cart-item">
          <span class="ci-emoji">${i.emoji}</span>
          <div class="ci-info">
            <div class="ci-name">${i.name}</div>
            <div class="ci-price">₹${(i.price * i.qty).toFixed(0)}</div>
          </div>
          <div class="ci-qty">
            <button class="ci-qty-btn" onclick="changeQty('${i.id}',-1)">−</button>
            <span class="ci-qty-num">${i.qty}</span>
            <button class="ci-qty-btn" onclick="changeQty('${i.id}',1)">+</button>
          </div>
        </div>`).join('');
      if (sideFooter) sideFooter.style.display = '';
      if (sideTotal) sideTotal.textContent = '₹' + total.toFixed(0);
    }
    if (countPill) countPill.textContent = count + ' item' + (count !== 1 ? 's' : '');
  }

  // ── Drawer (mobile) ──
  const drawerItems  = document.getElementById('drawerItems');
  const drawerFooter = document.getElementById('drawerFooter');
  if (drawerItems) {
    if (items.length === 0) {
      drawerItems.innerHTML = '<div class="cart-empty"><div class="cart-empty-icon">🛍️</div><p>Add items from the menu</p></div>';
      if (drawerFooter) drawerFooter.style.display = 'none';
    } else {
      drawerItems.innerHTML = items.map(i => `
        <div class="cart-item">
          <span class="ci-emoji">${i.emoji}</span>
          <div class="ci-info">
            <div class="ci-name">${i.name}</div>
            <div class="ci-price">₹${(i.price * i.qty).toFixed(0)}</div>
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

  // ── Mobile FAB ──
  const fab      = document.getElementById('mobileFab');
  const fabBadge = document.getElementById('fabBadge');
  const fabText  = document.getElementById('fabText');
  if (fab) {
    fab.classList.toggle('hidden', count === 0);
    if (fabBadge) fabBadge.textContent = count;
    if (fabText)  fabText.textContent  = '₹' + total.toFixed(0);
  }
}

// ── DRAWER ──
function openDrawer() {
  document.getElementById('orderDrawer').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  document.getElementById('orderDrawer').classList.remove('open');
  document.getElementById('drawerBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

// ── RESET BUTTON ──
function resetPlaceBtn() {
  document.getElementById('placeOrderText').textContent = 'Place Order';
  document.getElementById('orderSpinner').classList.add('hidden');
  document.getElementById('placeOrderBtn').disabled = false;
}

// ── PLACE ORDER + RAZORPAY ──
function placeOrder() {
  const items = Object.values(cart);
  if (items.length === 0) { showToast('Your cart is empty!', 'error'); return; }

  const subtotal     = items.reduce((s, i) => s + i.price * i.qty, 0);
  const gst          = subtotal * 0.05;
  const total        = subtotal + gst;
  const customerName = document.getElementById('customerName')?.value.trim() || 'Guest';

  document.getElementById('placeOrderText').textContent = 'Processing...';
  document.getElementById('orderSpinner').classList.remove('hidden');
  document.getElementById('placeOrderBtn').disabled = true;

  // Step 1 — Save order to DB
  $.ajax({
    url: '/order',
    method: 'POST',
    contentType: 'application/json',
    data: JSON.stringify({
      items: items.map(i => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty, emoji: i.emoji
      })),
      total:         parseFloat(total.toFixed(2)),
      order_type:    orderType,
      customer_name: customerName
    }),
    success: function(res) {
      if (!res.success) {
        showToast(res.message || 'Failed to place order', 'error');
        resetPlaceBtn(); return;
      }
      const orderId = res.order_id;

      // Step 2 — Create Razorpay order
      $.ajax({
        url: '/payment/create',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ order_id: orderId, amount: res.total }),
        success: function(pRes) {
          if (!pRes.success) {
            showToast('Payment setup failed', 'error');
            resetPlaceBtn(); return;
          }

          // Step 3 — Open Razorpay checkout popup
          const options = {
            key:         pRes.key_id,
            amount:      pRes.amount,
            currency:    'INR',
            name:        'SCAN2EAT',
            description: 'Order #' + orderId.slice(-6).toUpperCase(),
            order_id:    pRes.rz_order_id,
            handler: function(response) {
              // Step 4 — Verify payment signature
              $.ajax({
                url: '/payment/verify',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                  order_id:            orderId,
                  razorpay_order_id:   response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature:  response.razorpay_signature,
                }),
                success: function(vRes) {
                  if (vRes.success) {
                    cart = {};
                    renderCart();
                   window.location.href = '/payment/' + orderId;
                  } else {
                    showToast('Payment verification failed', 'error');
                    resetPlaceBtn();
                  }
                },
                error: function() {
                  showToast('Verification error. Contact support.', 'error');
                  resetPlaceBtn();
                }
              });
            },
            prefill: { name: customerName },
            theme:   { color: '#FF9900' },
            modal: {
              ondismiss: function() {
                showToast('Payment cancelled', 'error');
                resetPlaceBtn();
              }
            }
          };

          const rzp = new Razorpay(options);
          rzp.open();
        },
        error: function() {
          showToast('Payment setup failed. Try again.', 'error');
          resetPlaceBtn();
        }
      });
    },
    error: function() {
      showToast('Failed to place order. Try again.', 'error');
      resetPlaceBtn();
    }
  });
}