import { renderSidebar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { BookingAPI, AuthAPI } from '/assets/js/api.js';
import { Format, Toast } from '/assets/js/utils.js';

let allBookings = [];

const renderDashboardTable = (bookings) => {
  const table = document.querySelector('#buyer-bookings tbody');
  if (!table) return;

  const displayBookings = bookings.slice(0, 5);

  table.innerHTML = displayBookings.length
    ? displayBookings.map((booking) => {
        const statusClass = getStatusClass(booking.status);
        const farmName = booking.poultryId?.businessName || 'Unknown Farm';
        const productName = booking.productId?.productName || 'Eggs';
        return `
          <tr>
            <td>${farmName}</td>
            <td>${productName}</td>
            <td>${booking.quantity} crates</td>
            <td><span class="table-pill ${statusClass}">${booking.status}</span></td>
            <td>
              ${booking.status === 'Pending' 
                ? `<button class="btn btn-ghost cancel-booking-btn" data-id="${booking._id}" style="color: var(--color-accent); padding: 4px 8px;">Cancel</button>` 
                : `<span style="color: var(--color-text-muted); font-size: 0.8rem;">None</span>`}
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="5" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No bookings yet.</td></tr>';

  // Attach cancel listeners
  table.querySelectorAll('.cancel-booking-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to cancel this booking?')) {
        try {
          await BookingAPI.cancel(btn.dataset.id);
          Toast.success('Booking cancelled successfully');
          fetchAndRenderData(); // Refresh all views
        } catch (err) {
          Toast.error(err.message || 'Failed to cancel booking');
        }
      }
    });
  });
};

const renderOrdersTable = (bookings) => {
  const table = document.querySelector('#full-orders-table tbody');
  if (!table) return;

  table.innerHTML = bookings.length
    ? bookings.map((booking) => {
        const statusClass = getStatusClass(booking.status);
        const farmName = booking.poultryId?.businessName || 'Unknown Farm';
        const productName = booking.productId?.productName || 'Eggs';
        return `
          <tr>
            <td><strong style="font-size: 0.82rem; color: var(--color-primary);">${booking._id.substring(18)}</strong></td>
            <td>${farmName}</td>
            <td>${productName}</td>
            <td>${booking.quantity}</td>
            <td><strong style="color: var(--color-primary);">${Format.currency(booking.totalAmount)}</strong></td>
            <td><span class="table-pill ${statusClass}">${booking.status}</span></td>
            <td>
              ${booking.status === 'Pending' 
                ? `<button class="btn btn-ghost cancel-booking-btn" data-id="${booking._id}" style="color: var(--color-accent); padding: 4px 8px;">Cancel</button>` 
                : `<span style="color: var(--color-text-muted); font-size: 0.85rem;">None</span>`}
            </td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="7" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No orders found.</td></tr>';

  // Attach cancel listeners
  table.querySelectorAll('.cancel-booking-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to cancel this order?')) {
        try {
          await BookingAPI.cancel(btn.dataset.id);
          Toast.success('Order cancelled successfully');
          fetchAndRenderData();
        } catch (err) {
          Toast.error(err.message || 'Failed to cancel order');
        }
      }
    });
  });
};

const renderInventoryTable = (bookings) => {
  const table = document.querySelector('#inventory-tracker-table tbody');
  if (!table) return;

  // Group bookings by product ID to track total crates sourced
  const inventoryMap = {};
  bookings.forEach((booking) => {
    // Treat Delivered or Confirmed as valid sourced inventory
    if (['Confirmed', 'In Transit', 'Delivered'].includes(booking.status)) {
      const prodId = booking.productId?._id || booking.productId;
      if (!prodId) return;
      if (!inventoryMap[prodId]) {
        inventoryMap[prodId] = {
          productName: booking.productId?.productName || 'Eggs',
          farmName: booking.poultryId?.businessName || 'Unknown Farm',
          totalQuantity: 0,
          status: booking.status
        };
      }
      inventoryMap[prodId].totalQuantity += booking.quantity;
      // If any is in transit/confirmed, show status accordingly
      if (booking.status === 'In Transit') {
        inventoryMap[prodId].status = 'In Transit';
      }
    }
  });

  const inventoryItems = Object.values(inventoryMap);

  table.innerHTML = inventoryItems.length
    ? inventoryItems.map((item) => {
        const statusClass = getStatusClass(item.status);
        return `
          <tr>
            <td><strong>${item.productName}</strong></td>
            <td>${item.farmName}</td>
            <td>${item.totalQuantity} crates</td>
            <td><span class="table-pill ${statusClass}">${item.status}</span></td>
          </tr>
        `;
      }).join('')
    : '<tr><td colspan="4" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No inventory logged. Complete a booking to see it here.</td></tr>';
};

const renderAnalytics = (bookings) => {
  const nonCancelled = bookings.filter((b) => b.status !== 'Cancelled');
  const totalSpent = nonCancelled.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  const totalCrates = nonCancelled.reduce((sum, b) => sum + (b.quantity || 0), 0);
  const avgCratePrice = totalCrates > 0 ? Math.round(totalSpent / totalCrates) : 0;

  const spentEl = document.getElementById('analytics-total-spent');
  const avgEl = document.getElementById('analytics-avg-crate');
  const cratesEl = document.getElementById('analytics-total-crates');
  
  if (spentEl) spentEl.textContent = Format.currency(totalSpent);
  if (avgEl) avgEl.textContent = Format.currency(avgCratePrice);
  if (cratesEl) cratesEl.textContent = `${totalCrates} Crates`;

  // Animate the bar dynamically in the UI
  const currentBar = document.getElementById('analytics-bar-current');
  if (currentBar) {
    // Map total quantity to heights between 10px and 120px
    const computedHeight = Math.min(120, Math.max(15, totalCrates * 3));
    currentBar.style.height = `${computedHeight}px`;
  }
};

const populateSettingsForm = () => {
  const user = Auth.getUser();
  if (!user) return;

  const firstNameEl = document.getElementById('settings-first-name');
  const lastNameEl = document.getElementById('settings-last-name');
  const emailEl = document.getElementById('settings-email');
  const phoneEl = document.getElementById('settings-phone');

  if (firstNameEl) firstNameEl.value = user.firstName || '';
  if (lastNameEl) lastNameEl.value = user.lastName || '';
  if (emailEl) emailEl.value = user.email || '';
  if (phoneEl) phoneEl.value = user.phone || '';
};

const handleProfileUpdate = async (e) => {
  e.preventDefault();
  const firstName = document.getElementById('settings-first-name').value.trim();
  const lastName = document.getElementById('settings-last-name').value.trim();
  const phone = document.getElementById('settings-phone').value.trim();

  try {
    const res = await AuthAPI.updateProfile({ firstName, lastName, phone });
    // Update local storage credentials
    const currentUser = Auth.getUser();
    const updatedUser = { ...currentUser, firstName, lastName, phone };
    localStorage.setItem('eggsource_user', JSON.stringify(updatedUser));
    
    Toast.success('Profile updated successfully');
    initPage(); // Re-render sidebar & header profile
  } catch (err) {
    Toast.error(err.message || 'Failed to update profile');
  }
};

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

const showTableSkeletons = () => {
  const table1 = document.querySelector('#buyer-bookings tbody');
  const table2 = document.querySelector('#full-orders-table tbody');
  const table3 = document.querySelector('#inventory-tracker-table tbody');

  const getSkeletonRow = (cols) => `
    <tr>
      <td colspan="${cols}">
        <div class="skeleton skeleton-row"></div>
      </td>
    </tr>
  `;

  if (table1) table1.innerHTML = Array(3).fill(0).map(() => getSkeletonRow(5)).join('');
  if (table2) table2.innerHTML = Array(3).fill(0).map(() => getSkeletonRow(7)).join('');
  if (table3) table3.innerHTML = Array(3).fill(0).map(() => getSkeletonRow(4)).join('');
};

const fetchAndRenderData = async () => {
  showTableSkeletons();
  try {
    const res = await BookingAPI.getMyBookings();
    allBookings = res.data?.bookings || [];

    // Update stats cards in Dashboard
    const statsTotal = document.getElementById('stat-total-bookings');
    const statsTransit = document.getElementById('stat-in-transit');
    
    if (statsTotal) statsTotal.textContent = allBookings.length;
    if (statsTransit) {
      const inTransitCount = allBookings.filter((b) => ['Pending', 'In Transit'].includes(b.status)).length;
      statsTransit.textContent = inTransitCount;
    }

    renderDashboardTable(allBookings);
    renderOrdersTable(allBookings);
    renderInventoryTable(allBookings);
    renderAnalytics(allBookings);
  } catch (err) {
    console.error('Error loading dashboard data:', err);
  }
};

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

  // Re-render sidebar to highlight active tab
  renderSidebar({ role: 'buyer', activePage: hash });

  // Re-attach sidebar tab click interceptors
  document.querySelectorAll('[data-tab]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetTab = link.dataset.tab;
      window.location.hash = targetTab;
    });
  });
};

const initPage = async () => {
  if (!Auth.requireAuth()) return;
  
  handleTabRouting();
  await fetchAndRenderData();
  populateSettingsForm();

  // Attach Settings submit handler
  document.getElementById('settings-profile-form')?.addEventListener('submit', handleProfileUpdate);

  // Bind view all link
  document.querySelectorAll('.select-tab-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href').substring(1);
      window.location.hash = hash;
    });
  });
};

window.addEventListener('hashchange', handleTabRouting);
window.addEventListener('DOMContentLoaded', initPage);
