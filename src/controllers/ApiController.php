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

        $stmt = $pdo->prepare('SELECT 1 FROM cats WHERE id = :id AND owner_id = :uid');
        $stmt->execute([':id' => $catId, ':uid' => $userId]);
        return (bool)$stmt->fetchColumn();
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
