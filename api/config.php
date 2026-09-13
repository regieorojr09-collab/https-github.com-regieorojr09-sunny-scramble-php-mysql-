<?php
/**
 * Sunny & Scramble — Store Config API (MySQL / PDO)
 * 
 * GET — Return store config (auto-create default if missing)
 * PUT — Update store config (admin+)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();

switch ($method) {
    case 'GET':
        requireLogin();
        handleGetConfig();
        break;
    case 'PUT':
        requireAdmin();
        handleUpdateConfig();
        break;
    default:
        jsonResponse(['message' => 'Method not allowed'], 405);
}

function handleGetConfig(): void {
    $pdo = getDB();
    $stmt = $pdo->query("SELECT * FROM store_config ORDER BY id ASC LIMIT 1");
    $config = $stmt->fetch();

    if (!$config) {
        $stmtIns = $pdo->prepare(
            "INSERT INTO store_config (storeName, storeAddress, storeContact, branchName, taxRate, taxRegistrationNumber, receiptFooter, lowStockThreshold, currency, createdAt, updatedAt)
             VALUES ('Sunny & Scramble', '', '', 'Malanday, San Mateo, Rizal', 0.00, '', 'Thank you for your purchase!', 20.00, 'PHP', NOW(), NOW())"
        );
        $stmtIns->execute();

        $stmt = $pdo->query("SELECT * FROM store_config ORDER BY id ASC LIMIT 1");
        $config = $stmt->fetch();
    }

    $config['taxRate'] = (float)$config['taxRate'];
    $config['lowStockThreshold'] = (float)$config['lowStockThreshold'];

    jsonResponse(formatRow($config));
}

function handleUpdateConfig(): void {
    $pdo = getDB();
    $data = getRequestBody();

    $stmt = $pdo->query("SELECT id FROM store_config ORDER BY id ASC LIMIT 1");
    $config = $stmt->fetch();

    $fields = ['storeName', 'storeAddress', 'storeContact', 'branchName', 'taxRate', 'taxRegistrationNumber', 'receiptFooter', 'lowStockThreshold', 'currency'];
    $updates = [];
    $params = [];

    foreach ($fields as $field) {
        if (isset($data[$field])) {
            $val = $data[$field];
            if ($field === 'taxRate' || $field === 'lowStockThreshold') {
                $val = (float)$val;
            } else {
                $val = trim((string)$val);
            }
            $updates[] = "`$field` = :$field";
            $params[":$field"] = $val;
        }
    }

    if (!empty($updates)) {
        if ($config) {
            $updates[] = "`updatedAt` = NOW()";
            $sql = "UPDATE store_config SET " . implode(', ', $updates) . " WHERE id = :config_id";
            $params[':config_id'] = $config['id'];
            $stmtUpd = $pdo->prepare($sql);
            $stmtUpd->execute($params);
        } else {
            // Insert new
            $cols = [];
            $vals = [];
            foreach ($fields as $field) {
                if (isset($data[$field])) {
                    $cols[] = "`$field`";
                    $vals[] = ":$field";
                }
            }
            $cols[] = "`createdAt`";
            $vals[] = "NOW()";
            $cols[] = "`updatedAt`";
            $vals[] = "NOW()";
            $sql = "INSERT INTO store_config (" . implode(', ', $cols) . ") VALUES (" . implode(', ', $vals) . ")";
            $stmtIns = $pdo->prepare($sql);
            $stmtIns->execute($params);
        }
    }

    $user = getSessionUser();
    auditLog($user['id'] ?? null, 'Updated store configuration', 'Settings');

    $stmtAfter = $pdo->query("SELECT * FROM store_config ORDER BY id ASC LIMIT 1");
    $updatedConfig = $stmtAfter->fetch();
    $updatedConfig['taxRate'] = (float)$updatedConfig['taxRate'];
    $updatedConfig['lowStockThreshold'] = (float)$updatedConfig['lowStockThreshold'];

    jsonResponse(['message' => 'Configuration updated successfully', 'config' => formatRow($updatedConfig)]);
}
