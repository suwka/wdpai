<?php

require_once 'AppController.php';

class securityController extends AppController {
    public function login() {
        //pobieramy email z formularza i haslo
        //sprawdzamy czy istnieje w db
        //jezeli nie to zwracamy odp komunikaty
        //jezleli istnieje to go przekierowujemy do dashbordu
        return $this->render("login");
    }

}