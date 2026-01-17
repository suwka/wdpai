<?php

/**
 * User
 *
 * Model domenowy użytkownika (encja). Przechowuje dane i udostępnia gettery
 * wykorzystywane przez kontrolery/repozytoria.
 */

class User {
    private string $id;
    private string $username;
    private string $email;
    private string $passwordHash;
    private string $firstName;
    private string $lastName;
    private string $role;
    private bool $isBlocked;
    private ?string $lastLoginAt;
    private ?string $avatarPath;

    public function __construct(
        string $username,
        string $email,
        string $passwordHash,
        string $firstName,
        string $lastName,
        string $role = 'user',
        bool $isBlocked = false,
        ?string $lastLoginAt = null,
        ?string $id = null,
        ?string $avatarPath = null
    ) {
        $this->id = $id ?? '';
        $this->username = $username;
        $this->email = $email;
        $this->passwordHash = $passwordHash;
        $this->firstName = $firstName;
        $this->lastName = $lastName;
        $this->role = $role;
        $this->isBlocked = $isBlocked;
        $this->lastLoginAt = $lastLoginAt;
        $this->avatarPath = $avatarPath;
    }

    public function getId(): ?string { return $this->id !== '' ? $this->id : null; }
    public function getUsername(): string { return $this->username; }
    public function getEmail(): string { return $this->email; }
    public function getPasswordHash(): string { return $this->passwordHash; }
    public function getFirstName(): string { return $this->firstName; }
    public function getLastName(): string { return $this->lastName; }
    public function getRole(): string { return $this->role; }
    public function isBlocked(): bool { return $this->isBlocked; }
    public function getLastLoginAt(): ?string { return $this->lastLoginAt; }
    public function getAvatarPath(): ?string { return $this->avatarPath; }

    public function getFullName(): string
    {
        return trim($this->firstName . ' ' . $this->lastName);
    }
}