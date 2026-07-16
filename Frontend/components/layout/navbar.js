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
  help: 'help-circle',
};

const debounce = (fn, wait = 350) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
};

function initHelpModal() {
  if (document.getElementById('help-modal')) return;

  const modalContainer = document.createElement('div');
  modalContainer.id = 'help-modal';
  modalContainer.className = 'modal-overlay';
  modalContainer.style.cssText = 'display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(8px); place-items: center; z-index: 10000; opacity: 0; transition: opacity 0.25s ease;';
  
  modalContainer.innerHTML = `
    <div class="modal-content card" style="max-width: 500px; padding: 28px; width: 90%; background: var(--color-card); border-radius: var(--radius-card); box-shadow: var(--shadow-card); position: relative; border: 1px solid var(--color-border);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--color-border); padding-bottom: 14px;">
        <h2 style="margin: 0; font-size: 1.25rem; font-weight: 800; display: flex; align-items: center; gap: 8px; color: var(--color-text);">
          <i data-lucide="help-circle" style="width: 22px; height: 22px; color: var(--color-primary);"></i>
          Help & Support
        </h2>
        <button id="close-help-modal-btn" style="background: none; border: none; cursor: pointer; color: var(--color-text-muted); display: grid; place-items: center; padding: 4px;">
          <i data-lucide="x" style="width: 22px; height: 22px;"></i>
        </button>
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <h4 style="margin: 0 0 6px; font-weight: 600; color: var(--color-text);">Frequently Asked Questions</h4>
          <div style="font-size: 0.85rem; color: var(--color-text-muted); display: flex; flex-direction: column; gap: 12px; margin-top: 8px;">
            <div>
              <strong style="color: var(--color-text);">How do I place an order?</strong>
              <p style="margin: 4px 0 0; line-height: 1.4;">Browse verified poultry farms or depots from the marketplace, click on the farm, select your desired products and quantities, and place your booking.</p>
            </div>
            <div>
              <strong style="color: var(--color-text);">How is payment handled?</strong>
              <p style="margin: 4px 0 0; line-height: 1.4;">Fulfillment steps and payment confirmations are coordinated directly between the buyer and poultry farm representatives upon booking validation.</p>
            </div>
          </div>
        </div>
        
        <div style="border-top: 1px solid var(--color-border); padding-top: 16px; margin-top: 4px;">
          <h4 style="margin: 0 0 6px; font-weight: 600; color: var(--color-text);">Need further assistance?</h4>
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin: 0 0 16px; line-height: 1.4;">Our dedicated support desk is available 24/7. Send us a message and we will respond instantly.</p>
          <a href="mailto:support@eggsource.dev" class="btn btn-primary" style="width: 100%; text-align: center; justify-content: center; display: flex; align-items: center; gap: 8px;">
            <i data-lucide="mail" style="width: 16px; height: 16px;"></i> Send an Email Inquiry
          </a>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalContainer);

  const closeModalBtn = modalContainer.querySelector('#close-help-modal-btn');
  closeModalBtn.addEventListener('click', () => {
    hideHelpModal();
  });

  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      hideHelpModal();
    }
  });
}

function showHelpModal() {
  initHelpModal();
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  modal.style.display = 'grid';
  modal.offsetHeight; // force reflow
  modal.style.opacity = '1';
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function hideHelpModal() {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.display = 'none';
  }, 250);
}

export function renderNavbar(options = {}) {
  const { searchBar = false, hideNavLinks = false } = options;
  const root = document.getElementById('navbar-root');
  if (!root) return;

  const user = Auth.getUser();
  const token = Auth.getToken();
  const isLoggedIn = !!(token && user);

  let dashboardHref = '/pages/dashboard-buyer.html';
  if (isLoggedIn) {
    if (user.role === 'SUPER_ADMIN') {
      dashboardHref = '/pages/dashboard-admin.html';
    } else if (user.role === 'FARM_OWNER') {
      dashboardHref = '/pages/dashboard-farm.html';
    }
  }

  const isSellerOrAdmin = isLoggedIn && (user.role === 'SUPER_ADMIN' || user.role === 'FARM_OWNER');
  const isAuthPage = window.location.pathname.endsWith('auth.html');
  const isHomePage = window.location.pathname === '/' || window.location.pathname.endsWith('index.html') || window.location.pathname === '';

  // Remove Marketplace/Home links for admin or seller roles, on auth page, on home page, or if explicitly requested to hide them
  const navLinks = isSellerOrAdmin || isAuthPage || isHomePage || hideNavLinks
    ? ''
    : searchBar
      ? `<div class="navbar-search-pill"><input id="navbar-search-input" type="search" placeholder="Search farms or categories" aria-label="Search farms" /></div>`
      : `<ul class="navbar-links">
          <li><a class="navbar-link" href="/index.html">Home</a></li>
          <li><a class="navbar-link" href="/pages/marketplace.html">Marketplace</a></li>
        </ul>`;
  
  const isDashboardPage = window.location.pathname.includes('dashboard-');
  let navActions = '';
  if (isLoggedIn) {
    navActions = isDashboardPage
      ? ''
      : `<a class="btn btn-primary btn-pill" href="${dashboardHref}" style="padding: 10px 24px; font-weight: 600; font-size: 0.92rem; box-shadow: 0 4px 14px rgba(31, 77, 10, 0.2); transition: var(--transition); display: inline-flex; align-items: center; gap: 8px;">Go to Dashboard <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i></a>`;
  } else {
    const params = new URLSearchParams(window.location.search);
    const activeTab = isAuthPage
      ? (params.get('tab') === 'register' ? 'signup' : 'signin')
      : 'signup';

    if (activeTab === 'signin') {
      navActions = `
        <a class="btn btn-primary btn-pill" href="/pages/auth.html?tab=login" style="padding: 10px 24px; font-weight: 600; font-size: 0.92rem; box-shadow: 0 4px 14px rgba(31, 77, 10, 0.2); transition: var(--transition); display: inline-flex; align-items: center; gap: 8px;">Sign In <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i></a>
        <a class="btn btn-ghost btn-pill" href="/pages/auth.html?tab=register" style="border: none; padding: 10px 22px; font-weight: 600; font-size: 0.92rem; color: var(--color-text);">Sign Up</a>
      `;
    } else {
      navActions = `
        <a class="btn btn-ghost btn-pill" href="/pages/auth.html?tab=login" style="border: none; padding: 10px 22px; font-weight: 600; font-size: 0.92rem; color: var(--color-text);">Sign In</a>
        <a class="btn btn-primary btn-pill" href="/pages/auth.html?tab=register" style="padding: 10px 24px; font-weight: 600; font-size: 0.92rem; box-shadow: 0 4px 14px rgba(31, 77, 10, 0.2); transition: var(--transition); display: inline-flex; align-items: center; gap: 8px;">Sign Up <i data-lucide="arrow-right" style="width: 16px; height: 16px;"></i></a>
      `;
    }
  }

  root.innerHTML = `
    <header>
      <div class="navbar-inner">
        <a class="logo" href="/index.html" style="cursor: pointer; display: flex; align-items: center; gap: 8px; text-decoration: none;">
          <img src="/assets/images/logo-egg.png" alt="Egg Source Logo" class="logo-icon">
          <span>Egg <span>Source</span></span>
        </a>
        ${navLinks}
        <div class="navbar-actions">
          ${navActions}
        </div>
      </div>
    </header>
  `;

  if (searchBar) {
    const searchInput = document.getElementById('navbar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', debounce((event) => {
        window.dispatchEvent(new CustomEvent('navbar:search', { detail: { query: event.target.value } }));
      }, 350));
    }
  }

  // Bind help triggers
  initHelpModal();
  document.querySelectorAll('.help-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showHelpModal();
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

export function renderSidebar(options = {}) {
  const { role = 'buyer', activePage = 'dashboard' } = options;
  const root = document.getElementById('sidebar-root');
  if (!root) return;

  let baseHref = '/pages/dashboard-buyer.html';
  if (role === 'farm') {
    baseHref = '/pages/dashboard-farm.html';
  } else if (role === 'admin') {
    baseHref = '/pages/dashboard-admin.html';
  }

  let items = [];
  if (role === 'farm') {
    items = [
      { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: `${baseHref}#dashboard` },
      { key: 'profile', label: 'Poultry Profile', icon: ICONS.farm, href: `${baseHref}#profile` },
      { key: 'products', label: 'Product Management', icon: ICONS.inventory, href: `${baseHref}#products` },
      { key: 'inventory', label: 'Inventory', icon: ICONS.orders, href: `${baseHref}#inventory` },
      { key: 'requests', label: 'Booking Requests', icon: ICONS.requests, href: `${baseHref}#requests` },
    ];
  } else if (role === 'admin') {
    items = [
      { key: 'dashboard', label: 'Overview', icon: ICONS.dashboard, href: `${baseHref}#dashboard` },
      { key: 'users', label: 'User Directory', icon: ICONS.profile, href: `${baseHref}#users` },
      { key: 'invitations', label: 'Invitation Manager', icon: ICONS.requests, href: `${baseHref}#invitations` },
      { key: 'audit-logs', label: 'System Audit Logs', icon: ICONS.calendar, href: `${baseHref}#audit-logs` },
    ];
  } else {
    items = [
      { key: 'dashboard', label: 'Dashboard', icon: ICONS.dashboard, href: `${baseHref}#dashboard` },
      { key: 'inventory', label: 'Inventory', icon: ICONS.inventory, href: `${baseHref}#inventory` },
      { key: 'orders', label: 'Orders', icon: ICONS.orders, href: `${baseHref}#orders` },
      { key: 'analytics', label: 'Analytics', icon: ICONS.analytics, href: `${baseHref}#analytics` },
      { key: 'profile', label: 'Profile', icon: ICONS.profile, href: `${baseHref}#profile` },
      { key: 'help', label: 'Help & Support', icon: ICONS.help, href: 'mailto:help@eggsource.dev' },
    ];
  }

  let brand = 'Egg Source / Buyer';
  let buttonLabel = 'Browse Farms';
  let buttonHref = '/pages/marketplace.html';

  if (role === 'farm') {
    brand = 'Egg Source / Seller';
    buttonLabel = '+ Post Listing';
  } else if (role === 'admin') {
    brand = 'Egg Source / Admin';
    buttonLabel = 'Manage Invitations';
    buttonHref = `${baseHref}#invitations`;
  }

  const user = Auth.getUser() || { firstName: 'Egg', lastName: 'Source', role: 'CUSTOMER', email: '' };
  const initials = `${user.firstName[0] || 'E'}${user.lastName[0] || 'S'}`;
  
  let roleLabel = 'Verified Buyer';
  if (role === 'farm') {
    roleLabel = 'Premium Seller';
  } else if (role === 'admin') {
    roleLabel = 'System Admin';
  }

  const profileBadgeHtml = `
    <div class="sidebar-profile-container" style="position: relative; margin-bottom: 20px;">
      <div id="sidebar-profile-trigger" class="sidebar-profile-badge" style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: rgba(31, 77, 10, 0.05); border-radius: var(--radius-card); border: 1px solid rgba(31, 77, 10, 0.08); cursor: pointer; transition: all 0.2s ease; user-select: none;">
        <div class="avatar-circle" style="background: var(--color-primary); width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; color: #fff; font-weight: bold; flex-shrink: 0; font-size: 0.9rem;">${initials}</div>
        <div style="min-width: 0; flex-grow: 1;">
          <div style="font-weight: var(--font-weight-semibold); font-size: 0.9rem; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.2;">${user.firstName} ${user.lastName}</div>
          <div style="font-size: 0.74rem; color: var(--color-text-muted); margin-top: 2px;">${roleLabel}</div>
        </div>
        <i data-lucide="chevron-down" style="width: 16px; height: 16px; color: var(--color-text-muted); flex-shrink: 0;"></i>
      </div>
      
      <div id="sidebar-profile-dropdown" class="dropdown-menu" style="left: 0; right: 0; top: calc(100% + 8px); width: auto; z-index: 1050; padding: 6px; box-shadow: var(--shadow-card); border: 1px solid var(--color-border); background: var(--color-card); border-radius: var(--radius-card);">
        <a href="/index.html" class="dropdown-item" style="display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-btn); text-decoration: none; color: var(--color-text); font-size: 0.88rem; transition: var(--transition);">
          <i data-lucide="home" style="width: 16px; height: 16px; color: var(--color-text-muted);"></i> Go to Home Page
        </a>
        <div style="border-top: 1px solid var(--color-border); margin: 6px 0;"></div>
        <button id="sidebar-logout-btn" class="dropdown-item dropdown-item--logout" style="width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: var(--radius-btn); border: none; background: none; text-align: left; cursor: pointer; color: #dc2626; font-size: 0.88rem; font-weight: 500; transition: var(--transition);">
          <i data-lucide="log-out" style="width: 16px; height: 16px; color: #dc2626;"></i> Logout
        </button>
      </div>
    </div>
  `;

  let cardHtml = '';
  if (role === 'farm') {
    cardHtml = `
      <div class="card" style="padding: 20px; border-radius: var(--radius-card); background: var(--color-card); border: 1px solid var(--color-border); box-shadow: var(--shadow-card); display: flex; flex-direction: column; gap: 10px;">
        <a href="mailto:support@send.mahfuzmfb.com" class="btn btn-secondary" style="width: 100%; text-align: center; justify-content: center; gap: 8px; font-size: 0.86rem; display: flex; align-items: center;">
          <i data-lucide="mail" style="width: 16px; height: 16px;"></i> Email Support
        </a>
        <a href="mailto:help@send.mahfuzmfb.com" class="btn btn-ghost" style="width: 100%; text-align: center; justify-content: center; gap: 8px; font-size: 0.86rem; display: flex; align-items: center; border-color: var(--color-border);">
          <i data-lucide="help-circle" style="width: 16px; height: 16px;"></i> Help Center
        </a>
      </div>
    `;
  } else {
    cardHtml = '';
  }

  root.innerHTML = `
    <aside class="sidebar" style="position: sticky; top: 24px; display: flex; flex-direction: column; gap: 20px; width: 100%;">
      <div class="card" style="padding: 20px; border-radius: var(--radius-card); background: var(--color-card); border: 1px solid var(--color-border); box-shadow: var(--shadow-card);">
        ${profileBadgeHtml}
        <nav class="sidebar-nav" style="display: flex; flex-direction: column; gap: 6px;">
          ${items.map(item => {
            const isActive = item.key === activePage;
            const activeStyle = isActive 
              ? 'background: rgba(31, 77, 10, 0.08); border-color: var(--color-light-green); color: var(--color-primary); font-weight: var(--font-weight-semibold);' 
              : 'color: var(--color-text-muted); border-color: transparent;';
            const isHelp = item.key === 'help';
            const dataTabAttr = isHelp ? '' : `data-tab="${item.key}"`;
            const extraClass = isHelp ? 'help-trigger' : '';
            return `
              <a class="sidebar-link ${isActive ? 'active' : ''} ${extraClass}" href="${item.href}" ${dataTabAttr} style="display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: var(--radius-btn); text-decoration: none; border: 1px solid; transition: var(--transition); ${activeStyle}">
                <i data-lucide="${item.icon}" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
                <span style="font-size: 0.92rem;">${item.label}</span>
              </a>
            `;
          }).join('')}
        </nav>
      </div>
      ${cardHtml}
    </aside>
  `;

  // Bind sidebar profile dropdown toggle
  const trigger = document.getElementById('sidebar-profile-trigger');
  const dropdown = document.getElementById('sidebar-profile-dropdown');
  if (trigger && dropdown) {
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('show');
    });
  }

  // Bind sidebar logout
  const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }

  // Bind help triggers
  initHelpModal();
  document.querySelectorAll('.help-trigger').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      showHelpModal();
    });
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}
