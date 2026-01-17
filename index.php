<?php

/**
 * Bootstrap aplikacji.
 *
 * Odpowiada wyłącznie za start sesji, rejestrację globalnej obsługi błędów
 * oraz uruchomienie routingu na podstawie obiektu Request.
 */
session_start();

require_once __DIR__ . '/src/ErrorHandler.php';
require_once __DIR__ . '/src/Http/Request.php';

ErrorHandler::register(function (): bool {
	$uri = (string)($_SERVER['REQUEST_URI'] ?? '');
	$path = (string)(parse_url($uri, PHP_URL_PATH) ?? '');
	$path = strtolower(trim($path, '/'));

	if ($path === '' || $path === 'login' || $path === 'register') {
		return false;
	}

	if (str_starts_with($path, 'api-')) {
		return true;
	}

	$accept = strtolower((string)($_SERVER['HTTP_ACCEPT'] ?? ''));
	if (str_contains($accept, 'application/json')) {
		return true;
	}

	$xhr = strtolower((string)($_SERVER['HTTP_X_REQUESTED_WITH'] ?? ''));
	return $xhr === 'xmlhttprequest';
});
require_once 'Routing.php';

$request = Request::fromGlobals();
Routing::run($request);