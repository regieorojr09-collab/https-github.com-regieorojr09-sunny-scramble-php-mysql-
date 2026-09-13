<?php
/**
 * Sunny & Scramble — MySQL (PDO) Connection & Helpers
 * 
 * Provides PDO connection singleton, environment variable resolution,
 * database auto-creation / cloud DB compatibility (TiDB Cloud SSL, Render, Railway),
 * session management, and response/formatting utilities.
 */

// ─── Load XML Config Fallback ───────────────────────────────────
$appConfigPath = __DIR__ . '/app_config.xml';
$appConfig = null;
if (file_exists($appConfigPath)) {
    $appConfig = @simplexml_load_file($appConfigPath);
}

// ─── PDO MySQL Connection Singleton ──────────────────────────────
$pdoInstance = null;

function getDB(): PDO {
    global $pdoInstance, $appConfig;

    if ($pdoInstance !== null) {
        return $pdoInstance;
    }

    // 1. Defaults
    $host = 'localhost';
    $port = 3306;
    $dbName = 'sunny_scramble';
    $user = 'root';
    $password = '';
    $charset = 'utf8mb4';

    // 2. Fallback to app_config.xml if present
    if ($appConfig && isset($appConfig->database)) {
        $host = (string)($appConfig->database->host ?? $host);
        $port = (int)($appConfig->database->port ?? $port);
        $dbName = (string)($appConfig->database->name ?? $dbName);
        $user = (string)($appConfig->database->user ?? $user);
        $password = (string)($appConfig->database->password ?? $password);
        $charset = (string)($appConfig->database->charset ?? $charset);
    }

    // 3. Check for unified DATABASE_URL or MYSQL_URL (TiDB, Render, Railway, etc.)
    $databaseUrl = getenv('DATABASE_URL') ?: getenv('MYSQL_URL') ?: ($_ENV['DATABASE_URL'] ?? ($_ENV['MYSQL_URL'] ?? null));
    if ($databaseUrl) {
        $parts = parse_url($databaseUrl);
        if ($parts) {
            if (!empty($parts['host'])) $host = $parts['host'];
            if (!empty($parts['port'])) $port = (int)$parts['port'];
            if (!empty($parts['user'])) $user = urldecode($parts['user']);
            if (isset($parts['pass'])) $password = urldecode($parts['pass']);
            if (!empty($parts['path'])) $dbName = ltrim($parts['path'], '/');
        }
    }

    // 4. Override with individual Environment Variables if set
    $envHost = getenv('DB_HOST') ?: ($_ENV['DB_HOST'] ?? null);
    $envPort = getenv('DB_PORT') ?: ($_ENV['DB_PORT'] ?? null);
    $envName = getenv('DB_NAME') ?: ($_ENV['DB_NAME'] ?? null);
    $envUser = getenv('DB_USER') ?: ($_ENV['DB_USER'] ?? null);
    $envPass = getenv('DB_PASS');
    if ($envPass === false) {
        $envPass = $_ENV['DB_PASS'] ?? null;
    }

    if ($envHost !== null && $envHost !== '') $host = $envHost;
    if ($envPort !== null && $envPort !== '') $port = (int)$envPort;
    if ($envName !== null && $envName !== '') $dbName = $envName;
    if ($envUser !== null && $envUser !== '') $user = $envUser;
    if ($envPass !== null) $password = $envPass;

    // 5. Build PDO Options (including TiDB Cloud / SSL configuration)
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES {$charset}"
    ];

    // Detect if SSL should be enabled (remote host such as TiDB Cloud, or DB_SSL flag)
    $isLocal = in_array(strtolower($host), ['localhost', '127.0.0.1', '::1']);
    $dbSslEnv = getenv('DB_SSL') ?: ($_ENV['DB_SSL'] ?? null);
    $enableSsl = ($dbSslEnv === 'true' || $dbSslEnv === '1') || ($dbSslEnv !== 'false' && !$isLocal);

    if ($enableSsl) {
        // Look for system CA certificates bundle (Debian/Ubuntu/Docker container)
        $caBundle = null;
        $candidatePaths = [
            '/etc/ssl/certs/ca-certificates.crt', // Debian / Ubuntu / Docker
            '/etc/pki/tls/certs/ca-bundle.crt',   // CentOS / RHEL
            '/etc/ssl/cert.pem',                  // Alpine / macOS
            ini_get('openssl.cafile') ?: null,
            ini_get('curl.cainfo') ?: null
        ];
        foreach ($candidatePaths as $path) {
            if ($path && @file_exists($path)) {
                $caBundle = $path;
                break;
            }
        }

        $options[PDO::MYSQL_ATTR_SSL_CA] = $caBundle ?: true;
        $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
    }

    $dbDsn = "mysql:host={$host};port={$port};dbname={$dbName};charset={$charset}";

    try {
        // Attempt direct connection to the target database
        $pdoInstance = new PDO($dbDsn, $user, $password, $options);
    } catch (PDOException $e) {
        // If SSL with file path failed, attempt fallback to boolean true
        if ($enableSsl && isset($options[PDO::MYSQL_ATTR_SSL_CA]) && $options[PDO::MYSQL_ATTR_SSL_CA] !== true) {
            try {
                $options[PDO::MYSQL_ATTR_SSL_CA] = true;
                $pdoInstance = new PDO($dbDsn, $user, $password, $options);
                return $pdoInstance;
            } catch (PDOException $eSsl) {
                // Keep original or new exception
                $e = $eSsl;
            }
        }

        // If database does not exist (error 1049) on local environments, attempt auto-creation
        if ($isLocal && ($e->getCode() == 1049 || str_contains($e->getMessage(), 'Unknown database'))) {
            try {
                $serverDsn = "mysql:host={$host};port={$port};charset={$charset}";
                $serverPdo = new PDO($serverDsn, $user, $password, $options);
                $serverPdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
                $pdoInstance = new PDO($dbDsn, $user, $password, $options);
                return $pdoInstance;
            } catch (PDOException $e2) {
                renderDbError($e2);
            }
        } else {
            renderDbError($e);
        }
    }

    return $pdoInstance;
}

function renderDbError(PDOException $e): void {
    if (!empty($GLOBALS['THROW_DB_EXCEPTION'])) {
        throw $e;
    }

    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => 'Database Connection Failed',
        'message' => 'Could not connect to MySQL database. Please verify your environment variables or local database configuration.',
        'details' => $e->getMessage()
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
    exit;
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
 * Exposes `_id` as string alias of `id`, and normalizes numeric/boolean types.
 */
function formatRow(?array $row): ?array {
    if ($row === null) return null;

    if (isset($row['id'])) {
        $row['_id'] = (string) $row['id'];
    }

    if (isset($row['mustChangePassword'])) {
        $row['mustChangePassword'] = (bool) $row['mustChangePassword'];
    }

    $floatFields = [
        'unitCost', 'sellingPrice', 'subtotalAmount', 'taxAmount', 'totalAmount', 
        'taxRate', 'lowStockThreshold', 'amountRefunded', 'cost', 'totalCost', 'price'
    ];
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
        // Detect HTTPS (including cloud load balancers and reverse proxies)
        $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
            || (!empty($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https')
            || (!empty($_SERVER['SERVER_PORT']) && (int)$_SERVER['SERVER_PORT'] === 443);

        session_set_cookie_params([
            'lifetime' => 86400, // 24 hours
            'path' => '/',
            'domain' => '',
            'secure' => $isHttps,
            'httponly' => true,
            'samesite' => 'Lax'
        ]);

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
    return $_SERVER['REQUEST_METHOD'] ?? 'GET';
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
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}
