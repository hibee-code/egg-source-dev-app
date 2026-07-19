import { renderSidebar, renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { PoultryAPI, ProductAPI, BookingAPI } from '/assets/js/api.js';
import { Format, Toast } from '/assets/js/utils.js';

let farmId = null;
let farmData = null;
let allProducts = [];
let allBookings = [];
let currentBookingFilter = 'All';

// Get status styling class
const getStatusClass = (status) => {
  switch (status) {
    case 'Confirmed':
    case 'Delivered':
      return 'table-pill--green';
    case 'Pending':
    case 'In Transit':
      return 'table-pill--orange';
    case 'Cancelled':
      return 'table-pill--blue';
    default:
      return 'table-pill--blue';
  }
};

// 1. Render Dashboard inventory overview table (with animated capacity levels)
const renderDashboardInventory = (products) => {
  const table = document.querySelector('#farm-inventory tbody');
  if (!table) return;

  const displayProds = products.slice(0, 5);

  table.innerHTML = displayProds.length
    ? displayProds.map((p) => {
        const status = p.stockQuantity > 20 ? 'IN STOCK' : p.stockQuantity > 0 ? 'LOW STOCK' : 'SOLD OUT';
        const statusClass = status === 'IN STOCK' ? 'table-pill--green' : status === 'LOW STOCK' ? 'table-pill--orange' : 'table-pill--blue';
        
        // Define a reference scale for visual gauge, e.g. 200 crates max
        const maxCapacity = 200;
        const percent = Math.min((p.stockQuantity / maxCapacity) * 100, 100);
        const barColorClass = p.stockQuantity > 20 ? 'progress-bar-fill--green' : p.stockQuantity > 0 ? 'progress-bar-fill--orange' : 'progress-bar-fill--red';

        return `
          <tr>
            <td><strong>${p.productName}</strong></td>
            <td>${p.category || 'Eggs'}</td>
            <td><strong style="color: var(--color-primary);">${Format.currency(p.pricePerCrate)}</strong></td>
            <td>${p.stockQuantity} crates</td>
            <td>
              <div style="font-size: 0.74rem; color: var(--color-text-muted); display:flex; justify-content:space-between; margin-bottom: 2px;">
                <span>${Math.round(percent)}%</span>
                <span>${p.stockQuantity}/${maxCapacity}</span>
              </div>
              <div class="progress-bar-bg">
                <div class="progress-bar-fill ${barColorClass}" style="width: ${percent}%;"></div>
              </div>
            </td>
            <td><span class="table-pill ${statusClass}">${status}</span></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="6" style="color: var(--color-text-muted); padding: 24px 0; text-align: center;">No active products. Go to Product Management to add.</td></tr>';
};

// 2. Render Dashboard customer bookings table (filtered and paginated to first 5)
const renderDashboardBookings = (bookings) => {
  const table = document.querySelector('#farm-bookings-table tbody');
  if (!table) return;

  const filtered = currentBookingFilter === 'All' 
    ? bookings 
    : bookings.filter(b => b.status === currentBookingFilter);

  const displayBookings = filtered.slice(0, 5);

  table.innerHTML = displayBookings.length
    ? displayBookings.map((b) => renderBookingRowMarkup(b)).join('')
    : `<tr><td colspan="8" style="color: var(--color-text-muted); padding: 24px 0; text-align: center;">No bookings matching filter "${currentBookingFilter}".</td></tr>`;

  attachBookingActionListeners(table);
};

// 3. Render Product Listings as Premium Responsive Cards
const renderProductsCards = (products) => {
  const container = document.getElementById('products-cards-container');
  if (!container) return;

  container.innerHTML = products.length
    ? products.map((p) => {
        const status = p.stockQuantity > 20 ? 'IN STOCK' : p.stockQuantity > 0 ? 'LOW STOCK' : 'OUT OF STOCK';
        const badgeClass = p.stockQuantity > 20 ? 'card-badge--in' : p.stockQuantity > 0 ? 'card-badge--low' : 'card-badge--out';
        
        return `
          <div class="modern-product-card">
            <div class="card-img-container">
              <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=400'}" alt="${p.productName}">
              <span class="card-badge ${badgeClass}">${status}</span>
            </div>
            <div class="product-card__body" style="padding: 20px; display: flex; flex-direction: column; gap: 12px; flex-grow: 1;">
              <div style="font-size: 0.78rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; letter-spacing: 0.05em;">${p.category || 'Eggs'}</div>
              <h3 class="product-card__title" style="margin: 0; font-size: 1.15rem; font-weight: 700; color: var(--color-text);">${p.productName}</h3>
              <div style="font-size: 0.86rem; color: var(--color-text-muted);">
                Current Stock: <strong>${p.stockQuantity} crates</strong>
              </div>
              <div class="product-card__price" style="margin-top: auto; padding-top: 12px; border-top: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
                <span>${Format.currency(p.pricePerCrate)}</span>
                <div style="display:flex; gap: 8px;">
                  <button class="btn btn-secondary edit-prod-btn" data-id="${p._id}" style="padding: 6px 12px; font-size: 0.8rem;">Edit</button>
                  <button class="btn btn-ghost delete-prod-btn" data-id="${p._id}" style="padding: 6px 12px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.2);">Delete</button>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')
    : `<div style="grid-column: 1 / -1; color: var(--color-text-muted); padding: 32px 0; text-align: center;">No product listings created yet. Click "Add New Listing" to start.</div>`;

  // Attach Card Edit/Delete Listeners
  container.querySelectorAll('.edit-prod-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = allProducts.find((item) => item._id === btn.dataset.id);
      if (p) {
        document.getElementById('edit-product-id').value = p._id;
        document.getElementById('prod-name').value = p.productName;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-price').value = p.pricePerCrate;
        document.getElementById('prod-stock').value = p.stockQuantity;
        const imgInput = document.getElementById('prod-image');
        const previewImg = document.getElementById('prod-image-preview');
        const previewContainer = document.getElementById('prod-image-preview-container');
        const filenameSpan = document.getElementById('prod-image-filename');
        
        if (p.imageUrl) {
          imgInput.value = p.imageUrl;
          previewImg.src = p.imageUrl;
          previewContainer.classList.remove('hidden');
          filenameSpan.textContent = 'Current product image';
        } else {
          imgInput.value = '';
          previewImg.src = '';
          previewContainer.classList.add('hidden');
          filenameSpan.textContent = 'No file chosen';
        }
        document.getElementById('product-form-title').textContent = 'Edit Product Listing';
        document.getElementById('add-product-panel').classList.remove('hidden');
        document.getElementById('add-product-panel').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  container.querySelectorAll('.delete-prod-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to delete this listing?')) {
        try {
          await ProductAPI.delete(btn.dataset.id);
          Toast.success('Product listing deleted successfully');
          fetchAndRenderData();
        } catch (err) {
          Toast.error(err.message || 'Failed to delete product');
        }
      }
    });
  });
};

// 4. Render Live Stock Inventory list (for inline updates)
const renderInventoryEdit = (products) => {
  const table = document.querySelector('#inventory-edit-table tbody');
  if (!table) return;

  table.innerHTML = products.length
    ? products.map((p) => `
        <tr>
          <td><strong>${p.productName}</strong></td>
          <td>${p.category || 'Eggs'}</td>
          <td><span id="stock-display-${p._id}" style="font-weight: 600;">${p.stockQuantity}</span> crates</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <input type="number" id="stock-input-${p._id}" class="input-field" value="${p.stockQuantity}" style="width: 90px; padding: 6px;" min="0">
              <button class="btn btn-secondary update-stock-btn" data-id="${p._id}" style="padding: 6px 12px; font-size: 0.85rem;">Update</button>
            </div>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="4" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No products in inventory.</td></tr>';

  // Attach Inline Update Listeners
  table.querySelectorAll('.update-stock-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const prodId = btn.dataset.id;
      const val = Number(document.getElementById(`stock-input-${prodId}`).value);
      if (val < 0 || isNaN(val)) {
        Toast.error('Please enter a valid stock quantity');
        return;
      }
      try {
        await ProductAPI.update(prodId, { stockQuantity: val });
        Toast.success('Stock inventory updated');
        document.getElementById(`stock-display-${prodId}`).textContent = val;
        fetchAndRenderData();
      } catch (err) {
        Toast.error(err.message || 'Failed to update stock');
      }
    });
  });
};

// 5. Render Full Booking Requests list
const renderRequestsFull = (bookings) => {
  const table = document.querySelector('#requests-full-table tbody');
  if (!table) return;

  table.innerHTML = bookings.length
    ? bookings.map((b) => renderBookingRowMarkup(b, true)).join('')
    : '<tr><td colspan="9" style="color: var(--color-text-muted); padding: 24px 0; text-align: center;">No customer booking requests found.</td></tr>';

  attachBookingActionListeners(table);
};

// Helper row markup generator
const renderBookingRowMarkup = (b, includeAddress = false) => {
  const isDelivery = b.deliveryMethod === 'delivery';
  const methodLabel = isDelivery ? 'Standard Delivery' : 'Self Pickup';
  const methodClass = isDelivery ? 'table-pill--orange' : 'table-pill--blue';
  const statusClass = getStatusClass(b.status);

  // Dynamic actions based on current order status
  let actionHtml = '';
  if (b.status === 'Pending') {
    actionHtml = `<button class="btn btn-ghost update-status-btn" data-id="${b._id}" data-status="Confirmed" style="color: var(--color-primary); padding: 4px 8px; font-size: 0.8rem;">Confirm</button>`;
  } else if (b.status === 'Confirmed') {
    actionHtml = `<button class="btn btn-ghost update-status-btn" data-id="${b._id}" data-status="In Transit" style="color: var(--color-orange); padding: 4px 8px; font-size: 0.8rem;">Ship</button>`;
  } else if (b.status === 'In Transit') {
    actionHtml = `<button class="btn btn-ghost update-status-btn" data-id="${b._id}" data-status="Delivered" style="color: var(--color-green); padding: 4px 8px; font-size: 0.8rem;">Deliver</button>`;
  } else {
    actionHtml = `<span style="color: var(--color-text-muted); font-size: 0.82rem;">None</span>`;
  }

  const buyerName = b.buyerId 
    ? `${b.buyerId.firstName} ${b.buyerId.lastName}` 
    : b.deliveryAddress?.fullName || 'Guest Buyer';
  
  const buyerPhone = b.buyerId?.phone || b.deliveryAddress?.phone || 'N/A';
  const productName = b.productId?.productName || 'Supply';

  if (includeAddress) {
    let addr = '';
    if (b.deliveryMethod === 'pickup') {
      const farmAddress = farmData 
        ? `${farmData.address || ''}, ${farmData.lga || ''}, ${farmData.state || ''}`.replace(/^,\s*|,\s*$/g, '').trim() 
        : '';
      addr = `Self Pickup (Farm: ${farmAddress || 'Location'})`;
    } else {
      addr = b.deliveryAddress 
        ? `${b.deliveryAddress.street || ''}, ${b.deliveryAddress.city || ''}, ${b.deliveryAddress.state || ''}`
        : 'No delivery address provided';
    }
    return `
      <tr data-booking-id="${b._id}">
        <td><strong style="font-size: 0.8rem; color: var(--color-primary);">${b._id.substring(18)}</strong></td>
        <td>
          <div style="font-weight: 600;">${buyerName}</div>
          <div style="font-size: 0.74rem; color: var(--color-text-muted);">${buyerPhone}</div>
        </td>
        <td>${productName}</td>
        <td>${b.quantity}</td>
        <td style="font-size: 0.82rem; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${addr}</td>
        <td><span class="table-pill ${methodClass}">${methodLabel}</span></td>
        <td><strong style="color: var(--color-primary);">${Format.currency(b.totalAmount)}</strong></td>
        <td><span class="table-pill ${statusClass} status-trigger" data-booking-id="${b._id}" style="cursor: pointer;">${b.status}</span></td>
        <td>${actionHtml}</td>
      </tr>
    `;
  }

  return `
    <tr data-booking-id="${b._id}">
      <td><strong style="font-size: 0.8rem; color: var(--color-primary);">${b._id.substring(18)}</strong></td>
      <td>
        <div style="font-weight: 600;">${buyerName}</div>
        <div style="font-size: 0.74rem; color: var(--color-text-muted);">${buyerPhone}</div>
      </td>
      <td>${productName}</td>
      <td>${b.quantity}</td>
      <td><span class="table-pill ${methodClass}">${methodLabel}</span></td>
      <td><strong style="color: var(--color-primary);">${Format.currency(b.totalAmount)}</strong></td>
      <td><span class="table-pill ${statusClass} status-trigger" data-booking-id="${b._id}" style="cursor: pointer;">${b.status}</span></td>
      <td>${actionHtml}</td>
    </tr>
  `;
};

// Function to show order details in a modal
const showOrderDetailsModal = (bookingId) => {
  const booking = allBookings.find(b => b._id === bookingId);
  if (!booking) return;

  const modal = document.getElementById('order-detail-modal');
  const detailsBody = document.getElementById('modal-order-details-body');
  const actionsContainer = document.getElementById('modal-order-actions');

  if (!modal || !detailsBody || !actionsContainer) return;

  // Render buyer details
  const buyerName = booking.buyerId 
    ? `${booking.buyerId.firstName} ${booking.buyerId.lastName}` 
    : booking.deliveryAddress?.fullName || 'Guest Buyer';
  const buyerPhone = booking.buyerId?.phone || booking.deliveryAddress?.phone || 'N/A';
  const buyerEmail = booking.buyerId?.email || 'N/A';
  const productName = booking.productId?.productName || 'Supply';
  const priceFormatted = Format.currency(booking.totalAmount);

  const address = booking.deliveryAddress 
    ? `${booking.deliveryAddress.street || ''}, ${booking.deliveryAddress.city || ''}, ${booking.deliveryAddress.state || ''}`
    : 'Pickup at Farm';

  detailsBody.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
      <div>
        <label style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Order ID</label>
        <div style="font-weight: 600; color: var(--color-primary);">${booking._id}</div>
      </div>
      <div>
        <label style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Order Total</label>
        <div style="font-weight: 700; color: var(--color-primary); font-size: 1rem;">${priceFormatted}</div>
      </div>
    </div>
    
    <div style="border-top: 1px solid var(--color-border); padding-top: 12px; margin-top: 4px;">
      <label style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700; display: block; margin-bottom: 4px;">Buyer Information</label>
      <div style="font-weight: 600;">${buyerName}</div>
      <div style="font-size: 0.8rem; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 2px; margin-top: 4px;">
        <span>Phone: ${buyerPhone}</span>
        <span>Email: ${buyerEmail}</span>
      </div>
    </div>

    <div style="border-top: 1px solid var(--color-border); padding-top: 12px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        <div>
          <label style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Product</label>
          <div style="font-weight: 600;">${productName}</div>
        </div>
        <div>
          <label style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Quantity</label>
          <div style="font-weight: 600;">${booking.quantity} Crates</div>
        </div>
      </div>
    </div>

    <div style="border-top: 1px solid var(--color-border); padding-top: 12px;">
      <label style="font-size: 0.74rem; text-transform: uppercase; color: var(--color-text-muted); font-weight: 700;">Delivery Option</label>
      <div style="font-weight: 600; margin-top: 2px;">
        ${booking.deliveryMethod === 'delivery' ? 'Standard Delivery' : 'Self Pickup'}
      </div>
      <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-top: 4px;">
        ${address}
      </div>
    </div>
  `;

  // Render Stepper Node highlights
  // Status stages: PENDING, CONFIRMED, SHIPPED, DELIVERED
  const statusMap = {
    'Pending': 'PENDING',
    'Confirmed': 'CONFIRMED',
    'In Transit': 'SHIPPED',
    'Delivered': 'DELIVERED'
  };

  const currentStep = statusMap[booking.status] || 'PENDING';
  const steps = ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];
  const currentIndex = steps.indexOf(currentStep);

  // Set line width
  const progressLine = document.getElementById('stepper-line-progress');
  if (progressLine) {
    if (currentIndex === 0) progressLine.style.width = '0%';
    else if (currentIndex === 1) progressLine.style.width = '33%';
    else if (currentIndex === 2) progressLine.style.width = '66%';
    else if (currentIndex === 3) progressLine.style.width = '100%';
  }

  steps.forEach((step, idx) => {
    const node = document.getElementById(`step-${step}`);
    if (node) {
      node.classList.remove('completed', 'active');
      if (idx < currentIndex) {
        node.classList.add('completed');
      } else if (idx === currentIndex) {
        node.classList.add('active');
      }
    }
  });

  // Render appropriate action buttons in modal bottom
  let actionBtnHtml = '';
  if (booking.status === 'Pending') {
    actionBtnHtml = `
      <button class="btn btn-primary modal-action-btn" data-status="Confirmed" style="padding: 10px 18px; font-size: 0.86rem;">
        Confirm Order
      </button>
    `;
  } else if (booking.status === 'Confirmed') {
    actionBtnHtml = `
      <button class="btn btn-primary modal-action-btn" data-status="In Transit" style="padding: 10px 18px; font-size: 0.86rem; background: var(--color-accent); border-color: var(--color-accent);">
        Ship Order (In Transit)
      </button>
    `;
  } else if (booking.status === 'In Transit') {
    actionBtnHtml = `
      <button class="btn btn-primary modal-action-btn" data-status="Delivered" style="padding: 10px 18px; font-size: 0.86rem; background: var(--color-primary); border-color: var(--color-primary);">
        Mark Delivered
      </button>
    `;
  } else {
    actionBtnHtml = `
      <span style="font-size: 0.86rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 6px;">
        <i data-lucide="check-circle" style="width: 18px; height: 18px; color: var(--color-primary);"></i> Order Completed
      </span>
    `;
  }

  actionsContainer.innerHTML = `
    <button id="modal-cancel-btn" class="btn btn-secondary" style="padding: 10px 18px; font-size: 0.86rem;">Close</button>
    ${booking.status !== 'Delivered' ? actionBtnHtml : actionBtnHtml}
  `;

  // Attach modal click listeners
  const closeBtn = document.getElementById('close-modal-btn');
  const cancelBtn = document.getElementById('modal-cancel-btn');
  const actionBtn = actionsContainer.querySelector('.modal-action-btn');

  const closeModal = () => {
    modal.classList.add('hidden');
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  actionBtn?.addEventListener('click', async () => {
    const nextStatus = actionBtn.dataset.status;
    try {
      await BookingAPI.updateStatus(bookingId, nextStatus);
      Toast.success(`Booking status updated to: ${nextStatus}`);
      closeModal();
      await fetchAndRenderData();
    } catch (err) {
      Toast.error(err.message || 'Failed to update status');
    }
  });

  modal.classList.remove('hidden');
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

// Helper to attach booking transition listeners
const attachBookingActionListeners = (container) => {
  container.querySelectorAll('.update-status-btn').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Prevent row click details trigger!
      const bookingId = btn.dataset.id;
      const nextStatus = btn.dataset.status;
      try {
        await BookingAPI.updateStatus(bookingId, nextStatus);
        Toast.success(`Booking status updated to: ${nextStatus}`);
        fetchAndRenderData();
      } catch (err) {
        Toast.error(err.message || 'Failed to update booking status');
      }
    });
  });

  // Attach click listener on each status trigger to open details modal
  container.querySelectorAll('.status-trigger').forEach((trigger) => {
    trigger.addEventListener('click', (e) => {
      const bookingId = trigger.dataset.bookingId;
      if (bookingId) {
        showOrderDetailsModal(bookingId);
      }
    });
  });
};

// Render Weekly Sales Bar Chart
const renderWeeklySalesChart = (bookings) => {
  const chartContainer = document.getElementById('weekly-sales-chart');
  if (!chartContainer) return;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const last7Days = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    last7Days.push({
      dateString: d.toDateString(),
      dayLabel: days[d.getDay()],
      sales: 0
    });
  }

  // Sum up sales per day
  bookings.forEach((b) => {
    if (b.status === 'Cancelled') return;
    const bDate = new Date(b.createdAt).toDateString();
    const match = last7Days.find(day => day.dateString === bDate);
    if (match) {
      match.sales += b.totalAmount || 0;
    }
  });

  const maxSales = Math.max(...last7Days.map(d => d.sales), 5000); // lower limit map to prevent division by 0

  chartContainer.innerHTML = last7Days.map(day => {
    const percent = Math.min((day.sales / maxSales) * 100, 100);
    return `
      <div class="chart-bar-col">
        <div class="chart-bar-wrapper">
          <div class="chart-tooltip">₦${day.sales.toLocaleString()}</div>
          <div class="chart-bar-fill" style="height: ${percent}%;"></div>
        </div>
        <span style="font-size: 0.74rem; color: var(--color-text-muted); font-weight: 600;">${day.dayLabel}</span>
      </div>
    `;
  }).join('');
};

// Render Recent Activities timeline
const renderRecentActivities = (bookings, products) => {
  const feed = document.getElementById('recent-activities-feed');
  if (!feed) return;

  const activities = [];

  // 1. Add Booking Events
  bookings.slice(0, 3).forEach(b => {
    const time = new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date(b.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' });
    activities.push({
      time: `${date} at ${time}`,
      text: `Order <strong>#${b._id.substring(18)}</strong> changed status to <strong>${b.status}</strong>.`
    });
  });

  // 2. Add Stock Alerts
  products.forEach(p => {
    if (p.stockQuantity === 0) {
      activities.push({
        time: 'Critical Alert',
        text: `Product <strong>${p.productName}</strong> is out of stock!`
      });
    } else if (p.stockQuantity < 20) {
      activities.push({
        time: 'Stock Warning',
        text: `Product <strong>${p.productName}</strong> has low stock (${p.stockQuantity} crates left).`
      });
    }
  });

  if (activities.length === 0) {
    activities.push({
      time: 'Today',
      text: 'No active stock alerts or booking status modifications recorded.'
    });
  }

  feed.innerHTML = activities.slice(0, 4).map(act => `
    <div class="activity-item">
      <div class="activity-marker"></div>
      <span class="activity-time">${act.time}</span>
      <span style="font-size: 0.86rem; color: var(--color-text);">${act.text}</span>
    </div>
  `).join('');
};

// Helper to render Low Stock alert banner
const renderLowStockAlerts = (products) => {
  const banner = document.getElementById('low-stock-alert-banner');
  if (!banner) return;

  const lowStockItems = products.filter(p => p.stockQuantity < 20);
  if (!lowStockItems.length) {
    banner.classList.add('hidden');
    banner.innerHTML = '';
    return;
  }

  const listItemsHtml = lowStockItems.map(p => {
    const qty = p.stockQuantity;
    const qtyText = qty === 0 ? 'Out of Stock' : `${qty} crates left`;
    const badgeColor = qty === 0 ? '#ef4444' : 'var(--color-accent)';
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.86rem; padding: 6px 0; border-bottom: 1px solid rgba(239, 68, 68, 0.08);">
        <span style="font-weight: 600;">${p.productName}</span>
        <span style="color: ${badgeColor}; font-weight: 700;">${qtyText}</span>
      </div>
    `;
  }).join('');

  banner.innerHTML = `
    <div class="card" style="padding: 16px 20px; background: rgba(239, 68, 68, 0.04); border-color: rgba(239, 68, 68, 0.2); border-radius: 12px; display: flex; flex-direction: column; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 8px; color: #dc2626;">
        <i data-lucide="alert-triangle" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
        <strong style="font-size: 0.92rem;">Low Stock Warning:</strong>
      </div>
      <div style="display: flex; flex-direction: column;">
        ${listItemsHtml}
      </div>
    </div>
  `;
  banner.classList.remove('hidden');

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const showSellerSkeletons = () => {
  const table1 = document.querySelector('#farm-inventory tbody');
  const table2 = document.querySelector('#farm-bookings-table tbody');
  const table3 = document.querySelector('#requests-full-table tbody');
  const container = document.getElementById('products-cards-container');

  const getSkeletonRow = (cols) => `
    <tr>
      <td colspan="${cols}">
        <div class="skeleton skeleton-row"></div>
      </td>
    </tr>
  `;

  if (table1) table1.innerHTML = Array(3).fill(0).map(() => getSkeletonRow(6)).join('');
  if (table2) table2.innerHTML = Array(3).fill(0).map(() => getSkeletonRow(8)).join('');
  if (table3) table3.innerHTML = Array(3).fill(0).map(() => getSkeletonRow(9)).join('');

  if (container) {
    container.innerHTML = Array(3).fill(0).map(() => `
      <div class="skeleton-card">
        <div class="skeleton" style="height: 120px; width: 100%; border-radius: var(--radius-card);"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text-short"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `).join('');
  }
};

// 6. Fetch all database data and re-render current views
const fetchAndRenderData = async () => {
  showSellerSkeletons();
  try {
    // 1. Get/Create Poultry Farm details for owner
    const poultriesRes = await PoultryAPI.getAll();
    const ownerId = Auth.getUser()?._id;
    const ownerFarms = (poultriesRes.data?.poultries || []).filter((f) => {
      const fOwnerId = (f.ownerId && typeof f.ownerId === 'object') ? f.ownerId._id : f.ownerId;
      return fOwnerId === ownerId;
    });

    if (!ownerFarms.length) {
      // Owner has no farm - let's prompt them to create one in the Profile tab
      const nameEl = document.getElementById('farm-owner-name');
      if (nameEl) nameEl.textContent = 'Setup Poultry Farm Profile';
      return;
    }

    farmData = ownerFarms[0];
    farmId = farmData._id;

    // Populate Poultry form fields
    document.getElementById('farm-business-name').value = farmData.businessName || '';
    document.getElementById('farm-state').value = farmData.state || '';
    document.getElementById('farm-lga').value = farmData.lga || '';
    document.getElementById('farm-address').value = farmData.address || '';
    document.getElementById('farm-lat').value = farmData.location?.coordinates?.[1] || 0;
    document.getElementById('farm-lng').value = farmData.location?.coordinates?.[0] || 0;
    document.getElementById('farm-description').value = farmData.description || '';

    // 2. Fetch all products belonging to this farm
    const productsRes = await ProductAPI.getAll({ poultryId: farmId });
    allProducts = productsRes.data?.products || [];

    // 3. Fetch all bookings for this farm
    const bookingsRes = await BookingAPI.getFarmBookings();
    allBookings = bookingsRes.data?.bookings || [];

    // 4. Populate dashboard indicators
    const mtdSales = allBookings
      .filter((b) => b.status !== 'Cancelled')
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    
    const activeReqsCount = allBookings.filter(
      (b) => !['Delivered', 'Cancelled'].includes(b.status)
    ).length;

    const totalInventoryUnits = allProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

    const salesValEl = document.getElementById('sales-value');
    const activeReqEl = document.getElementById('active-requests');
    const capacityValEl = document.getElementById('capacity-value');
    const badgeCount = document.getElementById('booking-badge-count');

    if (salesValEl) salesValEl.textContent = Format.currency(mtdSales);
    if (activeReqEl) activeReqEl.textContent = activeReqsCount;
    if (capacityValEl) capacityValEl.textContent = `${totalInventoryUnits} Crates`;
    if (badgeCount) badgeCount.textContent = `${allBookings.length} Bookings`;

    // 5. Render tables and elements
    renderDashboardInventory(allProducts);
    renderDashboardBookings(allBookings);
    renderProductsCards(allProducts);
    renderInventoryEdit(allProducts);
    renderRequestsFull(allBookings);
    renderWeeklySalesChart(allBookings);
    renderRecentActivities(allBookings, allProducts);
    renderLowStockAlerts(allProducts);
  } catch (err) {
    console.error('Error fetching farm dashboard data:', err);
  }
};

// 7. Handle Poultry Farm profile submission
const handleFarmProfileUpdate = async (e) => {
  e.preventDefault();
  const businessName = document.getElementById('farm-business-name').value.trim();
  const state = document.getElementById('farm-state').value.trim();
  const lga = document.getElementById('farm-lga').value.trim();
  const address = document.getElementById('farm-address').value.trim();
  const lat = Number(document.getElementById('farm-lat').value);
  const lng = Number(document.getElementById('farm-lng').value);
  const description = document.getElementById('farm-description').value.trim();

  const payload = {
    businessName,
    state,
    lga,
    address,
    location: {
      type: 'Point',
      coordinates: [lng, lat]
    },
    description
  };

  try {
    if (farmId) {
      await PoultryAPI.update(farmId, payload);
      Toast.success('Poultry farm profile updated successfully');
    } else {
      await PoultryAPI.create(payload);
      Toast.success('Poultry farm profile created successfully');
    }
    fetchAndRenderData();
  } catch (err) {
    Toast.error(err.message || 'Failed to save farm details');
  }
};

const resetProductForm = () => {
  const form = document.getElementById('farm-product-form');
  if (form) form.reset();
  const editId = document.getElementById('edit-product-id');
  if (editId) editId.value = '';
  const imgInput = document.getElementById('prod-image');
  if (imgInput) imgInput.value = '';
  const fileInput = document.getElementById('prod-image-file');
  if (fileInput) fileInput.value = '';
  const filenameSpan = document.getElementById('prod-image-filename');
  if (filenameSpan) filenameSpan.textContent = 'No file chosen';
  const previewImg = document.getElementById('prod-image-preview');
  if (previewImg) previewImg.src = '';
  const previewContainer = document.getElementById('prod-image-preview-container');
  if (previewContainer) previewContainer.classList.add('hidden');
  const title = document.getElementById('product-form-title');
  if (title) title.textContent = 'Create New Listing';
};

// 8. Handle Create/Update Product Listings
const handleProductFormSubmit = async (e) => {
  e.preventDefault();
  const prodId = document.getElementById('edit-product-id').value;
  const productName = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value;
  const pricePerCrate = Number(document.getElementById('prod-price').value);
  const stockQuantity = Number(document.getElementById('prod-stock').value);
  const imageUrl = document.getElementById('prod-image').value.trim() || undefined;

  const payload = {
    productName,
    category,
    pricePerCrate,
    stockQuantity,
    imageUrl,
    poultryId: farmId
  };

  try {
    if (prodId) {
      await ProductAPI.update(prodId, payload);
      Toast.success('Product listing updated successfully');
    } else {
      await ProductAPI.create(payload);
      Toast.success('Product listing created successfully');
    }
    
    // Reset form and hide panel
    resetProductForm();
    document.getElementById('add-product-panel').classList.add('hidden');
    
    fetchAndRenderData();
  } catch (err) {
    Toast.error(err.message || 'Failed to save product listing');
  }
};

// 9. SPA hash routing
const handleTabRouting = () => {
  const hash = window.location.hash.substring(1) || 'dashboard';
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Hide all tabs
  tabContents.forEach((tab) => tab.classList.add('hidden'));

  // Show active tab
  const activeTab = document.getElementById(`tab-${hash}`);
  if (activeTab) {
    activeTab.classList.remove('hidden');
  }

  // Render Sidebar and highlight current tab
  renderSidebar({ role: 'farm', activePage: hash });

  // Attach dynamic hash listeners to sidebar links
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetTab = link.dataset.tab;
      window.location.hash = targetTab;
    });
  });
};

const initPage = async () => {
  const user = Auth.getUser();
  if (!Auth.requireAuth()) return;
  if (!['FARM_OWNER', 'ADMIN'].includes(user.role)) {
    window.location.href = '/pages/dashboard-buyer.html';
    return;
  }

  // Render top navbar layout to show user profile details & avatar dropdown
  renderNavbar();

  const nameEl = document.getElementById('farm-owner-name');
  const roleEl = document.getElementById('farm-owner-role');
  if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
  if (roleEl) roleEl.textContent = user.role.replace('_', ' ');

  handleTabRouting();
  await fetchAndRenderData();

  // Attach Profile update handler
  document.getElementById('poultry-profile-form')?.addEventListener('submit', handleFarmProfileUpdate);

  // Attach Detect Location handler
  document.getElementById('detect-farm-location')?.addEventListener('click', () => {
    if (navigator.geolocation) {
      const btn = document.getElementById('detect-farm-location');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<i class="animate-spin" data-lucide="loader" style="width:14px; height:14px; margin-right:4px;"></i> Detecting...`;
      if (window.lucide) window.lucide.createIcons();

      navigator.geolocation.getCurrentPosition(
        (position) => {
          document.getElementById('farm-lat').value = position.coords.latitude.toFixed(6);
          document.getElementById('farm-lng').value = position.coords.longitude.toFixed(6);
          Toast.success('Location coordinates detected successfully!');
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          if (window.lucide) window.lucide.createIcons();
        },
        (error) => {
          Toast.error(`Geolocation failed: ${error.message}`);
          btn.disabled = false;
          btn.innerHTML = originalHtml;
          if (window.lucide) window.lucide.createIcons();
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    } else {
      Toast.error('Geolocation is not supported by your browser.');
    }
  });

  // Attach Product form handler
  document.getElementById('farm-product-form')?.addEventListener('submit', handleProductFormSubmit);

  // Attach Product Image Picker handlers
  const imageFileInput = document.getElementById('prod-image-file');
  const uploadImageTrigger = document.getElementById('upload-image-trigger');
  const removeImageBtn = document.getElementById('remove-image-btn');
  const prodImageInput = document.getElementById('prod-image');
  const prodImageFilename = document.getElementById('prod-image-filename');
  const prodImagePreview = document.getElementById('prod-image-preview');
  const prodImagePreviewContainer = document.getElementById('prod-image-preview-container');

  uploadImageTrigger?.addEventListener('click', () => {
    imageFileInput?.click();
  });

  imageFileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Toast.error('File size exceeds 5MB limit.');
        imageFileInput.value = '';
        return;
      }
      prodImageFilename.textContent = file.name;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        prodImageInput.value = base64;
        prodImagePreview.src = base64;
        prodImagePreviewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  removeImageBtn?.addEventListener('click', () => {
    if (imageFileInput) imageFileInput.value = '';
    if (prodImageInput) prodImageInput.value = '';
    if (prodImagePreview) prodImagePreview.src = '';
    prodImagePreviewContainer?.classList.add('hidden');
    if (prodImageFilename) prodImageFilename.textContent = 'No file chosen';
  });

  // Add Product Form toggle buttons
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    resetProductForm();
    document.getElementById('add-product-panel').classList.toggle('hidden');
  });

  document.getElementById('quick-action-post')?.addEventListener('click', () => {
    window.location.hash = 'products';
    setTimeout(() => {
      resetProductForm();
      document.getElementById('add-product-panel').classList.remove('hidden');
      document.getElementById('add-product-panel').scrollIntoView({ behavior: 'smooth' });
    }, 100);
  });

  document.getElementById('cancel-product-btn')?.addEventListener('click', () => {
    resetProductForm();
    document.getElementById('add-product-panel').classList.add('hidden');
  });

  // Bind view links
  document.querySelectorAll('.select-tab-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href').substring(1);
      window.location.hash = hash;
    });
  });

  // Attach booking status filter click listeners
  const filterPills = document.querySelectorAll('#booking-status-filters .filter-tab-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentBookingFilter = pill.getAttribute('data-status');
      renderDashboardBookings(allBookings);
    });
  });

  // Attach collapsible dashboard section listeners
  const setupCollapsible = (btnId, wrapperId, iconId) => {
    const btn = document.getElementById(btnId);
    const wrapper = document.getElementById(wrapperId);
    const iconSpan = document.getElementById(iconId);

    if (btn && wrapper) {
      btn.addEventListener('click', () => {
        const isHidden = wrapper.classList.toggle('hidden');
        if (iconSpan) {
          iconSpan.innerHTML = isHidden 
            ? `Expand <i data-lucide="chevron-down" style="width:16px; height:16px;"></i>` 
            : `Collapse <i data-lucide="chevron-up" style="width:16px; height:16px;"></i>`;
          if (window.lucide) {
            window.lucide.createIcons();
          }
        }
      });
    }
  };

  setupCollapsible('toggle-weekly-chart-btn', 'weekly-sales-chart-wrapper', 'chart-toggle-icon');
  setupCollapsible('toggle-inventory-health-btn', 'inventory-health-wrapper', 'inventory-toggle-icon');
  setupCollapsible('toggle-recent-events-btn', 'recent-activities-wrapper', 'events-toggle-icon');

};

window.addEventListener('hashchange', handleTabRouting);
window.addEventListener('DOMContentLoaded', initPage);
