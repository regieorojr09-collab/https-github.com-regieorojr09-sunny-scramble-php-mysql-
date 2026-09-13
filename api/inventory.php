<?php
/**
 * Sunny & Scramble — Inventory API (MySQL / PDO)
 * 
 * POST             — Record stock-in or stock-out transaction
 * GET ?productId=X — Get complete movement history for a product
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetHistory();
        break;
    case 'POST':
        requireLogin();
        handleRecordTransaction();
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleRecordTransaction(): void {
    $data = getRequestBody();
    $user = getSessionUser();

    $productId = (int)($data['productId'] ?? 0);
    $type = $data['type'] ?? '';
    $quantity = (int)($data['quantity'] ?? 0);
    $reason = $data['reason'] ?? '';

    if (!$productId || !$type || $quantity <= 0) {
        jsonResponse(['message' => 'productId, type, and quantity are required'], 400);
    }

    if (!in_array($type, ['stock-in', 'stock-out'])) {
        jsonResponse(['message' => 'Type must be stock-in or stock-out'], 400);
    }

    $db = getDB();

    try {
        $db->beginTransaction();

        $stmt = $db->prepare("SELECT * FROM products WHERE id = ? FOR UPDATE");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product) {
            $db->rollBack();
            jsonResponse(['message' => 'Product not found'], 404);
        }

        if ($type === 'stock-out' && (int)$product['quantity'] < $quantity) {
            $db->rollBack();
            jsonResponse(['message' => 'Insufficient stock for this transaction'], 400);
        }

        $delta = ($type === 'stock-in') ? $quantity : -$quantity;
        $upStmt = $db->prepare("UPDATE products SET quantity = quantity + ?, updatedAt = NOW() WHERE id = ?");
        $upStmt->execute([$delta, $productId]);

        $insStmt = $db->prepare("
            INSERT INTO inventory_transactions (productId, type, quantity, reason, recordedBy, createdAt)
            VALUES (?, ?, ?, ?, ?, NOW())
        ");
        $insStmt->execute([$productId, $type, $quantity, $reason, (int)$user['id']]);
        $transId = (int)$db->lastInsertId();

        $db->commit();

        $productName = $product['productName'] ?? 'Unknown';
        auditLog($user['id'], "Recorded {$type} of {$quantity} for product {$productName}", 'Inventory');

        $newQty = (int)$product['quantity'] + $delta;
        $transactionDoc = [
            'id' => $transId,
            '_id' => (string)$transId,
            'productId' => (string)$productId,
            'type' => $type,
            'quantity' => $quantity,
            'reason' => $reason,
            'recordedBy' => (string)$user['id'],
            'createdAt' => date('c')
        ];

        jsonResponse([
            'message' => 'Inventory transaction recorded successfully',
            'transaction' => $transactionDoc,
            'productQuantity' => $newQty
        ], 201);
    } catch (\Exception $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        jsonResponse(['message' => 'Failed to record transaction: ' . $e->getMessage()], 500);
    }
}

function handleGetHistory(): void {
    $productId = (int)($_GET['productId'] ?? 0);
    if (!$productId) jsonResponse(['message' => 'productId parameter required'], 400);

    $db = getDB();
    $prodStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $prodStmt->execute([$productId]);
    $product = $prodStmt->fetch();
    if (!$product) jsonResponse(['message' => 'Product not found'], 404);

    $history = [];

    // 1. Sales
    $saleStmt = $db->prepare("
        SELECT s.id AS refId, s.saleDate AS `date`, 'Sale' AS `type`, -(si.quantity) AS `change`, 
               COALESCE(u.fullName, 'System') AS recordedBy, CONCAT('Sale ID: ', s.id) AS notes
        FROM sale_items si
        JOIN sales s ON si.saleId = s.id
        LEFT JOIN users u ON s.recordedBy = u.id
        WHERE si.productId = ?
    ");
    $saleStmt->execute([$productId]);
    while ($row = $saleStmt->fetch()) {
        $history[] = [
            '_id' => (string)$row['refId'],
            'date' => $row['date'],
            'type' => $row['type'],
            'change' => (int)$row['change'],
            'recordedBy' => $row['recordedBy'],
            'notes' => $row['notes']
        ];
    }

    // 2. Deliveries
    $delStmt = $db->prepare("
        SELECT d.id AS refId, d.createdAt AS `date`, 'Delivery' AS `type`, d.quantity AS `change`,
               'System' AS recordedBy, CONCAT('Supplier: ', COALESCE(sup.supplierName, 'Unknown'), ' (Ref: ', COALESCE(d.referenceNo, 'N/A'), ')') AS notes
        FROM deliveries d
        LEFT JOIN suppliers sup ON d.supplierId = sup.id
        WHERE d.productId = ?
    ");
    $delStmt->execute([$productId]);
    while ($row = $delStmt->fetch()) {
        $history[] = [
            '_id' => (string)$row['refId'],
            'date' => $row['date'],
            'type' => $row['type'],
            'change' => (int)$row['change'],
            'recordedBy' => $row['recordedBy'],
            'notes' => $row['notes']
        ];
    }

    // 3. Spoilages
    $spoilStmt = $db->prepare("
        SELECT sp.id AS refId, sp.createdAt AS `date`, 'Spoilage' AS `type`, -(sp.quantity) AS `change`,
               COALESCE(u.fullName, 'System') AS recordedBy, CONCAT('Reason: ', sp.reason) AS notes
        FROM spoilages sp
        LEFT JOIN users u ON sp.reportedBy = u.id
        WHERE sp.productId = ?
    ");
    $spoilStmt->execute([$productId]);
    while ($row = $spoilStmt->fetch()) {
        $history[] = [
            '_id' => (string)$row['refId'],
            'date' => $row['date'],
            'type' => $row['type'],
            'change' => (int)$row['change'],
            'recordedBy' => $row['recordedBy'],
            'notes' => $row['notes']
        ];
    }

    // 4. Inventory Transactions (Manual Adjustments)
    $transStmt = $db->prepare("
        SELECT it.id AS refId, it.createdAt AS `date`, 'Adjustment' AS `type`,
               (CASE WHEN it.type = 'stock-in' THEN it.quantity ELSE -it.quantity END) AS `change`,
               COALESCE(u.fullName, 'System') AS recordedBy,
               COALESCE(it.reason, (CASE WHEN it.type = 'stock-in' THEN 'Manual Stock In' ELSE 'Manual Stock Out' END)) AS notes
        FROM inventory_transactions it
        LEFT JOIN users u ON it.recordedBy = u.id
        WHERE it.productId = ? AND (it.reason IS NULL OR it.reason != 'sold')
    ");
    $transStmt->execute([$productId]);
    while ($row = $transStmt->fetch()) {
        $history[] = [
            '_id' => (string)$row['refId'],
            'date' => $row['date'],
            'type' => $row['type'],
            'change' => (int)$row['change'],
            'recordedBy' => $row['recordedBy'],
            'notes' => $row['notes']
        ];
    }

    // Sort descending by date
    usort($history, function($a, $b) {
        return strtotime($b['date'] ?: '2000-01-01') - strtotime($a['date'] ?: '2000-01-01');
    });

    // Calculate running balance before/after
    $currentStock = (int)$product['quantity'];
    foreach ($history as &$record) {
        $stockAfter = $currentStock;
        $stockBefore = $stockAfter - $record['change'];
        $record['stockBefore'] = $stockBefore;
        $record['stockAfter'] = $stockAfter;
        $currentStock = $stockBefore;
    }
    unset($record);

    jsonResponse($history);
}
