<?php
/**
 * Sunny & Scramble — XML Inventory Sync/Import (MySQL / PDO)
 * 
 * POST — Accept uploaded XML file, parse with SimpleXMLElement,
 *         batch-update product prices and stock in MySQL.
 */

require_once __DIR__ . '/../config/db.php';

if (getRequestMethod() !== 'POST') {
    jsonResponse(['message' => 'Method not allowed'], 405);
}

$user = requireAdmin();

// Check for uploaded file
if (empty($_FILES['xmlFile']) || $_FILES['xmlFile']['error'] !== UPLOAD_ERR_OK) {
    jsonResponse(['message' => 'Please upload a valid XML file'], 400);
}

$filePath = $_FILES['xmlFile']['tmp_name'];
$xmlContent = file_get_contents($filePath);

if (!$xmlContent) {
    jsonResponse(['message' => 'Failed to read uploaded file'], 400);
}

// Parse with SimpleXMLElement
try {
    $xml = new SimpleXMLElement($xmlContent);
} catch (Exception $e) {
    jsonResponse(['message' => 'Invalid XML format: ' . $e->getMessage()], 400);
}

$pdo = getDB();
$updated = 0;
$skipped = 0;
$errors = [];

// Process each product in the XML
if (isset($xml->products->product)) {
    foreach ($xml->products->product as $productEl) {
        $productId = (string)($productEl['id'] ?? '');
        $name = trim((string)($productEl->name ?? ''));

        if (!$productId && !$name) {
            $skipped++;
            continue;
        }

        $existing = null;
        if ($productId && is_numeric($productId)) {
            $stmt = $pdo->prepare("SELECT id, productName FROM products WHERE id = :id");
            $stmt->execute([':id' => (int)$productId]);
            $existing = $stmt->fetch();
        }

        if (!$existing && $name) {
            $stmt = $pdo->prepare("SELECT id, productName FROM products WHERE productName = :name");
            $stmt->execute([':name' => $name]);
            $existing = $stmt->fetch();
        }

        if (!$existing) {
            $errors[] = "Product not found: " . ($name ?: $productId);
            $skipped++;
            continue;
        }

        $fields = [];
        $params = [':id' => $existing['id']];

        if (isset($productEl->sellingPrice)) {
            $fields[] = "sellingPrice = :sellingPrice";
            $params[':sellingPrice'] = (float)(string)$productEl->sellingPrice;
        }
        if (isset($productEl->unitCost)) {
            $fields[] = "unitCost = :unitCost";
            $params[':unitCost'] = (float)(string)$productEl->unitCost;
        }
        if (isset($productEl->quantity)) {
            $fields[] = "quantity = :quantity";
            $params[':quantity'] = (int)(string)$productEl->quantity;
        }
        if (isset($productEl->maxCapacity)) {
            $fields[] = "maxCapacity = :maxCapacity";
            $params[':maxCapacity'] = (int)(string)$productEl->maxCapacity;
        }
        if (isset($productEl->status)) {
            $fields[] = "status = :status";
            $params[':status'] = (string)$productEl->status;
        }

        if (!empty($fields)) {
            $fields[] = "updatedAt = NOW()";
            $sql = "UPDATE products SET " . implode(', ', $fields) . " WHERE id = :id";
            $stmtUpd = $pdo->prepare($sql);
            $stmtUpd->execute($params);
            $updated++;
        } else {
            $skipped++;
        }
    }
}

auditLog($user['id'] ?? null, "Imported XML catalog: {$updated} updated, {$skipped} skipped", 'XML');

jsonResponse([
    'message' => 'XML import completed',
    'updated' => $updated,
    'skipped' => $skipped,
    'errors' => $errors
]);
