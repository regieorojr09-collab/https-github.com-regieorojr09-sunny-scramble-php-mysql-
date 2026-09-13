<?php
/**
 * Sunny & Scramble — MySQL (PDO) Connection & Helpers
 * 
 * Provides PDO connection singleton, auto-database creation,
 * session management, and response/formatting utilities.
 */

// ─── Load XML Config ────────────────────────────────────────────
$appConfigPath = __DIR__ . '/app_config.xml';
$appConfig = null;
if (file_exists($appConfigPath)) {
    $appConfig = simplexml_load_file($appConfigPath);
}

// ─── PDO MySQL Connection Singleton ──────────────────────────────
$pdoInstance = null;

function getDB(): PDO {
    global $pdoInstance, $appConfig;

    if ($pdoInstance === null) {
        $host = 'localhost';
        $port = 3306;
        $dbName = 'sunny_scramble';
        $user = 'root';
        $password = '';
        $charset = 'utf8mb4';

        if ($appConfig && isset($appConfig->database)) {
            $host = (string)($appConfig->database->host ?? $host);
            $port = (int)($appConfig->database->port ?? $port);
            $dbName = (string)($appConfig->database->name ?? $dbName);
            $user = (string)($appConfig->database->user ?? $user);
            $password = (string)($appConfig->database->password ?? $password);
            $charset = (string)($appConfig->database->charset ?? $charset);
        }

        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];

        try {
            // First connect without dbname to ensure the database exists
            $serverDsn = "mysql:host={$host};port={$port};charset={$charset}";
            $serverPdo = new PDO($serverDsn, $user, $password, $options);
            $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

            // Connect to the target database
            $dbDsn = "mysql:host={$host};port={$port};dbname={$dbName};charset={$charset}";
            $pdoInstance = new PDO($dbDsn, $user, $password, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'Database Connection Failed',
                'message' => 'Could not connect to MySQL: ' . $e->getMessage()
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    }

    return $pdoInstance;
}

// ─── Transaction Helpers ────────────────────────────────────────
function beginTransaction(): void {
    getDB()->beginTransaction();
}

function commit(): void {
    getDB()->commit();
}

function rollBack(): void {
    if (getDB()->inTransaction()) {
        getDB()->rollBack();
    }
}

// ─── Data Formatting Helpers (app.js compatibility) ─────────────
/**
 * Format a database row to match the JSON schema expected by frontend (app.js).
 * Exposes `_id` as string alias of `id`, and normalizes types.
 */
function formatRow(?array $row): ?array {
    if ($row === null) return null;

    if (isset($row['id'])) {
        $row['_id'] = (string) $row['id'];
    }

    if (isset($row['mustChangePassword'])) {
        $row['mustChangePassword'] = (bool) $row['mustChangePassword'];
    }

    $floatFields = ['unitCost', 'sellingPrice', 'subtotalAmount', 'taxAmount', 'totalAmount', 'taxRate', 'lowStockThreshold', 'amountRefunded', 'cost', 'totalCost', 'price'];
    foreach ($floatFields as $f) {
        if (isset($row[$f])) {
            $row[$f] = (float) $row[$f];
        }
    }

    $intFields = ['quantity', 'maxCapacity'];
    foreach ($intFields as $f) {
        if (isset($row[$f])) {
            $row[$f] = (int) $row[$f];
        }
    }

    return $row;
}

function formatRows(array $rows): array {
    return array_map('formatRow', $rows);
}

// ─── Session Management ─────────────────────────────────────────
function initSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
}

function getSessionUser(): ?array {
    initSession();
    return $_SESSION['user'] ?? null;
}

function requireLogin(): array {
    $user = getSessionUser();
    if (!$user) {
        http_response_code(401);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'Not authorized, no session'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $user;
}

function requireAdmin(): array {
    $user = requireLogin();
    $adminRoles = ['superadmin', 'owner', 'admin'];
    if (!in_array($user['role'], $adminRoles)) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['message' => 'Insufficient permissions'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    return $user;
}

// ─── Response Helpers ───────────────────────────────────────────
function jsonResponse(mixed $data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestBody(): array {
    $input = file_get_contents('php://input');
    $data = json_decode($input, true);
    return is_array($data) ? $data : [];
}

function getRequestMethod(): string {
    return $_SERVER['REQUEST_METHOD'];
}

// ─── Audit Log Helper ───────────────────────────────────────────
function auditLog($userId, string $action, string $module): void {
    try {
        $db = getDB();
        $stmt = $db->prepare("INSERT INTO audit_logs (userId, action, module, createdAt) VALUES (?, ?, ?, NOW())");
        $uId = $userId ? (int)$userId : null;
        $stmt->execute([$uId, $action, $module]);
    } catch (\Exception $e) {
        // Silently continue — audit log should never break critical user flows
    }
}

// ─── CORS Headers ───────────────────────────────────────────────
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
