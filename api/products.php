<?php
/**
 * Sunny & Scramble — Products API (MySQL / PDO)
 * 
 * GET              — List products (?category=, ?search=, ?status=)
 * POST             — Create product (admin+)
 * PUT  ?id=X       — Update product
 * DELETE ?id=X     — Archive product (soft delete)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        handleGetProducts();
        break;
    case 'POST':
        requireAdmin();
        handleCreateProduct();
        break;
    case 'PUT':
        requireLogin();
        handleUpdateProduct($id);
        break;
    case 'DELETE':
        requireAdmin();
        handleDeleteProduct($id);
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetProducts(): void {
    $db = getDB();
    $sql = "SELECT * FROM products WHERE 1=1";
    $params = [];

    if (!empty($_GET['id'])) {
        $sql .= " AND id = ?";
        $params[] = (int)$_GET['id'];
    }
    if (!empty($_GET['category'])) {
        $sql .= " AND category = ?";
        $params[] = $_GET['category'];
    }
    if (!empty($_GET['search'])) {
        $sql .= " AND productName LIKE ?";
        $params[] = '%' . $_GET['search'] . '%';
    }
    if (!empty($_GET['status'])) {
        $sql .= " AND status = ?";
        $params[] = $_GET['status'];
    }

    $sql .= " ORDER BY productName ASC";
    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    $products = $stmt->fetchAll();

    jsonResponse(formatRows($products));
}

function handleCreateProduct(): void {
    $data = getRequestBody();
    $required = ['productName', 'category', 'unitCost', 'sellingPrice'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || trim($data[$field]) === '') {
            jsonResponse(['message' => "Field '{$field}' is required"], 400);
        }
    }

    $db = getDB();
    $expDate = !empty($data['expirationDate']) ? date('Y-m-d', strtotime($data['expirationDate'])) : null;
    $maxCapacity = isset($data['maxCapacity']) ? (int)$data['maxCapacity'] : 100;
    $imageUrl = $data['imageUrl'] ?? '';

    $stmt = $db->prepare("
        INSERT INTO products (productName, category, quantity, unitCost, sellingPrice, expirationDate, maxCapacity, imageUrl, status, createdAt, updatedAt)
        VALUES (?, ?, 0, ?, ?, ?, ?, ?, 'active', NOW(), NOW())
    ");
    $stmt->execute([
        $data['productName'],
        $data['category'],
        (float)$data['unitCost'],
        (float)$data['sellingPrice'],
        $expDate,
        $maxCapacity,
        $imageUrl
    ]);

    $newId = (int)$db->lastInsertId();
    $getStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $getStmt->execute([$newId]);
    $newProduct = $getStmt->fetch();

    $user = getSessionUser();
    auditLog($user['id'], "Created product: {$data['productName']}", 'Inventory');

    jsonResponse(formatRow($newProduct), 201);
}

function handleUpdateProduct(?int $id): void {
    if (!$id) jsonResponse(['message' => 'Product ID required'], 400);

    $db = getDB();
    $checkStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();
    if (!$existing) jsonResponse(['message' => 'Product not found'], 404);

    $data = getRequestBody();

    // Validation: prevent archiving if stock > 0
    if (isset($data['status']) && $data['status'] === 'archived') {
        if (($existing['quantity'] ?? 0) > 0) {
            jsonResponse(['message' => 'Cannot archive product. Stock must be zero.'], 400);
        }
    }

    $updates = [];
    $params = [];
    $allowedFields = ['productName', 'category', 'unitCost', 'sellingPrice', 'expirationDate', 'maxCapacity', 'imageUrl', 'status'];

    foreach ($allowedFields as $field) {
        if (isset($data[$field])) {
            $value = $data[$field];
            if ($field === 'unitCost' || $field === 'sellingPrice') $value = (float)$value;
            if ($field === 'maxCapacity') $value = (int)$value;
            if ($field === 'expirationDate') {
                $value = $value ? date('Y-m-d', strtotime($value)) : null;
            }
            $updates[] = "`{$field}` = ?";
            $params[] = $value;
        }
    }

    if (!empty($updates)) {
        $updates[] = "`updatedAt` = NOW()";
        $sql = "UPDATE products SET " . implode(', ', $updates) . " WHERE id = ?";
        $params[] = $id;
        $stmt = $db->prepare($sql);
        $stmt->execute($params);
    }

    $getStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $getStmt->execute([$id]);
    $updated = $getStmt->fetch();

    $user = getSessionUser();
    auditLog($user['id'], "Updated product: " . ($updated['productName'] ?? (string)$id), 'Inventory');

    jsonResponse(formatRow($updated));
}

function handleDeleteProduct(?int $id): void {
    if (!$id) jsonResponse(['message' => 'Product ID required'], 400);

    $db = getDB();
    $checkStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();
    if (!$existing) jsonResponse(['message' => 'Product not found'], 404);

    $stmt = $db->prepare("UPDATE products SET status = 'archived', updatedAt = NOW() WHERE id = ?");
    $stmt->execute([$id]);

    $getStmt = $db->prepare("SELECT * FROM products WHERE id = ?");
    $getStmt->execute([$id]);
    $archived = $getStmt->fetch();

    $user = getSessionUser();
    auditLog($user['id'], "Archived product: " . ($archived['productName'] ?? (string)$id), 'Inventory');

    jsonResponse(['message' => 'Product archived', 'product' => formatRow($archived)]);
}
