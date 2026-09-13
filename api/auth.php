<?php
/**
 * Sunny & Scramble — Auth API (MySQL / PDO)
 * 
 * POST ?action=login   — Authenticate user
 * POST ?action=logout  — Destroy session
 * GET  ?action=check   — Check current session
 */

require_once __DIR__ . '/../config/db.php';

$action = $_GET['action'] ?? '';
$method = getRequestMethod();

switch ($action) {
    case 'login':
        if ($method !== 'POST') jsonResponse(['message' => 'Method not allowed'], 405);
        handleLogin();
        break;
    case 'logout':
        if ($method !== 'POST') jsonResponse(['message' => 'Method not allowed'], 405);
        handleLogout();
        break;
    case 'check':
        handleCheck();
        break;
    default:
        jsonResponse(['message' => 'Invalid action'], 400);
}

function handleLogin(): void {
    $data = getRequestBody();
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (!$email || !$password) {
        jsonResponse(['message' => 'Email and password are required'], 400);
    }

    $db = getDB();
    $stmt = $db->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user) {
        jsonResponse(['message' => 'User not found'], 404);
    }

    // Check if inactive
    if (($user['status'] ?? 'active') === 'inactive') {
        jsonResponse(['message' => 'Your account is inactive. Please contact the store owner or administrator.'], 403);
    }

    // Verify password
    if (!password_verify($password, $user['passwordHash'])) {
        jsonResponse(['message' => 'Invalid credentials'], 400);
    }

    // Start session
    initSession();
    $userData = [
        'id' => (string) $user['id'],
        '_id' => (string) $user['id'],
        'fullName' => $user['fullName'],
        'email' => $user['email'],
        'role' => $user['role'],
        'mustChangePassword' => (bool) ($user['mustChangePassword'] ?? false)
    ];
    $_SESSION['user'] = $userData;

    // Audit log
    auditLog($userData['id'], 'User logged in', 'Auth');

    jsonResponse([
        'message' => 'Login successful',
        'user' => $userData
    ]);
}

function handleLogout(): void {
    initSession();
    $user = getSessionUser();
    if ($user) {
        auditLog($user['id'], 'User logged out', 'Auth');
    }
    session_destroy();
    jsonResponse(['message' => 'Logged out successfully']);
}

function handleCheck(): void {
    $user = getSessionUser();
    if ($user) {
        jsonResponse(['authenticated' => true, 'user' => $user]);
    } else {
        jsonResponse(['authenticated' => false], 401);
    }
}
