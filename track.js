/**
 * Chinnodu Foods - Dedicated Order Tracking Engine
 * Supports URL param lookups (?id=CF-84291 or ?q=9676698427),
 * Sub-millisecond server lookups, offline cache fallback, 
 * live courier status, and client-side tax invoice printing.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTrackingFromUrl();
  displayRecentOrdersQuickChip();
});

// Toast Notification
function showToast(message, duration = 3000) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 1. Check URL parameters for direct tracking links
function initTrackingFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get('id') || params.get('order') || params.get('q');
  if (q) {
    const input = document.getElementById('standalone-track-input');
    if (input) input.value = q;
    executeTrackingLookup(q);
  }
}

// 2. Display recent order chips if available in browser
function displayRecentOrdersQuickChip() {
  const box = document.getElementById('recent-orders-link-box');
  if (!box) return;

  try {
    const cached = localStorage.getItem('cf_orders_cache');
    if (cached) {
      const orders = JSON.parse(cached);
      if (Array.isArray(orders) && orders.length > 0) {
        const latest = orders[orders.length - 1];
        if (latest && latest.id) {
          box.innerHTML = `
            <a href="javascript:void(0)" onclick="selectQuickOrder('${latest.id}')" style="color:var(--accent-gold-hover); font-weight:700; text-decoration:underline;">
              📦 Check my recent order (#${latest.id})
            </a>
          `;
        }
      }
    }
  } catch (e) {}
}

function selectQuickOrder(orderId) {
  const input = document.getElementById('standalone-track-input');
  if (input) input.value = orderId;
  executeTrackingLookup(orderId);
}

// 3. Handle Form Submit
function handleStandaloneTrackSubmit(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('standalone-track-input');
  const query = (input ? input.value : '').trim();
  if (!query) {
    showToast('Please enter an Order ID or 10-digit Phone number');
    return;
  }

  // Update browser URL without reloading so customer can bookmark / copy link
  const newUrl = `${window.location.pathname}?id=${encodeURIComponent(query)}`;
  window.history.replaceState({ path: newUrl }, '', newUrl);

  executeTrackingLookup(query);
}

// 4. Main Lookup Engine
async function executeTrackingLookup(query) {
  const container = document.getElementById('standalone-track-result');
  if (!container) return;

  container.innerHTML = `
    <div style="text-align:center; padding:3rem 1rem; background:#FFFFFF; border-radius:16px; border:1px solid var(--border-color); box-shadow:var(--shadow-sm);">
      <div style="font-size:2.8rem; animation: pulse 1.2s infinite;">📍</div>
      <div style="margin-top:0.75rem; font-weight:700; font-size:1.15rem; color:var(--primary-maroon);">Searching Order Database...</div>
      <div style="font-size:0.85rem; color:var(--text-muted); margin-top:4px;">Connecting to Chinnodu Cloud Kitchen records</div>
    </div>
  `;

  let matchedOrders = [];

  // Query Server API
  try {
    const res = await fetch(`/api/track?q=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        matchedOrders = data.orders;
      }
    }
  } catch (err) {
    console.warn('API lookup encountered network issue, checking browser cache:', err);
  }

  // Fallback to local storage
  if (matchedOrders.length === 0) {
    try {
      const cached = localStorage.getItem('cf_orders_cache');
      if (cached) {
        const localList = JSON.parse(cached);
        const cleanQ = query.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        matchedOrders = localList.filter(o => {
          const cleanId = (o.id || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
          const cleanPhone = (o.customer?.phone || '').replace(/[^0-9]/g, '');
          return cleanId === cleanQ || (cleanPhone.length >= 10 && cleanPhone.endsWith(cleanQ.slice(-10)));
        });
      }
    } catch (err) {}
  }

  // No match
  if (matchedOrders.length === 0) {
    container.innerHTML = `
      <div style="background:#FFFDF7; border:2px solid #FCD34D; border-radius:16px; padding:2rem; text-align:center; box-shadow:var(--shadow-sm);">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>
        <h3 style="color:var(--primary-maroon); font-size:1.25rem; font-family:var(--font-heading); margin-bottom:0.4rem;">
          No Order Found for "${escapeHtml(query)}"
        </h3>
        <p style="font-size:0.92rem; color:var(--text-muted); line-height:1.55; max-width:540px; margin:0 auto 1.25rem;">
          We couldn't locate any order record with this identifier. Please verify your <strong>Order ID</strong> (e.g. <code>CF-84291</code>) or ensure you entered the <strong>10-digit mobile number</strong> used during checkout.
        </p>
        <div style="display:flex; justify-content:center; gap:12px; flex-wrap:wrap;">
          <button type="button" class="btn-outline-gold" onclick="document.getElementById('standalone-track-input').focus(); document.getElementById('standalone-track-input').select();">
            Try Again
          </button>
          <a href="https://wa.me/919676698427?text=Hi%20Chinnodu%20Foods!%20I%20need%20help%20tracking%20my%20order%20${encodeURIComponent(query)}" target="_blank" rel="noopener noreferrer" class="btn-wa-gold" style="font-size:0.88rem; padding:8px 18px; text-decoration:none;">
            <span>💬 Inquire on WhatsApp (+91 96766 98427)</span>
          </a>
        </div>
      </div>
    `;
    return;
  }

  // Render matches
  container.innerHTML = matchedOrders.map(order => renderCustomerTrackCard(order)).join('');
}

// 5. Render Order Progress Card
function renderCustomerTrackCard(order) {
  const steps = [
    { key: 'received', label: 'Order Received', icon: '📝', desc: 'Logged & Verified' },
    { key: 'confirmed', label: 'Kitchen Prepped', icon: '👩‍🍳', desc: 'Fresh Batch Cooking' },
    { key: 'packed', label: 'Aroma-Sealed', icon: '🏺', desc: 'Induction Foil Seal' },
    { key: 'shipped', label: 'Dispatched', icon: '🚚', desc: 'Handed to Courier' },
    { key: 'delivered', label: 'Delivered', icon: '🎉', desc: 'Delightful Ruchulu!' }
  ];

  const statusHierarchy = ['received', 'confirmed', 'packed', 'shipped', 'delivered'];
  let currentIdx = statusHierarchy.indexOf(order.status);
  if (currentIdx === -1) currentIdx = 0;
  if (order.status === 'cancelled') currentIdx = -1;

  const tracking = order.tracking || {};
  const cust = order.customer || {};

  return `
    <div class="track-card-result" style="background:#FFFFFF; border-radius:18px; border:1px solid var(--border-color); box-shadow:var(--shadow-md); padding:28px; margin-bottom:24px;">
      
      <!-- Card Top Header -->
      <div class="track-card-header" style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; border-bottom:1px solid #F0E8DC; padding-bottom:18px; margin-bottom:24px;">
        <div>
          <span class="track-order-id-pill" style="background:#FAF4E9; color:var(--primary-maroon); border:1px solid var(--accent-gold-light); font-weight:800; font-size:1.15rem; padding:4px 14px; border-radius:999px; display:inline-block;">
            #${escapeHtml(order.id)}
          </span>
          <div style="font-size:0.86rem; color:var(--text-muted); margin-top:6px;">
            Placed on ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800; color:var(--primary-maroon); font-size:1.4rem;">₹${order.grandTotal}</div>
          <div style="font-size:0.78rem; color:#059669; font-weight:700; text-transform:uppercase; letter-spacing:0.04em;">
            ⚡ Prepaid UPI Verified
          </div>
        </div>
      </div>

      <!-- Live Visual Progress Stepper -->
      <div class="tracking-stepper">
        ${steps.map((s, idx) => {
          const isDone = currentIdx >= idx;
          const isCurrent = currentIdx === idx;
          return `
            <div class="stepper-step ${isDone ? 'completed' : ''} ${isCurrent ? 'active' : ''}">
              <div class="stepper-node">
                ${isDone ? (isCurrent ? s.icon : '✓') : idx + 1}
              </div>
              <div class="stepper-title">${s.label}</div>
              <div class="stepper-subtitle">${s.desc}</div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Courier / Dispatch Banner -->
      ${tracking.trackingId ? `
        <div class="courier-dispatch-banner" style="background:linear-gradient(135deg, #FFFDF9 0%, #FEF9EE 100%); border:2px solid var(--accent-gold); border-radius:14px; padding:20px; margin:24px 0;">
          <div style="display:flex; align-items:flex-start; gap:16px;">
            <div style="font-size:2.2rem; background:#FAF4E9; border-radius:12px; width:52px; height:52px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
              🚚
            </div>
            <div style="flex:1;">
              <h4 style="font-family:var(--font-heading); color:var(--primary-maroon); font-size:1.15rem; margin:0 0 6px 0;">
                Dispatched via ${escapeHtml(tracking.courier || 'Express Courier')}
              </h4>
              <div style="display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:8px;">
                <span style="font-size:0.92rem; color:var(--text-main);">
                  AWB / Consignment No: <strong>${escapeHtml(tracking.trackingId)}</strong>
                </span>
                <button type="button" class="btn-copy-sm" onclick="navigator.clipboard.writeText('${escapeHtml(tracking.trackingId)}'); showToast('Copied Tracking ID!');" style="background:#FAF4E9; border:1px solid var(--accent-gold); border-radius:6px; padding:3px 10px; font-size:0.78rem; font-weight:700; cursor:pointer; color:var(--primary-maroon);">
                  📋 Copy ID
                </button>
              </div>
              ${(tracking.trackingUrl && /^https?:\/\//i.test(tracking.trackingUrl.trim())) ? `
                <div style="margin-top:10px;">
                  <a href="${escapeHtml(tracking.trackingUrl.trim())}" target="_blank" rel="noopener noreferrer" class="btn-primary" style="display:inline-flex; align-items:center; gap:8px; font-size:0.86rem; padding:8px 18px; text-decoration:none; border-radius:999px;">
                    <span>🌐 Track Live on ${escapeHtml(tracking.courier || 'Courier')} Official Portal &rarr;</span>
                  </a>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      ` : (order.status === 'received' || order.status === 'confirmed' || order.status === 'packed') ? `
        <div style="background:#FAF6EE; border:1px solid var(--border-color); border-radius:12px; padding:18px; margin:22px 0; display:flex; align-items:center; gap:14px;">
          <span style="font-size:2rem;">👩‍🍳</span>
          <div>
            <strong style="color:var(--primary-maroon); font-size:0.98rem; display:block;">Fresh Village Cooking &amp; Aroma-Sealing in Progress!</strong>
            <p style="margin:2px 0 0 0; font-size:0.85rem; color:var(--text-muted); line-height:1.45;">
              Our homemakers are crafting your batch using cold-pressed oils and pure desi cow ghee. Your courier tracking number will be generated immediately upon dispatch.
            </p>
          </div>
        </div>
      ` : ''}

      <!-- Order Details Summary -->
      <div style="background:#FAF8F5; border-radius:12px; padding:18px; margin-bottom:20px; border:1px solid var(--border-subtle);">
        <div style="font-size:0.82rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px;">
          📦 Delivery Destination &amp; Items
        </div>
        <div style="font-size:0.92rem; color:var(--text-main); margin-bottom:6px;">
          <strong>Delivering to:</strong> ${escapeHtml(cust.name || 'Customer')} • ${escapeHtml(cust.city || '')} (${escapeHtml(cust.pincode || '')})
        </div>
        <div style="font-size:0.88rem; color:var(--text-main); line-height:1.5;">
          <strong>Items in Parcel:</strong> ${(order.items || []).map(i => `${escapeHtml(i.name)} [${escapeHtml(i.weight || '')}] × ${i.qty}`).join(' • ')}
        </div>
      </div>

      <!-- Action Buttons: Print Tax Invoice & WhatsApp -->
      <div style="display:flex; justify-content:center; flex-wrap:wrap; gap:12px; margin-top:20px;">
        <button type="button" class="btn-primary" style="font-size:0.9rem; padding:10px 22px; background:linear-gradient(135deg, #15803D, #166534); border:none; border-radius:var(--radius-pill); cursor:pointer; color:#FFFFFF; display:inline-flex; align-items:center; gap:8px; font-weight:700; box-shadow:0 3px 12px rgba(22, 101, 52, 0.25);" onclick="printCustomerInvoice('${escapeHtml(order.id)}')">
          <span>🧾 Print / Download Tax Invoice (PDF)</span>
        </button>

        <a href="https://wa.me/919676698427?text=Namaskaram%20Chinnodu%20Foods!%20I%20have%20a%20question%20regarding%20my%20order%20%23${escapeHtml(order.id)}" target="_blank" rel="noopener noreferrer" class="btn-wa-gold" style="font-size:0.9rem; padding:10px 20px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
          <span>💬 Order Help on WhatsApp</span>
        </a>
      </div>

    </div>
  `;
}

// 6. Tax Invoice Generation & Printing
async function printCustomerInvoice(orderId) {
  let order = null;

  try {
    const res = await fetch(`/api/track?q=${encodeURIComponent(orderId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.orders && data.orders.length > 0) {
        order = data.orders[0];
      }
    }
  } catch (e) {}

  if (!order) {
    try {
      const cached = localStorage.getItem('cf_orders_cache');
      if (cached) {
        const list = JSON.parse(cached);
        order = list.find(o => o.id === orderId);
      }
    } catch (e) {}
  }

  if (!order) {
    showToast('Could not load invoice details for printing');
    return;
  }

  const printBox = document.getElementById('print-container');
  if (!printBox) return;

  const dateStr = new Date(order.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  const cust = order.customer || {};
  const items = order.items || [];
  const tracking = order.tracking || {};

  printBox.innerHTML = `
    <div style="font-family:'Outfit',Arial,sans-serif; max-width:680px; margin:0 auto; padding:24px; color:#1F2937; border:1px solid #E5E7EB; border-radius:12px;">
      
      <!-- Invoice Header -->
      <div style="display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #8B1E0F; padding-bottom:16px; margin-bottom:18px;">
        <div>
          <h1 style="color:#8B1E0F; margin:0; font-size:24px; font-weight:800; font-family:Georgia, serif;">Chinnodu Foods</h1>
          <p style="margin:4px 0 0 0; font-size:12px; color:#6B7280;">chinnodufoods.com • FSSAI Certified Cloud Kitchen</p>
          <p style="margin:2px 0 0 0; font-size:12px; color:#6B7280;">Traditional Andhra Pickles, Sweets &amp; Savouries</p>
          <p style="margin:2px 0 0 0; font-size:12px; color:#6B7280;">Helpline: +91 96766 98427 / 73829 14229</p>
        </div>
        <div style="text-align:right;">
          <h2 style="margin:0; font-size:18px; color:#1F2937; text-transform:uppercase;">Tax Invoice</h2>
          <p style="margin:4px 0 0 0; font-size:13px; font-weight:700; color:#8B1E0F;">Order ID: #${escapeHtml(order.id)}</p>
          <p style="margin:2px 0 0 0; font-size:12px; color:#6B7280;">Date: ${dateStr}</p>
          <p style="margin:2px 0 0 0; font-size:12px; color:#15803D; font-weight:700;">Status: 100% PREPAID (UPI)</p>
        </div>
      </div>

      <!-- Bill To & Courier Info -->
      <div style="display:flex; justify-content:space-between; margin-bottom:20px; font-size:13px; line-height:1.5;">
        <div>
          <strong style="color:#8B1E0F; text-transform:uppercase; font-size:11px;">Billed &amp; Shipped To:</strong>
          <div style="font-weight:700; font-size:14px; margin-top:2px;">${escapeHtml(cust.name || 'Customer')}</div>
          <div>${escapeHtml(cust.city || '')} ${escapeHtml(cust.pincode ? ` - ${cust.pincode}` : '')}</div>
        </div>
        <div style="text-align:right;">
          <strong style="color:#8B1E0F; text-transform:uppercase; font-size:11px;">Dispatch &amp; Courier:</strong>
          <div><strong>Courier:</strong> ${escapeHtml(tracking.courier || 'Express Air Courier')}</div>
          <div><strong>AWB / Tracking:</strong> ${escapeHtml(tracking.trackingId || 'Preparing for Handover')}</div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:13px;">
        <thead>
          <tr style="background:#FAF4E9; border-top:1px solid #E5E7EB; border-bottom:2px solid #8B1E0F;">
            <th style="padding:10px; text-align:left; color:#8B1E0F;">Item Name &amp; Pack Size</th>
            <th style="padding:10px; text-align:center; color:#8B1E0F;">Qty</th>
            <th style="padding:10px; text-align:right; color:#8B1E0F;">Unit Price</th>
            <th style="padding:10px; text-align:right; color:#8B1E0F;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(item => `
            <tr style="border-bottom:1px solid #F3F4F6;">
              <td style="padding:10px;">
                <strong>${escapeHtml(item.name)}</strong>
                <span style="color:#6B7280; font-size:12px;"> [${escapeHtml(item.weight || 'Standard')}]</span>
              </td>
              <td style="padding:10px; text-align:center;">${item.qty}</td>
              <td style="padding:10px; text-align:right;">₹${item.price}</td>
              <td style="padding:10px; text-align:right; font-weight:700;">₹${item.price * item.qty}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Grand Total -->
      <div style="display:flex; justify-content:flex-end; margin-bottom:24px;">
        <div style="width:260px; font-size:13px;">
          <div style="display:flex; justify-content:space-between; padding:4px 0; border-top:2px solid #8B1E0F; font-size:16px; font-weight:800; color:#8B1E0F;">
            <span>Grand Total Paid:</span>
            <span>₹${order.grandTotal}</span>
          </div>
          <div style="font-size:11px; color:#6B7280; text-align:right; margin-top:2px;">(Inclusive of all applicable GST &amp; Packing)</div>
        </div>
      </div>

      <!-- Footer Note -->
      <div style="border-top:1px dashed #D1D5DB; padding-top:14px; text-align:center; font-size:11px; color:#6B7280;">
        <p style="margin:0;">Thank you for choosing Chinnodu Foods! 100% Traditional Village Kitchen Delicacies.</p>
        <p style="margin:4px 0 0 0;">For any support or bulk orders, visit chinnodufoods.com or WhatsApp +91 96766 98427.</p>
      </div>

    </div>
  `;

  printBox.style.display = 'block';
  setTimeout(() => {
    window.print();
    printBox.style.display = 'none';
  }, 250);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
