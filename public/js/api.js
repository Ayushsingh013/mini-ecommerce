// API Client Helper
const API = {
  getToken() {
    return localStorage.getItem('token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  },

  getUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  },

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch(endpoint, {
        ...options,
        headers
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed');
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // Authentication
  async register(name, email, password) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    this.setToken(data.token);
    this.setUser(data.user);
    return data;
  },

  async getProfile() {
    return await this.request('/api/auth/me');
  },

  async logout() {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore network errors on logout
    }
    this.setToken(null);
    this.setUser(null);
  },

  // Products
  async getProducts(params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);
    if (params.minPrice) query.append('minPrice', params.minPrice);
    if (params.maxPrice) query.append('maxPrice', params.maxPrice);
    if (params.sort) query.append('sort', params.sort);

    const qs = query.toString();
    return await this.request(`/api/products${qs ? '?' + qs : ''}`);
  },

  async getProduct(id) {
    return await this.request(`/api/products/${id}`);
  },

  async createProduct(productData) {
    return await this.request('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData)
    });
  },

  async updateProduct(id, productData) {
    return await this.request(`/api/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData)
    });
  },

  async deleteProduct(id) {
    return await this.request(`/api/products/${id}`, {
      method: 'DELETE'
    });
  },

  async getCategories() {
    return await this.request('/api/categories');
  },

  // Orders
  async placeOrder(orderPayload) {
    return await this.request('/api/orders', {
      method: 'POST',
      body: JSON.stringify(orderPayload)
    });
  },

  async getOrders() {
    return await this.request('/api/orders');
  },

  async updateOrderStatus(id, status) {
    return await this.request(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    });
  },

  // Admin Stats
  async getStats() {
    return await this.request('/api/stats');
  }
};
