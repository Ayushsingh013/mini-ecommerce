// Main Frontend Application Logic
document.addEventListener('DOMContentLoaded', () => {
  // Application State
  const state = {
    products: [],
    categories: [],
    cart: JSON.parse(localStorage.getItem('cart') || '[]'),
    filters: {
      category: 'All',
      search: '',
      maxPrice: 150000,
      sort: 'default'
    },
    user: API.getUser(),
    theme: localStorage.getItem('theme') || 'light'
  };

  // DOM Elements
  const productsGrid = document.getElementById('products-grid');
  const categoriesList = document.getElementById('categories-list');
  const searchInput = document.getElementById('search-input');
  const priceRange = document.getElementById('price-range');
  const priceVal = document.getElementById('price-val');
  const sortSelect = document.getElementById('sort-select');
  const cartBadge = document.getElementById('cart-badge');
  const cartDrawer = document.getElementById('cart-drawer');
  const cartOverlay = document.getElementById('cart-overlay');
  const cartItems = document.getElementById('cart-items');
  const cartSubtotal = document.getElementById('cart-subtotal');
  const cartTotal = document.getElementById('cart-total');
  const userBtn = document.getElementById('user-btn');
  const themeToggle = document.getElementById('theme-toggle');

  // Modals
  const authModal = document.getElementById('auth-modal');
  const checkoutModal = document.getElementById('checkout-modal');
  const quickViewModal = document.getElementById('quick-view-modal');
  const ordersModal = document.getElementById('orders-modal');
  const adminModal = document.getElementById('admin-modal');
  const confirmModal = document.getElementById('confirm-modal');

  // Initialize Theme
  applyTheme(state.theme);

  // Initialize App
  init();

  async function init() {
    setupEventListeners();
    updateCartUI();
    updateAuthUI();
    await loadCategories();
    await loadProducts();
  }

  // Toast Notification System
  window.showToast = function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `<strong>${icon}</strong> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  // Theme Toggler
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark' 
        ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    }
  }

  // Load Categories
  async function loadCategories() {
    try {
      const res = await API.getCategories();
      state.categories = res.categories || [];
      renderCategories();
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  }

  function renderCategories() {
    if (!categoriesList) return;
    const totalCount = state.categories.reduce((sum, c) => sum + c.count, 0);

    let html = `
      <li>
        <button class="category-btn ${state.filters.category === 'All' ? 'active' : ''}" data-cat="All">
          <span>All Products</span>
          <span class="count-badge">${totalCount}</span>
        </button>
      </li>
    `;

    for (const cat of state.categories) {
      const isActive = state.filters.category === cat.name ? 'active' : '';
      html += `
        <li>
          <button class="category-btn ${isActive}" data-cat="${cat.name}">
            <span>${cat.name}</span>
            <span class="count-badge">${cat.count}</span>
          </button>
        </li>
      `;
    }

    categoriesList.innerHTML = html;

    categoriesList.querySelectorAll('.category-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.filters.category = btn.getAttribute('data-cat');
        renderCategories();
        loadProducts();
      });
    });
  }

  // Load Products
  async function loadProducts() {
    try {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-secondary);">
          <p>Loading products catalog...</p>
        </div>
      `;

      const res = await API.getProducts({
        category: state.filters.category,
        search: state.filters.search,
        maxPrice: state.filters.maxPrice,
        sort: state.filters.sort
      });

      state.products = res.products || [];
      renderProducts();
    } catch (err) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem 1rem; color: var(--danger);">
          <p>Failed to load products. Please check server connection.</p>
        </div>
      `;
    }
  }

  function renderProducts() {
    document.getElementById('products-count-label').textContent = `${state.products.length} Products Found`;

    if (state.products.length === 0) {
      productsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem;"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <h3 style="margin-bottom: 0.5rem; color: var(--text-primary);">No products found</h3>
          <p>Try resetting filters or adjusting your search term.</p>
        </div>
      `;
      return;
    }

    productsGrid.innerHTML = state.products.map(p => {
      let stockClass = 'in-stock';
      let stockText = `In Stock (${p.stock})`;
      if (p.stock === 0) {
        stockClass = 'out-of-stock';
        stockText = 'Out of Stock';
      } else if (p.stock <= 5) {
        stockClass = 'low-stock';
        stockText = `Only ${p.stock} left!`;
      }

      const discount = p.original_price > p.price
        ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
        : 0;

      return `
        <div class="product-card" data-id="${p.id}">
          <div class="card-image-wrap">
            ${p.badge ? `<span class="product-badge">${p.badge}</span>` : ''}
            <img src="${p.image_url}" alt="${p.name}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'">
          </div>
          <div class="card-content">
            <span class="card-category">${p.category}</span>
            <h3 class="card-title" title="${p.name}">${p.name}</h3>
            
            <div class="rating-row">
              <span>★ ${p.rating.toFixed(1)}</span>
              <span class="reviews-count">(${p.reviews_count || 0})</span>
            </div>

            <div class="stock-indicator ${stockClass}">
              ● ${stockText}
            </div>

            <div class="price-row">
              <span class="current-price">₹${p.price.toLocaleString('en-IN')}</span>
              ${p.original_price > p.price ? `<span class="original-price">₹${p.original_price.toLocaleString('en-IN')}</span>` : ''}
              ${discount > 0 ? `<span style="font-size: 0.75rem; color: var(--success); font-weight: 700;">${discount}% OFF</span>` : ''}
            </div>

            <div class="card-actions">
              <button class="btn-primary add-cart-btn" data-id="${p.id}" ${p.stock === 0 ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : ''}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                ${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
              <button class="btn-secondary quick-view-btn" data-id="${p.id}" title="Quick View">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach card action listeners
    productsGrid.querySelectorAll('.add-cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(btn.getAttribute('data-id'));
        addToCart(id);
      });
    });

    productsGrid.querySelectorAll('.quick-view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = Number(btn.getAttribute('data-id'));
        openQuickView(id);
      });
    });

    productsGrid.querySelectorAll('.card-title').forEach(title => {
      title.addEventListener('click', () => {
        const card = title.closest('.product-card');
        const id = Number(card.getAttribute('data-id'));
        openQuickView(id);
      });
    });
  }

  // Cart Management
  function addToCart(productId, qty = 1) {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    if (product.stock <= 0) {
      showToast('Product is currently out of stock', 'error');
      return;
    }

    const existing = state.cart.find(item => item.id === productId);
    if (existing) {
      if (existing.quantity + qty > product.stock) {
        showToast(`Cannot add more. Only ${product.stock} in stock!`, 'warning');
        return;
      }
      existing.quantity += qty;
    } else {
      state.cart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        stock: product.stock,
        quantity: qty
      });
    }

    saveCart();
    updateCartUI();
    showToast(`Added "${product.name}" to cart!`, 'success');
  }

  function updateCartQuantity(productId, delta) {
    const item = state.cart.find(i => i.id === productId);
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
      state.cart = state.cart.filter(i => i.id !== productId);
      showToast(`Removed "${item.name}" from cart`, 'warning');
    } else if (item.quantity > item.stock) {
      item.quantity = item.stock;
      showToast(`Maximum available stock reached (${item.stock})`, 'warning');
    }

    saveCart();
    updateCartUI();
  }

  function saveCart() {
    localStorage.setItem('cart', JSON.stringify(state.cart));
  }

  function updateCartUI() {
    const totalCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    cartBadge.textContent = totalCount;
    cartBadge.style.display = totalCount > 0 ? 'flex' : 'none';

    if (state.cart.length === 0) {
      cartItems.innerHTML = `
        <div class="empty-cart-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <h4>Your cart is empty</h4>
          <p style="font-size: 0.85rem; margin-top: 0.35rem;">Explore our catalog and add your favorite products!</p>
        </div>
      `;
      cartSubtotal.textContent = '₹0';
      cartTotal.textContent = '₹0';
      document.getElementById('checkout-btn').disabled = true;
      document.getElementById('checkout-btn').style.opacity = '0.5';
      return;
    }

    document.getElementById('checkout-btn').disabled = false;
    document.getElementById('checkout-btn').style.opacity = '1';

    cartItems.innerHTML = state.cart.map(item => `
      <div class="cart-item">
        <img src="${item.image_url}" alt="${item.name}" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'">
        <div class="cart-item-details">
          <h4>${item.name}</h4>
          <div class="price">₹${item.price.toLocaleString('en-IN')}</div>
          <div class="cart-qty-controls">
            <button class="btn-qty btn-minus" data-id="${item.id}">-</button>
            <span class="qty-val">${item.quantity}</span>
            <button class="btn-qty btn-plus" data-id="${item.id}">+</button>
          </div>
        </div>
        <div style="text-align: right;">
          <div style="font-weight: 700; font-size: 0.95rem;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</div>
          <button class="btn-link btn-remove-item" data-id="${item.id}" style="color: var(--danger); margin-top: 0.5rem;">Remove</button>
        </div>
      </div>
    `).join('');

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartSubtotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;
    cartTotal.textContent = `₹${subtotal.toLocaleString('en-IN')}`;

    // Attach cart item events
    cartItems.querySelectorAll('.btn-minus').forEach(b => {
      b.addEventListener('click', () => updateCartQuantity(Number(b.getAttribute('data-id')), -1));
    });
    cartItems.querySelectorAll('.btn-plus').forEach(b => {
      b.addEventListener('click', () => updateCartQuantity(Number(b.getAttribute('data-id')), 1));
    });
    cartItems.querySelectorAll('.btn-remove-item').forEach(b => {
      b.addEventListener('click', () => updateCartQuantity(Number(b.getAttribute('data-id')), -9999));
    });
  }

  // Quick View Modal
  async function openQuickView(productId) {
    try {
      const res = await API.getProduct(productId);
      const p = res.product;
      const modalBody = document.getElementById('quick-view-body');

      const discount = p.original_price > p.price
        ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
        : 0;

      modalBody.innerHTML = `
        <div class="quick-view-grid">
          <div>
            <img class="quick-view-img" src="${p.image_url}" alt="${p.name}" onerror="this.src='https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80'">
          </div>
          <div>
            <span class="badge-tag">${p.category}</span>
            <h2 style="font-size: 1.4rem; font-weight: 800; margin: 0.5rem 0;">${p.name}</h2>
            <div class="rating-row" style="margin-bottom: 1rem;">
              <span>★ ${p.rating.toFixed(1)}</span>
              <span class="reviews-count">(${p.reviews_count} verified customer reviews)</span>
            </div>

            <div class="price-row" style="margin-bottom: 1.25rem;">
              <span class="current-price" style="font-size: 1.6rem;">₹${p.price.toLocaleString('en-IN')}</span>
              ${p.original_price > p.price ? `<span class="original-price" style="font-size: 1.1rem;">₹${p.original_price.toLocaleString('en-IN')}</span>` : ''}
              ${discount > 0 ? `<span style="color: var(--success); font-weight: 700; font-size: 0.9rem;">${discount}% OFF</span>` : ''}
            </div>

            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem;">
              ${p.description}
            </p>

            <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; font-size: 0.85rem;">
              <p>✔ <strong>Warranty:</strong> 1 Year Manufacturer Warranty</p>
              <p>✔ <strong>Delivery:</strong> Guaranteed 2-3 Days Free Express Shipping</p>
              <p>✔ <strong>Stock:</strong> ${p.stock > 0 ? `${p.stock} units left in stock` : 'Currently unavailable'}</p>
            </div>

            <div style="display: flex; gap: 1rem;">
              <button class="btn-primary" id="qv-add-cart" ${p.stock === 0 ? 'disabled' : ''} style="flex: 1; justify-content: center; padding: 0.85rem;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                ${p.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </button>
            </div>
          </div>
        </div>
      `;

      document.getElementById('qv-add-cart')?.addEventListener('click', () => {
        addToCart(p.id);
        closeModal(quickViewModal);
      });

      openModal(quickViewModal);
    } catch (err) {
      showToast('Could not load product details', 'error');
    }
  }

  // Auth Management
  function updateAuthUI() {
    const user = API.getUser();
    state.user = user;

    if (user) {
      userBtn.innerHTML = `
        <span style="font-weight: 600; font-size: 0.85rem; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${user.name.split(' ')[0]}
        </span>
        <span class="badge-tag" style="background: ${user.role === 'admin' ? 'var(--primary)' : 'var(--primary-light)'}; color: ${user.role === 'admin' ? '#fff' : 'var(--primary)'}">
          ${user.role}
        </span>
      `;
      document.getElementById('nav-orders-btn').style.display = 'inline-flex';
      if (user.role === 'admin') {
        document.getElementById('nav-admin-btn').style.display = 'inline-flex';
      } else {
        document.getElementById('nav-admin-btn').style.display = 'none';
      }
      document.getElementById('nav-logout-btn').style.display = 'inline-flex';
    } else {
      userBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span>Sign In</span>
      `;
      document.getElementById('nav-orders-btn').style.display = 'none';
      document.getElementById('nav-admin-btn').style.display = 'none';
      document.getElementById('nav-logout-btn').style.display = 'none';
    }
  }

  // Orders Flow
  async function openOrdersModal() {
    if (!state.user) {
      openModal(authModal);
      return;
    }

    try {
      const res = await API.getOrders();
      const orders = res.orders || [];
      const ordersContainer = document.getElementById('orders-list-body');

      if (orders.length === 0) {
        ordersContainer.innerHTML = `
          <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem;"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
            <h4>No orders yet</h4>
            <p>Your placed orders will appear here.</p>
          </div>
        `;
      } else {
        ordersContainer.innerHTML = orders.map(o => `
          <div style="border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1rem; background: var(--bg-surface);">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem; margin-bottom: 0.75rem;">
              <div>
                <span style="font-weight: 700; font-size: 0.95rem;">Order #${o.id}</span>
                <span style="color: var(--text-muted); font-size: 0.8rem; margin-left: 0.5rem;">${new Date(o.created_at).toLocaleDateString()}</span>
              </div>
              <span class="status-badge ${o.status}">${o.status}</span>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.75rem;">
              ${o.items.map(item => `
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                  <span>${item.product_name} × <strong>${item.quantity}</strong></span>
                  <span style="font-weight: 600;">₹${(item.price * item.quantity).toLocaleString('en-IN')}</span>
                </div>
              `).join('')}
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px dashed var(--border-color); padding-top: 0.75rem; font-size: 0.9rem;">
              <span style="color: var(--text-secondary);">Payment: <strong>${o.payment_method}</strong> | City: <strong>${o.city}</strong></span>
              <span style="font-weight: 800; font-size: 1.05rem; color: var(--primary);">Total: ₹${o.total_amount.toLocaleString('en-IN')}</span>
            </div>
          </div>
        `).join('');
      }

      openModal(ordersModal);
    } catch (err) {
      showToast('Failed to load orders: ' + err.message, 'error');
    }
  }

  // Admin Dashboard
  async function openAdminModal() {
    if (!state.user || state.user.role !== 'admin') {
      showToast('Admin privilege required', 'error');
      return;
    }

    try {
      const statsRes = await API.getStats();
      const s = statsRes.stats;

      document.getElementById('stat-revenue').textContent = `₹${s.totalRevenue.toLocaleString('en-IN')}`;
      document.getElementById('stat-orders').textContent = s.totalOrders;
      document.getElementById('stat-products').textContent = s.totalProducts;
      document.getElementById('stat-customers').textContent = s.totalCustomers;
      document.getElementById('stat-lowstock').textContent = s.lowStockProducts;

      // Render Admin Products
      const prodRes = await API.getProducts();
      const adminProductsTable = document.getElementById('admin-products-table-body');
      adminProductsTable.innerHTML = (prodRes.products || []).map(p => `
        <tr>
          <td>#${p.id}</td>
          <td><strong>${p.name}</strong></td>
          <td><span class="badge-tag">${p.category}</span></td>
          <td>₹${p.price.toLocaleString('en-IN')}</td>
          <td><span style="font-weight: 700; color: ${p.stock <= 5 ? 'var(--danger)' : 'var(--success)'};">${p.stock}</span></td>
          <td>
            <button class="btn-secondary btn-del-prod" data-id="${p.id}" style="padding: 0.35rem 0.65rem; color: var(--danger);">Delete</button>
          </td>
        </tr>
      `).join('');

      adminProductsTable.querySelectorAll('.btn-del-prod').forEach(b => {
        b.addEventListener('click', async () => {
          const id = Number(b.getAttribute('data-id'));
          if (confirm(`Are you sure you want to delete Product #${id}?`)) {
            try {
              await API.deleteProduct(id);
              showToast('Product deleted successfully');
              openAdminModal();
              loadProducts();
              loadCategories();
            } catch (err) {
              showToast(err.message, 'error');
            }
          }
        });
      });

      // Render Admin Orders
      const orderRes = await API.getOrders();
      const adminOrdersTable = document.getElementById('admin-orders-table-body');
      adminOrdersTable.innerHTML = (orderRes.orders || []).map(o => `
        <tr>
          <td>#${o.id}</td>
          <td>${o.customer_name}<br><small style="color:var(--text-muted);">${o.customer_email}</small></td>
          <td>₹${o.total_amount.toLocaleString('en-IN')}</td>
          <td>${o.payment_method}</td>
          <td>
            <select class="select-control order-status-select" data-id="${o.id}">
              <option value="Processing" ${o.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${o.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${o.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${o.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
          <td>${new Date(o.created_at).toLocaleDateString()}</td>
        </tr>
      `).join('');

      adminOrdersTable.querySelectorAll('.order-status-select').forEach(sel => {
        sel.addEventListener('change', async () => {
          const orderId = Number(sel.getAttribute('data-id'));
          const newStatus = sel.value;
          try {
            await API.updateOrderStatus(orderId, newStatus);
            showToast(`Order #${orderId} status updated to ${newStatus}`);
          } catch (err) {
            showToast('Failed to update status: ' + err.message, 'error');
          }
        });
      });

      openModal(adminModal);
    } catch (err) {
      showToast('Failed to open Admin Dashboard: ' + err.message, 'error');
    }
  }

  // Event Listeners Setup
  function setupEventListeners() {
    // Search with 300ms debounce
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        loadProducts();
      }, 300);
    });

    // Price range slider
    priceRange.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      priceVal.textContent = `₹${val.toLocaleString('en-IN')}`;
      state.filters.maxPrice = val;
      loadProducts();
    });

    // Sort select
    sortSelect.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      loadProducts();
    });

    // Reset filters
    document.getElementById('reset-filters-btn').addEventListener('click', () => {
      state.filters.category = 'All';
      state.filters.search = '';
      state.filters.maxPrice = 150000;
      state.filters.sort = 'default';
      searchInput.value = '';
      priceRange.value = 150000;
      priceVal.textContent = '₹1,50,000';
      sortSelect.value = 'default';
      renderCategories();
      loadProducts();
    });

    // Cart Drawer triggers
    document.getElementById('cart-btn').addEventListener('click', () => {
      cartDrawer.classList.add('active');
      cartOverlay.classList.add('active');
    });

    document.getElementById('close-cart-btn').addEventListener('click', () => {
      cartDrawer.classList.remove('active');
      cartOverlay.classList.remove('active');
    });

    cartOverlay.addEventListener('click', () => {
      cartDrawer.classList.remove('active');
      cartOverlay.classList.remove('active');
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(state.theme);
    });

    // User Button click
    userBtn.addEventListener('click', () => {
      if (!state.user) {
        openModal(authModal);
      } else {
        openOrdersModal();
      }
    });

    document.getElementById('nav-orders-btn').addEventListener('click', openOrdersModal);
    document.getElementById('nav-admin-btn').addEventListener('click', openAdminModal);

    document.getElementById('nav-logout-btn').addEventListener('click', async () => {
      await API.logout();
      state.user = null;
      updateAuthUI();
      showToast('Logged out successfully');
    });

    // Auth Modal Tabs (Login / Register)
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');

    tabLogin.addEventListener('click', () => {
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
      formLogin.style.display = 'block';
      formRegister.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
      formLogin.style.display = 'none';
      formRegister.style.display = 'block';
    });

    // Login Form Submission
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const pass = document.getElementById('login-pass').value;
      try {
        const res = await API.login(email, pass);
        state.user = res.user;
        updateAuthUI();
        closeModal(authModal);
        showToast(`Welcome back, ${res.user.name}!`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Register Form Submission
    formRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('reg-name').value;
      const email = document.getElementById('reg-email').value;
      const pass = document.getElementById('reg-pass').value;
      try {
        const res = await API.register(name, email, pass);
        state.user = res.user;
        updateAuthUI();
        closeModal(authModal);
        showToast(`Account created! Welcome, ${res.user.name}!`);
      } catch (err) {
        showToast(err.message, 'error');
      }
    });

    // Checkout Flow
    document.getElementById('checkout-btn').addEventListener('click', () => {
      if (state.cart.length === 0) return;
      cartDrawer.classList.remove('active');
      cartOverlay.classList.remove('active');

      // Autofill customer name & email if logged in
      if (state.user) {
        document.getElementById('ship-name').value = state.user.name;
        document.getElementById('ship-email').value = state.user.email;
      }

      const total = state.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      document.getElementById('checkout-total-label').textContent = `₹${total.toLocaleString('en-IN')}`;

      // Update Dynamic UPI QR Code for Scanner
      const upiId = 'ayushsingh@upi';
      const upiAmountBadge = document.getElementById('upi-amount-badge');
      const upiQrImage = document.getElementById('upi-qr-image');
      if (upiAmountBadge) upiAmountBadge.textContent = `₹${total.toLocaleString('en-IN')}`;
      if (upiQrImage) {
        const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=Ayush%20Singh&am=${total}&cu=INR&tn=ElectroCart%20Order`;
        upiQrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(upiUrl)}`;
      }

      openModal(checkoutModal);
    });

    // Payment Method Radio Switcher
    document.querySelectorAll('input[name="payment_method"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        const method = e.target.value;
        const boxUpi = document.getElementById('payment-box-upi');
        const boxCard = document.getElementById('payment-box-card');
        const boxCod = document.getElementById('payment-box-cod');

        const labelUpi = document.getElementById('label-pay-upi');
        const labelCard = document.getElementById('label-pay-card');
        const labelCod = document.getElementById('label-pay-cod');

        // Reset styles
        [labelUpi, labelCard, labelCod].forEach(lbl => {
          if (lbl) {
            lbl.style.border = '1px solid var(--border-color)';
            lbl.style.background = 'transparent';
          }
        });

        if (boxUpi) boxUpi.style.display = method === 'UPI' ? 'block' : 'none';
        if (boxCard) boxCard.style.display = method === 'Card' ? 'block' : 'none';
        if (boxCod) boxCod.style.display = method === 'COD' ? 'block' : 'none';

        const activeLabel = document.getElementById(`label-pay-${method.toLowerCase()}`);
        if (activeLabel) {
          activeLabel.style.border = '2px solid var(--primary)';
          activeLabel.style.background = 'var(--primary-light)';
        }
      });
    });

    // Copy UPI ID Button
    document.getElementById('copy-upi-btn')?.addEventListener('click', () => {
      const upiText = document.getElementById('upi-id-display')?.textContent || 'ayushsingh@upi';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(upiText).then(() => {
          showToast('UPI ID copied to clipboard!');
        }).catch(() => {
          showToast('UPI ID: ' + upiText);
        });
      } else {
        showToast('UPI ID: ' + upiText);
      }
    });

    // Place Order Form Submission
    document.getElementById('checkout-form').addEventListener('submit', async (e) => {
      e.preventDefault();

      const payMethod = document.querySelector('input[name="payment_method"]:checked').value;
      const upiRef = document.getElementById('upi-ref')?.value?.trim();
      const finalPaymentMethod = (payMethod === 'UPI' && upiRef) ? `UPI (${upiRef})` : payMethod;

      const orderPayload = {
        customer_name: document.getElementById('ship-name').value,
        customer_email: document.getElementById('ship-email').value,
        address: document.getElementById('ship-address').value,
        city: document.getElementById('ship-city').value,
        postal_code: document.getElementById('ship-zip').value,
        payment_method: finalPaymentMethod,
        items: state.cart.map(i => ({ product_id: i.id, quantity: i.quantity }))
      };

      const submitBtn = document.getElementById('place-order-btn');
      submitBtn.disabled = true;
      submitBtn.innerHTML = 'Processing Payment...';

      try {
        const res = await API.placeOrder(orderPayload);
        state.cart = [];
        saveCart();
        updateCartUI();
        closeModal(checkoutModal);

        // Show confirmation modal
        document.getElementById('confirm-order-id').textContent = `#${res.order.id}`;
        document.getElementById('confirm-order-total').textContent = `₹${res.order.total_amount.toLocaleString('en-IN')}`;
        openModal(confirmModal);

        // Refresh catalog for updated stock
        loadProducts();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'Confirm & Pay Order';
      }
    });

    // Admin Add Product Form
    document.getElementById('admin-add-product-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newProd = {
        name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-category').value,
        price: Number(document.getElementById('prod-price').value),
        original_price: Number(document.getElementById('prod-orig-price').value || document.getElementById('prod-price').value),
        stock: Number(document.getElementById('prod-stock').value || 10),
        badge: document.getElementById('prod-badge').value,
        image_url: document.getElementById('prod-img').value,
        description: document.getElementById('prod-desc').value
      };

      try {
        await API.createProduct(newProd);
        showToast('New product added to catalog!');
        document.getElementById('admin-add-product-form').reset();
        openAdminModal();
        loadProducts();
        loadCategories();
      } catch (err) {
        showToast('Failed to add product: ' + err.message, 'error');
      }
    });

    // Close Modals via Close Button or Backdrop Click
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal-overlay');
        if (modal) closeModal(modal);
      });
    });
  }

  function openModal(modal) {
    if (modal) modal.classList.add('active');
  }

  function closeModal(modal) {
    if (modal) modal.classList.remove('active');
  }
});
