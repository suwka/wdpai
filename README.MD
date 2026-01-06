# CatCare Manager

aplikacja do zarzadzania kotami- domyslnie kotami ale mozna dodawac tez inne zwierzeta jako wyjatek hehe

aelem aplikacji jest planowanie zycia kota oraz koordynacja opiekunow  od prostych czynnosci jak zabawa z kotem  
az po bardziej wymagajace aktywnosci jak wizyty u weterynarza czy podawanie lekow  

alikacja zapobiega sytuacjom w ktorych kot dostaje sniadanie 3 razy dziennie bo kazdy opiekun widzi co juz zostalo zrobione  

---

## Glowne funkcje

- zarzadzanie kotami i innymi zwierzetami  
- planowanie aktywnosci codziennych i cyklicznych  
- kontrola karmienia i podawania lekow  
- wielu opiekunow dla jednego kota  
- logowanie wykonanych czynnosci  
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

### Ustawienia i konto

**/settings**  
Zarzadzanie kontem oraz (dla admina) uzytkownikami i rolami  

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
