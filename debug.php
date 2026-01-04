<?php
// Włączamy wyświetlanie wszystkich błędów na ekranie
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "<h1>Test połączenia z bazą danych</h1>";

$config = [
    'host' => 'db',
    'user' => 'docker',
    'password' => 'docker',
    'dbname' => 'cats_db'
];

try {
    echo "1. Próba połączenia z hostem '{$config['host']}'...<br>";
    
    $dsn = "pgsql:host={$config['host']};port=5432;dbname={$config['dbname']};";
    $pdo = new PDO($dsn, $config['user'], $config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
    ]);
    
    echo "<span style='color:green'>✔ Połączono z bazą danych!</span><br><br>";

    echo "2. Próba dodania użytkownika testowego (test_user)...<br>";
    
    // Sprawdzamy czy tabela istnieje i jakie ma kolumny (gen_random_uuid jest kluczowe)
    $stmt = $pdo->prepare("
        INSERT INTO users (name, email, password_hash, role) 
        VALUES ('Test User', 'test@debug.pl', 'test_hash_123', 'user')
        RETURNING id
    ");
    
    $stmt->execute();
    $id = $stmt->fetchColumn();
    
    echo "<span style='color:green'>✔ SUKCES! Dodano użytkownika. Nowe ID: $id</span><br>";
    echo "Wejdź teraz do pgAdmina i sprawdź czy widzisz ten wiersz.";

} catch (PDOException $e) {
    echo "<h3 style='color:red'>⛔ BŁĄD SQL:</h3>";
    echo "<strong>Komunikat:</strong> " . $e->getMessage() . "<br>";
    echo "<pre>" . $e->getTraceAsString() . "</pre>";
    
    // Podpowiedzi do typowych błędów
    if (strpos($e->getMessage(), 'does not exist') !== false) {
        echo "<br><strong>Podpowiedź:</strong> Tabela lub baza danych nie istnieje. Sprawdź nazwy w pgAdmin.";
    }
    if (strpos($e->getMessage(), 'gen_random_uuid') !== false) {
        echo "<br><strong>Podpowiedź:</strong> Postgres nie widzi funkcji UUID. Wykonaj w pgAdmin SQL: <code>CREATE EXTENSION IF NOT EXISTS pgcrypto;</code>";
    }
} catch (Exception $e) {
    echo "<h3 style='color:red'>⛔ INNY BŁĄD:</h3>";
    echo $e->getMessage();
}