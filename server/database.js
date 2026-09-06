const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const { hashPassword } = require('./auth');
const seedProducts = require('./seed-data');

const DB_PATH = path.join(__dirname, 'ecommerce.db');

// Ensure database directory exists
const db = new DatabaseSync(DB_PATH);

function initDatabase() {
  // Enable foreign keys and WAL mode for reliability
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'customer',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      original_price REAL,
      description TEXT,
      image_url TEXT,
      stock INTEGER DEFAULT 10,
      rating REAL DEFAULT 4.5,
      reviews_count INTEGER DEFAULT 0,
      badge TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      postal_code TEXT NOT NULL,
      payment_method TEXT NOT NULL,
      total_amount REAL NOT NULL,
      status TEXT DEFAULT 'Processing',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER,
      product_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      image_url TEXT,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      user_name TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
    );
  `);

  seedData();
}

function seedData() {
  // Check users count
  const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountStmt.get().count;

  if (userCount === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (name, email, password, role) 
      VALUES (?, ?, ?, ?)
    `);

    // 1. Admin Account (admin@ecommerce.com / admin123)
    insertUser.run('System Administrator', 'admin@ecommerce.com', hashPassword('admin123'), 'admin');

    // 2. Sample Student Customer (student@btech.edu / student123)
    insertUser.run('Ayush Singh', 'student@btech.edu', hashPassword('student123'), 'customer');
    console.log('Default accounts seeded: Admin (admin@ecommerce.com) & Student (student@btech.edu)');
  }

  // Check products count
  const prodCountStmt = db.prepare('SELECT COUNT(*) as count FROM products');
  const prodCount = prodCountStmt.get().count;

  if (prodCount === 0) {
    const insertProd = db.prepare(`
      INSERT INTO products (name, category, price, original_price, description, image_url, stock, rating, reviews_count, badge)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const p of seedProducts) {
      insertProd.run(
        p.name,
        p.category,
        p.price,
        p.original_price || p.price,
        p.description,
        p.image_url,
        p.stock,
        p.rating,
        p.reviews_count,
        p.badge || ''
      );
    }
    console.log(`Seeded ${seedProducts.length} initial products.`);
  }
}

initDatabase();

module.exports = {
  db
};
