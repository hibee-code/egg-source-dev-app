import { Auth } from '/assets/js/auth.js';

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const BASE_URL = window.location.origin;

const request = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = Auth.getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    credentials: 'same-origin',
    ...options,
    headers,
  };

  if (config.body && typeof config.body !== 'string') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    const message = data.message || response.statusText || 'Request failed';
    throw new AppError(response.status, message);
  }

  return data;
};

export const AuthAPI = {
  login(payload) {
    return request('/api/v1/auth/login', { method: 'POST', body: payload });
  },
  register(payload) {
    return request('/api/v1/auth/register', { method: 'POST', body: payload });
  },
  logout() {
    return request('/api/v1/auth/logout', { method: 'POST' });
  },
  getProfile() {
    return request('/api/v1/auth/profile', { method: 'GET' });
  },
};

export const PoultryAPI = {
  getAll(query = {}) {
    const params = new URLSearchParams(query);
    return request(`/api/poultries?${params.toString()}`, { method: 'GET' });
  },
  getById(id) {
    return request(`/api/poultries/${id}`, { method: 'GET' });
  },
  create(payload) {
    return request('/api/poultries', { method: 'POST', body: payload });
  },
};

export const ProductAPI = {
  getAll(query = {}) {
    const params = new URLSearchParams(query);
    return request(`/api/products?${params.toString()}`, { method: 'GET' });
  },
  getById(id) {
    return request(`/api/products/${id}`, { method: 'GET' });
  },
};

export const SearchAPI = {
  searchPoultries(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return request(`/api/search/poultries?${params.toString()}`, { method: 'GET' });
  },
};

export const BookingAPI = {
  save(payload) {
    const bookings = JSON.parse(localStorage.getItem('eggsource_bookings') || '[]');
    bookings.push(payload);
    localStorage.setItem('eggsource_bookings', JSON.stringify(bookings));
    return Promise.resolve(payload);
  },
  list() {
    return JSON.parse(localStorage.getItem('eggsource_bookings') || '[]');
  },
};
