import { Auth } from '/assets/js/auth.js';
import { AdminAPI, AuthAPI, PoultryAPI } from '/assets/js/api.js';
import { Loading, Toast, $, updateGreetings } from '/assets/js/utils.js';

// Route guards
const guardAccess = () => {
  const user = Auth.getUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    window.location.href = '/login';
  }
};

// State
let stats = {};
let usersList = [];
let auditLogs = [];
let farmsList = [];

// Populate Profile Info
const populateAdminProfile = () => {
  const user = Auth.getUser() || { firstName: 'Platform', lastName: 'Admin', email: 'admin@eggconnect.app' };
  const fullName = `${user.firstName || 'Platform'} ${user.lastName || 'Admin'}`;
  const initials = `${(user.firstName || 'P')[0]}${(user.lastName || 'A')[0]}`.toUpperCase();
  
  // Dynamic time-calculated greeting
  updateGreetings('.dash-user-greeting');

  
  // Avatars
  document.querySelectorAll('.sidebar-avatar-text, .header-avatar-text, .profile-avatar-text').forEach(el => {
    el.textContent = initials;
  });

  // Display Names
  document.querySelectorAll('.sidebar-user-name-text, .user-display-name-text, .profile-name-text').forEach(el => {
    el.textContent = fullName;
  });

  // Display Emails
  document.querySelectorAll('.profile-email-text').forEach(el => {
    el.textContent = user.email;
  });

  // Input fields
  const profileFirstNameInput = $('#profile-firstName');
  if (profileFirstNameInput) profileFirstNameInput.value = user.firstName || '';

  const profileLastNameInput = $('#profile-lastName');
  if (profileLastNameInput) profileLastNameInput.value = user.lastName || '';

  const profileEmailInput = $('#profile-email-input');
  if (profileEmailInput) profileEmailInput.value = user.email || '';
};

// Tab Navigation Controller
const handleHashNavigation = () => {
  const hash = window.location.hash || '#dashboard';
  const activeTab = hash.substring(1);

  // Hide all sections
  document.querySelectorAll('.dashboard-view-panel').forEach(panel => {
    panel.classList.add('hidden');
  });

  // Highlight active menu item
  document.querySelectorAll('.sidebar-menu .menu-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('href') === hash) {
      item.classList.add('active');
    }
  });

  // Auto-close mobile drawer navigation when a menu link is clicked
  const sidebar = $('#shadcn-sidebar');
  const overlay = document.querySelector('.sidebar-overlay');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (overlay) overlay.remove();

  const breadcrumbs = {
    'dashboard': 'Overview',
    'users': 'User Directory',
    'farms': 'Poultry Farms',
    'reports': 'Platform Reports',
    'audit-logs': 'System Security Logs',
    'profile': 'Settings',
  };

  const currentLabel = breadcrumbs[activeTab] || 'Overview';
  const breadcrumbEl = $('#breadcrumb-current');
  if (breadcrumbEl) breadcrumbEl.textContent = currentLabel;

  const headers = {
    'dashboard': { title: 'Overview Dashboard', subtitle: 'Real-time system health and administration stats' },
    'users': { title: 'User Directory', subtitle: 'Manage registered buyers and farm owners' },
    'farms': { title: 'Poultry Farms', subtitle: 'View all registered poultry farms and their owners' },
    'reports': { title: 'Platform Reports', subtitle: 'Download platform metrics and view activity reports' },
    'audit-logs': { title: 'System Security Logs', subtitle: 'Stateless activity logging and platform audits' },
    'profile': { title: 'Administrator Profile', subtitle: 'Manage your administrator settings and environment context' },
  };

  const currentHeader = headers[activeTab] || headers['dashboard'];
  const viewTitleEl = $('#view-title');
  if (viewTitleEl) viewTitleEl.textContent = currentHeader.title;

  const subtitleEl = document.querySelector('.dashboard-subtitle');
  if (subtitleEl) subtitleEl.textContent = currentHeader.subtitle;

  // Show active section
  const activeSection = document.getElementById(`section-${activeTab}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Load section-specific data
  loadDataForTab(activeTab);

  // Refresh icons
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const loadDataForTab = async (tab) => {
  try {
    if (tab === 'dashboard') {
      await loadDashboardOverview();
    } else if (tab === 'users') {
      await loadUserDirectory();
    } else if (tab === 'farms') {
      await loadPoultryFarms();
    } else if (tab === 'reports') {
      await loadPlatformReports();
    } else if (tab === 'audit-logs') {
      await loadAuditLogs();
    }
  } catch (err) {
    Toast.error(err.message || 'Error loading dashboard data');
  }
};

// ── View 1: Overview ─────────────────────────────────────────
const loadDashboardOverview = async () => {
  const response = await AdminAPI.getStats();
  const data = response.data || {};
  stats = data.stats || {};

  // Populate stats safely
  const statBuyers = $('#stat-buyers');
  if (statBuyers) statBuyers.textContent = stats.buyersCount || 0;

  const statSellers = $('#stat-sellers');
  if (statSellers) statSellers.textContent = stats.sellersCount || 0;

  const statFarms = $('#stat-farms');
  if (statFarms) statFarms.textContent = stats.farmsCount || 0;

  const statBookings = $('#stat-bookings');
  if (statBookings) statBookings.textContent = stats.bookingsCount || 0;

  // Populate logins
  const loginsBody = $('#login-tbody');
  if (loginsBody) {
    loginsBody.innerHTML = '';
    const recentLogins = data.recentLogins || [];
    if (recentLogins.length === 0) {
      loginsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--color-slate-500);">No recent logins</td></tr>`;
    } else {
      recentLogins.forEach(log => {
        const user = log.userId || { firstName: 'System', lastName: 'User', email: 'N/A' };
        const time = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--color-slate-100)';
        row.innerHTML = `
          <td style="padding: 12px 0;">
            <div style="font-weight: 500; color: var(--color-slate-900);">${user.firstName} ${user.lastName}</div>
            <div style="font-size: 0.76rem; color: var(--color-slate-500);">${user.email}</div>
          </td>
          <td style="padding: 12px 0; font-family: monospace; font-size: 0.8rem; color: var(--color-slate-500);">${log.ipAddress || 'Unknown'}</td>
          <td style="padding: 12px 0; font-size: 0.8rem; color: var(--color-slate-500);">${time}</td>
        `;
        loginsBody.appendChild(row);
      });
    }
  }

  // Populate activities
  const auditBody = $('#overview-audit-tbody');
  if (auditBody) {
    auditBody.innerHTML = '';
    const recentLogs = data.recentAuditLogs || [];
    if (recentLogs.length === 0) {
      auditBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--color-slate-500);">No recent activities</td></tr>`;
    } else {
      recentLogs.forEach(log => {
        const time = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid var(--color-slate-100)';
        row.innerHTML = `
          <td style="padding: 12px 0; font-weight: 500; color: var(--color-slate-900);">${log.action}</td>
          <td style="padding: 12px 0;"><span class="badge badge-${log.severity ? log.severity.toLowerCase() : 'info'}">${log.severity || 'INFO'}</span></td>
          <td style="padding: 12px 0; font-size: 0.8rem; color: var(--color-slate-500);">${time}</td>
        `;
        auditBody.appendChild(row);
      });
    }
  }
};

// ── View 2: User Directory ───────────────────────────────────
const loadUserDirectory = async () => {
  const roleFilterEl = $('#user-role-filter');
  const searchInputEl = $('#user-search-input');
  const role = roleFilterEl ? roleFilterEl.value : '';
  const search = searchInputEl ? searchInputEl.value.trim() : '';

  const response = await AdminAPI.getUsers({ role, search });
  usersList = (response.data || []).filter(user => user.role !== 'SUPER_ADMIN');

  const tbody = $('#users-tbody');
  const cardsContainer = $('#users-cards-mobile');

  if (tbody) tbody.innerHTML = '';
  if (cardsContainer) cardsContainer.innerHTML = '';

  if (usersList.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--color-slate-500);">No users found matching requirements.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--color-slate-500); background: #fff; border-radius: 12px; border: 1px solid var(--color-slate-200);">No users found matching requirements.</div>`;
    return;
  }

  usersList.forEach(user => {
    const registeredDate = new Date(user.createdAt).toLocaleDateString();
    const initials = `${(user.firstName || 'U')[0]}${(user.lastName || '')[0] || ''}`.toUpperCase();

    // 1. Desktop Table Row
    if (tbody) {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-slate-100)';
      row.innerHTML = `
        <td style="padding: 14px 12px; font-weight: 500; color: var(--color-slate-900);">${user.firstName} ${user.lastName}</td>
        <td style="padding: 14px 12px; color: var(--color-slate-500);">${user.email}</td>
        <td style="padding: 14px 12px;"><span class="badge ${user.role === 'FARM_OWNER' ? 'badge-info' : 'badge-success'}">${user.role === 'FARM_OWNER' ? 'Farm Owner' : 'Buyer'}</span></td>
        <td style="padding: 14px 12px; color: var(--color-slate-500);">${registeredDate}</td>
        <td style="padding: 14px 12px;"><span class="badge ${user.isActive ? 'badge-success' : 'badge-critical'}">${user.isActive ? 'Active' : 'Suspended'}</span></td>
        <td style="padding: 14px 12px; text-align: right;">
          <button class="btn btn-status-toggle" data-id="${user._id}" data-active="${user.isActive}" style="font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; cursor: pointer; background: transparent; border: 1px solid ${user.isActive ? '#dc2626' : '#059669'}; color: ${user.isActive ? '#dc2626' : '#059669'}; min-height: 36px;">
            ${user.isActive ? 'Suspend' : 'Activate'}
          </button>
        </td>
      `;
      tbody.appendChild(row);
    }

    // 2. Mobile User Card
    if (cardsContainer) {
      const card = document.createElement('div');
      card.className = 'admin-user-card';
      card.innerHTML = `
        <div class="user-card-top">
          <div class="user-card-avatar">${initials}</div>
          <div class="user-card-info">
            <h4 class="user-card-name">${user.firstName} ${user.lastName}</h4>
            <p class="user-card-email">${user.email}</p>
          </div>
        </div>
        <div class="user-card-pills">
          <span class="badge ${user.role === 'FARM_OWNER' ? 'badge-info' : 'badge-success'}">${user.role === 'FARM_OWNER' ? 'Farm Owner' : 'Buyer'}</span>
          <span class="badge ${user.isActive ? 'badge-success' : 'badge-critical'}">${user.isActive ? 'Active' : 'Suspended'}</span>
        </div>
        <div class="user-card-bottom">
          <span class="user-card-date">Joined ${registeredDate}</span>
          <button class="btn btn-status-toggle" data-id="${user._id}" data-active="${user.isActive}" style="font-size: 0.8rem; padding: 8px 16px; border-radius: 8px; cursor: pointer; background: transparent; border: 1px solid ${user.isActive ? '#dc2626' : '#059669'}; color: ${user.isActive ? '#dc2626' : '#059669'}; min-height: 44px;">
            ${user.isActive ? 'Suspend' : 'Activate'}
          </button>
        </div>
      `;
      cardsContainer.appendChild(card);
    }
  });

  // Action listeners
  const attachToggleListeners = (container) => {
    if (!container) return;
    container.querySelectorAll('.btn-status-toggle').forEach(button => {
      button.addEventListener('click', async () => {
        const id = button.dataset.id;
        const currentActive = button.dataset.active === 'true';
        const targetActive = !currentActive;

        try {
          await AdminAPI.updateUserStatus(id, targetActive);
          Toast.success(`User successfully ${targetActive ? 'activated' : 'suspended'}`);
          loadUserDirectory();
        } catch (err) {
          Toast.error(err.message || 'Action failed');
        }
      });
    });
  };

  attachToggleListeners(tbody);
  attachToggleListeners(cardsContainer);
};

// ── View 3: Audit Logs ───────────────────────────────────────
const loadAuditLogs = async () => {
  const response = await AdminAPI.getAuditLogs();
  auditLogs = response.data || [];

  const tbody = $('#audit-logs-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (auditLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--color-slate-500);">No audit trails recorded.</td></tr>`;
    return;
  }

  auditLogs.forEach(log => {
    const timestamp = new Date(log.createdAt).toLocaleString();
    const user = log.userId
      ? `<div style="font-weight: 600; color: var(--color-slate-900); white-space: nowrap;">${log.userId.firstName} ${log.userId.lastName}</div><div style="font-size: 0.76rem; color: var(--color-slate-500); white-space: nowrap;">${log.userId.email} (${log.userId.role})</div>`
      : `<span style="color: var(--color-slate-500); white-space: nowrap;">Anonymous / System</span>`;

    const metadataStr = log.details ? JSON.stringify(log.details) : '{}';

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--color-slate-100)';
    row.innerHTML = `
      <td style="padding: 14px 16px; color: var(--color-slate-600); font-size: 0.8rem; font-family: monospace; white-space: nowrap;">${timestamp}</td>
      <td style="padding: 14px 16px; white-space: nowrap;"><span class="badge badge-${log.severity ? log.severity.toLowerCase() : 'info'} text-capitalize">${log.severity || 'INFO'}</span></td>
      <td style="padding: 14px 16px; font-weight: 500; color: var(--color-slate-900); white-space: nowrap;">${log.action}</td>
      <td style="padding: 14px 16px; white-space: nowrap;">${user}</td>
      <td style="padding: 14px 16px; font-family: monospace; font-size: 0.8rem; color: var(--color-slate-500); white-space: nowrap;">${log.ipAddress || 'N/A'}</td>
      <td style="padding: 14px 16px; font-size: 0.78rem; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <code title="${metadataStr}" style="background: rgba(0,0,0,0.04); padding: 3px 6px; border-radius: 4px; font-family: monospace; max-width: 240px; display: inline-block; overflow: hidden; text-overflow: ellipsis; vertical-align: middle;">${metadataStr}</code>
      </td>
    `;
    tbody.appendChild(row);
  });
};

// ── View 5: Poultry Farms ────────────────────────────────────
const loadPoultryFarms = async () => {
  const tbody = $('#farms-tbody');
  const cardsContainer = $('#farms-cards-mobile');

  if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--color-slate-500);">Loading poultry farms...</td></tr>`;
  if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--color-slate-500); background: #fff; border-radius: 12px; border: 1px solid var(--color-slate-200);">Loading poultry farms...</div>`;

  try {
    const response = await PoultryAPI.getAll();
    farmsList = response.data.poultries || response.data || [];
    renderFarmsTable(farmsList);
  } catch (err) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--color-danger-500);">${err.message || 'Failed to load poultry farms'}</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--color-danger-500); background: #fff; border-radius: 12px; border: 1px solid var(--color-slate-200);">${err.message || 'Failed to load poultry farms'}</div>`;
  }
};

const renderFarmsTable = (farms) => {
  const tbody = $('#farms-tbody');
  const cardsContainer = $('#farms-cards-mobile');

  if (tbody) tbody.innerHTML = '';
  if (cardsContainer) cardsContainer.innerHTML = '';

  if (!farms || farms.length === 0) {
    if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--color-slate-500);">No poultry farms found.</td></tr>`;
    if (cardsContainer) cardsContainer.innerHTML = `<div style="text-align: center; padding: 30px; color: var(--color-slate-500); background: #fff; border-radius: 12px; border: 1px solid var(--color-slate-200);">No poultry farms found.</div>`;
    return;
  }

  // Render desktop table rows
  if (tbody) {
    tbody.innerHTML = farms.map(farm => {
      const ownerName = farm.ownerId ? `${farm.ownerId.firstName || ''} ${farm.ownerId.lastName || ''}`.trim() : 'N/A';
      const ownerEmail = farm.ownerId ? farm.ownerId.email : 'N/A';
      const location = `${farm.state || ''} / ${farm.lga || ''}`;
      const dateStr = farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : 'N/A';
      const ratingStr = farm.rating !== undefined ? `${farm.rating.toFixed(1)} / 5.0` : '0.0 / 5.0';
      const delivery = farm.deliveryAvailable ? '<span class="badge badge-success">Delivery Yes</span>' : '<span class="badge badge-info">No Delivery</span>';

      return `
        <tr style="border-bottom: 1px solid var(--color-slate-100);">
          <td style="padding: 12px; font-weight: 600; color: var(--color-slate-900);">${farm.businessName || 'N/A'}</td>
          <td style="padding: 12px;">
            <div style="font-weight: 500; color: var(--color-slate-800);">${ownerName}</div>
            <div style="font-size: 0.75rem; color: var(--color-slate-500);">${ownerEmail}</div>
          </td>
          <td style="padding: 12px; color: var(--color-slate-600);">${farm.phoneNumber || 'N/A'}</td>
          <td style="padding: 12px; color: var(--color-slate-600);">${location}</td>
          <td style="padding: 12px; font-weight: 600; color: var(--color-primary);">${ratingStr}</td>
          <td style="padding: 12px;">${delivery}</td>
          <td style="padding: 12px; color: var(--color-slate-600);">${dateStr}</td>
        </tr>
      `;
    }).join('');
  }

  // Render mobile cards
  if (cardsContainer) {
    cardsContainer.innerHTML = farms.map(farm => {
      const ownerName = farm.ownerId ? `${farm.ownerId.firstName || ''} ${farm.ownerId.lastName || ''}`.trim() : 'N/A';
      const ownerEmail = farm.ownerId ? farm.ownerId.email : 'N/A';
      const location = `${farm.state || ''} / ${farm.lga || ''}`;
      const dateStr = farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : 'N/A';
      const ratingStr = farm.rating !== undefined ? `${farm.rating.toFixed(1)}` : '0.0';
      const delivery = farm.deliveryAvailable ? '<span class="badge badge-success">Delivery Available</span>' : '<span class="badge badge-info">Pickup Only</span>';

      return `
        <div class="admin-farm-card">
          <div class="farm-card-top">
            <div class="farm-card-icon"><i data-lucide="store" style="width: 20px; height: 20px;"></i></div>
            <div class="farm-card-title-group">
              <h4 class="farm-card-name">${farm.businessName || 'N/A'}</h4>
              <span class="farm-card-location"><i data-lucide="map-pin" style="width: 14px; height: 14px;"></i> ${location}</span>
            </div>
          </div>
          <div class="farm-card-details">
            <div class="farm-detail-item">
              <span class="farm-detail-label">Owner</span>
              <span class="farm-detail-value">${ownerName}</span>
              <span style="font-size: 0.73rem; color: var(--color-slate-500); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ownerEmail}</span>
            </div>
            <div class="farm-detail-item">
              <span class="farm-detail-label">Contact</span>
              <span class="farm-detail-value">${farm.phoneNumber || 'N/A'}</span>
            </div>
            <div class="farm-detail-item">
              <span class="farm-detail-label">Rating</span>
              <span class="farm-detail-value" style="color: var(--color-primary);">★ ${ratingStr} / 5.0</span>
            </div>
            <div class="farm-detail-item">
              <span class="farm-detail-label">Fulfillment</span>
              <div>${delivery}</div>
            </div>
          </div>
          <div class="farm-card-bottom">
            <span>Registered ${dateStr}</span>
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
};

// ── View 6: Platform Reports ──────────────────────────────────
const loadPlatformReports = async () => {
  try {
    const response = await AdminAPI.getStats();
    const data = response.data || {};
    const stats = data.stats || {};
    
    const elLogins = $('#report-login-events');
    if (elLogins) elLogins.textContent = stats.auditLogsCount || 42;

    const elInvites = $('#report-invites-sent');
    if (elInvites) elInvites.textContent = stats.sellersCount || 0;

    const elFarmsCount = $('#report-farms-count');
    if (elFarmsCount) elFarmsCount.textContent = stats.farmsCount || 0;

    const elWarnings = $('#report-warnings-count');
    if (elWarnings) elWarnings.textContent = 0;

    const elFailures = $('#report-failures-count');
    if (elFailures) elFailures.textContent = 0;

    const elCritical = $('#report-critical-count');
    if (elCritical) elCritical.textContent = 0;
  } catch (err) {
    console.error('Error fetching report stats', err);
  }
};

const downloadCSV = (filename, headers, rows) => {
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(",")].concat(rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── Layout Controls ───────────────────────────────────────────
const setupLayoutControls = () => {
  // Collapsible Sidebar logic
  const sidebarToggle = $('#sidebar-toggle-btn');
  const sidebar = $('#shadcn-sidebar');
  const wrapper = $('#main-wrapper');

  if (sidebarToggle && sidebar && wrapper) {
    sidebarToggle.addEventListener('click', () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        sidebar.classList.toggle('mobile-open');
        let overlay = document.querySelector('.sidebar-overlay');
        if (overlay) {
          overlay.remove();
        } else {
          overlay = document.createElement('div');
          overlay.className = 'sidebar-overlay';
          overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.remove();
          });
          document.body.appendChild(overlay);
        }
      } else {
        sidebar.classList.toggle('collapsed');
        wrapper.classList.toggle('expanded');
      }
    });
  }

  // Sidebar user profile dropdown toggle
  const sidebarProfileTrigger = $('#sidebar-profile-trigger');
  const sidebarProfileDropdown = $('#sidebar-profile-dropdown');

  if (sidebarProfileTrigger && sidebarProfileDropdown) {
    sidebarProfileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const isShowing = sidebarProfileDropdown.classList.toggle('show');
      sidebarProfileDropdown.classList.toggle('hidden', !isShowing);
    });

    document.addEventListener('click', (e) => {
      if (sidebarProfileDropdown && !sidebarProfileDropdown.contains(e.target) && !sidebarProfileTrigger.contains(e.target)) {
        sidebarProfileDropdown.classList.remove('show');
        sidebarProfileDropdown.classList.add('hidden');
      }
    });
  }

  // Logout button click
  const sidebarLogoutBtn = $('#sidebar-logout-btn');
  if (sidebarLogoutBtn) {
    sidebarLogoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      Auth.logout();
    });
  }
};

const setupEventListeners = () => {
  // Navigation Hash Listeners
  window.addEventListener('hashchange', handleHashNavigation);

  // Profile Form update submits
  const profileInfoForm = $('#profile-info-form');
  if (profileInfoForm) {
    profileInfoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#profile-info-submit');
      Loading.show(btn, 'Saving...');
      const payload = {
        firstName: $('#profile-firstName').value.trim(),
        lastName: $('#profile-lastName').value.trim(),
      };
      try {
        const response = await AuthAPI.updateProfile(payload);
        Auth.setUser(response.data);
        populateAdminProfile();
        Toast.success('Profile details updated successfully');
      } catch (err) {
        Toast.error(err.message || 'Failed to update profile');
      } finally {
        Loading.hide(btn);
      }
    });
  }

  // Password update form submits
  const profilePasswordForm = $('#profile-password-form');
  if (profilePasswordForm) {
    profilePasswordForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPassword = $('#password-current').value;
      const newPassword = $('#password-new').value;
      const confirmPassword = $('#password-confirm').value;

      if (newPassword !== confirmPassword) {
        Toast.error('New passwords do not match');
        return;
      }

      const btn = $('#profile-password-submit');
      Loading.show(btn, 'Updating...');
      try {
        await AuthAPI.changePassword({ currentPassword, newPassword });
        Toast.success('Password updated successfully');
        profilePasswordForm.reset();
      } catch (err) {
        Toast.error(err.message || 'Failed to update password');
      } finally {
        Loading.hide(btn);
      }
    });
  }

  // Filter trigger listeners on User Directory
  const userRoleFilter = $('#user-role-filter');
  if (userRoleFilter) {
    userRoleFilter.addEventListener('change', loadUserDirectory);
  }
  
  const userSearchInput = $('#user-search-input');
  if (userSearchInput) {
    let searchDebounce;
    userSearchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        loadUserDirectory();
      }, 300);
    });
  }

  // Farm search filter
  const farmSearchInput = $('#farm-search-input');
  if (farmSearchInput) {
    let farmDebounce;
    farmSearchInput.addEventListener('input', () => {
      clearTimeout(farmDebounce);
      farmDebounce = setTimeout(() => {
        const query = farmSearchInput.value.trim().toLowerCase();
        const filtered = farmsList.filter(f => 
          (f.businessName && f.businessName.toLowerCase().includes(query)) ||
          (f.state && f.state.toLowerCase().includes(query)) ||
          (f.lga && f.lga.toLowerCase().includes(query))
        );
        renderFarmsTable(filtered);
      }, 300);
    });
  }

  // Download CSV event listeners
  const downloadUsersBtn = $('#report-download-users');
  if (downloadUsersBtn) {
    downloadUsersBtn.addEventListener('click', async () => {
      try {
        const response = await AdminAPI.getUsers();
        const users = response.data || [];
        const headers = ["ID", "First Name", "Last Name", "Email", "Role", "Active", "Created At"];
        const rows = users.map(u => [u._id, u.firstName, u.lastName, u.email, u.role, u.isActive, u.createdAt]);
        downloadCSV("users_report.csv", headers, rows);
        Toast.success('Users registry report exported successfully');
      } catch (err) {
        Toast.error('Failed to export users report: ' + err.message);
      }
    });
  }

  const downloadFarmsBtn = $('#report-download-farms');
  if (downloadFarmsBtn) {
    downloadFarmsBtn.addEventListener('click', async () => {
      try {
        const response = await PoultryAPI.getAll();
        const farms = response.data.poultries || response.data || [];
        const headers = ["ID", "Business Name", "Phone", "State", "LGA", "Address", "Rating", "Delivery Available", "Created At"];
        const rows = farms.map(f => [f._id, f.businessName, f.phoneNumber, f.state, f.lga, f.address, f.rating, f.deliveryAvailable, f.createdAt]);
        downloadCSV("farms_report.csv", headers, rows);
        Toast.success('Farms report exported successfully');
      } catch (err) {
        Toast.error('Failed to export farms report: ' + err.message);
      }
    });
  }

  const downloadLogsBtn = $('#report-download-logs');
  if (downloadLogsBtn) {
    downloadLogsBtn.addEventListener('click', async () => {
      try {
        const response = await AdminAPI.getAuditLogs();
        const logs = response.data || [];
        const headers = ["Timestamp", "Severity", "Action", "User ID", "IP Address", "User Agent"];
        const rows = logs.map(l => {
          const userMail = l.userId ? l.userId.email : 'N/A';
          return [l.createdAt, l.severity, l.action, userMail, l.ipAddress, l.userAgent];
        });
        downloadCSV("audit_logs_report.csv", headers, rows);
        Toast.success('Security audit trail report exported successfully');
      } catch (err) {
        Toast.error('Failed to export audit logs: ' + err.message);
      }
    });
  }
};

const initPage = () => {
  guardAccess();
  populateAdminProfile();
  setupLayoutControls();
  handleHashNavigation();
  setupEventListeners();

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.addEventListener('DOMContentLoaded', initPage);

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('Service Worker registered:', reg.scope))
      .catch(err => console.error('Service Worker registration failed:', err));
  });
}
