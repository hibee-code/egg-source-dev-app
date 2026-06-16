/**
 * Core Front-End Application Controller
 */
class EggSourceApp {
  constructor() {
    this.activeView = "home";
    this.currentUser = null;
    this.selectedFarm = null;
    this.selectedProduct = null;
    
    // Bind event listeners on boot
    window.addEventListener("DOMContentLoaded", () => this.init());
    window.addEventListener("api-unauthorized", () => this.handleUnauthorized());
  }

  init() {
    // Check local auth state
    this.currentUser = window.EggSourceAPI.auth.getCurrentUser();
    this.syncAuthUI();

    // Map navbar target switching
    document.querySelectorAll("[data-target]").forEach((element) => {
      element.addEventListener("click", (e) => {
        e.preventDefault();
        const target = element.getAttribute("data-target");
        this.navigateTo(target);
      });
    });

    // Map dashboard tab switches
    this.initDashboardTabs();

    // Lucide icons render
    lucide.createIcons();

    // Initialise home stats and load default discovery cards
    this.loadLandingStats();
  }

  // ── VIEW ROUTING ──────────────────────────────────────────
  navigateTo(viewId, params = {}) {
    console.log(`Navigating to view: ${viewId}`);
    
    // Toggle active view sections
    document.querySelectorAll(".view-section").forEach((section) => {
      section.classList.remove("active");
    });

    const targetSection = document.getElementById(`view-${viewId}`);
    if (targetSection) {
      targetSection.classList.add("active");
      this.activeView = viewId;
    }

    // Toggle active navbar states
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active");
      if (link.getAttribute("data-target") === viewId) {
        link.classList.add("active");
      }
    });

    // Load dynamic view contents
    if (viewId === "search") {
      this.executeSearch();
    } else if (viewId === "farmer-dashboard") {
      this.loadFarmerDashboard();
    } else if (viewId === "user-dashboard") {
      this.loadCustomerDashboard();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── TOAST NOTIFICATIONS ────────────────────────────────────
  showToast(title, message, type = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    const icon = type === "success" ? "check-circle" : "alert-circle";
    
    toast.innerHTML = `
      <i data-lucide="${icon}" style="color: ${type === 'success' ? 'var(--primary)' : 'var(--danger)'}; flex-shrink: 0;"></i>
      <div class="toast-content">
        <h5>${title}</h5>
        <p>${message}</p>
      </div>
    `;

    container.appendChild(toast);
    lucide.createIcons();

    // Remove toast after 3.5 seconds
    setTimeout(() => {
      toast.style.animation = "toastIn 0.3s ease reverse";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // ── AUTHENTICATION ─────────────────────────────────────────
  showAuth(tab = "login", defaultRole = "CUSTOMER") {
    this.navigateTo("auth");
    this.toggleAuthTab(tab);
    if (tab === "register") {
      document.getElementById("reg-role").value = defaultRole;
    }
  }

  toggleAuthTab(tab) {
    const tabLogin = document.getElementById("tab-login");
    const tabRegister = document.getElementById("tab-register");
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");

    if (tab === "login") {
      tabLogin.classList.add("active");
      tabRegister.classList.remove("active");
      formLogin.style.display = "block";
      formRegister.style.display = "none";
    } else {
      tabRegister.classList.add("active");
      tabLogin.classList.remove("active");
      formRegister.style.display = "block";
      formLogin.style.display = "none";
    }
  }

  async handleLogin(e) {
    if (e) e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const data = await window.EggSourceAPI.auth.login({ email, password });
      this.currentUser = data.user;
      this.showToast("Welcome Back!", `Logged in as ${data.user.firstName}`);
      
      this.syncAuthUI();
      
      // Redirect based on role
      if (this.currentUser.role === "FARM_OWNER" || this.currentUser.role === "ADMIN") {
        this.navigateTo("farmer-dashboard");
      } else {
        this.navigateTo("search");
      }
    } catch (err) {
      this.showToast("Login Failed", err.message, "danger");
    }
  }

  async handleRegister(e) {
    if (e) e.preventDefault();
    const firstName = document.getElementById("reg-firstname").value;
    const lastName = document.getElementById("reg-lastname").value;
    const email = document.getElementById("reg-email").value;
    const phone = document.getElementById("reg-phone").value;
    const password = document.getElementById("reg-password").value;
    const role = document.getElementById("reg-role").value;

    try {
      const data = await window.EggSourceAPI.auth.register({
        firstName,
        lastName,
        email,
        phone,
        password,
        role,
      });
      this.currentUser = data.user;
      this.showToast("Account Created", "Welcome to Egg Source!");
      this.syncAuthUI();
      
      if (role === "FARM_OWNER") {
        this.navigateTo("farmer-dashboard");
      } else {
        this.navigateTo("search");
      }
    } catch (err) {
      this.showToast("Signup Failed", err.message, "danger");
    }
  }

  async handleLogout() {
    await window.EggSourceAPI.auth.logout();
    this.currentUser = null;
    this.showToast("Logged Out", "Goodbye! You have logged out successfully.");
    this.syncAuthUI();
    this.navigateTo("home");
  }

  handleUnauthorized() {
    this.currentUser = null;
    this.syncAuthUI();
    this.showToast("Session Expired", "Please log in again.", "danger");
    this.navigateTo("auth");
  }

  syncAuthUI() {
    const guestState = document.getElementById("auth-state-guest");
    const userState = document.getElementById("auth-state-user");
    const displayName = document.getElementById("user-display-name");
    const navFarmer = document.getElementById("nav-item-farmer");
    const navCustomer = document.getElementById("nav-item-customer");

    if (this.currentUser) {
      guestState.style.display = "none";
      userState.style.display = "flex";
      userState.style.alignItems = "center";
      userState.style.gap = "16px";
      displayName.textContent = `${this.currentUser.firstName} (${this.currentUser.role.replace("_", " ")})`;

      if (this.currentUser.role === "FARM_OWNER" || this.currentUser.role === "ADMIN") {
        navFarmer.style.display = "block";
        navCustomer.style.display = "none";
      } else {
        navFarmer.style.display = "none";
        navCustomer.style.display = "block";
      }
    } else {
      guestState.style.display = "flex";
      guestState.style.alignItems = "center";
      guestState.style.gap = "16px";
      userState.style.display = "none";
      navFarmer.style.display = "none";
      navCustomer.style.display = "none";
    }
  }

  // ── GEOLOCATION SEARCH ─────────────────────────────────────
  fetchUserLocation() {
    if (!navigator.geolocation) {
      return this.showToast("Unsupported", "Geolocation is not supported by your browser.", "danger");
    }

    this.showToast("Locating", "Fetching device coordinates...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        document.getElementById("search-lat").value = position.coords.latitude.toFixed(6);
        document.getElementById("search-lng").value = position.coords.longitude.toFixed(6);
        this.showToast("Success", "Coordinates loaded! Click Apply to search.");
      },
      (error) => {
        this.showToast("Location Error", "Unable to retrieve position.", "danger");
      }
    );
  }

  async executeSearch() {
    const cardsGrid = document.getElementById("search-cards-grid");
    cardsGrid.innerHTML = `
      <div class="shimmer skeleton-card"></div>
      <div class="shimmer skeleton-card"></div>
      <div class="shimmer skeleton-card"></div>
    `;

    const lat = document.getElementById("search-lat").value;
    const lng = document.getElementById("search-lng").value;
    const distance = document.getElementById("search-distance").value;
    const state = document.getElementById("search-state").value;
    const lga = document.getElementById("search-lga").value;
    const minPrice = document.getElementById("search-min-price").value;
    const maxPrice = document.getElementById("search-max-price").value;
    const delivery = document.getElementById("search-delivery").checked;
    const stock = document.getElementById("search-stock").checked;

    const filters = {
      state,
      lga,
      minPrice,
      maxPrice,
      page: 1,
      limit: 100,
    };

    if (lat && lng) {
      filters.latitude = lat;
      filters.longitude = lng;
      filters.maxDistance = distance * 1000; // convert km to meters
    }
    if (delivery) filters.deliveryAvailable = true;
    if (stock) filters.stockAvailable = true;

    try {
      const results = await window.EggSourceAPI.search.searchPoultries(filters);
      const farms = results.data || [];
      
      document.getElementById("search-results-count").textContent = `Showing ${farms.length} result(s)`;
      
      if (farms.length === 0) {
        cardsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <i data-lucide="info" style="font-size: 2.5rem; margin-bottom: 12px; display: inline-block;"></i>
            <p>No active poultry properties found matching these parameters.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      cardsGrid.innerHTML = farms.map((farm) => {
        const distStr = farm.distance !== null ? `${(farm.distance / 1000).toFixed(1)} km away` : "Address Sourced";
        const priceStr = farm.pricePerCrate !== null ? `From ₦${farm.pricePerCrate.toLocaleString()}` : "Catalog Empty";

        return `
          <div class="farm-card glass">
            <div class="farm-card-body">
              <div class="farm-card-header">
                <a href="#" class="farm-title" onclick="app.showPoultryDetail('${farm._id}')">${farm.businessName}</a>
              </div>
              <div class="farm-card-meta">
                <div class="meta-item"><i data-lucide="map-pin"></i> ${farm.lga}, ${farm.state}</div>
                <div class="meta-item"><i data-lucide="navigation"></i> ${distStr}</div>
              </div>
              <p class="farm-desc">${farm.address}</p>
              <div class="farm-card-footer">
                <div class="price-indicator">
                  Starting Price <span>${priceStr}</span>
                </div>
                <button class="btn btn-primary btn-icon-only" onclick="app.showPoultryDetail('${farm._id}')">
                  <i data-lucide="chevron-right"></i>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join("");

      lucide.createIcons();
    } catch (err) {
      cardsGrid.innerHTML = `<p style="color: var(--danger); text-align: center;">Failed to load properties: ${err.message}</p>`;
    }
  }

  // ── POULTRY DETAILS ────────────────────────────────────────
  async showPoultryDetail(farmId) {
    try {
      this.selectedFarm = await window.EggSourceAPI.poultries.getById(farmId);
      this.navigateTo("poultry-detail");

      // Set sidebar metadata
      document.getElementById("detail-farm-phone").textContent = this.selectedFarm.phoneNumber;
      document.getElementById("detail-farm-address").textContent = `${this.selectedFarm.address}, ${this.selectedFarm.lga}, ${this.selectedFarm.state}`;
      document.getElementById("detail-farm-delivery").textContent = this.selectedFarm.deliveryAvailable ? "Delivery Logistics Available" : "Pickup Only";

      // Render hero
      const hero = document.getElementById("detail-farm-hero");
      hero.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: start;">
          <div>
            <h2 style="font-size: 2.25rem; margin-bottom: 8px;">${this.selectedFarm.businessName}</h2>
            <div class="farm-card-meta">
              <span class="rating-badge"><i data-lucide="star"></i> ${this.selectedFarm.rating || "4.5"}</span>
              <span class="meta-item"><i data-lucide="map-pin"></i> ${this.selectedFarm.lga}, ${this.selectedFarm.state}</span>
            </div>
          </div>
        </div>
        <p style="margin-top: 16px; max-width: 700px; line-height: 1.6; color: var(--text-muted);">${this.selectedFarm.description || "Fresh and organic supply direct from our local farming properties."}</p>
      `;

      // Fetch products
      const productsGrid = document.getElementById("detail-products-grid");
      productsGrid.innerHTML = `<div class="shimmer skeleton-card" style="grid-column: 1/-1;"></div>`;

      const products = await window.EggSourceAPI.products.getAll({ poultryId: farmId });
      
      if (products.length === 0) {
        productsGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <p>No products registered under this poultry farm.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      productsGrid.innerHTML = products.map((prod) => {
        const stockStatus = prod.stockQuantity > 0 && prod.isAvailable 
          ? `<span class="stock-tag stock-in">Available: ${prod.stockQuantity}</span>` 
          : `<span class="stock-tag stock-out">Out of Stock</span>`;

        const buyBtn = prod.stockQuantity > 0 && prod.isAvailable
          ? `<button class="btn btn-primary" onclick="app.initiateBooking('${prod._id}')"><i data-lucide="shopping-bag"></i> Book</button>`
          : `<button class="btn btn-outline" disabled>Unavailable</button>`;

        const dummyImg = "https://images.unsplash.com/photo-1516448424440-9dbca97779c1?auto=format&fit=crop&q=80&w=300";

        return `
          <div class="product-card glass">
            <img src="${prod.imageUrl || dummyImg}" alt="${prod.productName}" class="product-img">
            <div class="product-body">
              <span class="product-cat">${prod.category}</span>
              <h4 class="product-title">${prod.productName}</h4>
              <div class="product-price">₦${prod.pricePerCrate.toLocaleString()}</div>
              ${stockStatus}
              <div style="margin-top: auto;">
                ${buyBtn}
              </div>
            </div>
          </div>
        `;
      }).join("");

      lucide.createIcons();
    } catch (err) {
      this.showToast("Error", `Failed to load details: ${err.message}`, "danger");
    }
  }

  // ── BOOKING CHECKOUT FLOW ──────────────────────────────────
  async initiateBooking(productId) {
    if (!window.EggSourceAPI.auth.isLoggedIn()) {
      this.showToast("Login Required", "You must log in to place bookings.", "danger");
      return this.showAuth("login");
    }

    try {
      this.selectedProduct = await window.EggSourceAPI.products.getById(productId);
      this.navigateTo("booking");

      // Auto-fill checkout user details
      document.getElementById("booking-name").value = `${this.currentUser.firstName} ${this.currentUser.lastName}`;
      document.getElementById("booking-phone").value = this.currentUser.phone || "";

      // Populate item details
      const detailContainer = document.getElementById("booking-item-details");
      detailContainer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="font-size: 1.05rem; margin-bottom: 4px;">${this.selectedProduct.productName}</h4>
            <p style="font-size: 0.85rem; color: var(--text-muted);">₦${this.selectedProduct.pricePerCrate.toLocaleString()} per unit</p>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <button class="btn btn-outline btn-icon-only" onclick="app.updateBookingQty(-1)" style="padding: 4px 8px;">-</button>
            <span id="booking-quantity" style="font-weight: 700; font-size: 1.1rem;">1</span>
            <button class="btn btn-outline btn-icon-only" onclick="app.updateBookingQty(1)" style="padding: 4px 8px;">+</button>
          </div>
        </div>
      `;

      this.recalculateBookingTotals(1);
    } catch (err) {
      this.showToast("Checkout Error", err.message, "danger");
    }
  }

  updateBookingQty(change) {
    const qtySpan = document.getElementById("booking-quantity");
    let qty = parseInt(qtySpan.textContent, 10) + change;
    
    if (qty < 1) qty = 1;
    if (qty > this.selectedProduct.stockQuantity) {
      qty = this.selectedProduct.stockQuantity;
      this.showToast("Stock limit", `Only ${qty} units available.`, "danger");
    }

    qtySpan.textContent = qty;
    this.recalculateBookingTotals(qty);
  }

  recalculateBookingTotals(qty) {
    const subtotal = this.selectedProduct.pricePerCrate * qty;
    // Flat delivery fee if delivery is available, else 0
    const deliveryFee = this.selectedFarm.deliveryAvailable ? 1500 : 0;
    const total = subtotal + deliveryFee;

    document.getElementById("booking-subtotal").textContent = `₦${subtotal.toLocaleString()}`;
    document.getElementById("booking-delivery-fee").textContent = `₦${deliveryFee.toLocaleString()}`;
    document.getElementById("booking-total-price").textContent = `₦${total.toLocaleString()}`;
  }

  handlePlaceBooking(e) {
    e.preventDefault();
    const address = document.getElementById("booking-address").value;
    const receiverName = document.getElementById("booking-name").value;
    const phone = document.getElementById("booking-phone").value;
    const notes = document.getElementById("booking-notes").value;
    const qty = parseInt(document.getElementById("booking-quantity").textContent, 10);

    const subtotal = this.selectedProduct.pricePerCrate * qty;
    const deliveryFee = this.selectedFarm.deliveryAvailable ? 1500 : 0;
    const total = subtotal + deliveryFee;

    const receipt = {
      bookingId: `BK-${Math.floor(100000 + Math.random() * 900000)}`,
      productName: this.selectedProduct.productName,
      pricePerCrate: this.selectedProduct.pricePerCrate,
      quantity: qty,
      totalPrice: total,
      buyerName: receiverName,
      buyerEmail: this.currentUser.email,
      buyerPhone: phone,
      deliveryAddress: address,
      farmId: this.selectedFarm._id,
      farmName: this.selectedFarm.businessName,
      status: "Confirmed",
      date: new Date().toLocaleDateString(),
    };

    // Load from local storage
    const bookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    bookings.push(receipt);
    localStorage.setItem("bookings", JSON.stringify(bookings));

    this.showToast("Success", "Your poultry supply booking has been confirmed!");
    this.navigateTo("user-dashboard");
    
    // Switch to My Bookings tab in User Dashboard
    setTimeout(() => {
      this.switchDashboardTab("cust-bookings");
    }, 100);
  }

  // ── DASHBOARDS BINDING ─────────────────────────────────────
  initDashboardTabs() {
    document.querySelectorAll(".sidebar-item").forEach((item) => {
      item.addEventListener("click", () => {
        const tabId = item.getAttribute("data-tab");
        this.switchDashboardTab(tabId);
      });
    });
  }

  switchDashboardTab(tabId) {
    // Determine active menu set
    const parentMenu = document.querySelector(`.sidebar-item[data-tab="${tabId}"]`).closest("ul");
    parentMenu.querySelectorAll(".sidebar-item").forEach((item) => item.classList.remove("active"));
    
    const activeItem = document.querySelector(`.sidebar-item[data-tab="${tabId}"]`);
    activeItem.classList.add("active");

    // Toggle content panes
    const contentArea = activeItem.closest(".dashboard-grid").querySelector(".dashboard-content-area");
    contentArea.querySelectorAll(".dashboard-tab-content").forEach((pane) => {
      pane.style.display = "none";
      pane.classList.remove("active");
    });

    const targetPane = document.getElementById(`tab-content-${tabId}`);
    targetPane.style.display = "block";
    targetPane.classList.add("active");
  }

  loadCustomerDashboard() {
    // Populate profile details
    document.getElementById("profile-cust-first").textContent = this.currentUser.firstName;
    document.getElementById("profile-cust-last").textContent = this.currentUser.lastName;
    document.getElementById("profile-cust-email").textContent = this.currentUser.email;
    document.getElementById("profile-cust-phone").textContent = this.currentUser.phone || "Not specified";

    // Populate user bookings
    const bookingsList = document.getElementById("cust-bookings-list");
    const allBookings = JSON.parse(localStorage.getItem("bookings") || "[]");
    const userBookings = allBookings.filter((b) => b.buyerEmail === this.currentUser.email);

    if (userBookings.length === 0) {
      bookingsList.innerHTML = `<p style="color: var(--text-muted); padding: 16px 0;">No active bookings found.</p>`;
      return;
    }

    bookingsList.innerHTML = userBookings.map((b) => `
      <div class="dashboard-card glass" style="border: 1px solid var(--border); margin-bottom: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <div>
            <h4 style="color: var(--primary); font-size: 1.05rem;">${b.bookingId}</h4>
            <p style="font-size: 0.8rem; color: var(--text-muted);">${b.date}</p>
          </div>
          <span class="stock-tag stock-in" style="margin-bottom: 0;">${b.status}</span>
        </div>
        <p style="font-weight: 600; margin-bottom: 4px;">${b.productName} (x${b.quantity})</p>
        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">Farm: ${b.farmName}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px;">
          <span style="font-size: 0.85rem; color: var(--text-muted);">Amount Paid</span>
          <span style="font-weight: 700;">₦${b.totalPrice.toLocaleString()}</span>
        </div>
      </div>
    `).join("");
  }

  async loadFarmerDashboard() {
    this.switchDashboardTab("farm-list");
    const grid = document.getElementById("farmer-farms-grid");
    grid.innerHTML = `<div class="shimmer skeleton-card" style="grid-column: 1/-1;"></div>`;

    try {
      const farms = await window.EggSourceAPI.poultries.getAll();
      const ownerFarms = farms.filter((f) => f.ownerId === this.currentUser._id);

      if (ownerFarms.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">
            <p>You have not registered any poultry farms yet.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = "";
      for (const farm of ownerFarms) {
        // Fetch products for this farm
        const products = await window.EggSourceAPI.products.getAll({ poultryId: farm._id });
        const productRows = products.map((p) => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed var(--border); font-size: 0.9rem;">
            <span>${p.productName} (₦${p.pricePerCrate.toLocaleString()})</span>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.75rem;" onclick="app.openProductModal('${farm._id}', '${p._id}')">Edit</button>
              <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="app.handleProductDelete('${p._id}')">Delete</button>
            </div>
          </div>
        `).join("");

        const card = document.createElement("div");
        card.className = "dashboard-card glass";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "16px";
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <h3 style="font-size: 1.3rem;">${farm.businessName}</h3>
              <p style="font-size: 0.85rem; color: var(--text-muted);"><i data-lucide="map-pin"></i> ${farm.address}, ${farm.lga}, ${farm.state}</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn btn-outline" onclick="app.openFarmModal('${farm._id}')"><i data-lucide="edit-2"></i></button>
              <button class="btn btn-danger" onclick="app.handleFarmDelete('${farm._id}')"><i data-lucide="trash-2"></i></button>
            </div>
          </div>

          <div style="border-top: 1px solid var(--border); padding-top: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <h4 style="font-size: 1.05rem;">Products Catalog</h4>
              <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.8rem;" onclick="app.openProductModal('${farm._id}')">
                <i data-lucide="plus"></i> Add Product
              </button>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              ${productRows || '<p style="font-size: 0.85rem; color: var(--text-muted);">No products in catalog.</p>'}
            </div>
          </div>
        `;
        grid.appendChild(card);
      }

      lucide.createIcons();

      // Populate farmer incoming bookings
      const bookingsList = document.getElementById("farmer-bookings-list");
      const allBookings = JSON.parse(localStorage.getItem("bookings") || "[]");
      
      const farmIds = ownerFarms.map((f) => f._id);
      const incomingBookings = allBookings.filter((b) => farmIds.includes(b.farmId));

      if (incomingBookings.length === 0) {
        bookingsList.innerHTML = `<p style="color: var(--text-muted); padding: 16px 0;">No incoming bookings received.</p>`;
        return;
      }

      bookingsList.innerHTML = incomingBookings.map((b) => `
        <div class="dashboard-card glass" style="border: 1px solid var(--border); margin-bottom: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div>
              <h4 style="color: var(--primary); font-size: 1.05rem;">${b.bookingId}</h4>
              <p style="font-size: 0.8rem; color: var(--text-muted);">${b.date}</p>
            </div>
            <span class="stock-tag stock-in" style="margin-bottom: 0;">${b.status}</span>
          </div>
          <p style="font-weight: 600; margin-bottom: 4px;">${b.productName} (x${b.quantity})</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 4px;">Customer: ${b.buyerName} (${b.buyerPhone})</p>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">Delivery to: ${b.deliveryAddress}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border); padding-top: 12px; margin-top: 12px;">
            <span style="font-size: 0.85rem; color: var(--text-muted);">Total Value</span>
            <span style="font-weight: 700;">₦${b.totalPrice.toLocaleString()}</span>
          </div>
        </div>
      `).join("");

    } catch (err) {
      grid.innerHTML = `<p style="color: var(--danger);">Failed to load farmer panel: ${err.message}</p>`;
    }
  }

  // ── FARM MODAL CRUD ────────────────────────────────────────
  async openFarmModal(farmId = null) {
    const modal = document.getElementById("modal-farm");
    const form = document.getElementById("form-farm");
    const title = document.getElementById("modal-farm-title");
    form.reset();

    if (farmId) {
      title.textContent = "Edit Poultry Farm";
      try {
        const farm = await window.EggSourceAPI.poultries.getById(farmId);
        document.getElementById("farm-id").value = farm._id;
        document.getElementById("farm-business-name").value = farm.businessName;
        document.getElementById("farm-state").value = farm.state;
        document.getElementById("farm-lga").value = farm.lga;
        document.getElementById("farm-address").value = farm.address;
        document.getElementById("farm-phone").value = farm.phoneNumber;
        document.getElementById("farm-desc").value = farm.description || "";
        document.getElementById("farm-lng").value = farm.location.coordinates[0];
        document.getElementById("farm-lat").value = farm.location.coordinates[1];
        document.getElementById("farm-delivery").checked = farm.deliveryAvailable;
      } catch (err) {
        this.showToast("Error", "Could not fetch details", "danger");
      }
    } else {
      title.textContent = "Add Poultry Farm";
      document.getElementById("farm-id").value = "";
    }

    modal.classList.add("active");
  }

  closeFarmModal() {
    document.getElementById("modal-farm").classList.remove("active");
  }

  async handleFarmSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("farm-id").value;
    const businessName = document.getElementById("farm-business-name").value;
    const state = document.getElementById("farm-state").value;
    const lga = document.getElementById("farm-lga").value;
    const address = document.getElementById("farm-address").value;
    const phoneNumber = document.getElementById("farm-phone").value;
    const description = document.getElementById("farm-desc").value;
    const longitude = parseFloat(document.getElementById("farm-lng").value);
    const latitude = parseFloat(document.getElementById("farm-lat").value);
    const deliveryAvailable = document.getElementById("farm-delivery").checked;

    const payload = {
      businessName,
      state,
      lga,
      address,
      phoneNumber,
      description,
      longitude,
      latitude,
      deliveryAvailable,
    };

    try {
      if (id) {
        await window.EggSourceAPI.poultries.update(id, payload);
        this.showToast("Success", "Poultry farm properties updated successfully.");
      } else {
        await window.EggSourceAPI.poultries.create(payload);
        this.showToast("Success", "Poultry farm registered successfully.");
      }
      this.closeFarmModal();
      this.loadFarmerDashboard();
    } catch (err) {
      this.showToast("Error saving", err.message, "danger");
    }
  }

  async handleFarmDelete(farmId) {
    if (!confirm("Are you sure you want to delete this poultry property? This will cascade and delete all associated catalog listings!")) return;

    try {
      await window.EggSourceAPI.poultries.delete(farmId);
      this.showToast("Success", "Poultry property deleted successfully.");
      this.loadFarmerDashboard();
    } catch (err) {
      this.showToast("Error", err.message, "danger");
    }
  }

  // ── PRODUCT MODAL CRUD ─────────────────────────────────────
  async openProductModal(poultryId, productId = null) {
    const modal = document.getElementById("modal-product");
    const form = document.getElementById("form-product");
    const title = document.getElementById("modal-product-title");
    form.reset();

    document.getElementById("prod-poultry-id").value = poultryId;

    if (productId) {
      title.textContent = "Edit Catalog Product";
      try {
        const prod = await window.EggSourceAPI.products.getById(productId);
        document.getElementById("prod-id").value = prod._id;
        document.getElementById("prod-name").value = prod.productName;
        document.getElementById("prod-category").value = prod.category;
        document.getElementById("prod-price").value = prod.pricePerCrate;
        document.getElementById("prod-stock").value = prod.stockQuantity;
        document.getElementById("prod-image").value = prod.imageUrl || "";
        document.getElementById("prod-available").checked = prod.isAvailable;
      } catch (err) {
        this.showToast("Error", "Could not fetch details", "danger");
      }
    } else {
      title.textContent = "Add Product Listing";
      document.getElementById("prod-id").value = "";
    }

    modal.classList.add("active");
  }

  closeProductModal() {
    document.getElementById("modal-product").classList.remove("active");
  }

  async handleProductSubmit(e) {
    e.preventDefault();
    const id = document.getElementById("prod-id").value;
    const poultryId = document.getElementById("prod-poultry-id").value;
    const productName = document.getElementById("prod-name").value;
    const category = document.getElementById("prod-category").value;
    const pricePerCrate = parseFloat(document.getElementById("prod-price").value);
    const stockQuantity = parseInt(document.getElementById("prod-stock").value, 10);
    const imageUrl = document.getElementById("prod-image").value;
    const isAvailable = document.getElementById("prod-available").checked;

    const payload = {
      poultryId,
      productName,
      category,
      pricePerCrate,
      stockQuantity,
      imageUrl,
      isAvailable,
    };

    try {
      if (id) {
        await window.EggSourceAPI.products.update(id, payload);
        this.showToast("Success", "Catalog product listing updated.");
      } else {
        await window.EggSourceAPI.products.create(payload);
        this.showToast("Success", "Product listing added successfully.");
      }
      this.closeProductModal();
      this.loadFarmerDashboard();
    } catch (err) {
      this.showToast("Error saving", err.message, "danger");
    }
  }

  async handleProductDelete(productId) {
    if (!confirm("Are you sure you want to remove this product listing?")) return;

    try {
      await window.EggSourceAPI.products.delete(productId);
      this.showToast("Success", "Product listing deleted.");
      this.loadFarmerDashboard();
    } catch (err) {
      this.showToast("Error", err.message, "danger");
    }
  }

  // ── HOME STATS ─────────────────────────────────────────────
  async loadLandingStats() {
    try {
      const farms = await window.EggSourceAPI.poultries.getAll();
      document.getElementById("stat-farms-count").textContent = `${farms.length}+`;
    } catch (err) {
      console.warn("Failed to load statistics: ", err);
    }
  }
}

// Initialise core app globally
window.app = new EggSourceApp();
