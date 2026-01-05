<?php

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../Database.php';

class ActivitiesController extends AppController
{
    private function requireLogin(): string
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            $url = "http://$_SERVER[HTTP_HOST]";
            header("Location: {$url}/login");
            exit;
        }

        return $userId;
    }

    private function isAdmin(): bool
    {
        return ($_SESSION['role'] ?? null) === 'admin';
    }

    private function redirect(string $path): void
    {
        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}{$path}");
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

    public function create(): void
    {
        $userId = $this->requireLogin();

        $catId = trim($_POST['cat_id'] ?? '');
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $date = trim($_POST['date'] ?? '');
        $time = trim($_POST['time'] ?? '');

        if ($catId === '') {
            $this->redirect('/details?err=missing_cat_id');
        }

        if ($title === '' || $date === '' || $time === '') {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=missing_fields');
        }

        $dt = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
        if (!$dt) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=invalid_datetime');
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            http_response_code(403);
            echo 'Forbidden';
            exit;
        }

        $startsAt = $dt->format('Y-m-d H:i:s');

        $stmt = $pdo->prepare(
            'INSERT INTO activities (cat_id, title, description, starts_at, status, created_by) '
            . 'VALUES (:cat_id, :title, :description, :starts_at, :status, :created_by)'
        );

        $stmt->execute([
            ':cat_id' => $catId,
            ':title' => $title,
            ':description' => ($description === '' ? null : $description),
            ':starts_at' => $startsAt,
            ':status' => 'planned',
            ':created_by' => $userId,
        ]);

        $this->redirect('/details?cat_id=' . urlencode($catId) . '&ok=activity_created');
    }

    public function update(): void
    {
        $userId = $this->requireLogin();

        $activityId = trim($_POST['activity_id'] ?? '');
        $catId = trim($_POST['cat_id'] ?? '');
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $date = trim($_POST['date'] ?? '');
        $time = trim($_POST['time'] ?? '');

        if ($catId === '') {
            $this->redirect('/details?err=missing_cat_id');
        }
        if ($activityId === '') {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=missing_activity_id');
        }
        if ($title === '' || $date === '' || $time === '') {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=missing_fields');
        }

        $dt = DateTime::createFromFormat('Y-m-d H:i', $date . ' ' . $time);
        if (!$dt) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=invalid_datetime');
        }

        $db = new Database();
        $pdo = $db->connect();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            http_response_code(403);
            echo 'Forbidden';
            exit;
        }

        // Ensure activity belongs to this cat (and exists)
        $check = $pdo->prepare('SELECT 1 FROM activities WHERE id = :id AND cat_id = :cid');
        $check->execute([':id' => $activityId, ':cid' => $catId]);
        if (!(bool)$check->fetchColumn()) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=activity_not_found');
        }

        $startsAt = $dt->format('Y-m-d H:i:s');

        $stmt = $pdo->prepare(
            'UPDATE activities '
            . 'SET title = :title, description = :description, starts_at = :starts_at '
            . 'WHERE id = :id AND cat_id = :cid'
        );

        $stmt->execute([
            ':title' => $title,
            ':description' => ($description === '' ? null : $description),
            ':starts_at' => $startsAt,
            ':id' => $activityId,
            ':cid' => $catId,
        ]);

        $this->redirect('/details?cat_id=' . urlencode($catId) . '&ok=activity_updated');
    }
}
