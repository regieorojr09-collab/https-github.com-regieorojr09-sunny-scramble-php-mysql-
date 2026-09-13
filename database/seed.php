<?php
/**
 * Sunny & Scramble — MySQL Database Seed Script
 * 
 * Usage: php database/seed.php
 * 
 * 1. Executes database/schema.sql to drop & create all 12 tables.
 * 2. Seeds users (superadmin + staff).
 * 3. Seeds 20 products (Chicken + Egg).
 * 4. Seeds sample suppliers.
 * 5. Seeds store configuration.
 */

require_once __DIR__ . '/../config/db.php';

echo "========================================\n";
echo "  Sunny & Scramble — MySQL Database Seed\n";
echo "========================================\n\n";

try {
    $pdo = getDB();
    echo "Connected to MySQL successfully.\n\n";
} catch (Exception $e) {
    echo "ERROR: Could not connect to MySQL: " . $e->getMessage() . "\n";
    exit(1);
}

// ─── 1. Execute schema.sql ─────────────────────────────────────────
echo "Executing database/schema.sql...\n";
$schemaFile = __DIR__ . '/schema.sql';
if (!file_exists($schemaFile)) {
    echo "ERROR: schema.sql not found at {$schemaFile}\n";
    exit(1);
}

$sql = file_get_contents($schemaFile);
try {
    $pdo->exec($sql);
    echo "  Successfully initialized all 12 relational tables.\n\n";
} catch (PDOException $e) {
    echo "ERROR: Failed to execute schema.sql: " . $e->getMessage() . "\n";
    exit(1);
}

// ─── 2. Seed Users ────────────────────────────────────────────────
echo "Seeding users...\n";
$adminPass = password_hash('admin123', PASSWORD_DEFAULT);
$staffPass = password_hash('staff123', PASSWORD_DEFAULT);

$userStmt = $pdo->prepare("
    INSERT INTO users (fullName, email, role, passwordHash, mustChangePassword, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
");

$userStmt->execute(['Super Administrator', 'admin@sunnyscramble.com', 'superadmin', $adminPass, 0, 'active']);
$adminId = $pdo->lastInsertId();

$userStmt->execute(['Staff User', 'staff@sunnyscramble.com', 'staff', $staffPass, 0, 'active']);
$staffId = $pdo->lastInsertId();

echo "  + superadmin: admin@sunnyscramble.com / admin123 (ID: {$adminId})\n";
echo "  + staff:      staff@sunnyscramble.com / staff123 (ID: {$staffId})\n\n";

// ─── 3. Seed Products ─────────────────────────────────────────────
echo "Seeding products...\n";
$expDate = date('Y-m-d', strtotime('+30 days'));

$productData = [
    // Chicken Items
    ['productName' => 'Breast Choice cuts 2pcs (approx. 480g)', 'category' => 'Chicken', 'sellingPrice' => 101.00, 'unitCost' => 80.00, 'quantity' => 20],
    ['productName' => 'Thigh Choice cuts 4pcs (approx. 720g)', 'category' => 'Chicken', 'sellingPrice' => 152.00, 'unitCost' => 120.00, 'quantity' => 20],
    ['productName' => 'Chicken Inasal 2 x 250g', 'category' => 'Chicken', 'sellingPrice' => 167.00, 'unitCost' => 130.00, 'quantity' => 20],
    ['productName' => 'Drumstick Choice cuts 6pcs (approx. 540g)', 'category' => 'Chicken', 'sellingPrice' => 114.00, 'unitCost' => 90.00, 'quantity' => 20],
    ['productName' => 'Fresh Whole Chicken (Approx 1.29kg)', 'category' => 'Chicken', 'sellingPrice' => 242.00, 'unitCost' => 190.00, 'quantity' => 20],
    ['productName' => 'Chicken Adobo Flakes 300g', 'category' => 'Chicken', 'sellingPrice' => 178.00, 'unitCost' => 140.00, 'quantity' => 20],
    ['productName' => 'Chicken Hamonado Longganisa 300g', 'category' => 'Chicken', 'sellingPrice' => 201.00, 'unitCost' => 160.00, 'quantity' => 20],
    ['productName' => 'Chicken Embutido 300g', 'category' => 'Chicken', 'sellingPrice' => 224.00, 'unitCost' => 180.00, 'quantity' => 20],
    ['productName' => 'Wings Choice cuts 5pcs (approx. 630g)', 'category' => 'Chicken', 'sellingPrice' => 133.00, 'unitCost' => 100.00, 'quantity' => 20],
    ['productName' => 'Chicken Vigan Longganisa 300g', 'category' => 'Chicken', 'sellingPrice' => 224.00, 'unitCost' => 180.00, 'quantity' => 20],
    ['productName' => 'Spicy Chicken Wings 500g', 'category' => 'Chicken', 'sellingPrice' => 145.00, 'unitCost' => 110.00, 'quantity' => 20],
    ['productName' => 'Garlic Marinated Chicken 440g', 'category' => 'Chicken', 'sellingPrice' => 135.00, 'unitCost' => 100.00, 'quantity' => 20],
    ['productName' => 'Fresh Spring Chicken (Approx 900g)', 'category' => 'Chicken', 'sellingPrice' => 169.00, 'unitCost' => 130.00, 'quantity' => 20],
    ['productName' => 'Chicken Barbecue Cut-ups 600g', 'category' => 'Chicken', 'sellingPrice' => 172.00, 'unitCost' => 140.00, 'quantity' => 20],
    ['productName' => 'Chicken Tocino 350g', 'category' => 'Chicken', 'sellingPrice' => 167.00, 'unitCost' => 130.00, 'quantity' => 20],
    ['productName' => 'Whole Chicken Twin Pack (Approx 1.3kg)', 'category' => 'Chicken', 'sellingPrice' => 282.00, 'unitCost' => 230.00, 'quantity' => 20],

    // Egg Items
    ['productName' => 'White Eggs - Small (12s)', 'category' => 'Egg', 'sellingPrice' => 115.00, 'unitCost' => 90.00, 'quantity' => 30],
    ['productName' => 'White Eggs - Medium (12s)', 'category' => 'Egg', 'sellingPrice' => 120.00, 'unitCost' => 95.00, 'quantity' => 30],
    ['productName' => 'White Eggs - Large (12s)', 'category' => 'Egg', 'sellingPrice' => 126.00, 'unitCost' => 100.00, 'quantity' => 30],
    ['productName' => 'White Eggs - XL (12s)', 'category' => 'Egg', 'sellingPrice' => 132.00, 'unitCost' => 105.00, 'quantity' => 30],
];

$prodStmt = $pdo->prepare("
    INSERT INTO products (productName, category, quantity, unitCost, sellingPrice, expirationDate, maxCapacity, imageUrl, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, '', 'active', NOW(), NOW())
");

foreach ($productData as $p) {
    $prodStmt->execute([
        $p['productName'],
        $p['category'],
        $p['quantity'],
        $p['unitCost'],
        $p['sellingPrice'],
        $expDate,
        100
    ]);
    echo "  + {$p['productName']}\n";
}
echo "  Seeded " . count($productData) . " products.\n\n";

// ─── 4. Seed Suppliers ───────────────────────────────────────────
echo "Seeding suppliers...\n";
$supStmt = $pdo->prepare("
    INSERT INTO suppliers (supplierName, contact, address, contactPerson, email, paymentTerms, status, notes, createdBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, 'active', '', ?, NOW(), NOW())
");

$supplierData = [
    [
        'supplierName' => 'Metro Fresh Poultry',
        'contact' => '09171234567',
        'address' => 'Marikina City',
        'contactPerson' => 'Juan Cruz',
        'email' => 'metro@freshpoultry.com',
        'paymentTerms' => 'COD',
    ],
    [
        'supplierName' => 'Farm Direct Eggs Co.',
        'contact' => '09289876543',
        'address' => 'Bulacan',
        'contactPerson' => 'Maria Santos',
        'email' => 'info@farmdirecteggs.com',
        'paymentTerms' => 'Net 15',
    ],
];

foreach ($supplierData as $s) {
    $supStmt->execute([
        $s['supplierName'],
        $s['contact'],
        $s['address'],
        $s['contactPerson'],
        $s['email'],
        $s['paymentTerms'],
        $adminId
    ]);
    echo "  + {$s['supplierName']}\n";
}
echo "\n";

// ─── 5. Seed Store Configuration ────────────────────────────────
echo "Seeding store configuration...\n";
$cfgStmt = $pdo->prepare("
    INSERT INTO store_config (storeName, storeAddress, storeContact, branchName, taxRate, taxRegistrationNumber, receiptFooter, lowStockThreshold, currency, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
");

$cfgStmt->execute([
    'Sunny & Scramble',
    'Malanday, San Mateo, Rizal',
    '09XX-XXX-XXXX',
    'Malanday, San Mateo, Rizal',
    0.00,
    '',
    'Thank you for your purchase!',
    20.00,
    'PHP'
]);
echo "  Store configuration initialized.\n\n";

// ─── Completion ─────────────────────────────────────────────────
echo "========================================\n";
echo "  Database initialization & seed complete!\n";
echo "========================================\n";
echo "  Database: sunny_scramble (MySQL)\n";
echo "  Login:    admin@sunnyscramble.com\n";
echo "  Password: admin123\n";
echo "========================================\n";
