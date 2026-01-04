# CatCare Manager

Aplikacja do zarzadzania kotami  
Domyslnie kotami ale mozna dodawac tez inne zwierzeta jako wyjatek hehe  

Celem aplikacji jest planowanie zycia kota oraz koordynacja opiekunow  
Od prostych czynnosci jak zabawa z kotem  
Az po bardziej wymagajace aktywnosci jak wizyty u weterynarza czy podawanie lekow  

Aplikacja zapobiega sytuacjom w ktorych kot dostaje sniadanie 3 razy dziennie  
Bo kazdy opiekun widzi co juz zostalo zrobione  

---

## Glowne funkcje

- zarzadzanie kotami i innymi zwierzetami  
- planowanie aktywnosci codziennych i cyklicznych  
- kontrola karmienia i podawania lekow  
- wielu opiekunow dla jednego kota  
- logowanie wykonanych czynnosci  
- raporty i podsumowania  
- role uzytkownikow  

---

## Endpointy API

### Autoryzacja

**/login**  
Ustawia sesje uzytkownika oraz role  

---

### Koty

**/cats**  
Pobiera liste kotow widocznych dla zalogowanego uzytkownika  

**/details**  
Pobiera szczegoly kota  
- dane kota  
- aktywnosci  
- opiekunow  

---

### Planowanie i historia

**/schedule**  
Pobiera zaplanowane aktywnosci dla widocznych kotow  

**/logs**  
Pobiera logi wykonanych czynnosci  

---

### Opiekunowie

**/caregivers**  
Zarzadza powiazaniami pomiedzy kotami a opiekunami  
cat ↔ caregiver  

---

### Raporty

**/reports**  
Liczy podsumowania na podstawie logow i aktywnosci  
np  
- karmienie  
- leki  
- wykonane i pominiete zadania  

---

### Ustawienia i konto

**/settings** admin  
Zarzadzanie uzytkownikami i rolami  

**/profile**  
Zarzadzanie danymi konta  

---

## Role

- admin  
- opiekun  
- uzytkownik  

Zakres uprawnien zalezy od roli oraz przypisania do kota  

---

## Przyklad

Jeden kot  
Trzech opiekunow  
Kazdy widzi czy kot byl juz nakarmiony  
Zero podwojnego sniadania  
Kot szczesliwy  
