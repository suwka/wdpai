<?php

require_once 'src/controllers/SecurityController.php';

class Routing {
    public static $routes = [
        'login' => [
            'controller' => 'SecurityController',
            'action' => 'login'
        ],
        'register' => [
            'controller' => 'SecurityController',
            'action' => 'register'
        ],
        'dashboard' => [
            'controller' => 'DashboardController',
            'action' => 'index'
        ]
    ];
}

class Routing {

    public static function run(string $path) {
        // routing tylko na podstawie przekazanego $path
        switch ($path) {
            case '':
                include 'public/views/dashboard.html';
                break;
            case 'dashboard':
                include 'public/views/dashboard.html';
                break;
            case 'login':
                $controller = new securityController();
                $controller->login();
                break;
            default:
                include 'public/views/404.html';
                break;
        }
    }
}
