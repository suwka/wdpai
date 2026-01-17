<?php

/**
 * ActivitiesController
 *
 * Kontroler HTML dla aktywności (terminarz) – tworzenie i aktualizacja wpisów.
 */

require_once __DIR__ . '/AppController.php';

class ActivitiesController extends AppController
{
    public function create(): void
    {
        $userId = $this->requireLogin();

        $catId = trim($_POST['cat_id'] ?? '');
        $title = trim($_POST['title'] ?? '');
        $description = trim($_POST['description'] ?? '');
        $markDone = (string)($_POST['mark_done'] ?? '') === '1';
        $doneDescription = trim($_POST['done_description'] ?? '');
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

        $pdo = $this->db();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            $this->response->text('Forbidden', 403);
            return;
        }

        $startsAt = $dt->format('Y-m-d H:i:s');

        $status = $markDone ? 'done' : 'planned';
        $doneAt = $markDone ? (new DateTime())->format('Y-m-d H:i:s') : null;

        $stmt = $pdo->prepare(
            'INSERT INTO activities (cat_id, title, description, starts_at, status, done_at, done_by, done_description, created_by) '
            . 'VALUES (:cat_id, :title, :description, :starts_at, :status, :done_at, :done_by, :done_description, :created_by)'
        );

        $stmt->execute([
            ':cat_id' => $catId,
            ':title' => $title,
            ':description' => ($description === '' ? null : $description),
            ':starts_at' => $startsAt,
            ':status' => $status,
            ':done_at' => $doneAt,
            ':done_by' => $markDone ? $userId : null,
            ':done_description' => ($markDone && $doneDescription !== '') ? $doneDescription : null,
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
        $markDone = (string)($_POST['mark_done'] ?? '') === '1';
        $doneDescription = trim($_POST['done_description'] ?? '');
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

        $pdo = $this->db();

        if (!$this->canAccessCat($pdo, $userId, $catId)) {
            http_response_code(403);
            echo 'Forbidden';
            exit;
        }

        $check = $pdo->prepare('SELECT 1 FROM activities WHERE id = :id AND cat_id = :cid');
        $check->execute([':id' => $activityId, ':cid' => $catId]);
        if (!(bool)$check->fetchColumn()) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=activity_not_found');
        }

        $startsAt = $dt->format('Y-m-d H:i:s');

        if ($markDone) {
            $stmt = $pdo->prepare(
                'UPDATE activities '
                . 'SET title = :title, description = :description, starts_at = :starts_at, status = :status, done_at = NOW(), done_by = :done_by, done_description = :done_description, updated_at = NOW() '
                . 'WHERE id = :id AND cat_id = :cid'
            );
            $stmt->execute([
                ':title' => $title,
                ':description' => ($description === '' ? null : $description),
                ':starts_at' => $startsAt,
                ':status' => 'done',
                ':done_by' => $userId,
                ':done_description' => ($doneDescription === '' ? null : $doneDescription),
                ':id' => $activityId,
                ':cid' => $catId,
            ]);
        } else {
            $stmt = $pdo->prepare(
                'UPDATE activities '
                . 'SET title = :title, description = :description, starts_at = :starts_at, updated_at = NOW() '
                . 'WHERE id = :id AND cat_id = :cid'
            );
            $stmt->execute([
                ':title' => $title,
                ':description' => ($description === '' ? null : $description),
                ':starts_at' => $startsAt,
                ':id' => $activityId,
                ':cid' => $catId,
            ]);
        }

        $this->redirect('/details?cat_id=' . urlencode($catId) . '&ok=activity_updated');
    }
}
