<?php
/**
 * Sunny & Scramble — Audit Logs API (MySQL / PDO)
 * 
 * GET — List all audit logs with user lookups
 */

require_once __DIR__ . '/../config/db.php';

if (getRequestMethod() !== 'GET') {
    jsonResponse(['message' => 'Method not allowed'], 405);
}

requireAdmin();

$pdo = getDB();
$stmt = $pdo->query(
    "SELECT al.id, al.userId, al.action, al.module, al.createdAt,
            COALESCE(u.fullName, 'System') AS userName,
            COALESCE(u.role, '') AS userRole,
            COALESCE(u.email, '') AS userEmail
     FROM audit_logs al
     LEFT JOIN users u ON al.userId = u.id
     ORDER BY al.createdAt DESC
     LIMIT 500"
);
$logs = $stmt->fetchAll();

jsonResponse(formatRows($logs));
