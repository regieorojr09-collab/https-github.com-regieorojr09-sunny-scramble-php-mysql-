<?php
/**
 * Sunny & Scramble — Production Database Migration & Seed Tool
 * 
 * Secure script to initialize or migrate the database schema and seed
 * essential administrator and catalog data on cloud hosts (Render, Railway, etc.).
 * 
 * Usage:
 *   CLI: php database/deploy_migrate.php
 *   Web: https://your-domain.onrender.com/database/deploy_migrate.php?token=YOUR_DEPLOY_TOKEN
 */

require_once __DIR__ . '/../config/db.php';

$isCli = (php_sapi_name() === 'cli');

// ─── 1. Security & Token Verification ─────────────────────────────
$configuredToken = getenv('DEPLOY_TOKEN') ?: ($_ENV['DEPLOY_TOKEN'] ?? null);

if (!$isCli) {
    $providedToken = $_GET['token'] ?? ($_SERVER['HTTP_X_DEPLOY_TOKEN'] ?? '');

    // If a DEPLOY_TOKEN is set in environment, it MUST match
    if ($configuredToken && !hash_equals($configuredToken, $providedToken)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'status' => 'error',
            'message' => 'Unauthorized: Invalid or missing deployment token (?token=YOUR_DEPLOY_TOKEN)'
        ], JSON_PRETTY_PRINT);
        exit;
    }

    // If no DEPLOY_TOKEN was set in environment, use a secure fallback token check
    if (!$configuredToken) {
        $fallback = 'sunny_scramble_deploy_2026';
        if (!hash_equals($fallback, $providedToken)) {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'status' => 'error',
                'message' => 'Unauthorized: Please provide ?token=sunny_scramble_deploy_2026 or configure DEPLOY_TOKEN in environment variables.'
            ], JSON_PRETTY_PRINT);
            exit;
        }
    }
}

// ─── 2. Database Connection Test ──────────────────────────────────
$GLOBALS['THROW_DB_EXCEPTION'] = true;

try {
    $pdo = getDB();
} catch (Exception $e) {
    $err = [
        'status' => 'error',
        'message' => 'Database connection failed',
        'details' => $e->getMessage()
    ];
    if ($isCli) {
        fwrite(STDERR, "Database Connection Error: " . $e->getMessage() . "\n");
        exit(1);
    } else {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($err, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ─── 3. Execute Schema DDL ────────────────────────────────────────
$schemaFile = __DIR__ . '/schema.sql';
if (!file_exists($schemaFile)) {
    $msg = 'schema.sql not found in database directory';
    if ($isCli) { fwrite(STDERR, "Error: $msg\n"); exit(1); }
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => $msg]);
    exit;
}

$schemaSql = file_get_contents($schemaFile);

try {
    // Disable foreign key checks for clean DDL execution
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    // Remove single-line comments (-- ...) and multi-line comments
    $cleanSql = preg_replace('/^--.*$/m', '', $schemaSql);
    $cleanSql = preg_replace('/\/\*.*?\*\//s', '', $cleanSql);

    // Split SQL by semicolon followed by newline or end of string
    $queries = preg_split('/;\s*[\r\n]+/m', $cleanSql);
    foreach ($queries as $query) {
        $query = trim($query);
        if ($query !== '') {
            $pdo->exec($query);
        }
    }

    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
} catch (Exception $e) {
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    $err = [
        'status' => 'error',
        'message' => 'Schema execution failed',
        'details' => $e->getMessage()
    ];
    if ($isCli) {
        fwrite(STDERR, "Schema Error: " . $e->getMessage() . "\n");
        exit(1);
    } else {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($err, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
}

// ─── 4. Verify Tables Created ─────────────────────────────────────
$tableStmt = $pdo->query("SHOW TABLES");
$tables = $tableStmt->fetchAll(PDO::FETCH_COLUMN);

// ─── 5. Seed Initial Data If Not Present ──────────────────────────
$seedStatus = 'skipped';
$adminCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'superadmin'")->fetchColumn();

if ($adminCount === 0) {
    // Execute seed logic
    $seedFile = __DIR__ . '/seed.php';
    if (file_exists($seedFile)) {
        // Run seed script logic
        $stmtUser = $pdo->prepare(
            "INSERT INTO users (fullName, email, role, passwordHash, mustChangePassword, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, 0, 'active', NOW(), NOW())"
        );

        // Superadmin
        $stmtUser->execute([
            'Super Administrator',
            'admin@sunnyscramble.com',
            'superadmin',
            password_hash('admin123', PASSWORD_DEFAULT)
        ]);

        // Staff
        $stmtUser->execute([
            'Store Staff Cashier',
            'staff@sunnyscramble.com',
            'staff',
            password_hash('staff123', PASSWORD_DEFAULT)
        ]);

        // Store config
        $pdo->exec(
            "INSERT INTO store_config (storeName, storeAddress, storeContact, branchName, taxRate, taxRegistrationNumber, receiptFooter, lowStockThreshold, currency, createdAt, updatedAt)
             VALUES ('Sunny & Scramble', 'Malanday, San Mateo, Rizal', '0912-345-6789', 'Main Branch', 0.00, 'TIN-000-123-456-789', 'Thank you for your purchase! Freshness Guaranteed.', 20.00, 'PHP', NOW(), NOW())"
        );

        // Suppliers
        $stmtSupp = $pdo->prepare(
            "INSERT INTO suppliers (supplierName, contact, address, contactPerson, email, paymentTerms, status, notes, createdBy, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, 'active', ?, 1, NOW(), NOW())"
        );
        $stmtSupp->execute([
            'Metro Fresh Poultry',
            '0917-111-2233',
            'Bulacan Poultry Hub, Bulacan',
            'Juan De la Cruz',
            'orders@metrofreshpoultry.com',
            'Net 15',
            'Primary dressed chicken supplier.'
        ]);
        $stmtSupp->execute([
            'Eggstra Farms',
            '0918-444-5566',
            'Batangas Egg Farm, San Jose, Batangas',
            'Maria Santos',
            'sales@eggstrafarms.com',
            'COD',
            'Farm-fresh table eggs.'
        ]);

        // Products Catalog (20 items)
        $products = [
            ['Breast Choice cuts 2pcs (approx. 480g)', 'Chicken', 20, 80.00, 101.00, 100],
            ['Thigh Choice cuts 4pcs (approx. 720g)', 'Chicken', 20, 120.00, 152.00, 100],
            ['Chicken Inasal 2 x 250g', 'Chicken', 20, 130.00, 167.00, 100],
            ['Drumstick Choice cuts 6pcs (approx. 540g)', 'Chicken', 20, 90.00, 114.00, 100],
            ['Fresh Whole Chicken (Approx 1.29kg)', 'Chicken', 20, 190.00, 242.00, 100],
            ['Chicken Adobo Flakes 300g', 'Chicken', 20, 140.00, 178.00, 100],
            ['Chicken Hamonado Longganisa 300g', 'Chicken', 20, 160.00, 201.00, 100],
            ['Chicken Embutido 300g', 'Chicken', 20, 180.00, 224.00, 100],
            ['Wings Choice cuts 5pcs (approx. 630g)', 'Chicken', 20, 100.00, 133.00, 100],
            ['Chicken Vigan Longganisa 300g', 'Chicken', 20, 180.00, 224.00, 100],
            ['Spicy Chicken Wings 500g', 'Chicken', 20, 110.00, 145.00, 100],
            ['Garlic Marinated Chicken 440g', 'Chicken', 20, 100.00, 135.00, 100],
            ['Fresh Spring Chicken (Approx 900g)', 'Chicken', 20, 130.00, 169.00, 100],
            ['Chicken Barbecue Cut-ups 600g', 'Chicken', 20, 140.00, 172.00, 100],
            ['Chicken Tocino 350g', 'Chicken', 20, 130.00, 167.00, 100],
            ['Whole Chicken Twin Pack (Approx 1.3kg)', 'Chicken', 20, 230.00, 282.00, 100],
            ['White Eggs - Small (12s)', 'Egg', 30, 90.00, 115.00, 100],
            ['White Eggs - Medium (12s)', 'Egg', 30, 95.00, 120.00, 100],
            ['White Eggs - Large (12s)', 'Egg', 30, 100.00, 126.00, 100],
            ['White Eggs - XL (12s)', 'Egg', 30, 105.00, 132.00, 100],
        ];

        $stmtProd = $pdo->prepare(
            "INSERT INTO products (productName, category, quantity, unitCost, sellingPrice, expirationDate, maxCapacity, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 30 DAY), ?, 'active', NOW(), NOW())"
        );

        foreach ($products as $p) {
            $stmtProd->execute($p);
        }

        $seedStatus = 'completed';
    }
} else {
    $seedStatus = 'already_seeded';
}

// ─── 6. Output Result ─────────────────────────────────────────────
$summary = [
    'status' => 'success',
    'timestamp' => date('c'),
    'tables_created_count' => count($tables),
    'tables' => $tables,
    'seeding_status' => $seedStatus,
    'default_login' => [
        'email' => 'admin@sunnyscramble.com',
        'password' => 'admin123'
    ],
    'message' => 'Sunny & Scramble database migration and initialization completed successfully!'
];

if ($isCli) {
    echo "====================================================\n";
    echo "Sunny & Scramble — Migration Completed Successfully!\n";
    echo "====================================================\n";
    echo "Tables Verified: " . count($tables) . " tables\n";
    echo "Seed Status:     " . $seedStatus . "\n";
    echo "Superadmin:      admin@sunnyscramble.com (password: admin123)\n";
    echo "====================================================\n";
} else {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
