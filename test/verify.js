const http = require('node:http');

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, raw: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE AUTOMATED TESTS ---\n');
  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name}`);
      failed++;
    }
  }

  try {
    // 1. Static HTML
    const htmlRes = await request('/');
    assert(htmlRes.status === 200 && htmlRes.raw.includes('ElectroCart'), 'Static HTML served correctly');

    // 2. Categories
    const catRes = await request('/api/categories');
    assert(catRes.status === 200 && catRes.data.categories.length > 0, `Fetched ${catRes.data?.categories?.length} categories`);

    // 3. Products
    const prodRes = await request('/api/products');
    assert(prodRes.status === 200 && prodRes.data.products.length >= 12, `Fetched ${prodRes.data?.products?.length} products`);

    // 4. Product Search
    const searchRes = await request('/api/products?search=MacBook');
    assert(searchRes.status === 200 && searchRes.data.products.some(p => p.name.includes('MacBook')), 'Search for "MacBook" returns correct product');

    // 5. Customer Login
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@btech.edu', password: 'student123' }
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Student customer login succeeded with valid token');
    const customerToken = loginRes.data.token;

    // 6. Admin Login
    const adminLoginRes = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@ecommerce.com', password: 'admin123' }
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'admin', 'Admin login succeeded with admin role');
    const adminToken = adminLoginRes.data.token;

    // 7. Order Placement & Stock decrement
    const testProd = prodRes.data.products[0];
    const initialStock = testProd.stock;

    const orderRes = await request('/api/orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customer_name: 'Ayush Singh',
        customer_email: 'student@btech.edu',
        address: '123 College Hostel, CST Block',
        city: 'Delhi NCR',
        postal_code: '201301',
        payment_method: 'UPI',
        items: [{ product_id: testProd.id, quantity: 2 }]
      }
    });
    assert(orderRes.status === 201 && orderRes.data.order.id, `Order placed successfully (Order ID: #${orderRes.data?.order?.id})`);

    // Check stock was decremented
    const prodCheck = await request(`/api/products/${testProd.id}`);
    assert(prodCheck.data.product.stock === initialStock - 2, `Product stock decremented from ${initialStock} to ${prodCheck.data.product.stock}`);

    // 8. Order List for Customer
    const myOrdersRes = await request('/api/orders', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(myOrdersRes.status === 200 && myOrdersRes.data.orders.length > 0, 'Customer order history retrieved');

    // 9. Admin Stats
    const statsRes = await request('/api/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(statsRes.status === 200 && statsRes.data.stats.totalOrders >= 1, `Admin stats verified (Total Orders: ${statsRes.data.stats.totalOrders}, Revenue: ₹${statsRes.data.stats.totalRevenue})`);

    // 10. Admin Change Order Status
    const orderId = orderRes.data.order.id;
    const statusUpdateRes = await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Shipped' }
    });
    assert(statusUpdateRes.status === 200 && statusUpdateRes.data.order.status === 'Shipped', `Admin changed Order #${orderId} status to 'Shipped'`);

    // 11. Admin Create New Product
    const newProdRes = await request('/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Automated Test Gadget',
        category: 'Electronics',
        price: 4999,
        original_price: 6999,
        stock: 50,
        badge: 'Lab Tested',
        description: 'Verified via automated B.Tech CST test suite'
      }
    });
    assert(newProdRes.status === 201 && newProdRes.data.product.id, 'Admin successfully created new product');
    const createdId = newProdRes.data.product.id;

    // 12. Admin Delete Test Product
    const delRes = await request(`/api/products/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delRes.status === 200, 'Admin successfully deleted test product');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log(`\n================================`);
  console.log(`Test Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log(`================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
