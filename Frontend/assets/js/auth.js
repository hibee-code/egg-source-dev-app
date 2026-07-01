const STORAGE_TOKEN = 'eggsource_access_token';
const STORAGE_USER = 'eggsource_current_user';

export const Auth = {
  getToken() {
    return localStorage.getItem(STORAGE_TOKEN);
  },
  setToken(token) {
    if (token) localStorage.setItem(STORAGE_TOKEN, token);
  },
  getUser() {
    const raw = localStorage.getItem(STORAGE_USER);
    return raw ? JSON.parse(raw) : null;
  },
  setUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_USER, JSON.stringify(user));
    }
  },
  clear() {
    localStorage.removeItem(STORAGE_TOKEN);
    localStorage.removeItem(STORAGE_USER);
  },
  requireAuth() {
    const token = this.getToken();
    const user = this.getUser();
    if (!token || !user) {
      window.location.href = '/pages/auth.html';
      return false;
    }
    return true;
  },
  redirectIfLoggedIn() {
    const user = this.getUser();
    if (!user) return;
    const target = user.role === 'FARM_OWNER' || user.role === 'ADMIN' ? '/pages/dashboard-farm.html' : '/pages/dashboard-buyer.html';
    window.location.href = target;
  },
  logout() {
    this.clear();
    window.location.href = '/pages/auth.html';
  },
};
