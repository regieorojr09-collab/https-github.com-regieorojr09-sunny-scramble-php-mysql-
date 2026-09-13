<?php
/**
 * Sunny & Scramble — Deliveries API (MySQL / PDO)
 * 
 * GET  — List all deliveries with product/supplier names
 * POST — Record delivery (increases product stock, updates unitCost, logs transaction)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetDeliveries();
        break;
    case 'POST':
        requireLogin();
        handleCreateDelivery();
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetDeliveries(): void {
    $pdo = getDB();
    $stmt = $pdo->query(
        "SELECT d.*, 
                p.productName, 
                s.supplierName 
         FROM deliveries d
         LEFT JOIN products p ON d.productId = p.id
         LEFT JOIN suppliers s ON d.supplierId = s.id
         ORDER BY d.createdAt DESC"
    );
    $deliveries = $stmt->fetchAll();
    
    jsonResponse(formatRows($deliveries));
}

function handleCreateDelivery(): void {
    $pdo = getDB();
    $data = getRequestBody();
    $user = getSessionUser();

    $required = ['productId', 'supplierId', 'quantity', 'unitCost', 'totalCost'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || $data[$field] === '') {
            jsonResponse(['message' => "Field '{$field}' is required"], 400);
        }
    }

    $productId = (int)$data['productId'];
    $supplierId = (int)$data['supplierId'];
    $quantity = (int)$data['quantity'];
    $unitCost = (float)$data['unitCost'];
    $totalCost = (float)$data['totalCost'];
    $referenceNo = trim($data['referenceNo'] ?? '');

    if ($productId <= 0 || $supplierId <= 0 || $quantity <= 0) {
        jsonResponse(['message' => 'Invalid product, supplier, or quantity'], 400);
    }

    try {
        beginTransaction();

        // Verify product exists
        $stmtP = $pdo->prepare("SELECT id, productName FROM products WHERE id = :id FOR UPDATE");
        $stmtP->execute([':id' => $productId]);
        $product = $stmtP->fetch();
        if (!$product) {
            rollBack();
            jsonResponse(['message' => 'Product not found'], 404);
        }

        // Verify supplier exists
        $stmtS = $pdo->prepare("SELECT id, supplierName FROM suppliers WHERE id = :id");
        $stmtS->execute([':id' => $supplierId]);
        $supplier = $stmtS->fetch();
        if (!$supplier) {
            rollBack();
            jsonResponse(['message' => 'Supplier not found'], 404);
        }

        // 1. Insert delivery record
        $stmtIns = $pdo->prepare(
            "INSERT INTO deliveries (productId, supplierId, referenceNo, quantity, unitCost, totalCost, createdAt)
             VALUES (:productId, :supplierId, :referenceNo, :quantity, :unitCost, :totalCost, NOW())"
        );
        $stmtIns->execute([
            ':productId' => $productId,
            ':supplierId' => $supplierId,
            ':referenceNo' => $referenceNo,
            ':quantity' => $quantity,
            ':unitCost' => $unitCost,
            ':totalCost' => $totalCost
        ]);
        $deliveryId = (int)$pdo->lastInsertId();

        // 2. Increase product stock and update unitCost
        $stmtUpd = $pdo->prepare(
            "UPDATE products 
             SET quantity = quantity + :qty, 
                 unitCost = :unitCost, 
                 updatedAt = NOW() 
             WHERE id = :id"
        );
        $stmtUpd->execute([
            ':qty' => $quantity,
            ':unitCost' => $unitCost,
            ':id' => $productId
        ]);

        // 3. Log to inventory_transactions
        $stmtTrans = $pdo->prepare(
            "INSERT INTO inventory_transactions (productId, type, quantity, reason, recordedBy, createdAt)
             VALUES (:productId, 'stock-in', :quantity, :reason, :recordedBy, NOW())"
        );
        $reason = $referenceNo ? "Delivery restock - Ref: {$referenceNo}" : "Delivery restock";
        $stmtTrans->execute([
            ':productId' => $productId,
            ':quantity' => $quantity,
            ':reason' => $reason,
            ':recordedBy' => $user['id'] ?? null
        ]);

        // 4. Audit log
        auditLog($user['id'] ?? null, "Recorded delivery of {$quantity} units of {$product['productName']}", 'Inventory');

        commit();

        $deliveryDoc = [
            'id' => $deliveryId,
            '_id' => (string)$deliveryId,
            'productId' => $productId,
            'supplierId' => $supplierId,
            'productName' => $product['productName'],
            'supplierName' => $supplier['supplierName'],
            'referenceNo' => $referenceNo,
            'quantity' => $quantity,
            'unitCost' => $unitCost,
            'totalCost' => $totalCost,
            'createdAt' => date('Y-m-d H:i:s')
        ];

        jsonResponse(['message' => 'Delivery logged successfully', 'delivery' => $deliveryDoc], 201);
    } catch (Exception $e) {
        rollBack();
        jsonResponse(['message' => 'Failed to record delivery: ' . $e->getMessage()], 500);
    }
}
