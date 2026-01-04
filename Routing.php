<?php

class Routing {

    // Tablica definicji naszych tras (ścieżek)
    // Klucz = ścieżka w URL (np. /login)
    // Wartość = nazwa pliku widoku (np. login.html)
    public static $routes = [
        'login' => 'login',        // Obsługuje /login
        'register' => 'register',  // Obsługuje /register
        'logout' => 'logout',
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
        'api-me' => 'api-me',
        'api-profile' => 'api-profile',
        'api-users' => 'api-users',
        'api-cats' => 'api-cats',
        'api-cat' => 'api-cat',
        'api-cat-photos' => 'api-cat-photos',
        'cat-photo-delete' => 'cat-photo-delete',
        'cat-photos-reorder' => 'cat-photos-reorder',
        'upload-user-avatar' => 'upload-user-avatar',
        'upload-cat-avatar' => 'upload-cat-avatar',
        'upload-cat-photo' => 'upload-cat-photo',
        'cat-create' => 'cat-create',
        'cat-update' => 'cat-update',
        'support-create' => 'support-create',
        'support-list' => 'support-list',
        '' => 'login'              // Obsługuje pustą ścieżkę (strona główna)
    ];

    private static function redirect(string $path): void
    {
        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}{$path}");
        exit;
    }

    private static function isLoggedIn(): bool
    {
        return !empty($_SESSION['user_id']);
    }

    private static function isAdmin(): bool
    {
        return ($_SESSION['role'] ?? null) === 'admin';
    }


    public static function run(string $path) {
        if (!array_key_exists($path, self::$routes)) {
            http_response_code(404);
            echo "nie znaleziono strony (404)";
            return;
        }

        $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

        // Auth guard for HTML pages.
        if ($method === 'GET') {
            $publicPages = ['', 'login', 'register'];
            $adminPages = ['settings', 'caregivers', 'reports'];
            $isHtmlPage = !in_array($path, [
                'api-me', 'api-cats', 'api-cat', 'api-cat-photos',
                'support-list'
            ], true);

            if ($isHtmlPage && !in_array($path, $publicPages, true) && $path !== 'logout') {
                if (!self::isLoggedIn()) {
                    self::redirect('/login');
                }
                if (in_array($path, $adminPages, true) && !self::isAdmin()) {
                    self::redirect('/dashboard?err=forbidden');
                }
            }
        }

        // Controller-based handling for JSON GET endpoints.
        if ($method === 'GET') {
            if ($path === 'logout') {
                require_once __DIR__ . '/src/controllers/SecurityController.php';
                $controller = new SecurityController();
                $controller->logout();
                return;
            }

            if ($path === 'api-me' || $path === 'api-profile' || $path === 'api-users' || $path === 'api-cats' || $path === 'api-cat' || $path === 'api-cat-photos') {
                require_once __DIR__ . '/src/controllers/ApiController.php';
                $controller = new ApiController();
                if ($path === 'api-me') {
                    $controller->me();
                    return;
                }
                if ($path === 'api-profile') {
                    $controller->profile();
                    return;
                }
                if ($path === 'api-users') {
                    $controller->users();
                    return;
                }
                if ($path === 'api-cats') {
                    $controller->cats();
                    return;
                }
                if ($path === 'api-cat') {
                    $controller->cat();
                    return;
                }
                $controller->catPhotos();
                return;
            }

            if ($path === 'support-list') {
                require_once __DIR__ . '/src/controllers/SupportController.php';
                $controller = new SupportController();
                $controller->list();
                return;
            }
        }

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

            if ($path === 'support-create') {
                require_once __DIR__ . '/src/controllers/SupportController.php';
                $controller = new SupportController();
                $controller->create();
                return;
            }

            if ($path === 'cat-photo-delete' || $path === 'cat-photos-reorder') {
                require_once __DIR__ . '/src/controllers/ApiController.php';
                $controller = new ApiController();
                if ($path === 'cat-photo-delete') {
                    $controller->deleteCatPhoto();
                    return;
                }
                $controller->reorderCatPhotos();
                return;
            }
        }

        // Default: render static view (HTML).
        $templateName = self::$routes[$path];
        $templatePath = 'public/views/'. $templateName .'.html';
        include $templatePath;
    }
}