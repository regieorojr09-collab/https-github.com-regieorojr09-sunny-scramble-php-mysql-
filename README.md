# Sunny & Scramble — Point of Sale (POS) & Inventory Management System

[![PHP Version](https://img.shields.io/badge/PHP-8.2%2B-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Database](https://img.shields.io/badge/Database-MySQL%20%2F%20PDO-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Frontend](https://img.shields.io/badge/Frontend-Vanilla%20JS%20(ES6%2B)-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Data Interchange](https://img.shields.io/badge/Interchange-XML%20%2F%20JSON-orange?logo=xml&logoColor=white)](https://www.w3.org/XML/)
[![Architecture](https://img.shields.io/badge/Architecture-SPA%20%2B%20REST%20API-009688)](#architecture)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**Sunny & Scramble** is an enterprise-grade, lightweight Point of Sale (POS) and Inventory Management System designed specifically for poultry and food retail businesses. Engineered with a clean modern aesthetic, robust relational data modeling, and zero-framework dependencies on the client side, the application provides real-time sales processing, inventory ledger tracking, delivery restocking, financial reporting, XML data interchange, and multi-tier role-based access control (RBAC).

---

## Table of Contents
- [Key Features](#key-features)
- [Architecture & Tech Stack](#architecture--tech-stack)
- [Database Schema & Entity Relationship](#database-schema--entity-relationship)
- [Project Directory Structure](#project-directory-structure)
- [Prerequisites](#prerequisites)
- [Installation & Quick Start](#installation--quick-start)
- [Live Cloud Deployment Guide (Render, Railway, Cloud)](#live-cloud-deployment-guide)
- [Default User Accounts](#default-user-accounts)
- [API Reference](#api-reference)
- [XML Integration](#xml-integration)
- [Security & Best Practices](#security--best-practices)
- [Contributing & License](#contributing--license)

---

## Key Features

### 1. Point of Sale (POS) & Checkout
- **Interactive POS Interface**: Rapid product search, category filtering (Chicken, Egg, Condiments, Pantry Staples), and instant cart calculations.
- **Transactional Consistency**: Atomic checkout using MySQL `SELECT ... FOR UPDATE` row locks to prevent race conditions and negative inventory counts.
- **Dynamic Digital Receipts**: Instant receipt generation with tax breakdown, printable format, and customizable store receipt footers.

### 2. Inventory & Stock Management
- **Live Stock Alerts**: Configurable low-stock percentage thresholds with visual status tags (`In Stock`, `Low Stock`, `Out of Stock`).
- **Real-Time Running Balance Ledger**: Automatic tracking of every stock movement across sales, restocks, adjustments, spoilages, and returns.
- **Manual Stock Adjustments**: Fast stock-in/stock-out logging with required audit reasons.

### 3. Deliveries & Supplier Management
- **Restock Logging**: Record supplier deliveries with purchase order/reference numbers.
- **Unit Cost Updating**: Automatically recalculates unit costs and increases product quantity upon delivery receipt.
- **Supplier Directory**: Contact management, payment terms tracking (COD, Net 30, etc.), and complete supplier purchase history.

### 4. Spoilage & Wastage Tracking
- **Defect & Spoilage Logging**: Capture spoiled or damaged items with categorized reasons (Expired, Damaged Packaging, Temperature Fluctuation).
- **Cost Calculation**: Automatically evaluates financial losses based on current item unit costs.

### 5. Customer & Supplier Returns (RTS)
- **Customer Returns**: Process return requests with refund or direct replacement workflows (with automated replacement stock deduction).
- **Return to Supplier (RTS)**: Track defective batches returned to vendors with status lifecycle management (`Pending` &rarr; `Refunded` / `Replaced`).

### 6. Reports & Financial Intelligence
- **Interactive Dashboard**: Total sales, supplier delivery expenses, net profit, low-stock item counts, and spoilage totals across flexible time ranges (`Today`, `This Week`, `This Month`, `All Time`).
- **6-Month Revenue Trends**: Visual monthly revenue comparison.
- **Income Statement & Export**: Revenue vs. expense analysis with customizable date-range filtering.

### 7. XML Data Interchange
- **XML Inventory Export**: Clean XML inventory feeds formatted via PHP `DOMDocument` with metadata, store configurations, and product catalogs.
- **Batch XML Catalog Sync**: Upload external XML files via `SimpleXMLElement` to batch-update prices, stock levels, and capacities.

### 8. Enterprise RBAC & Security
- **Role Hierarchy**: `superadmin`, `owner`, `admin`, and `staff`.
- **First-Time Password Enforcement**: Generated passwords require user-initiated password change upon first login (`mustChangePassword` flag).
- **Audit Trails**: Centralized audit log tracking every user action, module modification, and timestamp.
- **One-Click System Backup**: Full-database JSON export across all 12 relational tables.

---

## Architecture & Tech Stack

```
+-------------------------------------------------------------------+
|                        Client Browser UI                          |
|             Vanilla JavaScript (ES6+ SPA) + Modern CSS3           |
+---------------------------------+---------------------------------+
                                  |
                           JSON / REST API / XML
                                  |
+---------------------------------v---------------------------------+
|                       PHP 8.2 Application Layer                   |
|  - Routing & RBAC Middleware (config/db.php)                      |
|  - XML Parser & Serializer (DOMDocument / SimpleXML)              |
|  - Prepared Statements & Transactions (PDO MySQL)                 |
+---------------------------------+---------------------------------+
                                  |
                             SQL (TCP/3306)
                                  |
+---------------------------------v---------------------------------+
|                   MySQL / MariaDB Relational Database             |
|  - InnoDB Storage Engine (Row Locks & Foreign Key Cascades)       |
|  - UTF-8 Multi-Byte Charset (utf8mb4_unicode_ci)                  |
+-------------------------------------------------------------------+
```

- **Backend**: PHP 8.2 (Native PDO, no heavy frameworks)
- **Database**: MySQL 8.0+ / MariaDB 10.4+ (InnoDB Engine)
- **Frontend**: Vanilla ES6+ JavaScript, CSS3 Design Tokens, SVG Icons
- **Data Serialization**: XML (W3C DOM / SimpleXML), JSON (RFC 8259)

---

## Database Schema & Entity Relationship

The database schema (`database/schema.sql`) consists of 12 normalized InnoDB tables:

| Table | Description | Primary Key | Key Foreign Keys |
| :--- | :--- | :--- | :--- |
| `users` | System accounts, hashed passwords, roles, status | `id` | - |
| `products` | Inventory catalog, prices, quantities, threshold capacities | `id` | - |
| `suppliers` | Vendor directory, contact details, payment terms | `id` | `createdBy` &rarr; `users(id)` |
| `sales` | Sale transactions, total amounts, customer info | `id` | `recordedBy` &rarr; `users(id)` |
| `sale_items` | Individual line items per sale | `id` | `saleId` &rarr; `sales(id)`, `productId` &rarr; `products(id)` |
| `deliveries` | Restock delivery records from suppliers | `id` | `productId` &rarr; `products(id)`, `supplierId` &rarr; `suppliers(id)` |
| `spoilages` | Waste and spoilage records with calculated losses | `id` | `productId` &rarr; `products(id)`, `reportedBy` &rarr; `users(id)` |
| `inventory_transactions`| Stock adjustments and movement ledger | `id` | `productId` &rarr; `products(id)`, `recordedBy` &rarr; `users(id)` |
| `audit_logs` | Security and operational event logs | `id` | `userId` &rarr; `users(id)` |
| `store_config` | Business name, branch, tax rate, receipt footer | `id` | - |
| `customer_returns` | Customer item returns, refund amounts, notes | `id` | `productId` &rarr; `products(id)`, `processedBy` &rarr; `users(id)` |
| `supplier_returns` | RTS vendor return claims and status updates | `id` | `supplierId` &rarr; `suppliers(id)`, `productId` &rarr; `products(id)` |

---

## Project Directory Structure

```
sunny-scramble/
├── api/                             # REST API Endpoints (PDO Prepared Statements)
│   ├── audit_logs.php               # System audit log retrieval
│   ├── auth.php                     # Authentication, sessions, login/logout
│   ├── backup.php                   # Full database JSON export
│   ├── config.php                   # Store configuration management
│   ├── customer_returns.php         # Customer return processing
│   ├── deliveries.php               # Supplier restock deliveries
│   ├── export_inventory_xml.php     # Dynamic XML inventory export
│   ├── inventory.php                # Inventory adjustments & movement history
│   ├── products.php                 # Product CRUD & catalog filters
│   ├── reports.php                  # Financial analytics & summaries
│   ├── sales.php                    # Transactional POS checkout
│   ├── spoilages.php                # Spoilage tracking & loss evaluation
│   ├── supplier_returns.php         # Supplier returns (RTS)
│   ├── suppliers.php                # Supplier management & history
│   ├── sync_catalog_xml.php         # XML batch catalog import
│   └── users.php                    # User CRUD & password management
├── assets/                          # Frontend Assets
│   ├── css/
│   │   └── style.css                # Custom CSS3 theme & layout styles
│   └── js/
│       └── app.js                   # Client-side SPA routing, state, POS UI
├── config/                          # Configuration Files
│   ├── app_config.xml               # Application & database XML config
│   └── db.php                       # PDO connection singleton & helper utilities
├── database/                        # Database Definition & Seeds
│   ├── schema.sql                   # MySQL DDL (12 tables with constraints)
│   └── seed.php                     # Automated schema execution & seeder
├── uploads/                         # Uploaded product images
├── index.php                        # SPA Main Entry Point (HTML layout)
├── composer.json                    # Composer specifications (PHP 8.2 / ext-pdo)
└── README.md                        # Documentation
```

---

## Prerequisites

- **PHP 8.2 or higher**
  - Required PHP Extensions: `pdo`, `pdo_mysql`, `simplexml`, `dom`, `session`, `json`
- **MySQL 8.0+ or MariaDB 10.4+**
- **XAMPP / WAMP / Apache / Nginx** or PHP Built-in Web Server

---

## Installation & Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/regieorojr09-collab/https-github.com-regieorojr09-sunny-scramble-php-mysql-.git sunny-scramble
cd sunny-scramble
```

### 2. Configure Database Credentials
Edit `config/app_config.xml` to match your local MySQL settings (defaults are configured for XAMPP `root` with no password):
```xml
<database>
    <driver>mysql</driver>
    <host>localhost</host>
    <port>3306</port>
    <name>sunny_scramble</name>
    <user>root</user>
    <password></password>
    <charset>utf8mb4</charset>
</database>
```

### 3. Initialize & Seed Database
Ensure MySQL is running, then execute the seeder script from your terminal:
```bash
php database/seed.php
```
*This command automatically creates the `sunny_scramble` database, runs `database/schema.sql` to construct all 12 tables, and populates initial admin accounts, 20 products, suppliers, and store settings.*

### 4. Launch Application
You can run the application directly using PHP's built-in development server:
```bash
php -S localhost:8000
```
Or place the project directory inside `C:\xampp\htdocs\` and navigate to:
```
http://localhost:8000
```

---

## Live Cloud Deployment Guide

Sunny & Scramble is containerized with Docker and pre-configured with a **Render Blueprint (`render.yaml`)**, Apache rewrite rules (`.htaccess`), and remote migration utilities for zero-friction hosting on cloud platforms like **Render**, **Railway**, **Fly.io**, or any cloud VPS.

### 1. Cloud Database Setup (MySQL)
Before deploying the web application, provision a managed cloud MySQL database. Free and affordable recommendations include:
- **Aiven for MySQL** (Free tier available)
- **TiDB Serverless** (Free 25GB MySQL-compatible database)
- **Railway MySQL Plugin** (One-click provision within Railway project)
- **Clever Cloud / PlanetScale / Amazon RDS**

Note your database connection details:
- **Host**: e.g., `gateway01.ap-southeast-1.prod.aws.tidbcloud.com` or `containers-us-west-xx.railway.app`
- **Port**: e.g., `4000` (TiDB Serverless) or `3306` (standard MySQL)
- **Database Name**: e.g., `test` or `sunny_scramble`
- **Username & Password**
- *(Or a unified URI: `mysql://user:password@host:port/dbname`)*

> **Note on TiDB Cloud Serverless:** TiDB requires TLS/SSL encryption. The system automatically configures PDO SSL attributes (`PDO::MYSQL_ATTR_SSL_CA` and `PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false`) whenever connecting to remote hosts. Be sure to specify `DB_PORT=4000` (or the port assigned by TiDB).

---

### 2. Option A: Deploying on Render (Recommended)

Render can build the Docker container directly from your GitHub repository:

1. **Sign in to Render**: Go to [render.com](https://render.com/) and connect your GitHub account.
2. **Create New Web Service**:
   - Click **New +** &rarr; **Web Service**.
   - Select your repository: `https://github.com/regieorojr09-collab/https-github.com-regieorojr09-sunny-scramble-php-mysql-`.
   - **Environment**: Select `Docker`.
   - **Branch**: `main`.
3. **Configure Environment Variables**:
   In the **Environment Variables** section, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `DB_HOST` | `your-db-host.com` | Cloud MySQL host |
   | `DB_PORT` | `3306` | Cloud MySQL port |
   | `DB_NAME` | `sunny_scramble` | Database name |
   | `DB_USER` | `db_user` | Database username |
   | `DB_PASS` | `your_secret_password` | Database password |
   | `DEPLOY_TOKEN` | *Generate a random secret* | Secret key to run remote migration |
   | `APP_DEBUG` | `false` | Disable debug error dumps |
   *(Alternatively, provide just `DATABASE_URL=mysql://user:pass@host:port/dbname`)*
4. **Deploy**:
   - Click **Create Web Service**.
   - Render will build the Docker container (`php:8.2-apache`), install required PHP extensions, configure Apache, and deploy.

---

### 3. Option B: Deploying on Railway

1. **Sign in to Railway**: Go to [railway.app](https://railway.app/).
2. **Create Project**: Click **New Project** &rarr; **Deploy from GitHub repo**.
3. **Add MySQL Database**:
   - In the same project canvas, click **+ New** &rarr; **Database** &rarr; **MySQL**.
   - Railway will automatically provision MySQL and expose `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQL_URL`.
4. **Link Environment Variables**:
   - In the Web Service settings, link `DATABASE_URL` to `${{MySQL.MYSQL_URL}}`.
   - Add `DEPLOY_TOKEN=your_secure_random_key`.
5. Railway will automatically detect the `Dockerfile` and deploy the service.

---

### 4. Running the Remote Database Migration

Once your cloud service is live (e.g. `https://sunny-scramble.onrender.com`), run the database migration and seeder script using your secret `DEPLOY_TOKEN`:

In your terminal or browser, execute:
```bash
curl -X GET "https://sunny-scramble.onrender.com/database/deploy_migrate.php?token=YOUR_DEPLOY_TOKEN"
```
Or visit the URL directly in your browser:
```
https://sunny-scramble.onrender.com/database/deploy_migrate.php?token=YOUR_DEPLOY_TOKEN
```

**Expected Response (`HTTP 200 OK`):**
```json
{
  "status": "success",
  "timestamp": "2026-09-13T19:31:59+08:00",
  "tables_created_count": 12,
  "tables": [
    "users", "products", "suppliers", "sales", "sale_items",
    "deliveries", "spoilages", "inventory_transactions",
    "audit_logs", "store_config", "customer_returns", "supplier_returns"
  ],
  "seeding_status": "completed",
  "default_login": {
    "email": "admin@sunnyscramble.com",
    "password": "admin123"
  },
  "message": "Sunny & Scramble database migration and initialization completed successfully!"
}
```

---

### 5. Log in & Verify

Navigate to your root URL:
```
https://sunny-scramble.onrender.com/
```
Log in using:
- **Email**: `admin@sunnyscramble.com`
- **Password**: `admin123`

---

## Default User Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Superadmin** | `admin@sunnyscramble.com` | `admin123` | Full system access, users, settings, backup |
| **Staff** | `staff@sunnyscramble.com` | `staff123` | POS checkout, inventory view, deliveries, returns |

> **Security Note:** All passwords in the database are secured with strong cryptographic hashes using `PASSWORD_DEFAULT` (bcrypt).

---

## API Reference

All API responses adhere to standard HTTP status codes and JSON envelopes:

### Authentication
- `POST /api/auth.php?action=login` — User authentication
- `POST /api/auth.php?action=logout` — Terminate user session
- `GET  /api/auth.php?action=check` — Verify current session state

### Products & POS
- `GET    /api/products.php` — List products (supports `?category=`, `?search=`, `?status=`, `?id=`)
- `POST   /api/products.php` — Create product (Admin+)
- `PUT    /api/products.php?id={id}` — Update product details
- `DELETE /api/products.php?id={id}` — Archive product (soft delete)
- `POST   /api/sales.php` — Process transactional checkout

### Inventory & Stock Movements
- `GET  /api/inventory.php?productId={id}` — Retrieve movement ledger with running balance
- `POST /api/inventory.php` — Record manual stock adjustment (`stock-in` / `stock-out`)
- `GET  /api/deliveries.php` — List supplier deliveries
- `POST /api/deliveries.php` — Record supplier restock (increments stock & updates unit cost)
- `GET  /api/spoilages.php` — List spoilages & adjustments
- `POST /api/spoilages.php` — Record spoilage & compute financial loss

### Administration & XML
- `GET /api/reports.php?action=summary&period={today|week|month|all-time}` — Dashboard KPI metrics
- `GET /api/reports.php?action=income-statement` — Income statement by date range
- `GET /api/backup.php` — Export full JSON backup
- `GET /api/export_inventory_xml.php` — Export XML inventory
- `POST /api/sync_catalog_xml.php` — Import XML catalog file

---

## XML Integration

Sunny & Scramble provides built-in XML tools for cross-platform ERP integration:

### Exporting XML Inventory
Navigate to **Settings &rarr; XML Tools** or access:
- **Download**: `/api/export_inventory_xml.php?mode=download`
- **Server Save**: `/api/export_inventory_xml.php?mode=save` (Saves directly to `data/inventory.xml`)

### XML Format Specification
```xml
<?xml version="1.0" encoding="UTF-8"?>
<inventory>
  <meta>
    <exportDate>2026-09-13T18:46:32+08:00</exportDate>
    <system>Sunny &amp; Scramble POS</system>
    <version>2.0.0</version>
    <store>
      <name>Sunny &amp; Scramble</name>
      <branch>Malanday, San Mateo, Rizal</branch>
      <currency>PHP</currency>
    </store>
  </meta>
  <products count="20">
    <product id="1">
      <name>Breast Choice cuts 2pcs (approx. 480g)</name>
      <category>Chicken</category>
      <unitCost>82.00</unitCost>
      <sellingPrice>101.00</sellingPrice>
      <quantity>22</quantity>
      <maxCapacity>100</maxCapacity>
      <status>active</status>
      <expirationDate>2026-10-13</expirationDate>
    </product>
  </products>
</inventory>
```

---

## Security & Best Practices

1. **SQL Injection Prevention**: All SQL statements use parameterized prepared queries through PDO.
2. **Race Condition Prevention**: Stock decreases during sales execution utilize `SELECT ... FOR UPDATE` inside strict database transactions.
3. **Cross-Site Scripting (XSS)**: All dynamically generated HTML and XML nodes are sanitized via `htmlspecialchars()` and entity encoding.
4. **Session Protection**: HttpOnly cookie flags and session expiration safeguards are enforced across all authenticated requests.

---

## Contributing & License

Contributions, issue reports, and feature requests are welcome!
Distributed under the **MIT License**. See `LICENSE` for more information.

Developed with care by the **Sunny & Scramble Dev Team**.
