const { handleRequest } = require('../server/server');
const { MockRequest, MockResponse } = require('./mock-http');

function request(method, path, options = {}) {
  return new Promise((resolve) => {
    const req = new MockRequest(method, path, options.headers, options.body);
    const res = new MockResponse();

    res.on('finish', () => {
      resolve({
        status: res.statusCode,
        data: res.getBodyJson(),
        raw: res.getBodyText(),
        headers: res.headers
      });
    });

    handleRequest(req, res);
  });
}

async function runInProcessTests() {
  console.log('======================================================');
  console.log('🧪 RUNNING IN-MEMORY TEST SUITE FOR MINI-ECOMMERCE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 1. Static HTML
    const htmlRes = await request('GET', '/');
    assert(htmlRes.status === 200 && htmlRes.raw.includes('ElectroCart'), 'Static HTML served correctly');

    // 2. Categories
    const catRes = await request('GET', '/api/categories');
    assert(catRes.status === 200 && catRes.data && catRes.data.categories.length > 0, `Fetched ${catRes.data?.categories?.length} categories`);

    // 3. Products
    const prodRes = await request('GET', '/api/products');
    assert(prodRes.status === 200 && prodRes.data && prodRes.data.products.length >= 12, `Fetched ${prodRes.data?.products?.length} products`);

    // 4. Product Search
    const searchRes = await request('GET', '/api/products?search=MacBook');
    assert(searchRes.status === 200 && searchRes.data.products.some(p => p.name.includes('MacBook')), 'Search for "MacBook" returns correct item');

    // 5. Customer Login
    const loginRes = await request('POST', '/api/auth/login', {
      body: { email: 'student@btech.edu', password: 'student123' }
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'Student customer login succeeded with JWT token');
    const customerToken = loginRes.data.token;

    // 6. Admin Login
    const adminLoginRes = await request('POST', '/api/auth/login', {
      body: { email: 'admin@ecommerce.com', password: 'admin123' }
    });
    assert(adminLoginRes.status === 200 && adminLoginRes.data.user.role === 'admin', 'Admin login succeeded with admin role');
    const adminToken = adminLoginRes.data.token;

    // 7. Order Placement & Stock decrement
    const testProd = prodRes.data.products[0];
    const initialStock = testProd.stock;

    const orderRes = await request('POST', '/api/orders', {
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        customer_name: 'Ayush Singh',
        customer_email: 'student@btech.edu',
        address: 'Room 402, CST Hostel',
        city: 'Delhi NCR',
        postal_code: '201301',
        payment_method: 'UPI',
        items: [{ product_id: testProd.id, quantity: 2 }]
      }
    });
    assert(orderRes.status === 201 && orderRes.data.order && orderRes.data.order.id, `Order placed successfully (Order ID: #${orderRes.data?.order?.id})`);

    // Stock check
    const prodCheck = await request('GET', `/api/products/${testProd.id}`);
    assert(prodCheck.data.product.stock === initialStock - 2, `Product stock decremented from ${initialStock} to ${prodCheck.data.product.stock}`);

    // 8. Order List for Customer
    const myOrdersRes = await request('GET', '/api/orders', {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(myOrdersRes.status === 200 && myOrdersRes.data.orders.length > 0, 'Customer order history retrieved');

    // 9. Admin Stats
    const statsRes = await request('GET', '/api/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(statsRes.status === 200 && statsRes.data.stats.totalOrders >= 1, `Admin stats verified (Total Orders: ${statsRes.data.stats.totalOrders}, Revenue: ₹${statsRes.data.stats.totalRevenue})`);

    // 10. Admin Change Order Status
    const orderId = orderRes.data.order.id;
    const statusUpdateRes = await request('PATCH', `/api/orders/${orderId}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { status: 'Shipped' }
    });
    assert(statusUpdateRes.status === 200 && statusUpdateRes.data.order.status === 'Shipped', `Admin changed Order #${orderId} status to 'Shipped'`);

    // 11. Admin Create New Product
    const newProdRes = await request('POST', '/api/products', {
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
    const delRes = await request('DELETE', `/api/products/${createdId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delRes.status === 200, 'Admin successfully deleted test product');

  } catch (err) {
    console.error('Test execution exception:', err);
    failed++;
  }

  console.log(`\n======================================================`);
  console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runInProcessTests();
