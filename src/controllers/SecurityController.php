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

    public function login() {
        if (!$this->isPost()) {
            return $this->render('login');
        }

        $email = $_POST['email'];
        $password = $_POST['password'];

        $user = $this->userRepository->getUserByEmail($email);

        if (!$user) {
            return $this->render('login', ['messages' => ['User not found!']]);
        }

        if ($user->getEmail() !== $email) {
            return $this->render('login', ['messages' => ['User with this email not exist!']]);
        }

        // Weryfikacja hashu hasła
        if (!password_verify($password, $user->getPasswordHash())) {
            return $this->render('login', ['messages' => ['Wrong password!']]);
        }

        // Sesja (dla uploadów i uprawnień)
        $_SESSION['user_id'] = $user->getId();
        $_SESSION['role'] = $user->getRole();
        $_SESSION['username'] = $user->getUsername();

        $url = "http://$_SERVER[HTTP_HOST]";
        header("Location: {$url}/dashboard");
    }

    public function register() {
        if (!$this->isPost()) {
            return $this->render('register');
        }

        $username = trim($_POST['username'] ?? '');
        $email = $_POST['email'];
        $password = $_POST['password1'];
        $confirmedPassword = $_POST['password2'];
        $firstname = $_POST['firstname'];
        $lastname = $_POST['lastname'];

        if ($username === '') {
            return $this->render('register', ['messages' => ['Username is required']]);
        }

        if ($password !== $confirmedPassword) {
            return $this->render('register', ['messages' => ['Passwords do not match']]);
        }

        if ($this->userRepository->getUserByEmail($email)) {
            return $this->render('register', ['messages' => ['Email already exists']]);
        }

        if ($this->userRepository->getUserByUsername($username)) {
            return $this->render('register', ['messages' => ['Username already exists']]);
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