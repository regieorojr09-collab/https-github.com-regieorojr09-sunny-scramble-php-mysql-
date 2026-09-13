<?php
/**
 * Sunny & Scramble — Sales API (MySQL / PDO)
 * 
 * GET  — List all sales with sale_items and product name lookups
 * POST — Record a new sale (transactional stock check, deduction, inventory log)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetSales();
        break;
    case 'POST':
        requireLogin();
        handleRecordSale();
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetSales(): void {
    $db = getDB();
    $stmt = $db->query("
        SELECT s.*, u.fullName AS recordedByName 
        FROM sales s
        LEFT JOIN users u ON s.recordedBy = u.id
        ORDER BY s.saleDate DESC
    ");
    $sales = $stmt->fetchAll();

    if (empty($sales)) {
        jsonResponse([]);
    }

    $saleIds = array_column($sales, 'id');
    $placeholders = implode(',', array_fill(0, count($saleIds), '?'));

    $itemStmt = $db->prepare("
        SELECT si.*, p.productName 
        FROM sale_items si
        LEFT JOIN products p ON si.productId = p.id
        WHERE si.saleId IN ($placeholders)
        ORDER BY si.id ASC
    ");
    $itemStmt->execute($saleIds);
    $items = $itemStmt->fetchAll();

    $itemsBySale = [];
    foreach ($items as $item) {
        $sid = $item['saleId'];
        if (!isset($itemsBySale[$sid])) $itemsBySale[$sid] = [];
        $itemsBySale[$sid][] = [
            'id' => (int)$item['id'],
            '_id' => (string)$item['id'],
            'productId' => (string)$item['productId'],
            'productName' => $item['productName'] ?? 'Unknown',
            'quantity' => (int)$item['quantity'],
            'price' => (float)$item['price']
        ];
    }

    $result = [];
    foreach ($sales as $sale) {
        $formatted = formatRow($sale);
        $formatted['items'] = $itemsBySale[$sale['id']] ?? [];
        $result[] = $formatted;
    }

    jsonResponse($result);
}

function handleRecordSale(): void {
    $data = getRequestBody();
    $user = getSessionUser();

    if (empty($data['items']) || !is_array($data['items'])) {
        jsonResponse(['message' => 'Items are required'], 400);
    }

    $db = getDB();

    try {
        $db->beginTransaction();

        // 1. Pre-check & lock stock for all items
        $lockStmt = $db->prepare("SELECT id, productName, quantity FROM products WHERE id = ? FOR UPDATE");
        $productsById = [];

        foreach ($data['items'] as $item) {
            $prodId = (int)($item['productId'] ?? 0);
            if (!$prodId) {
                $db->rollBack();
                jsonResponse(['message' => "Invalid product ID: " . ($item['productId'] ?? '')], 400);
            }

            $lockStmt->execute([$prodId]);
            $product = $lockStmt->fetch();
            if (!$product) {
                $db->rollBack();
                jsonResponse(['message' => "Product not found: {$prodId}"], 404);
            }

            $qtyNeeded = (int)($item['quantity'] ?? 0);
            if ((int)$product['quantity'] < $qtyNeeded) {
                $db->rollBack();
                jsonResponse(['message' => "Insufficient stock for {$product['productName']}"], 400);
            }

            $productsById[$prodId] = $product;
        }

        // 2. Insert master sale record
        $subtotal = (float)($data['subtotalAmount'] ?? $data['subtotal'] ?? 0);
        $tax = (float)($data['taxAmount'] ?? $data['tax'] ?? 0);
        $total = (float)($data['totalAmount'] ?? $data['total'] ?? ($subtotal + $tax));
        $customerId = $data['customerId'] ?? 'Walk-in';
        $recordedBy = (int)$user['id'];

        $saleStmt = $db->prepare("
            INSERT INTO sales (subtotalAmount, taxAmount, totalAmount, customerId, recordedBy, saleDate, createdAt)
            VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ");
        $saleStmt->execute([$subtotal, $tax, $total, $customerId, $recordedBy]);
        $saleId = (int)$db->lastInsertId();

        // 3. Insert sale items, decrement product stock, and log inventory transaction
        $itemStmt = $db->prepare("
            INSERT INTO sale_items (saleId, productId, quantity, price, createdAt)
            VALUES (?, ?, ?, ?, NOW())
        ");

        $decStmt = $db->prepare("
            UPDATE products SET quantity = quantity - ?, updatedAt = NOW() WHERE id = ?
        ");

        $invTransStmt = $db->prepare("
            INSERT INTO inventory_transactions (productId, type, quantity, reason, recordedBy, createdAt)
            VALUES (?, 'stock-out', ?, 'sold', ?, NOW())
        ");

        $returnItems = [];
        foreach ($data['items'] as $item) {
            $prodId = (int)$item['productId'];
            $qty = (int)$item['quantity'];
            $price = (float)$item['price'];

            $itemStmt->execute([$saleId, $prodId, $qty, $price]);
            $decStmt->execute([$qty, $prodId]);
            $invTransStmt->execute([$prodId, $qty, $recordedBy]);

            $returnItems[] = [
                'productId' => (string)$prodId,
                'productName' => $productsById[$prodId]['productName'] ?? 'Unknown',
                'quantity' => $qty,
                'price' => $price
            ];
        }

        $db->commit();

        // 4. Audit Log
        auditLog($user['id'], "Recorded sale #{$saleId} of ₱{$total}", 'Sales');

        $saleResult = [
            'id' => $saleId,
            '_id' => (string)$saleId,
            'subtotalAmount' => $subtotal,
            'taxAmount' => $tax,
            'totalAmount' => $total,
            'customerId' => $customerId,
            'recordedBy' => (string)$recordedBy,
            'saleDate' => date('c'),
            'createdAt' => date('c'),
            'items' => $returnItems
        ];

        jsonResponse(['message' => 'Sale recorded successfully', 'sale' => $saleResult], 201);
    } catch (\Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        jsonResponse(['message' => 'Failed to record sale: ' . $e->getMessage()], 500);
    }
}
