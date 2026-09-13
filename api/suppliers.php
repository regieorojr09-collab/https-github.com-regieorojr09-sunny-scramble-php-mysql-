<?php
/**
 * Sunny & Scramble — Suppliers API (MySQL / PDO)
 * 
 * GET          — List suppliers (?status=, ?search=)
 * GET ?id=X    — Get supplier with recent deliveries
 * POST         — Create supplier (admin+)
 * PUT ?id=X    — Update supplier
 * DELETE ?id=X — Soft-delete (set inactive)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

switch ($method) {
    case 'GET':
        requireLogin();
        if ($id) {
            handleGetSupplierById($id);
        } else {
            handleGetSuppliers();
        }
        break;
    case 'POST':
        requireAdmin();
        handleCreateSupplier();
        break;
    case 'PUT':
        requireAdmin();
        handleUpdateSupplier($id);
        break;
    case 'DELETE':
        requireAdmin();
        handleDeleteSupplier($id);
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetSuppliers(): void {
    $pdo = getDB();
    $where = [];
    $params = [];

    if (!empty($_GET['status'])) {
        $where[] = "status = :status";
        $params[':status'] = $_GET['status'];
    }
    if (!empty($_GET['search'])) {
        $where[] = "(supplierName LIKE :search OR contactPerson LIKE :search OR email LIKE :search)";
        $params[':search'] = '%' . $_GET['search'] . '%';
    }

    $sql = "SELECT * FROM suppliers";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }
    $sql .= " ORDER BY supplierName ASC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $suppliers = $stmt->fetchAll();

    jsonResponse(formatRows($suppliers));
}

function handleGetSupplierById(int $id): void {
    if ($id <= 0) {
        jsonResponse(['message' => 'Invalid supplier ID'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $supplier = $stmt->fetch();
    if (!$supplier) {
        jsonResponse(['message' => 'Supplier not found'], 404);
    }

    // Fetch recent deliveries
    $stmtDel = $pdo->prepare(
        "SELECT d.*, p.productName 
         FROM deliveries d
         LEFT JOIN products p ON d.productId = p.id
         WHERE d.supplierId = :supplierId
         ORDER BY d.createdAt DESC
         LIMIT 10"
    );
    $stmtDel->execute([':supplierId' => $id]);
    $deliveries = $stmtDel->fetchAll();

    jsonResponse([
        'supplier' => formatRow($supplier),
        'recentDeliveries' => formatRows($deliveries)
    ]);
}

function handleCreateSupplier(): void {
    $data = getRequestBody();
    $user = getSessionUser();

    if (empty($data['supplierName']) || empty($data['contact'])) {
        jsonResponse(['message' => 'Supplier name and contact are required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare(
        "INSERT INTO suppliers (supplierName, contact, address, contactPerson, email, paymentTerms, status, notes, createdBy, createdAt, updatedAt)
         VALUES (:supplierName, :contact, :address, :contactPerson, :email, :paymentTerms, 'active', :notes, :createdBy, NOW(), NOW())"
    );
    $stmt->execute([
        ':supplierName' => trim($data['supplierName']),
        ':contact' => trim($data['contact']),
        ':address' => trim($data['address'] ?? ''),
        ':contactPerson' => trim($data['contactPerson'] ?? ''),
        ':email' => trim($data['email'] ?? ''),
        ':paymentTerms' => trim($data['paymentTerms'] ?? 'COD'),
        ':notes' => trim($data['notes'] ?? ''),
        ':createdBy' => $user['id'] ?? null
    ]);

    $newId = (int)$pdo->lastInsertId();

    auditLog($user['id'] ?? null, "Created supplier: " . trim($data['supplierName']), 'Suppliers');

    $stmtAfter = $pdo->prepare("SELECT * FROM suppliers WHERE id = :id");
    $stmtAfter->execute([':id' => $newId]);
    $newSupplier = $stmtAfter->fetch();

    jsonResponse(formatRow($newSupplier), 201);
}

function handleUpdateSupplier(?int $id): void {
    if (!$id || $id <= 0) {
        jsonResponse(['message' => 'Supplier ID required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $supplier = $stmt->fetch();
    if (!$supplier) {
        jsonResponse(['message' => 'Supplier not found'], 404);
    }

    $data = getRequestBody();
    $fields = [];
    $params = [':id' => $id];

    $allowed = ['supplierName', 'contact', 'address', 'contactPerson', 'email', 'paymentTerms', 'status', 'notes'];
    foreach ($allowed as $field) {
        if (isset($data[$field])) {
            $fields[] = "`$field` = :$field";
            $params[":$field"] = trim($data[$field]);
        }
    }

    if (empty($fields)) {
        jsonResponse(['message' => 'No fields to update'], 400);
    }

    $fields[] = "`updatedAt` = NOW()";
    $sql = "UPDATE suppliers SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmtUpd = $pdo->prepare($sql);
    $stmtUpd->execute($params);

    $user = getSessionUser();
    auditLog($user['id'] ?? null, "Updated supplier: " . ($data['supplierName'] ?? $supplier['supplierName']), 'Suppliers');

    $stmtAfter = $pdo->prepare("SELECT * FROM suppliers WHERE id = :id");
    $stmtAfter->execute([':id' => $id]);
    $updated = $stmtAfter->fetch();

    jsonResponse(formatRow($updated));
}

function handleDeleteSupplier(?int $id): void {
    if (!$id || $id <= 0) {
        jsonResponse(['message' => 'Supplier ID required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM suppliers WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $supplier = $stmt->fetch();
    if (!$supplier) {
        jsonResponse(['message' => 'Supplier not found'], 404);
    }

    $stmtUpd = $pdo->prepare("UPDATE suppliers SET status = 'inactive', updatedAt = NOW() WHERE id = :id");
    $stmtUpd->execute([':id' => $id]);

    $user = getSessionUser();
    auditLog($user['id'] ?? null, "Deactivated supplier: " . $supplier['supplierName'], 'Suppliers');

    $supplier['status'] = 'inactive';
    jsonResponse(['message' => 'Supplier marked as inactive', 'supplier' => formatRow($supplier)]);
}
