<?php

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../Database.php';

class UploadController extends AppController
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

    private function redirect(string $path): void
    {
        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}{$path}");
        exit;
    }

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

    private function storeUpload(array $file, string $targetDir, string $targetBaseName): ?string
    {
        if (!isset($file['tmp_name']) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
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

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        $fileName = $targetBaseName . '.' . $ext;
        $targetPath = rtrim($targetDir, '/\\') . DIRECTORY_SEPARATOR . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return null;
        }

        return $fileName;
    }

    public function userAvatar(): void
    {
        $userId = $this->requireLogin();

        $fileName = $this->storeUpload(
            $_FILES['avatar'] ?? [],
            __DIR__ . '/../../public/uploads/avatars',
            'u-' . $userId
        );

        if (!$fileName) {
            $this->redirect('/profile?err=avatar');
        }

        $publicPath = '/public/uploads/avatars/' . $fileName;

        $db = new Database();
        $pdo = $db->connect();
        $stmt = $pdo->prepare('UPDATE users SET avatar_path = :p, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':p' => $publicPath, ':id' => $userId]);

        $this->redirect('/profile?ok=avatar');
    }

    public function catAvatar(): void
    {
        $userId = $this->requireLogin();
        $catId = $_POST['cat_id'] ?? '';
        if (!$catId) {
            $this->redirect('/cats?err=cat');
        }

        $db = new Database();
        $pdo = $db->connect();

        // Minimal permission: owner only (admin handling możesz dopiąć później)
        $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId]);
        $ownerId = $stmt->fetchColumn();

        if (!$ownerId || $ownerId !== $userId) {
            http_response_code(403);
            echo 'Forbidden';
            exit;
        }

        $fileName = $this->storeUpload(
            $_FILES['avatar'] ?? [],
            __DIR__ . '/../../public/uploads/cats',
            'c-' . $catId
        );

        if (!$fileName) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=avatar');
        }

        $publicPath = '/public/uploads/cats/' . $fileName;

        $stmt = $pdo->prepare('UPDATE cats SET avatar_path = :p, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':p' => $publicPath, ':id' => $catId]);

        $this->redirect('/details?cat_id=' . urlencode($catId) . '&ok=avatar');
    }

    public function catPhoto(): void
    {
        $userId = $this->requireLogin();
        $catId = $_POST['cat_id'] ?? '';
        if (!$catId) {
            $this->redirect('/cats?err=cat');
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('SELECT owner_id FROM cats WHERE id = :id');
        $stmt->execute([':id' => $catId]);
        $ownerId = $stmt->fetchColumn();

        if (!$ownerId || $ownerId !== $userId) {
            http_response_code(403);
            echo 'Forbidden';
            exit;
        }

        $file = $_FILES['photo'] ?? null;
        if (!$file || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=photo');
        }

        $ext = $this->detectImageExtension($file['tmp_name']);
        if (!$ext) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=type');
        }

        $targetDir = __DIR__ . '/../../public/uploads/cats/' . $catId;
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        $fileName = 'p-' . bin2hex(random_bytes(8)) . '.' . $ext;
        $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            $this->redirect('/details?cat_id=' . urlencode($catId) . '&err=move');
        }

        $publicPath = '/public/uploads/cats/' . $catId . '/' . $fileName;

        $stmt = $pdo->prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM cat_photos WHERE cat_id = :cat');
        $stmt->execute([':cat' => $catId]);
        $nextSort = (int)$stmt->fetchColumn();

        $stmt = $pdo->prepare('INSERT INTO cat_photos (cat_id, path, uploaded_by, sort_order) VALUES (:cat, :path, :uid, :s)');
        $stmt->execute([':cat' => $catId, ':path' => $publicPath, ':uid' => $userId, ':s' => $nextSort]);

        $this->redirect('/details?cat_id=' . urlencode($catId) . '&ok=photo');
    }
}
