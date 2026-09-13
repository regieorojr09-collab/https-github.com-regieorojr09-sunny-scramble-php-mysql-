-- ===============================================================
-- Sunny & Scramble — Relational Database Schema (MySQL / MariaDB)
-- Character Set: utf8mb4, Engine: InnoDB
-- ===============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `sale_items`;
DROP TABLE IF EXISTS `sales`;
DROP TABLE IF EXISTS `inventory_transactions`;
DROP TABLE IF EXISTS `spoilages`;
DROP TABLE IF EXISTS `deliveries`;
DROP TABLE IF EXISTS `customer_returns`;
DROP TABLE IF EXISTS `supplier_returns`;
DROP TABLE IF EXISTS `suppliers`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `store_config`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. Users
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `fullName` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `role` ENUM('superadmin', 'owner', 'admin', 'staff') NOT NULL DEFAULT 'staff',
    `passwordHash` VARCHAR(255) NOT NULL,
    `mustChangePassword` TINYINT(1) NOT NULL DEFAULT 0,
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_users_email` (`email`),
    INDEX `idx_users_role` (`role`),
    INDEX `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Products
CREATE TABLE `products` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `productName` VARCHAR(255) NOT NULL,
    `category` VARCHAR(100) NOT NULL,
    `quantity` INT NOT NULL DEFAULT 0,
    `unitCost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `sellingPrice` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `expirationDate` DATE NULL,
    `maxCapacity` INT NOT NULL DEFAULT 100,
    `imageUrl` TEXT NULL,
    `status` ENUM('active', 'archived') NOT NULL DEFAULT 'active',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_products_category` (`category`),
    INDEX `idx_products_status` (`status`),
    INDEX `idx_products_name` (`productName`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Suppliers
CREATE TABLE `suppliers` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `supplierName` VARCHAR(200) NOT NULL,
    `contact` VARCHAR(100) NOT NULL,
    `address` TEXT NULL,
    `contactPerson` VARCHAR(150) NULL,
    `email` VARCHAR(150) NULL,
    `paymentTerms` VARCHAR(50) NOT NULL DEFAULT 'COD',
    `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `createdBy` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_suppliers_status` (`status`),
    INDEX `idx_suppliers_name` (`supplierName`),
    CONSTRAINT `fk_suppliers_created_by` FOREIGN KEY (`createdBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Sales
CREATE TABLE `sales` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `subtotalAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `taxAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `totalAmount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `customerId` VARCHAR(100) NOT NULL DEFAULT 'Walk-in',
    `recordedBy` INT NULL,
    `saleDate` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sales_date` (`saleDate`),
    INDEX `idx_sales_created` (`createdAt`),
    CONSTRAINT `fk_sales_recorded_by` FOREIGN KEY (`recordedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Sale Items
CREATE TABLE `sale_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `saleId` INT NOT NULL,
    `productId` INT NOT NULL,
    `quantity` INT NOT NULL DEFAULT 1,
    `price` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_sale_items_sale` (`saleId`),
    INDEX `idx_sale_items_product` (`productId`),
    CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Deliveries (Restock)
CREATE TABLE `deliveries` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `productId` INT NOT NULL,
    `supplierId` INT NOT NULL,
    `referenceNo` VARCHAR(100) NULL,
    `quantity` INT NOT NULL,
    `unitCost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `totalCost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_deliveries_created` (`createdAt`),
    CONSTRAINT `fk_deliveries_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_deliveries_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Spoilages
CREATE TABLE `spoilages` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `productId` INT NOT NULL,
    `quantity` INT NOT NULL,
    `reason` VARCHAR(100) NOT NULL,
    `cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `reportedBy` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_spoilages_created` (`createdAt`),
    CONSTRAINT `fk_spoilages_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_spoilages_reported_by` FOREIGN KEY (`reportedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Inventory Transactions (Adjustments & Movements)
CREATE TABLE `inventory_transactions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `productId` INT NOT NULL,
    `type` ENUM('stock-in', 'stock-out') NOT NULL,
    `quantity` INT NOT NULL,
    `reason` VARCHAR(255) NULL,
    `recordedBy` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_inv_trans_product` (`productId`),
    INDEX `idx_inv_trans_created` (`createdAt`),
    CONSTRAINT `fk_inv_trans_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_inv_trans_recorded_by` FOREIGN KEY (`recordedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Audit Logs
CREATE TABLE `audit_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `userId` INT NULL,
    `action` TEXT NOT NULL,
    `module` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_audit_logs_created` (`createdAt`),
    INDEX `idx_audit_logs_module` (`module`),
    CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Store Configuration
CREATE TABLE `store_config` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `storeName` VARCHAR(200) NOT NULL DEFAULT 'Sunny & Scramble',
    `storeAddress` TEXT NULL,
    `storeContact` VARCHAR(100) NULL,
    `branchName` VARCHAR(200) NULL DEFAULT 'Malanday, San Mateo, Rizal',
    `taxRate` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `taxRegistrationNumber` VARCHAR(100) NULL,
    `receiptFooter` TEXT NULL,
    `lowStockThreshold` DECIMAL(5,2) NOT NULL DEFAULT 20.00,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'PHP',
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Customer Returns
CREATE TABLE `customer_returns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `customerId` VARCHAR(100) NOT NULL DEFAULT 'Walk-in',
    `productId` INT NOT NULL,
    `quantity` INT NOT NULL,
    `reason` VARCHAR(150) NOT NULL,
    `action` VARCHAR(100) NOT NULL DEFAULT 'Refunded',
    `amountRefunded` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `processedBy` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_cust_returns_created` (`createdAt`),
    CONSTRAINT `fk_cust_returns_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_cust_returns_processed_by` FOREIGN KEY (`processedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Supplier Returns (Return to Supplier / RTS)
CREATE TABLE `supplier_returns` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `supplierId` INT NOT NULL,
    `productId` INT NOT NULL,
    `quantity` INT NOT NULL,
    `reason` VARCHAR(150) NOT NULL,
    `action` VARCHAR(100) NOT NULL DEFAULT 'Pending',
    `amountRefunded` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `notes` TEXT NULL,
    `processedBy` INT NULL,
    `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX `idx_supp_returns_created` (`createdAt`),
    CONSTRAINT `fk_supp_returns_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_supp_returns_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_supp_returns_processed_by` FOREIGN KEY (`processedBy`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
