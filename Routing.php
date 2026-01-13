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
        'admin' => 'admin',
        'details' => 'details',     // Obsługuje /details
        'settings' => 'settings',    //settings
        'logs' => 'logs',            //logi
        'schedule' => 'schedule',   //terminarz
        'cats' => 'cats',
        'caregivers' => 'caregivers',
        'profile-update' => 'profile-update',
        'profile-password-update' => 'profile-password-update',
        'account-update' => 'account-update',
        'api-me' => 'api-me',
        'api-profile' => 'api-profile',
        'api-users' => 'api-users',
        'api-admin-stats' => 'api-admin-stats',
        'api-cats' => 'api-cats',
        'api-cat' => 'api-cat',
        'api-cat-photos' => 'api-cat-photos',
        'api-dashboard-activities' => 'api-dashboard-activities',
        'api-cat-activities' => 'api-cat-activities',
        'api-activities' => 'api-activities',
        'api-activities-calendar' => 'api-activities-calendar',
        'api-activities-day' => 'api-activities-day',
        'api-caregivers' => 'api-caregivers',
        'admin-user-update' => 'admin-user-update',
        'admin-user-create' => 'admin-user-create',
        'admin-user-block' => 'admin-user-block',
        'admin-user-delete' => 'admin-user-delete',
        'caregiver-assign' => 'caregiver-assign',
        'caregiver-unassign' => 'caregiver-unassign',
        'cat-photo-delete' => 'cat-photo-delete',
        'cat-photos-reorder' => 'cat-photos-reorder',
        'upload-user-avatar' => 'upload-user-avatar',
        'upload-cat-avatar' => 'upload-cat-avatar',
        'upload-cat-photo' => 'upload-cat-photo',
        'cat-create' => 'cat-create',
        'cat-update' => 'cat-update',
        'cat-delete' => 'cat-delete',
        'activity-create' => 'activity-create',
        'activity-update' => 'activity-update',
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

        // POST-only endpoints: never try to render them as HTML.
        if ($method === 'GET' && ($path === 'profile-update' || $path === 'profile-password-update' || $path === 'account-update')) {
            http_response_code(405);
            echo 'Method not allowed';
            return;
        }

        // Auth guard for HTML pages.
        if ($method === 'GET') {
            $publicPages = ['', 'login', 'register'];
            $adminPages = ['admin'];
            $isHtmlPage = !in_array($path, [
                'api-me', 'api-profile', 'api-users', 'api-admin-stats', 'api-cats', 'api-cat', 'api-cat-photos', 'api-dashboard-activities', 'api-cat-activities',
                'api-activities', 'api-activities-calendar', 'api-activities-day', 'api-caregivers'
            ], true);

            if ($isHtmlPage && !in_array($path, $publicPages, true) && $path !== 'logout') {
                if (!self::isLoggedIn()) {
                    self::redirect('/login');
                }

                // Admin allowed HTML pages: /admin and /settings (plus logout)
                $adminAllowed = array_merge($adminPages, ['settings']);
                if (self::isAdmin() && !in_array($path, $adminAllowed, true)) {
                    self::redirect('/admin');
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

            if ($path === 'api-me' || $path === 'api-profile' || $path === 'api-users' || $path === 'api-admin-stats' || $path === 'api-cats' || $path === 'api-cat' || $path === 'api-cat-photos' || $path === 'api-dashboard-activities' || $path === 'api-cat-activities' || $path === 'api-activities' || $path === 'api-activities-calendar' || $path === 'api-activities-day' || $path === 'api-caregivers') {
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
                if ($path === 'api-admin-stats') {
                    $controller->adminStats();
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
                if ($path === 'api-dashboard-activities') {
                    $controller->dashboardActivities();
                    return;
                }
                if ($path === 'api-cat-activities') {
                    $controller->catActivities();
                    return;
                }
                if ($path === 'api-activities') {
                    $controller->activities();
                    return;
                }
                if ($path === 'api-activities-calendar') {
                    $controller->activitiesCalendar();
                    return;
                }
                if ($path === 'api-activities-day') {
                    $controller->activitiesDay();
                    return;
                }
                if ($path === 'api-caregivers') {
                    $controller->caregivers();
                    return;
                }
                $controller->catPhotos();
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

            if ($path === 'profile-update' || $path === 'profile-password-update' || $path === 'account-update') {
                require_once __DIR__ . '/src/controllers/SecurityController.php';
                $controller = new SecurityController();
                if ($path === 'account-update') {
                    $controller->updateAccount();
                    return;
                }
                if ($path === 'profile-update') {
                    $controller->updateProfile();
                    return;
                }
                $controller->updatePassword();
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

            if ($path === 'cat-create' || $path === 'cat-update' || $path === 'cat-delete') {
                require_once __DIR__ . '/src/controllers/CatsController.php';
                $controller = new CatsController();
                if ($path === 'cat-create') {
                    $controller->create();
                    return;
                }
                if ($path === 'cat-update') {
                    $controller->update();
                    return;
                }
                $controller->delete();
                return;
            }

            if ($path === 'activity-create') {
                require_once __DIR__ . '/src/controllers/ActivitiesController.php';
                $controller = new ActivitiesController();
                $controller->create();
                return;
            }

            if ($path === 'activity-update') {
                require_once __DIR__ . '/src/controllers/ActivitiesController.php';
                $controller = new ActivitiesController();
                $controller->update();
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

            if ($path === 'admin-user-update' || $path === 'admin-user-create' || $path === 'admin-user-block' || $path === 'admin-user-delete') {
                require_once __DIR__ . '/src/controllers/ApiController.php';
                $controller = new ApiController();
                if ($path === 'admin-user-update') {
                    $controller->adminUserUpdate();
                    return;
                }
                if ($path === 'admin-user-create') {
                    $controller->adminUserCreate();
                    return;
                }
                if ($path === 'admin-user-block') {
                    $controller->adminUserBlock();
                    return;
                }
                $controller->adminUserDelete();
                return;
            }

            if ($path === 'caregiver-assign' || $path === 'caregiver-unassign') {
                require_once __DIR__ . '/src/controllers/ApiController.php';
                $controller = new ApiController();
                if ($path === 'caregiver-assign') {
                    $controller->assignCaregiver();
                    return;
                }
                $controller->unassignCaregiver();
                return;
            }
        }

        // Default: render static view (HTML).
        $templateName = self::$routes[$path];
        $templatePath = 'public/views/'. $templateName .'.html';
        include $templatePath;
    }
}