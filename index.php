<?php
require_once 'Routing.php';

// pobieramy ścieżkę z URL
$path = $_SERVER['REQUEST_URI'];

// wyciągamy samą ścieżkę (bez parametrów)
$path = parse_url($path, PHP_URL_PATH);

// usuwamy początkowe i końcowe ukośniki, zamieniamy na małe litery
$path = strtolower(trim($path, '/'));

// uruchamiamy router
Routing::run($path);
