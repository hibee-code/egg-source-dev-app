import { renderSidebar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { PoultryAPI, ProductAPI, BookingAPI } from '/assets/js/api.js';
import { Format } from '/assets/js/utils.js';

const renderInventoryRow = (product) => {
  const status = product.stockQuantity > 20 ? 'IN STOCK' : product.stockQuantity > 0 ? 'LOW STOCK' : 'SOLD OUT';
  const statusClass = status === 'IN STOCK' ? 'table-pill--green' : status === 'LOW STOCK' ? 'table-pill--orange' : 'table-pill--blue';
  return `
    <tr>
      <td>${product.productName}</td>
      <td>${product.batchId || 'BATCH-01'}</td>
      <td>${product.stockQuantity}</td>
      <td>${Format.currency(product.pricePerCrate)}</td>
      <td><span class="table-pill ${statusClass}">${status}</span></td>
    </tr>
  `;
};

const renderBookingRow = (booking) => {
  const isDelivery = booking.deliveryMethod === 'delivery';
  const methodLabel = isDelivery ? 'Standard Delivery' : 'Self Pickup';
  const methodClass = isDelivery ? 'table-pill--orange' : 'table-pill--blue';

  let statusClass = 'table-pill--blue';
  const status = booking.status || 'Pending Delivery';
  if (status === 'Delivered' || status === 'Completed') {
    statusClass = 'table-pill--green';
  } else if (status === 'Pending Delivery' || status === 'Ready for Pickup') {
    statusClass = 'table-pill--orange';
  }

  return `
    <tr>
      <td><strong style="font-size: 0.88rem; color: var(--color-primary);">${booking.bookingId}</strong></td>
      <td>
        <div style="font-weight: var(--font-weight-semibold);">${booking.buyerName}</div>
        <div style="font-size: 0.78rem; color: var(--color-text-muted);">${booking.buyerPhone}</div>
      </td>
      <td>${booking.productName}</td>
      <td>${booking.quantity}</td>
      <td><span class="table-pill ${methodClass}">${methodLabel}</span></td>
      <td><strong style="color: var(--color-primary);">${Format.currency(booking.total)}</strong></td>
      <td><span class="table-pill ${statusClass}">${status}</span></td>
    </tr>
  `;
};

const initPage = async () => {
  if (!Auth.requireAuth()) return;
  const user = Auth.getUser();
  if (!['FARM_OWNER', 'ADMIN'].includes(user.role)) {
    window.location.href = '/pages/dashboard-buyer.html';
    return;
  }

  renderSidebar({ role: 'farm', activePage: 'dashboard' });
  document.getElementById('farm-owner-name').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('farm-owner-role').textContent = 'Premium Seller';

  try {
    const poultries = await PoultryAPI.getAll();
    const farms = poultries.data?.poultries || [];
    const ownerFarms = farms.filter((farm) => farm.ownerId === user._id);
    const farmIds = ownerFarms.map((farm) => farm._id);
    const productsRes = await ProductAPI.getAll();
    const products = productsRes.data?.products || [];
    const inventory = products.filter((product) => farmIds.includes(product.poultryId));

    const inventoryTable = document.querySelector('#farm-inventory tbody');
    if (inventoryTable) {
      inventoryTable.innerHTML = inventory.length 
        ? inventory.map(renderInventoryRow).join('') 
        : '<tr><td colspan="5" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No inventory items available.</td></tr>';
    }

    // Load Bookings & Delivery
    let bookings = BookingAPI.list() || [];
    let farmBookings = bookings.filter((b) => farmIds.includes(b.farmId));

    // Seed mock bookings relative to this farm for visual demonstration if empty
    if (!farmBookings.length && ownerFarms.length) {
      const demoFarm = ownerFarms[0];
      farmBookings = [
        {
          bookingId: "BK-1782800412",
          farmId: demoFarm._id,
          buyerName: "Funmi Adeniran",
          buyerPhone: "+234 812 345 6789",
          productName: "Fresh Organic Eggs",
          quantity: 25,
          deliveryMethod: "delivery",
          total: 61250,
          status: "Pending Delivery"
        },
        {
          bookingId: "BK-1782800109",
          farmId: demoFarm._id,
          buyerName: "Oluwaseun Alao",
          buyerPhone: "+234 905 111 2222",
          productName: "Fresh Organic Eggs",
          quantity: 10,
          deliveryMethod: "pickup",
          total: 24500,
          status: "Ready for Pickup"
        },
        {
          bookingId: "BK-1782799984",
          farmId: demoFarm._id,
          buyerName: "Chioma Nze",
          buyerPhone: "+234 803 777 8888",
          productName: "Fresh Organic Eggs",
          quantity: 50,
          deliveryMethod: "delivery",
          total: 122500,
          status: "Delivered"
        }
      ];
    }

    const bookingsTable = document.querySelector('#farm-bookings-table tbody');
    const bookingsCount = document.getElementById('booking-badge-count');
    if (bookingsTable) {
      bookingsTable.innerHTML = farmBookings.length 
        ? farmBookings.map(renderBookingRow).join('') 
        : '<tr><td colspan="7" style="color: var(--color-text-muted); padding: 18px 0; text-align: center;">No active bookings found.</td></tr>';
    }
    if (bookingsCount) {
      bookingsCount.textContent = `${farmBookings.length} Bookings`;
    }

    const totalSales = farmBookings.reduce((sum, b) => sum + (b.total || 0), 0);
    document.getElementById('sales-value').textContent = Format.currency(totalSales);
    document.getElementById('active-requests').textContent = farmBookings.filter(b => b.status !== 'Delivered').length;
    document.getElementById('capacity-value').textContent = '82% Capacity';
  } catch (err) {
    console.error(err);
  }
};

window.addEventListener('DOMContentLoaded', initPage);
