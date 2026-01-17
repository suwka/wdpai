# TODO / Checklista do zaliczenia (CatCare Manager)

Zaznaczaj `[x]` kiedy gotowe. Kolejność: najpierw artefakty do README, potem baza, potem testy i błędy.

## Dokumentacja / repo

- [ ] Uzupełnić README: screeny aplikacji (min. 4 widoki)
- [ ] Dodać diagram architektury (np. `docs/architecture.drawio` + `docs/architecture.png`)
- [ ] Dodać ERD: `docs/erd.drawio` + `docs/erd.png`
- [ ] Dodać `.env.example` (DB + ewentualnie inne ustawienia)
- [ ] Dodać instrukcję „reset bazy” (usunięcie wolumenu `pg-data`)

## Baza danych (PostgreSQL)

Wymagania: relacje 1:N, M:N, 1:1 + normalizacja (3NF) + typy danych + FKs + akcje na referencjach.

- [ ] Dodać relację 1:1 (np. `user_profiles` gdzie `user_id` jest PK i FK do `users(id)`)
- [x] Dodać min. 2 widoki (JOIN kilku tabel) w SQL
	- [x] Widok #1 (aktywności + kot + użytkownicy)
	- [x] Widok #2 (kot + właściciel + liczniki)
- [x] Dodać min. 1 funkcję (np. `fn_assign_caregiver(cat_id, user_id)` albo raport)
- [x] Dodać min. 1 trigger (np. automatyczne `updated_at` albo logowanie zmian)
- [ ] Dodać transakcję z poziomem izolacji (udokumentować w SQL lub w README)
- [ ] Pokazać akcje na referencjach (UPDATE/DELETE przy FK) – opisać w README
- [ ] Wyeksportować kompletną bazę (schema + dane) do pliku `database_export.sql`

## Backend (PHP, OOP, SOLID, DRY)

- [x] Dodać interfejsy (np. `UserRepositoryInterface`, `CatRepositoryInterface`) i użyć w kontrolerach
- [x] Zredukować duplikację walidacji (wspólna klasa `Validator`/`PasswordPolicy`)
- [x] Usunąć duplikację klasy `Repository` w `src/repository/UserRepository.php`
- [x] Dodać centralną obsługę błędów/wyjątków (w tym JSON dla API)

## Frontend (HTML/CSS/JS)

- [x] Sprawdzić responsywność kluczowych widoków (login, dashboard, details, admin)
- [x] Spójność UI: kolory, typografia, przyciski, stany błędów
- [x] Ujednolicić obsługę błędów w fetch (401/403/500) – czytelne komunikaty

## Uprawnienia / bezpieczeństwo

- [ ] Dodać / opisać ochronę przed CSRF (min. dla POST formularzy) albo jasno opisać świadomy brak
- [ ] Upewnić się, że wszystkie endpointy POST wymagają sesji i walidują input
- [ ] Zabezpieczyć uploady (rozszerzenia/MIME/rozmiar) – sprawdzić przypadki brzegowe

## Testy

Wymagane: „symboliczne” testy.

- [ ] PHPUnit: 1–2 testy (np. repozytorium/serwis)
- [ ] Testy integracyjne endpointów: prosty skrypt `curl`/`bash` (np. login → pobranie `/api-me`)

## Strony błędów

- [ ] Strona 400
- [ ] Strona 401/403 (brak dostępu)
- [ ] Strona 404
- [ ] Strona 500

## Demo (4 min)

- [ ] Przygotować konto admin + konto user (hasła znane i zapisane)
- [ ] Scenariusz: login → role → CRUD → M:N → logi → 401/403
- [ ] Przygotować 2–3 koty + kilka aktywności i zdjęć do pokazania
