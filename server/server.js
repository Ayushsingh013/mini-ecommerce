const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const url = require('node:url');
const { db } = require('./database');
const { hashPassword, verifyPassword, generateToken, getSession, revokeToken } = require('./auth');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  sendJson(res, statusCode, { success: false, error: message });
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 1e6) {
        req.connection.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getAuthUser(req) {
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    return getSession(token);
  }
  return null;
}

async function handleRequest(req, res) {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const query = Object.fromEntries(reqUrl.searchParams.entries());
  const method = req.method.toUpperCase();

  try {
    // ----------------------------------------------------
    // API ROUTING
    // ----------------------------------------------------

    // --- AUTHENTICATION ---
    if (pathname === '/api/auth/register' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { name, email, password } = body;

      if (!name || !email || !password) {
        return sendError(res, 400, 'Name, email, and password are required');
      }

      if (password.length < 6) {
        return sendError(res, 400, 'Password must be at least 6 characters');
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (existing) {
        return sendError(res, 409, 'Email is already registered');
      }

      const hashedPassword = hashPassword(password);
      const result = db.prepare(`
        INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'customer')
      `).run(name.trim(), email.toLowerCase().trim(), hashedPassword);

      const newUser = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
      const token = generateToken(newUser);

      return sendJson(res, 201, {
        success: true,
        message: 'Registration successful',
        user: newUser,
        token
      });
    }

    if (pathname === '/api/auth/login' && method === 'POST') {
      const body = await parseJsonBody(req);
      const { email, password } = body;

      if (!email || !password) {
        return sendError(res, 400, 'Email and password are required');
      }

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
      if (!user || !verifyPassword(password, user.password)) {
        return sendError(res, 401, 'Invalid email or password');
      }

      const token = generateToken(user);
      return sendJson(res, 200, {
        success: true,
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          created_at: user.created_at
        },
        token
      });
    }

    if (pathname === '/api/auth/me' && method === 'GET') {
      const session = getAuthUser(req);
      if (!session) {
        return sendError(res, 401, 'Not authenticated');
      }

      const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(session.id);
      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      return sendJson(res, 200, { success: true, user });
    }

    if (pathname === '/api/auth/logout' && method === 'POST') {
      const authHeader = req.headers['authorization'] || '';
      if (authHeader.startsWith('Bearer ')) {
        revokeToken(authHeader.slice(7).trim());
      }
      return sendJson(res, 200, { success: true, message: 'Logged out successfully' });
    }

    // --- CATEGORIES ---
    if (pathname === '/api/categories' && method === 'GET') {
      const categories = db.prepare(`
        SELECT category as name, COUNT(*) as count 
        FROM products 
        GROUP BY category 
        ORDER BY count DESC
      `).all();
      return sendJson(res, 200, { success: true, categories });
    }

    // --- PRODUCTS ---
    if (pathname === '/api/products' && method === 'GET') {
      let sql = 'SELECT * FROM products WHERE 1=1';
      const params = [];

      if (query.category && query.category !== 'All') {
        sql += ' AND category = ?';
        params.push(query.category);
      }

      if (query.search) {
        sql += ' AND (name LIKE ? OR description LIKE ? OR category LIKE ?)';
        const searchTerm = `%${query.search.trim()}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      if (query.minPrice) {
        sql += ' AND price >= ?';
        params.push(Number(query.minPrice));
      }

      if (query.maxPrice) {
        sql += ' AND price <= ?';
        params.push(Number(query.maxPrice));
      }

      // Sorting
      if (query.sort === 'price_asc') {
        sql += ' ORDER BY price ASC';
      } else if (query.sort === 'price_desc') {
        sql += ' ORDER BY price DESC';
      } else if (query.sort === 'rating') {
        sql += ' ORDER BY rating DESC';
      } else if (query.sort === 'name') {
        sql += ' ORDER BY name ASC';
      } else {
        sql += ' ORDER BY id DESC';
      }

      const products = db.prepare(sql).all(...params);
      return sendJson(res, 200, { success: true, count: products.length, products });
    }

    // Product by ID
    const productMatch = pathname.match(/^\/api\/products\/(\d+)$/);
    if (productMatch) {
      const productId = Number(productMatch[1]);

      if (method === 'GET') {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) {
          return sendError(res, 404, 'Product not found');
        }
        return sendJson(res, 200, { success: true, product });
      }

      // Admin actions: PUT & DELETE
      if (method === 'PUT') {
        const session = getAuthUser(req);
        if (!session || session.role !== 'admin') {
          return sendError(res, 403, 'Forbidden: Admin privilege required');
        }

        const body = await parseJsonBody(req);
        const { name, category, price, original_price, description, image_url, stock, badge } = body;

        db.prepare(`
          UPDATE products 
          SET name = COALESCE(?, name),
              category = COALESCE(?, category),
              price = COALESCE(?, price),
              original_price = COALESCE(?, original_price),
              description = COALESCE(?, description),
              image_url = COALESCE(?, image_url),
              stock = COALESCE(?, stock),
              badge = COALESCE(?, badge)
          WHERE id = ?
        `).run(name, category, price, original_price, description, image_url, stock, badge, productId);

        const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        return sendJson(res, 200, { success: true, product: updated });
      }

      if (method === 'DELETE') {
        const session = getAuthUser(req);
        if (!session || session.role !== 'admin') {
          return sendError(res, 403, 'Forbidden: Admin privilege required');
        }

        db.prepare('DELETE FROM products WHERE id = ?').run(productId);
        return sendJson(res, 200, { success: true, message: 'Product deleted successfully' });
      }
    }

    // Create new product (Admin)
    if (pathname === '/api/products' && method === 'POST') {
      const session = getAuthUser(req);
      if (!session || session.role !== 'admin') {
        return sendError(res, 403, 'Forbidden: Admin privilege required');
      }

      const body = await parseJsonBody(req);
      const { name, category, price, original_price, description, image_url, stock, badge } = body;

      if (!name || !category || !price) {
        return sendError(res, 400, 'Name, category, and price are required');
      }

      const result = db.prepare(`
        INSERT INTO products (name, category, price, original_price, description, image_url, stock, rating, reviews_count, badge)
        VALUES (?, ?, ?, ?, ?, ?, ?, 5.0, 1, ?)
      `).run(
        name,
        category,
        Number(price),
        original_price ? Number(original_price) : Number(price),
        description || '',
        image_url || 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
        stock ? Number(stock) : 10,
        badge || ''
      );

      const newProduct = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
      return sendJson(res, 201, { success: true, product: newProduct });
    }

    // --- ORDERS ---
    if (pathname === '/api/orders' && method === 'POST') {
      const session = getAuthUser(req);
      const body = await parseJsonBody(req);
      const { customer_name, customer_email, address, city, postal_code, payment_method, items } = body;

      if (!customer_name || !customer_email || !address || !city || !postal_code || !items || !items.length) {
        return sendError(res, 400, 'All shipping fields and cart items are required');
      }

      // Calculate total amount & verify stock
      let totalAmount = 0;
      const orderItemsToInsert = [];

      for (const item of items) {
        const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
        if (!prod) {
          return sendError(res, 400, `Product ID ${item.product_id} no longer exists`);
        }
        if (prod.stock < item.quantity) {
          return sendError(res, 400, `Insufficient stock for "${prod.name}" (Only ${prod.stock} left)`);
        }
        totalAmount += prod.price * item.quantity;
        orderItemsToInsert.push({
          product_id: prod.id,
          product_name: prod.name,
          price: prod.price,
          quantity: item.quantity,
          image_url: prod.image_url
        });
      }

      // Insert Order inside transaction
      db.exec('BEGIN TRANSACTION');
      try {
        const userId = session ? session.id : null;
        const orderInsert = db.prepare(`
          INSERT INTO orders (user_id, customer_name, customer_email, address, city, postal_code, payment_method, total_amount, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Processing')
        `).run(
          userId,
          customer_name.trim(),
          customer_email.toLowerCase().trim(),
          address.trim(),
          city.trim(),
          postal_code.trim(),
          payment_method || 'Card',
          totalAmount
        );

        const orderId = orderInsert.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO order_items (order_id, product_id, product_name, price, quantity, image_url)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const updateStock = db.prepare(`
          UPDATE products SET stock = stock - ? WHERE id = ?
        `);

        for (const it of orderItemsToInsert) {
          insertItem.run(orderId, it.product_id, it.product_name, it.price, it.quantity, it.image_url);
          updateStock.run(it.quantity, it.product_id);
        }

        db.exec('COMMIT');

        const placedOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
        const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

        return sendJson(res, 201, {
          success: true,
          message: 'Order placed successfully',
          order: { ...placedOrder, items: orderItems }
        });
      } catch (err) {
        db.exec('ROLLBACK');
        console.error('Order placement failed:', err);
        return sendError(res, 500, 'Failed to complete order transaction');
      }
    }

    // List Orders
    if (pathname === '/api/orders' && method === 'GET') {
      const session = getAuthUser(req);

      if (!session) {
        return sendError(res, 401, 'Please log in to view your orders');
      }

      let orders = [];
      if (session.role === 'admin') {
        orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
      } else {
        orders = db.prepare('SELECT * FROM orders WHERE user_id = ? OR customer_email = ? ORDER BY id DESC').all(session.id, session.email);
      }

      // Attach items to each order
      const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?');
      const ordersWithItems = orders.map(o => ({
        ...o,
        items: getItems.all(o.id)
      }));

      return sendJson(res, 200, { success: true, count: ordersWithItems.length, orders: ordersWithItems });
    }

    // Update order status (Admin)
    const orderStatusMatch = pathname.match(/^\/api\/orders\/(\d+)\/status$/);
    if (orderStatusMatch && method === 'PATCH') {
      const session = getAuthUser(req);
      if (!session || session.role !== 'admin') {
        return sendError(res, 403, 'Forbidden: Admin privilege required');
      }

      const orderId = Number(orderStatusMatch[1]);
      const body = await parseJsonBody(req);
      const { status } = body;

      const validStatuses = ['Processing', 'Shipped', 'Delivered', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }

      db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, orderId);
      const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);

      return sendJson(res, 200, { success: true, order: updated });
    }

    // --- ADMIN DASHBOARD STATS ---
    if (pathname === '/api/stats' && method === 'GET') {
      const session = getAuthUser(req);
      if (!session || session.role !== 'admin') {
        return sendError(res, 403, 'Forbidden: Admin privilege required');
      }

      const totalRevenue = db.prepare("SELECT COALESCE(SUM(total_amount), 0) as total FROM orders WHERE status != 'Cancelled'").get().total;
      const totalOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get().count;
      const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
      const totalCustomers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'customer'").get().count;
      const lowStockProducts = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= 5').get().count;
      const recentOrders = db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 5').all();

      return sendJson(res, 200, {
        success: true,
        stats: {
          totalRevenue,
          totalOrders,
          totalProducts,
          totalCustomers,
          lowStockProducts,
          recentOrders
        }
      });
    }

    // ----------------------------------------------------
    // STATIC FILE SERVING
    // ----------------------------------------------------
    let safePath = pathname === '/' ? '/index.html' : pathname;
    const filePath = path.normalize(path.join(PUBLIC_DIR, safePath));

    if (!filePath.startsWith(PUBLIC_DIR)) {
      return sendError(res, 403, 'Access Denied');
    }

    fs.stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) {
        // Fallback to index.html for Single Page App routing
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        fs.readFile(indexPath, (readErr, content) => {
          if (readErr) {
            return sendError(res, 404, 'Not Found');
          }
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(content);
        });
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    });

  } catch (err) {
    console.error('Server error:', err);
    return sendError(res, 500, err.message || 'Internal server error');
  }
}

const server = http.createServer(handleRequest);

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Mini E-Commerce Server is running on port ${PORT}!`);
    console.log(`👉 Access URL: http://localhost:${PORT}`);
    console.log(`👨‍💻 Admin Login: admin@ecommerce.com / admin123`);
    console.log(`👤 Student Login: student@btech.edu / student123`);
    console.log(`======================================================\n`);
  });
}

module.exports = {
  server,
  handleRequest
};
