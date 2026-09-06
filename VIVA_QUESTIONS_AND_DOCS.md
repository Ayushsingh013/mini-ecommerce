# B.Tech CST Project Documentation & Viva Guide
## Project: Mini E-Commerce Web Application (ElectroCart)

---

## 1. System Requirements Specification (SRS)

### 1.1 Objective
To develop a lightweight, reliable, full-stack Mini E-Commerce web system that facilitates product catalog browsing, dynamic search and filtering, real-time inventory management, shopping cart operations, mock payment processing, order fulfillment tracking, and administrative control.

### 1.2 Functional Requirements
1. **User Management**:
   - Customer registration and login with secure password hashing.
   - Role-Based Access Control (RBAC) distinguishing normal **Customers** from **Administrators**.
   - Persistent authentication state via session tokens.
2. **Product Catalog & Discovery**:
   - Categorized catalog display with live category item counts.
   - Real-time debounced text search matching product name, category, and description.
   - Price range filtering and sorting (Price low-to-high, high-to-low, rating, alphabetical).
   - Product details view including stock status, discount percentage, and user ratings.
3. **Cart & Checkout Management**:
   - Client-side cart persistence using browser `localStorage`.
   - Real-time cart calculation (subtotal, quantity adjustments, item removal).
   - Multi-step checkout validating shipping address and payment method (UPI, Card, Cash on Delivery).
   - Server-side atomic transaction verifying inventory and updating stock levels upon checkout.
4. **Order Tracking**:
   - Order history dashboard displaying placed orders, itemized breakdown, and status (`Processing`, `Shipped`, `Delivered`).
5. **Administration Panel**:
   - Store metrics dashboard (total revenue, total order count, catalog count, low-stock count).
   - Inventory management with Add Product form and Delete actions.
   - Order fulfillment workflow allowing admins to update order statuses.

### 1.3 Non-Functional Requirements
- **Performance**: Instant page load times without heavy external dependencies or compilation overhead.
- **Portability**: Runs on any OS with Node.js installed without requiring external database server installations (MySQL/Postgres) due to self-contained SQLite.
- **Security**: Protection against timing attacks via constant-time buffer verification (`crypto.timingSafeEqual`) and cryptographic salt hashing (`scrypt`).
- **Data Integrity**: Database constraints (`UNIQUE` email, `FOREIGN KEY` references with `CASCADE`/`SET NULL`, `BEGIN TRANSACTION` / `COMMIT` / `ROLLBACK`).

---

## 2. Entity-Relationship (ER) Diagram

```
 +-----------------------------------+             +-----------------------------------+
 |               USERS               |             |              ORDERS               |
 +-----------------------------------+             +-----------------------------------+
 | PK  id              INTEGER       | 1         * | PK  id              INTEGER       |
 |     name            TEXT          |<----------->| FK  user_id         INTEGER       |
 |     email           TEXT (UNIQUE) |             |     customer_name   TEXT          |
 |     password        TEXT (HASHED) |             |     customer_email  TEXT          |
 |     role            TEXT          |             |     address         TEXT          |
 |     created_at      DATETIME      |             |     city            TEXT          |
 +-----------------------------------+             |     postal_code     TEXT          |
                                                   |     payment_method  TEXT          |
                                                   |     total_amount    REAL          |
                                                   |     status          TEXT          |
                                                   |     created_at      DATETIME      |
                                                   +-----------------+-----------------+
                                                                     | 1
                                                                     |
                                                                     | *
 +-----------------------------------+             +-----------------+-----------------+
 |             PRODUCTS              |             |            ORDER_ITEMS            |
 +-----------------------------------+             +-----------------------------------+
 | PK  id              INTEGER       | 1         * | PK  id              INTEGER       |
 |     name            TEXT          |<----------->| FK  order_id        INTEGER       |
 |     category        TEXT          |             | FK  product_id      INTEGER       |
 |     price           REAL          |             |     product_name    TEXT          |
 |     original_price  REAL          |             |     price           REAL          |
 |     description     TEXT          |             |     quantity        INTEGER       |
 |     image_url       TEXT          |             |     image_url       TEXT          |
 |     stock           INTEGER       |             +-----------------------------------+
 |     rating          REAL          |
 |     reviews_count   INTEGER       |
 |     badge           TEXT          |
 |     created_at      DATETIME      |
 +-----------------+-----------------+
                   | 1
                   |
                   | *
 +-----------------+-----------------+
 |              REVIEWS              |
 +-----------------------------------+
 | PK  id              INTEGER       |
 | FK  product_id      INTEGER       |
 |     user_name       TEXT          |
 |     rating          INTEGER       |
 |     comment         TEXT          |
 |     created_at      DATETIME      |
 +-----------------------------------+
```

---

## 3. Data Flow Diagrams (DFD)

### 3.1 DFD Level 0 (Context Diagram)

```
                     +---------------------------------------+
                     |                                       |
  Customer Request   |                                       |   Order Details, Catalog
+------------------->|                                       |--------------------------->
  (Search, Checkout) |                                       |
                     |                                       |
                     |         ElectroCart System            |
                     |                                       |
  Admin Actions      |                                       |   Store Analytics & Orders
+------------------->|                                       |--------------------------->
  (Add Prod, Status) |                                       |
                     +---------------------------------------+
```

### 3.2 DFD Level 1 (Decomposed Architecture)

```
[Customer] ---> 1.0 Authentication ---> [Users DB]
       |
       +------> 2.0 Browse & Filter ---> [Products DB]
       |
       +------> 3.0 Cart & Checkout ---> 4.0 Transaction Controller ---> [Orders DB]
                                                        |           ---> [Order Items DB]
                                                        +--------------> [Update Product Stock]

[Admin]    ---> 5.0 Admin Console   ---> Query Analytics & Modify Inventory / Order Statuses
```

---

## 4. Database Schema (DDL)

```sql
PRAGMA foreign_keys = ON;

-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'customer',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Products Catalog Table
CREATE TABLE products (
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

-- Orders Master Table
CREATE TABLE orders (
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

-- Order Line Items Table
CREATE TABLE order_items (
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
```

---

## 5. 25+ Essential B.Tech CST Viva Questions & Answers

### General & Architecture
**Q1: What architecture does this web application follow?**
> **Answer**: It follows a **Client-Server 3-Tier Architecture**:
> 1. *Presentation Layer (Frontend)*: Responsive Single Page Application (SPA) built with HTML5, CSS3, and modern JavaScript.
> 2. *Application Layer (Backend)*: RESTful API server developed in Node.js managing routing, business logic, authentication, and validation.
> 3. *Data Layer (Database)*: Relational SQLite database with foreign keys and ACID transactions.

**Q2: Why did you choose SQLite over MySQL or MongoDB for this mini-project?**
> **Answer**: SQLite is serverless, zero-configuration, and self-contained in a single file (`ecommerce.db`). It enforces standard SQL relational integrity and ACID properties while eliminating external daemon dependencies, making the project portable and easy to run on any lab computer.

**Q3: What are the advantages of a Single Page Application (SPA)?**
> **Answer**: In an SPA, the browser loads the initial HTML, CSS, and scripts once. Further interactions (searching, filtering, adding to cart, placing orders) exchange only compact JSON payloads with the REST API in the background. This avoids full-page reloads and provides a smooth user experience.

---

### Backend & API
**Q4: What is REST and how does your API adhere to RESTful principles?**
> **Answer**: REST (Representational State Transfer) is an architectural style using standard HTTP methods:
> - `GET`: Read resources (`/api/products`, `/api/orders`)
> - `POST`: Create resources (`/api/orders`, `/api/auth/register`)
> - `PUT`: Update entire resource (`/api/products/:id`)
> - `PATCH`: Partially update resource (`/api/orders/:id/status`)
> - `DELETE`: Remove resource (`/api/products/:id`)
> It uses standard HTTP status codes (`200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`).

**Q5: What is CORS and why is it necessary?**
> **Answer**: Cross-Origin Resource Sharing (CORS) is a browser security mechanism that restricts web applications from requesting resources from a different domain, protocol, or port than the one that served the web page. Our server sends `Access-Control-Allow-Origin: *` and handles `OPTIONS` preflight requests so clients can access the API.

**Q6: How does the server handle asynchronous operations in Node.js?**
> **Answer**: Node.js operates on an event-driven, single-threaded Event Loop. Asynchronous tasks (like reading requests, processing streams, or performing disk I/O) are handled via Promises and `async/await` syntax, preventing the server from blocking during concurrent client connections.

---

### Database & Transactions
**Q7: What are ACID properties and where are they demonstrated in your project?**
> **Answer**: ACID stands for:
> - **Atomicity**: The entire operation succeeds or completely rolls back. Demonstrated in checkout: `BEGIN TRANSACTION`, inserting into `orders` and `order_items`, and reducing product `stock`. If any item fails, `ROLLBACK` executes.
> - **Consistency**: Database schema constraints (foreign keys, non-null fields) are preserved before and after transactions.
> - **Isolation**: Concurrent orders do not read uncommitted stock deductions.
> - **Durability**: Once committed (`COMMIT`), the order is permanently saved to disk in `ecommerce.db`.

**Q8: What is the difference between `ON DELETE CASCADE` and `ON DELETE SET NULL`?**
> **Answer**:
> - In `order_items`, `ON DELETE CASCADE` ensures that if an order is deleted, all line items belonging to that order are automatically deleted.
> - In `orders`, `FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL` ensures that if a user deletes their account, historical order records remain intact with `user_id = NULL` for accounting purposes.

**Q9: Why do you store price in `order_items` when it is already in `products`?**
> **Answer**: This avoids historical inconsistency. If an admin alters the price of a product later from ₹50,000 to ₹60,000, past orders must still record the exact price paid at the time of purchase.

---

### Security & Authentication
**Q10: Why should passwords never be stored in plain text?**
> **Answer**: If the database is compromised, plaintext passwords expose users across other services where they reuse credentials. We hash passwords using `scrypt` with a cryptographically secure pseudo-random 16-byte salt (`crypto.randomBytes(16)`).

**Q11: What is a Salt in password hashing and what attack does it prevent?**
> **Answer**: A salt is a random string concatenated with the password before hashing. It prevents attackers from using precomputed **Rainbow Tables** or dictionary lookups, ensuring that two users with identical passwords will have completely different hashes.

**Q12: What is `crypto.timingSafeEqual` and why is it used?**
> **Answer**: Standard string comparison (`===`) terminates at the first mismatched character, which leaks timing information that an attacker can exploit via a **Timing Attack** to deduce correct characters. `crypto.timingSafeEqual` runs in constant time regardless of where mismatches occur.

**Q13: How does Role-Based Access Control (RBAC) work in your project?**
> **Answer**: The server checks the user's role attached to their session token before executing protected operations. If a regular customer attempts to call `POST /api/products` or `PATCH /api/orders/:id/status`, the server rejects the request with HTTP `403 Forbidden`.

---

### Frontend & UI
**Q14: How does the client remember items in the shopping cart across page reloads?**
> **Answer**: The cart array is serialized to a JSON string and stored in the browser's `localStorage`. When the page reloads, the script deserializes the stored string back into JavaScript memory.

**Q15: What is Search Debouncing and why is it implemented in the search bar?**
> **Answer**: Without debouncing, an API request would be sent for every single keystroke. Debouncing delays the API call by 300 milliseconds until the user pauses typing, reducing server load and preventing unnecessary network traffic.

**Q16: How is CSS responsiveness achieved without external UI frameworks like Bootstrap?**
> **Answer**: Responsive design is achieved using **CSS Grid** (`repeat(auto-fit, minmax(...))`), **CSS Flexbox**, and **Media Queries** (`@media (max-width: 880px)`). This allows the layout to adapt smoothly from mobile screens to desktop monitors.

---

### Testing & Verification
**Q17: How did you test and verify your project?**
> **Answer**: We built an automated test runner (`test/test-runner.js`) that simulates client-server communication. It runs 13 automated test cases covering authentication, product catalog retrieval, search, order transactions, stock deductions, and admin controls.

**Q18: What future enhancements could be added to this project?**
> **Answer**:
> 1. Integration with a live payment gateway like Razorpay or Stripe.
> 2. Email confirmation dispatch via Nodemailer/SMTP.
> 3. Product image uploads via multipart/form-data.
> 4. Customer product review submission and rating calculations.
