// Shared API client for Egg Source
const BASE_URL = window.location.origin;

const getAccessToken = () => localStorage.getItem('accessToken');
const setAccessToken = (token) => {
    if (token) localStorage.setItem('accessToken', token);
};

const clearSession = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
};

async function request(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    const token = getAccessToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const config = {
        credentials: 'same-origin',
        ...options,
        headers,
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${BASE_URL}${url}`, config);
    const text = await response.text();
    let data = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch (error) {
        data = { message: text };
    }

    if (!response.ok) {
        if (response.status === 401) {
            clearSession();
            window.dispatchEvent(new CustomEvent('api-unauthorized'));
        }

        const message = data.message || 'Request failed';
        throw new Error(message);
    }

    return data;
}

const EggSourceAPI = {
    auth: {
        async register(payload) {
            const res = await request('/api/v1/auth/register', {
                method: 'POST',
                body: payload,
            });

            if (res.data?.accessToken) {
                setAccessToken(res.data.accessToken);
            }
            if (res.data?.user) {
                localStorage.setItem('currentUser', JSON.stringify(res.data.user));
            }

            return res.data;
        },

        async login(payload) {
            const res = await request('/api/v1/auth/login', {
                method: 'POST',
                body: payload,
            });

            if (res.data?.accessToken) {
                setAccessToken(res.data.accessToken);
            }
            if (res.data?.user) {
                localStorage.setItem('currentUser', JSON.stringify(res.data.user));
            }

            return res.data;
        },

        async logout() {
            try {
                await request('/api/v1/auth/logout', { method: 'POST' });
            } catch (err) {
                console.warn('Logout failed:', err.message);
            }
            clearSession();
        },

        getCurrentUser() {
            const value = localStorage.getItem('currentUser');
            return value ? JSON.parse(value) : null;
        },

        isLoggedIn() {
            return !!getAccessToken();
        },
    },

    poultries: {
        async getAll(query = {}) {
            const params = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await request(`/api/poultries${queryString}`, { method: 'GET' });
            return res.data?.poultries || [];
        },

        async getById(id) {
            const res = await request(`/api/poultries/${id}`, { method: 'GET' });
            return res.data?.poultry || null;
        },

        async create(payload) {
            const res = await request('/api/poultries', {
                method: 'POST',
                body: payload,
            });
            return res.data?.poultry;
        },
    },

    products: {
        async getAll(query = {}) {
            const params = new URLSearchParams();
            Object.entries(query).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await request(`/api/products${queryString}`, { method: 'GET' });
            return res.data?.products || [];
        },

        async getById(id) {
            const res = await request(`/api/products/${id}`, { method: 'GET' });
            return res.data?.product || null;
        },
    },

    search: {
        async searchPoultries(filters = {}) {
            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });
            const queryString = params.toString() ? `?${params.toString()}` : '';
            const res = await request(`/api/search/poultries${queryString}`, {
                method: 'GET',
            });
            return res.data || { data: [] };
        },
    },
};

window.EggSourceAPI = EggSourceAPI;
