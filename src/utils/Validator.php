<?php

/**
 * Validator
 *
 * Wspólna walidacja inputu (DRY). Kontrolery używają tej klasy zamiast
 * duplikować regexy i politykę haseł.
 */

final class Validator
{
    public static function isValidEmail(string $email): bool
    {
        $email = trim($email);
        if ($email === '' || strlen($email) > 254) return false;
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function isValidUsername(string $username): bool
    {
        $username = trim($username);
        if ($username === '' || strlen($username) < 3 || strlen($username) > 30) return false;
        return (bool)preg_match('/^[a-zA-Z0-9._-]{3,30}$/', $username);
    }

    public static function isValidPersonName(string $name): bool
    {
        $name = trim($name);
        if ($name === '' || mb_strlen($name) > 50) return false;
        return (bool)preg_match('/^[\p{L}][\p{L} \-]{0,49}$/u', $name);
    }

    public static function passwordPolicyError(string $password, ?string $username = null, ?string $email = null): ?string
    {
        $password = (string)$password;
        $len = strlen($password);
        if ($len < 8 || $len > 64) {
            return 'Hasło musi mieć 8–64 znaki.';
        }
        if (preg_match('/\s/', $password)) {
            return 'Hasło nie może zawierać spacji.';
        }
        if (!preg_match('/[a-z]/', $password) || !preg_match('/[A-Z]/', $password) || !preg_match('/\d/', $password) || !preg_match('/[^A-Za-z0-9]/', $password)) {
            return 'Hasło jest za słabe: dodaj małą literę, dużą literę, cyfrę i znak specjalny.';
        }

        $normalized = strtolower(preg_replace('/[^a-z0-9]+/', '', $password));
        if (str_contains($normalized, 'pantadeusz')) {
            return 'Hasło jest zbyt łatwe (nie używaj prostych fraz).';
        }

        if ($username) {
            $u = strtolower(preg_replace('/[^a-z0-9]+/', '', $username));
            if ($u !== '' && str_contains($normalized, $u)) {
                return 'Hasło nie może zawierać nazwy użytkownika.';
            }
        }
        if ($email) {
            $local = strtolower(preg_replace('/[^a-z0-9]+/', '', explode('@', $email)[0] ?? ''));
            if ($local !== '' && str_contains($normalized, $local)) {
                return 'Hasło nie może zawierać emaila.';
            }
        }

        return null;
    }
}
