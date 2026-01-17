<?php

/**
 * AppController
 *
 * Bazowa klasa dla kontrolerów (MVC). Zapewnia wspólne zależności (Request/Response)
 * oraz podstawowe helpery: isGet/isPost i renderowanie widoków.
 */

require_once __DIR__ . '/../Http/Request.php';
require_once __DIR__ . '/../Http/Response.php';
require_once __DIR__ . '/../Database.php';

class AppController {
    protected Request $request;
    protected Response $response;

    public function __construct(?Request $request = null, ?Response $response = null)
    {
        $this->request = $request ?? Request::fromGlobals();
        $this->response = $response ?? new Response();
    }

    protected function isGet(): bool
    {
        return $this->request->isGet();
    }

    protected function isPost(): bool
    {
        return $this->request->isPost();
    }
    protected function render(string $template = null, array $variables = []): void
    {
        $this->response->view((string)$template, $variables);
    }

    protected function db(): PDO
    {
        $db = new Database();
        return $db->connect();
    }

    protected function isAdmin(): bool
    {
        return ($_SESSION['role'] ?? null) === 'admin';
    }

    protected function requireLogin(): string
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            $this->redirect('/login');
        }

        return $userId;
    }

    protected function redirect(string $path): void
    {
        $this->response->redirect($path);
    }

    protected function canAccessCat(PDO $pdo, string $userId, string $catId): bool
    {
        if ($this->isAdmin()) {
            return true;
        }

        $stmt = $pdo->prepare(
            'SELECT 1 '
            . 'FROM cats c '
            . 'LEFT JOIN cat_caregivers cc ON cc.cat_id = c.id AND cc.user_id = :uid '
            . 'WHERE c.id = :cid AND (c.owner_id = :uid OR cc.user_id IS NOT NULL)'
        );
        $stmt->execute([':cid' => $catId, ':uid' => $userId]);
        return (bool)$stmt->fetchColumn();
    }
}