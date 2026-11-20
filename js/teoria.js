/* ===================================================================
   GW – ściągawka teorii (per moduł) i typowe błędy na kolokwium
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  GW.CHEAT = {
    1: `
<div class="cols"><div>
<h3>Oznaczenia</h3>
<table>
<tr><td>π<sub>1</sub>, π<sub>2</sub>, π<sub>3</sub></td><td>rzutnia pozioma, pionowa (czołowa), boczna (profilowa)</td></tr>
<tr><td>A′, A″, A‴</td><td>rzut poziomy, pionowy, boczny punktu A</td></tr>
<tr><td>A<sup>IV</sup>, A<sup>V</sup></td><td>rzuty na rzutnie dodatkowe (transformacja)</td></tr>
<tr><td>x<sub>12</sub>, x<sub>23</sub>, x<sub>14</sub>, x<sub>45</sub></td><td>osie rzutów (krawędzie rzutni)</td></tr>
<tr><td>h<sub>α</sub>, v<sub>α</sub></td><td>ślad poziomy i pionowy płaszczyzny α</td></tr>
<tr><td>H, V</td><td>ślad poziomy (z = 0) i pionowy (y = 0) prostej</td></tr>
<tr><td>X<sub>α</sub></td><td>punkt zbiegu śladów na osi x<sub>12</sub></td></tr>
</table>
<h3>Rzut punktu</h3>
<ul><li>A′ = (x, y), A″ = (x, z); A′ i A″ leżą na jednej <b>odnoszącej ⟂ x<sub>12</sub></b>.</li>
<li>|A″x<sub>12</sub>| = z (odległość od π<sub>1</sub>), |A′x<sub>12</sub>| = y (odległość od π<sub>2</sub>).</li>
<li>π<sub>3</sub>: A‴ leży na odnoszącej poziomej z A″, w odległości y od osi x<sub>23</sub> (przenosimy z π<sub>1</sub> łukiem lub prostą pod 45°).</li></ul>
<h3>Proste szczególne</h3>
<ul><li><b>pozioma</b> h: h″ ∥ x<sub>12</sub> (h′ – prawdziwy kierunek i długość)</li>
<li><b>czołowa</b> f: f′ ∥ x<sub>12</sub> (f″ – prawdziwa długość)</li>
<li><b>rzutująca</b>: jeden rzut jest punktem</li></ul>
<h3>Przynależność</h3>
<ul><li>Punkt ∈ prosta ⇔ rzuty punktu leżą na jednoimiennych rzutach prostej.</li>
<li>Prosta ∈ płaszczyzna ⇔ dwa jej punkty leżą w płaszczyźnie (np. jej ślady leżą na śladach płaszczyzny).</li></ul>
</div><div>
<h3>Przebicie prostej z płaszczyzną (trójkątem)</h3>
<ol><li>Przez prostą l prowadzimy płaszczyznę rzutującą ε (ślad pokrywa się z l′ lub l″).</li>
<li>k = ε ∩ trójkąt: punkty 1, 2 = ślad ∩ boki, przenosimy odnoszącymi.</li>
<li>P = k ∩ l w drugim rzucie, odnosząca → drugi rzut P.</li></ol>
<p><b>Metoda transformacji:</b> π<sub>4</sub> ⟂ pozioma h płaszczyzny (x<sub>14</sub> ⟂ h′) → płaszczyzna jest w π<sub>4</sub> odcinkiem → P<sup>IV</sup> = l<sup>IV</sup> ∩ odcinek → wracamy odnoszącymi.</p>
<h3>Widoczność – punkty zbieżne</h3>
<ul><li>W π<sub>1</sub> widoczny jest punkt <b>wyższy</b> (większe z – dalej od x<sub>12</sub> w π<sub>2</sub>).</li>
<li>W π<sub>2</sub> widoczny jest punkt <b>bliższy</b> (większe y – dalej od x<sub>12</sub> w π<sub>1</sub>).</li>
<li>W π<sub>3</sub> (widok z lewej) widoczny jest punkt o <b>mniejszym x</b>.</li>
<li>Widoczność zmienia się tylko w punkcie przebicia i na konturze.</li></ul>
<h3>Transformacja</h3>
<ul><li>Zawsze zostaje jedna stara rzutnia, a drugą porzucamy.</li>
<li>Nowa odległość od nowej osi = odległość rzutu <b>porzucanego</b> od starej osi.</li>
<li>Prawdziwa długość odcinka: π<sub>4</sub> ∥ odcinek (x<sub>14</sub> ∥ A′B′).</li>
<li>Rzeczywista wielkość figury: π<sub>4</sub> ⟂ h (płaszczyzna rzutująca), π<sub>5</sub> ∥ figura (x<sub>45</sub> ∥ odcinek w π<sub>4</sub>).</li></ul>
<h3>Linie</h3>
<p>widoczne – <b>ciągła gruba</b>; niewidoczne – <b>kreskowa cienka</b>; odnoszące i konstrukcyjne – ciągłe cienkie.</p>
</div></div>`,
    2: `
<div class="cols"><div>
<h3>Przenikanie wielościanów – metoda krawędzi</h3>
<ol><li>Wybierz krawędzie, których rzuty (w <b>obu</b> rzutach) zachodzą na obrys drugiej bryły.</li>
<li>Przez krawędź prowadź płaszczyznę <b>rzutującą</b> (dla krawędzi pionowej – czołową, dla krawędzi ⟂ π<sub>2</sub> – poziomą).</li>
<li>Przekrój drugiej bryły tą płaszczyzną → wielokąt; jego punkty wspólne z krawędzią = punkty przenikania.</li>
<li>Łącz dwa punkty odcinkiem ⇔ leżą na tej samej ścianie bryły I <b>i</b> tej samej ścianie bryły II.</li></ol>
<h3>Rodzaje przenikania</h3>
<ul><li><b>Częściowe</b> (wgłębienie): jedna zamknięta łamana.</li>
<li><b>Całkowite</b> (przebicie): dwie zamknięte łamane.</li></ul>
</div><div>
<h3>Widoczność</h3>
<ul><li>Odcinek przenikania jest widoczny ⇔ leży na ścianach widocznych <b>w obu</b> bryłach.</li>
<li>Ściana jest widoczna w π<sub>1</sub>, gdy jest zwrócona w górę; w π<sub>2</sub>, gdy jest zwrócona do przodu; w π<sub>3</sub>, gdy jest zwrócona w lewo.</li>
<li>Części krawędzi wewnątrz drugiej bryły nie rysujemy (nie istnieją w sumie brył).</li></ul>
<h3>Graniastosłup na płaszczyźnie podwójnie rzutującej</h3>
<p>Płaszczyzna ⟂ x<sub>12</sub> (profilowa): w π<sub>1</sub> i π<sub>2</sub> jest prostą ⟂ osi, a podstawa prawdziwa widoczna jest dopiero w <b>π<sub>3</sub></b> – dlatego w takim zadaniu kreślimy trzeci rzut.</p>
<h3>Kontrola</h3>
<p>Każdy punkt przenikania leży na krawędzi jednej bryły; liczba punktów na pętli jest parzysta po każdej stronie ściany.</p>
</div></div>`,
    3: `
<div class="cols"><div>
<h3>Metoda plasterkowa (płaszczyzn pomocniczych)</h3>
<ol><li>Wybierz płaszczyzny tnące <b>obie</b> bryły wzdłuż linii łatwych do narysowania (okręgi, proste). Dla osi pionowych → płaszczyzny poziome.</li>
<li>W π<sub>2</sub> ślad v<sub>ε</sub> ∥ x<sub>12</sub>; w π<sub>1</sub> przekroje w rzeczywistej wielkości; punkty wspólne przekrojów → punkty krzywej.</li>
<li>Odnoszące → rzuty pionowe (i boczne).</li></ol>
<h3>Przekroje płaszczyzną poziomą</h3>
<table><tr><td>stożek, walec pionowy, kula</td><td>okrąg</td></tr><tr><td>walec poziomy</td><td>dwie tworzące (proste)</td></tr><tr><td>graniastosłup</td><td>wielokąt</td></tr></table>
</div><div>
<h3>Punkty charakterystyczne (zawsze!)</h3>
<ul><li>najwyższy i najniższy punkt krzywej;</li>
<li>punkty na <b>tworzących konturowych</b> w każdym rzucie (tu zmienia się widoczność, krzywa jest styczna do konturu);</li>
<li>przebicia krawędzi wielościanu z bryłą obrotową;</li>
<li>wierzchołek / punkt osobliwy (np. krzywa przez wierzchołek stożka).</li></ul>
<h3>Widoczność krzywej</h3>
<p>Punkt widoczny ⇔ leży na widocznej części <b>obu</b> powierzchni. π<sub>1</sub>: górne części; π<sub>2</sub>: przednie; π<sub>3</sub> (z lewej): lewe.</p>
<h3>Przekroje stożka płaszczyzną</h3>
<p>elipsa (płaszczyzna mniej stroma niż tworząca), parabola (równoległa do tworzącej), hiperbola (bardziej stroma).</p>
</div></div>`,
    4: `
<div class="cols"><div>
<h3>Układy aksonometryczne</h3>
<table>
<tr><th>układ</th><th>osie</th><th>skróty x:y:z</th></tr>
<tr><td>izometria</td><td>x, y pod 30° do poziomu, z pionowo</td><td>1 : 1 : 1</td></tr>
<tr><td>dimetria prostokątna</td><td>x 7°10′, y 41°25′</td><td>1 : ½ : 1</td></tr>
<tr><td>perspektywa kawalerska (dimetria ukośna)</td><td>x poziomo, z pionowo, y pod 45°</td><td>1 : ½ : 1</td></tr>
<tr><td>perspektywa wojskowa</td><td>x, y pod 45° (rzut poziomy w prawdziwej wielkości), z pionowo</td><td>1 : 1 : 1</td></tr>
</table>
<p>Długości odmierzamy tylko wzdłuż osi lub prostych do nich równoległych.</p>
</div><div>
<h3>Przekrój bryły płaszczyzną ABC (metoda śladów)</h3>
<ol><li>Łącz punkty leżące na tej samej ścianie – to boki przekroju.</li>
<li>Bok przekroju przedłuż do przecięcia z przedłużeniem krawędzi tej ściany → <b>punkt śladowy</b> na prostej krawędzi sąsiedniej ściany.</li>
<li>Na ścianach równoległych boki przekroju są <b>równoległe</b>.</li>
<li>Kontrola: wielokąt przekroju zamyka się.</li></ol>
<p>Rysujemy część pod płaszczyzną grubo, krawędzie niewidoczne kreskową cienką.</p>
<h3>Kład przekroju</h3>
<p>Obrót wokół śladu t do płaszczyzny podstawy; promień obrotu z trójkąta: |FP′| i wysokość z.</p>
</div></div>`,
    5: `
<div class="cols"><div>
<h3>Podstawy</h3>
<ul><li>Cecha = wysokość punktu, np. A(3).</li>
<li><b>Moduł / interwał</b> i: odległość pozioma odpowiadająca 1 m różnicy wysokości. Nachylenie 1 : n → i = n; spadek p% → i = 100/p.</li>
<li>tg α = 1/i; spadek = 1/i · 100%.</li>
<li><b>Stopniowanie</b> odcinka: punkty o cechach całkowitych – twierdzenie Talesa.</li></ul>
<h3>Płaszczyzna</h3>
<ul><li>Warstwice – równoległe proste co i; skala nachylenia (podwójna linia) ⟂ warstwic.</li>
<li>Płaszczyzna przez A o danym nachyleniu i kierunku: warstwice ⟂ S′<sub>β</sub>, co i, przez A warstwica o cesze A.</li>
<li>Prosta o spadku p% przez A leżąca w β: okrąg o środku A i promieniu i<sub>p</sub>·Δh przecina warstwicę (A−Δh) → dwie proste.</li></ul>
<h3>Przecięcia</h3>
<ul><li>Krawędź α ∩ β: przez punkty przecięcia warstwic o <b>równych cechach</b>.</li>
<li>Przebicie prostej: płaszczyzna pomocnicza γ ⊃ l (warstwice przez punkty całkowite l), m = α ∩ γ, P = m ∩ l.</li>
<li>Widoczność z góry: widoczne jest to, co wyżej.</li></ul>
</div><div>
<h3>Roboty ziemne</h3>
<ol><li><b>Linia zerowa</b>: punkty brzegu, gdzie teren = projekt; dzieli nasyp i wykop.</li>
<li>Skarpy nasypu (moduł m<sub>n</sub>) w dół, wykopu (m<sub>w</sub>) w górę; warstwice skarp ∥ krawędzi poziomej, co moduł.</li>
<li><b>Krawędź pochyła</b> (droga): skarpa to obwiednia stożków – z punktu krawędzi o cesze k zakreślamy okrąg r = m; styczna z punktu o cesze k−1 (nasyp) daje warstwicę k−1 skarpy.</li>
<li>Granica robót: przecięcie warstwic skarpy i terenu o <b>tej samej cesze</b>.</li>
<li>Naroża: krawędź skarp przez przecięcia równocechowych warstwic sąsiednich skarp.</li></ol>
<p>Oznaczenia skarp: kreski od krawędzi wyższej (dłuższe i krótsze na przemian).</p>
</div></div>`,
    6: `
<div class="cols"><div>
<h3>Aparat perspektywy (pionowa, stosowana)</h3>
<table>
<tr><td>τ</td><td>tło (rzutnia pionowa), τ′ – jego ślad na rzucie z góry</td></tr>
<tr><td>π, p</td><td>podstawa i podstawa tła (linia gruntu)</td></tr>
<tr><td>h</td><td>horyzont – na wysokości oka</td></tr>
<tr><td>O<sup>τ</sup></td><td>punkt główny (spodek prostopadłej z oka na tło)</td></tr>
<tr><td>g′</td><td>stanowisko (rzut oka), δ – głębokość tłowa (odległość oka od tła)</td></tr>
<tr><td>G</td><td>punkt odległości: na h w odległości δ od O<sup>τ</sup> (zbieg prostych pod 45°)</td></tr>
<tr><td>A<sup>s</sup></td><td>perspektywa punktu A</td></tr>
</table>
<h3>Zasady</h3>
<ul><li>Proste ⟂ tła zbiegają się w O<sup>τ</sup>; proste poziome pod 45° do tła – w G.</li>
<li>Proste równoległe do tła zachowują kierunek (poziome ∥ p, pionowe pionowo).</li>
<li>Na tle wymiary są prawdziwe – tam odkładamy wysokości.</li></ul>
</div><div>
<h3>Perspektywa czołowa z rzutów prostokątnych</h3>
<ol><li>Narysuj p, h (w odległości h), O<sup>τ</sup> nad g′ i G w odległości δ od O<sup>τ</sup>.</li>
<li>Punkt A podstawy: z rzutu poziomego przenieś x na p → punkt T; prosta T–O<sup>τ</sup>.</li>
<li>Głębokość t (odległość A od τ′) odłóż na p od T w stronę <b>przeciwną do G</b> → M; prosta M–G przecina T–O<sup>τ</sup> w A<sup>s</sup>.</li>
<li>Wysokość: na tle w T odłóż prawdziwą wysokość z, połącz z O<sup>τ</sup>; pion z A<sup>s</sup> wyznacza górny punkt.</li>
<li>Widoczność krawędzi – patrzymy z oka.</li></ol>
<h3>Cienie</h3>
<p>Światło słoneczne: punkt zbiegu promieni Z<sub>L</sub> i jego rzut Z<sub>L</sub>′ na horyzoncie; cień pionowej krawędzi leży na prostej przez Z<sub>L</sub>′.</p>
</div></div>`,
  };
  GW.MISTAKES = {
    1: [
      'Linia odnosząca nie jest prostopadła do osi (zwłaszcza x<sub>14</sub>, x<sub>45</sub> przy transformacji).',
      'Przenoszenie odległości z <b>niewłaściwej</b> rzutni – zawsze z porzucanej, od starej osi.',
      'Punkt przebicia poza trójkątem/odcinkiem: trzeba to stwierdzić, a nie „ciągnąć” widoczność.',
      'Widoczność ustalona „na oko” zamiast punktami zbieżnymi; brak zmiany widoczności w punkcie P.',
      'Niewidoczne linie rysowane grubo albo widoczne cienko.',
    ],
    2: [
      'Łączenie punktów, które nie leżą na wspólnej ścianie obu brył.',
      'Pominięcie krawędzi drugiej bryły – przebicia trzeba szukać dla krawędzi <b>obu</b> brył.',
      'Rysowanie fragmentów krawędzi, które są wewnątrz drugiej bryły.',
      'Widoczność odcinka przenikania sprawdzona tylko w jednej bryle.',
      'Brak trzeciego rzutu, gdy podstawa leży na płaszczyźnie podwójnie rzutującej.',
    ],
    3: [
      'Brak punktów charakterystycznych (na konturach, najwyższego/najniższego) – krzywa „ścina” zakręty.',
      'Krzywa narysowana linijką lub łamaną zamiast płynnej linii (krzywikiem).',
      'Zła widoczność: krzywa widoczna tylko gdy leży na widocznych częściach <b>obu</b> brył.',
      'Kontur bryły rysowany także wewnątrz drugiej bryły.',
      'Promień przekroju stożka odczytany z niewłaściwej wysokości (zawsze na poziomie śladu v<sub>ε</sub>).',
    ],
    4: [
      'Odmierzanie długości po prostych nierównoległych do osi (skrót obowiązuje tylko wzdłuż osi).',
      'Niezachowanie równoległości boków przekroju na ścianach równoległych.',
      'Narysowanie grubo części odciętej (grubo tylko część pod płaszczyzną).',
      'Pomyłka skrótu ½ na osi y w dimetrii / perspektywie kawalerskiej.',
    ],
    5: [
      'Mylenie modułu (interwału) z nachyleniem: 1 : n ⇒ odstęp warstwic = n; 40% ⇒ 2,5.',
      'Przecinanie warstwic o <b>różnych</b> cechach przy szukaniu krawędzi / granicy robót.',
      'Na krawędzi pochyłej (droga) warstwice skarp rysowane równolegle do krawędzi – trzeba stożków!',
      'Pomylenie modułów nasypu i wykopu po złej stronie linii zerowej.',
      'Brak naroży (krawędzi skarp) w narożnikach platformy.',
    ],
    6: [
      'Odkładanie głębokości w stronę punktu G zamiast w przeciwną (albo odwrotnie dla G po drugiej stronie).',
      'Wysokości odkładane na krawędzi za tłem zamiast na tle (prawdziwa wielkość tylko na τ).',
      'Zła odległość punktu O<sup>τ</sup> od podstawy p – to wysokość horyzontu h.',
      'Pomylenie głębokości tłowej δ z odległością obiektu od tła.',
    ],
  };
})();
