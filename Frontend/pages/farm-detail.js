import { renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { PoultryAPI, ProductAPI, BookingAPI } from '/assets/js/api.js';
import { Format, Loading, Toast, $ } from '/assets/js/utils.js';

const detailSelector = (selector) => $(selector);
let selectedMethod = 'delivery';
let farmData = null;
let products = [];

const renderFulfillmentOptions = () => {
  const cards = document.querySelectorAll('.option-card');
  cards.forEach((card) => {
    const input = card.querySelector('input');
    card.classList.toggle('active', input?.checked);
    card.addEventListener('click', () => {
      if (input) {
        input.checked = true;
        selectedMethod = input.value;
        cards.forEach((item) => item.classList.toggle('active', item === card));
        detailSelector('#fulfillment-method').textContent = selectedMethod === 'delivery' ? 'Standard Delivery' : 'Self Pickup';
      }
    });
  });
};

const renderProducts = (farmId) => {
  const list = $('#detail-product-list');
  if (!list) return;
  if (!products.length) {
    list.innerHTML = `<div class="card" style="padding: 28px; color: var(--color-text-muted);">No active products available.</div>`;
    return;
  }

  list.innerHTML = products.map((product) => `
    <div class="product-card">
      <div class="product-card__image"><img src="${product.imageUrl || 'https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=900'}" alt="${product.productName}" /></div>
      <div class="product-card__body">
        <div class="badge-pill badge-pill--muted">${product.category || 'Product'}</div>
        <h3 class="product-card__title">${product.productName}</h3>
        <div class="product-card__meta">Price per crate</div>
        <div class="product-card__price">${Format.currency(product.pricePerCrate)}</div>
        <span class="chip ${product.isAvailable ? 'chip--success' : 'chip--muted'}">${product.isAvailable ? 'In stock' : 'Unavailable'}</span>
      </div>
    </div>
  `).join('');
};

const updateSummary = () => {
  const quantity = Number($('#booking-quantity')?.value || 1);
  const price = Number(products[0]?.pricePerCrate || 0);
  const subtotal = quantity * price;
  const shipping = selectedMethod === 'delivery' ? 1500 : 0;
  const serviceFee = Math.round((subtotal + shipping) * 0.025);
  const total = subtotal + shipping + serviceFee;

  $('#summary-subtotal').textContent = Format.currency(subtotal);
  $('#summary-shipping').textContent = Format.currency(shipping);
  $('#summary-service').textContent = Format.currency(serviceFee);
  $('#summary-total').textContent = Format.currency(total);
};

const submitBooking = async (event) => {
  event.preventDefault();
  const btn = $('#booking-submit');
  Loading.show(btn, 'Confirming...');
  const user = Auth.getUser();

  try {
    const payload = {
      bookingId: `BK-${Date.now()}`,
      farmId: farmData._id,
      farmName: farmData.businessName,
      productName: products[0]?.productName || 'Poultry Supply',
      quantity: Number($('#booking-quantity').value) || 1,
      deliveryMethod: selectedMethod,
      subtotal: Number($('#summary-subtotal').textContent.replace(/[^0-9]/g, '')) || 0,
      shipping: Number($('#summary-shipping').textContent.replace(/[^0-9]/g, '')) || 0,
      total: Number($('#summary-total').textContent.replace(/[^0-9]/g, '')) || 0,
      buyerName: $('#customer-name').value.trim(),
      buyerEmail: user?.email || '',
      buyerPhone: $('#customer-phone').value.trim(),
      buyerAddress: $('#customer-address').value.trim(),
      createdAt: new Date().toISOString(),
    };
    await BookingAPI.save(payload);
    Toast.success('Booking confirmed. Redirecting to dashboard...');
    setTimeout(() => {
      window.location.href = '/pages/dashboard-buyer.html';
    }, 1200);
  } catch (err) {
    Toast.error(err.message || 'Booking failed');
  } finally {
    Loading.hide(btn);
  }
};

const initPage = async () => {
  if (!Auth.requireAuth()) return;
  renderNavbar();
  renderFulfillmentOptions();
  const farmId = new URLSearchParams(window.location.search).get('farmId');
  if (!farmId) {
    $('#detail-content').innerHTML = '<div class="card" style="padding: 28px; color: var(--color-accent);">Farm not found.</div>';
    return;
  }

  $('#detail-loading').classList.remove('hidden');
  try {
    const result = await PoultryAPI.getById(farmId);
    farmData = result.data.poultry;
    const productsRes = await ProductAPI.getAll({ poultryId: farmId });
    products = productsRes.data?.products || [];

    $('#detail-photo').src = farmData.imageUrl || 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=1200';
    $('#detail-name').textContent = farmData.businessName;
    $('#detail-location').textContent = `${farmData.address || 'Address unavailable'}, ${farmData.lga || ''}, ${farmData.state || ''}`;
    $('#detail-status').textContent = farmData.verified ? '✓ Verified Seller' : 'Verified Seller';
    $('#detail-response').textContent = farmData.rating ? `Est. Response ${farmData.rating}/5` : 'Est. Response 24 hrs';
    $('#detail-delivery-method').textContent = selectedMethod === 'delivery' ? 'Standard Delivery' : 'Self Pickup';

    renderProducts(farmId);
    updateSummary();
  } catch (err) {
    $('#detail-content').innerHTML = `<div class="card" style="padding: 28px; color: var(--color-accent);">${err.message || 'Unable to load farm details.'}</div>`;
  } finally {
    $('#detail-loading').classList.add('hidden');
  }

  $('#booking-quantity')?.addEventListener('input', updateSummary);
  $('#detail-booking-form')?.addEventListener('submit', submitBooking);
};

window.addEventListener('DOMContentLoaded', initPage);
