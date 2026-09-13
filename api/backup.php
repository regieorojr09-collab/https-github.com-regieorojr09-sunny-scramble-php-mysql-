<?php
/**
 * Sunny & Scramble — Backup API (MySQL / PDO)
 * 
 * GET — Export all tables as JSON download
 */

require_once __DIR__ . '/../config/db.php';

if (getRequestMethod() !== 'GET') {
    jsonResponse(['message' => 'Method not allowed'], 405);
}

$user = requireAdmin();

$pdo = getDB();
$tables = [
    'users',
    'products',
    'suppliers',
    'sales',
    'sale_items',
    'deliveries',
    'spoilages',
    'inventory_transactions',
    'audit_logs',
    'store_config',
    'customer_returns',
    'supplier_returns'
];

$exportData = [];
foreach ($tables as $table) {
    $stmt = $pdo->query("SELECT * FROM `{$table}`");
    $rows = $stmt->fetchAll();
    
    // Sanitize sensitive user fields
    if ($table === 'users') {
        foreach ($rows as &$u) {
            unset($u['passwordHash']);
        }
    }

    $exportData[$table] = formatRows($rows);
}

auditLog($user['id'] ?? null, 'Exported database backup', 'Settings');

$filename = 'sunny_scramble_backup_' . date('Y-m-d_His') . '.json';
header('Content-Disposition: attachment; filename=' . $filename);
header('Content-Type: application/json; charset=utf-8');
echo json_encode($exportData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
exit;
