import { Auth } from '/assets/js/auth.js';

const ICONS = {
  dashboard: 'layout-dashboard',
  orders: 'package',
  analytics: 'bar-chart-2',
  settings: 'settings',
  inventory: 'layers',
  farm: 'home',
  profile: 'user',
  requests: 'clipboard-list',
  calendar: 'calendar',
  chevronRight: 'chevron-right',
};

const debounce = (fn, wait = 350) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

export function renderNavbar(options = {}) {
  const { searchBar = false } = options;
  const root = document.getElementById('navbar-root');
  if (!root) return;

  const user = Auth.getUser();
  const token = Auth.getToken();
  const isLoggedIn = !!(token && user);

  const dashboardHref = isLoggedIn && (user.role === 'FARM_OWNER' || user.role === 'ADMIN')
    ? '/pages/dashboard-farm.html'
    : '/pages/dashboard-buyer.html';

  const navLinks = searchBar
    ? `<div class="navbar-search-pill"><input id="navbar-search-input" type="search" placeholder="Search farms or categories" aria-label="Search farms" /></div>`
    : `<ul class="navbar-links">
        <li><a class="navbar-link" href="/index.html">Home</a></li>
        <li><a class="navbar-link" href="/pages/marketplace.html">Marketplace</a></li>
      </ul>`;

  const navActions = isLoggedIn
    ? `<a class="btn btn-secondary" href="${dashboardHref}">Dashboard</a>
       <button class="btn btn-ghost" id="navbar-logout-btn" style="cursor: pointer;">Logout</button>`
    : `<a class="btn btn-ghost" href="/pages/auth.html">Login</a>
       <a class="btn btn-primary" href="/pages/auth.html">Register</a>`;

  root.innerHTML = `
    <div class="navbar-inner">
      <a class="logo" href="/index.html">
        <span class="logo-icon">ES</span>
        <span>Egg <span>Source</span></span>
      </a>
      ${navLinks}
      <div class="navbar-actions">
        ${navActions}
      </div>
    </div>
  `;

  if (isLoggedIn) {
    const logoutBtn = document.getElementById('navbar-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        Auth.logout();
      });
    }
  }

  if (searchBar) {
    const searchInput = document.getElementById('navbar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((event) => {
        window.dispatchEvent(new CustomEvent('navbar:search', { detail: { query: event.target.value } }));
      }, 350));
    }
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function renderSidebar(options = {}) {
  const { role = 'buyer', activePage = 'dashboard' } = options;
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  const items = role === 'farm'
    ? [
        { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: '/pages/dashboard-farm.html' },
        { key: 'profile', label: 'Poultry Profile', icon: ICONS.farm, href: '/pages/dashboard-farm.html' },
        { key: 'products', label: 'Product Management', icon: ICONS.inventory, href: '/pages/dashboard-farm.html' },
        { key: 'inventory', label: 'Inventory', icon: ICONS.orders, href: '/pages/dashboard-farm.html' },
        { key: 'requests', label: 'Booking Requests', icon: ICONS.requests, href: '/pages/dashboard-farm.html' },
      ]
    : [
        { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: '/pages/dashboard-buyer.html' },
        { key: 'inventory', label: 'Inventory', icon: ICONS.inventory, href: '/pages/dashboard-buyer.html' },
        { key: 'orders', label: 'Orders', icon: ICONS.orders, href: '/pages/dashboard-buyer.html' },
        { key: 'analytics', label: 'Analytics', icon: ICONS.analytics, href: '/pages/dashboard-buyer.html' },
        { key: 'settings', label: 'Settings', icon: ICONS.settings, href: '/pages/dashboard-buyer.html' },
      ];

  const brand = role === 'farm' ? 'Egg Source Dev / Seller Portal' : 'Egg Source Dev / Management Portal';
  const buttonLabel = role === 'farm' ? '+ Post Listing' : 'Browse Farms';
  const buttonHref = role === 'farm' ? '/pages/marketplace.html' : '/pages/marketplace.html';

  root.innerHTML = `
    <aside class="sidebar-card sidebar">
      <div class="sidebar-card">
        <div style="margin-bottom: 24px;"><strong>${brand}</strong></div>
        <nav class="sidebar-nav">
          ${items.map(item => `
            <a class="sidebar-link ${item.key === activePage ? 'active' : ''}" href="${item.href}">
              <span>${item.label}</span>
              <i data-lucide="${item.icon}"></i>
            </a>
          `).join('')}
        </nav>
      </div>
      <div class="sidebar-card">
        <a class="btn btn-primary" href="${buttonHref}" style="width: 100%;">${buttonLabel}</a>
        <div class="sidebar-footer" style="margin-top: 18px; gap: 12px; align-items: center;">
          <span style="font-size: 0.94rem; color: var(--color-text-muted);">Support</span>
          <a href="mailto:help@eggsource.dev" class="btn btn-ghost" style="padding: 10px 16px;">Help</a>
        </div>
      </div>
    </aside>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
