<?php

class Routing {

    // Tablica definicji naszych tras (ścieżek)
    // Klucz = ścieżka w URL (np. /login)
    // Wartość = nazwa pliku widoku (np. login.html)
    public static $routes = [
        'login' => 'login',        // Obsługuje /login
        'register' => 'register',  // Obsługuje /register
        'dashboard' => 'dashboard',// Obsługuje /dashboard
        'details' => 'details',     // Obsługuje /details
        'settings' => 'settings',    //settings
        'logs' => 'logs',            //logi
        'schedule' => 'schedule',   //terminarz
        'cats' => 'cats',
        'caregivers' => 'caregivers',            //kocury
        'profile' => 'profile',                //profil
        'reports' => 'reports',                //raporty
        'help' => 'help',                      //pomoc
        'upload-user-avatar' => 'upload-user-avatar',
        'upload-cat-avatar' => 'upload-cat-avatar',
        'upload-cat-photo' => 'upload-cat-photo',
        'cat-create' => 'cat-create',
        'cat-update' => 'cat-update',
        '' => 'login'              // Obsługuje pustą ścieżkę (strona główna)
    ];


    public static function run(string $path) {
        if (!array_key_exists($path, self::$routes)) {
            http_response_code(404);
            echo "nie znaleziono strony (404)";
            return;
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // Controller-based handling for POST endpoints.
        if ($method === 'POST') {
            if ($path === 'login' || $path === 'register') {
                require_once __DIR__ . '/src/controllers/SecurityController.php';
                $controller = new SecurityController();
                if ($path === 'login') {
                    $controller->login();
                    return;
                }
                $controller->register();
                return;
            }

            if ($path === 'upload-user-avatar' || $path === 'upload-cat-avatar' || $path === 'upload-cat-photo') {
                require_once __DIR__ . '/src/controllers/UploadController.php';
                $controller = new UploadController();
                if ($path === 'upload-user-avatar') {
                    $controller->userAvatar();
                    return;
                }
                if ($path === 'upload-cat-avatar') {
                    $controller->catAvatar();
                    return;
                }
                $controller->catPhoto();
                return;
            }

            if ($path === 'cat-create' || $path === 'cat-update') {
                require_once __DIR__ . '/src/controllers/CatsController.php';
                $controller = new CatsController();
                if ($path === 'cat-create') {
                    $controller->create();
                    return;
                }
                $controller->update();
                return;
            }
        }

        // Default: render static view (HTML).
        $templateName = self::$routes[$path];
        $templatePath = 'public/views/'. $templateName .'.html';
        include $templatePath;
    }
}