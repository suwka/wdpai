<?php

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../Database.php';

class SupportController extends AppController
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

    private function requireAdmin(): void
    {
        $role = $_SESSION['role'] ?? null;
        if ($role !== 'admin') {
            http_response_code(403);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => 'forbidden']);
            exit;
        }
    }

    private function redirect(string $path): void
    {
        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}{$path}");
        exit;
    }

    public function create(): void
    {
        $userId = $this->requireLogin();

        $topic = trim($_POST['topic'] ?? '');
        $message = trim($_POST['message'] ?? '');

        if ($topic === '' || $message === '') {
            $this->redirect('/help?err=required');
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('INSERT INTO support_tickets (user_id, topic, message) VALUES (:uid, :topic, :msg)');
        $stmt->execute([
            ':uid' => $userId,
            ':topic' => $topic,
            ':msg' => $message,
        ]);

        $this->redirect('/help?ok=sent');
    }

    public function list(): void
    {
        $this->requireLogin();
        $this->requireAdmin();

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->query('
            SELECT t.id, t.topic, t.message, t.status, t.created_at,
                   u.username, u.email
            FROM support_tickets t
            LEFT JOIN users u ON u.id = t.user_id
            ORDER BY t.created_at DESC
            LIMIT 200
        ');

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['items' => $rows], JSON_UNESCAPED_UNICODE);
    }
}
