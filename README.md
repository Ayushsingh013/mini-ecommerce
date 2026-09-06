# ElectroCart - B.Tech CST Mini E-Commerce Project

An end-to-end, responsive, lightweight Mini E-Commerce web application built specifically for **B.Tech Computer Science & Technology** lab evaluations, mini-project submissions, and technical viva presentations.

---

## 🌟 Key Highlights
- **Zero External Dependencies / Zero-Install**: Built using standard Node.js (v20+) native modules (`node:http`, `node:sqlite`, `node:crypto`). Starts instantly without downloading hundreds of megabytes of `node_modules`!
- **Real Persistent Relational Database**: Uses an embedded SQLite database (`ecommerce.db`) with relational tables, foreign key constraints, and ACID transactions.
- **Role-Based Access Control (RBAC)**:
  - **Customer Role**: Product browsing, multi-criteria filtering, persistent shopping cart, checkout with mock payment (UPI/Card/COD), and order tracking.
  - **Admin Role**: Store management console, live metrics (Revenue, Orders, Low-Stock alerts), inventory catalog management (Add/Delete products), and customer order status updates.
- **Production-Grade Security**: Passwords hashed using cryptographic scrypt salt derivation (`node:crypto.scryptSync`) and verified via constant-time buffer comparisons (`crypto.timingSafeEqual`).

---

## 📁 Project Structure

```
mini-ecommerce/
├── package.json                   # Project metadata and run scripts
├── README.md                      # Setup and documentation
├── VIVA_QUESTIONS_AND_DOCS.md     # SRS, ER diagram, DFD, Schema, and 25+ Viva Q&A
├── server/
│   ├── database.js                # SQLite schema creation and data seeding
│   ├── seed-data.js               # Initial realistic tech catalog data
│   ├── auth.js                    # Password hashing & session token management
│   └── server.js                  # Pure Node.js REST API & static web server
├── public/
│   ├── index.html                 # Semantic single-page application layout
│   ├── css/
│   │   └── style.css              # Custom CSS design system (Dark/Light themes)
│   └── js/
│       ├── api.js                 # Frontend API client service
│       └── app.js                 # State management, cart, and UI interactions
└── test/
    ├── mock-http.js               # In-memory HTTP mock streams
    ├── test-runner.js             # Automated in-process test suite
    └── verify.js                  # Socket-based verification script
```

---

## 🚀 How to Run the Project

### Prerequisites
- Node.js (v20 or higher recommended, tested on Node.js v24)

### 1. Start the Server
From the project folder, simply run:
```bash
node server/server.js
```
*Alternatively:*
```bash
npm start
```

### 2. Open in Browser
Navigate to:
```
http://localhost:3000
```

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Access Privileges |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@ecommerce.com` | `admin123` | Full access: Admin dashboard, stock alerts, add/delete products, manage customer order statuses |
| **Student Customer** | `student@btech.edu` | `student123` | Customer access: Browse products, search, cart, checkout, view order history |

*Note: You can also click **"Create Account"** on the Sign In modal to register a new customer account at any time.*

---

## 🧪 Running Automated Tests

Run the automated test suite to verify database operations, auth, order transactions, and admin endpoints:
```bash
node test/test-runner.js
```

---

## 📡 REST API Summary

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new customer account | No |
| `POST` | `/api/auth/login` | Authenticate user & issue session token | No |
| `GET` | `/api/auth/me` | Fetch currently logged in user profile | Yes |
| `POST` | `/api/auth/logout` | Invalidate active session token | Yes |
| `GET` | `/api/categories` | Get all product categories with item counts | No |
| `GET` | `/api/products` | Query products (supports search, category, min/max price, sort) | No |
| `GET` | `/api/products/:id` | Get details for a single product | No |
| `POST` | `/api/products` | Add a new product to inventory | Yes (Admin) |
| `DELETE`| `/api/products/:id` | Delete product from database | Yes (Admin) |
| `POST` | `/api/orders` | Place order & decrement stock (ACID transaction) | Optional |
| `GET` | `/api/orders` | Get user order history (or all orders if admin) | Yes |
| `PATCH`| `/api/orders/:id/status`| Update order status (`Processing`, `Shipped`, `Delivered`) | Yes (Admin) |
| `GET` | `/api/stats` | Get store revenue, order volume, and low stock metrics | Yes (Admin) |

---

## 🎓 Academic Viva & Lab Reference
Check out [`VIVA_QUESTIONS_AND_DOCS.md`](./VIVA_QUESTIONS_AND_DOCS.md) for:
1. Entity-Relationship (ER) Diagram
2. Data Flow Diagrams (DFD Level 0 & Level 1)
3. Full SQL Schema (DDL)
4. Detailed Viva Questions and Answers for your lab examiner!
