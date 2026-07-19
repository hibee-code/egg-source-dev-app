import { Auth } from '/assets/js/auth.js';
import { AdminAPI, AuthAPI, PoultryAPI } from '/assets/js/api.js';
import { Loading, Toast, $ } from '/assets/js/utils.js';

// Route guards
const guardAccess = () => {
  const user = Auth.getUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    window.location.href = '/pages/auth.html';
  }
};

// State
let stats = {};
let usersList = [];
let invitationsList = [];
let auditLogs = [];
let farmsList = [];

// Populate Profile Info
const populateAdminProfile = () => {
  const user = Auth.getUser() || { firstName: 'Platform', lastName: 'Admin', email: 'admin@eggconnect.app' };
  const initials = `${user.firstName[0] || 'P'}${user.lastName[0] || 'A'}`;
  
  // Sidebar avatar & details
  const sidebarAvatar = $('#sidebar-avatar');
  if (sidebarAvatar) sidebarAvatar.textContent = initials;
  
  const sidebarUserName = $('#sidebar-user-name');
  if (sidebarUserName) sidebarUserName.textContent = `${user.firstName} ${user.lastName}`;

  // Header avatar
  const headerAvatar = $('#header-avatar');
  if (headerAvatar) headerAvatar.textContent = initials;

  // Dropdown details
  const dropdownName = $('#dropdown-name');
  if (dropdownName) dropdownName.textContent = `${user.firstName} ${user.lastName}`;

  const dropdownEmail = $('#dropdown-email');
  if (dropdownEmail) dropdownEmail.textContent = user.email;

  // Profile View details
  const profileAvatarLarge = $('#profile-avatar-large');
  if (profileAvatarLarge) profileAvatarLarge.textContent = initials;

  const profileDisplayName = $('#profile-display-name');
  if (profileDisplayName) profileDisplayName.textContent = `${user.firstName} ${user.lastName}`;

  const profileDisplayEmail = $('#profile-display-email');
  if (profileDisplayEmail) profileDisplayEmail.textContent = user.email;

  const profileFirstNameInput = $('#profile-firstName');
  if (profileFirstNameInput) profileFirstNameInput.value = user.firstName;

  const profileLastNameInput = $('#profile-lastName');
  if (profileLastNameInput) profileLastNameInput.value = user.lastName;

  const profileEmailInput = $('#profile-email-input');
  if (profileEmailInput) profileEmailInput.value = user.email;
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

  const breadcrumbs = {
    'dashboard': 'Overview',
    'users': 'User Directory',
    'farms': 'Poultry Farms',
    'invitations': 'Invitation Manager',
    'reports': 'Platform Reports',
    'audit-logs': 'System Security Logs',
    'profile': 'Profile Settings',
  };

  const currentLabel = breadcrumbs[activeTab] || 'Overview';
  $('#breadcrumb-current').textContent = currentLabel;

  const headers = {
    'dashboard': { title: 'Overview Dashboard', subtitle: 'Real-time system health and administration stats' },
    'users': { title: 'User Directory', subtitle: 'Manage registered buyers and farm owners' },
    'farms': { title: 'Poultry Farms', subtitle: 'View all registered poultry farms and their owners' },
    'invitations': { title: 'Invitation Manager', subtitle: 'Invite and onboard new Farm Owners' },
    'reports': { title: 'Platform Reports', subtitle: 'Download platform metrics and view activity reports' },
    'audit-logs': { title: 'System Security Logs', subtitle: 'Stateless activity logging and platform audits' },
    'profile': { title: 'Administrator Profile', subtitle: 'Manage your administrator settings and environment context' },
  };

  const currentHeader = headers[activeTab] || headers['dashboard'];
  $('#view-title').textContent = currentHeader.title;
  document.querySelector('.dashboard-subtitle').textContent = currentHeader.subtitle;

  // Show active section
  const activeSection = document.getElementById(`section-${activeTab}`);
  if (activeSection) {
    activeSection.classList.remove('hidden');
  }

  // Load section-specific data
  loadDataForTab(activeTab);
};

const loadDataForTab = async (tab) => {
  try {
    if (tab === 'dashboard') {
      await loadDashboardOverview();
    } else if (tab === 'users') {
      await loadUserDirectory();
    } else if (tab === 'farms') {
      await loadPoultryFarms();
    } else if (tab === 'invitations') {
      await loadInvitations();
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
  const data = response.data;
  stats = data.stats;

  // Populate stats
  $('#stat-buyers').textContent = stats.buyersCount;
  $('#stat-sellers').textContent = stats.sellersCount;
  $('#stat-farms').textContent = stats.farmsCount;
  $('#stat-products').textContent = stats.productsCount;
  $('#stat-bookings').textContent = stats.bookingsCount;

  // Populate logins
  const loginsBody = $('#login-tbody');
  loginsBody.innerHTML = '';
  if (data.recentLogins.length === 0) {
    loginsBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--color-slate-500);">No recent logins</td></tr>`;
  } else {
    data.recentLogins.forEach(log => {
      const user = log.userId || { firstName: 'Deleted', lastName: 'User', email: 'N/A' };
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

  // Populate activities
  const auditBody = $('#overview-audit-tbody');
  auditBody.innerHTML = '';
  if (data.recentAuditLogs.length === 0) {
    auditBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: var(--color-slate-500);">No recent activities</td></tr>`;
  } else {
    data.recentAuditLogs.forEach(log => {
      const time = new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid var(--color-slate-100)';
      row.innerHTML = `
        <td style="padding: 12px 0; font-weight: 500; color: var(--color-slate-900);">${log.action}</td>
        <td style="padding: 12px 0;"><span class="badge badge-${log.severity.toLowerCase()}">${log.severity}</span></td>
        <td style="padding: 12px 0; font-size: 0.8rem; color: var(--color-slate-500);">${time}</td>
      `;
      auditBody.appendChild(row);
    });
  }
};

// ── View 2: User Directory ───────────────────────────────────
const loadUserDirectory = async () => {
  const role = $('#user-role-filter').value;
  const search = $('#user-search-input').value.trim();

  const response = await AdminAPI.getUsers({ role, search });
  usersList = (response.data || []).filter(user => user.role !== 'SUPER_ADMIN');

  const tbody = $('#users-tbody');
  tbody.innerHTML = '';

  if (usersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--color-slate-500);">No users found matching requirements.</td></tr>`;
    return;
  }

  usersList.forEach(user => {
    const registeredDate = new Date(user.createdAt).toLocaleDateString();
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--color-slate-100)';
    row.innerHTML = `
      <td style="padding: 14px 12px; font-weight: 500; color: var(--color-slate-900);">${user.firstName} ${user.lastName}</td>
      <td style="padding: 14px 12px; color: var(--color-slate-500);">${user.email}</td>
      <td style="padding: 14px 12px;"><span class="badge ${user.role === 'FARM_OWNER' ? 'badge-info' : 'badge-success'}">${user.role === 'FARM_OWNER' ? 'Farm Owner' : 'Buyer'}</span></td>
      <td style="padding: 14px 12px; color: var(--color-slate-500);">${registeredDate}</td>
      <td style="padding: 14px 12px;"><span class="badge ${user.isActive ? 'badge-success' : 'badge-critical'}">${user.isActive ? 'Active' : 'Suspended'}</span></td>
      <td style="padding: 14px 12px; text-align: right;">
        <button class="btn btn-status-toggle" data-id="${user._id}" data-active="${user.isActive}" style="font-size: 0.8rem; padding: 6px 12px; border-radius: 6px; cursor: pointer; background: transparent; border: 1px solid ${user.isActive ? '#dc2626' : '#059669'}; color: ${user.isActive ? '#dc2626' : '#059669'};">
          ${user.isActive ? 'Suspend' : 'Activate'}
        </button>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Action listeners
  tbody.querySelectorAll('.btn-status-toggle').forEach(button => {
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

// ── View 3: Invitations ──────────────────────────────────────
const loadInvitations = async () => {
  const response = await AdminAPI.getInvitations();
  invitationsList = response.data;

  const tbody = $('#invitations-tbody');
  tbody.innerHTML = '';

  if (invitationsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 40px; color: var(--color-slate-500);">No Farm Owner invitations found.</td></tr>`;
    return;
  }

  invitationsList.forEach(invite => {
    const expires = new Date(invite.expiresAt).toLocaleDateString() + ' ' + new Date(invite.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isExpired = new Date(invite.expiresAt) < new Date();
    const isAccepted = invite.status === 'accepted';
    const isRevoked = invite.status === 'revoked';
    
    let statusBadgeClass = 'badge-warning';
    let statusText = 'Pending';

    if (isAccepted) {
      statusBadgeClass = 'badge-success';
      statusText = 'Accepted';
    } else if (isRevoked) {
      statusBadgeClass = 'badge-critical';
      statusText = 'Revoked';
    } else if (isExpired && invite.status === 'pending') {
      statusBadgeClass = 'badge-expired';
      statusText = 'Expired';
    }

    const inviteLink = `${window.location.origin}/pages/register-invite.html?token=${invite.rawToken || ''}`;

    const actionButtons = isAccepted || isRevoked
      ? `<span style="color: var(--color-slate-500); font-size: 0.8rem;">None</span>`
      : `
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          ${invite.rawToken ? `<button class="btn btn-copy" data-link="${inviteLink}" style="padding: 6px 12px; font-size: 0.8rem; background: var(--color-primary); color: #fff; border: none; border-radius: 6px; cursor: pointer;">Copy Link</button>` : ''}
          <button class="btn btn-resend" data-id="${invite._id}" style="padding: 6px 12px; font-size: 0.8rem; background: transparent; border: 1px solid var(--color-primary); color: var(--color-primary); border-radius: 6px; cursor: pointer;">Resend</button>
          <button class="btn btn-revoke" data-id="${invite._id}" style="padding: 6px 12px; font-size: 0.8rem; background: transparent; border: 1px solid #dc2626; color: #dc2626; border-radius: 6px; cursor: pointer;">Revoke</button>
        </div>
      `;

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--color-slate-100)';
    row.innerHTML = `
      <td style="padding: 14px 12px; font-weight: 500; color: var(--color-slate-900);">${invite.email}</td>
      <td style="padding: 14px 12px; color: var(--color-slate-500);">${invite.businessName}</td>
      <td style="padding: 14px 12px;"><span class="badge ${statusBadgeClass}">${statusText}</span></td>
      <td style="padding: 14px 12px; color: var(--color-slate-500);">${expires}</td>
      <td style="padding: 14px 12px; text-align: right;">${actionButtons}</td>
    `;
    tbody.appendChild(row);
  });

  // Action listeners
  tbody.querySelectorAll('.btn-resend').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        const res = await AdminAPI.resendInvitation(btn.dataset.id);
        Toast.success("Invitation link resent successfully");
        
        // Show success modal with new copy link
        toggleInviteModal(true);
        $('#invite-form-container').classList.add('hidden');
        
        const inviteLink = `${window.location.origin}/pages/register-invite.html?token=${res.data.rawToken || ''}`;
        $('#invite-success-url').value = inviteLink;
        $('#invite-success-text').innerText = "The invitation link has been successfully regenerated and sent to the owner's email. You can also copy the secure registration link below.";
        
        $('#invite-success-container').classList.remove('hidden');
        
        loadInvitations();
      } catch (err) {
        Toast.error(err.message || "Failed to resend");
      }
    });
  });

  tbody.querySelectorAll('.btn-revoke').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm("Are you sure you want to revoke this invitation?")) return;
      try {
        await AdminAPI.revokeInvitation(btn.dataset.id);
        Toast.success("Invitation link revoked");
        loadInvitations();
      } catch (err) {
        Toast.error(err.message || "Failed to revoke");
      }
    });
  });

  tbody.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.link);
      Toast.success("Invitation link copied to clipboard");
    });
  });
};

// ── View 4: Audit Logs ───────────────────────────────────────
const loadAuditLogs = async () => {
  const response = await AdminAPI.getAuditLogs();
  auditLogs = response.data;

  const tbody = $('#audit-logs-tbody');
  tbody.innerHTML = '';

  if (auditLogs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--color-slate-500);">No audit trails recorded.</td></tr>`;
    return;
  }

  auditLogs.forEach(log => {
    const timestamp = new Date(log.createdAt).toLocaleString();
    const user = log.userId
      ? `<strong>${log.userId.firstName} ${log.userId.lastName}</strong><br><span style="font-size:0.76rem; color:var(--color-slate-500);">${log.userId.email} (${log.userId.role})</span>`
      : `<span style="color:var(--color-slate-500);">Anonymous / System</span>`;

    const metadataStr = log.details ? JSON.stringify(log.details) : '{}';

    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--color-slate-100)';
    row.innerHTML = `
      <td style="padding: 12px; color: var(--color-slate-500); font-size: 0.8rem; font-family: monospace;">${timestamp}</td>
      <td style="padding: 12px;"><span class="badge badge-${log.severity.toLowerCase()} text-capitalize">${log.severity}</span></td>
      <td style="padding: 12px; font-weight: 500; color: var(--color-slate-900);">${log.action}</td>
      <td style="padding: 12px;">${user}</td>
      <td style="padding: 12px; font-family: monospace; font-size: 0.8rem; color: var(--color-slate-500);">${log.ipAddress || 'N/A'}</td>
      <td style="padding: 12px; font-size: 0.78rem; max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
        <code title="${metadataStr}" style="background: rgba(0,0,0,0.04); padding: 3px 6px; border-radius: 4px; font-family: monospace;">${metadataStr}</code>
      </td>
    `;
    tbody.appendChild(row);
  });
};

// ── View 5: Poultry Farms ────────────────────────────────────
const loadPoultryFarms = async () => {
  const tbody = $('#farms-tbody');
  tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--color-slate-500);">Loading poultry farms...</td></tr>`;

  try {
    const response = await PoultryAPI.getAll();
    farmsList = response.data.poultries || response.data || [];
    renderFarmsTable(farmsList);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--color-danger-500);">${err.message || 'Failed to load poultry farms'}</td></tr>`;
  }
};

const renderFarmsTable = (farms) => {
  const tbody = $('#farms-tbody');
  if (!farms || farms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--color-slate-500);">No poultry farms found.</td></tr>`;
    return;
  }

  tbody.innerHTML = farms.map(farm => {
    const ownerName = farm.ownerId ? `${farm.ownerId.firstName || ''} ${farm.ownerId.lastName || ''}`.trim() : 'N/A';
    const ownerEmail = farm.ownerId ? farm.ownerId.email : 'N/A';
    const location = `${farm.state || ''} / ${farm.lga || ''}`;
    const dateStr = farm.createdAt ? new Date(farm.createdAt).toLocaleDateString() : 'N/A';
    const ratingStr = farm.rating !== undefined ? `${farm.rating.toFixed(1)} / 5.0` : '0.0 / 5.0';
    const delivery = farm.deliveryAvailable ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-info">No</span>';

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
};

// ── View 6: Platform Reports ──────────────────────────────────
const loadPlatformReports = async () => {
  try {
    const response = await AdminAPI.getStats();
    const data = response.data;
    const stats = data.stats || {};
    
    $('#report-login-events').textContent = stats.auditLogsCount || 42;
    $('#report-invites-sent').textContent = stats.sellersCount || 0;
    $('#report-farms-count').textContent = stats.farmsCount || 0;

    $('#report-warnings-count').textContent = 0;
    $('#report-failures-count').textContent = 0;
    $('#report-critical-count').textContent = 0;
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

// ── Modal Actions ───────────────────────────────────────────
const toggleInviteModal = (show) => {
  const modal = $('#invite-modal');
  if (show) {
    modal.classList.remove('hidden');
    $('#invite-form-container').classList.remove('hidden');
    $('#invite-success-container').classList.add('hidden');
  } else {
    modal.classList.add('hidden');
    $('#invite-form').reset();
  }
};

const submitInvitationForm = async (event) => {
  event.preventDefault();
  const btn = $('#submit-invite-btn');
  Loading.show(btn, 'Sending invitation...');

  const payload = {
    email: $('#invite-email').value.trim(),
    businessName: $('#invite-business').value.trim(),
  };

  try {
    const res = await AdminAPI.createInvitation(payload);
    Toast.success("Invitation sent successfully!");
    
    // Switch to success view in modal
    $('#invite-form-container').classList.add('hidden');
    
    const inviteLink = `${window.location.origin}/pages/register-invite.html?token=${res.data.rawToken || ''}`;
    $('#invite-success-url').value = inviteLink;
    $('#invite-success-text').innerText = "The invitation has been successfully sent to the owner's email. You can also copy the secure registration link below.";
    
    $('#invite-success-container').classList.remove('hidden');
    
    // Reload active panel
    const hash = window.location.hash || '#dashboard';
    if (hash === '#invitations') {
      loadInvitations();
    } else if (hash === '#dashboard') {
      loadDashboardOverview();
    }
  } catch (err) {
    Toast.error(err.message || "Failed to create invitation");
  } finally {
    Loading.hide(btn, 'Send Secure Invitation');
  }
};

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
        // create backdrop overlay if not exists
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

  // Sidebar user avatar dropdown toggle
  const sidebarProfileTrigger = $('#sidebar-profile-trigger');
  const sidebarProfileDropdown = $('#sidebar-profile-dropdown');

  if (sidebarProfileTrigger && sidebarProfileDropdown) {
    sidebarProfileTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebarProfileDropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
      sidebarProfileDropdown.classList.remove('show');
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

  // Shortcut invite buttons
  const inviteBtnShortcut = $('#invite-btn-shortcut');
  if (inviteBtnShortcut) {
    inviteBtnShortcut.addEventListener('click', () => toggleInviteModal(true));
  }
  
  const inviteBtn = $('#invite-btn');
  if (inviteBtn) {
    inviteBtn.addEventListener('click', () => toggleInviteModal(true));
  }

  const closeModalBtn = $('#close-modal-btn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => toggleInviteModal(false));
  }

  const inviteDoneBtn = $('#invite-done-btn');
  if (inviteDoneBtn) {
    inviteDoneBtn.addEventListener('click', () => toggleInviteModal(false));
  }

  const inviteCopyBtn = $('#invite-copy-btn');
  if (inviteCopyBtn) {
    inviteCopyBtn.addEventListener('click', () => {
      const urlInput = $('#invite-success-url');
      if (urlInput) {
        urlInput.select();
        navigator.clipboard.writeText(urlInput.value);
        Toast.success("Secure link copied!");
      }
    });
  }

  // Form submits
  const inviteForm = $('#invite-form');
  if (inviteForm) {
    inviteForm.addEventListener('submit', submitInvitationForm);
  }

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

// Mobile-only PWA Installation Prompt Logic
let deferredPrompt = null;
const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  if (isMobileDevice) {
    deferredPrompt = e;
    showMobileInstallBanner();
  }
});

function showMobileInstallBanner() {
  if (document.getElementById('mobile-pwa-banner')) return;

  const banner = document.createElement('div');
  banner.id = 'mobile-pwa-banner';
  banner.style.position = 'fixed';
  banner.style.bottom = '16px';
  banner.style.left = '16px';
  banner.style.right = '16px';
  banner.style.backgroundColor = '#1f4d0a';
  banner.style.color = '#ffffff';
  banner.style.padding = '14px 18px';
  banner.style.borderRadius = '12px';
  banner.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  banner.style.zIndex = '999999';
  banner.style.display = 'flex';
  banner.style.alignItems = 'center';
  banner.style.justifyContent = 'space-between';
  banner.style.fontFamily = 'Inter, sans-serif';
  banner.style.animation = 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; flex-grow: 1;">
      <img src="/assets/images/logo-egg-192.png" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2);">
      <div>
        <h4 style="margin: 0; font-size: 14px; font-weight: 700;">Egg Connect</h4>
        <p style="margin: 2px 0 0; font-size: 11px; opacity: 0.85;">Install app for a seamless experience</p>
      </div>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="pwa-close-btn" style="background: transparent; border: none; color: #ffffff; font-size: 12px; font-weight: 500; cursor: pointer; padding: 6px 10px;">Dismiss</button>
      <button id="pwa-install-btn" style="background: #ffffff; color: #1f4d0a; border: none; border-radius: 6px; font-size: 12px; font-weight: 700; cursor: pointer; padding: 6px 14px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">Install</button>
    </div>
  `;

  if (!document.getElementById('pwa-banner-style')) {
    const style = document.createElement('style');
    style.id = 'pwa-banner-style';
    style.textContent = `
      @keyframes slideUp {
        from { transform: translateY(120%); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(banner);

  document.getElementById('pwa-close-btn').addEventListener('click', () => {
    banner.remove();
  });

  document.getElementById('pwa-install-btn').addEventListener('click', () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the PWA install prompt');
        }
        deferredPrompt = null;
        banner.remove();
      });
    }
  });
}

