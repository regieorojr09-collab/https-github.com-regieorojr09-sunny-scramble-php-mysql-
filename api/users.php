<?php
/**
 * Sunny & Scramble — Users API (MySQL / PDO)
 * 
 * GET                          — List all users
 * POST                         — Create user (admin+)
 * PUT ?id=X                    — Update user
 * DELETE ?id=X                 — Delete user
 * PUT ?action=change-password  — Change own password
 * PUT ?action=reset-password&id=X — Reset user password (admin+)
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();
$action = $_GET['action'] ?? '';
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($action === 'change-password' && $method === 'PUT') {
    handleChangePassword();
} elseif ($action === 'reset-password' && $method === 'PUT') {
    handleResetPassword($id);
} else {
    switch ($method) {
        case 'GET':
            requireLogin();
            handleGetUsers();
            break;
        case 'POST':
            requireAdmin();
            handleCreateUser();
            break;
        case 'PUT':
            requireAdmin();
            handleUpdateUser($id);
            break;
        case 'DELETE':
            requireAdmin();
            handleDeleteUser($id);
            break;
        default:
            jsonResponse(['message' => 'Method not allowed'], 405);
    }
}

function handleGetUsers(): void {
    $pdo = getDB();
    $stmt = $pdo->query(
        "SELECT id, fullName, email, role, mustChangePassword, status, createdAt, updatedAt 
         FROM users 
         ORDER BY fullName ASC"
    );
    $users = $stmt->fetchAll();

    foreach ($users as &$u) {
        $u['mustChangePassword'] = (bool)$u['mustChangePassword'];
    }

    jsonResponse(formatRows($users));
}

function handleCreateUser(): void {
    $pdo = getDB();
    $data = getRequestBody();
    $fullName = trim($data['fullName'] ?? '');
    $email = trim($data['email'] ?? '');
    $role = $data['role'] ?? 'staff';

    if (!$fullName || !$email) {
        jsonResponse(['message' => 'Full name and email are required'], 400);
    }

    // Check email uniqueness
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :email");
    $stmt->execute([':email' => $email]);
    if ($stmt->fetch()) {
        jsonResponse(['message' => 'User already exists'], 400);
    }

    // Generate random 8-character password
    $generatedPassword = bin2hex(random_bytes(4));
    $passwordHash = password_hash($generatedPassword, PASSWORD_DEFAULT);

    $stmtIns = $pdo->prepare(
        "INSERT INTO users (fullName, email, role, passwordHash, mustChangePassword, status, createdAt, updatedAt)
         VALUES (:fullName, :email, :role, :passwordHash, 1, 'active', NOW(), NOW())"
    );
    $stmtIns->execute([
        ':fullName' => $fullName,
        ':email' => $email,
        ':role' => $role,
        ':passwordHash' => $passwordHash
    ]);

    $newId = (int)$pdo->lastInsertId();

    $admin = getSessionUser();
    auditLog($admin['id'] ?? null, "Created user: {$fullName} ({$role})", 'Users');

    jsonResponse([
        'message' => 'User created successfully',
        'user' => [
            'id' => (string)$newId,
            '_id' => (string)$newId,
            'fullName' => $fullName,
            'email' => $email,
            'role' => $role
        ],
        'generatedPassword' => $generatedPassword
    ], 201);
}

function handleUpdateUser(?int $id): void {
    if (!$id || $id <= 0) {
        jsonResponse(['message' => 'User ID required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonResponse(['message' => 'User not found'], 404);
    }

    $data = getRequestBody();
    $fields = [];
    $params = [':id' => $id];

    if (isset($data['fullName'])) {
        $fields[] = "fullName = :fullName";
        $params[':fullName'] = trim($data['fullName']);
    }
    if (isset($data['email'])) {
        $fields[] = "email = :email";
        $params[':email'] = trim($data['email']);
    }
    if (isset($data['role'])) {
        $fields[] = "role = :role";
        $params[':role'] = $data['role'];
    }
    if (isset($data['status'])) {
        $fields[] = "status = :status";
        $params[':status'] = $data['status'];
    }

    if (empty($fields)) {
        jsonResponse(['message' => 'No fields to update'], 400);
    }

    $fields[] = "updatedAt = NOW()";
    $sql = "UPDATE users SET " . implode(', ', $fields) . " WHERE id = :id";
    $stmtUpd = $pdo->prepare($sql);
    $stmtUpd->execute($params);

    $admin = getSessionUser();
    auditLog($admin['id'] ?? null, "Updated user: " . ($data['fullName'] ?? $user['fullName']), 'Users');

    // Fetch updated user
    $stmtAfter = $pdo->prepare("SELECT id, fullName, email, role, mustChangePassword, status, createdAt, updatedAt FROM users WHERE id = :id");
    $stmtAfter->execute([':id' => $id]);
    $updatedUser = $stmtAfter->fetch();
    $updatedUser['mustChangePassword'] = (bool)$updatedUser['mustChangePassword'];

    jsonResponse(['message' => 'User updated successfully', 'user' => formatRow($updatedUser)]);
}

function handleDeleteUser(?int $id): void {
    if (!$id || $id <= 0) {
        jsonResponse(['message' => 'User ID required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    if (!$user) {
        jsonResponse(['message' => 'User not found'], 404);
    }

    if ($user['role'] === 'owner' || $user['role'] === 'superadmin') {
        jsonResponse(['message' => 'Owner/superadmin account cannot be deleted'], 403);
    }

    $stmtDel = $pdo->prepare("DELETE FROM users WHERE id = :id");
    $stmtDel->execute([':id' => $id]);

    $admin = getSessionUser();
    auditLog($admin['id'] ?? null, "Deleted user: " . ($user['fullName'] ?? (string)$id), 'Users');

    jsonResponse(['message' => 'User deleted successfully']);
}

function handleChangePassword(): void {
    $user = requireLogin();
    $data = getRequestBody();
    $newPassword = $data['newPassword'] ?? '';

    if (strlen($newPassword) < 6) {
        jsonResponse(['message' => 'Password must be at least 6 characters'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute([':id' => (int)$user['id']]);
    $userDoc = $stmt->fetch();
    if (!$userDoc) {
        jsonResponse(['message' => 'User not found'], 404);
    }

    // If not forced change, verify current password
    if (!(bool)$userDoc['mustChangePassword']) {
        $currentPassword = $data['currentPassword'] ?? '';
        if (!$currentPassword) {
            jsonResponse(['message' => 'Current password is required'], 400);
        }
        if (!password_verify($currentPassword, $userDoc['passwordHash'])) {
            jsonResponse(['message' => 'Incorrect current password'], 400);
        }
    }

    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $stmtUpd = $pdo->prepare("UPDATE users SET passwordHash = :hash, mustChangePassword = 0, updatedAt = NOW() WHERE id = :id");
    $stmtUpd->execute([
        ':hash' => $newHash,
        ':id' => (int)$user['id']
    ]);

    // Update session
    initSession();
    $_SESSION['user']['mustChangePassword'] = false;

    auditLog($user['id'], 'Changed own password', 'Users');

    jsonResponse(['message' => 'Password updated successfully']);
}

function handleResetPassword(?int $id): void {
    requireAdmin();

    if (!$id || $id <= 0) {
        jsonResponse(['message' => 'User ID required'], 400);
    }

    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE id = :id");
    $stmt->execute([':id' => $id]);
    $userDoc = $stmt->fetch();
    if (!$userDoc) {
        jsonResponse(['message' => 'User not found'], 404);
    }

    $generatedPassword = bin2hex(random_bytes(4));
    $passwordHash = password_hash($generatedPassword, PASSWORD_DEFAULT);

    $stmtUpd = $pdo->prepare("UPDATE users SET passwordHash = :hash, mustChangePassword = 1, updatedAt = NOW() WHERE id = :id");
    $stmtUpd->execute([
        ':hash' => $passwordHash,
        ':id' => $id
    ]);

    $admin = getSessionUser();
    auditLog($admin['id'] ?? null, "Reset password for user: " . ($userDoc['fullName'] ?? (string)$id), 'Users');

    jsonResponse(['message' => 'Password reset successfully', 'generatedPassword' => $generatedPassword]);
}
