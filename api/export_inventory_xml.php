<?php
/**
 * Sunny & Scramble — XML Inventory Export (MySQL / PDO)
 * 
 * GET ?mode=download   — Download as XML file
 * GET ?mode=save       — Save to data/inventory.xml
 * GET                  — Return inline XML
 * 
 * Uses PHP DOMDocument for XML generation.
 */

require_once __DIR__ . '/../config/db.php';

if (getRequestMethod() !== 'GET') {
    jsonResponse(['message' => 'Method not allowed'], 405);
}

requireLogin();

$mode = $_GET['mode'] ?? 'inline';
$pdo = getDB();

// Build XML using DOMDocument
$dom = new DOMDocument('1.0', 'UTF-8');
$dom->formatOutput = true;

$root = $dom->createElement('inventory');
$dom->appendChild($root);

// Meta section
$meta = $dom->createElement('meta');
$root->appendChild($meta);

$meta->appendChild($dom->createElement('exportDate', date('c')));
$meta->appendChild($dom->createElement('system', htmlspecialchars('Sunny & Scramble POS')));
$meta->appendChild($dom->createElement('version', '2.0.0'));

// Store config
$cfgStmt = $pdo->query("SELECT * FROM store_config ORDER BY id ASC LIMIT 1");
$configDoc = $cfgStmt->fetch();
if ($configDoc) {
    $store = $dom->createElement('store');
    $meta->appendChild($store);
    $store->appendChild($dom->createElement('name', htmlspecialchars($configDoc['storeName'] ?? 'Sunny & Scramble')));
    $store->appendChild($dom->createElement('branch', htmlspecialchars($configDoc['branchName'] ?? '')));
    $store->appendChild($dom->createElement('currency', $configDoc['currency'] ?? 'PHP'));
}

// Products section
$productsEl = $dom->createElement('products');
$root->appendChild($productsEl);

$stmt = $pdo->query("SELECT * FROM products ORDER BY category ASC, productName ASC");
$products = $stmt->fetchAll();
$count = 0;

foreach ($products as $product) {
    $productEl = $dom->createElement('product');
    $productsEl->appendChild($productEl);

    $productEl->setAttribute('id', (string)$product['id']);

    $productEl->appendChild($dom->createElement('name', htmlspecialchars($product['productName'] ?? '')));
    $productEl->appendChild($dom->createElement('category', htmlspecialchars($product['category'] ?? '')));
    $productEl->appendChild($dom->createElement('unitCost', number_format((float)($product['unitCost'] ?? 0), 2, '.', '')));
    $productEl->appendChild($dom->createElement('sellingPrice', number_format((float)($product['sellingPrice'] ?? 0), 2, '.', '')));
    $productEl->appendChild($dom->createElement('quantity', (string)(int)($product['quantity'] ?? 0)));
    $productEl->appendChild($dom->createElement('maxCapacity', (string)(int)($product['maxCapacity'] ?? 100)));
    $productEl->appendChild($dom->createElement('status', $product['status'] ?? 'active'));

    if (!empty($product['expirationDate'])) {
        $productEl->appendChild($dom->createElement('expirationDate', substr($product['expirationDate'], 0, 10)));
    }

    $count++;
}

$productsEl->setAttribute('count', (string)$count);

$xml = $dom->saveXML();

$user = getSessionUser();
auditLog($user['id'] ?? null, "Exported inventory XML ({$count} products, mode: {$mode})", 'XML');

// Handle mode
switch ($mode) {
    case 'download':
        header('Content-Type: application/xml; charset=utf-8');
        header('Content-Disposition: attachment; filename="inventory_' . date('Y-m-d') . '.xml"');
        echo $xml;
        break;

    case 'save':
        $dataDir = __DIR__ . '/../data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }
        $filePath = $dataDir . '/inventory.xml';
        file_put_contents($filePath, $xml);
        jsonResponse(['message' => 'Inventory XML saved successfully', 'file' => 'data/inventory.xml', 'products' => $count]);
        break;

    default:
        header('Content-Type: application/xml; charset=utf-8');
        echo $xml;
        break;
}
