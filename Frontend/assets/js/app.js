const BASE_URL = window.location.origin;

const authLocal = {
  getAccessToken: () => localStorage.getItem('accessToken'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setTokens: (accessToken, refreshToken) => {
    if (accessToken) localStorage.setItem('accessToken', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  },
  clearTokens: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
  },
};

async function request(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = authLocal.getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      authLocal.clearTokens();
      window.dispatchEvent(new CustomEvent('api-unauthorized'));
    }
    throw new Error(data.message || 'API request failed');
  }

  return data;
}

window.EggSourceAPI = {
  auth: {
    async register(payload) {
      const res = await request('/api/v1/auth/register', {
        method: 'POST',
        body: payload,
      });
      if (res.data?.tokens) {
        authLocal.setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        localStorage.setItem('currentUser', JSON.stringify(res.data.user));
      }
      return res.data;
    },

    async login(payload) {
      const res = await request('/api/v1/auth/login', {
        method: 'POST',
        body: payload,
      });
      if (res.data?.accessToken) {
        authLocal.setTokens(res.data.accessToken, null);
        localStorage.setItem('currentUser', JSON.stringify(res.data.user));
      }
      return res.data;
    },

    async logout() {
      try {
        await request('/api/v1/auth/logout', { method: 'POST' });
      } catch (error) {
        console.warn(error.message);
      }
      authLocal.clearTokens();
    },

    getCurrentUser() {
      return JSON.parse(localStorage.getItem('currentUser') || 'null');
    },

    isLoggedIn() {
      return !!authLocal.getAccessToken();
    },
  },

  poultries: {
    async getAll(query = {}) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await request(`/api/poultries${queryString}`, { method: 'GET' });
      return res.data?.poultries || [];
    },
    async getById(id) {
      const res = await request(`/api/poultries/${id}`, { method: 'GET' });
      return res.data?.poultry;
    },
    async create(payload) {
      const res = await request('/api/poultries', {
        method: 'POST',
        body: payload,
      });
      return res.data?.poultry;
    },
    async update(id, payload) {
      const res = await request(`/api/poultries/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      return res.data?.poultry;
    },
    async delete(id) {
      return request(`/api/poultries/${id}`, { method: 'DELETE' });
    },
  },

  products: {
    async getAll(query = {}) {
      const params = new URLSearchParams();
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await request(`/api/products${queryString}`, { method: 'GET' });
      return res.data?.products || [];
    },
    async getById(id) {
      const res = await request(`/api/products/${id}`, { method: 'GET' });
      return res.data?.product;
    },
    async create(payload) {
      const res = await request('/api/products', {
        method: 'POST',
        body: payload,
      });
      return res.data?.product;
    },
    async update(id, payload) {
      const res = await request(`/api/products/${id}`, {
        method: 'PATCH',
        body: payload,
      });
      return res.data?.product;
    },
    async delete(id) {
      return request(`/api/products/${id}`, { method: 'DELETE' });
    },
  },

  search: {
    async searchPoultries(filters = {}) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await request(`/api/search/poultries${queryString}`, { method: 'GET' });
      return res.data || { data: [] };
    },
  },
};

class EggSourceApp {
  constructor() {
    this.currentView = 'home';
    this.currentUser = null;
    this.currentFarm = null;
    this.currentProduct = null;
    this.booking = { quantity: 1, deliveryType: 'delivery' };

    window.addEventListener('DOMContentLoaded', () => this.init());
    window.addEventListener('api-unauthorized', () => this.handleUnauthorized());
  }

  init() {
    this.currentUser = EggSourceAPI.auth.getCurrentUser();
    this.bindGlobalLinks();
    this.bindForms();
    this.syncAuthUI();
    this.initializePasswordToggles();
    this.renderHomeCards();
    this.highlightActiveNav();
    lucide.createIcons();
  }

  bindGlobalLinks() {
    document.querySelectorAll('[data-target]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        const target = link.dataset.target;
        if (target) this.navigateTo(target);
      });
    });

    document.querySelectorAll('[data-action="toggle-view"]').forEach((button) => {
      button.addEventListener('click', () => {
        const target = button.dataset.target;
        if (target) this.navigateTo(target);
      });
    });
  }

  bindForms() {
    const loginForm = document.querySelector('#form-login');
    const registerForm = document.querySelector('#form-register');
    const bookingForm = document.querySelector('#form-booking');

    if (loginForm) loginForm.addEventListener('submit', (event) => this.handleLogin(event));
    if (registerForm) registerForm.addEventListener('submit', (event) => this.handleRegister(event));
    if (bookingForm) bookingForm.addEventListener('submit', (event) => this.handleBooking(event));
  }

  navigateTo(viewId) {
    const views = document.querySelectorAll('.view-section');
    views.forEach((view) => view.classList.remove('active'));

    const target = document.getElementById(`view-${viewId}`);
    if (!target) return;

    target.classList.add('active');
    this.currentView = viewId;
    this.highlightActiveNav();

    if (viewId === 'search') this.loadSearchView();
    if (viewId === 'farmer-dashboard') this.loadFarmerDashboard();
    if (viewId === 'user-dashboard') this.loadCustomerDashboard();
    if (viewId === 'poultry-detail') this.renderPoultryDetail();
    if (viewId === 'booking') this.renderBookingPage();
  }

  highlightActiveNav() {
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.target === this.currentView);
    });
  }

  showToast(title, message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : 'alert-circle'}"></i>
      <div>
        <h5>${title}</h5>
        <p>${message}</p>
      </div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    setTimeout(() => {
      toast.remove();
    }, 3800);
  }

  initializePasswordToggles() {
    document.querySelectorAll('.password-toggle button').forEach((button) => {
      button.addEventListener('click', () => {
        const input = button.closest('.password-toggle').querySelector('input');
        if (!input) return;
        input.type = input.type === 'password' ? 'text' : 'password';
        button.innerHTML = input.type === 'password' ? 'Show' : 'Hide';
      });
    });
  }

  async handleLogin(event) {
    event.preventDefault();
    const email = document.querySelector('#login-email').value.trim();
    const password = document.querySelector('#login-password').value.trim();

    if (!email || !password) {
      return this.showToast('Validation error', 'Email and password are required.', 'danger');
    }

    try {
      const data = await EggSourceAPI.auth.login({ email, password });
      this.currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      this.showToast('Welcome back!', `Hello ${this.currentUser.firstName}`);
      this.syncAuthUI();
      if (this.currentUser.role === 'FARM_OWNER' || this.currentUser.role === 'ADMIN') {
        this.navigateTo('farmer-dashboard');
      } else {
        this.navigateTo('search');
      }
    } catch (error) {
      this.showToast('Login failed', error.message, 'danger');
    }
  }

  async handleRegister(event) {
    event.preventDefault();
    const firstName = document.querySelector('#reg-firstname').value.trim();
    const lastName = document.querySelector('#reg-lastname').value.trim();
    const email = document.querySelector('#reg-email').value.trim();
    const phone = document.querySelector('#reg-phone').value.trim();
    const password = document.querySelector('#reg-password').value.trim();
    const role = document.querySelector('#reg-role').value;

    if (!firstName || !lastName || !email || !phone || !password) {
      return this.showToast('Validation error', 'All fields are required.', 'danger');
    }

    if (password.length < 8) {
      return this.showToast('Validation error', 'Password must be at least 8 characters.', 'danger');
    }

    try {
      const data = await EggSourceAPI.auth.register({ firstName, lastName, email, phone, password, role });
      this.currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      this.showToast('Welcome!', 'Account created successfully.');
      this.syncAuthUI();
      if (role === 'FARM_OWNER') {
        this.navigateTo('farmer-dashboard');
      } else {
        this.navigateTo('search');
      }
    } catch (error) {
      this.showToast('Registration failed', error.message, 'danger');
    }
  }

  async handleBooking(event) {
    event.preventDefault();
    const quantity = Number(document.querySelector('#booking-quantity').value || 1);
    const name = document.querySelector('#booking-name').value.trim();
    const phone = document.querySelector('#booking-phone').value.trim();
    const email = document.querySelector('#booking-email').value.trim();
    const deliveryAddress = document.querySelector('#booking-address').value.trim();
    const notes = document.querySelector('#booking-notes').value.trim();
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'delivery';

    if (!this.currentProduct) {
      return this.showToast('Booking error', 'Select a product first.', 'danger');
    }

    if (!name || !phone || !email || !deliveryAddress) {
      return this.showToast('Validation error', 'Complete all required booking fields.', 'danger');
    }

    const total = this.computeBookingTotal(quantity, deliveryType);
    const booking = {
      id: `BK-${Date.now()}`,
      farmId: this.currentFarm?._id || null,
      productId: this.currentProduct._id,
      productName: this.currentProduct.productName,
      farmName: this.currentFarm?.businessName || '',
      buyerName: name,
      buyerEmail: email,
      buyerPhone: phone,
      quantity,
      deliveryType,
      deliveryAddress,
      notes,
      total,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
    };

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(bookings));
    this.showToast('Booking confirmed', 'Your order has been saved locally.');
    this.navigateTo('user-dashboard');
    setTimeout(() => this.switchDashboardTab('cust-bookings'), 200);
  }

  computeBookingTotal(quantity, deliveryType) {
    const itemTotal = (this.currentProduct?.pricePerCrate || 0) * quantity;
    const deliveryFee = deliveryType === 'delivery' ? 1500 : 0;
    return itemTotal + deliveryFee;
  }

  handleLogout() {
    EggSourceAPI.auth.logout();
    this.currentUser = null;
    this.syncAuthUI();
    this.showToast('Logged out', 'You have safely signed out.');
    this.navigateTo('home');
  }

  handleUnauthorized() {
    this.currentUser = null;
    this.syncAuthUI();
    this.showToast('Session expired', 'Please sign in again.', 'danger');
    this.navigateTo('auth');
  }

  syncAuthUI() {
    const guestBlock = document.querySelector('#auth-state-guest');
    const userBlock = document.querySelector('#auth-state-user');
    const navFarmer = document.querySelector('#nav-item-farmer');
    const navCustomer = document.querySelector('#nav-item-customer');
    const displayName = document.querySelector('#user-display-name');

    if (this.currentUser) {
      guestBlock.style.display = 'none';
      userBlock.style.display = 'flex';
      displayName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
      if (['FARM_OWNER', 'ADMIN'].includes(this.currentUser.role)) {
        navFarmer.style.display = 'block';
        navCustomer.style.display = 'none';
      } else {
        navFarmer.style.display = 'none';
        navCustomer.style.display = 'block';
      }
    } else {
      guestBlock.style.display = 'flex';
      userBlock.style.display = 'none';
      navFarmer.style.display = 'none';
      navCustomer.style.display = 'none';
    }
  }

  async renderHomeCards() {
    const statsGrid = document.querySelector('#home-stats-grid');
    if (!statsGrid) return;
    const farms = await EggSourceAPI.poultries.getAll();
    const countFarms = farms.length;
    statsGrid.innerHTML = `
      <div class="hero-card">
        <h3>${countFarms}+ Poultry farms</h3>
        <p>Reliable sources near you with verified supply records.</p>
      </div>
      <div class="hero-card">
        <h3>1.7K+ happy buyers</h3>
        <p>Local businesses and households trust Egg Source for fresh inventory.</p>
      </div>
      <div class="hero-card">
        <h3>24/7 support</h3>
        <p>Our platform ensures fast communication and live order tracking.</p>
      </div>
    `;
  }

  async loadSearchView() {
    const farms = await EggSourceAPI.poultries.getAll();
    const resultsCount = document.getElementById('search-results-count');
    const grid = document.getElementById('search-cards-grid');
    resultsCount.textContent = `Showing ${farms.length} farms`;    
    grid.innerHTML = farms.map((farm) => this.renderFarmCard(farm)).join('');
    lucide.createIcons();
  }

  renderFarmCard(farm) {
    const price = farm.pricePerCrate ? `₦${farm.pricePerCrate.toLocaleString()}` : 'Contact for pricing';
    return `
      <article class="listing-card">
        <div class="farm-card__img">
          <img src="https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=900" alt="${farm.businessName}">
        </div>
        <div class="listing-details">
          <div class="pill">${farm.state} • ${farm.lga}</div>
          <h3>${farm.businessName}</h3>
          <p>${farm.address}</p>
          <div class="chips">
            <div class="chip"><i data-lucide="package"></i> ${price}</div>
            <div class="chip"><i data-lucide="truck"></i> ${farm.deliveryAvailable ? 'Delivery available' : 'Pickup only'}</div>
          </div>
          <div class="listing-actions">
            <button class="btn btn-primary" data-action="view-farm" data-id="${farm._id}">View details</button>
            <button class="btn btn-outline" data-action="book-farm" data-id="${farm._id}">Book now</button>
          </div>
        </div>
      </article>
    `;
  }

  async renderPoultryDetail() {
    if (!this.currentFarm) return;
    const hero = document.querySelector('#detail-farm-hero');
    const productsGrid = document.querySelector('#detail-products-grid');
    const phone = document.querySelector('#detail-farm-phone');
    const address = document.querySelector('#detail-farm-address');
    const delivery = document.querySelector('#detail-farm-delivery');

    hero.innerHTML = `
      <div class="farm-detail-card">
        <div class="farm-card__img"><img src="https://images.unsplash.com/photo-1498654896293-37aacf113fd9?auto=format&fit=crop&q=80&w=1100" alt="${this.currentFarm.businessName}"></div>
        <div class="card-body">
          <span class="badge">${this.currentFarm.deliveryAvailable ? 'Delivery ready' : 'Pickup only'}</span>
          <h2>${this.currentFarm.businessName}</h2>
          <p>${this.currentFarm.description || 'Local poultry farm offering eggs, chicks, and layer feeds in bulk at competitive prices.'}</p>
          <div class="meta-row">
            <span><i data-lucide="map-pin"></i> ${this.currentFarm.lga}, ${this.currentFarm.state}</span>
            <span><i data-lucide="phone"></i> ${this.currentFarm.phoneNumber}</span>
          </div>
        </div>
      </div>
    `;

    phone.textContent = this.currentFarm.phoneNumber;
    address.textContent = `${this.currentFarm.address}, ${this.currentFarm.lga}, ${this.currentFarm.state}`;
    delivery.textContent = this.currentFarm.deliveryAvailable ? 'Delivery Logistics Available' : 'Pickup Only';

    const products = await EggSourceAPI.products.getAll({ poultryId: this.currentFarm._id });
    if (products.length === 0) {
      productsGrid.innerHTML = '<p style="color: var(--muted);">No product catalog available for this farm.</p>';
      return;
    }

    productsGrid.innerHTML = products.map((product) => `
      <article class="product-card">
        <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&q=80&w=900" alt="${product.productName}">
        <div class="card-body">
          <span class="badge">${product.category}</span>
          <h3>${product.productName}</h3>
          <p>${product.stockQuantity > 0 ? `${product.stockQuantity} crates available` : 'Out of stock'}</p>
          <div class="meta-row">
            <span><i data-lucide="tag"></i> ₦${product.pricePerCrate.toLocaleString()}</span>
            <span><i data-lucide="box"></i> ${product.isAvailable ? 'Available' : 'Unavailable'}</span>
          </div>
          <div class="listing-actions">
            <button class="btn btn-primary" data-action="select-product" data-id="${product._id}">Book Now</button>
          </div>
        </div>
      </article>
    `).join('');
    lucide.createIcons();
  }

  async renderBookingPage() {
    const productInfo = document.querySelector('#booking-product-info');
    const qtyInput = document.querySelector('#booking-quantity');
    const summaryPrice = document.querySelector('#booking-total-price');
    const deliveryLabel = document.querySelector('#booking-delivery-fee');

    if (!this.currentProduct || !this.currentFarm) {
      return this.showToast('Booking error', 'Select a farm product before proceeding.', 'danger');
    }

    productInfo.textContent = `${this.currentProduct.productName} • ₦${this.currentProduct.pricePerCrate.toLocaleString()} per crate`;
    qtyInput.value = this.booking.quantity;
    this.updateBookingSummary();

    const user = this.currentUser || { firstName: '', lastName: '', phone: '', email: '' };
    document.querySelector('#booking-name').value = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    document.querySelector('#booking-phone').value = user.phone || '';
    document.querySelector('#booking-email').value = this.currentUser?.email || '';
    document.querySelector('#booking-address').value = '';
    document.querySelector('#booking-notes').value = '';
  }

  updateBookingSummary() {
    const qtyInput = document.querySelector('#booking-quantity');
    const deliveryType = document.querySelector('input[name="deliveryType"]:checked')?.value || 'delivery';
    this.booking.quantity = Number(qtyInput.value) || 1;
    this.booking.deliveryType = deliveryType;

    const total = this.computeBookingTotal(this.booking.quantity, deliveryType);
    document.querySelector('#booking-subtotal').textContent = `₦${((this.currentProduct.pricePerCrate || 0) * this.booking.quantity).toLocaleString()}`;
    document.querySelector('#booking-delivery-fee').textContent = deliveryType === 'delivery' ? '₦1,500' : '₦0';
    document.querySelector('#booking-total-price').textContent = `₦${total.toLocaleString()}`;
  }

  async loadFarmerDashboard() {
    const farms = await EggSourceAPI.poultries.getAll();
    const ownerFarms = farms.filter((farm) => farm.ownerId === this.currentUser?._id);
    const farmList = document.querySelector('#farmer-farms-list');
    const bookingList = document.querySelector('#farmer-bookings-list');
    const earningsValue = document.querySelector('#farmer-earnings-value');

    farmList.innerHTML = ownerFarms.length ? ownerFarms.map((farm) => `
      <div class="dashboard-card">
        <h4>${farm.businessName}</h4>
        <p>${farm.state}, ${farm.lga}</p>
        <div class="listing-actions">
          <button class="btn btn-outline" data-action="edit-farm" data-id="${farm._id}">Edit</button>
          <button class="btn btn-danger" data-action="delete-farm" data-id="${farm._id}">Remove</button>
        </div>
      </div>
    `).join('') : '<p style="color: var(--muted);">No farms registered yet.</p>';

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const farmIds = ownerFarms.map((farm) => farm._id);
    const incoming = bookings.filter((booking) => farmIds.includes(booking.farmId));
    bookingList.innerHTML = incoming.length ? incoming.map((booking) => `
      <div class="booking-row">
        <h4>${booking.productName}</h4>
        <small>${booking.buyerName} • ${booking.buyerPhone}</small>
        <div class="summary-row">
          <span>${booking.quantity} crates</span>
          <strong>₦${booking.total.toLocaleString()}</strong>
        </div>
      </div>
    `).join('') : '<p style="color: var(--muted);">No incoming bookings yet.</p>';

    earningsValue.textContent = `₦${incoming.reduce((sum, item) => sum + item.total, 0).toLocaleString()}`;
  }

  loadCustomerDashboard() {
    const profileName = document.querySelector('#profile-name');
    const profileEmail = document.querySelector('#profile-email');
    const bookingHistory = document.querySelector('#cust-bookings-list');
    const savedFarms = document.querySelector('#cust-saved-farms');
    const notificationList = document.querySelector('#cust-notifications');

    profileName.textContent = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    profileEmail.textContent = this.currentUser.email;

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const userBookings = bookings.filter((book) => book.buyerEmail === this.currentUser.email);

    bookingHistory.innerHTML = userBookings.length ? userBookings.map((booking) => `
      <div class="booking-row">
        <h4>${booking.productName}</h4>
        <small>${booking.farmName} • ${booking.deliveryType}</small>
        <div class="summary-row">
          <span>${new Date(booking.createdAt).toLocaleDateString()}</span>
          <strong>₦${booking.total.toLocaleString()}</strong>
        </div>
      </div>
    `).join('') : '<p style="color: var(--muted);">No bookings made yet.</p>';

    savedFarms.innerHTML = '<p style="color: var(--muted);">No saved farms yet.</p>';
    notificationList.innerHTML = `
      <div class="notification-card">
        <strong>Welcome to Egg Source</strong>
        <p>Your farm orders will appear here after you book your first farm product.</p>
      </div>
    `;
  }

  async openPoultryDetailById(farmId) {
    this.currentFarm = await EggSourceAPI.poultries.getById(farmId);
    this.navigateTo('poultry-detail');
  }

  async openBookingWithProduct(productId) {
    const product = await EggSourceAPI.products.getById(productId);
    if (!product) return this.showToast('Error', 'Product not found.', 'danger');
    this.currentProduct = product;
    this.currentFarm = await EggSourceAPI.poultries.getById(product.poultryId);
    if (!EggSourceAPI.auth.isLoggedIn()) {
      this.showToast('Login required', 'Please sign in to book this item.', 'danger');
      return this.showAuth('login');
    }
    this.navigateTo('booking');
  }

  async fetchUserLocation() {
    if (!navigator.geolocation) {
      return this.showToast('Unsupported', 'Browser does not support geolocation.', 'danger');
    }
    navigator.geolocation.getCurrentPosition((position) => {
      document.querySelector('#search-lat').value = position.coords.latitude.toFixed(6);
      document.querySelector('#search-lng').value = position.coords.longitude.toFixed(6);
      this.showToast('Location loaded', 'Coordinates captured from your device.');
    }, () => this.showToast('Location error', 'Unable to retrieve location.', 'danger'));
  }
}

window.app = new EggSourceApp();
