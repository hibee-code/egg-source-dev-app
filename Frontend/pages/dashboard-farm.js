import { renderSidebar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { PoultryAPI, ProductAPI, BookingAPI } from '/assets/js/api.js';
import { Format, Toast } from '/assets/js/utils.js';

let farmId = null;
let farmData = null;
let allProducts = [];
let allBookings = [];

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

// 1. Render Dashboard inventory overview table
const renderDashboardInventory = (products) => {
  const table = document.querySelector('#farm-inventory tbody');
  if (!table) return;

  const displayProds = products.slice(0, 5);

  table.innerHTML = displayProds.length
    ? displayProds.map((p) => {
        const status = p.stockQuantity > 20 ? 'IN STOCK' : p.stockQuantity > 0 ? 'LOW STOCK' : 'SOLD OUT';
        const statusClass = status === 'IN STOCK' ? 'table-pill--green' : status === 'LOW STOCK' ? 'table-pill--orange' : 'table-pill--blue';
        return `
          <tr>
            <td><strong>${p.productName}</strong></td>
            <td>${p.category || 'Eggs'}</td>
            <td>${p.stockQuantity} crates</td>
            <td>${Format.currency(p.pricePerCrate)}</td>
            <td><span class="table-pill ${statusClass}">${status}</span></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No active products. Go to Product Management to add.</td></tr>';
};

// 2. Render Dashboard customer bookings table (first 5)
const renderDashboardBookings = (bookings) => {
  const table = document.querySelector('#farm-bookings-table tbody');
  if (!table) return;

  const displayBookings = bookings.slice(0, 5);

  table.innerHTML = displayBookings.length
    ? displayBookings.map((b) => renderBookingRowMarkup(b)).join('')
    : '<tr><td colspan="8" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No customer bookings found.</td></tr>';

  attachBookingActionListeners(table);
};

// 3. Render Product Management listing table
const renderProductsManagement = (products) => {
  const table = document.querySelector('#products-management-table tbody');
  if (!table) return;

  table.innerHTML = products.length
    ? products.map((p) => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:10px;">
              <img src="${p.imageUrl || 'https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=100'}" style="width:36px; height:36px; border-radius:4px; object-fit:cover;">
              <strong>${p.productName}</strong>
            </div>
          </td>
          <td>${p.category || 'Eggs'}</td>
          <td>${p.stockQuantity} crates</td>
          <td>${Format.currency(p.pricePerCrate)}</td>
          <td>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-ghost edit-prod-btn" data-id="${p._id}" style="color: var(--color-primary); padding: 4px 8px;">Edit</button>
              <button class="btn btn-ghost delete-prod-btn" data-id="${p._id}" style="color: var(--color-accent); padding: 4px 8px;">Delete</button>
            </div>
          </td>
        </tr>
      `).join('')
    : '<tr><td colspan="5" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No product listings created yet.</td></tr>';

  // Attach Edit/Delete Listeners
  table.querySelectorAll('.edit-prod-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = allProducts.find((item) => item._id === btn.dataset.id);
      if (p) {
        document.getElementById('edit-product-id').value = p._id;
        document.getElementById('prod-name').value = p.productName;
        document.getElementById('prod-category').value = p.category;
        document.getElementById('prod-price').value = p.pricePerCrate;
        document.getElementById('prod-stock').value = p.stockQuantity;
        document.getElementById('prod-image').value = p.imageUrl || '';
        document.getElementById('product-form-title').textContent = 'Edit Product Listing';
        document.getElementById('add-product-panel').classList.remove('hidden');
        document.getElementById('add-product-panel').scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  table.querySelectorAll('.delete-prod-btn').forEach((btn) => {
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
    : '<tr><td colspan="9" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No customer booking requests found.</td></tr>';

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
    actionHtml = `<button class="btn btn-ghost update-status-btn" data-id="${b._id}" data-status="Confirmed" style="color: var(--color-primary); padding: 4px 8px;">Confirm</button>`;
  } else if (b.status === 'Confirmed') {
    actionHtml = `<button class="btn btn-ghost update-status-btn" data-id="${b._id}" data-status="In Transit" style="color: var(--color-orange); padding: 4px 8px;">Ship</button>`;
  } else if (b.status === 'In Transit') {
    actionHtml = `<button class="btn btn-ghost update-status-btn" data-id="${b._id}" data-status="Delivered" style="color: var(--color-green); padding: 4px 8px;">Deliver</button>`;
  } else {
    actionHtml = `<span style="color: var(--color-text-muted); font-size: 0.82rem;">None</span>`;
  }

  const buyerName = b.buyerId 
    ? `${b.buyerId.firstName} ${b.buyerId.lastName}` 
    : b.deliveryAddress?.fullName || 'Guest Buyer';
  
  const buyerPhone = b.buyerId?.phone || b.deliveryAddress?.phone || 'N/A';
  const productName = b.productId?.productName || 'Supply';

  if (includeAddress) {
    const addr = b.deliveryAddress 
      ? `${b.deliveryAddress.street || ''}, ${b.deliveryAddress.city || ''}, ${b.deliveryAddress.state || ''}`
      : 'Pickup at Farm';
    return `
      <tr>
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
        <td><span class="table-pill ${statusClass}">${b.status}</span></td>
        <td>${actionHtml}</td>
      </tr>
    `;
  }

  return `
    <tr>
      <td><strong style="font-size: 0.8rem; color: var(--color-primary);">${b._id.substring(18)}</strong></td>
      <td>
        <div style="font-weight: 600;">${buyerName}</div>
        <div style="font-size: 0.74rem; color: var(--color-text-muted);">${buyerPhone}</div>
      </td>
      <td>${productName}</td>
      <td>${b.quantity}</td>
      <td><span class="table-pill ${methodClass}">${methodLabel}</span></td>
      <td><strong style="color: var(--color-primary);">${Format.currency(b.totalAmount)}</strong></td>
      <td><span class="table-pill ${statusClass}">${b.status}</span></td>
      <td>${actionHtml}</td>
    </tr>
  `;
};

// Helper to attach booking transition listeners
const attachBookingActionListeners = (container) => {
  container.querySelectorAll('.update-status-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
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
};

// 6. Fetch all database data and re-render current views
const fetchAndRenderData = async () => {
  try {
    // 1. Get/Create Poultry Farm details for owner
    const poultriesRes = await PoultryAPI.getAll();
    const ownerFarms = (poultriesRes.data?.poultries || []).filter(
      (f) => f.ownerId === Auth.getUser()?._id
    );

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
    if (capacityValEl) capacityValEl.textContent = `${totalInventoryUnits} Units`;
    if (badgeCount) badgeCount.textContent = `${allBookings.length} Bookings`;

    // 5. Render tables
    renderDashboardInventory(allProducts);
    renderDashboardBookings(allBookings);
    renderProductsManagement(allProducts);
    renderInventoryEdit(allProducts);
    renderRequestsFull(allBookings);
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
    document.getElementById('farm-product-form').reset();
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-form-title').textContent = 'Create New Listing';
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

  const nameEl = document.getElementById('farm-owner-name');
  const roleEl = document.getElementById('farm-owner-role');
  if (nameEl) nameEl.textContent = `${user.firstName} ${user.lastName}`;
  if (roleEl) roleEl.textContent = user.role.replace('_', ' ');

  handleTabRouting();
  await fetchAndRenderData();

  // Attach Profile update handler
  document.getElementById('poultry-profile-form')?.addEventListener('submit', handleFarmProfileUpdate);

  // Attach Product form handler
  document.getElementById('farm-product-form')?.addEventListener('submit', handleProductFormSubmit);

  // Add Product Form toggle buttons
  document.getElementById('add-product-btn')?.addEventListener('click', () => {
    document.getElementById('farm-product-form').reset();
    document.getElementById('edit-product-id').value = '';
    document.getElementById('product-form-title').textContent = 'Create New Listing';
    document.getElementById('add-product-panel').classList.toggle('hidden');
  });

  document.getElementById('cancel-product-btn')?.addEventListener('click', () => {
    document.getElementById('add-product-panel').classList.add('hidden');
  });

  // Bind view links
  document.querySelectorAll('.select-tab-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href').substring(1);
      window.location.hash = hash;
    });
  });
};

window.addEventListener('hashchange', handleTabRouting);
window.addEventListener('DOMContentLoaded', initPage);
