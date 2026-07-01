const PAGE = document.body.dataset.page;

const App = {
  currentUser: null,
  selectedProduct: null,
  selectedFarm: null,

  init() {
    this.currentUser = EggSourceAPI.auth.getCurrentUser();
    this.syncHeader();
    this.bindHeaderEvents();

    const handlers = {
      login: this.initLoginPage,
      signup: this.initSignupPage,
      discover: this.initDiscoverPage,
      'nearby-farms': this.initNearbyPage,
      'poultry-listing': this.initListingPage,
      'poultry-details': this.initPoultryDetailsPage,
      booking: this.initBookingPage,
      dashboard: this.initDashboardPage,
      'farmer-registration': this.initFarmerRegistrationPage,
    };

    const handler = handlers[PAGE];
    if (handler) {
      handler.call(this);
    }
  },

  getEl(id) {
    return document.getElementById(id);
  },

  getValue(id) {
    return this.getEl(id)?.value.trim() || '';
  },

  setText(id, text) {
    const el = this.getEl(id);
    if (el) el.textContent = text;
  },

  showMessage(id, message, type = 'info') {
    const el = this.getEl(id);
    if (!el) return;
    const color = type === 'danger' ? 'var(--danger)' : type === 'success' ? 'var(--primary)' : 'var(--text-main)';
    el.innerHTML = `<p style="color: ${color}; margin-bottom: 16px;">${message}</p>`;
  },

  clearMessage(id) {
    const el = this.getEl(id);
    if (el) el.innerHTML = '';
  },

  redirect(path) {
    window.location.href = path;
  },

  bindForm(id, callback) {
    const form = this.getEl(id);
    if (form) {
      form.addEventListener('submit', callback.bind(this));
    }
  },

  bindInput(id, callback) {
    const input = this.getEl(id);
    if (input) {
      input.addEventListener('input', callback.bind(this));
    }
  },

  queryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  syncHeader() {
    const loggedIn = EggSourceAPI.auth.isLoggedIn();
    const loginLink = this.getEl('header-login-link');
    const signupLink = this.getEl('header-signup-link');
    const dashboardLink = this.getEl('header-dashboard-link');
    const logoutButton = this.getEl('header-logout-button');

    if (loggedIn && this.currentUser) {
      if (loginLink) loginLink.style.display = 'none';
      if (signupLink) signupLink.style.display = 'none';
      if (dashboardLink) dashboardLink.style.display = 'inline-flex';
      if (logoutButton) logoutButton.style.display = 'inline-flex';
    } else {
      if (loginLink) loginLink.style.display = 'inline-flex';
      if (signupLink) signupLink.style.display = 'inline-flex';
      if (dashboardLink) dashboardLink.style.display = 'none';
      if (logoutButton) logoutButton.style.display = 'none';
    }
  },

  bindHeaderEvents() {
    const logoutButton = this.getEl('header-logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => this.handleLogout());
    }
  },

  async handleLogin(event) {
    if (event) event.preventDefault();
    this.clearMessage('page-message');

    const email = this.getValue('login-email');
    const password = this.getValue('login-password');
    if (!email || !password) {
      this.showMessage('page-message', 'Enter both email and password.', 'danger');
      return;
    }

    try {
      const response = await EggSourceAPI.auth.login({ email, password });
      this.handleAuthSuccess(response);
    } catch (err) {
      this.showMessage('page-message', err.message, 'danger');
    }
  },

  async handleSignup(event) {
    if (event) event.preventDefault();
    this.clearMessage('page-message');

    const payload = {
      firstName: this.getValue('signup-firstname'),
      lastName: this.getValue('signup-lastname'),
      email: this.getValue('signup-email'),
      phone: this.getValue('signup-phone'),
      password: this.getValue('signup-password'),
      role: this.getEl('signup-role')?.value || 'CUSTOMER',
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone || !payload.password) {
      this.showMessage('page-message', 'Please fill in all required fields.', 'danger');
      return;
    }

    try {
      const response = await EggSourceAPI.auth.register(payload);
      this.handleAuthSuccess(response);
    } catch (err) {
      this.showMessage('page-message', err.message, 'danger');
    }
  },

  handleAuthSuccess(data) {
    if (!data || !data.user) {
      this.showMessage('page-message', 'Authentication failed. Please try again.', 'danger');
      return;
    }

    this.currentUser = data.user;
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    localStorage.setItem('currentUser', JSON.stringify(data.user));
    this.syncHeader();
    this.redirect('/dashboard.html');
  },

  initLoginPage() {
    if (EggSourceAPI.auth.isLoggedIn()) {
      this.redirect('/dashboard.html');
      return;
    }
    this.bindForm('login-form', this.handleLogin);
  },

  initSignupPage() {
    if (EggSourceAPI.auth.isLoggedIn()) {
      this.redirect('/dashboard.html');
      return;
    }
    this.bindForm('signup-form', this.handleSignup);
  },

  initDiscoverPage() {
    this.bindForm('discover-search-form', (event) => {
      event.preventDefault();
      this.performDiscoverSearch();
    });
    this.performDiscoverSearch();
  },

  async performDiscoverSearch() {
    const filters = {
      state: this.getValue('discover-state'),
      lga: this.getValue('discover-lga'),
      minPrice: this.getValue('discover-min-price'),
      maxPrice: this.getValue('discover-max-price'),
      deliveryAvailable: this.getEl('discover-delivery')?.checked,
      stockAvailable: this.getEl('discover-stock')?.checked,
      page: 1,
      limit: 100,
    };
    await this.searchFarms(filters, 'discover-results-grid', 'discover-results-count');
  },

  initNearbyPage() {
    this.getEl('nearby-use-location')?.addEventListener('click', () => this.searchNearbyFarms());
    this.searchNearbyFarms();
  },

  searchNearbyFarms() {
    const countLabel = this.getEl('nearby-results-count');
    if (!navigator.geolocation) {
      this.showMessage('nearby-results-count', 'Geolocation is not supported by your browser.', 'danger');
      return;
    }

    if (countLabel) {
      countLabel.textContent = 'Locating...';
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await this.searchFarms(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            maxDistance: 25000,
            page: 1,
            limit: 100,
          },
          'nearby-results-grid',
          'nearby-results-count'
        );
      },
      () => {
        if (countLabel) {
          countLabel.textContent = 'Unable to fetch location.';
        }
      }
    );
  },

  initListingPage() {
    this.searchFarms({ page: 1, limit: 100 }, 'listing-results-grid', 'listing-results-count');
  },

  async searchFarms(filters, gridId, countId) {
    const grid = this.getEl(gridId);
    const count = this.getEl(countId);

    if (grid) {
      grid.innerHTML = `
        <div class="shimmer skeleton-card"></div>
        <div class="shimmer skeleton-card"></div>
        <div class="shimmer skeleton-card"></div>
      `;
    }

    try {
      const response = await EggSourceAPI.search.searchPoultries(filters);
      const farms = response.data || [];
      if (count) {
        count.textContent = `Showing ${farms.length} result(s)`;
      }
      if (!farms.length) {
        if (grid) {
          grid.innerHTML = `
            <div class="dashboard-card glass" style="grid-column:1/-1; text-align:center; padding:36px; color: var(--text-muted);">
              No farms found.
            </div>
          `;
        }
        return;
      }

      if (grid) {
        grid.innerHTML = farms.map((farm) => this.renderFarmCard(farm)).join('');
      }
      lucide.createIcons();
    } catch (err) {
      if (grid) {
        grid.innerHTML = `
          <div class="dashboard-card glass" style="grid-column:1/-1; text-align:center; padding:36px; color: var(--danger);">
            ${err.message}
          </div>
        `;
      }
      if (count) {
        count.textContent = 'Search failed.';
      }
    }
  },

  renderFarmCard(farm) {
    const distance = farm.distance != null ? `${(farm.distance / 1000).toFixed(1)} km away` : 'Location available';
    const price = farm.pricePerCrate ? `From ₦${farm.pricePerCrate.toLocaleString()}` : 'No products yet';
    const description = farm.address || `${farm.lga || 'Unknown'}, ${farm.state || 'Unknown'}`;

    return `
      <div class="farm-card glass">
        <div class="farm-card-body">
          <div class="farm-card-header">
            <a href="/poultry-details.html?farmId=${farm._id}" class="farm-title">${farm.businessName}</a>
          </div>
          <div class="farm-card-meta">
            <div class="meta-item"><i data-lucide="map-pin"></i> ${description}</div>
            <div class="meta-item"><i data-lucide="navigation"></i> ${distance}</div>
          </div>
          <p class="farm-desc">${farm.state ? `${farm.state} / ${farm.lga}` : 'Farm information available.'}</p>
          <div class="farm-card-footer">
            <div class="price-indicator">
              <span>Price</span>
              <strong>${price}</strong>
            </div>
            <a href="/poultry-details.html?farmId=${farm._id}" class="btn btn-primary btn-icon-only"><i data-lucide="chevron-right"></i></a>
          </div>
        </div>
      </div>
    `;
  },

  async initPoultryDetailsPage() {
    const farmId = this.queryParam('farmId');
    const messageId = 'details-page-message';
    if (!farmId) {
      this.showMessage(messageId, 'Farm id is required.', 'danger');
      return;
    }

    try {
      const farm = await EggSourceAPI.poultries.getById(farmId);
      if (!farm) {
        this.showMessage(messageId, 'Farm not found.', 'danger');
        return;
      }

      this.setText('details-farm-title', farm.businessName);
      this.setText('details-farm-description', farm.description || 'Farm details are not available.');
      this.setText('details-farm-name', farm.businessName);
      this.setText('details-farm-location', [farm.address, farm.lga, farm.state].filter(Boolean).join(' '));
      this.setText('details-farm-contact', farm.phoneNumber || 'Contact not available');
      this.setText('details-farm-delivery', farm.deliveryAvailable ? 'Delivery available' : 'Pickup only');

      const products = await EggSourceAPI.products.getAll({ poultryId: farmId });
      const grid = this.getEl('details-products-grid');
      if (!products.length) {
        if (grid) {
          grid.innerHTML = `
            <div class="dashboard-card glass" style="grid-column:1/-1; text-align:center; padding:36px; color: var(--text-muted);">
              No products available for this farm.
            </div>
          `;
        }
        return;
      }

      if (grid) {
        grid.innerHTML = products.map((product) => this.renderProductCard(product)).join('');
      }
      lucide.createIcons();
    } catch (err) {
      this.showMessage(messageId, err.message, 'danger');
    }
  },

  renderProductCard(product) {
    const available = product.isAvailable && product.stockQuantity > 0;
    const image = product.imageUrl || 'https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=900';

    return `
      <div class="product-card glass">
        <img src="${image}" alt="${product.productName}" class="product-img">
        <div class="product-body">
          <span class="product-cat">${product.category}</span>
          <h4 class="product-title">${product.productName}</h4>
          <div class="product-price">₦${product.pricePerCrate.toLocaleString()}</div>
          <span class="stock-tag ${available ? 'stock-in' : 'stock-out'}">${available ? `In stock (${product.stockQuantity})` : 'Unavailable'}</span>
          <div style="margin-top:auto;">
            <a class="btn ${available ? 'btn-primary' : 'btn-outline'}" href="${available ? `/booking.html?productId=${product._id}` : '#'}" ${available ? '' : 'aria-disabled="true"'}>${available ? 'Book Now' : 'Unavailable'}</a>
          </div>
        </div>
      </div>
    `;
  },

  initBookingPage() {
    if (!this.ensureAuth()) return;

    const productId = this.queryParam('productId');
    if (!productId) {
      this.showMessage('booking-page-message', 'Product id is required.', 'danger');
      return;
    }

    this.loadBooking(productId);
  },

  async loadBooking(productId) {
    try {
      const product = await EggSourceAPI.products.getById(productId);
      if (!product) {
        this.showMessage('booking-page-message', 'Product not found.', 'danger');
        return;
      }

      this.selectedProduct = product;
      this.selectedFarm = await EggSourceAPI.poultries.getById(product.poultryId);

      const summary = this.getEl('booking-product-summary');
      if (summary) {
        summary.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; gap:16px;">
            <div>
              <h3 style="margin:0;">${product.productName}</h3>
              <p style="color: var(--text-muted); margin: 8px 0;">₦${product.pricePerCrate.toLocaleString()} per crate</p>
              <p style="color: var(--text-muted); margin:0;">${this.selectedFarm?.businessName || 'Farm supply'}</p>
            </div>
          </div>
        `;
      }

      this.setTextValue('booking-name', `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim());
      this.setTextValue('booking-phone', this.currentUser.phone || '');
      this.setTextValue('booking-email', this.currentUser.email || '');
      this.setTextValue('booking-quantity', '1');
      this.setTextValue('booking-address', '');
      this.setTextValue('booking-notes', '');
      this.updateBookingSummary();

      this.bindInput('booking-quantity', this.updateBookingSummary);
      this.bindForm('booking-form', this.submitBooking);
    } catch (err) {
      this.showMessage('booking-page-message', err.message, 'danger');
    }
  },

  setTextValue(id, value) {
    const el = this.getEl(id);
    if (!el) return;
    if ('value' in el) {
      el.value = value;
    } else {
      el.textContent = value;
    }
  },

  getSelectedDeliveryType() {
    return document.querySelector('input[name="deliveryType"]:checked')?.value || 'delivery';
  },

  updateBookingSummary() {
    const quantity = Number(this.getValue('booking-quantity')) || 1;
    const deliveryType = this.getSelectedDeliveryType();
    const basePrice = this.selectedProduct?.pricePerCrate || 0;
    const deliveryFee = deliveryType === 'delivery' ? 1500 : 0;
    const subtotal = quantity * basePrice;
    const total = subtotal + deliveryFee;

    this.setText('booking-subtotal', `₦${subtotal.toLocaleString()}`);
    this.setText('booking-delivery-fee', `₦${deliveryFee.toLocaleString()}`);
    this.setText('booking-total-price', `₦${total.toLocaleString()}`);
  },

  submitBooking(event) {
    if (event) event.preventDefault();

    const quantity = Number(this.getValue('booking-quantity')) || 1;
    const address = this.getValue('booking-address');
    const receiver = this.getValue('booking-name');
    const phone = this.getValue('booking-phone');

    if (!address || !receiver || !phone) {
      this.showMessage('booking-page-message', 'Please complete the booking form.', 'danger');
      return;
    }

    const subtotal = (this.selectedProduct?.pricePerCrate || 0) * quantity;
    const deliveryFee = this.getSelectedDeliveryType() === 'delivery' ? 1500 : 0;
    const total = subtotal + deliveryFee;

    const booking = {
      bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      farmId: this.selectedFarm?._id || '',
      farmName: this.selectedFarm?.businessName || '',
      productId: this.selectedProduct?._id || '',
      productName: this.selectedProduct?.productName || '',
      quantity,
      deliveryType: this.getSelectedDeliveryType(),
      deliveryAddress: address,
      buyerName: receiver,
      buyerPhone: phone,
      buyerEmail: this.currentUser.email,
      pricePerCrate: this.selectedProduct?.pricePerCrate || 0,
      totalPrice: total,
      notes: this.getValue('booking-notes'),
      status: 'Confirmed',
      date: new Date().toLocaleDateString(),
    };

    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('bookings', JSON.stringify(bookings));

    this.showMessage('booking-page-message', 'Booking confirmed. Redirecting to dashboard...', 'success');
    setTimeout(() => this.redirect('/dashboard.html'), 1200);
  },

  initDashboardPage() {
    if (!this.ensureAuth()) return;

    const profileName = `${this.currentUser.firstName} ${this.currentUser.lastName}`.trim();
    this.setText('profile-name', profileName);
    this.setText('profile-role', this.currentUser.role.replace('_', ' '));
    this.setText('profile-email', this.currentUser.email);
    this.setText('profile-phone', this.currentUser.phone || 'Not provided');
    this.setText('farmer-profile-name', profileName);
    this.setText('farmer-profile-email', this.currentUser.email);

    const buyerSection = this.getEl('dashboard-buyer');
    const farmerSection = this.getEl('dashboard-farmer');
    const addFarmButton = this.getEl('dashboard-add-farm-button');

    const isFarmer = this.userIsFarmer();
    if (buyerSection) buyerSection.style.display = isFarmer ? 'none' : 'block';
    if (farmerSection) farmerSection.style.display = isFarmer ? 'block' : 'none';
    if (addFarmButton) addFarmButton.style.display = isFarmer ? 'inline-flex' : 'none';

    if (isFarmer) {
      this.loadFarmerDashboard();
    } else {
      this.loadBuyerDashboard();
    }
  },

  loadBuyerDashboard() {
    const bookingsList = this.getEl('buyer-bookings-list');
    const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
    const userBookings = bookings.filter((booking) => booking.buyerEmail === this.currentUser.email);

    if (!bookingsList) return;
    if (!userBookings.length) {
      bookingsList.innerHTML = '<p style="color: var(--text-muted);">No bookings yet.</p>';
      return;
    }

    bookingsList.innerHTML = userBookings.map((booking) => this.renderBookingCard(booking)).join('');
  },

  async loadFarmerDashboard() {
    const farmsList = this.getEl('farmer-farms-list');
    const bookingsList = this.getEl('farmer-bookings-list');

    if (farmsList) {
      farmsList.innerHTML = '<div class="shimmer skeleton-card"></div>';
    }

    try {
      const farms = await EggSourceAPI.poultries.getAll();
      const ownerFarms = farms.filter((farm) => farm.ownerId === this.currentUser._id);

      if (farmsList) {
        farmsList.innerHTML = ownerFarms.length
          ? ownerFarms.map((farm) => `
              <div class="dashboard-card glass">
                <h4>${farm.businessName}</h4>
                <p style="color: var(--text-muted); margin: 8px 0;">${farm.address}, ${farm.lga}, ${farm.state}</p>
              </div>
            `).join('')
          : '<p style="color: var(--text-muted);">No registered farms yet.</p>';
      }

      if (bookingsList) {
        const bookings = JSON.parse(localStorage.getItem('bookings') || '[]');
        const incoming = bookings.filter((booking) => ownerFarms.some((farm) => farm._id === booking.farmId));

        bookingsList.innerHTML = incoming.length
          ? incoming.map((booking) => this.renderBookingCard(booking)).join('')
          : '<p style="color: var(--text-muted);">No incoming bookings yet.</p>';
      }
    } catch (err) {
      if (farmsList) farmsList.innerHTML = `<p style="color: var(--danger);">${err.message}</p>`;
    }
  },

  renderBookingCard(booking) {
    return `
      <div class="dashboard-card glass">
        <h4>${booking.productName}</h4>
        <p style="color: var(--text-muted); margin: 8px 0;">${booking.farmName}</p>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span>${booking.quantity} crates</span>
          <strong>₦${booking.totalPrice.toLocaleString()}</strong>
        </div>
      </div>
    `;
  },

  initFarmerRegistrationPage() {
    if (!this.ensureAuth()) return;
    if (!this.userIsFarmer()) {
      this.showMessage('farm-page-message', 'You must register as a poultry farmer to create a farm listing.', 'danger');
      return;
    }

    this.bindForm('farm-registration-form', this.handleFarmRegistration);
  },

  async handleFarmRegistration(event) {
    if (event) event.preventDefault();
    this.clearMessage('farm-page-message');

    const payload = {
      businessName: this.getValue('farm-business-name'),
      state: this.getValue('farm-state'),
      lga: this.getValue('farm-lga'),
      address: this.getValue('farm-address'),
      phoneNumber: this.getValue('farm-phone'),
      description: this.getValue('farm-desc'),
      latitude: this.getValue('farm-lat'),
      longitude: this.getValue('farm-lng'),
      deliveryAvailable: this.getEl('farm-delivery')?.checked,
    };

    if (!payload.businessName || !payload.state || !payload.lga || !payload.address || !payload.phoneNumber || !payload.latitude || !payload.longitude) {
      this.showMessage('farm-page-message', 'Please complete the required farm details.', 'danger');
      return;
    }

    try {
      await EggSourceAPI.poultries.create(payload);
      this.showMessage('farm-page-message', 'Farm registered successfully. Redirecting to dashboard...', 'success');
      setTimeout(() => this.redirect('/dashboard.html'), 1400);
    } catch (err) {
      this.showMessage('farm-page-message', err.message, 'danger');
    }
  },

  ensureAuth() {
    if (!EggSourceAPI.auth.isLoggedIn()) {
      this.redirect('/login.html');
      return false;
    }
    this.currentUser = EggSourceAPI.auth.getCurrentUser();
    return !!this.currentUser;
  },

  userIsFarmer() {
    return ['FARM_OWNER', 'ADMIN'].includes(this.currentUser?.role);
  },

  async handleLogout() {
    await EggSourceAPI.auth.logout();
    this.currentUser = null;
    this.syncHeader();
    this.redirect('/login.html');
  },
};

window.app = App;
window.addEventListener('DOMContentLoaded', () => App.init());
