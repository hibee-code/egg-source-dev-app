import { renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { AuthAPI } from '/assets/js/api.js';
import { Loading, Toast, $ } from '/assets/js/utils.js';

const updateRoleCards = () => {
  const cards = Array.from(document.querySelectorAll('.role-card'));
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      cards.forEach((item) => item.classList.remove('active'));
      card.classList.add('active');
      const role = card.dataset.role;
      $('#register-role').value = role;
    });
  });
};

const setTab = (tab) => {
  $('#login-form').classList.toggle('hidden', tab !== 'login');
  $('#register-form').classList.toggle('hidden', tab !== 'register');
  $('#tab-login').classList.toggle('active', tab === 'login');
  $('#tab-register').classList.toggle('active', tab === 'register');
};

const handlePasswordToggle = () => {
  document.querySelectorAll('.toggle-password').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      if (!target) return;
      target.type = target.type === 'password' ? 'text' : 'password';
      const iconName = target.type === 'password' ? 'eye' : 'eye-off';
      button.innerHTML = `<i data-lucide="${iconName}" style="width: 18px; height: 18px; display: block;"></i>`;
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });
};

const submitLogin = async (event) => {
  event.preventDefault();
  const btn = $('#login-submit');
  Loading.show(btn, 'Logging in...');

  try {
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value.trim();
    const response = await AuthAPI.login({ email, password });
    Auth.setToken(response.data.accessToken);
    Auth.setUser(response.data.user);
    const destination = ['FARM_OWNER', 'ADMIN'].includes(response.data.user.role) ? '/pages/dashboard-farm.html' : '/pages/dashboard-buyer.html';
    window.location.href = destination;
  } catch (err) {
    Toast.error(err.message || 'Login failed');
  } finally {
    Loading.hide(btn);
  }
};

const submitRegister = async (event) => {
  event.preventDefault();
  const btn = $('#register-submit');
  Loading.show(btn, 'Creating account...');

  try {
    const password = $('#register-password').value.trim();
    const confirm = $('#register-confirm').value.trim();
    if (password !== confirm) {
      Toast.error('Passwords do not match');
      Loading.hide(btn);
      return;
    }

    const payload = {
      firstName: $('#register-firstname').value.trim(),
      lastName: $('#register-lastname').value.trim(),
      email: $('#register-email').value.trim(),
      phone: $('#register-phone').value.trim(),
      password,
      role: $('#register-role').value,
    };
    const response = await AuthAPI.register(payload);
    Auth.setToken(response.data.accessToken);
    Auth.setUser(response.data.user);
    const destination = ['FARM_OWNER', 'ADMIN'].includes(response.data.user.role) ? '/pages/dashboard-farm.html' : '/pages/dashboard-buyer.html';
    window.location.href = destination;
  } catch (err) {
    Toast.error(err.message || 'Registration failed');
  } finally {
    Loading.hide(btn);
  }
};

const initPage = () => {
  Auth.redirectIfLoggedIn();
  renderNavbar();

  $('#tab-login').addEventListener('click', () => setTab('login'));
  $('#tab-register').addEventListener('click', () => setTab('register'));
  updateRoleCards();
  handlePasswordToggle();
  $('#login-form').addEventListener('submit', submitLogin);
  $('#register-form').addEventListener('submit', submitRegister);

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.addEventListener('DOMContentLoaded', initPage);
window.addEventListener('load', () => {
  if (window.lucide) {
    window.lucide.createIcons();
  }
});
