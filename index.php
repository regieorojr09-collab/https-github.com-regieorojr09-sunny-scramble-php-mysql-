<?php
/**
 * Sunny & Scramble — SPA Entry Point
 * 
 * Serves the single-page application shell.
 * All routing is handled client-side via hash-based navigation.
 */
session_start();
?><!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="Sunny &amp; Scramble — POS &amp; Inventory Management System. Manage products, sales, deliveries, and stock in one place.">
    <title>Sunny & Scramble — POS & Inventory</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="assets/css/style.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" defer></script>
</head>
<body>

    <!-- ▸ Login Screen -->
    <div id="login-screen" class="login-screen">
        <div class="login-card">
            <div class="login-brand">
                <div class="login-logo">🍳</div>
                <h1>Sunny & Scramble</h1>
                <p class="login-subtitle">POS & Inventory Management</p>
            </div>
            <form id="login-form" autocomplete="on">
                <div id="login-error" class="alert alert-error" style="display:none;"></div>
                <div class="form-group">
                    <label for="login-email">Email Address</label>
                    <input type="email" id="login-email" name="email" placeholder="admin@sunnyscramble.com" required autocomplete="email">
                </div>
                <div class="form-group">
                    <label for="login-password">Password</label>
                    <input type="password" id="login-password" name="password" placeholder="Enter your password" required autocomplete="current-password">
                </div>
                <button type="submit" id="login-btn" class="btn btn-primary btn-block">
                    <span id="login-btn-text">Sign In</span>
                    <span id="login-spinner" class="spinner" style="display:none;"></span>
                </button>
            </form>
        </div>
    </div>

    <!-- ▸ Force Change Password Modal -->
    <div id="force-password-modal" class="modal-overlay" style="display:none;">
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <h2>Change Your Password</h2>
            </div>
            <p class="text-muted mb-4">You must change your password before continuing.</p>
            <form id="force-password-form">
                <div id="force-pw-error" class="alert alert-error" style="display:none;"></div>
                <div class="form-group">
                    <label for="force-new-password">New Password</label>
                    <input type="password" id="force-new-password" required minlength="6" placeholder="Minimum 6 characters">
                </div>
                <div class="form-group">
                    <label for="force-confirm-password">Confirm Password</label>
                    <input type="password" id="force-confirm-password" required minlength="6" placeholder="Confirm your new password">
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary btn-block">Update Password</button>
                </div>
            </form>
        </div>
    </div>

    <!-- ▸ App Shell -->
    <div id="app-shell" class="app-shell" style="display:none;">
        <!-- Sidebar -->
        <aside id="sidebar" class="sidebar">
            <div class="sidebar-brand">
                <div class="sidebar-logo">🍳</div>
                <div class="sidebar-brand-text">
                    <h2>Sunny & Scramble</h2>
                    <span class="sidebar-version">v2.0</span>
                </div>
            </div>

            <nav class="sidebar-nav">
                <a href="#dashboard" class="nav-item" data-page="dashboard">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
                    Dashboard
                </a>
                <a href="#sales" class="nav-item" data-page="sales">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                    Sales (POS)
                </a>

                <div class="nav-group">
                    <div class="nav-group-label">INVENTORY</div>
                    <a href="#inventory" class="nav-item" data-page="inventory">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                        Master List
                    </a>
                    <a href="#deliveries" class="nav-item" data-page="deliveries">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                        Deliveries
                    </a>
                    <a href="#spoilage" class="nav-item" data-page="spoilage">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                        Spoilage
                    </a>
                </div>

                <a href="#transactions" class="nav-item" data-page="transactions">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                    Transactions
                </a>
                <a href="#suppliers" class="nav-item" data-page="suppliers">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Suppliers
                </a>
                <a href="#reports" class="nav-item" data-page="reports">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Reports
                </a>

                <div class="nav-group" id="nav-admin-group">
                    <div class="nav-group-label">ADMIN</div>
                    <a href="#users" class="nav-item" data-page="users">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                        Users
                    </a>
                    <a href="#audit-logs" class="nav-item" data-page="audit-logs">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        Audit Logs
                    </a>
                    <a href="#xml-sync" class="nav-item" data-page="xml-sync">
                        <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                        XML Sync
                    </a>
                </div>

                <a href="#settings" class="nav-item" data-page="settings">
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                    Settings
                </a>
            </nav>

            <div class="sidebar-footer">
                <div class="sidebar-user">
                    <div class="sidebar-user-avatar" id="sidebar-user-avatar">SA</div>
                    <div class="sidebar-user-info">
                        <span class="sidebar-user-name" id="sidebar-user-name">Super Admin</span>
                        <span class="sidebar-user-role" id="sidebar-user-role">superadmin</span>
                    </div>
                </div>
                <button id="logout-btn" class="btn btn-ghost btn-sm" title="Sign Out">
                    <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                </button>
            </div>
        </aside>

        <!-- Mobile Header -->
        <header class="mobile-header">
            <button id="mobile-menu-btn" class="mobile-menu-btn" aria-label="Open menu">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
            </button>
            <span class="mobile-brand">🍳 Sunny & Scramble</span>
            <button id="mobile-logout-btn" class="btn btn-ghost btn-sm" title="Sign Out">
                <svg class="icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
        </header>

        <!-- Main Content -->
        <main id="main-content" class="main-content">
            <div id="page-content" class="page-content">
                <!-- Dynamic content injected by JS router -->
            </div>
        </main>

        <!-- Sidebar Overlay (mobile) -->
        <div id="sidebar-overlay" class="sidebar-overlay"></div>
    </div>

    <script src="assets/js/app.js"></script>
</body>
</html>
