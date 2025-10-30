<?php
// Wymagamy kontrolerów
require_once 'src/controllers/SecurityController.php';
require_once 'src/controllers/DashboardController.php';

class Routing {

    // Architektura routingu wykładowcy
    public static $routes = [
        'login' => [
            'controller' => "SecurityController",
            'action' => 'login'
        ],
        'register'=> [
            'controller' => "SecurityController",
            'action' => 'register'
        ],
        'dashboard' => [
            'controller' => "DashboardController",
            'action' => 'index' // Zauważ, że DashboardController ma teraz akcję 'index'
        ],
        '' => [ // Dodajemy routing dla pustej ścieżki (strona główna)
            'controller' => "DashboardController",
            'action' => 'index'
        ]
    ];


    public static function run(string $path) {
        // Sprawdzamy, czy ścieżka istnieje w naszej tablicy $routes
        if (array_key_exists($path, self::$routes)) {
            
            $routeInfo = self::$routes[$path];

            // Nazwa klasy kontrolera (np. 'SecurityController')
            $controllerName = $routeInfo['controller'];
            
            // Nazwa metody (akcji) do wywołania (np. 'login')
            $action = $routeInfo['action'];

            // Tworzymy nową instancję kontrolera i wywołujemy akcję
            $controller = new $controllerName();
            $controller->$action();

        } else {
            // Jeśli ścieżka nie istnieje, wczytujemy 404
            include 'public/views/404.html';
        }
    }
}