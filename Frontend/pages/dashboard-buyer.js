import { renderSidebar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { BookingAPI } from '/assets/js/api.js';
import { Format } from '/assets/js/utils.js';

const renderBookingRow = (booking) => {
  const statusClass = booking.status === 'Confirmed' ? 'table-pill--green' : booking.status === 'Pending' ? 'table-pill--orange' : 'table-pill--blue';
  return `
    <tr>
      <td>${booking.farmName}</td>
      <td>${booking.productName}</td>
      <td>${booking.quantity}</td>
      <td><span class="table-pill ${statusClass}">${booking.status}</span></td>
      <td><button class="btn btn-ghost">⋯</button></td>
    </tr>
  `;
};

const initPage = () => {
  if (!Auth.requireAuth()) return;
  const user = Auth.getUser();
  renderSidebar({ role: 'buyer', activePage: 'dashboard' });

  document.getElementById('profile-name').textContent = `${user.firstName} ${user.lastName}`;
  document.getElementById('profile-role').textContent = user.role.replace('_', ' ');
  document.getElementById('profile-company').textContent = 'EggSource Buyer';
  const profileEmail = document.getElementById('profile-email');
  if (profileEmail) profileEmail.textContent = user.email;

  const bookings = BookingAPI.list().filter((booking) => booking.buyerEmail === user.email);
  const bookingTable = document.querySelector('#buyer-bookings tbody');
  if (bookingTable) {
    bookingTable.innerHTML = bookings.length ? bookings.map(renderBookingRow).join('') : '<tr><td colspan="5" style="color: var(--color-text-muted); padding: 18px 0;">No bookings yet.</td></tr>';
  }

  const statsTotal = document.getElementById('stat-total-bookings');
  const statsTransit = document.getElementById('stat-in-transit');
  const statsPremium = document.getElementById('stat-premium-access');
  if (statsTotal) statsTotal.textContent = bookings.length;
  if (statsTransit) statsTransit.textContent = bookings.filter((b) => b.status === 'Pending').length;
  if (statsPremium) statsPremium.textContent = 'Premium Supplier Access';
};

window.addEventListener('DOMContentLoaded', initPage);
