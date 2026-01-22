<?php

/**
 * Response
 *
 * Odpowiada za wysyłanie odpowiedzi HTTP (HTML/JSON/redirect) w spójny sposób.
 * Dzięki temu logika kontrolerów/routera nie jest „strukturalna” (echo/header porozrzucane po kodzie).
 */
final class Response
{
    public function redirect(string $path, int $code = 302): void
    {
        http_response_code($code);
        header('Location: ' . $path);
        exit;
    }

    public function json(array $payload, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE);
        exit;
    }

    public function text(string $text, int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: text/plain; charset=utf-8');
        echo $text;
    }

    public function view(string $template, array $variables = [], int $code = 200): void
    {
        http_response_code($code);
        header('Content-Type: text/html; charset=utf-8');

        $templatePath = 'public/views/' . $template . '.html';
        if (!file_exists($templatePath)) {
            $this->text('File not found', 404);
            return;
        }

        extract($variables);
        ob_start();
        include $templatePath;
        echo ob_get_clean();
    }

    public function error(int $code = 500): void
    {
        http_response_code($code);
        header('Content-Type: text/html; charset=utf-8');

        $templatePath = 'public/views/error-' . $code . '.html';
        if (!file_exists($templatePath)) {
            $this->text('Error: ' . $code, $code);
            return;
        }

        include $templatePath;
        exit;
    }}