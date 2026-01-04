<?php

require_once __DIR__ . '/Repository.php';
require_once __DIR__.'/../models/User.php';

if (!class_exists('Repository')) {
    require_once __DIR__ . '/../Database.php';

    class Repository {
        protected $database;

        public function __construct() {
            $this->database = new Database();
        }
    }
}

class UserRepository extends Repository {

    public function getUserByEmail(string $email): ?User {
        $stmt = $this->database->connect()->prepare('SELECT * FROM users WHERE email = :email');
        $stmt->bindParam(':email', $email, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->mapRowToUser($row) : null;
    }

    public function getUserByUsername(string $username): ?User {
        $stmt = $this->database->connect()->prepare('SELECT * FROM users WHERE username = :u');
        $stmt->bindParam(':u', $username, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->mapRowToUser($row) : null;
    }

    public function getUserById(string $id): ?User {
        $stmt = $this->database->connect()->prepare('SELECT * FROM users WHERE id = :id');
        $stmt->bindParam(':id', $id, PDO::PARAM_STR);
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row ? $this->mapRowToUser($row) : null;
    }

    public function addUser(User $user): void {
        $stmt = $this->database->connect()->prepare('
            INSERT INTO users (username, email, first_name, last_name, password_hash, role)
            VALUES (:u, :e, :fn, :ln, :ph, :r)
        ');

        $stmt->execute([
            ':u' => $user->getUsername(),
            ':e' => $user->getEmail(),
            ':fn' => $user->getFirstName(),
            ':ln' => $user->getLastName(),
            ':ph' => $user->getPasswordHash(),
            ':r' => $user->getRole(),
        ]);
    }

    private function mapRowToUser(array $row): User
    {
        return new User(
            $row['username'],
            $row['email'],
            $row['password_hash'],
            $row['first_name'],
            $row['last_name'],
            $row['role'] ?? 'user',
            $row['id'] ?? null,
            $row['avatar_path'] ?? null
        );
    }
}