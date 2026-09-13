<?php
/**
 * Sunny & Scramble — Supplier Returns API (MySQL / PDO)
 * 
 * GET           — List supplier returns
 * POST          — Process a return to supplier
 * PUT ?id=X     — Update RTS status
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetReturns();
        break;
    case 'POST':
        requireLogin();
        handleCreateReturn();
        break;
    case 'PUT':
        requireLogin();
        handleUpdateStatus($id);
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetReturns(): void {
    $pdo = getDB();
    $stmt = $pdo->query(
        "SELECT sr.*, 
                s.supplierName, 
                p.productName, 
                COALESCE(u.fullName, 'System') AS processedByName
         FROM supplier_returns sr
         LEFT JOIN suppliers s ON sr.supplierId = s.id
         LEFT JOIN products p ON sr.productId = p.id
         LEFT JOIN users u ON sr.processedBy = u.id
         ORDER BY sr.createdAt DESC"
    );
    $returns = $stmt->fetchAll();

    jsonResponse(formatRows($returns));
}

function handleCreateReturn(): void {
    $pdo = getDB();
    $data = getRequestBody();
    $user = getSessionUser();

    $required = ['supplierId', 'productId', 'quantity', 'reason'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(['message' => "Field '{$field}' is required"], 400);
        }
    }

    $supplierId = (int)$data['supplierId'];
    $productId = (int)$data['productId'];
    $quantity = (int)$data['quantity'];
    $reason = trim($data['reason']);
    $action = trim($data['action'] ?? 'Pending');
    $amountRefunded = (float)($data['amountRefunded'] ?? 0);
    $notes = trim($data['notes'] ?? '');

    if ($supplierId <= 0 || $productId <= 0 || $quantity <= 0) {
        jsonResponse(['message' => 'Invalid supplier, product, or quantity'], 400);
    }

    try {
        beginTransaction();

        $stmtP = $pdo->prepare("SELECT id, productName, quantity FROM products WHERE id = :id FOR UPDATE");
        $stmtP->execute([':id' => $productId]);
        $product = $stmtP->fetch();

        if (!$product) {
            rollBack();
            jsonResponse(['message' => 'Product not found'], 404);
        }

        if ((int)$product['quantity'] < $quantity) {
            rollBack();
            jsonResponse(['message' => 'Cannot return more than current stock'], 400);
        }

        $stmtS = $pdo->prepare("SELECT id, supplierName FROM suppliers WHERE id = :id");
        $stmtS->execute([':id' => $supplierId]);
        $supplier = $stmtS->fetch();
        if (!$supplier) {
            rollBack();
            jsonResponse(['message' => 'Supplier not found'], 404);
        }

        // 1. Insert into supplier_returns
        $stmtIns = $pdo->prepare(
            "INSERT INTO supplier_returns (supplierId, productId, quantity, reason, action, amountRefunded, notes, processedBy, createdAt)
             VALUES (:supplierId, :productId, :quantity, :reason, :action, :amountRefunded, :notes, :processedBy, NOW())"
        );
        $stmtIns->execute([
            ':supplierId' => $supplierId,
            ':productId' => $productId,
            ':quantity' => $quantity,
            ':reason' => $reason,
            ':action' => $action,
            ':amountRefunded' => $amountRefunded,
            ':notes' => $notes,
            ':processedBy' => $user['id'] ?? null
        ]);
        $returnId = (int)$pdo->lastInsertId();

        // 2. Deduct product stock
        $stmtUpd = $pdo->prepare("UPDATE products SET quantity = quantity - :qty, updatedAt = NOW() WHERE id = :id");
        $stmtUpd->execute([':qty' => $quantity, ':id' => $productId]);

        // 3. Log to inventory_transactions
        $stmtTrans = $pdo->prepare(
            "INSERT INTO inventory_transactions (productId, type, quantity, reason, recordedBy, createdAt)
             VALUES (:productId, 'stock-out', :quantity, :reason, :recordedBy, NOW())"
        );
        $stmtTrans->execute([
            ':productId' => $productId,
            ':quantity' => $quantity,
            ':reason' => "RTS to {$supplier['supplierName']}: {$reason}",
            ':recordedBy' => $user['id'] ?? null
        ]);

        // 4. Audit log
        $productName = $product['productName'] ?? 'Unknown';
        auditLog($user['id'] ?? null, "Processed RTS: {$quantity} units of {$productName} to Supplier", 'Returns');

        commit();

        $returnDoc = [
            'id' => (string)$returnId,
            '_id' => (string)$returnId,
            'supplierId' => (string)$supplierId,
            'productId' => (string)$productId,
            'supplierName' => $supplier['supplierName'],
            'productName' => $productName,
            'quantity' => $quantity,
            'reason' => $reason,
            'action' => $action,
            'amountRefunded' => $amountRefunded,
            'notes' => $notes,
            'processedBy' => $user['id'] ?? null,
            'processedByName' => $user['fullName'] ?? 'System',
            'createdAt' => date('Y-m-d H:i:s')
        ];

        jsonResponse(['message' => 'Return to supplier processed successfully', 'supplierReturn' => $returnDoc], 201);
    } catch (Exception $e) {
        rollBack();
        jsonResponse(['message' => 'Failed to process return: ' . $e->getMessage()], 500);
    }
}

function handleUpdateStatus(?int $id): void {
    if (!$id || $id <= 0) {
        jsonResponse(['message' => 'Return ID required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM supplier_returns WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $return = $stmt->fetch();
    if (!$return) {
        jsonResponse(['message' => 'Return not found'], 404);
    }

    $data = getRequestBody();
    $action = trim($data['action'] ?? '');
    if (!$action) {
        jsonResponse(['message' => 'Action is required'], 400);
    }

    $stmtUpd = $pdo->prepare("UPDATE supplier_returns SET action = :action WHERE id = :id");
    $stmtUpd->execute([':action' => $action, ':id' => $id]);

    $user = getSessionUser();
    auditLog($user['id'] ?? null, "Updated RTS {$id} status to {$action}", 'Returns');

    $stmtAfter = $pdo->prepare(
        "SELECT sr.*, 
                s.supplierName, 
                p.productName, 
                COALESCE(u.fullName, 'System') AS processedByName
         FROM supplier_returns sr
         LEFT JOIN suppliers s ON sr.supplierId = s.id
         LEFT JOIN products p ON sr.productId = p.id
         LEFT JOIN users u ON sr.processedBy = u.id
         WHERE sr.id = :id"
    );
    $stmtAfter->execute([':id' => $id]);
    $updated = $stmtAfter->fetch();

    jsonResponse(['message' => 'RTS status updated', 'supplierReturn' => formatRow($updated)]);
}
