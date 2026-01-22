<?php

/**
 * ApiController
 *
 * Kontroler API (JSON). Odpowiada za endpointy pobierające i modyfikujące dane
 * z użyciem sesji (401/403) i zwracaniem spójnych odpowiedzi JSON.
 */

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../utils/Validator.php';

class ApiController extends AppController
{
    private const DEFAULT_ADMIN_EMAIL = 'admin@example.com';

    protected function requireLogin(): string
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            $this->json(['error' => 'unauthorized'], 401);
        }
        return $userId;
    }

    private function requireAdmin(): void
    {
        $this->requireLogin();
        if (!$this->isAdmin()) {
            $this->json(['error' => 'forbidden'], 403);
        }
    }

    private function passwordPolicyError(string $password): ?string
    {
        return Validator::passwordPolicyError($password);
    }

    private function json(array $payload, int $code = 200): void
    {
        $this->response->json($payload, $code);
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
        $params[':uid'] = $userId;

        if ($this->isAdmin()) {
            return '1=1';
        }
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
            $where[] = 'COALESCE(du.username, u.username) = :username';
            $params[':username'] = $username;
        }
        if ($q !== '') {
            $where[] = '(
              a.title ILIKE :q
              OR COALESCE(a.description, \'\') ILIKE :q
              OR COALESCE(a.done_description, \'\') ILIKE :q
              OR c.name ILIKE :q
              OR COALESCE(u.username, \'\') ILIKE :q
              OR COALESCE(du.username, \'\') ILIKE :q
            )';
            $params[':q'] = '%' . $q . '%';
        }

        $whereSql = implode(' AND ', $where);

        $orderBy = 'a.starts_at DESC';
        if ($status === 'done') {
            $orderBy = 'a.done_at DESC NULLS LAST';
        }

        $stmt = $pdo->prepare(
            'SELECT a.id, a.cat_id, c.name AS cat_name, c.avatar_path AS cat_avatar_path, '
            . 'u.username AS created_by_username, a.title, a.description, a.starts_at, a.status, '
            . 'a.done_at, a.done_description, du.username AS done_by_username '
            . 'FROM activities a '
            . 'JOIN cats c ON c.id = a.cat_id '
            . 'LEFT JOIN users u ON u.id = a.created_by '
            . 'LEFT JOIN users du ON du.id = a.done_by '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE ' . $whereSql . ' '
            . 'ORDER BY ' . $orderBy . ' '
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
            . 'SUM(CASE WHEN a.status = \'done\' THEN 1 ELSE 0 END) AS done_like_count '
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
        $this->requireAdmin();

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->query('SELECT id, username, email, first_name, last_name, role, is_blocked, last_login_at, avatar_path, created_at FROM users ORDER BY created_at DESC LIMIT 500');
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $this->json(['items' => $rows]);
    }

    public function adminStats(): void
    {
        $this->requireAdmin();

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->query(
            "SELECT COUNT(*)::int AS total_users, "
            . "SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END)::int AS admin_users, "
            . "SUM(CASE WHEN is_blocked THEN 1 ELSE 0 END)::int AS blocked_users "
            . "FROM users"
        );
        $row = $stmt->fetch(PDO::FETCH_ASSOC) ?: ['total_users' => 0, 'admin_users' => 0, 'blocked_users' => 0];
        $this->json(['item' => $row]);
    }

    public function adminUserUpdate(): void
    {
        $this->requireAdmin();

        $userId = trim((string)($_POST['user_id'] ?? ''));
        $firstName = trim((string)($_POST['first_name'] ?? ''));
        $lastName = trim((string)($_POST['last_name'] ?? ''));
        $newPassword = (string)($_POST['new_password'] ?? '');

        if ($userId === '') {
            $this->json(['error' => 'missing_user_id'], 400);
        }
        if ($firstName === '' || $lastName === '') {
            $this->json(['error' => 'invalid_name'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $emailStmt = $pdo->prepare('SELECT email FROM users WHERE id = :id');
        $emailStmt->execute([':id' => $userId]);
        $email = (string)($emailStmt->fetchColumn() ?? '');
        if ($email === '') {
            $this->json(['error' => 'not_found'], 404);
        }

        $pwdSql = '';
        $params = [
            ':id' => $userId,
            ':fn' => $firstName,
            ':ln' => $lastName,
        ];

        if (trim($newPassword) !== '') {
            $pwErr = $this->passwordPolicyError($newPassword);
            if ($pwErr) {
                $this->json(['error' => 'weak_password', 'message' => $pwErr], 400);
            }
            $pwdSql = ', password_hash = :ph';
            $params[':ph'] = password_hash($newPassword, PASSWORD_DEFAULT);
        }

        $stmt = $pdo->prepare('UPDATE users SET first_name = :fn, last_name = :ln' . $pwdSql . ', updated_at = NOW() WHERE id = :id');
        $stmt->execute($params);

        $this->json(['ok' => true]);
    }

    public function adminUserBlock(): void
    {
        $this->requireAdmin();

        $adminId = (string)($_SESSION['user_id'] ?? '');
        $userId = trim((string)($_POST['user_id'] ?? ''));
        $isBlocked = (string)($_POST['is_blocked'] ?? '') === '1';

        if ($userId === '') {
            $this->json(['error' => 'missing_user_id'], 400);
        }
        if ($userId === $adminId) {
            $this->json(['error' => 'cannot_block_self'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $emailStmt = $pdo->prepare('SELECT email FROM users WHERE id = :id');
        $emailStmt->execute([':id' => $userId]);
        $email = (string)($emailStmt->fetchColumn() ?? '');
        if (strtolower($email) === self::DEFAULT_ADMIN_EMAIL) {
            $this->json(['error' => 'protected_account'], 403);
        }

        $stmt = $pdo->prepare('UPDATE users SET is_blocked = :b, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':b' => $isBlocked ? 1 : 0, ':id' => $userId]);

        $this->json(['ok' => true]);
    }

    public function adminUserDelete(): void
    {
        $this->requireAdmin();

        $adminId = (string)($_SESSION['user_id'] ?? '');
        $userId = trim((string)($_POST['user_id'] ?? ''));

        if ($userId === '') {
            $this->json(['error' => 'missing_user_id'], 400);
        }
        if ($userId === $adminId) {
            $this->json(['error' => 'cannot_delete_self'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        try {
            $pdo->beginTransaction();

            $uStmt = $pdo->prepare('SELECT email, role FROM users WHERE id = :id');
            $uStmt->execute([':id' => $userId]);
            $uRow = $uStmt->fetch(PDO::FETCH_ASSOC) ?: null;
            if (!$uRow) {
                $pdo->rollBack();
                $this->json(['error' => 'not_found'], 404);
            }

            $email = strtolower((string)($uRow['email'] ?? ''));
            if ($email === self::DEFAULT_ADMIN_EMAIL) {
                $pdo->rollBack();
                $this->json(['error' => 'protected_account'], 403);
            }

            $role = (string)($uRow['role'] ?? '');
            if ($role === 'admin') {
                $cntStmt = $pdo->query("SELECT COUNT(*)::int FROM users WHERE role = 'admin'");
                $adminCount = (int)$cntStmt->fetchColumn();
                if ($adminCount <= 1) {
                    $pdo->rollBack();
                    $this->json(['error' => 'cannot_delete_last_admin'], 400);
                }
            }

            // 1) Usuń koty należące do użytkownika.
            // Dzięki FK ON DELETE CASCADE usunie to też: activities/logs/cat_photos/cat_caregivers dla tych kotów.
            $delCats = $pdo->prepare('DELETE FROM cats WHERE owner_id = :id');
            $delCats->execute([':id' => $userId]);

            // 2) Usuń przypisania opiekuna do cudzych kotów (jeśli był caregiverem innych).
            $delCaregiverLinks = $pdo->prepare('DELETE FROM cat_caregivers WHERE user_id = :id');
            $delCaregiverLinks->execute([':id' => $userId]);

            // 3) Usuń użytkownika.
            $delUser = $pdo->prepare('DELETE FROM users WHERE id = :id');
            $delUser->execute([':id' => $userId]);

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->json(['error' => 'delete_failed', 'message' => 'Nie udało się usunąć użytkownika.'], 500);
        }

        $this->json(['ok' => true]);
    }

    public function adminUserCreate(): void
    {
        $this->requireAdmin();

        $username = trim((string)($_POST['username'] ?? ''));
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $firstName = trim((string)($_POST['first_name'] ?? ''));
        $lastName = trim((string)($_POST['last_name'] ?? ''));
        $role = trim((string)($_POST['role'] ?? 'user'));
        $password = (string)($_POST['password'] ?? '');

        if (!Validator::isValidUsername($username)) {
            $this->json(['error' => 'invalid_username'], 400);
        }
        if (!Validator::isValidEmail($email)) {
            $this->json(['error' => 'invalid_email'], 400);
        }
        if (!Validator::isValidPersonName($firstName) || !Validator::isValidPersonName($lastName)) {
            $this->json(['error' => 'invalid_name'], 400);
        }

        $allowedRoles = ['user', 'admin'];
        if (!in_array($role, $allowedRoles, true)) {
            $this->json(['error' => 'invalid_role'], 400);
        }

        $pwErr = $this->passwordPolicyError($password);
        if ($pwErr) {
            $this->json(['error' => 'weak_password', 'message' => $pwErr], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $existsStmt = $pdo->prepare('SELECT 1 FROM users WHERE email = :e OR username = :u');
        $existsStmt->execute([':e' => $email, ':u' => $username]);
        if ((bool)$existsStmt->fetchColumn()) {
            $this->json(['error' => 'already_exists'], 409);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);

        $stmt = $pdo->prepare(
            'INSERT INTO users (username, email, first_name, last_name, password_hash, role, is_blocked) '
            . 'VALUES (:u, :e, :fn, :ln, :ph, :r, FALSE)'
        );

        try {
            $stmt->execute([
                ':u' => $username,
                ':e' => $email,
                ':fn' => $firstName,
                ':ln' => $lastName,
                ':ph' => $hash,
                ':r' => $role,
            ]);
        } catch (Throwable $e) {
            $this->json(['error' => 'failed'], 500);
        }

        $this->json(['ok' => true]);
    }

    public function cats(): void
    {
        $userId = $this->requireLogin();

        $db = new Database();
        $pdo = $db->connect();

        if ($this->isAdmin() && (($_GET['all'] ?? '') === '1')) {
            $stmt = $pdo->query("SELECT id, owner_id, name, breed, age, description, avatar_path, 1 AS is_owner FROM cats ORDER BY created_at DESC LIMIT 200");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->json(['items' => $rows]);
        }

        $ownedOnly = (string)($_GET['owned'] ?? '') === '1';
        if ($ownedOnly) {
            $stmt = $pdo->prepare('SELECT id, owner_id, name, breed, age, description, avatar_path, 1 AS is_owner FROM cats WHERE owner_id = :uid ORDER BY created_at DESC');
            $stmt->execute([':uid' => $userId]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->json(['items' => $rows]);
        }

        $stmt = $pdo->prepare(
            'SELECT c.id, c.owner_id, c.name, c.breed, c.age, c.description, c.avatar_path, '
            . '(CASE WHEN c.owner_id = :uid THEN 1 ELSE 0 END) AS is_owner '
            . 'FROM cats c '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE (c.owner_id = :uid OR cc.user_id IS NOT NULL) '
            . 'ORDER BY c.created_at DESC '
            . 'LIMIT 500'
        );
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

        $stmt = $pdo->prepare('SELECT id, owner_id, name, breed, age, description, avatar_path, (CASE WHEN owner_id = :uid THEN 1 ELSE 0 END) AS is_owner FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId, ':uid' => $userId]);
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

        if (!$this->isAdmin()) {
            $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :id');
            $stmt->execute([':id' => $catId]);
            $ownerId = $stmt->fetchColumn();
            if (!$ownerId || $ownerId !== $userId) {
                $this->json(['error' => 'forbidden'], 403);
            }
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
            $decoded = json_decode((string)$orderRaw, true);
            $order = is_array($decoded) ? $decoded : [];
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->isAdmin()) {
            $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :id');
            $stmt->execute([':id' => $catId]);
            $ownerId = $stmt->fetchColumn();
            if (!$ownerId || $ownerId !== $userId) {
                $this->json(['error' => 'forbidden'], 403);
            }
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

    public function caregivers(): void
    {
        $userId = $this->requireLogin();

        $db = new Database();
        $pdo = $db->connect();

        $catId = trim((string)($_GET['cat_id'] ?? ''));
        if ($catId === '') {
            $this->json(['error' => 'missing_cat_id'], 400);
        }

        $catStmt = $pdo->prepare('SELECT id, owner_id, name, avatar_path FROM cats WHERE id = :cid');
        $catStmt->execute([':cid' => $catId]);
        $cat = $catStmt->fetch(PDO::FETCH_ASSOC);
        if (!$cat) {
            $this->json(['error' => 'not_found'], 404);
        }

        if (!$this->isAdmin() && ($cat['owner_id'] ?? null) !== $userId) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $assignedStmt = $pdo->prepare(
            'SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_path '
            . 'FROM cat_caregivers cc '
            . 'JOIN users u ON u.id = cc.user_id '
            . 'WHERE cc.cat_id = :cid '
            . 'ORDER BY u.username ASC'
        );
        $assignedStmt->execute([':cid' => $catId]);
        $assigned = $assignedStmt->fetchAll(PDO::FETCH_ASSOC);

        $availableStmt = $pdo->prepare(
            'SELECT u.id, u.username, u.first_name, u.last_name, u.avatar_path '
            . 'FROM users u '
            . 'WHERE u.role = \'user\' '
            . 'AND u.id <> :owner '
            . 'AND u.id NOT IN (SELECT user_id FROM cat_caregivers WHERE cat_id = :cid) '
            . 'ORDER BY u.username ASC '
            . 'LIMIT 500'
        );
        $availableStmt->execute([':cid' => $catId, ':owner' => $cat['owner_id']]);
        $available = $availableStmt->fetchAll(PDO::FETCH_ASSOC);

        $this->json([
            'cat' => $cat,
            'assigned' => $assigned,
            'available' => $available,
        ]);
    }

    public function assignCaregiver(): void
    {
        $userId = $this->requireLogin();

        $catId = (string)($_POST['cat_id'] ?? '');
        $caregiverId = (string)($_POST['user_id'] ?? '');
        if ($catId === '' || $caregiverId === '') {
            $this->json(['error' => 'missing_params'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :cid');
        $stmt->execute([':cid' => $catId]);
        $ownerId = $stmt->fetchColumn();
        if (!$ownerId) {
            $this->json(['error' => 'not_found'], 404);
        }

        if (!$this->isAdmin() && $ownerId !== $userId) {
            $this->json(['error' => 'forbidden'], 403);
        }

        if ($caregiverId === $ownerId) {
            $this->json(['error' => 'invalid_caregiver'], 400);
        }

        $careStmt = $pdo->prepare('SELECT 1 FROM users WHERE id = :id AND role = \'user\'');
        $careStmt->execute([':id' => $caregiverId]);
        if (!(bool)$careStmt->fetchColumn()) {
            $this->json(['error' => 'invalid_caregiver'], 400);
        }

        $ins = $pdo->prepare('INSERT INTO cat_caregivers (cat_id, user_id) VALUES (:cid, :uid) ON CONFLICT DO NOTHING');
        $ins->execute([':cid' => $catId, ':uid' => $caregiverId]);

        $this->json(['ok' => true]);
    }

    public function unassignCaregiver(): void
    {
        $userId = $this->requireLogin();

        $catId = (string)($_POST['cat_id'] ?? '');
        $caregiverId = (string)($_POST['user_id'] ?? '');
        if ($catId === '' || $caregiverId === '') {
            $this->json(['error' => 'missing_params'], 400);
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :cid');
        $stmt->execute([':cid' => $catId]);
        $ownerId = $stmt->fetchColumn();
        if (!$ownerId) {
            $this->json(['error' => 'not_found'], 404);
        }

        if (!$this->isAdmin() && $ownerId !== $userId) {
            $this->json(['error' => 'forbidden'], 403);
        }

        $del = $pdo->prepare('DELETE FROM cat_caregivers WHERE cat_id = :cid AND user_id = :uid');
        $del->execute([':cid' => $catId, ':uid' => $caregiverId]);

        $this->json(['ok' => true]);
    }
}
