// API Base URL config
const BASE_URL = window.location.origin;

// Token helpers
const getAccessToken = () => localStorage.getItem("accessToken");
const getRefreshToken = () => localStorage.getItem("refreshToken");

const setTokens = (accessToken, refreshToken) => {
  if (accessToken) localStorage.setItem("accessToken", accessToken);
  if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
};

const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("currentUser");
};

// Global Fetch Wrapper
async function request(url, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === "object") {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${BASE_URL}${url}`, config);
  const data = await response.json();

  if (!response.ok) {
    // If token is invalid or expired
    if (response.status === 401) {
      clearTokens();
      window.dispatchEvent(new CustomEvent("api-unauthorized"));
    }
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

// Egg Source API client methods
const EggSourceAPI = {
  // ── Auth Module ──
  auth: {
    async register(userData) {
      const res = await request("/api/v1/auth/register", {
        method: "POST",
        body: userData,
      });
      if (res.data?.tokens) {
        setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        localStorage.setItem("currentUser", JSON.stringify(res.data.user));
      }
      return res.data;
    },

    async login(credentials) {
      const res = await request("/api/v1/auth/login", {
        method: "POST",
        body: credentials,
      });
      if (res.data?.tokens) {
        setTokens(res.data.tokens.accessToken, res.data.tokens.refreshToken);
        localStorage.setItem("currentUser", JSON.stringify(res.data.user));
      }
      return res.data;
    },

    async logout() {
      try {
        await request("/api/v1/auth/logout", { method: "POST" });
      } catch (err) {
        console.warn("Logout request failed on server, clearing tokens anyway.");
      }
      clearTokens();
    },

    async getProfile() {
      const res = await request("/api/v1/auth/profile", { method: "GET" });
      localStorage.setItem("currentUser", JSON.stringify(res.data.user));
      return res.data;
    },

    async updateProfile(profileData) {
      const res = await request("/api/v1/auth/profile", {
        method: "PATCH",
        body: profileData,
      });
      localStorage.setItem("currentUser", JSON.stringify(res.data.user));
      return res.data;
    },

    getCurrentUser() {
      const userStr = localStorage.getItem("currentUser");
      return userStr ? JSON.parse(userStr) : null;
    },

    isLoggedIn() {
      return !!getAccessToken();
    },
  },

  // ── Poultry Farms Module ──
  poultries: {
    async getAll(query = {}) {
      const params = new URLSearchParams();
      Object.keys(query).forEach((key) => {
        if (query[key] !== undefined && query[key] !== "") {
          params.append(key, query[key]);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await request(`/api/poultries${queryString}`, { method: "GET" });
      return res.data.poultries;
    },

    async getById(id) {
      const res = await request(`/api/poultries/${id}`, { method: "GET" });
      return res.data.poultry;
    },

    async create(poultryData) {
      const res = await request("/api/poultries", {
        method: "POST",
        body: poultryData,
      });
      return res.data.poultry;
    },

    async update(id, poultryData) {
      const res = await request(`/api/poultries/${id}`, {
        method: "PATCH",
        body: poultryData,
      });
      return res.data.poultry;
    },

    async delete(id) {
      const res = await request(`/api/poultries/${id}`, { method: "DELETE" });
      return res;
    },
  },

  // ── Products Module ──
  products: {
    async getAll(query = {}) {
      const params = new URLSearchParams();
      Object.keys(query).forEach((key) => {
        if (query[key] !== undefined && query[key] !== "") {
          params.append(key, query[key]);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await request(`/api/products${queryString}`, { method: "GET" });
      return res.data.products;
    },

    async getById(id) {
      const res = await request(`/api/products/${id}`, { method: "GET" });
      return res.data.product;
    },

    async create(productData) {
      const res = await request("/api/products", {
        method: "POST",
        body: productData,
      });
      return res.data.product;
    },

    async update(id, productData) {
      const res = await request(`/api/products/${id}`, {
        method: "PATCH",
        body: productData,
      });
      return res.data.product;
    },

    async delete(id) {
      const res = await request(`/api/products/${id}`, { method: "DELETE" });
      return res;
    },
  },

  // ── Search Module (Geospatial) ──
  search: {
    async searchPoultries(filters = {}) {
      const params = new URLSearchParams();
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== undefined && filters[key] !== "") {
          params.append(key, filters[key]);
        }
      });
      const queryString = params.toString() ? `?${params.toString()}` : "";
      const res = await request(`/api/search/poultries${queryString}`, {
        method: "GET",
      });
      return res.data; // Includes metadata (total, totalPages, limit, page) and data
    },
  },
};

// Export to window object for vanilla JS scripts
window.EggSourceAPI = EggSourceAPI;
