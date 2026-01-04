<?php
session_start();
// Wymagamy naszego (nowego) pliku z logiką wyświetlania
require_once 'Routing.php';

// 1. Odbierz ścieżkę (URL) od użytkownika
$path = $_SERVER['REQUEST_URI'];

// 2. Oczyść ścieżkę: usuń parametry, zamień na małe litery i usuń ukośniki
$path = parse_url($path, PHP_URL_PATH);
$path = strtolower(trim($path, '/'));

// 3. Uruchom prosty router
Routing::run($path);