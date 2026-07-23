import { renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { AdminAPI } from '/assets/js/api.js';
import { Loading, Toast, $ } from '/assets/js/utils.js';

const getUrlToken = () => {
  return new URLSearchParams(window.location.search).get('token');
};

const handlePasswordToggle = () => {
  document.querySelectorAll('.password-toggle').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.target);
      if (!target) return;
      target.type = target.type === 'password' ? 'text' : 'password';
      const iconName = target.type === 'password' ? 'eye' : 'eye-off';
      button.innerHTML = `<i data-lucide="${iconName}" style="width: 18px; height: 18px;"></i>`;
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  });
};

const fetchBrowserCoordinates = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latInput = $('#latitude');
        const lngInput = $('#longitude');
        if (latInput && lngInput) {
          latInput.value = position.coords.latitude;
          lngInput.value = position.coords.longitude;
        }
      },
      (err) => {
        console.warn("Could not retrieve geolocation automatically:", err.message);
        const latInput = $('#latitude');
        const lngInput = $('#longitude');
        if (latInput && lngInput) {
          latInput.placeholder = "Location blocked or unavailable";
          lngInput.placeholder = "Location blocked or unavailable";
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }
};

const verifyToken = async () => {
  const token = getUrlToken();
  if (!token) {
    showError("No invitation token found. Please check your invitation email.");
    return;
  }

  try {
    const response = await AdminAPI.verifyInvitation(token);
    const details = response.data;
    
    // Set subtitle text with invited business name
    $('#invitation-subtitle').textContent = `Set up Farm Owner account for "${details.businessName}" (${details.email})`;
    
    // Switch views
    $('#token-loading').classList.add('hidden');
    $('#register-container').classList.remove('hidden');

    // Trigger browser geolocation to autofill coordinates
    fetchBrowserCoordinates();
  } catch (err) {
    showError(err.message || "Invitation link is invalid, expired, or has been revoked.");
  }
};

const showError = (msg) => {
  $('#token-loading').classList.add('hidden');
  $('#register-container').classList.add('hidden');
  $('#token-error').classList.remove('hidden');
  $('#error-message').textContent = msg;
  if (window.lucide) {
    window.lucide.createIcons();
  }
};

const submitRegistration = async (event) => {
  event.preventDefault();
  const token = getUrlToken();
  if (!token) return;

  const btn = $('#register-submit');
  
  const password = $('#password').value;
  const confirm = $('#confirm-password').value;

  if (password !== confirm) {
    Toast.error("Passwords do not match");
    return;
  }

  if (password.length < 8) {
    Toast.error("Password must be at least 8 characters long");
    return;
  }

  Loading.show(btn, 'Setting up account...');

  const payload = {
    firstName: $('#first-name').value.trim(),
    lastName: $('#last-name').value.trim(),
    phone: $('#phone').value.trim(),
    password,
    state: $('#state').value.trim(),
    lga: $('#lga').value.trim(),
    address: $('#address').value.trim(),
    latitude: $('#latitude').value ? parseFloat($('#latitude').value) : undefined,
    longitude: $('#longitude').value ? parseFloat($('#longitude').value) : undefined,
  };

  try {
    const response = await AdminAPI.acceptInvitation(token, payload);
    Toast.success("Registration complete! Welcome to Egg Connect.");
    
    // Store credentials
    Auth.setToken(response.data.accessToken);
    Auth.setUser(response.data.user);
    
    // Redirect to Seller Dashboard
    setTimeout(() => {
      window.location.href = '/dashboard-farm';
    }, 1500);
  } catch (err) {
    Toast.error(err.message || "Registration failed. Try again.");
    Loading.hide(btn);
  }
};

const initPage = () => {
  Auth.redirectIfLoggedIn();
  renderNavbar();
  handlePasswordToggle();
  verifyToken();

  $('#invite-register-form').addEventListener('submit', submitRegistration);

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.addEventListener('DOMContentLoaded', initPage);
