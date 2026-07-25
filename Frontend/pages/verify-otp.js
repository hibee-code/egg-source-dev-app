import { renderNavbar } from '/components/layout/navbar.js';
import { Auth } from '/assets/js/auth.js';
import { AuthAPI } from '/assets/js/api.js';
import { Loading, Toast, $ } from '/assets/js/utils.js';

let targetEmail = '';
let resendTimerInterval = null;
let resendSeconds = 60;

const getOTPValue = () => {
  const inputs = Array.from(document.querySelectorAll('.otp-input'));
  return inputs.map((input) => input.value.trim()).join('');
};

const setupOTPInputs = () => {
  const inputs = Array.from(document.querySelectorAll('.otp-input'));

  inputs.forEach((input, idx) => {
    // Keydown handling for Backspace & Arrow keys
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace') {
        if (!input.value && idx > 0) {
          inputs[idx - 1].focus();
        } else {
          input.value = '';
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        inputs[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });

    // Input handling for single digit numeric entry & auto-advance
    input.addEventListener('input', (e) => {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val ? val.slice(-1) : '';

      if (input.value && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }
    });

    // Paste handling for full 6-digit codes
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
      if (pastedData) {
        const digits = pastedData.slice(0, 6).split('');
        digits.forEach((digit, i) => {
          if (inputs[i]) {
            inputs[i].value = digit;
          }
        });
        if (inputs[digits.length - 1]) {
          inputs[digits.length - 1].focus();
        }
      }
    });
  });
};

const startResendTimer = () => {
  const resendBtn = $('#resend-otp-btn');
  const timerSpan = $('#resend-timer');
  if (!resendBtn || !timerSpan) return;

  resendSeconds = 60;
  resendBtn.disabled = true;
  resendBtn.style.opacity = '0.5';
  resendBtn.style.cursor = 'not-allowed';
  timerSpan.style.display = 'inline';
  timerSpan.textContent = `(${resendSeconds}s)`;

  if (resendTimerInterval) clearInterval(resendTimerInterval);

  resendTimerInterval = setInterval(() => {
    resendSeconds -= 1;
    if (resendSeconds <= 0) {
      clearInterval(resendTimerInterval);
      resendBtn.disabled = false;
      resendBtn.style.opacity = '1';
      resendBtn.style.cursor = 'pointer';
      timerSpan.style.display = 'none';
    } else {
      timerSpan.textContent = `(${resendSeconds}s)`;
    }
  }, 1000);
};

const handleResend = async () => {
  if (!targetEmail) {
    Toast.error('Email address not found');
    return;
  }

  const resendBtn = $('#resend-otp-btn');
  Loading.show(resendBtn, 'Sending...');

  try {
    await AuthAPI.resendOTP({ email: targetEmail });
    Toast.success('A new 6-digit code has been sent to your email.');
    startResendTimer();
  } catch (err) {
    Toast.error(err.message || 'Failed to resend code');
  } finally {
    Loading.hide(resendBtn);
  }
};

const submitOTP = async (e) => {
  if (e) e.preventDefault();
  const otp = getOTPValue();
  if (otp.length < 6) {
    Toast.error('Please enter the full 6-digit verification code');
    return;
  }

  const btn = $('#otp-submit');
  Loading.show(btn, 'Verifying...');

  try {
    const response = await AuthAPI.verifyOTP({ email: targetEmail, otp });
    
    if (response.data?.accessToken) {
      Auth.setToken(response.data.accessToken);
    }
    if (response.data?.user) {
      Auth.setUser(response.data.user);
    }

    const destination = response.data?.redirectUrl || (response.data?.user?.role === 'FARM_OWNER' ? '/dashboard-farm' : '/dashboard-buyer');
    const isSeller = destination.includes('farm') || response.data?.user?.role === 'FARM_OWNER';
    Toast.success(`Email verified successfully! Opening ${isSeller ? 'Seller Hub' : 'Buyer Dashboard'}...`);
    setTimeout(() => {
      window.location.href = destination;
    }, 600);
  } catch (err) {
    Toast.error(err.message || 'Verification failed');
    // Clear inputs on failure to allow retry
    document.querySelectorAll('.otp-input').forEach((input) => (input.value = ''));
    document.querySelector('.otp-input[data-index="0"]')?.focus();
  } finally {
    Loading.hide(btn);
  }
};

const initPage = () => {
  renderNavbar();

  // Read email from URL query param or saved user state
  const params = new URLSearchParams(window.location.search);
  targetEmail = params.get('email') || Auth.getUser()?.email || '';

  const emailDisplay = $('#otp-target-email');
  if (emailDisplay) {
    emailDisplay.textContent = targetEmail || 'your registered email';
  }

  setupOTPInputs();

  $('#otp-form')?.addEventListener('submit', submitOTP);
  $('#resend-otp-btn')?.addEventListener('click', handleResend);

  if (window.lucide) {
    window.lucide.createIcons();
  }
};

window.addEventListener('DOMContentLoaded', initPage);
