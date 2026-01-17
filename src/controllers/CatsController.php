<?php

/**
 * CatsController
 *
 * Kontroler HTML dla operacji CRUD kotów (tworzenie/edycja/usuwanie).
 * Waliduje dane i wykonuje operacje DB.
 */

require_once __DIR__ . '/AppController.php';

class CatsController extends AppController
{
    private function detectImageExtension(string $tmpPath): ?string
    {
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tmpPath);
            $allowed = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            ];
            return $allowed[$mime] ?? null;
        }

        $mime = mime_content_type($tmpPath);
        if ($mime === 'image/jpeg') return 'jpg';
        if ($mime === 'image/png') return 'png';
        if ($mime === 'image/webp') return 'webp';
        return null;
    }

    private function storeCatAvatar(string $catId): ?string
    {
        $file = $_FILES['avatar'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
            return null;
        }
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
            return null;
        }

        $maxBytes = 5 * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxBytes) {
            return null;
        }

        $ext = $this->detectImageExtension($file['tmp_name']);
        if (!$ext) {
            return null;
        }

        $targetDir = __DIR__ . '/../../public/uploads/cats';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        $fileName = 'c-' . $catId . '.' . $ext;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return null;
        }

        return '/public/uploads/cats/' . $fileName;
    }

    public function create(): void
    {
        $userId = $this->requireLogin();

        $name = trim($_POST['name'] ?? '');
        $age = $_POST['age'] ?? null;
        $breed = trim($_POST['breed'] ?? '');
        $description = trim($_POST['description'] ?? '');

        if ($name === '') {
            $this->redirect('/cats?err=cat_name');
        }

        $pdo = $this->db();

        $stmt = $pdo->prepare('INSERT INTO cats (owner_id, name, breed, age, description) VALUES (:owner, :name, :breed, :age, :desc) RETURNING id');
        $stmt->execute([
            ':owner' => $userId,
            ':name' => $name,
            ':breed' => $breed !== '' ? $breed : null,
            ':age' => ($age === '' || $age === null) ? null : (int)$age,
            ':desc' => $description !== '' ? $description : null,
        ]);

        $catId = $stmt->fetchColumn();

        $avatarPath = $this->storeCatAvatar($catId);
        if ($avatarPath) {
            $stmt = $pdo->prepare('UPDATE cats SET avatar_path = :p, updated_at = NOW() WHERE id = :id');
            $stmt->execute([':p' => $avatarPath, ':id' => $catId]);
        }

        $this->redirect('/cats?ok=created');
    }

    public function update(): void
    {
        $userId = $this->requireLogin();

        $catId = $_POST['cat_id'] ?? '';
        if (!$catId) {
            $this->redirect('/cats?err=no_cat');
        }

        $name = trim($_POST['name'] ?? '');
        $age = $_POST['age'] ?? null;
        $breed = trim($_POST['breed'] ?? '');
        $description = trim($_POST['description'] ?? '');

        if ($name === '') {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=cat_name');
        }

        $pdo = $this->db();

        $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId]);
        $ownerId = $stmt->fetchColumn();

        if (!$ownerId || $ownerId !== $userId) {
            $this->response->text('Forbidden', 403);
            return;
        }

        $stmt = $pdo->prepare('UPDATE cats SET name = :name, breed = :breed, age = :age, description = :desc, updated_at = NOW() WHERE id = :id');
        $stmt->execute([
            ':id' => $catId,
            ':name' => $name,
            ':breed' => $breed !== '' ? $breed : null,
            ':age' => ($age === '' || $age === null) ? null : (int)$age,
            ':desc' => $description !== '' ? $description : null,
        ]);

        $avatarPath = $this->storeCatAvatar($catId);
        if ($avatarPath) {
            $stmt = $pdo->prepare('UPDATE cats SET avatar_path = :p, updated_at = NOW() WHERE id = :id');
            $stmt->execute([':p' => $avatarPath, ':id' => $catId]);
        }

        $this->redirect('/details?cat_id=' . urlencode($catId) . '&ok=updated');
    }

    public function delete(): void
    {
        $userId = $this->requireLogin();

        $catId = $_POST['cat_id'] ?? '';
        if (!$catId) {
            $this->redirect('/settings?err=no_cat');
        }

        $pdo = $this->db();

        $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId]);
        $ownerId = $stmt->fetchColumn();

        if (!$ownerId) {
            $this->redirect('/settings?err=not_found');
        }

        if ($ownerId !== $userId && !$this->isAdmin()) {
            $this->response->text('Forbidden', 403);
            return;
        }

        $stmt = $pdo->prepare('DELETE FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId]);

        $this->redirect('/settings?ok=cat_deleted');
    }
}
