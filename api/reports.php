<?php
/**
 * Sunny & Scramble — Reports API (MySQL / PDO)
 * 
 * GET ?action=summary              — Dashboard summary with period filter
 * GET ?action=sales-summary        — Sales list (date range)
 * GET ?action=expense-summary      — Delivery expenses (date range)
 * GET ?action=income-statement     — Revenue vs expenses
 */

require_once __DIR__ . '/../config/db.php';

$method = getRequestMethod();
if ($method !== 'GET') {
    jsonResponse(['message' => 'Method not allowed'], 405);
}

requireLogin();

$action = $_GET['action'] ?? 'summary';

switch ($action) {
    case 'summary':
        handleDashboardSummary();
        break;
    case 'sales-summary':
        handleSalesSummary();
        break;
    case 'expense-summary':
        handleExpenseSummary();
        break;
    case 'income-statement':
        handleIncomeStatement();
        break;
    default:
        jsonResponse(['message' => 'Invalid action'], 400);
}

function getDateRangeClause(string $period, string $columnName = 'createdAt'): array {
    if ($period === 'all-time' || !$period) {
        return ['', []];
    }

    $now = new DateTime();
    switch ($period) {
        case 'today':
            $start = (clone $now)->format('Y-m-d 00:00:00');
            $end = (clone $now)->format('Y-m-d 23:59:59');
            return [" AND {$columnName} >= :start_dt AND {$columnName} <= :end_dt", [':start_dt' => $start, ':end_dt' => $end]];
        case 'week':
            $start = (clone $now)->modify('-7 days')->format('Y-m-d 00:00:00');
            return [" AND {$columnName} >= :start_dt", [':start_dt' => $start]];
        case 'month':
            $start = (clone $now)->modify('first day of this month')->format('Y-m-d 00:00:00');
            return [" AND {$columnName} >= :start_dt", [':start_dt' => $start]];
        default:
            return ['', []];
    }
}

function handleDashboardSummary(): void {
    $pdo = getDB();
    $period = $_GET['period'] ?? 'today';

    // 1. Total Sales
    [$salesWhere, $salesParams] = getDateRangeClause($period, 'createdAt');
    $stmtSales = $pdo->prepare("SELECT COALESCE(SUM(totalAmount), 0) AS totalSales FROM sales WHERE 1=1 {$salesWhere}");
    $stmtSales->execute($salesParams);
    $totalSales = (float)$stmtSales->fetchColumn();

    // 2. Total Expenses (Deliveries)
    [$delWhere, $delParams] = getDateRangeClause($period, 'createdAt');
    $stmtDel = $pdo->prepare("SELECT COALESCE(SUM(totalCost), 0) AS totalExpenses, COUNT(*) AS totalDeliveries FROM deliveries WHERE 1=1 {$delWhere}");
    $stmtDel->execute($delParams);
    $delStats = $stmtDel->fetch();
    $totalExpenses = (float)($delStats['totalExpenses'] ?? 0);
    $totalDeliveries = (int)($delStats['totalDeliveries'] ?? 0);

    // 3. Spoilage count
    [$spoilWhere, $spoilParams] = getDateRangeClause($period, 'createdAt');
    $stmtSpoil = $pdo->prepare("SELECT COUNT(*) FROM spoilages WHERE 1=1 {$spoilWhere}");
    $stmtSpoil->execute($spoilParams);
    $totalSpoilage = (int)$stmtSpoil->fetchColumn();

    // 4. Low stock threshold and products
    $cfgStmt = $pdo->query("SELECT lowStockThreshold FROM store_config LIMIT 1");
    $cfg = $cfgStmt->fetch();
    $lowStockThreshold = (float)($cfg['lowStockThreshold'] ?? 20);

    // Low stock products
    $prodStmt = $pdo->query("SELECT * FROM products WHERE status != 'archived' ORDER BY productName ASC");
    $allProducts = $prodStmt->fetchAll();

    $lowStockProducts = [];
    foreach ($allProducts as $p) {
        $capacity = (int)($p['maxCapacity'] ?? 100);
        $quantity = (int)($p['quantity'] ?? 0);
        $pct = $capacity > 0 ? ($quantity / $capacity) * 100 : 0;
        if ($pct <= $lowStockThreshold) {
            $lowStockProducts[] = formatRow($p);
        }
    }

    // 5. Last 6 months revenue
    $monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    $monthlyRevenue = [];
    $now = new DateTime();
    for ($i = 5; $i >= 0; $i--) {
        $d = (clone $now)->modify("-{$i} months");
        $key = $d->format('Y-m');
        $monthlyRevenue[$key] = [
            'month' => $monthNames[(int)$d->format('n') - 1],
            'revenue' => 0.0
        ];
    }

    $sixMonthsAgo = (clone $now)->modify('-5 months')->modify('first day of this month')->format('Y-m-d 00:00:00');
    $stmtTrend = $pdo->prepare(
        "SELECT DATE_FORMAT(createdAt, '%Y-%m') AS yr_m, SUM(totalAmount) AS rev
         FROM sales
         WHERE createdAt >= :since
         GROUP BY yr_m"
    );
    $stmtTrend->execute([':since' => $sixMonthsAgo]);
    $trendRows = $stmtTrend->fetchAll();

    foreach ($trendRows as $row) {
        $ym = $row['yr_m'];
        if (isset($monthlyRevenue[$ym])) {
            $monthlyRevenue[$ym]['revenue'] = (float)$row['rev'];
        }
    }

    $last6MonthsRevenue = array_values($monthlyRevenue);

    jsonResponse([
        'totalSales' => $totalSales,
        'totalExpenses' => $totalExpenses,
        'netProfit' => round($totalSales - $totalExpenses, 2),
        'lowStockCount' => count($lowStockProducts),
        'lowStockProducts' => $lowStockProducts,
        'totalDeliveries' => $totalDeliveries,
        'totalSpoilage' => $totalSpoilage,
        'last6MonthsRevenue' => $last6MonthsRevenue
    ]);
}

function handleSalesSummary(): void {
    $pdo = getDB();
    $where = [];
    $params = [];

    if (!empty($_GET['startDate']) && !empty($_GET['endDate'])) {
        $where[] = "s.createdAt >= :start AND s.createdAt <= :end";
        $params[':start'] = $_GET['startDate'] . ' 00:00:00';
        $params[':end'] = $_GET['endDate'] . ' 23:59:59';
    }

    $sql = "SELECT s.*, u.fullName AS cashierName 
            FROM sales s 
            LEFT JOIN users u ON s.recordedBy = u.id";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    $sql .= " ORDER BY s.saleDate DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $sales = $stmt->fetchAll();

    // Attach items for each sale
    foreach ($sales as &$s) {
        $itemStmt = $pdo->prepare(
            "SELECT si.*, p.productName 
             FROM sale_items si
             LEFT JOIN products p ON si.productId = p.id
             WHERE si.saleId = :saleId"
        );
        $itemStmt->execute([':saleId' => $s['id']]);
        $s['items'] = formatRows($itemStmt->fetchAll());
        $s['totalAmount'] = (float)$s['totalAmount'];
        $s['subtotalAmount'] = (float)$s['subtotalAmount'];
        $s['taxAmount'] = (float)$s['taxAmount'];
    }

    jsonResponse(formatRows($sales));
}

function handleExpenseSummary(): void {
    $pdo = getDB();
    $where = [];
    $params = [];

    if (!empty($_GET['startDate']) && !empty($_GET['endDate'])) {
        $where[] = "d.createdAt >= :start AND d.createdAt <= :end";
        $params[':start'] = $_GET['startDate'] . ' 00:00:00';
        $params[':end'] = $_GET['endDate'] . ' 23:59:59';
    }

    $sql = "SELECT d.id, d.createdAt AS expenseDate, d.totalCost, p.productName
            FROM deliveries d
            LEFT JOIN products p ON d.productId = p.id";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    $sql .= " ORDER BY d.createdAt DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $deliveries = $stmt->fetchAll();

    $result = [];
    foreach ($deliveries as $del) {
        $prodName = $del['productName'] ?? 'Unknown Product';
        $result[] = [
            'id' => (string)$del['id'],
            '_id' => (string)$del['id'],
            'expenseDate' => $del['expenseDate'],
            'category' => "Restock: {$prodName}",
            'totalCost' => (float)$del['totalCost']
        ];
    }

    jsonResponse($result);
}

function handleIncomeStatement(): void {
    $pdo = getDB();
    $salesWhere = [];
    $delWhere = [];
    $params = [];

    if (!empty($_GET['startDate']) && !empty($_GET['endDate'])) {
        $start = $_GET['startDate'] . ' 00:00:00';
        $end = $_GET['endDate'] . ' 23:59:59';

        $salesWhere[] = "createdAt >= :start AND createdAt <= :end";
        $delWhere[] = "createdAt >= :start AND createdAt <= :end";
        $params[':start'] = $start;
        $params[':end'] = $end;
    }

    $sqlSales = "SELECT COALESCE(SUM(totalAmount), 0) FROM sales";
    if (!empty($salesWhere)) {
        $sqlSales .= " WHERE " . implode(' AND ', $salesWhere);
    }
    $stmtSales = $pdo->prepare($sqlSales);
    $stmtSales->execute($params);
    $totalSales = (float)$stmtSales->fetchColumn();

    $sqlDel = "SELECT COALESCE(SUM(totalCost), 0) FROM deliveries";
    if (!empty($delWhere)) {
        $sqlDel .= " WHERE " . implode(' AND ', $delWhere);
    }
    $stmtDel = $pdo->prepare($sqlDel);
    $stmtDel->execute($params);
    $totalExpenses = (float)$stmtDel->fetchColumn();

    jsonResponse([
        'revenue' => $totalSales,
        'expenses' => $totalExpenses,
        'netIncome' => round($totalSales - $totalExpenses, 2)
    ]);
}
