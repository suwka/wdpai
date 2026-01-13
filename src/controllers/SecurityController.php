<?php

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../repository/UserRepository.php';
require_once __DIR__ . '/../Database.php';

class SecurityController extends AppController {

    private $userRepository;

    public function __construct()
    {
        parent::__construct();
        $this->userRepository = new UserRepository();
    }

    private function isValidEmail(string $email): bool
    {
        $email = trim($email);
        if ($email === '' || strlen($email) > 254) return false;
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    private function isValidUsername(string $username): bool
    {
        $username = trim($username);
        // Prevent weird input / "SQL injection" attempts by allowing a strict safe set.
        // 3-30 chars: letters, digits, dot, underscore, dash.
        if ($username === '' || strlen($username) < 3 || strlen($username) > 30) return false;
        return (bool)preg_match('/^[a-zA-Z0-9._-]{3,30}$/', $username);
    }

    private function isValidPersonName(string $name): bool
    {
        $name = trim($name);
        if ($name === '' || mb_strlen($name) > 50) return false;
        // Letters + spaces + hyphen only.
        return (bool)preg_match('/^[\p{L}][\p{L} \-]{0,49}$/u', $name);
    }

    private function passwordPolicyError(string $password, ?string $username = null, ?string $email = null): ?string
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

    public function login() {
        if (!$this->isPost()) {
            return $this->render('login');
        }

        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password'] ?? '');

        // Do not reveal whether email or password was wrong.
        $genericLoginError = ['messages' => ['Błędny email lub hasło.']];

        if ($email === '' || trim($password) === '') {
            return $this->render('login', $genericLoginError);
        }

        $user = $this->userRepository->getUserByEmail($email);

        if (!$user) {
            return $this->render('login', $genericLoginError);
        }

        // Weryfikacja hashu hasła
        if (!password_verify($password, $user->getPasswordHash())) {
            return $this->render('login', $genericLoginError);
        }

        if ($user->isBlocked()) {
            return $this->render('login', ['messages' => ['Konto jest zablokowane.']]);
        }

        // Sesja (dla uploadów i uprawnień)
        $_SESSION['user_id'] = $user->getId();
        $_SESSION['role'] = $user->getRole();
        $_SESSION['username'] = $user->getUsername();

        // Audit: last login
        try {
            $db = new Database();
            $pdo = $db->connect();
            $stmt = $pdo->prepare('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = :id');
            $stmt->execute([':id' => $user->getId()]);
        } catch (Throwable $e) {
            // ignore audit failures
        }

        $url = "http://$_SERVER[HTTP_HOST]";
        $target = ($user->getRole() === 'admin') ? '/admin' : '/dashboard';
        header("Location: {$url}{$target}");
    }

    public function register() {
        if (!$this->isPost()) {
            return $this->render('register');
        }

        $username = trim($_POST['username'] ?? '');
        $email = strtolower(trim((string)($_POST['email'] ?? '')));
        $password = (string)($_POST['password1'] ?? '');
        $confirmedPassword = (string)($_POST['password2'] ?? '');
        $firstname = trim((string)($_POST['firstname'] ?? ''));
        $lastname = trim((string)($_POST['lastname'] ?? ''));

        if (!$this->isValidUsername($username)) {
            return $this->render('register', ['messages' => ['Niepoprawna nazwa użytkownika.']]);
        }

        if (!$this->isValidEmail($email)) {
            return $this->render('register', ['messages' => ['Niepoprawny email.']]);
        }

        if (!$this->isValidPersonName($firstname)) {
            return $this->render('register', ['messages' => ['Niepoprawne imię.']]);
        }
        if (!$this->isValidPersonName($lastname)) {
            return $this->render('register', ['messages' => ['Niepoprawne nazwisko.']]);
        }

        // Required checks requested: username exists / email exists / weak password
        if ($this->userRepository->getUserByUsername($username)) {
            return $this->render('register', ['messages' => ['Użytkownik o tym nicku już istnieje.']]);
        }

        if ($this->userRepository->getUserByEmail($email)) {
            return $this->render('register', ['messages' => ['Użytkownik o tym mailu już istnieje.']]);
        }

        if ($password !== $confirmedPassword) {
            return $this->render('register', ['messages' => ['Hasła nie są identyczne.']]);
        }

        $pwErr = $this->passwordPolicyError($password, $username, $email);
        if ($pwErr) {
            return $this->render('register', ['messages' => ['Za słabe hasło.']]);
        }

        // Haszujemy hasło
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $user = new User($username, $email, $passwordHash, $firstname, $lastname);

        $this->userRepository->addUser($user);

        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}/login");
        exit;
    }

    public function logout(): void
    {
        // Bezpieczne wylogowanie
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        session_destroy();

        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}/login");
        exit;
    }

    private function requireLogin(): string
    {
        $userId = $_SESSION['user_id'] ?? null;
        if (!$userId) {
            $url = "http://$_SERVER[HTTP_HOST]";
            header("Location: {$url}/login");
            exit;
        }

        return $userId;
    }

    private function redirect(string $path): void
    {
        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}{$path}");
        exit;
    }

    public function updateProfile(): void
    {
        if (!$this->isPost()) {
            http_response_code(405);
            exit;
        }

        $userId = $this->requireLogin();
        $firstName = trim($_POST['first_name'] ?? '');
        $lastName = trim($_POST['last_name'] ?? '');

        // Username is NOT changeable (only name fields)
        if ($firstName === '' || $lastName === '') {
            $this->redirect('/settings?err=profile');
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('UPDATE users SET first_name = :fn, last_name = :ln, updated_at = NOW() WHERE id = :id');
        $stmt->execute([
            ':fn' => $firstName,
            ':ln' => $lastName,
            ':id' => $userId,
        ]);

        $this->redirect('/settings?ok=profile');
    }

    public function updatePassword(): void
    {
        if (!$this->isPost()) {
            http_response_code(405);
            exit;
        }

        $userId = $this->requireLogin();
        $oldPassword = (string)($_POST['old_password'] ?? '');
        $newPassword = (string)($_POST['new_password'] ?? '');

        if (trim($oldPassword) === '' || trim($newPassword) === '') {
            $this->redirect('/settings?err=pw');
        }

        $db = new Database();
        $pdo = $db->connect();

        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);
        $hash = $stmt->fetchColumn();
        if (!$hash || !password_verify($oldPassword, $hash)) {
            $this->redirect('/settings?err=pw_old');
        }

        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $stmt = $pdo->prepare('UPDATE users SET password_hash = :h, updated_at = NOW() WHERE id = :id');
        $stmt->execute([':h' => $newHash, ':id' => $userId]);

        $this->redirect('/settings?ok=pw');
    }

    private function detectImageExtension(string $tmpPath): ?string
    {
        if (class_exists('finfo')) {
            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($tmpPath);
            $allowed = [
                'image/jpeg' => 'jpg',
                'image/png' => 'png',
                'image/webp' => 'webp',
            ];
            return $allowed[$mime] ?? null;
        }

        $mime = mime_content_type($tmpPath);
        if ($mime === 'image/jpeg') return 'jpg';
        if ($mime === 'image/png') return 'png';
        if ($mime === 'image/webp') return 'webp';
        return null;
    }

    private function storeUpload(array $file, string $targetDir, string $targetBaseName): ?string
    {
        if (!isset($file['tmp_name']) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return null;
        }

        $maxBytes = 5 * 1024 * 1024;
        if (($file['size'] ?? 0) > $maxBytes) {
            return null;
        }

        $ext = $this->detectImageExtension($file['tmp_name']);
        if (!$ext) {
            return null;
        }

        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        $fileName = $targetBaseName . '.' . $ext;
        $targetPath = rtrim($targetDir, '/\\') . DIRECTORY_SEPARATOR . $fileName;

        if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
            return null;
        }

        return $fileName;
    }

    public function updateAccount(): void
    {
        if (!$this->isPost()) {
            http_response_code(405);
            exit;
        }

        $userId = $this->requireLogin();

        $firstName = trim($_POST['first_name'] ?? '');
        $lastName = trim($_POST['last_name'] ?? '');
        $wantsNameUpdate = ($firstName !== '' || $lastName !== '');

        $oldPassword = (string)($_POST['old_password'] ?? '');
        $newPassword = (string)($_POST['new_password'] ?? '');
        $wantsPasswordChange = trim($oldPassword) !== '' || trim($newPassword) !== '';

        if ($wantsNameUpdate && ($firstName === '' || $lastName === '')) {
            $this->redirect('/settings?err=profile');
        }
        if ($wantsPasswordChange && (trim($oldPassword) === '' || trim($newPassword) === '')) {
            $this->redirect('/settings?err=pw');
        }

        $db = new Database();
        $pdo = $db->connect();

        // If password change requested, verify old password first.
        if ($wantsPasswordChange) {
            $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
            $stmt->execute([':id' => $userId]);
            $hash = $stmt->fetchColumn();
            if (!$hash || !password_verify($oldPassword, $hash)) {
                $this->redirect('/settings?err=pw_old');
            }
        }

        // Optional avatar upload.
        $avatarPath = null;
        $avatarFile = $_FILES['avatar'] ?? [];
        $hasAvatarFile = isset($avatarFile['tmp_name']) && ($avatarFile['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE;
        $fileName = $this->storeUpload(
            $avatarFile,
            __DIR__ . '/../../public/uploads/avatars',
            'u-' . $userId
        );
        if ($hasAvatarFile && !$fileName) {
            $this->redirect('/settings?err=avatar');
        }
        if ($fileName) {
            $avatarPath = '/public/uploads/avatars/' . $fileName;
        }

        // Update name (+ optional password, optional avatar) in one transaction.
        $pdo->beginTransaction();
        try {
            if ($wantsNameUpdate) {
                $stmt = $pdo->prepare('UPDATE users SET first_name = :fn, last_name = :ln, updated_at = NOW() WHERE id = :id');
                $stmt->execute([':fn' => $firstName, ':ln' => $lastName, ':id' => $userId]);
            }

            if ($wantsPasswordChange) {
                $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('UPDATE users SET password_hash = :h, updated_at = NOW() WHERE id = :id');
                $stmt->execute([':h' => $newHash, ':id' => $userId]);
            }

            if ($avatarPath) {
                $stmt = $pdo->prepare('UPDATE users SET avatar_path = :p, updated_at = NOW() WHERE id = :id');
                $stmt->execute([':p' => $avatarPath, ':id' => $userId]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $this->redirect('/settings?err=account');
        }

        $this->redirect('/settings?ok=account');
    }
}