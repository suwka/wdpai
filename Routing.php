<?php

class Routing {

    public static function run(string $path) {
        // routing tylko na podstawie przekazanego $path
        switch ($path) {
            case '':
                include 'public/views/home.html';
                break;
            case 'dashboard':
                include 'public/views/dashboard.html';
                break;
            case 'login':
                include 'public/views/login.html';
                break;
            default:
                include 'public/views/404.html';
                break;
        }
    }
}
