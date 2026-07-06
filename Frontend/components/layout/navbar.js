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

  const baseHref = role === 'farm' ? '/pages/dashboard-farm.html' : '/pages/dashboard-buyer.html';

  const items = role === 'farm'
    ? [
        { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: `${baseHref}#dashboard` },
        { key: 'profile', label: 'Poultry Profile', icon: ICONS.farm, href: `${baseHref}#profile` },
        { key: 'products', label: 'Product Management', icon: ICONS.inventory, href: `${baseHref}#products` },
        { key: 'inventory', label: 'Inventory', icon: ICONS.orders, href: `${baseHref}#inventory` },
        { key: 'requests', label: 'Booking Requests', icon: ICONS.requests, href: `${baseHref}#requests` },
      ]
    : [
        { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: `${baseHref}#dashboard` },
        { key: 'inventory', label: 'Inventory', icon: ICONS.inventory, href: `${baseHref}#inventory` },
        { key: 'orders', label: 'Orders', icon: ICONS.orders, href: `${baseHref}#orders` },
        { key: 'analytics', label: 'Analytics', icon: ICONS.analytics, href: `${baseHref}#analytics` },
        { key: 'settings', label: 'Settings', icon: ICONS.settings, href: `${baseHref}#settings` },
      ];

  const brand = role === 'farm' ? 'Egg Source / Seller' : 'Egg Source / Buyer';
  const buttonLabel = role === 'farm' ? '+ Post Listing' : 'Browse Farms';
  const buttonHref = role === 'farm' ? '/pages/marketplace.html' : '/pages/marketplace.html';

  const user = Auth.getUser() || { firstName: 'Egg', lastName: 'Source', role: 'CUSTOMER', email: '' };
  const initials = `${user.firstName[0] || 'E'}${user.lastName[0] || 'S'}`;
  const roleLabel = role === 'farm' ? 'Premium Seller' : 'Verified Buyer';

  const profileBadgeHtml = `
    <div class="sidebar-profile-badge" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(31, 77, 10, 0.05); border-radius: var(--radius-card); margin-bottom: 20px; border: 1px solid rgba(31, 77, 10, 0.08);">
      <div class="avatar-circle" style="background: var(--color-primary); width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: bold; flex-shrink: 0; font-size: 0.9rem;">${initials}</div>
      <div style="min-width: 0; flex-grow: 1;">
        <div style="font-weight: var(--font-weight-semibold); font-size: 0.9rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${user.firstName} ${user.lastName}</div>
        <div style="font-size: 0.74rem; color: var(--color-text-muted); margin-top: 2px;">${roleLabel}</div>
      </div>
    </div>
  `;

  root.innerHTML = `
    <aside class="sidebar" style="position: sticky; top: 24px; display: flex; flex-direction: column; gap: 20px; width: 100%;">
      <div class="card" style="padding: 20px; border-radius: var(--radius-card); background: var(--color-card); border: 1px solid var(--color-border); box-shadow: var(--shadow-card);">
        <div style="font-size: 0.76rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-text-muted); margin-bottom: 18px; font-weight: var(--font-weight-bold);">
          ${brand}
        </div>
        ${profileBadgeHtml}
        <nav class="sidebar-nav" style="display: flex; flex-direction: column; gap: 6px;">
          ${items.map(item => {
            const isActive = item.key === activePage;
            const activeStyle = isActive 
              ? 'background: rgba(31, 77, 10, 0.08); border-color: var(--color-light-green); color: var(--color-primary); font-weight: var(--font-weight-semibold);' 
              : 'color: var(--color-text-muted); border-color: transparent;';
            return `
              <a class="sidebar-link ${isActive ? 'active' : ''}" href="${item.href}" data-tab="${item.key}" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-btn); text-decoration: none; border: 1px solid; transition: var(--transition); ${activeStyle}">
                <i data-lucide="${item.icon}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
                <span style="font-size: 0.92rem;">${item.label}</span>
              </a>
            `;
          }).join('')}
        </nav>
      </div>
      <div class="card" style="padding: 20px; border-radius: var(--radius-card); background: var(--color-card); border: 1px solid var(--color-border); box-shadow: var(--shadow-card); display: flex; flex-direction: column; gap: 16px;">
        <a class="btn btn-primary" href="${buttonHref}" style="width: 100%; text-align: center; justify-content: center;">${buttonLabel}</a>
        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--color-border); padding-top: 14px; margin-top: 4px;">
          <span style="font-size: 0.86rem; color: var(--color-text-muted);">Support Portal</span>
          <a href="mailto:help@eggsource.dev" class="btn btn-ghost btn-pill" style="font-size: 0.8rem; padding: 6px 12px;">Help</a>
        </div>
      </div>
    </aside>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
