import { renderNavbar } from '/components/layout/navbar.js';
import { AuthAPI } from '/assets/js/api.js';
import { Loading, Toast, $ } from '/assets/js/utils.js';

let resetToken = '';

// ── Password Strength ────────────────────────────────────────────────────────

const getStrength = (password) => {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return Math.min(score, 4); // 0-4
};

const STRENGTH_MAP = {
  0: { label: '',         color: 'var(--color-text-muted)' },
  1: { label: 'Weak',     color: '#E34A4A' },
  2: { label: 'Fair',     color: '#E8A020' },
  3: { label: 'Good',     color: '#2E9B5A' },
  4: { label: 'Strong',   color: 'var(--color-primary)' },
};

const CLASS_MAP = { 1: 'weak', 2: 'fair', 3: 'good', 4: 'strong' };

const updateStrengthMeter = (password) => {
  const bar       = $('#strength-bar');
  const labelEl   = $('#strength-label');
  const segments  = [1, 2, 3, 4].map((n) => $(`#seg-${n}`));

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

// ── Token Extraction ─────────────────────────────────────────────────────────

const extractToken = () => {
  // Support both /reset-password/:token (path) and ?token= (query param)
  const parts = window.location.pathname.split('/');
  const pathToken = parts[parts.length - 1];
  if (pathToken && pathToken !== 'reset-password') return pathToken;

  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
};

// ── States ───────────────────────────────────────────────────────────────────

const showInvalidTokenState = () => {
  $('#form-state').style.display = 'none';
  $('#success-state').style.display = 'none';
  const el = $('#invalid-token-state');
  if (el) el.style.display = 'block';
  if (window.lucide) window.lucide.createIcons();
};

const showSuccessState = () => {
  $('#form-state').style.display = 'none';
  const el = $('#success-state');
  if (el) el.style.display = 'block';
  if (window.lucide) window.lucide.createIcons();
};

// ── Form Handler ─────────────────────────────────────────────────────────────

const handleSubmit = async (e) => {
  e.preventDefault();

  const newPasswordEl   = $('#new-password');
  const confirmPasswordEl = $('#confirm-password');
  const submitBtn       = $('#reset-submit-btn');

  const newPassword     = newPasswordEl?.value.trim();
  const confirmPassword = confirmPasswordEl?.value.trim();

  // Validation
  if (!newPassword || newPassword.length < 8) {
    newPasswordEl?.classList.add('input-error');
    Toast.error('Password must be at least 8 characters');
    newPasswordEl?.focus();
    return;
  }

  if (getStrength(newPassword) < 2) {
    newPasswordEl?.classList.add('input-error');
    Toast.error('Password is too weak. Add uppercase letters, numbers, or symbols.');
    return;
  }

  if (newPassword !== confirmPassword) {
    confirmPasswordEl?.classList.add('input-error');
    Toast.error('Passwords do not match');
    confirmPasswordEl?.focus();
    return;
  }

  newPasswordEl?.classList.remove('input-error');
  confirmPasswordEl?.classList.remove('input-error');

  if (!resetToken) {
    showInvalidTokenState();
    return;
  }

  Loading.show(submitBtn, 'Resetting...');

  try {
    await AuthAPI.resetPassword(resetToken, newPassword);
    showSuccessState();
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('expired') || msg.includes('invalid') || msg.includes('token')) {
      showInvalidTokenState();
    } else {
      Toast.error(err.message || 'Failed to reset password. Please try again.');
    }
  } finally {
    Loading.hide(submitBtn);
  }
};

// ── Init ─────────────────────────────────────────────────────────────────────

const initPage = () => {
  renderNavbar();

  if (window.lucide) window.lucide.createIcons();

  resetToken = extractToken();

  if (!resetToken) {
    showInvalidTokenState();
    return;
  }

  // Password strength on input
  $('#new-password')?.addEventListener('input', (e) => {
    updateStrengthMeter(e.target.value);
    e.target.classList.remove('input-error');
  });

  $('#confirm-password')?.addEventListener('input', (e) => {
    e.target.classList.remove('input-error');
  });

  setupEyeToggle('toggle-new-password', 'new-password');
  setupEyeToggle('toggle-confirm-password', 'confirm-password');

  $('#reset-password-form')?.addEventListener('submit', handleSubmit);

  setTimeout(() => {
    if (window.lucide) window.lucide.createIcons();
  }, 100);
};

window.addEventListener('DOMContentLoaded', initPage);
