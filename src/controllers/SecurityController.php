<?php

require_once __DIR__ . '/AppController.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../repository/UserRepository.php';

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
}