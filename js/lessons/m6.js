/* ===================================================================
   MODUŁ 6 – Perspektywa (rzut środkowy)
   GW: podstawa π – z = 0; tło τ – płaszczyzna y = 0 (pionowa);
   oko O = (ox, d, hgt), d > 0 (przed tłem); obiekty za tłem (y < 0).
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h;
  const f1 = G.f1;

  function setup(p) {
    const O = [p.ox, p.d, p.hgt];
    const persp = (P) => {
      const s = O[1] / (O[1] - P[1]);
      const X = V.add(O, V.mul(V.sub(P, O), s));
      return [X[0], X[2]];
    };
    const onGlass = (P) => {
      const s = O[1] / (O[1] - P[1]);
      const X = V.add(O, V.mul(V.sub(P, O), s));
      return [X[0], 0.05, X[2]];
    };
    const vp = (dir) => {
      // obraz kierunku (punkt zbiegu)
      if (Math.abs(dir[1]) < 1e-6) return null;
      const t = -O[1] / dir[1];
      const X = V.add(O, V.mul(dir, t));
      return [X[0], X[2]];
    };
    return { O, persp, onGlass, vp };
  }
  function boxDef(p) {
    const ph = G.rad(p.phi);
    const u = [Math.cos(ph), -Math.sin(ph), 0],
      v = [-Math.sin(ph), -Math.cos(ph), 0];
    const A = [p.ax, -p.ay, 0];
    const Bq = V.add(A, V.mul(u, p.a)),
      D = V.add(A, V.mul(v, p.b)),
      C = V.add(Bq, V.mul(v, p.b));
    const base = [A, Bq, C, D];
    const top = base.map((q) => V.add(q, [0, 0, p.H]));
    const names = ['A', 'B', 'C', 'D'];
    const poly = G.prism(base, [0, 0, p.H]);
    return { u, v, base, top, names, poly, H: p.H };
  }
  const commonParams = [
    { k: 'hgt', l: 'wysokość oka h [m]', min: 2, max: 40, step: 0.5, v: 16 },
    { k: 'd', l: 'odległość oka od tła d', min: 30, max: 160, v: 80 },
    { k: 'ox', l: 'położenie oka (x)', min: 10, max: 110, v: 52 },
    { k: 'phi', l: 'obrót bryły [°]', min: 10, max: 80, v: 32 },
    { k: 'ax', l: 'wierzchołek A: x', min: 10, max: 100, v: 48 },
    { k: 'ay', l: 'A: głębokość za tłem', min: 0, max: 40, v: 6 },
    { k: 'a', l: 'długość a', min: 10, max: 60, v: 38 },
    { k: 'b', l: 'szerokość b', min: 10, max: 50, v: 24 },
    { k: 'H', l: 'wysokość bryły', min: 6, max: 50, v: 26 },
  ];
  const eyeCam = (c) => ({ dir: [0, 1, 0], target: [c.data.O[0], 0, c.data.O[2]], dist: c.data.O[1], fov: 62 });
  const sideCam = { dir: [1, 0.35, 0.3] };

  /* elementy aparatu w 3D (wspólne) */
  function apparatus(B, S, ext) {
    const O = S.O;
    const [x0, x1, zt] = ext;
    B.a3({ t: 'poly', id: 'pi', pts: [[x0, -70, 0], [x1, -70, 0], [x1, O[1] + 15, 0], [x0, O[1] + 15, 0]], col: '#9ec29a', op: 0.16, edge: true, noFit: true });
    B.info('pi', 'Podstawa π – płaszczyzna, na której stoi obserwator i obiekty');
    B.a3({ t: 'poly', id: 'tau', pts: [[x0, 0, 0], [x1, 0, 0], [x1, 0, zt], [x0, 0, zt]], col: '#9fd3ff', op: 0.22, edge: true, edgeCol: 0x2a6fdb, labelP: [x0 + 2, 0, zt], label: 'τ' });
    B.info('tau', 'Tło τ – „szklana szyba”: płaszczyzna rzutni, na której powstaje obraz perspektywiczny');
    B.a3({ t: 'seg', id: 'p', a: [x0, 0, 0], b: [x1, 0, 0], s: 'given', label: 'p', labelAt: 0.98 });
    B.info('p', 'Podstawa tła p = τ ∩ π (linia gruntu)');
    B.a3({ t: 'pt', id: 'O', p: O, s: 'eye', label: 'O', r: 1.3 });
    B.info('O', 'Oko (środek rzutu) O – wysokość ' + f1(O[2]) + ', odległość od tła ' + f1(O[1]), ['Og', 'S']);
    B.a3({ t: 'pt', id: 'S', p: [O[0], O[1], 0], s: 'eye', label: "O'", small: true });
    B.a3({ t: 'seg', id: 'S', a: [O[0], O[1], 0], b: O, s: 'thin' });
    B.info('S', "Stanowisko O′ – rzut oka na podstawę (miejsce, gdzie stoi obserwator)");
    B.a3({ t: 'pt', id: 'Og', p: [O[0], 0, O[2]], s: 'eye', label: 'O_g', small: true });
    B.a3({ t: 'seg', id: 'Og', a: O, b: [O[0], 0, O[2]], s: 'eye', w: 0.6 });
    B.info('Og', 'Punkt główny O<sub>g</sub> – spodek prostopadłej z oka na tło (główny promień widzenia); |OO<sub>g</sub>| = d');
    B.a3({ t: 'seg', id: 'hz', a: [x0, 0.05, O[2]], b: [x1, 0.05, O[2]], s: 'aux', label: 'h', labelAt: 0.98 });
    B.info('hz', 'Horyzont h – przecięcie tła płaszczyzną poziomą przez oko; tu leżą punkty zbiegu prostych poziomych');
  }
  function picFrame(B, S, x0, x1, G0) {
    const O = S.O;
    const P = (q) => [q[0], G0 - q[1]];
    B.a2({ t: 'seg', id: 'p', a: P([x0, 0]), b: P([x1, 0]), s: 'given', label: 'p', labelAt: 0.99 });
    B.a2({ t: 'seg', id: 'hz', a: P([x0, O[2]]), b: P([x1, O[2]]), s: 'aux', label: 'h', labelAt: 0.99 });
    B.a2({ t: 'pt', id: 'Og', p: P([O[0], O[2]]), s: 'eye', label: 'O_g', r: 2.6 });
    return P;
  }

  /* =================================================================
     6.1 Aparat rzutowy – widok z oka vs widok z boku
     ================================================================= */
  GW.addLesson({
    id: 'm6-aparat',
    mod: 6,
    title: '6.1 Aparat rzutowy perspektywy',
    v2title: 'Obraz na tle τ (rysunek perspektywiczny)',
    params: commonParams,
    cams: [
      { l: '👁 Widok z oka', cam: eyeCam, title: 'Kamera w oku obserwatora – obraz 3D pokrywa się z rysunkiem na szybie' },
      { l: 'Z boku aparatu', cam: sideCam },
    ],
    special: {
      note: '<b>Widok z oka vs widok z boku.</b> „Widok z oka” stawia kamerę dokładnie w O – wtedy bryła i jej obraz na szybie (tle) pokrywają się idealnie: to definicja perspektywy. „Z boku” pokazuje promienie widzenia przebijające szybę. Zmieniaj wysokość oka i odległość – horyzont i punkty zbiegu przesuwają się na żywo.',
      ui: [
        { type: 'btn', l: '👁 Widok z oka obserwatora', fn: (c) => c.app.applyCam(eyeCam(c)) },
        { type: 'btn', l: 'Widok z boku aparatu', fn: (c) => c.app.applyCam(sideCam) },
        { type: 'check', k: 'rays', l: 'wszystkie promienie widzenia', v: true },
      ],
      overlay(c) {
        const d = c.data;
        if (!d.O || !c.S.rays || c.k < d.rayStep) return {};
        const p3 = [];
        d.verts.forEach((P, i) => p3.push({ t: 'seg', id: 'vr' + i, a: d.O, b: P, s: 'ray', op: 0.5 }));
        return { p3 };
      },
    },
    algo:
      '<ol><li><b>Aparat</b>: oko O, tło τ (pionowa rzutnia – „szyba”), podstawa π (grunt). τ ∩ π = podstawa tła p. O<sub>g</sub> – punkt główny (spodek prostopadłej z O na τ), d = |OO<sub>g</sub>| – odległość.</li>' +
      '<li><b>Horyzont</b> h: prosta na τ na wysokości oka. Wszystkie płaszczyzny poziome „zbiegają się” w h.</li>' +
      '<li><b>Perspektywa punktu</b> A<sup>τ</sup> = (promień OA) ∩ τ.</li>' +
      '<li><b>Punkt zbiegu</b> rodziny prostych równoległych: przecięcie z τ prostej przez O równoległej do nich. Dla prostych poziomych leży na horyzoncie; proste równoległe do τ (np. pionowe) nie mają punktu zbiegu – pozostają równoległe.</li>' +
      '<li><b>Prawdziwa wielkość</b> zachowuje się tylko na tle (np. krawędź stykająca się z τ ma rzeczywistą wysokość).</li></ol>',
    build(p, B) {
      const S = setup(p);
      const bx = boxDef(p);
      const O = S.O;
      const verts = bx.base.concat(bx.top);
      const ext = [Math.min(0, ...verts.map((q) => q[0])) - 15, Math.max(130, ...verts.map((q) => q[0])) + 10, Math.max(p.hgt, p.H) + 25];
      B.data = { O, verts };
      const G0 = 0;
      B.frame2 = [ext[0] - 5, -ext[2] - 5, ext[1] + 5, 12];
      B.step({
        title: 'Podstawa π i tło τ',
        co: 'Dwie płaszczyzny aparatu: <b>podstawa π</b> (pozioma, grunt) i <b>tło τ</b> (pionowa „szyba”). Ich krawędź – <b>podstawa tła p</b>.',
        jak: 'Obraz perspektywiczny powstaje na tle – po prawej widzisz tło „od przodu”.',
        why: 'Perspektywa naśladuje widzenie jednym okiem przez szybę: każdy punkt rysujemy tam, gdzie promień od oka do punktu przebija szybę.',
        cam: sideCam,
      });
      apparatus(B, S, ext);
      ['O', 'S', 'Og', 'hz'].forEach((id) => B.p3.forEach((q) => q.id === id && (q.from = 1)));
      const P = picFrame(B, S, ext[0], ext[1], G0);
      B.p2.forEach((q) => (q.id === 'hz' || q.id === 'Og') && (q.from = 2));
      B.step({
        title: 'Oko O i stanowisko O′',
        co: 'Oko <b>O</b> na wysokości h = ' + f1(O[2]) + ', w odległości d = ' + f1(O[1]) + ' przed tłem. Jego rzut na podstawę – <b>stanowisko O′</b>.',
        jak: 'Zmieniaj wysokość oka suwakiem i obserwuj zmiany obrazu.',
        why: 'Rzut środkowy ma jeden środek – oko. Wszystkie promienie rzutujące przechodzą przez O (w rzucie równoległym byłyby równoległe).',
        cam: sideCam,
      });
      B.step({
        title: 'Punkt główny O_g i horyzont h',
        co: 'Promień główny OO<sub>g</sub> ⟂ τ; <b>O<sub>g</sub></b> leży na <b>horyzoncie h</b> (wysokość oka na tle).',
        jak: 'h = τ ∩ (płaszczyzna pozioma przez O). Na rysunku horyzont to prosta ∥ p w odległości h.',
        why: 'Promień od oka biegnący poziomo (do nieskończenie odległego punktu na poziomie oka) przebija tło dokładnie na wysokości oka – dlatego „linia, gdzie niebo styka się z ziemią” jest na wysokości oczu.',
        cam: { dir: [0.7, 0.6, 0.35] },
      });
      // bryła
      B.step({
        title: 'Obiekt za tłem',
        co: 'Prostopadłościan ' + p.a + '×' + p.b + '×' + p.H + ' stoi na podstawie π za tłem.',
        jak: 'Najedź na wierzchołek w 3D lub na rysunku – podświetli się para: punkt i jego obraz.',
        why: 'Obiekty za tłem są pomniejszane, przed tłem – powiększane; na tle – w rzeczywistej wielkości.',
        cam: sideCam,
      });
      bx.poly.faces.forEach((f, i) => B.a3({ t: 'poly', id: 'bf' + i, pts: f, col: '#e8c060', op: 0.45 }));
      bx.poly.edges.forEach((e, i) => B.a3({ t: 'seg', id: 'be' + i, a: e.a, b: e.b, s: 'proj' }));
      const vnames = bx.names.concat(bx.names.map((n) => n + '_1'));
      verts.forEach((q, i) => {
        B.a3({ t: 'pt', id: 'v' + i, p: q, s: 'given', small: true, label: vnames[i] });
        B.info('v' + i, 'Wierzchołek ' + h(vnames[i]));
      });
      B.step({
        title: 'Perspektywa punktu: promień widzenia przebija tło',
        co: 'Dla wierzchołka A: promień <b>OA</b> przebija tło w <b>A<sup>τ</sup></b>.',
        jak: 'Analitycznie: A<sup>τ</sup> = O + s(A − O), gdzie s = d/(d + |y<sub>A</sub>|) (głębokość za tłem). W konstrukcji wykreślnej używamy rzutu poziomego (moduł 6.2).',
        why: 'To jedyna reguła rzutu środkowego. Wszystkie dalsze konstrukcje (punkty zbiegu, linie wysokości) wynikają z niej.',
        cam: { dir: [0.5, 0.5, 0.45] },
      });
      B.data.rayStep = B.cur;
      const Aq = verts[0];
      B.a3({ t: 'seg', id: 'rayA', a: O, b: Aq, s: 'ray' });
      B.a3({ t: 'pt', id: 'v0', p: S.onGlass(Aq), s: 'res', label: 'A^τ' });
      B.a2({ t: 'pt', id: 'v0', p: P(S.persp(Aq)), s: 'res', label: 'A^τ' });
      B.info('rayA', 'Promień widzenia OA');
      B.link('v0', ['rayA']);
      B.step({
        title: 'Obraz całej bryły',
        co: 'Perspektywa wszystkich wierzchołków i krawędzi – obraz na szybie.',
        jak: 'Na szybie w 3D widzisz ten sam rysunek co po prawej. Kliknij „👁 Widok z oka” – bryła i obraz się pokryją.',
        why: 'Rzut środkowy zachowuje współliniowość (prosta → prosta), ale nie zachowuje równoległości ani stosunku długości.',
        cam: { dir: [0.6, 0.55, 0.4] },
      });
      verts.forEach((q, i) => {
        if (i) {
          B.a3({ t: 'pt', id: 'v' + i, p: S.onGlass(q), s: 'res', small: true });
          B.a2({ t: 'pt', id: 'v' + i, p: P(S.persp(q)), s: 'res', label: vnames[i] + '^τ', r: 2.4 });
        }
      });
      const pcs = G.hlr(
        bx.poly.edges.map((e) => ({ a: e.a, b: e.b })),
        bx.poly.faces.map((f, i) => ({ pts: f, pl: bx.poly.planes[i] })),
        { eye: O }
      );
      pcs.forEach((pc) => {
        B.a2({ t: 'seg', id: 'be' + pc.ei, a: P(S.persp(pc.a)), b: P(S.persp(pc.b)), s: pc.st === 'vis' ? 'vis' : 'hid' });
        B.a3({ t: 'seg', id: 'be' + pc.ei, a: S.onGlass(pc.a), b: S.onGlass(pc.b), s: pc.st === 'vis' ? 'res' : 'hid', w: 0.5 });
      });
      bx.poly.edges.forEach((e, i) => B.info('be' + i, 'Krawędź bryły i jej obraz perspektywiczny'));
      // punkty zbiegu
      const Z1 = S.vp(bx.u),
        Z2 = S.vp(bx.v);
      B.step({
        title: 'Punkty zbiegu Z₁, Z₂ na horyzoncie',
        co: 'Krawędzie poziome równoległe do AB zbiegają się w <b>Z<sub>1</sub></b>, równoległe do AD – w <b>Z<sub>2</sub></b>. Krawędzie pionowe pozostają pionowe.',
        jak: 'Z oka prowadzimy prostą równoległą do AB – jej przebicie z tłem to Z<sub>1</sub> (zielone promienie w 3D). Dla AD – Z<sub>2</sub>.',
        why: 'Wszystkie proste równoległe „spotykają się w nieskończoności” w jednym punkcie niewłaściwym; jego obraz to przebicie tła prostą z oka w tym kierunku. Proste poziome → punkty zbiegu na horyzoncie (prosta z O pozioma przebija τ na wysokości oka).',
        cam: { dir: [0.35, 1, 0.9] },
      });
      [
        [Z1, 'Z1', 'Z_1', bx.u],
        [Z2, 'Z2', 'Z_2', bx.v],
      ].forEach(([Z, id, nm, dir]) => {
        if (!Z) return;
        B.a3({ t: 'seg', id, a: O, b: [Z[0], 0, Z[1]], s: 'aux2' });
        B.a3({ t: 'pt', id, p: [Z[0], 0.05, Z[1]], s: 'res2', label: nm });
        B.a2({ t: 'pt', id, p: P(Z), s: 'res2', label: nm });
        B.info(id, 'Punkt zbiegu ' + h(nm) + ': prosta z oka ∥ krawędziom ' + (id === 'Z1' ? 'AB, DC' : 'AD, BC') + ' przebija tło na horyzoncie');
        const ends = id === 'Z1' ? [0, 3, 4, 7] : [0, 1, 4, 5];
        ends.forEach((k) => B.a2({ t: 'seg', id, a: P(S.persp(verts[k])), b: P(Z), s: 'thin' }));
      });
    },
  });

  /* =================================================================
     6.2 Perspektywa bryły – metoda punktów zbiegu (z rzutu poziomego)
     ================================================================= */
  GW.addLesson({
    id: 'm6-zbieg',
    mod: 6,
    title: '6.2 Perspektywa bryły – metoda punktów zbiegu',
    v2title: 'Rzut poziomy (góra) + perspektywa (dół)',
    params: commonParams,
    cams: [
      { l: '👁 Widok z oka', cam: eyeCam },
      { l: 'Z boku aparatu', cam: sideCam },
    ],
    special: { note: 'Górna część rysunku to <b>rzut poziomy</b> (plan) z tłem τ′ i stanowiskiem O′, dolna – <b>perspektywa</b>. Pionowe linie odnoszące przenoszą położenia z τ′ na obraz. Najedź na dowolny punkt – podświetli się jego odpowiednik w 3D i w drugiej części rysunku.' },
    algo:
      '<ol><li><b>Plan</b>: rysujemy rzut poziomy bryły, ślad tła τ′ i stanowisko O′ (w odległości d przed τ′). Poniżej – horyzont h (wysokość oka nad p).</li>' +
      '<li><b>Punkty zbiegu</b>: z O′ prowadzimy równoległe do kierunków krawędzi poziomych → przecięcia z τ′ → odnoszącymi na horyzont: Z<sub>1</sub>, Z<sub>2</sub>.</li>' +
      '<li><b>Punkty śladowe</b> (przebicia prostych krawędzi z tłem): przedłużamy krawędzie w planie do τ′ → odnoszącymi na p. Perspektywa prostej = punkt śladowy → punkt zbiegu.</li>' +
      '<li><b>Linie wysokości</b>: w punkcie śladowym (na tle) wysokość jest rzeczywista – odkładamy H na pionie i łączymy z punktem zbiegu → górna krawędź.</li>' +
      '<li><b>Promienie z O′</b> do wierzchołków planu przecinają τ′; odnoszące w dół dają położenie pionowych krawędzi w perspektywie.</li>' +
      '<li><b>Widoczność</b>: widoczne ściany zwrócone do oka.</li></ol>',
    build(p, B) {
      const S = setup(p);
      const bx = boxDef(p);
      const O = S.O;
      const verts = bx.base.concat(bx.top);
      B.data = { O, verts };
      const xs = verts.map((q) => q[0]).concat([O[0]]);
      const x0 = Math.min(0, ...xs) - 20,
        x1 = Math.max(130, ...xs) + 20;
      const Hm = Math.max(p.hgt, p.H) + 12;
      const G0 = O[1] + 18 + Hm;
      const Pl = (q) => [q[0], q[1]];
      const Pc = (q) => [q[0], G0 - q[1]];
      B.step({
        title: 'Plan, tło τ′, stanowisko O′ i horyzont',
        co: 'Rzut poziomy bryły nad śladem tła <b>τ′</b>; stanowisko <b>O′</b> w odległości d = ' + f1(O[1]) + ' przed τ′. Poniżej – podstawa tła p i horyzont h na wysokości ' + f1(O[2]) + '.',
        jak: 'Plan i obraz rysujemy jeden pod drugim, tak by odnoszące z τ′ były pionowe.',
        why: 'Rzut poziomy daje nam położenia przebić promieni z tłem (współrzędna x na τ′), a obraz – wysokości. Razem wyznaczają obraz.',
        cam: sideCam,
      });
      apparatus(B, S, [x0, x1, Hm + 10]);
      bx.poly.faces.forEach((f, i) => B.a3({ t: 'poly', id: 'bf' + i, pts: f, col: '#e8c060', op: 0.45 }));
      bx.poly.edges.forEach((e, i) => B.a3({ t: 'seg', id: 'be' + i, a: e.a, b: e.b, s: 'proj' }));
      B.a2({ t: 'seg', id: 'tau', a: [x0, 0], b: [x1, 0], s: 'aux', label: "τ'", labelAt: 0.99 });
      B.a2({ t: 'pt', id: 'S', p: Pl(O), s: 'eye', label: "O'" });
      B.a2({ t: 'seg', id: 'Og', a: Pl(O), b: [O[0], 0], s: 'thin' });
      B.a2({ t: 'pl', id: 'plan', pts: bx.base.map(Pl), closed: true, s: 'given' });
      bx.base.forEach((q, i) => {
        B.a2({ t: 'pt', id: 'v' + i, p: Pl(q), s: 'given', label: bx.names[i] + "'", r: 2.4 });
        B.a3({ t: 'pt', id: 'v' + i, p: q, s: 'given', small: true, label: bx.names[i] });
        B.info('v' + i, 'Wierzchołek ' + bx.names[i] + ' (rzut poziomy ' + bx.names[i] + '′)');
      });
      B.info('plan', 'Rzut poziomy (plan) podstawy bryły');
      const P = picFrame(B, S, x0, x1, G0);
      // punkty zbiegu
      const Z1 = S.vp(bx.u),
        Z2 = S.vp(bx.v);
      B.step({
        title: 'Punkty zbiegu Z₁, Z₂',
        co: 'Z O′ prowadzimy równoległe do A′B′ i A′D′ → na τ′ punkty Z<sub>1</sub>′, Z<sub>2</sub>′ → odnoszącymi w dół na horyzont: <b>Z<sub>1</sub>, Z<sub>2</sub></b>.',
        jak: 'Pamiętaj: punkt zbiegu leży na horyzoncie, bo krawędzie są poziome.',
        why: 'Prosta z oka równoległa do krawędzi jest pozioma (leży na wysokości oka) – przebija tło na horyzoncie, a jej rzut poziomy przechodzi przez O′ równolegle do rzutu krawędzi.',
        cam: { dir: [0.3, 0.8, 1] },
      });
      [
        [Z1, 'Z1', 'Z_1', bx.u],
        [Z2, 'Z2', 'Z_2', bx.v],
      ].forEach(([Z, id, nm]) => {
        if (!Z) return;
        B.a2({ t: 'seg', id, a: Pl(O), b: [Z[0], 0], s: 'aux2' });
        B.a2({ t: 'pt', id, p: [Z[0], 0], s: 'aux2', label: nm + "'", r: 2.4 });
        B.a2({ t: 'seg', id, a: [Z[0], 0], b: P(Z), s: 'odn' });
        B.a2({ t: 'pt', id, p: P(Z), s: 'res2', label: nm });
        B.a3({ t: 'seg', id, a: O, b: [Z[0], 0, Z[1]], s: 'aux2' });
        B.a3({ t: 'pt', id, p: [Z[0], 0.05, Z[1]], s: 'res2', label: nm });
        B.info(id, 'Punkt zbiegu ' + h(nm) + ' krawędzi ' + (id === 'Z1' ? 'AB ∥ DC' : 'AD ∥ BC'));
      });
      B.src('v0', 'v1', 'v3');
      // punkty śladowe
      const trace = (Pp, dir) => {
        const t = -Pp[1] / dir[1];
        return V.add(Pp, V.mul(dir, t));
      };
      const A = bx.base[0];
      const S1 = trace(A, bx.u),
        S2 = trace(A, bx.v);
      B.step({
        title: 'Punkty śladowe i perspektywy krawędzi podstawy',
        co: 'Przedłużamy A′B′ i A′D′ do τ′: punkty śladowe <b>S<sub>1</sub>, S<sub>2</sub></b> → odnoszącymi na p. Prosta S<sub>1</sub>Z<sub>1</sub> to perspektywa krawędzi AB (z przedłużeniem), S<sub>2</sub>Z<sub>2</sub> – krawędzi AD. Ich przecięcie: <b>A<sup>τ</sup></b>.',
        jak: 'Perspektywę prostej wyznaczają dwa punkty: jej przebicie z tłem (śladowy – leży na p, bo prosta jest na podstawie) i jej punkt zbiegu.',
        why: 'Punkt leżący na tle jest swoim własnym obrazem. Punkt zbiegu to obraz punktu niewłaściwego prostej. Prosta przechodzi przez oba – więc jej obraz też.',
      });
      [
        [S1, 'S1', 'S_1', Z1],
        [S2, 'S2', 'S_2', Z2],
      ].forEach(([Sx, id, nm, Z]) => {
        B.a2({ t: 'seg', id, a: Pl(A), b: [Sx[0], 0], s: 'thin' });
        B.a2({ t: 'pt', id, p: [Sx[0], 0], s: 'aux', label: nm + "'", r: 2.4 });
        B.a2({ t: 'seg', id, a: [Sx[0], 0], b: P([Sx[0], 0]), s: 'odn' });
        B.a2({ t: 'pt', id, p: P([Sx[0], 0]), s: 'aux', label: nm, r: 2.4 });
        if (Z) B.a2({ t: 'seg', id, a: P([Sx[0], 0]), b: P(Z), s: 'aux' });
        B.a3({ t: 'pt', id, p: Sx, s: 'aux', label: nm });
        B.a3({ t: 'seg', id, a: A, b: Sx, s: 'thin' });
        B.info(id, 'Punkt śladowy ' + h(nm) + ' – przebicie prostej krawędzi z tłem (leży na p)');
      });
      const pA = S.persp(A);
      B.a2({ t: 'pt', id: 'v0', p: P(pA), s: 'res', label: 'A^τ' });
      B.a3({ t: 'pt', id: 'v0', p: S.onGlass(A), s: 'res', label: 'A^τ', small: true });
      B.a3({ t: 'seg', id: 'rayA', a: O, b: A, s: 'ray' });
      // linie wysokości
      B.step({
        title: 'Linie wysokości – górne krawędzie',
        co: 'W punktach śladowych (na tle) odkładamy <b>rzeczywistą wysokość H = ' + p.H + '</b> → S<sub>1</sub><sup>H</sup>, S<sub>2</sub><sup>H</sup>; łączymy z punktami zbiegu → perspektywy górnych krawędzi; nad A<sup>τ</sup> otrzymujemy A<sub>1</sub><sup>τ</sup>.',
        jak: 'Pionowa przez S<sub>1</sub> na tle to „linia wysokości”: tylko tam mierzymy wysokości w rzeczywistej wielkości.',
        why: 'Płaszczyzna ściany ABA<sub>1</sub>B<sub>1</sub> przecina tło wzdłuż pionowej przez S<sub>1</sub>; na tle obraz = przedmiot, więc wysokość ściany jest tam prawdziwa. Górna krawędź jest ∥ dolnej → ten sam punkt zbiegu.',
      });
      [
        [S1, 'H1', Z1],
        [S2, 'H2', Z2],
      ].forEach(([Sx, id, Z]) => {
        B.a2({ t: 'seg', id, a: P([Sx[0], 0]), b: P([Sx[0], p.H]), s: 'dist' });
        if (Z) B.a2({ t: 'seg', id, a: P([Sx[0], p.H]), b: P(Z), s: 'aux' });
        B.a3({ t: 'seg', id, a: Sx, b: V.add(Sx, [0, 0, p.H]), s: 'dist' });
        B.info(id, 'Linia wysokości: rzeczywista wysokość H = ' + p.H + ' odłożona na tle');
      });
      const pA1 = S.persp(bx.top[0]);
      B.a2({ t: 'pt', id: 'v4', p: P(pA1), s: 'res', label: 'A_1^τ' });
      B.a2({ t: 'seg', id: 'be-A', a: P(pA), b: P(pA1), s: 'res' });
      // promienie
      B.step({
        title: 'Promienie z O′ – pozostałe krawędzie pionowe',
        co: 'Promienie <b>O′B′, O′C′, O′D′</b> przecinają τ′; odnoszące w dół wyznaczają pionowe krawędzie B, C, D na perspektywach krawędzi podstawy i góry.',
        jak: 'B<sup>τ</sup> leży na S<sub>1</sub>Z<sub>1</sub>, D<sup>τ</sup> na S<sub>2</sub>Z<sub>2</sub>, C<sup>τ</sup> = B<sup>τ</sup>Z<sub>2</sub> ∩ D<sup>τ</sup>Z<sub>1</sub> (kontrola: też na odnoszącej z O′C′).',
        why: 'Rzut poziomy promienia widzenia OB to O′B′; jego przebicie z tłem ma tę samą współrzędną x co obraz B<sup>τ</sup> (odnosząca pionowa).',
      });
      [1, 2, 3].forEach((i) => {
        const q = bx.base[i];
        const X = S.persp(q);
        const id = 'r' + i;
        B.a2({ t: 'seg', id, a: Pl(O), b: Pl(q), s: 'ray' });
        B.a2({ t: 'pt', id, p: [X[0], 0], s: 'thin', r: 1.8 });
        B.a2({ t: 'seg', id, a: [X[0], 0], b: P([X[0], Math.max(S.persp(bx.top[i])[1], 0)]), s: 'odn' });
        B.a2({ t: 'pt', id: 'v' + i, p: P(X), s: 'res', label: bx.names[i] + '^τ', r: 2.6 });
        B.a2({ t: 'pt', id: 'v' + (i + 4), p: P(S.persp(bx.top[i])), s: 'res', r: 2.2 });
        B.a3({ t: 'seg', id, a: O, b: q, s: 'ray' });
        B.a3({ t: 'pt', id: 'v' + i, p: S.onGlass(q), s: 'res', small: true });
        B.info(id, 'Promień widzenia do ' + bx.names[i] + ' w rzucie poziomym: O′' + bx.names[i] + '′');
      });
      // widoczność
      B.step({
        title: 'Krawędzie i widoczność',
        co: 'Łączymy obrazy wierzchołków; krawędzie widoczne – grubo, niewidoczne – przerywane.',
        jak: 'Widoczne są ściany zwrócone ku oku. Sprawdź „👁 Widok z oka”.',
        why: 'Widoczność w perspektywie określamy względem oka (rzut środkowy): ściana jest widoczna, gdy oko leży po jej zewnętrznej stronie.',
        cam: eyeCam,
      });
      const pcs = G.hlr(
        bx.poly.edges.map((e) => ({ a: e.a, b: e.b })),
        bx.poly.faces.map((f, i) => ({ pts: f, pl: bx.poly.planes[i] })),
        { eye: O }
      );
      pcs.forEach((pc) => {
        B.a2({ t: 'seg', id: 'be' + pc.ei, a: P(S.persp(pc.a)), b: P(S.persp(pc.b)), s: pc.st === 'vis' ? 'vis' : 'hid' });
        B.a3({ t: 'seg', id: 'be' + pc.ei, a: S.onGlass(pc.a), b: S.onGlass(pc.b), s: pc.st === 'vis' ? 'res' : 'hid', w: 0.5 });
      });
    },
  });

  /* =================================================================
     6.3 Cienie w perspektywie (światło słoneczne)
     ================================================================= */
  GW.addLesson({
    id: 'm6-cienie',
    mod: 6,
    title: '6.3 Cień bryły w perspektywie',
    v2title: 'Perspektywa z cieniem (światło równoległe)',
    params: [
      { k: 'az', l: 'azymut słońca [°]', min: -170, max: 170, v: 125 },
      { k: 'el', l: 'wysokość słońca [°]', min: 10, max: 75, v: 35 },
    ].concat(commonParams),
    cams: [
      { l: '👁 Widok z oka', cam: eyeCam },
      { l: 'Z boku aparatu', cam: sideCam },
    ],
    special: { note: 'Zmieniaj azymut i wysokość słońca – punkt zbiegu promieni Z<sub>L</sub> przechodzi nad horyzont (słońce przed obserwatorem, cień ku niemu) lub pod (słońce za plecami, cień „ucieka” od obserwatora).' },
    algo:
      '<ol><li>Światło słoneczne = promienie równoległe ⇒ w perspektywie mają <b>punkt zbiegu Z<sub>L</sub></b> (obraz kierunku światła). Rzuty poziome promieni (cienie pionowych prętów na gruncie) zbiegają się w <b>Z<sub>L</sub>′</b> na horyzoncie, pionowo nad/pod Z<sub>L</sub>.</li>' +
      '<li><b>Cień pionowej krawędzi</b> AA<sub>1</sub> na gruncie: prosta A<sup>τ</sup>Z<sub>L</sub>′ (kierunek cienia) ∩ promień A<sub>1</sub><sup>τ</sup>Z<sub>L</sub> (promień przez wierzchołek) = cień A<sub>1</sub>*.</li>' +
      '<li>Cienie krawędzi poziomych górnej podstawy są ∥ tym krawędziom ⇒ zbiegają się w tych samych punktach zbiegu Z<sub>1</sub>, Z<sub>2</sub> (kontrola!).</li>' +
      '<li><b>Kontur cienia</b> = otoczka cieni wierzchołków; ściany odwrócone od słońca – <b>cień własny</b>.</li></ol>',
    build(p, B) {
      const S = setup(p);
      const bx = boxDef(p);
      const O = S.O;
      const verts = bx.base.concat(bx.top);
      B.data = { O, verts };
      let s = [Math.cos(G.rad(p.el)) * Math.cos(G.rad(p.az)), Math.cos(G.rad(p.el)) * Math.sin(G.rad(p.az)), Math.sin(G.rad(p.el))];
      if (Math.abs(s[1]) < 0.03) s[1] = 0.03 * Math.sign(s[1] || 1);
      const shadow = (Q) => V.sub(Q, V.mul(s, Q[2] / s[2]));
      const xs = verts.map((q) => q[0]).concat(verts.map((q) => shadow(q)[0]));
      const x0 = Math.min(0, ...xs) - 20,
        x1 = Math.max(130, ...xs) + 20;
      const ZL = S.vp(s),
        ZLp = S.vp([s[0], s[1], 0]);
      const top = Math.max(p.hgt, p.H, ZL ? Math.min(ZL[1], 120) : 0) + 15;
      const bot = ZL ? Math.max(-120, Math.min(-5, ZL[1] - 10)) : -5;
      const P = (q) => [q[0], -q[1]];
      B.step({
        title: 'Dane: perspektywa bryły i kierunek światła',
        co: 'Bryła w perspektywie (z modułu 6.2) i kierunek promieni słonecznych: azymut ' + p.az + '°, wysokość ' + p.el + '°.',
        jak: 'W 3D: żółte strzałki – kierunek promieni. Słońce jest ' + (s[1] < 0 ? 'przed obserwatorem (za bryłą)' : 'za plecami obserwatora') + '.',
        why: 'Słońce jest tak daleko, że promienie traktujemy jako równoległe – cień jest rzutem równoległym bryły na grunt w kierunku światła.',
        cam: sideCam,
      });
      apparatus(B, S, [x0, x1, top]);
      picFrame(B, S, x0, x1, 0);
      B.frame2 = [x0 - 5, -top - 5, x1 + 5, -bot + 8];
      bx.poly.faces.forEach((f, i) => B.a3({ t: 'poly', id: 'bf' + i, pts: f, col: '#e8c060', op: 0.6 }));
      bx.poly.edges.forEach((e, i) => B.a3({ t: 'seg', id: 'be' + i, a: e.a, b: e.b, s: 'proj' }));
      const pcs = G.hlr(
        bx.poly.edges.map((e) => ({ a: e.a, b: e.b })),
        bx.poly.faces.map((f, i) => ({ pts: f, pl: bx.poly.planes[i] })),
        { eye: O }
      );
      pcs.forEach((pc) => pc.st === 'vis' && B.a2({ t: 'seg', id: 'be' + pc.ei, a: P(S.persp(pc.a)), b: P(S.persp(pc.b)), s: 'vis', z: 2 }));
      const vn = bx.names.concat(bx.names.map((n) => n + '_1'));
      verts.forEach((q, i) => {
        B.a2({ t: 'pt', id: 'v' + i, p: P(S.persp(q)), s: 'given', r: 2.2, label: i >= 4 ? vn[i] : null });
        B.a3({ t: 'pt', id: 'v' + i, p: q, s: 'given', small: true, label: vn[i] });
        B.info('v' + i, 'Wierzchołek ' + h(vn[i]));
      });
      const c3 = G.centroid(bx.top);
      for (let k = -1; k <= 1; k++) {
        const st = V.add(c3, V.add(V.mul(s, 30), [k * 8, 0, 0]));
        B.a3({ t: 'seg', id: 'sun', a: st, b: V.add(st, V.mul(s, -14)), s: 'lightl' });
      }
      B.info('sun', 'Kierunek promieni słonecznych');
      B.step({
        title: 'Punkt zbiegu promieni Z_L i Z_L′',
        co: ZL ? 'Prosta z oka równoległa do promieni przebija tło w <b>Z<sub>L</sub></b> (' + (ZL[1] > O[2] ? 'nad horyzontem' : 'pod horyzontem') + '); jej rzut poziomy – w <b>Z<sub>L</sub>′</b> na horyzoncie (pionowo nad/pod Z<sub>L</sub>).' : 'Promienie równoległe do tła – brak punktu zbiegu (cienie równoległe).',
        jak: 'Z<sub>L</sub> = obraz kierunku światła; Z<sub>L</sub>′ = obraz kierunku rzutu poziomego promieni (kierunku cieni prętów pionowych).',
        why: 'Promienie słońca to rodzina prostych równoległych – mają wspólny punkt zbiegu. Cienie pionowych krawędzi na gruncie są rzutami poziomymi promieni – równoległe i poziome, więc zbiegają się na horyzoncie.',
        cam: { dir: [0.5, 0.9, 0.6] },
      });
      if (ZL) {
        B.a2({ t: 'pt', id: 'ZL', p: P(ZL), s: 'light', label: 'Z_L', r: 3.4 });
        B.a2({ t: 'pt', id: 'ZLp', p: P(ZLp), s: 'light', label: "Z_L'", r: 3 });
        B.a2({ t: 'seg', id: 'ZLp', a: P(ZL), b: P(ZLp), s: 'light' });
        B.a3({ t: 'seg', id: 'ZL', a: O, b: [ZL[0], 0, ZL[1]], s: 'lightl' });
        B.a3({ t: 'pt', id: 'ZL', p: [ZL[0], 0.05, ZL[1]], s: 'lightl', label: 'Z_L' });
        B.a3({ t: 'pt', id: 'ZLp', p: [ZLp[0], 0.05, ZLp[1]], s: 'lightl', label: "Z_L'" });
        B.info('ZL', 'Punkt zbiegu promieni świetlnych Z<sub>L</sub>');
        B.info('ZLp', 'Z<sub>L</sub>′ – punkt zbiegu cieni krawędzi pionowych (na horyzoncie)');
      }
      // cienie krawędzi pionowych
      const sh = bx.top.map(shadow);
      const lit = bx.poly.planes.map((pl) => V.dot(pl.n, s) > 0);
      // krawędzie pionowe dające kontur cienia
      const hullIdx = G.hull2(bx.base.map((q) => [q[0], q[1]]).concat(sh.map((q) => [q[0], q[1]])));
      B.step({
        title: 'Cienie krawędzi pionowych',
        co: 'Cień wierzchołka A<sub>1</sub>: prosta <b>A<sup>τ</sup>Z<sub>L</sub>′</b> (cień krawędzi pionowej na gruncie) ∩ promień <b>A<sub>1</sub><sup>τ</sup>Z<sub>L</sub></b> = A<sub>1</sub>*. Tak samo dla B<sub>1</sub>, C<sub>1</sub>, D<sub>1</sub>.',
        jak: 'Dwie proste w obrazie: jedna przez podstawę krawędzi i Z<sub>L</sub>′, druga przez jej górny koniec i Z<sub>L</sub>. Ich przecięcie to cień górnego końca.',
        why: 'Płaszczyzna przez pionową krawędź i promień światła jest pionowa; przecina grunt wzdłuż cienia krawędzi. Cień wierzchołka leży na tej linii i na promieniu przez wierzchołek – czyli w ich przecięciu.',
        cam: { dir: [0.7, 0.8, 0.6] },
      });
      bx.top.forEach((T, i) => {
        const id = 'sh' + i;
        const b0 = S.persp(bx.base[i]),
          t0 = S.persp(T),
          s0 = S.persp(sh[i]);
        if (ZL) {
          B.a2({ t: 'seg', id, a: P(b0), b: P(ZLp), s: 'light' });
          B.a2({ t: 'seg', id, a: P(t0), b: P(ZL), s: 'light' });
        }
        B.a2({ t: 'pt', id, p: P(s0), s: 'lightl', r: 2.8, label: bx.names[i] + '_1*' });
        B.a3({ t: 'seg', id, a: T, b: sh[i], s: 'light' });
        B.a3({ t: 'seg', id, a: bx.base[i], b: sh[i], s: 'lightl', w: 0.6 });
        B.a3({ t: 'pt', id, p: sh[i], s: 'lightl', small: true, label: bx.names[i] + '_1*' });
        B.info(id, 'Cień wierzchołka ' + bx.names[i] + '<sub>1</sub>: przecięcie cienia krawędzi pionowej z promieniem przez wierzchołek');
      });
      B.src('ZL', 'ZLp');
      // kontur cienia
      const shPoly = G.hull2(bx.base.map((q) => [q[0], q[1]]).concat(sh.map((q) => [q[0], q[1]]))).map((q) => [q[0], q[1], 0]);
      B.step({
        title: 'Kontur cienia rzuconego i cień własny',
        co: 'Cień rzucony = obrys cieni wierzchołków i podstawy. Ściany odwrócone od słońca – <b>cień własny</b> (ciemniejsze).',
        jak: 'Kontrola: cienie górnych krawędzi poziomych zbiegają się w Z<sub>1</sub>, Z<sub>2</sub> (są równoległe do krawędzi). Granica cienia własnego na bryle to <i>linia graniczna</i> – krawędzie między ścianą oświetloną i nieoświetloną.',
        why: 'Kontur cienia jest cieniem linii granicznej bryły. Ściana jest oświetlona, gdy jej normalna zewnętrzna tworzy kąt ostry z kierunkiem do słońca.',
        cam: eyeCam,
      });
      B.a2({ t: 'poly', id: 'shadow', pts: shPoly.map((q) => P(S.persp(q))), fill: '#555', op: 0.45, z: -1 });
      B.a3({ t: 'poly', id: 'shadow', pts: shPoly.map((q) => [q[0], q[1], 0.06]), col: '#333333', op: 0.55 });
      B.info('shadow', 'Cień rzucony bryły na grunt');
      bx.poly.faces.forEach((f, i) => {
        const vis = V.dot(bx.poly.planes[i].n, V.sub(O, f[0])) > 0;
        if (!vis) return;
        B.a2({ t: 'poly', id: 'own' + i, pts: f.map((q) => P(S.persp(q))), fill: lit[i] ? '#f6e7b0' : '#8a7a50', op: lit[i] ? 0.9 : 0.85, z: 1 });
        B.info('own' + i, lit[i] ? 'Ściana oświetlona' : 'Ściana w cieniu własnym');
        if (!lit[i]) B.a3({ t: 'poly', id: 'own' + i, pts: f, col: '#6b5a30', op: 0.85 });
      });
    },
  });

  /* =================================================================
     6.4 Perspektywa czołowa z rzutów prostokątnych (Lista 6; wykład)
         metoda punktu głównego O^τ i punktu odległości G
     ================================================================= */
  const bxT = (x0, x1, t0, t1, z0, z1) => G.box(x0, x1, -t1, -t0, z0, z1);
  const PV = {
    L6Z1: { n: '📋 Lista 6 · zad. 1: wielokąt (L) na podstawie, h = 30, δ = 90', poly: [[20, 10], [70, 10], [70, 50], [100, 50], [100, 80], [20, 80]], h: 30, d: 90, gs: 1 },
    L6Z2: { n: '📋 Lista 6 · zad. 2: bryła (ostrosłup klinowy), h = 40, δ = 90', parts: () => [G.pyramid([[-30, -10, 0], [70, -10, 0], [70, -60, 0], [-30, -60, 0]], [70, -10, 80])], h: 40, d: 90, gs: 1 },
    L6Z3: { n: '📋 Lista 6 · zad. 3: dwa prostopadłościany, h = 40, δ = 90', parts: () => [bxT(-90, -50, 20, 40, 0, 80), bxT(-90, -50, 60, 80, 0, 80)], h: 40, d: 90, gs: -1 },
    L6Z4: { n: '📋 Lista 6 · zad. 4: bryła z otworem, h = 40, δ = 90', parts: () => [bxT(40, 60, 10, 50, 0, 80), bxT(95, 135, 10, 50, 0, 80), bxT(60, 95, 10, 50, 0, 20), bxT(60, 95, 10, 50, 60, 80)], h: 40, d: 90, gs: -1 },
    W1: { n: 'Wykład: prostokąt 30 + 70 × 50 (na tle), h = 40, δ = 90', poly: [[-30, 0], [70, 0], [70, 50], [-30, 50]], h: 40, d: 90, gs: 1 },
    W2: { n: 'Wykład B: prostokąt 100 × 50 (15 za tłem), h = 35, δ = 90', poly: [[25, 15], [125, 15], [125, 65], [25, 65]], h: 35, d: 90, gs: 1 },
    W3: { n: 'Wykład A: wielokąt L (10/25/15, 10/40/30), h = 30, δ = 90', poly: [[10, 10], [35, 10], [35, 50], [50, 50], [50, 80], [10, 80]], h: 30, d: 90, gs: 1 },
    W4: { n: 'Wykład: wielościan „⊐” z rzutów, h = 30, δ = 70', parts: () => [bxT(-50, -30, 10, 45, 0, 75), bxT(-100, -50, 10, 45, 0, 20), bxT(-100, -50, 10, 45, 55, 75)], h: 30, d: 70, gs: -1 },
  };
  GW.addLesson({
    id: 'm6-rzuty',
    mod: 6,
    lista: 'L6 Z1–4',
    title: '6.4 Perspektywa czołowa z rzutów prostokątnych (O^τ, G)',
    v2title: 'Rzuty prostokątne (góra) i perspektywa (dół)',
    opts: [
      { k: 'set', l: 'Zadanie', choices: Object.keys(PV).map((k) => [k, PV[k].n]), v: 'L6Z1', rebuildFrame: true },
      {
        k: 'gs',
        l: 'Punkt odległości G',
        choices: [
          ['auto', 'jak w zadaniu'],
          ['1', 'po prawej stronie O^τ'],
          ['-1', 'po lewej stronie O^τ'],
        ],
        v: 'auto',
      },
    ],
    params: [
      { k: 'dh', l: 'zmiana wysokości horyzontu h', min: -20, max: 40, v: 0 },
      { k: 'dd', l: 'zmiana głębokości tłowej δ', min: -40, max: 60, v: 0 },
      { k: 'gx', l: 'przesunięcie stanowiska g′', min: -40, max: 40, v: 0 },
    ],
    cams: [
      { l: '👁 Widok z oka', cam: (c) => ({ dir: [0, 1, 0], target: [c.data.O[0], 0, c.data.O[2]], dist: c.data.O[1], fov: 70 }), title: 'Kamera w oku – obraz pokrywa się z bryłą' },
      { l: 'Z boku aparatu', cam: { dir: [1, 0.55, 0.45] } },
    ],
    mistakes: ['Głębokość t odkładamy na p od punktu T w stronę <b>przeciwną</b> do G (G po prawej → odkładamy w lewo).', 'Wysokości odkładamy <b>na tle</b> (w punkcie T, w prawdziwej wielkości), a dopiero potem prowadzimy do O<sup>τ</sup>.', 'Odległość O<sup>τ</sup> od p to wysokość horyzontu h, a odległość G od O<sup>τ</sup> to głębokość tłowa δ – nie myl ich.'],
    algo:
      '<ol><li><b>Aparat</b>: podstawa tła p, horyzont h (w odległości h od p), punkt główny <b>O<sup>τ</sup></b> nad stanowiskiem g′, punkt odległości <b>G</b> na h w odległości δ od O<sup>τ</sup>.</li>' +
      '<li><b>Punkt podstawy A</b> (odległość x od g′, głębokość t za τ′): z rzutu poziomego przenosimy x na p → <b>T</b>; prosta T–O<sup>τ</sup> to perspektywa prostej ⟂ tła przez A.</li>' +
      '<li>Od T odkładamy na p głębokość t w stronę przeciwną do G → <b>M</b>; prosta M–G (obraz prostej pod 45° do tła) przecina T–O<sup>τ</sup> w <b>A<sup>s</sup></b>.</li>' +
      '<li><b>Wysokość</b> z: na tle w punkcie T odkładamy prawdziwą wysokość (T<sub>z</sub>), prosta T<sub>z</sub>–O<sup>τ</sup>; pion z A<sup>s</sup> wyznacza punkt na wysokości z.</li>' +
      '<li>Łączymy punkty w krawędzie, ustalamy widoczność (z oka).</li></ol>',
    build(p, B) {
      const cfg = PV[p.set] || PV.L6Z1;
      const hh = cfg.h + (p.dh || 0),
        dd = cfg.d + (p.dd || 0);
      const gs = p.gs === 'auto' ? cfg.gs : +p.gs;
      const gx = p.gx || 0;
      const S = setup({ ox: gx, d: dd, hgt: hh });
      const O = S.O;
      let U = null,
        creases,
        verts3;
      if (cfg.parts) {
        U = new G.Union(cfg.parts());
        creases = U.creaseEdges();
      } else {
        const P = cfg.poly.map((q) => [q[0], -q[1], 0]);
        creases = P.map((a, i) => ({ a, b: P[(i + 1) % P.length] }));
      }
      verts3 = G.dedupe([].concat(...creases.map((e) => [e.a, e.b])), 1e-6);
      const xs = verts3.map((q) => q[0]),
        ts = verts3.map((q) => -q[1]),
        zs = verts3.map((q) => q[2]);
      const xmin = Math.min(gx, ...xs),
        xmax = Math.max(gx, ...xs),
        tmax = Math.max(...ts),
        zmax = Math.max(0, ...zs);
      // układ arkusza
      const Yt = 0;
      const Yf = Yt - tmax - 16;
      const Yh = Yt + 22,
        Yp = Yh + hh;
      const Xs = xmax + 22;
      const plan = (P) => [P[0], Yt + P[1]];
      const front = (P) => [P[0], Yf - P[2]];
      const side = (P) => [Xs + tmax + P[1], Yf - P[2]];
      const img = (P) => {
        const q = S.persp(P);
        return [q[0], Yp - q[1]];
      };
      const Ot = [gx, Yh],
        Gp = [gx + gs * dd, Yh];
      const fitX = [Math.min(xmin, Gp[0], gx - 10) - 12, Math.max(xmax, Gp[0], Xs + tmax + 5) + 12];
      B.frame2 = [fitX[0], (zmax ? Yf - zmax : Yt - tmax) - 14, fitX[1], Yp + 18];
      B.data = { O, verts: verts3 };
      B.step({
        title: 'Dane: rzuty prostokątne, τ′, g′, h = ' + G.f0(hh) + ', δ = ' + G.f0(dd),
        co: cfg.n.replace('📋 ', '') + '. Dane są rzuty prostokątne (wymiary w mm), ślad tła <b>τ′</b>, stanowisko <b>g′</b>, wysokość horyzontu <b>h = ' + G.f0(hh) + '</b> i głębokość tłowa <b>δ = ' + G.f0(dd) + '</b>.',
        jak: 'Rzut poziomy leży nad τ′ (obiekt za tłem). Odległości x mierzymy od g′, głębokości t – od τ′.',
        why: 'W perspektywie czołowej tło jest równoległe do frontu obiektu – krawędzie ∥ tła zachowują kierunek, a krawędzie ⟂ tła zbiegają się w punkcie głównym.',
        cam: { dir: [0.9, 0.7, 0.55] },
      });
      // 2D: rzuty prostokątne
      const viewEdges = (dir, map, id, label) => {
        const pcs = U ? G.hlr(creases, U.faces(), { dir }) : creases.map((e) => ({ a: e.a, b: e.b, st: 'vis' }));
        pcs.forEach((pc) => B.a2({ t: 'seg', id, a: map(pc.a), b: map(pc.b), s: pc.st === 'vis' ? 'given' : 'hid' }));
        B.info(id, label);
      };
      viewEdges([0, 0, 1], plan, 'plan', 'Rzut poziomy obiektu (nad śladem tła τ′)');
      if (zmax > 0) {
        viewEdges([0, 1, 0], front, 'front', 'Rzut pionowy (z przodu)');
        viewEdges([-1, 0, 0], side, 'side', 'Rzut boczny (z lewej)');
        B.a2({ t: 'seg', id: 'xax', a: [fitX[0] + 4, Yf], b: [xmax + 8, Yf], s: 'thin', label: 'x', labelAt: 0.02 });
        B.a2({ t: 'seg', id: 'xax', a: [Xs - 4, Yf], b: [Xs + tmax + 8, Yf], s: 'thin' });
      }
      B.a2({ t: 'seg', id: 'tau1', a: [fitX[0] + 2, Yt], b: [Math.max(xmax, gx) + 14, Yt], s: 'given', label: "τ'", labelAt: 0.97 });
      B.info('tau1', 'τ′ – ślad tła na rzucie poziomym');
      B.a2({ t: 'arrow', id: 'g1', a: [gx, Yt + 13], b: [gx, Yt + 2], s: 'given' });
      B.a2({ t: 'text', id: 'g1', p: [gx + 5, Yt + 10], txt: "g'", s: 'note' });
      B.info('g1', 'g′ – stanowisko obserwatora (rzut oka; oko jest w odległości δ przed tłem)');
      // 3D: aparat
      const x0 = fitX[0],
        x1 = fitX[1];
      B.a3({ t: 'poly', id: 'pi', pts: [[x0, -tmax - 20, 0], [x1, -tmax - 20, 0], [x1, dd + 10, 0], [x0, dd + 10, 0]], col: '#9ec29a', op: 0.14, edge: true, noFit: true });
      B.info('pi', 'Podstawa π');
      B.a3({ t: 'poly', id: 'tau', pts: [[x0, 0, 0], [x1, 0, 0], [x1, 0, Math.max(hh, zmax) + 20], [x0, 0, Math.max(hh, zmax) + 20]], col: '#9fd3ff', op: 0.2, edge: true, edgeCol: 0x2a6fdb, labelP: [x0 + 3, 0, Math.max(hh, zmax) + 20], label: 'τ' });
      B.info('tau', 'Tło τ (pionowa rzutnia perspektywy)');
      B.a3({ t: 'pt', id: 'O', p: O, s: 'eye', label: 'O', r: 1.3 });
      B.a3({ t: 'seg', id: 'O', a: [O[0], O[1], 0], b: O, s: 'thin' });
      B.a3({ t: 'seg', id: 'Ot', a: O, b: [O[0], 0, O[2]], s: 'eye', w: 0.6 });
      B.info('O', 'Oko O: wysokość h = ' + G.f0(hh) + ', odległość od tła δ = ' + G.f0(dd));
      if (U) U.parts.forEach((pp) => pp.faces.forEach((f) => B.a3({ t: 'poly', id: 'solid', pts: f, col: '#e8c060', op: 0.45 })));
      creases.forEach((e) => B.a3({ t: 'seg', id: 'solidE', a: e.a, b: e.b, s: 'proj' }));
      if (!U) B.a3({ t: 'poly', id: 'solid', pts: creases.map((e) => e.a), col: '#e8c060', op: 0.55 });
      B.info('solid', 'Obiekt za tłem');
      // aparat 2D
      B.step({
        title: 'Aparat: p, h, O^τ i punkt odległości G',
        co: 'Rysujemy podstawę tła <b>p</b>, horyzont <b>h</b> w odległości ' + G.f0(hh) + ' nad p, punkt główny <b>O<sup>τ</sup></b> (pod g′, na h) i <b>punkt odległości G</b> w odległości δ = ' + G.f0(dd) + ' od O<sup>τ</sup> (' + (gs > 0 ? 'po prawej' : 'po lewej') + ').',
        jak: 'p i h są równoległe do τ′. Współrzędne x przenosimy z rzutu poziomego pionowymi odnoszącymi (g′ → O<sup>τ</sup>).',
        why: 'O<sup>τ</sup> to zbieg prostych ⟂ tła (spodek prostopadłej z oka na tło). G to zbieg prostych poziomych nachylonych pod 45° do tła – leży na horyzoncie w odległości δ, bo promień z oka pod 45° przebija tło po przebyciu δ w bok.',
        cam: { dir: [0.9, 0.7, 0.55] },
      });
      B.a2({ t: 'seg', id: 'p', a: [fitX[0] + 2, Yp], b: [fitX[1] - 2, Yp], s: 'given', label: 'p', labelAt: 0.02 });
      B.a2({ t: 'seg', id: 'h', a: [fitX[0] + 2, Yh], b: [fitX[1] - 2, Yh], s: 'aux', label: 'h', labelAt: 0.02 });
      B.a2({ t: 'pt', id: 'Ot', p: Ot, s: 'eye', label: 'O^τ', r: 3 });
      B.a2({ t: 'pt', id: 'G', p: Gp, s: 'eye', label: 'G', r: 3 });
      B.a2({ t: 'seg', id: 'gOt', a: [gx, Yt + 2], b: Ot, s: 'odn' });
      B.a2({ t: 'seg', id: 'dimh', a: [fitX[1] - 6, Yp], b: [fitX[1] - 6, Yh], s: 'dist', label: 'h', labelAt: 0.5 });
      B.a2({ t: 'seg', id: 'dimd', a: [Ot[0], Yh - 4], b: [Gp[0], Yh - 4], s: 'dist', label: 'δ', labelAt: 0.5 });
      B.info('p', 'Podstawa tła p = τ ∩ π');
      B.info('h', 'Horyzont h – na wysokości oka');
      B.info('Ot', 'Punkt główny O<sup>τ</sup> – zbieg prostych prostopadłych do tła');
      B.info('G', 'Punkt odległości G – zbieg prostych poziomych pod 45° do tła; |O<sup>τ</sup>G| = δ');
      B.a3({ t: 'seg', id: 'p', a: [x0, 0, 0], b: [x1, 0, 0], s: 'given', label: 'p', labelAt: 0.98 });
      B.a3({ t: 'seg', id: 'h', a: [x0, 0.05, hh], b: [x1, 0.05, hh], s: 'aux', label: 'h', labelAt: 0.98 });
      B.a3({ t: 'pt', id: 'Ot', p: [O[0], 0.05, hh], s: 'eye', label: 'O^τ', small: true });
      B.a3({ t: 'pt', id: 'G', p: [O[0] + gs * dd, 0.05, hh], s: 'eye', label: 'G', small: true });
      B.a3({ t: 'seg', id: 'G', a: O, b: [O[0] + gs * dd, 0, hh], s: 'eye', w: 0.5 });
      // punkty podstawy (rzuty poziome wierzchołków)
      const foot = G.dedupe(verts3.map((q) => [q[0], q[1], 0]), 1e-6);
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
      const fname = (P) => letters[foot.findIndex((q) => Math.abs(q[0] - P[0]) < 1e-6 && Math.abs(q[1] - P[1]) < 1e-6)] || '?';
      B.step({
        title: 'Punkty podstawy: proste ⟂ tła → O^τ',
        co: 'Dla każdego punktu rzutu poziomego (' + foot.map(fname).join(', ') + ') przenosimy jego x na p (punkt T) i łączymy T z O<sup>τ</sup>.',
        jak: 'W rzucie poziomym prowadzimy z punktu prostą ⟂ τ′ do τ′; odnoszącą pionową przenosimy na p.',
        why: 'Prosta prostopadła do tła przechodzi przez punkt i przebija tło w T (rzeczywiste położenie na p); jej perspektywa zbiega się w O<sup>τ</sup>.',
        cam: { dir: [0.75, 0.75, 0.6] },
      });
      foot.forEach((P) => {
        const n = fname(P);
        const id = 'f' + n;
        B.a2({ t: 'pt', id: id + 'p', p: plan(P), s: 'given', r: 2, label: n + "'" });
        B.a2({ t: 'seg', id: id + 'o', a: plan(P), b: [P[0], Yp], s: 'odn' });
        B.a2({ t: 'pt', id: id + 'T', p: [P[0], Yp], s: 'aux', r: 1.8 });
        B.a2({ t: 'seg', id: id + 'l', a: [P[0], Yp], b: Ot, s: 'thin' });
        B.info(id + 'o', 'Odnosząca z rzutu poziomego ' + n + '′ na p (punkt T<sub>' + n + '</sub>)');
        B.info(id + 'l', 'T<sub>' + n + '</sub>–O<sup>τ</sup>: perspektywa prostej ⟂ tła przez ' + n);
        B.a3({ t: 'seg', id: id + 'l', a: [P[0], 0, 0], b: P, s: 'thin' });
      });
      B.step({
        title: 'Głębokość przez punkt odległości G',
        co: 'Od T odkładamy na p głębokość t (odległość punktu od τ′) w stronę ' + (gs > 0 ? 'lewą' : 'prawą') + ' → M; prosta M–G przecina T–O<sup>τ</sup> w punkcie perspektywy.',
        jak: 'Odcinek |TM| = t przenosimy cyrklem z rzutu poziomego (od punktu do τ′). Punkty podstawy łączymy w perspektywę rzutu poziomego.',
        why: 'Prosta pozioma pod 45° do tła przez punkt A przebija tło w M, odległym od T dokładnie o t (trójkąt prostokątny równoramienny w rzucie poziomym). Jej perspektywa zbiega się w G – stąd przecięcie z T–O<sup>τ</sup> daje A<sup>s</sup>.',
        cam: { dir: [0.75, 0.75, 0.6] },
      });
      const footImg = {};
      foot.forEach((P) => {
        const n = fname(P);
        const id = 'f' + n;
        const t = -P[1];
        const Mx = P[0] - gs * t;
        const As = img(P);
        footImg[n] = As;
        if (t > 1e-6) {
          B.a2({ t: 'seg', id: id + 'd', a: [P[0], Yp + 1.5], b: [Mx, Yp + 1.5], s: 'dist' });
          B.a2({ t: 'pt', id: id + 'M', p: [Mx, Yp], s: 'aux', r: 1.8 });
          B.a2({ t: 'seg', id: id + 'g', a: [Mx, Yp], b: As, s: 'aux', w: 0.8 });
          B.a2({ t: 'seg', id: id + 'g', a: As, b: Gp, s: 'thin' });
          B.info(id + 'd', 'Głębokość t = ' + G.f0(t) + ' odłożona na p od T<sub>' + n + '</sub>');
          B.info(id + 'g', 'Prosta M–G: perspektywa prostej pod 45° do tła przez ' + n);
          B.a3({ t: 'seg', id: id + 'g', a: [Mx, 0, 0], b: P, s: 'aux', w: 0.6 });
        }
        B.a2({ t: 'pt', id: id + 's', p: As, s: 'res', label: n + '^s', r: 2.6 });
        B.info(id + 's', h(n + '^s') + ' – perspektywa punktu ' + n + ' podstawy (t = ' + G.f0(t) + ', x = ' + G.f0(P[0] - gx) + ' od g′)');
        B.a3({ t: 'pt', id: id + 's', p: S.onGlass(P), s: 'res', small: true });
        B.a3({ t: 'seg', id: id + 'r', a: O, b: P, s: 'ray', op: 0.4 });
      });
      const baseEdges = creases.filter((e) => Math.abs(e.a[2]) < 1e-6 && Math.abs(e.b[2]) < 1e-6);
      baseEdges.forEach((e) => B.a2({ t: 'seg', id: 'base', a: img(e.a), b: img(e.b), s: zmax ? 'aux2' : 'res' }));
      B.info('base', 'Perspektywa podstawy (rzutu poziomego)');
      // wysokości
      const up = verts3.filter((q) => q[2] > 1e-6);
      if (up.length) {
        const levels = [...new Set(up.map((q) => q[2]))].sort((a, b) => a - b);
        B.step({
          title: 'Wysokości: odkładamy na tle i prowadzimy do O^τ',
          co: 'Wysokości (' + levels.map(G.f0).join(', ') + ') odkładamy na tle w prawdziwej wielkości w punktach T, łączymy z O<sup>τ</sup> i przecinamy z pionami z punktów podstawy.',
          jak: 'Pionowe krawędzie pozostają pionowe (są ∥ tła). Na tle (w T) wysokość jest prawdziwa; prosta T<sub>z</sub>–O<sup>τ</sup> to perspektywa poziomej prostej ⟂ tła na wysokości z.',
          why: 'Tylko na tle obraz ma prawdziwe wymiary – za tłem wszystko się zmniejsza proporcjonalnie do s = δ/(δ + t).',
          cam: { dir: [0.75, 0.75, 0.6] },
        });
        up.forEach((P) => {
          const n = fname(P);
          const lvl = levels.indexOf(P[2]) + 1;
          const nm = n + '_' + lvl;
          const id = 'u' + n + lvl;
          const Tz = [P[0], Yp - P[2]];
          const Ps = img(P);
          B.a2({ t: 'seg', id: id + 'h', a: [P[0], Yp], b: Tz, s: 'dist' });
          B.a2({ t: 'seg', id: id + 'l', a: Tz, b: Ot, s: 'thin' });
          B.a2({ t: 'seg', id: id + 'v', a: footImg[n], b: Ps, s: 'aux', w: 0.8 });
          B.a2({ t: 'pt', id: id + 's', p: Ps, s: 'res', label: nm + '^s', r: 2.4 });
          B.info(id + 'h', 'Wysokość z = ' + G.f0(P[2]) + ' odłożona na tle w T<sub>' + n + '</sub> (prawdziwa wielkość)');
          B.info(id + 's', h(nm + '^s') + ' – perspektywa wierzchołka na wysokości ' + G.f0(P[2]));
          B.a3({ t: 'pt', id: id + 's', p: S.onGlass(P), s: 'res', small: true });
        });
      }
      // krawędzie i widoczność
      B.step({
        title: 'Krawędzie i widoczność',
        co: 'Łączymy punkty w krawędzie; krawędzie widoczne z oka – grubo, niewidoczne – kreskowo cienko.',
        jak: 'Pomocnicze linie konstrukcyjne można już pominąć (filtr „Bez konstrukcji”).',
        why: 'Widoczność ustalamy tak, jak widzi oko: promień od oka do punktu krawędzi nie może przebić żadnej ściany.',
        cam: { dir: [0.6, 0.9, 0.5] },
      });
      B.endWhere((q) => /^f.*[olgdM]$/.test(q.id) || /^u.*[hlv]$/.test(q.id) || q.id === 'base');
      const pcs = U ? G.hlr(creases, U.faces(), { eye: O }) : creases.map((e) => ({ a: e.a, b: e.b, st: 'vis' }));
      pcs.forEach((pc) => {
        B.a2({ t: 'seg', id: 'res', a: img(pc.a), b: img(pc.b), s: pc.st === 'vis' ? 'vis' : 'hid' });
        B.a3({ t: 'seg', id: 'res', a: S.onGlass(pc.a), b: S.onGlass(pc.b), s: pc.st === 'vis' ? 'res' : 'hid' });
      });
      B.info('res', 'Krawędź w perspektywie (widoczność z oka)');
      B.step({
        title: 'Wynik',
        co: 'Perspektywa czołowa obiektu. Kliknij „👁 Widok z oka” nad widokiem 3D – obraz na tle pokrywa się z bryłą.',
        jak: 'Zmień h, δ lub położenie g′ suwakami – zobacz, jak zmienia się obraz (wysoki horyzont = widok z góry, mała δ = silne zbieganie).',
        why: 'Perspektywa zachowuje współliniowość, ale nie równoległość krawędzi ⟂ tła ani stosunku długości.',
        cam: { dir: [0.6, 0.9, 0.5] },
      });
      B.data.ok = true;
    },
  });
})();
