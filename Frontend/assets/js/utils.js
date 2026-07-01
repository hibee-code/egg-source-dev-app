export const $ = (selector, parent = document) => parent.querySelector(selector);
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));
export const on = (element, event, handler) => element?.addEventListener(event, handler);

export const Format = {
  currency(value) {
    const number = Number(value) || 0;
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(number);
  },
  initials(name) {
    if (!name) return 'ES';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');
  },
  avatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 52%, 38%)`;
  },
};

const toastContainer = () => {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.position = 'fixed';
    container.style.top = '22px';
    container.style.right = '22px';
    container.style.zIndex = '9999';
    container.style.display = 'grid';
    container.style.gap = '12px';
    document.body.appendChild(container);
  }
  return container;
};

const createToast = (message, type) => {
  const container = toastContainer();
  const toast = document.createElement('div');
  toast.style.minWidth = '280px';
  toast.style.padding = '16px 18px';
  toast.style.borderRadius = '12px';
  toast.style.boxShadow = '0 16px 40px rgba(0,0,0,0.12)';
  toast.style.color = '#fff';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.justifyContent = 'space-between';
  toast.style.gap = '12px';
  toast.style.background = type === 'success' ? '#1F4D0A' : type === 'danger' ? '#E34A4A' : type === 'warning' ? '#E8A020' : '#2E6B12';
  toast.style.opacity = '0';
  toast.style.transform = 'translateY(-10px)';
  toast.style.transition = 'all 0.25s ease';
  toast.textContent = message;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, 3500);
};

export const Toast = {
  success(message) { createToast(message, 'success'); },
  error(message) { createToast(message, 'danger'); },
  info(message) { createToast(message, 'info'); },
  warning(message) { createToast(message, 'warning'); },
};

export const Loading = {
  show(button, text = 'Loading...') {
    if (!button) return;
    button.dataset.original = button.textContent;
    button.disabled = true;
    button.textContent = text;
  },
  hide(button) {
    if (!button) return;
    button.disabled = false;
    if (button.dataset.original) {
      button.textContent = button.dataset.original;
    }
  },
};

export const Pagination = {
  render(container, meta, onPageChange) {
    if (!container || !meta) return;
    const { page, totalPages } = meta;
    const items = [];
    const addButton = (value, label = value, active = false, disabled = false) => {
      return `<button class="btn btn-secondary${active ? ' active' : ''}" data-page="${value}" ${disabled ? 'disabled' : ''}>${label}</button>`;
    };

    items.push(addButton(1, '1', page === 1));
    if (page > 3) items.push('<span>...</span>');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i += 1) {
      items.push(addButton(i, i, page === i));
    }
    if (page < totalPages - 2) items.push('<span>...</span>');
    if (totalPages > 1) items.push(addButton(totalPages, totalPages, page === totalPages));

    container.innerHTML = `<div class="pagination-grid">${items.join('')}</div>`;
    container.querySelectorAll('button[data-page]').forEach((button) => {
      button.addEventListener('click', () => onPageChange(Number(button.dataset.page)));
    });
  },
};

export const renderAvatar = (name) => {
  const initials = Format.initials(name);
  const color = Format.avatarColor(name);
  return `<div class="avatar-circle" style="background:${color};">${initials}</div>`;
};
