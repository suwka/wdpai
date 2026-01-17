<?php

/**
 * Request
 *
 * Odpowiada za zebranie danych żądania HTTP (metoda, ścieżka, parametry, nagłówki, sesja)
 * w postaci obiektu. Dzięki temu reszta aplikacji nie musi bezpośrednio korzystać z superglobali.
 */
final class Request
{
    private string $method;
    private string $path;
    private array $query;
    private array $post;
    private array $files;
    private array $server;
    private array $session;
    public function __construct(
        string $method,
        string $path,
        array $query,
        array $post,
        array $files,
        array $server,
        array $session
    ) {
        $this->method = strtoupper($method);
        $this->path = strtolower(trim($path, '/'));
        $this->query = $query;
        $this->post = $post;
        $this->files = $files;
        $this->server = $server;
        $this->session = $session;
    }

    public static function fromGlobals(): self
    {
        $uri = (string)($_SERVER['REQUEST_URI'] ?? '');
        $path = (string)(parse_url($uri, PHP_URL_PATH) ?? '');

        return new self(
            (string)($_SERVER['REQUEST_METHOD'] ?? 'GET'),
            $path,
            $_GET ?? [],
            $_POST ?? [],
            $_FILES ?? [],
            $_SERVER ?? [],
            $_SESSION ?? []
        );
    }

    public function method(): string
    {
        return $this->method;
    }

    public function path(): string
    {
        return $this->path;
    }

    public function isGet(): bool
    {
        return $this->method === 'GET';
    }

    public function isPost(): bool
    {
        return $this->method === 'POST';
    }
    public function query(): array
    {
        return $this->query;
    }
    public function post(): array
    {
        return $this->post;
    }
    public function files(): array
    {
        return $this->files;
    }
    public function server(): array
    {
        return $this->server;
    }
    public function session(): array
    {
        return $this->session;
    }

    public function header(string $name): string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        return strtolower((string)($this->server[$key] ?? ''));
    }
}
