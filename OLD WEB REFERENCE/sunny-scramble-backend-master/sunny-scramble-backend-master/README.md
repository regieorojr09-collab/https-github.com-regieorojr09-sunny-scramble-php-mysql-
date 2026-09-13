# Sunny Scramble Backend 🍳

Welcome to the backend repository for **Sunny Scramble**, a comprehensive inventory and sales management system. This API powers the Sunny Scramble application, providing robust endpoints for managing products, tracking inventory, processing sales, handling expenses, generating reports, and managing users and deliveries.

## 🚀 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) & [Mongoose](https://mongoosejs.com/)
- **Authentication**: JWT (JSON Web Tokens) & bcryptjs
- **Security**: Helmet, CORS, Express Rate Limit
- **Validation**: Zod

## 📦 Key Features

- **Authentication & Authorization**: Secure login and role-based access control.
- **Product Management**: CRUD operations for the product catalog.
- **Inventory Tracking**: Real-time stock updates and inventory management.
- **Sales & Expenses**: Track daily sales transactions and operational expenses.
- **Reporting**: Generate comprehensive business reports.
- **Deliveries & Logistics**: Manage order deliveries and dispatching.
- **User Management**: Manage employee accounts and permissions.
- **Audit Logging**: Track system activities and changes for security and compliance.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB Atlas (or local MongoDB instance)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd sunny-scramble-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add the necessary configurations:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret_key
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The server will start running on `http://localhost:5000` (or your configured PORT).

## 📄 API Endpoints

- `POST /api/auth/*` - Authentication routes (login, register)
- `GET /api/products/*` - Product catalog routes
- `GET /api/inventory/*` - Inventory management
- `POST /api/sales/*` - Sales transactions
- `GET /api/expenses/*` - Expense tracking
- `GET /api/reports/*` - Analytics and reporting
- `GET /api/deliveries/*` - Delivery management
- `GET /api/users/*` - User management
- `GET /api/audit-logs/*` - System audit logs

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is licensed under the ISC License...
