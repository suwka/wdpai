<?php

require_once __DIR__ . '/AppController.php';

class DefaultController extends AppController {
    
    public function index() {
        $this->render('login');
    }

    public function dashboard() {
        $this->render('dashboard');
    }

    public function cats() {
        $this->render('cats');
    }

    public function schedule() {
        $this->render('schedule');
    }

    public function logs() {
        $this->render('logs');
    }

    public function settings() {
        $this->render('settings');
    }

    public function profile() {
        $this->render('profile');
    }

    public function reports() {
        $this->render('reports');
    }

    public function caregivers() {
        $this->render('caregivers');
    }

    public function help() {
        $this->render('help');
    }
}