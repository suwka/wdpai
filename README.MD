# CatCare Manager

CatCare Manager to aplikacja webowa (bez frameworka) do zarządzania kotami i planowania opieki: aktywności, terminarz, logi wykonania oraz przypisywanie opiekunów.

Projekt jest zbudowany jako proste MVC + podział Frontend/Backend:
- **Frontend**: statyczne widoki HTML + CSS + JavaScript (FETCH API)
- **Backend**: PHP 8 (OOP) + PostgreSQL
- **Uruchomienie**: Docker (nginx + php-fpm + postgres + pgAdmin)

## Spis treści

- [Funkcje](#funkcje)
- [Role i uprawnienia](#role-i-uprawnienia)
- [Technologie](#technologie)
- [Uruchomienie](#uruchomienie)
- [Struktura repozytorium](#struktura-repozytorium)
- [Architektura (MVC + warstwy)](#architektura-mvc--warstwy)
- [Baza danych](#baza-danych)
- [Bezpieczeństwo](#bezpieczenstwo)
- [Scenariusz testowy (demo)](#scenariusz-testowy-demo)
- [Checklist](#checklist)

## Funkcje

- logowanie / rejestracja / wylogowanie (sesja użytkownika)
- panel użytkownika: profil, zmiana danych / hasła, avatar
- koty: tworzenie / edycja / usuwanie, szczegóły, galeria zdjęć
- aktywności: planowanie i oznaczanie wykonania
- logi: historia wykonanych czynności
- opiekunowie: relacja kot ↔ opiekun (many-to-many)
- panel admina: statystyki i zarządzanie użytkownikami (rola, blokada)

## Role i uprawnienia

W systemie istnieją co najmniej 2 role:
- **admin** – dostęp do panelu admina i wszystkich danych
- **user** – dostęp tylko do danych kotów, do których ma uprawnienia

Model uprawnień dla kotów:
- właściciel kota (`cats.owner_id`) ma pełne uprawnienia do edycji i zarządzania
- dodatkowi opiekunowie są przypisywani przez relację `cat_caregivers` (właściciel może przypisać/odpiąć)

## Technologie

- Docker + docker-compose
- PHP (OOP) + nginx + php-fpm
- PostgreSQL + (opcjonalnie) pgAdmin
- HTML5 + CSS (responsywność przez media queries)
- JavaScript + FETCH API (AJAX)

## Uruchomienie

Wymagania:
- Docker Desktop
- Git

Start aplikacji:

```bash
docker-compose up --build
```

Adresy:
- aplikacja: http://localhost:8080
- pgAdmin: http://localhost:5050

PostgreSQL (z docker-compose / docker/db/Dockerfile):
- host: `localhost`
- port: `5433`
- db: `cats_db`
- user: `docker`
- password: `docker`

Uwaga: wolumen `pg-data` utrzymuje dane między restartami. Jeśli chcesz postawić bazę od zera, usuń wolumen.

## Struktura repozytorium

Najważniejsze katalogi/pliki:

- `index.php` – wejście aplikacji (start sesji, router)
- `Routing.php` – routing i ochrona stron/endpointów
- `src/` – backend (kontrolery, modele, repozytoria)
- `public/views/` – widoki HTML
- `public/scripts/` – JavaScript (FETCH API)
- `public/styles/` – style CSS
- `docker/` – obrazy i konfiguracja (nginx/php/db)
- `docker/db/init.sql` – inicjalizacja bazy + przykładowe dane

## Architektura (MVC + warstwy)

W dużym skrócie:

1) **Nginx** przyjmuje request i przekazuje do **PHP-FPM**.
2) `index.php` uruchamia sesję i przekazuje ścieżkę do routera.
3) `Routing.php` mapuje URL → kontroler / widok.
4) Kontrolery w `src/controllers/`:
	- renderują widoki (HTML) albo zwracają JSON (API)
5) Warstwa danych:
	- `src/Database.php` – połączenie PDO
	- `src/repository/*` – zapytania do bazy
	- `src/models/*` – modele domenowe

Prosty diagram warstwowy (tekstowy):

```
[Browser]
	|  HTML/CSS/JS (fetch)
	v
[Nginx] -> [PHP-FPM]
				 |
				 v
			[Routing] -> [Controllers] -> [Repositories/Models] -> [PostgreSQL]
```

## Baza danych

Źródło schematu i danych przykładowych:
- `docker/db/init.sql`

Główne tabele:
- `users` – użytkownicy (role, blokada, ostatnie logowanie)
- `cats` – koty (właściciel)
- `cat_caregivers` – relacja wiele-do-wielu kot ↔ użytkownik
- `activities` – aktywności (schedule)
- `logs` – logi zdarzeń
- `cat_photos` – zdjęcia w galerii
- `support_tickets` – zgłoszenia

Relacje:
- 1:N: `users` → `cats`
- M:N: `cats` ↔ `users` (przez `cat_caregivers`)
- 1:N: `cats` → `activities`, `logs`, `cat_photos`

### ERD (do uzupełnienia w repo)

Wymagane do zaliczenia: diagram ERD (PNG/SVG) + źródło (np. drawio).

Dodaj pliki (przykładowa konwencja):
- `docs/erd.drawio` (źródło)
- `docs/erd.png` (export)

### Widoki / funkcje / triggery (do uzupełnienia)

Wymagane do zaliczenia:
- minimum 2 widoki (JOIN kilku tabel)
- minimum 1 wyzwalacz
- minimum 1 funkcja
- transakcje na odpowiednim poziomie izolacji

Zaimplementowane w skrypcie SQL (tworzone przy inicjalizacji bazy):
- widoki: `vw_activity_details`, `vw_cat_overview`
- funkcja: `fn_assign_caregiver(p_cat_id UUID, p_user_id UUID) -> BOOLEAN`
- trigger: `trg_set_updated_at()` + wyzwalacze na `users`, `cats`, `activities`

Logika transakcji występuje również po stronie PHP (np. akcje wieloetapowe).

## Bezpieczeństwo

- hasła: `password_hash()` / `password_verify()` (bcrypt/argon zależnie od konfiguracji PHP)
- sesja: utrzymanie sesji po zalogowaniu i bezpieczne wylogowanie (czyszczenie cookie)
- SQL Injection: użycie `PDO::prepare()` i parametrów w zapytaniach
- kontrola dostępu: 401/403 w API i przekierowania na stronach HTML

Rekomendacje do zaliczenia (do rozważenia):
- przenieść dane DB do `.env` + dodać `.env.example`
- dodać globalne strony błędów 400/403/404/500 (spójny UX)

## Scenariusz testowy (demo)

Poniższe kroki są pod szybkie demo (4 min):

1) **Uruchom**: `docker-compose up --build`
2) **Logowanie**:
	- zaloguj się jako użytkownik
	- pokaż, że sesja działa (przejście po widokach bez ponownego logowania)
3) **Role/uprawnienia**:
	- wejdź na `/admin` jako user → brak dostępu / przekierowanie
	- zaloguj się jako admin → panel admina działa
4) **CRUD kotów**:
	- dodaj kota, edytuj, usuń
5) **M:N opiekunowie**:
	- przypisz opiekuna do kota i pokaż wpływ na widoczność
6) **Aktywności i logi**:
	- dodaj aktywność, oznacz wykonanie, sprawdź logi
7) **Błędy 401/403**:
	- wywołaj endpoint API bez sesji → 401
	- wywołaj endpoint bez uprawnień → 403

## Checklist

Szybkie odhaczenie zgodności z kryteriami:

- [x] Docker + docker-compose
- [x] PostgreSQL
- [x] PHP (OOP) + MVC
- [x] HTML + CSS + JS (FETCH)
- [x] logowanie + sesja + wylogowanie
- [x] role min. 2 (admin/user)
- [x] relacje 1:N i M:N w bazie
- [ ] relacja 1:1 w bazie (wymaganie)
- [x] min. 2 widoki w SQL
- [x] min. 1 trigger w SQL
- [x] min. 1 funkcja w SQL
- [ ] transakcje + poziom izolacji (udokumentowane)
- [ ] export kompletnej bazy do pliku .sql (z danymi)
- [ ] ERD (PNG/SVG) + źródło (drawio)
- [ ] testy (PHPUnit 1–2) + testy integracyjne endpointów
- [ ] globalne strony błędów 400/403/404/500

Więcej szczegółów i lista zadań do odhaczania: zobacz `todo.MD`.
