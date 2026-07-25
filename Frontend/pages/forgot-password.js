import { renderNavbar } from '/components/layout/navbar.js';
import { AuthAPI } from '/assets/js/api.js';
import { Loading, Toast, $ } from '/assets/js/utils.js';

let submittedEmail = '';

const showSuccessState = (email) => {
  const formState = $('#form-state');
  const successState = $('#success-state');
  const emailDisplay = $('#success-email-display');

  if (formState) formState.style.display = 'none';
  if (successState) successState.style.display = 'block';
  if (emailDisplay) emailDisplay.textContent = email;
};

const handleSubmit = async (e) => {
  e.preventDefault();

  const emailInput = $('#forgot-email');
  const submitBtn = $('#forgot-submit-btn');
  const email = emailInput?.value.trim();

  // Client-side validation
  if (!email) {
    emailInput?.classList.add('input-error');
    Toast.error('Please enter your email address');
    emailInput?.focus();
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    emailInput?.classList.add('input-error');
    Toast.error('Please enter a valid email address');
    emailInput?.focus();
    return;
  }

  emailInput?.classList.remove('input-error');
  Loading.show(submitBtn, 'Sending...');

  try {
    await AuthAPI.forgotPassword({ email });
    submittedEmail = email;
    showSuccessState(email);
  } catch (err) {
    // Even on error, show success to prevent email enumeration
    submittedEmail = email;
    showSuccessState(email);
  } finally {
    Loading.hide(submitBtn);
  }
};

const initPage = () => {
  renderNavbar();

  if (window.lucide) window.lucide.createIcons();

  $('#forgot-password-form')?.addEventListener('submit', handleSubmit);

  // "Try again" resets back to form state
  $('#try-again-btn')?.addEventListener('click', () => {
    $('#success-state').style.display = 'none';
    $('#form-state').style.display = 'block';
    const emailInput = $('#forgot-email');
    if (emailInput) {
      emailInput.value = '';
      emailInput.focus();
    }
  });

  // Remove error styling on input
  $('#forgot-email')?.addEventListener('input', () => {
    $('#forgot-email')?.classList.remove('input-error');
  });

  // Re-init Lucide after navbar renders
  setTimeout(() => {
    if (window.lucide) window.lucide.createIcons();
  }, 100);
};

window.addEventListener('DOMContentLoaded', initPage);
