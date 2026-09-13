<?php
/**
 * Sunny & Scramble — Spoilages API (MySQL / PDO)
 * 
 * GET  — List spoilage records (merged with inventory adjustments)
 * POST — Record spoilage (deducts stock, calculates cost, logs transaction)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetSpoilages();
        break;
    case 'POST':
        requireLogin();
        handleRecordSpoilage();
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetSpoilages(): void {
    $pdo = getDB();

    // 1. Spoilage records
    $stmtSp = $pdo->query(
        "SELECT s.id, s.productId, s.quantity, s.reason, s.cost, s.notes, s.reportedBy, s.createdAt,
                p.productName,
                p.unitCost AS productUnitCost,
                u.fullName AS reportedByName
         FROM spoilages s
         LEFT JOIN products p ON s.productId = p.id
         LEFT JOIN users u ON s.reportedBy = u.id
         ORDER BY s.createdAt DESC"
    );
    $spoilages = $stmtSp->fetchAll();
    foreach ($spoilages as &$sp) {
        $sp['id'] = (string)$sp['id'];
        $sp['_id'] = (string)$sp['id'];
        $sp['productUnitCost'] = (float)($sp['productUnitCost'] ?? 0);
        $sp['cost'] = (float)$sp['cost'];
        $sp['reportedByName'] = $sp['reportedByName'] ?? 'System';
    }

    // 2. Manual inventory adjustments
    $stmtTr = $pdo->query(
        "SELECT it.id, it.productId, it.type, it.quantity, it.reason, it.recordedBy, it.createdAt,
                p.productName,
                p.unitCost,
                u.fullName AS reportedByName
         FROM inventory_transactions it
         LEFT JOIN products p ON it.productId = p.id
         LEFT JOIN users u ON it.recordedBy = u.id
         WHERE it.reason NOT LIKE '%sold%' AND it.reason NOT LIKE '%delivery%'
         ORDER BY it.createdAt DESC"
    );
    $adjustments = $stmtTr->fetchAll();

    $adjFormatted = [];
    foreach ($adjustments as $tr) {
        $unitCost = (float)($tr['unitCost'] ?? 0);
        $qty = (int)$tr['quantity'];
        $cost = ($tr['type'] === 'stock-in') ? 0.00 : round($unitCost * $qty, 2);

        $adjFormatted[] = [
            'id' => (string)$tr['id'],
            '_id' => (string)$tr['id'],
            'productId' => (string)$tr['productId'],
            'productName' => $tr['productName'] ?? 'Unknown',
            'quantity' => $qty,
            'reason' => $tr['reason'] ?: ($tr['type'] === 'stock-in' ? 'Manual Stock In' : 'Manual Stock Out'),
            'cost' => $cost,
            'notes' => ($tr['type'] === 'stock-in') ? 'Manual Stock In' : 'Manual Stock Out',
            'reportedByName' => $tr['reportedByName'] ?? 'System',
            'createdAt' => $tr['createdAt'],
            'type' => $tr['type']
        ];
    }

    // 3. Merge and sort by createdAt DESC
    $combined = array_merge($spoilages, $adjFormatted);
    usort($combined, function ($a, $b) {
        return strtotime($b['createdAt'] ?? '2000-01-01') - strtotime($a['createdAt'] ?? '2000-01-01');
    });

    jsonResponse($combined);
}

function handleRecordSpoilage(): void {
    $pdo = getDB();
    $data = getRequestBody();
    $user = getSessionUser();

    $productId = isset($data['productId']) ? (int)$data['productId'] : 0;
    $quantity = isset($data['quantity']) ? (int)$data['quantity'] : 0;
    $reason = trim($data['reason'] ?? '');
    $notes = trim($data['notes'] ?? '');

    if ($productId <= 0 || $quantity <= 0 || empty($reason)) {
        jsonResponse(['message' => 'Product, quantity, and reason are required'], 400);
    }

    try {
        beginTransaction();

        $stmtP = $pdo->prepare("SELECT id, productName, quantity, unitCost FROM products WHERE id = :id FOR UPDATE");
        $stmtP->execute([':id' => $productId]);
        $product = $stmtP->fetch();

        if (!$product) {
            rollBack();
            jsonResponse(['message' => 'Product not found'], 404);
        }

        if ((int)$product['quantity'] < $quantity) {
            rollBack();
            jsonResponse(['message' => 'Not enough stock to mark as spoiled'], 400);
        }

        $unitCost = (float)$product['unitCost'];
        $cost = round($unitCost * $quantity, 2);

        // 1. Insert into spoilages
        $stmtIns = $pdo->prepare(
            "INSERT INTO spoilages (productId, quantity, reason, cost, notes, reportedBy, createdAt)
             VALUES (:productId, :quantity, :reason, :cost, :notes, :reportedBy, NOW())"
        );
        $stmtIns->execute([
            ':productId' => $productId,
            ':quantity' => $quantity,
            ':reason' => $reason,
            ':cost' => $cost,
            ':notes' => $notes,
            ':reportedBy' => $user['id'] ?? null
        ]);
        $spoilageId = (int)$pdo->lastInsertId();

        // 2. Deduct product quantity
        $stmtUpd = $pdo->prepare(
            "UPDATE products 
             SET quantity = quantity - :qty, 
                 updatedAt = NOW() 
             WHERE id = :id"
        );
        $stmtUpd->execute([
            ':qty' => $quantity,
            ':id' => $productId
        ]);

        // 3. Log to inventory_transactions
        $stmtTrans = $pdo->prepare(
            "INSERT INTO inventory_transactions (productId, type, quantity, reason, recordedBy, createdAt)
             VALUES (:productId, 'stock-out', :quantity, :reason, :recordedBy, NOW())"
        );
        $stmtTrans->execute([
            ':productId' => $productId,
            ':quantity' => $quantity,
            ':reason' => "Spoilage: {$reason}",
            ':recordedBy' => $user['id'] ?? null
        ]);

        // 4. Audit log
        $prodName = $product['productName'] ?? 'Unknown';
        auditLog($user['id'] ?? null, "Recorded spoilage: {$quantity} units of {$prodName} ({$reason})", 'Inventory');

        commit();

        $spoilageDoc = [
            'id' => (string)$spoilageId,
            '_id' => (string)$spoilageId,
            'productId' => (string)$productId,
            'productName' => $prodName,
            'quantity' => $quantity,
            'reason' => $reason,
            'cost' => $cost,
            'notes' => $notes,
            'reportedBy' => $user['id'] ?? null,
            'createdAt' => date('Y-m-d H:i:s')
        ];

        jsonResponse(['message' => 'Spoilage recorded successfully', 'spoilage' => $spoilageDoc], 201);
    } catch (Exception $e) {
        rollBack();
        jsonResponse(['message' => 'Failed to record spoilage: ' . $e->getMessage()], 500);
    }
}
