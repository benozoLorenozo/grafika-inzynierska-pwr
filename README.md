# GrafInż PWr – portal edukacyjny grafiki inżynierskiej

Nieoficjalny, studencki portal do nauki grafiki inżynierskiej i geometrii wykreślnej (1. semestr studiów technicznych), przygotowany z myślą o studentach Politechniki Wrocławskiej. Nie jest oficjalnym materiałem uczelni.
Każda konstrukcja jest rozpisana krok po kroku. Model przestrzenny 3D i rysunek wykreślny 2D są ze sobą powiązane.

**Strona:** https://benozolorenozo.github.io/grafika-inzynierska-pwr/ · [Informacje, prywatność, dostępność](informacje.html)

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
- **Tryb kroków** z osią czasu i autoodtwarzaniem. Kroki, w których powstaje wiele punktów, mają **podkroki** – punkty pojawiają się pojedynczo z instrukcją rysowania (co zmierzyć cyrklem, ile milimetrów odłożyć, jaką linią rysować).
- **Wbudowana miarka** – współrzędne przy kursorze, a po najechaniu na element: współrzędne punktu, odległość rzutu od osi, długość na rysunku i rzeczywista.
- **Rysunek techniczny** – widok 2D zgodny z normami (rodzaje i grubości linii, pismo, ramka, tabliczka rysunkowa) oraz automatyczne **wymiarowanie**.
- **Generator zadań** – dla każdej lekcji: poziom trudności, typ zadania i opcje; wszystkie dane (punkty, bryły, teren, platformy, drogi) losowane z zachowaniem poprawności.
- **Tryb „Co jeśli?”** – zmiana danych przelicza całą konstrukcję. Można też wylosować nowy, poprawny wariant zadania.
- **Tryb „Rozwiąż sam”** – każdy krok to zadanie: pytanie „co robimy teraz?” (kolejność konstrukcji), wskazanie punktów kroku w dowolnej kolejności, przebieg linii (2 punkty na linii) i widoczność krawędzi (zaznacz niewidoczne). Podpowiedzi stopniowane (opis „Jak?”, linie pomocnicze, obszar, pokaż punkt), regulowana dokładność, postęp kroków na osi czasu i podsumowanie z powtórką na nowych danych.
- **Tryb „Kartka”** – czarno-biały rysunek z grubościami linii jak na kolokwium; **⚙ Wygląd** – motyw (jasny, ciemny, wysoki kontrast, sepia), kolory, wielkość tekstu i linii.
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
  - `js/tools.js` – miarka, podkroki, wymiary, arkusz techniczny, motywy;
  - `js/generators.js` – generatory zadań;
  - `js/lessons/m1–m6.js` – lekcje.
- **Dane użytkownika:** tylko ustawienia interfejsu w `localStorage` (klucze `gw.*`). Brak ciasteczek i analityki.
