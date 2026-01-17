<?php

/**
 * ErrorHandler
 *
 * Centralna obsługa błędów i wyjątków (globalny handler). Zwraca JSON dla API
 * i minimalny HTML dla widoków, bez wycieku szczegółów błędu.
 */

final class ErrorHandler
{
    public static function register(callable $isApiRequest): void
    {
        set_error_handler(function (int $severity, string $message, string $file, int $line) {
            $ignore = [E_NOTICE, E_USER_NOTICE, E_DEPRECATED, E_USER_DEPRECATED];
            if (in_array($severity, $ignore, true)) {
                return true;
            }
            if (!(error_reporting() & $severity)) {
                return false;
            }
            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        set_exception_handler(function (Throwable $e) use ($isApiRequest) {
            self::renderException($e, (bool)call_user_func($isApiRequest));
        });

        register_shutdown_function(function () use ($isApiRequest) {
            $err = error_get_last();
            if (!$err) return;

            $fatal = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];
            if (!in_array($err['type'] ?? 0, $fatal, true)) return;

            self::renderException(
                new ErrorException((string)($err['message'] ?? 'Fatal error'), 0, (int)($err['type'] ?? 1), (string)($err['file'] ?? 'unknown'), (int)($err['line'] ?? 0)),
                (bool)call_user_func($isApiRequest)
            );
        });
    }

    private static function renderException(Throwable $e, bool $api): void
    {
        $canSendHeaders = (headers_sent() === false);
        if ($canSendHeaders) {
            http_response_code(500);
        }

        if ($api) {
            if ($canSendHeaders) {
                header('Content-Type: application/json; charset=utf-8');
            }
            echo json_encode([
                'error' => 'server_error',
                'message' => 'Wystąpił błąd serwera.',
            ], JSON_UNESCAPED_UNICODE);
            return;
        }

        if ($canSendHeaders) {
            header('Content-Type: text/html; charset=utf-8');
        }
        echo '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>500</title></head>'
           . '<body style="font-family:system-ui,Segoe UI,Arial,sans-serif;background:#eee;margin:0;padding:40px;">'
           . '<h1 style="margin:0 0 8px;">500</h1><p style="margin:0;">Wystąpił błąd serwera.</p>'
           . '</body></html>';
    }
}
