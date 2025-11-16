<?php

require_once 'AppController.php';

class SecurityController extends AppController {

    public function login() {
        // Ten var_dump pomoże Ci zobaczyć, jaka metoda HTTP jest używana
        // var_dump($_SERVER['REQUEST_METHOD']);

        // Sprawdzamy, czy formularz został wysłany metodą POST
        if ($this->isPost()) {
            // Tutaj masz dostęp do danych z formularza
            // var_dump($_POST); // <--- TO ZOSTAŁO ZAKOMENTOWANE

            // Logika, którą opisałeś w komentarzach:
            // 1. pobieramy email z formularza i haslo
            $email = $_POST['email'] ?? null;
            $password = $_POST['password'] ?? null;


        
            // 2. sprawdzamy czy istnieje w db
            // (Tutaj powinna być logika łączenia z bazą danych i sprawdzania użytkownika)
            // Załóżmy na razie, że logowanie się powiodło dla celów testowych:
            $userAuthenticated = true; // Zastąp to prawdziwym sprawdzeniem

            // 3. jeżeli nie to zwracamy odp komunikaty
            if (!$userAuthenticated) {
                // Jeśli logowanie nieudane, renderujemy stronę logowania ponownie
                // Można też przekazać błąd do widoku
                return $this->render("login", ['messages' => ['Nieprawidłowy email lub hasło!']]);
            }



            // 4. jeżeli istnieje to go przekierowujemy do dashboardu
            // Zamiast renderować, lepiej zrobić przekierowanie
            $url = "http://{$_SERVER['HTTP_HOST']}";
            header("Location: {$url}/dashboard"); // Przekierowuje na /dashboard

            var_dump($email);
            var_dump($password);
            exit(); // Ważne jest, aby zakończyć skrypt po przekierowaniu

        }

        // Jeśli to nie jest POST (czyli ktoś po prostu wszedł na stronę /login),
        // renderujemy widok logowania.
        return $this->render("login");
    }


    // VVVV --- TO ZOSTAŁO DODANE --- VVVV
    public function register() {
        // Tutaj docelowo będzie logika rejestracji
        // Na razie po prostu renderujemy widok rejestracji
        return $this->render("register");
    }
    // ^^^^ ---------------------------- ^^^^
}