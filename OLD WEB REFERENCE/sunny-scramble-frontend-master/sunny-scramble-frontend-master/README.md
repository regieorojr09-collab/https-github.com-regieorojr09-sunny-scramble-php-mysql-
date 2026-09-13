# Sunny Scramble Frontend 🍳

Welcome to the frontend repository for **Sunny Scramble**, a comprehensive and modern inventory and sales management system. This application provides a seamless and intuitive user interface for managing products, tracking inventory, processing sales, handling expenses, and generating business reports.

## 🚀 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Routing**: React Router DOM
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [Material UI (MUI)](https://mui.com/)
- **API Client**: Axios
- **State Management**: React Context & Hooks

## 📦 Key Features

- **Responsive Dashboard**: A beautiful, modern interface for a quick overview of business metrics.
- **Sales Management**: Easily record and manage daily sales transactions.
- **Inventory Control**: Intuitive UI for tracking stock levels and updating inventory.
- **Expense Tracking**: Log and monitor business expenses efficiently.
- **Product Catalog**: Manage product listings with ease.
- **Reporting & Analytics**: Visual insights and data reporting.
- **Role-based Access**: Secure areas of the application based on user roles and permissions.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd sunny-scramble-frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory if you need to point to a specific backend URL:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

### Build for Production

To create a production build, run:
```bash
npm run build
```
The optimized production files will be generated in the `dist` directory.

## 🚀 Deployment

This project includes configuration for seamless deployment on platforms like Vercel. A `vercel.json` file is included to handle React Router's client-side routing.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

This project is proprietary..
