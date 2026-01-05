<?php

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../Database.php';

class ApiController extends AppController
{
    private function requireLogin(): string
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'unauthorized']);
            exit;
        }
        return $userId;
    }

    private function isAdmin(): bool
    {
        return ($_SESSION['role'] ?? null) === 'admin';
    }

    private function json(array $payload, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    private function canAccessCat(PDO $pdo, string $userId, string $catId): bool
    {
        if ($this->isAdmin()) return true;

        $stmt = $pdo->prepare(
            'SELECT 1 '
            . 'FROM cats c '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE c.id = :cid AND (c.owner_id = :uid OR cc.user_id IS NOT NULL)'
        );
        $stmt->execute([':cid' => $catId, ':uid' => $userId]);
        return (bool)$stmt->fetchColumn();
    }

    public function catActivities(): void
    {
        $userId = $this->requireLogin();
        $catId = $_GET['cat_id'] ?? '';
        if (!$catId) {
            $this->json(['error' => 'missing_cat_id'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $stmt = $pdo->prepare(
            "SELECT id, cat_id, title, description, starts_at, status "
            . "FROM activities "
            . "WHERE cat_id = :cid AND status = 'planned' AND starts_at >= NOW() "
            . "ORDER BY starts_at ASC "
            . "LIMIT 200"
        );
        $stmt->execute([':cid' => $catId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->json(['items' => $rows]);
    }

    private function activitiesAccessSql(string $userId, array &$params): string
    {
        if ($this->isAdmin()) {
            return '1=1';
        }

        $params[':uid'] = $userId;
        return '(c.owner_id = :uid OR cc.user_id IS NOT NULL)';
    }

    public function activities(): void
    {
        $userId = $this->requireLogin();

        $status = trim((string)($_GET['status'] ?? ''));
        $q = trim((string)($_GET['q'] ?? ''));
        $catName = trim((string)($_GET['cat_name'] ?? ''));
        $username = trim((string)($_GET['username'] ?? ''));
        $futureOnly = (string)($_GET['future'] ?? '') === '1';
        $pastOnly = (string)($_GET['past'] ?? '') === '1';

        $allowedStatuses = ['planned', 'done', 'cancelled'];
        if ($status !== '' && !in_array($status, $allowedStatuses, true)) {
            $this->json(['error' => 'invalid_status'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $params = [];
        $where = [];
        $where[] = $this->activitiesAccessSql($userId, $params);

        if ($status !== '') {
            $where[] = 'a.status = :status';
            $params[':status'] = $status;
        }
        if ($futureOnly) {
            $where[] = 'a.starts_at >= NOW()';
        }
        if ($pastOnly) {
            $where[] = 'a.starts_at <= NOW()';
        }
        if ($catName !== '') {
            $where[] = 'c.name = :cat_name';
            $params[':cat_name'] = $catName;
        }
        if ($username !== '') {
            $where[] = 'u.username = :username';
            $params[':username'] = $username;
        }
        if ($q !== '') {
            $where[] = '(a.title ILIKE :q OR COALESCE(a.description, \'\') ILIKE :q OR c.name ILIKE :q OR COALESCE(u.username, \'\') ILIKE :q)';
            $params[':q'] = '%' . $q . '%';
        }

        $whereSql = implode(' AND ', $where);

        $stmt = $pdo->prepare(
            'SELECT a.id, a.cat_id, c.name AS cat_name, c.avatar_path AS cat_avatar_path, '
            . 'u.username AS created_by_username, a.title, a.description, a.starts_at, a.status '
            . 'FROM activities a '
            . 'JOIN cats c ON c.id = a.cat_id '
            . 'LEFT JOIN users u ON u.id = a.created_by '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE ' . $whereSql . ' '
            . 'ORDER BY a.starts_at DESC '
            . 'LIMIT 200'
        );

        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->json(['items' => $rows]);
    }

    public function activitiesCalendar(): void
    {
        $userId = $this->requireLogin();

        $from = trim((string)($_GET['from'] ?? ''));
        $to = trim((string)($_GET['to'] ?? ''));
        if ($from === '' || $to === '') {
            $this->json(['error' => 'missing_range'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $params = [':from' => $from, ':to' => $to];
        $accessSql = $this->activitiesAccessSql($userId, $params);

        $stmt = $pdo->prepare(
            'SELECT to_char(date_trunc(\'day\', a.starts_at), \'YYYY-MM-DD\') AS day, '
            . 'SUM(CASE WHEN a.status = \'planned\' AND a.starts_at >= NOW() THEN 1 ELSE 0 END) AS planned_future_count, '
            . 'SUM(CASE WHEN a.starts_at < NOW() AND a.status <> \'cancelled\' THEN 1 ELSE 0 END) AS done_like_count '
            . 'FROM activities a '
            . 'JOIN cats c ON c.id = a.cat_id '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE ' . $accessSql . ' AND a.starts_at >= :from::date AND a.starts_at < :to::date '
            . 'GROUP BY 1 '
            . 'ORDER BY 1 ASC'
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->json(['items' => $rows]);
    }

    public function activitiesDay(): void
    {
        $userId = $this->requireLogin();

        $date = trim((string)($_GET['date'] ?? ''));
        if ($date === '') {
            $this->json(['error' => 'missing_date'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $params = [':day' => $date];
        $accessSql = $this->activitiesAccessSql($userId, $params);

        $stmt = $pdo->prepare(
            'SELECT a.id, a.cat_id, c.name AS cat_name, a.title, a.description, a.starts_at, a.status '
            . 'FROM activities a '
            . 'JOIN cats c ON c.id = a.cat_id '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE ' . $accessSql . ' '
            . 'AND a.starts_at >= :day::date AND a.starts_at < (:day::date + INTERVAL \'1 day\') '
            . 'AND a.status <> \'cancelled\' '
            . 'ORDER BY a.starts_at ASC '
            . 'LIMIT 500'
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->json(['items' => $rows]);
    }

    public function me(): void
    {
        $this->requireLogin();
        $this->json([
            'id' => $_SESSION['user_id'] ?? null,
            'username' => $_SESSION['username'] ?? null,
            'role' => $_SESSION['role'] ?? null,
        ]);
    }

    public function profile(): void
    {
        $userId = $this->requireLogin();

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('SELECT id, username, email, first_name, last_name, role, avatar_path FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $this->json(['error' => 'not_found'], 404);
        }

        $this->json(['item' => $row]);
    }

    public function users(): void
    {
        $this->requireLogin();
        if (!$this->isAdmin()) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->query('SELECT id, username, email, first_name, last_name, role, avatar_path, created_at FROM users ORDER BY created_at DESC LIMIT 200');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->json(['items' => $rows]);
    }

    public function cats(): void
    {
        $userId = $this->requireLogin();

        $db = new Database();
        $pdo = $db->connect();

        if ($this->isAdmin() && (($_GET['all'] ?? '') === '1')) {
            $stmt = $pdo->query('SELECT id, owner_id, name, breed, age, description, avatar_path FROM cats ORDER BY created_at DESC LIMIT 200');
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->json(['items' => $rows]);
        }

        $stmt = $pdo->prepare('SELECT id, owner_id, name, breed, age, description, avatar_path FROM cats WHERE owner_id = :uid ORDER BY created_at DESC');
        $stmt->execute([':uid' => $userId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->json(['items' => $rows]);
    }

    public function cat(): void
    {
        $userId = $this->requireLogin();
        $catId = $_GET['cat_id'] ?? '';
        if (!$catId) {
            $this->json(['error' => 'missing_cat_id'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $stmt = $pdo->prepare('SELECT id, owner_id, name, breed, age, description, avatar_path FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            $this->json(['error' => 'not_found'], 404);
        }

        $this->json(['item' => $row]);
    }

    public function catPhotos(): void
    {
        $userId = $this->requireLogin();
        $catId = $_GET['cat_id'] ?? '';
        if (!$catId) {
            $this->json(['error' => 'missing_cat_id'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $stmt = $pdo->prepare('SELECT id, cat_id, path, caption, sort_order, created_at FROM cat_photos WHERE cat_id = :cid ORDER BY sort_order ASC, created_at ASC');
        $stmt->execute([':cid' => $catId]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $this->json(['items' => $rows]);
    }

    public function dashboardActivities(): void
    {
        $userId = $this->requireLogin();

        $db = new Database();
        $pdo = $db->connect();

        // Recent = last activities that already started
        // Planned = next planned activities
        if ($this->isAdmin()) {
            $recentStmt = $pdo->query(
                "SELECT a.id, a.cat_id, c.name AS cat_name, a.title, a.starts_at, a.status\n" .
                "FROM activities a\n" .
                "JOIN cats c ON c.id = a.cat_id\n" .
                "WHERE a.starts_at <= NOW()\n" .
                "ORDER BY a.starts_at DESC\n" .
                "LIMIT 6"
            );
            $plannedStmt = $pdo->query(
                "SELECT a.id, a.cat_id, c.name AS cat_name, a.title, a.starts_at, a.status\n" .
                "FROM activities a\n" .
                "JOIN cats c ON c.id = a.cat_id\n" .
                "WHERE a.status = 'planned' AND a.starts_at >= NOW()\n" .
                "ORDER BY a.starts_at ASC\n" .
                "LIMIT 6"
            );

            $recent = $recentStmt->fetchAll(PDO::FETCH_ASSOC);
            $planned = $plannedStmt->fetchAll(PDO::FETCH_ASSOC);
            $this->json(['recent' => $recent, 'planned' => $planned]);
        }

        $recentStmt = $pdo->prepare(
            "SELECT DISTINCT a.id, a.cat_id, c.name AS cat_name, a.title, a.starts_at, a.status\n" .
            "FROM activities a\n" .
            "JOIN cats c ON c.id = a.cat_id\n" .
            "LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid\n" .
            "WHERE (c.owner_id = :uid OR cc.user_id IS NOT NULL) AND a.starts_at <= NOW()\n" .
            "ORDER BY a.starts_at DESC\n" .
            "LIMIT 6"
        );
        $recentStmt->execute([':uid' => $userId]);
        $recent = $recentStmt->fetchAll(PDO::FETCH_ASSOC);

        $plannedStmt = $pdo->prepare(
            "SELECT DISTINCT a.id, a.cat_id, c.name AS cat_name, a.title, a.starts_at, a.status\n" .
            "FROM activities a\n" .
            "JOIN cats c ON c.id = a.cat_id\n" .
            "LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid\n" .
            "WHERE (c.owner_id = :uid OR cc.user_id IS NOT NULL) AND a.status = 'planned' AND a.starts_at >= NOW()\n" .
            "ORDER BY a.starts_at ASC\n" .
            "LIMIT 6"
        );
        $plannedStmt->execute([':uid' => $userId]);
        $planned = $plannedStmt->fetchAll(PDO::FETCH_ASSOC);

        $this->json(['recent' => $recent, 'planned' => $planned]);
    }

    public function deleteCatPhoto(): void
    {
        $userId = $this->requireLogin();
        $catId = $_POST['cat_id'] ?? '';
        $photoId = $_POST['photo_id'] ?? '';

        if (!$catId || !$photoId) {
            $this->json(['error' => 'missing_params'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $stmt = $pdo->prepare('DELETE FROM cat_photos WHERE id = :pid AND cat_id = :cid');
        $stmt->execute([':pid' => $photoId, ':cid' => $catId]);

        $this->json(['ok' => true]);
    }

    public function reorderCatPhotos(): void
    {
        $userId = $this->requireLogin();
        $catId = $_POST['cat_id'] ?? '';
        $orderRaw = $_POST['order'] ?? null;

        if (!$catId || $orderRaw === null) {
            $this->json(['error' => 'missing_params'], 400);
        }

        $order = $orderRaw;
        if (!is_array($order)) {
            // Allow JSON string in order
            $decoded = json_decode((string)$orderRaw, true);
            $order = is_array($decoded) ? $decoded : [];
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $pdo->beginTransaction();
        try {
            $pos = 0;
            $stmt = $pdo->prepare('UPDATE cat_photos SET sort_order = :s WHERE id = :pid AND cat_id = :cid');
            foreach ($order as $photoId) {
                if (!is_string($photoId) || trim($photoId) === '') continue;
                $stmt->execute([':s' => $pos, ':pid' => $photoId, ':cid' => $catId]);
                $pos++;
            }
            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            $this->json(['error' => 'failed'], 500);
        }

        $this->json(['ok' => true]);
    }
}
