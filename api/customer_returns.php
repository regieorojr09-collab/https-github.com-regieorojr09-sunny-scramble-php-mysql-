<?php
/**
 * Sunny & Scramble — Customer Returns API (MySQL / PDO)
 * 
 * GET  — List customer returns
 * POST — Process a customer return
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetReturns();
        break;
    case 'POST':
        requireLogin();
        handleCreateReturn();
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetReturns(): void {
    $pdo = getDB();
    $stmt = $pdo->query(
        "SELECT cr.*, 
                p.productName, 
                COALESCE(u.fullName, 'System') AS processedByName
         FROM customer_returns cr
         LEFT JOIN products p ON cr.productId = p.id
         LEFT JOIN users u ON cr.processedBy = u.id
         ORDER BY cr.createdAt DESC"
    );
    $returns = $stmt->fetchAll();

    jsonResponse(formatRows($returns));
}

function handleCreateReturn(): void {
    $pdo = getDB();
    $data = getRequestBody();
    $user = getSessionUser();

    $required = ['productId', 'quantity', 'reason', 'action'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            jsonResponse(['message' => "Field '{$field}' is required"], 400);
        }
    }

    $productId = (int)$data['productId'];
    $quantity = (int)$data['quantity'];
    $reason = trim($data['reason']);
    $action = trim($data['action']);
    $customerId = trim($data['customerId'] ?? 'Walk-in');
    $amountRefunded = (float)($data['amountRefunded'] ?? 0);
    $notes = trim($data['notes'] ?? '');

    if ($productId <= 0 || $quantity <= 0) {
        jsonResponse(['message' => 'Invalid product or quantity'], 400);
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

        // If replaced, ensure sufficient stock
        if (strcasecmp($action, 'Replaced') === 0) {
            if ((int)$product['quantity'] < $quantity) {
                rollBack();
                jsonResponse(['message' => 'Not enough stock to replace item'], 400);
            }

            // Deduct replacement stock
            $stmtUpd = $pdo->prepare("UPDATE products SET quantity = quantity - :qty, updatedAt = NOW() WHERE id = :id");
            $stmtUpd->execute([':qty' => $quantity, ':id' => $productId]);

            // Log to inventory_transactions
            $stmtTrans = $pdo->prepare(
                "INSERT INTO inventory_transactions (productId, type, quantity, reason, recordedBy, createdAt)
                 VALUES (:productId, 'stock-out', :quantity, :reason, :recordedBy, NOW())"
            );
            $stmtTrans->execute([
                ':productId' => $productId,
                ':quantity' => $quantity,
                ':reason' => "Customer Return Replacement: {$reason}",
                ':recordedBy' => $user['id'] ?? null
            ]);
        }

        // Insert into customer_returns
        $stmtIns = $pdo->prepare(
            "INSERT INTO customer_returns (customerId, productId, quantity, reason, action, amountRefunded, notes, processedBy, createdAt)
             VALUES (:customerId, :productId, :quantity, :reason, :action, :amountRefunded, :notes, :processedBy, NOW())"
        );
        $stmtIns->execute([
            ':customerId' => $customerId,
            ':productId' => $productId,
            ':quantity' => $quantity,
            ':reason' => $reason,
            ':action' => $action,
            ':amountRefunded' => $amountRefunded,
            ':notes' => $notes,
            ':processedBy' => $user['id'] ?? null
        ]);
        $returnId = (int)$pdo->lastInsertId();

        // Audit log
        $productName = $product['productName'] ?? 'Unknown';
        auditLog($user['id'] ?? null, "Processed Customer Return: {$quantity} units of {$productName} ({$action})", 'Returns');

        commit();

        $returnDoc = [
            'id' => (string)$returnId,
            '_id' => (string)$returnId,
            'customerId' => $customerId,
            'productId' => (string)$productId,
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

        jsonResponse(['message' => 'Return processed successfully', 'customerReturn' => $returnDoc], 201);
    } catch (Exception $e) {
        rollBack();
        jsonResponse(['message' => 'Failed to process return: ' . $e->getMessage()], 500);
    }
}
