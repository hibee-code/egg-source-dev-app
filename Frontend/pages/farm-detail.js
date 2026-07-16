import { renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { PoultryAPI, ProductAPI, BookingAPI } from '/assets/js/api.js';
import { Format, Loading, Toast, $ } from '/assets/js/utils.js';

let selectedMethod = 'delivery';
let farmData = null;
let products = [];
let selectedProduct = null;

const renderFulfillmentOptions = () => {
  const cards = document.querySelectorAll('.option-card');
  const deliveryWrapper = document.getElementById('delivery-fields-wrapper');
  const addressInput = document.getElementById('customer-address');
  const cityInput = document.getElementById('customer-city');
  const stateInput = document.getElementById('customer-state');

  const updateFieldsVisibility = (method) => {
    if (method === 'delivery') {
      deliveryWrapper?.classList.remove('hidden');
      if (addressInput) addressInput.required = true;
      if (cityInput) cityInput.required = true;
      if (stateInput) stateInput.required = true;
    } else {
      deliveryWrapper?.classList.add('hidden');
      if (addressInput) { addressInput.required = false; addressInput.value = ''; }
      if (cityInput) { cityInput.required = false; cityInput.value = ''; }
      if (stateInput) { stateInput.required = false; stateInput.value = ''; }
      const zipInput = document.getElementById('customer-zip');
      if (zipInput) zipInput.value = '';
    }
  };

  cards.forEach((card) => {
    const input = card.querySelector('input');
    const activeBadge = card.querySelector('.active-badge');
    
    // Initial state setup
    if (input?.checked) {
      card.classList.add('active');
      card.style.borderColor = 'var(--color-primary)';
      card.style.background = 'rgba(31, 77, 10, 0.04)';
      if (activeBadge) activeBadge.style.display = 'grid';
      selectedMethod = input.value;
      updateFieldsVisibility(selectedMethod);
    } else {
      card.classList.remove('active');
      card.style.borderColor = 'var(--color-border)';
      card.style.background = 'var(--color-card)';
      if (activeBadge) activeBadge.style.display = 'none';
    }

    card.addEventListener('click', () => {
      if (input) {
        input.checked = true;
        selectedMethod = input.value;
        
        cards.forEach((item) => {
          const itemInput = item.querySelector('input');
          const itemBadge = item.querySelector('.active-badge');
          const isCurrent = item === card;
          item.classList.toggle('active', isCurrent);
          item.style.borderColor = isCurrent ? 'var(--color-primary)' : 'var(--color-border)';
          item.style.background = isCurrent ? 'rgba(31, 77, 10, 0.04)' : 'var(--color-card)';
          if (itemBadge) itemBadge.style.display = isCurrent ? 'grid' : 'none';
        });

        updateFieldsVisibility(selectedMethod);
        updateSummary();
      }
    });
  });
};

const renderProductsList = () => {
  const list = document.getElementById('detail-product-list');
  if (!list) return;
  if (!products.length) {
    list.innerHTML = `<div class="card" style="padding: 28px; color: var(--color-text-muted); grid-column: 1 / -1;">No active products available.</div>`;
    return;
  }

  list.innerHTML = products.map((product) => {
    const isSelected = selectedProduct && selectedProduct._id === product._id;
    return `
      <div class="product-card select-product-item ${isSelected ? 'selected' : ''}" data-id="${product._id}" style="cursor: pointer; border: 2px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}; padding: 12px; border-radius: 8px;">
        <div class="product-card__image" style="height: 120px; overflow: hidden; border-radius: 6px; margin-bottom: 8px;">
          <img src="${product.imageUrl || 'https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=900'}" alt="${product.productName}" style="width: 100%; height: 100%; object-fit: cover;" />
        </div>
        <div class="product-card__body">
          <div class="badge-pill badge-pill--muted">${product.category || 'Product'}</div>
          <h4 class="product-card__title" style="margin: 6px 0 2px;">${product.productName}</h4>
          <div class="product-card__price" style="font-weight: bold; color: var(--color-primary);">${Format.currency(product.pricePerCrate)}</div>
          <span class="chip ${product.isAvailable && product.stockQuantity > 0 ? 'chip--success' : 'chip--muted'}">
            ${product.isAvailable && product.stockQuantity > 0 ? `In stock (${product.stockQuantity} crates)` : 'Out of stock'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  // Add click listeners to product items
  document.querySelectorAll('.select-product-item').forEach((item) => {
    item.addEventListener('click', () => {
      const productId = item.dataset.id;
      selectedProduct = products.find(p => p._id === productId);
      
      // Update selected class
      document.querySelectorAll('.select-product-item').forEach(el => {
        el.classList.toggle('selected', el.dataset.id === productId);
        el.style.borderColor = el.dataset.id === productId ? 'var(--color-primary)' : 'var(--color-border)';
      });

      const selNameEl = document.getElementById('selected-product-name');
      if (selNameEl) {
        selNameEl.textContent = `Selected: ${selectedProduct.productName} (${Format.currency(selectedProduct.pricePerCrate)}/crate)`;
      }

      updateSummary();
    });
  });
};

const updateSummary = () => {
  if (!selectedProduct) {
    document.getElementById('summary-subtotal').textContent = Format.currency(0);
    document.getElementById('summary-shipping').textContent = Format.currency(0);
    document.getElementById('summary-service').textContent = Format.currency(0);
    document.getElementById('summary-total').textContent = Format.currency(0);
    return;
  }

  const quantity = Number(document.getElementById('booking-quantity')?.value || 1);
  const price = Number(selectedProduct.pricePerCrate || 0);
  const subtotal = quantity * price;
  const shipping = selectedMethod === 'delivery' ? 1500 : 0;
  const serviceFee = Math.round((subtotal + shipping) * 0.025);
  const total = subtotal + shipping + serviceFee;

  document.getElementById('summary-subtotal').textContent = Format.currency(subtotal);
  document.getElementById('summary-shipping').textContent = Format.currency(shipping);
  document.getElementById('summary-service').textContent = Format.currency(serviceFee);
  document.getElementById('summary-total').textContent = Format.currency(total);
};

const submitBooking = async (event) => {
  if (event) event.preventDefault();

  if (!selectedProduct) {
    Toast.error('Please select a product first');
    return;
  }

  const user = Auth.getUser();
  const quantity = Number(document.getElementById('booking-quantity').value) || 1;
  
  if (quantity > selectedProduct.stockQuantity) {
    Toast.error(`Only ${selectedProduct.stockQuantity} crates of this product are in stock.`);
    return;
  }

  const btn = document.getElementById('booking-submit');
  Loading.show(btn, 'Confirming...');

  try {
    const payload = {
      productId: selectedProduct._id,
      quantity,
      deliveryMethod: selectedMethod,
      deliveryAddress: {
        fullName: document.getElementById('customer-name').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        street: document.getElementById('customer-address').value.trim() || 'Self Pickup At Farm',
        city: document.getElementById('customer-city').value.trim() || 'N/A',
        state: document.getElementById('customer-state').value.trim() || 'N/A',
        zip: document.getElementById('customer-zip').value.trim() || 'N/A',
      }
    };

    await BookingAPI.create(payload);
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
  
  const user = Auth.getUser();
  
  // Pre-fill form if logged in
  if (user) {
    const nameEl = document.getElementById('customer-name');
    const phoneEl = document.getElementById('customer-phone');
    if (nameEl) nameEl.value = `${user.firstName} ${user.lastName}`;
    if (phoneEl) phoneEl.value = user.phone || '';
  }

  const farmId = new URLSearchParams(window.location.search).get('farmId');
  if (!farmId) {
    const detailContent = document.getElementById('detail-content');
    if (detailContent) {
      detailContent.innerHTML = '<div class="card" style="padding: 28px; color: var(--color-accent);">Farm not found.</div>';
    }
    return;
  }

  const loadingEl = document.getElementById('detail-loading');
  if (loadingEl) loadingEl.classList.remove('hidden');

  try {
    const result = await PoultryAPI.getById(farmId);
    farmData = result.data.poultry;
    const productsRes = await ProductAPI.getAll({ poultryId: farmId });
    products = productsRes.data?.products || [];

    const photoEl = document.getElementById('detail-photo');
    const nameEl = document.getElementById('detail-name');
    const locationEl = document.getElementById('detail-location');
    const statusEl = document.getElementById('detail-status');
    const responseEl = document.getElementById('detail-response');
    const breadcrumbNameEl = document.getElementById('breadcrumb-farm-name');

    if (photoEl) photoEl.src = farmData.imageUrl || 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&q=80&w=1200';
    if (nameEl) nameEl.textContent = farmData.businessName;
    if (breadcrumbNameEl) breadcrumbNameEl.textContent = farmData.businessName;
    if (locationEl) locationEl.textContent = `${farmData.address || 'Address unavailable'}, ${farmData.lga || ''}, ${farmData.state || ''}`;
    if (statusEl) statusEl.textContent = farmData.verified ? '✓ Verified Seller' : 'Verified Seller';
    if (responseEl) responseEl.textContent = farmData.rating ? `Est. Response ${farmData.rating}/5` : 'Est. Response 24 hrs';

    // Auto-select first product if available
    if (products.length > 0) {
      selectedProduct = products[0];
      const selNameEl = document.getElementById('selected-product-name');
      if (selNameEl) {
        selNameEl.textContent = `Selected: ${selectedProduct.productName} (${Format.currency(selectedProduct.pricePerCrate)}/crate)`;
      }
    }

    renderProductsList();
    updateSummary();
  } catch (err) {
    const detailContent = document.getElementById('detail-content');
    if (detailContent) {
      detailContent.innerHTML = `<div class="card" style="padding: 28px; color: var(--color-accent);">${err.message || 'Unable to load farm details.'}</div>`;
    }
  } finally {
    if (loadingEl) loadingEl.classList.add('hidden');
  }

  // Quantity buttons logic
  const qtyInput = document.getElementById('booking-quantity');
  const minusBtn = document.getElementById('qty-minus');
  const plusBtn = document.getElementById('qty-plus');

  minusBtn?.addEventListener('click', () => {
    let currentVal = Number(qtyInput.value) || 1;
    if (currentVal > 1) {
      qtyInput.value = currentVal - 1;
      updateSummary();
    }
  });

  plusBtn?.addEventListener('click', () => {
    let currentVal = Number(qtyInput.value) || 1;
    qtyInput.value = currentVal + 1;
    updateSummary();
  });

  document.getElementById('booking-quantity')?.addEventListener('input', updateSummary);
  
  // Hook up Confirm Booking button in sticky panel to form submission
  document.getElementById('booking-submit')?.addEventListener('click', (e) => {
    e.preventDefault();
    const form = document.getElementById('detail-booking-form');
    if (form) {
      if (form.checkValidity()) {
        submitBooking(e);
      } else {
        form.reportValidity();
      }
    }
  });

  document.getElementById('detail-booking-form')?.addEventListener('submit', submitBooking);

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.addEventListener('DOMContentLoaded', initPage);
