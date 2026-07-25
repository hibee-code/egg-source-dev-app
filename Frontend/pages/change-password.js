import { renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { AuthAPI } from '/assets/js/api.js';
import { Loading, Toast, Format, $ } from '/assets/js/utils.js';

// ── Password Strength ────────────────────────────────────────────────────────

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4);
};

const STRENGTH_MAP = {
  0: { label: '',       color: 'var(--color-text-muted)' },
  1: { label: 'Weak',   color: '#E34A4A' },
  2: { label: 'Fair',   color: '#E8A020' },
  3: { label: 'Good',   color: '#2E9B5A' },
  4: { label: 'Strong', color: 'var(--color-primary)' },
};

const CLASS_MAP = { 1: 'weak', 2: 'fair', 3: 'good', 4: 'strong' };

const updateStrengthMeter = (password) => {
  const bar      = $('#strength-bar');
  const labelEl  = $('#strength-label');
  const segments = [1, 2, 3, 4].map((n) => $(`#seg-${n}`));

  if (!bar) return;

  if (!password) {
    bar.style.display = 'none';
    if (labelEl) labelEl.textContent = '';
    return;
  }

  bar.style.display = 'flex';
  const score = getStrength(password);
  const info  = STRENGTH_MAP[score] || STRENGTH_MAP[0];

  segments.forEach((seg, i) => {
    if (!seg) return;
    seg.className = 'strength-segment';
    if (i < score) seg.classList.add(CLASS_MAP[score]);
  });

  if (labelEl) {
    labelEl.textContent = info.label;
    labelEl.style.color = info.color;
  }
};

// ── Eye Toggle ───────────────────────────────────────────────────────────────

const setupEyeToggle = (btnId, inputId) => {
  const btn   = $(`#${btnId}`);
  const input = $(`#${inputId}`);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    btn.innerHTML = isVisible
      ? `<i data-lucide="eye" style="width:18px; height:18px;"></i>`
      : `<i data-lucide="eye-off" style="width:18px; height:18px;"></i>`;
    if (window.lucide) window.lucide.createIcons();
  });
};

// ── User Identity Pill ───────────────────────────────────────────────────────

const populateUserIdentity = () => {
  const user = Auth.getUser();
  if (!user) return;

  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Account User';
  const initials = Format.initials(fullName);

  const avatarEl = $('#user-avatar-initials');
  const nameEl   = $('#user-display-name');
  const emailEl  = $('#user-display-email');

  if (avatarEl) {
    avatarEl.textContent = initials;
    avatarEl.style.background = Format.avatarColor(fullName);
  }
  if (nameEl)  nameEl.textContent  = fullName;
  if (emailEl) emailEl.textContent = user.email || '—';

  // Set the dashboard redirect link based on user role
  const dashboardLink = $('#success-dashboard-link');
  if (dashboardLink) {
    const roleMap = {
      SUPER_ADMIN: '/dashboard-admin',
      FARM_OWNER:  '/dashboard-farm',
      CUSTOMER:    '/dashboard-buyer',
    };
    dashboardLink.href = roleMap[user.role] || '/dashboard-buyer';
  }
};

// ── Show Success State ───────────────────────────────────────────────────────

const showSuccessState = () => {
  const formState    = $('#form-state');
  const successState = $('#success-state');

  if (formState)    formState.style.display    = 'none';
  if (successState) successState.style.display = 'block';

  if (window.lucide) window.lucide.createIcons();

  // Auto-redirect after 3 seconds
  const dashboardLink = $('#success-dashboard-link');
  if (dashboardLink) {
    setTimeout(() => {
      window.location.href = dashboardLink.href;
    }, 3000);
  }
};

// ── Form Handler ─────────────────────────────────────────────────────────────

const handleSubmit = async (e) => {
  e.preventDefault();

  const currentEl   = $('#current-password');
  const newEl       = $('#new-password');
  const confirmEl   = $('#confirm-password');
  const submitBtn   = $('#change-submit-btn');

  const currentPassword = currentEl?.value.trim();
  const newPassword     = newEl?.value.trim();
  const confirmPassword = confirmEl?.value.trim();

  // Validation
  if (!currentPassword) {
    currentEl?.classList.add('input-error');
    Toast.error('Please enter your current password');
    currentEl?.focus();
    return;
  }

  if (!newPassword || newPassword.length < 8) {
    newEl?.classList.add('input-error');
    Toast.error('New password must be at least 8 characters');
    newEl?.focus();
    return;
  }

  if (getStrength(newPassword) < 2) {
    newEl?.classList.add('input-error');
    Toast.error('New password is too weak. Add uppercase letters, numbers, or symbols.');
    return;
  }

  if (currentPassword === newPassword) {
    newEl?.classList.add('input-error');
    Toast.error('New password must be different from your current password');
    newEl?.focus();
    return;
  }

  if (newPassword !== confirmPassword) {
    confirmEl?.classList.add('input-error');
    Toast.error('Passwords do not match');
    confirmEl?.focus();
    return;
  }

  [currentEl, newEl, confirmEl].forEach((el) => el?.classList.remove('input-error'));

  Loading.show(submitBtn, 'Updating...');

  try {
    await AuthAPI.changePassword({ currentPassword, newPassword });
    Toast.success('Password changed successfully!');
    showSuccessState();
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('current') || msg.includes('incorrect') || msg.includes('wrong')) {
      currentEl?.classList.add('input-error');
      Toast.error('Current password is incorrect');
      currentEl?.focus();
    } else {
      Toast.error(err.message || 'Failed to update password. Please try again.');
    }
  } finally {
    Loading.hide(submitBtn);
  }
};

// ── Init ─────────────────────────────────────────────────────────────────────

const initPage = () => {
  // Require authentication — redirect to login if not authenticated
  if (!Auth.requireAuth()) return;

  renderNavbar();
  if (window.lucide) window.lucide.createIcons();

  populateUserIdentity();

  $('#new-password')?.addEventListener('input', (e) => {
    updateStrengthMeter(e.target.value);
    e.target.classList.remove('input-error');
  });

  ['current-password', 'confirm-password'].forEach((id) => {
    $(`#${id}`)?.addEventListener('input', (e) => e.target.classList.remove('input-error'));
  });

  setupEyeToggle('toggle-current-password', 'current-password');
  setupEyeToggle('toggle-new-password',     'new-password');
  setupEyeToggle('toggle-confirm-password', 'confirm-password');

  $('#change-password-form')?.addEventListener('submit', handleSubmit);

  setTimeout(() => {
    if (window.lucide) window.lucide.createIcons();
  }, 100);
};

window.addEventListener('DOMContentLoaded', initPage);
