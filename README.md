# Geometria Wykreślna – trener

Interaktywna pomoc do nauki geometrii wykreślnej i grafiki inżynierskiej (1. semestr studiów technicznych).
Każda konstrukcja jest rozpisana krok po kroku. Model przestrzenny 3D i rysunek wykreślny 2D są ze sobą powiązane.

**Strona:** https://benozolorenozo.github.io/geometria-wykreslna/ · [Informacje, prywatność, dostępność](informacje.html)

---

## Część akademicka

### Cel
Narzędzie ma ułatwić zrozumienie, **dlaczego** konstrukcje wykreślne działają, a nie tylko jak je wykonać. Do tego pozwala ćwiczyć zadania typowe dla kolokwium. Każdy krok ma trzy warstwy opisu:

- **CO** kreślimy – wynik kroku;
- **JAK** to wyznaczamy – procedura na rysunku;
- **DLACZEGO** to działa w przestrzeni – uzasadnienie geometryczne.

Elementy, z których powstaje dany krok, są wyróżniane („skąd to się wzięło?”). Najechanie kursorem na element rysunku podświetla jego odpowiednik w przestrzeni.

### Zakres (6 modułów)
1. **Rzuty Monge’a** – punkt, prosta, ślady prostej i płaszczyzny; przebicie prostej z płaszczyzną (płaszczyzna rzutująca, transformacja); rzeczywista wielkość figury (π₄, π₅); przenikanie trójkątów; rzutnia boczna π₃.
2. **Przenikanie wielościanów** – metoda krawędzi i płaszczyzn pomocniczych, łączenie punktów, widoczność; zadania z tabelami wariantów.
3. **Przenikanie brył obrotowych** – metoda plasterkowa, punkty charakterystyczne, widoczność; bryły obrotowe z wielościanami.
4. **Aksonometria** – izometria, dimetria, perspektywa kawalerska i wojskowa; przekrój bryły płaszczyzną (metoda śladów), kład.
5. **Rzut cechowany** – stopniowanie, warstwice, skala nachylenia, przebicia i krawędzie płaszczyzn, roboty ziemne (nasypy i wykopy przy platformach i drogach, skarpy przy krawędziach pochyłych wyznaczane stożkami).
6. **Perspektywa** – aparat rzutowy, metoda punktów zbiegu, perspektywa czołowa z rzutów prostokątnych (punkt główny O^τ, punkt odległości G), cienie.

Zadania odtworzone z list ćwiczeniowych są oznaczone 📋. Uzupełniają je przykłady z literatury.

### Metodyka i formy pracy
- **Tryb kroków** z osią czasu i autoodtwarzaniem.
- **Tryb „Co jeśli?”** – zmiana danych przelicza całą konstrukcję. Można też wylosować nowy, poprawny wariant zadania.
- **Tryb „Rozwiąż sam”** – wskazujesz na rysunku położenie kolejnych punktów, aplikacja ocenia odchyłkę.
- **Tryb „Kartka”** – czarno-biały rysunek z grubościami linii jak na kolokwium.
- **Ściągawka teorii** i lista **typowych błędów** dla każdego modułu.

### Notacja
Notacja zgodna z polską tradycją dydaktyczną:

| Oznaczenie | Znaczenie |
|---|---|
| A′, A″, A‴, A^IV, A^V | rzuty punktu A |
| x₁₂, x₂₃, x₁₄, x₄₅ | osie rzutów |
| h_α, v_α | ślady płaszczyzny α |
| A(3) | cecha (wysokość) w rzucie cechowanym |
| A^s | perspektywa punktu A |

Linie widoczne rysowane są ciągłą grubą, niewidoczne – kreskową cienką.

### Źródła
- T. Bogaczyk, T. Romaszkiewicz-Białas, *13 wykładów z geometrii wykreślnej*.
- B. Kotarska-Lewandowska, *Geometria wykreślna – zadania testowe*.
- B. Grochowski, *Geometria wykreślna z perspektywą stosowaną*.
- Listy ćwiczeniowe z przedmiotu. Wykorzystano tylko dane geometryczne; rysunki są generowane programowo.

### Zastrzeżenie
To prywatny projekt edukacyjny, a nie oficjalny materiał uczelni. Treści mogą zawierać błędy i nie zastępują zajęć ani literatury.

---

## Część techniczna

- **Stos:** czysty JavaScript (bez budowania), [Three.js r128](https://threejs.org/) z CDN dla 3D, SVG dla rysunku 2D.
- **Uruchomienie:** otwórz `index.html` w przeglądarce (do pobrania Three.js potrzebny jest internet). Link do kroku: `index.html#m1-transformacja/5`.
- **Struktura:**
  - `js/math.js` – geometria analityczna (płaszczyzny, wielościany, sumy brył, usuwanie linii niewidocznych, warstwice);
  - `js/core.js` – układ rzutni i budowanie kroków;
  - `js/view3d.js`, `js/view2d.js` – widoki 3D i 2D;
  - `js/app.js` – interfejs;
  - `js/teoria.js` – ściągawka i typowe błędy;
  - `js/lessons/m1–m6.js` – lekcje.
- **Dane użytkownika:** tylko ustawienia interfejsu w `localStorage` (klucze `gw.*`). Brak ciasteczek i analityki.
