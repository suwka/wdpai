<?php

/**
 * Database
 *
 * Prosta klasa do tworzenia połączenia PDO z PostgreSQL.
 */

class Database {
    private string $username;
    private string $password;
    private string $host;
    private string $database;

    public function __construct() {
        $this->username = 'docker';
        $this->password = 'docker';
        $this->host = 'db';
        $this->database = 'cats_db';
    }

    public function connect(): PDO {
        try {
            $conn = new PDO(
                "pgsql:host=$this->host;port=5432;dbname=$this->database",
                $this->username,
                $this->password,
                ["sslmode" => "prefer"]
            );
            $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            $conn->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
            return $conn;
        }
        catch(PDOException $e) {
            throw new RuntimeException('Database connection failed.', 0, $e);
        }
    }
}