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
        '' => 'login'              // Obsługuje pustą ścieżkę (strona główna)
    ];


    public static function run(string $path) {
        
        // Sprawdzamy, czy ścieżka istnieje w naszej tablicy $routes
        if (array_key_exists($path, self::$routes)) {
            
            // Pobieramy nazwę pliku, który mamy wczytać (np. 'login')
            $templateName = self::$routes[$path];

            // Definiujemy pełną ścieżkę do pliku HTML
            $templatePath = 'public/views/'. $templateName .'.html';

            // Wczytujemy odpowiedni plik widoku
            include $templatePath;

        } else {
            // Jeśli ścieżka nie jest zdefiniowana w $routes
            http_response_code(404);
            echo "nie znaleziono strony (404)";
        }
    }
}