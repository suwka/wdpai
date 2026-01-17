<?php

/**
 * SecurityController
 *
 * Kontroler bezpieczeństwa: logowanie, rejestracja, wylogowanie oraz aktualizacja profilu/hasła.
 * Korzysta z repozytorium użytkowników i wspólnej walidacji (Validator).
 */

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../repository/UserRepository.php';
require_once __DIR__ . '/../utils/Validator.php';

class SecurityController extends AppController {

    private UserRepository $userRepository;

    public function __construct(?UserRepository $userRepository = null)
    {
        parent::__construct();
        $this->userRepository = $userRepository ?? new UserRepository();
    }

    public function login() {
        if (!$this->isPost()) {
            $this->render('login');
            return;
        }

        $post = $this->request->post();
        $email = strtolower(trim((string)($post['email'] ?? '')));
        $password = (string)($post['password'] ?? '');

        $genericLoginError = ['messages' => ['Błędny email lub hasło.']];

        if ($email === '' || trim($password) === '') {
            $this->render('login', $genericLoginError);
            return;
        }

        $user = $this->userRepository->getUserByEmail($email);

        if (!$user) {
            $this->render('login', $genericLoginError);
            return;
        }

        if (!password_verify($password, $user->getPasswordHash())) {
            $this->render('login', $genericLoginError);
            return;
        }

        if ($user->isBlocked()) {
            $this->render('login', ['messages' => ['Konto jest zablokowane.']]);
            return;
        }

        $_SESSION['user_id'] = $user->getId();
        $_SESSION['role'] = $user->getRole();
        $_SESSION['username'] = $user->getUsername();

        try {
            $pdo = $this->db();
            $stmt = $pdo->prepare('UPDATE users SET last_login_at = NOW(), updated_at = NOW() WHERE id = :id');
            $stmt->execute([':id' => $user->getId()]);
        } catch (Throwable $e) {
        }

        $target = ($user->getRole() === 'admin') ? '/admin' : '/dashboard';
        $this->response->redirect($target);
    }

    public function register() {
        if (!$this->isPost()) {
            $this->render('register');
            return;
        }

        $post = $this->request->post();
        $username = trim((string)($post['username'] ?? ''));
        $email = strtolower(trim((string)($post['email'] ?? '')));
        $password = (string)($post['password1'] ?? '');
        $confirmedPassword = (string)($post['password2'] ?? '');
        $firstname = trim((string)($post['firstname'] ?? ''));
        $lastname = trim((string)($post['lastname'] ?? ''));

        if (!Validator::isValidUsername($username)) {
            $this->render('register', ['messages' => ['Niepoprawna nazwa użytkownika.']]);
            return;
        }

        if (!Validator::isValidEmail($email)) {
            $this->render('register', ['messages' => ['Niepoprawny email.']]);
            return;
        }

        if (!Validator::isValidPersonName($firstname)) {
            $this->render('register', ['messages' => ['Niepoprawne imię.']]);
            return;
        }
        if (!Validator::isValidPersonName($lastname)) {
            $this->render('register', ['messages' => ['Niepoprawne nazwisko.']]);
            return;
        }

        if ($this->userRepository->getUserByUsername($username)) {
            $this->render('register', ['messages' => ['Użytkownik o tym nicku już istnieje.']]);
            return;
        }

        if ($this->userRepository->getUserByEmail($email)) {
            $this->render('register', ['messages' => ['Użytkownik o tym mailu już istnieje.']]);
            return;
        }

        if ($password !== $confirmedPassword) {
            $this->render('register', ['messages' => ['Hasła nie są identyczne.']]);
            return;
        }

        $pwErr = Validator::passwordPolicyError($password, $username, $email);
        if ($pwErr) {
            $this->render('register', ['messages' => ['Za słabe hasło.']]);
            return;
        }

        $passwordHash = password_hash($password, PASSWORD_DEFAULT);

        $user = new User($username, $email, $passwordHash, $firstname, $lastname);

        $this->userRepository->addUser($user);

        $this->response->redirect('/login');
    }

    public function logout(): void
    {
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

        $this->response->redirect('/login');
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

        if ($firstName === '' || $lastName === '') {
            $this->redirect('/settings?err=profile');
        }

        $pdo = $this->db();

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

        $pdo = $this->db();

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

        $pdo = $this->db();

        if ($wantsPasswordChange) {
            $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = :id');
            $stmt->execute([':id' => $userId]);
            $hash = $stmt->fetchColumn();
            if (!$hash || !password_verify($oldPassword, $hash)) {
                $this->redirect('/settings?err=pw_old');
            }
        }

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