<?php

/**
 * Routing
 *
 * Centralny router aplikacji. Mapuje ścieżkę URL + metodę HTTP na akcję kontrolera
 * albo na render widoku. Trzyma logikę „glue code” (nawigacja, autoryzacja dla widoków).
 */

require_once __DIR__ . '/src/Http/Request.php';
require_once __DIR__ . '/src/Http/Response.php';

class Routing {
    public static $routes = [
        'login' => 'login',
        'register' => 'register',
        'logout' => 'logout',
        'dashboard' => 'dashboard',
        'admin' => 'admin',
        'details' => 'details',
        'settings' => 'settings',
        'logs' => 'logs',
        'schedule' => 'schedule',
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
        '' => 'login'
    ];

    private static function redirect(Response $response, string $path): void
    {
        $response->redirect($path);
    }

    private static function isLoggedIn(Request $request): bool
    {
        $session = $request->session();
        return !empty($session['user_id']);
    }

    private static function isAdmin(Request $request): bool
    {
        $session = $request->session();
        return ($session['role'] ?? null) === 'admin';
    }

    private static function dispatch(string $controllerClass, string $method): void
    {
        require_once __DIR__ . '/src/controllers/' . $controllerClass . '.php';
        $controller = new $controllerClass();
        $controller->$method();
    }


    public static function run(Request $request): void {
        $response = new Response();

        $path = $request->path();
        if (!array_key_exists($path, self::$routes)) {
            $response->error(404);
            return;
        }

        $method = $request->method();

        if ($method === 'GET' && ($path === 'profile-update' || $path === 'profile-password-update' || $path === 'account-update')) {
            $response->error(400);
            return;
        }

        $apiGetActions = [
            'api-me' => ['ApiController', 'me'],
            'api-profile' => ['ApiController', 'profile'],
            'api-users' => ['ApiController', 'users'],
            'api-admin-stats' => ['ApiController', 'adminStats'],
            'api-cats' => ['ApiController', 'cats'],
            'api-cat' => ['ApiController', 'cat'],
            'api-cat-photos' => ['ApiController', 'catPhotos'],
            'api-dashboard-activities' => ['ApiController', 'dashboardActivities'],
            'api-cat-activities' => ['ApiController', 'catActivities'],
            'api-activities' => ['ApiController', 'activities'],
            'api-activities-calendar' => ['ApiController', 'activitiesCalendar'],
            'api-activities-day' => ['ApiController', 'activitiesDay'],
            'api-caregivers' => ['ApiController', 'caregivers'],
        ];

        $getActions = [
            'logout' => ['SecurityController', 'logout'],
        ];

        $postActions = [
            'login' => ['SecurityController', 'login'],
            'register' => ['SecurityController', 'register'],

            'profile-update' => ['SecurityController', 'updateProfile'],
            'profile-password-update' => ['SecurityController', 'updatePassword'],
            'account-update' => ['SecurityController', 'updateAccount'],

            'upload-user-avatar' => ['UploadController', 'userAvatar'],
            'upload-cat-avatar' => ['UploadController', 'catAvatar'],
            'upload-cat-photo' => ['UploadController', 'catPhoto'],

            'cat-create' => ['CatsController', 'create'],
            'cat-update' => ['CatsController', 'update'],
            'cat-delete' => ['CatsController', 'delete'],

            'activity-create' => ['ActivitiesController', 'create'],
            'activity-update' => ['ActivitiesController', 'update'],

            'cat-photo-delete' => ['ApiController', 'deleteCatPhoto'],
            'cat-photos-reorder' => ['ApiController', 'reorderCatPhotos'],

            'admin-user-update' => ['ApiController', 'adminUserUpdate'],
            'admin-user-create' => ['ApiController', 'adminUserCreate'],
            'admin-user-block' => ['ApiController', 'adminUserBlock'],
            'admin-user-delete' => ['ApiController', 'adminUserDelete'],

            'caregiver-assign' => ['ApiController', 'assignCaregiver'],
            'caregiver-unassign' => ['ApiController', 'unassignCaregiver'],
        ];

        if ($method === 'GET') {
            $publicPages = ['', 'login', 'register'];
            $adminPages = ['admin'];
            $isHtmlPage = !isset($apiGetActions[$path]);

            if ($isHtmlPage && !in_array($path, $publicPages, true) && $path !== 'logout') {
                if (!self::isLoggedIn($request)) {
                    self::redirect($response, '/login');
                }

                $adminAllowed = array_merge($adminPages, ['settings']);
                if (self::isAdmin($request) && !in_array($path, $adminAllowed, true)) {
                    self::redirect($response, '/admin');
                }
                if (in_array($path, $adminPages, true) && !self::isAdmin($request)) {
                    self::redirect($response, '/dashboard?err=forbidden');
                }
            }
        }

        if ($method === 'GET') {
            if (isset($getActions[$path])) {
                [$controllerClass, $action] = $getActions[$path];
                self::dispatch($controllerClass, $action);
                return;
            }

            if (isset($apiGetActions[$path])) {
                [$controllerClass, $action] = $apiGetActions[$path];
                self::dispatch($controllerClass, $action);
                return;
            }

        }

        if ($method === 'POST') {
            if (isset($postActions[$path])) {
                $publicPostActions = ['login', 'register'];

                // Sprawdzenie autoryzacji dla POST akcji (oprócz publicznych)
                if (!in_array($path, $publicPostActions, true) && !self::isLoggedIn($request)) {
                    $response->error(403);
                    return;
                }

                [$controllerClass, $action] = $postActions[$path];
                self::dispatch($controllerClass, $action);
                return;
            }

            $response->error(400);
            return;
        }

        $templateName = self::$routes[$path];
        $templatePath = 'public/views/'. $templateName .'.html';
        include $templatePath;
    }
}