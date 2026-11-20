/* ===================================================================
   MODUŁ 1 – Rzuty Monge'a
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h,
    lab = GW.lab;

  /* ---------- wspólne narzędzia modułu ---------- */
  function monge(B) {
    const sys = new GW.ProjSys();
    sys.root('p2', 2);
    B.useSys(sys);
    B.addPlane('p1', 1, 'p2', [0, 0], [1, 0], [0, 1], null);
    B.planeFrom.p1 = 0;
    return sys;
  }
  GW.monge = monge;
  const P3 = (p, k) => [p[k + 'x'], p[k + 'y'], p[k + 'z']];
  const xyzParams = (n, x, y, z, rng) => [
    { k: n + 'x', l: n + ': x', min: rng ? rng[0] : 0, max: rng ? rng[1] : 110, v: x },
    { k: n + 'y', l: n + ': y (odl. od π₂)', min: 0, max: 80, v: y },
    { k: n + 'z', l: n + ': z (odl. od π₁)', min: 0, max: 80, v: z },
  ];
  GW.xyzParams = xyzParams;
  GW.P3 = P3;

  function tri(B, names, pts, o = {}) {
    names.forEach((n, i) => B.mPoint(n, pts[i], { s: o.s || 'given', pre: o.pre }));
    const id = o.id || names.join('');
    B.mPoly(id, pts, { col: o.col, name: 'trójkąta ' + names.join('') });
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      B.mSeg(names[i] + names[j], pts[i], pts[j], { s: 'given', name: names[i] + names[j], what: 'boku ' + names[i] + names[j] });
    }
  }
  GW.tri = tri;
  const extend2 = (a, b, f) => [V.add(a, V.mul(V.sub(a, b), f)), V.add(b, V.mul(V.sub(b, a), f))];
  const extend3 = extend2;

  /* -------------------------------------------------------------------
     Przebicie odcinka L (A,B) z trójkątem T metodą płaszczyzny rzutującej.
     Dodaje kroki do buildera. Zwraca dane wyniku.
     ------------------------------------------------------------------- */
  function pierce(B, sys, L, T, o) {
    const dir = V.sub(L.B, L.A);
    const l1 = V.len([dir[0], dir[1]]),
      l2 = V.len([dir[0], dir[2]]);
    const tv = o.tv || (l2 >= 0.35 * V.len(dir) ? 'p2' : 'p1'); // rzutnia, w której ε jest prostą
    const rv = tv === 'p2' ? 'p1' : 'p2';
    const kt = sys.get(tv).k,
      kr = sys.get(rv).k;
    const eps = G.planePN(L.A, V.cross(dir, tv === 'p2' ? [0, 1, 0] : [0, 0, 1]));
    const triPl = G.plane3(T.pts[0], T.pts[1], T.pts[2]);
    const cand = [];
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      const r = G.segPlane(T.pts[i], T.pts[j], eps);
      if (!r) continue;
      cand.push({ t: r.t, p: r.p, ins: r.t >= -1e-9 && r.t <= 1 + 1e-9, edge: T.names[i] + T.names[j], i, j });
    }
    cand.sort((a, b) => (b.ins ? 1 : 0) - (a.ins ? 1 : 0));
    const pts12 = [];
    cand.forEach((c) => {
      if (pts12.length < 2 && !pts12.some((q) => V.dist(q.p, c.p) < 1e-6)) pts12.push(c);
    });
    const rP = G.segPlane(L.A, L.B, triPl);
    const P = rP ? rP.p : null;
    const insideTri = P && G.pointInPoly3(P, T.pts, triPl.n);
    const onSeg = rP && rP.t >= 0 && rP.t <= 1;
    const n1 = o.n1 || '1',
      n2 = o.n2 || '2',
      nP = o.P || 'P',
      ne = o.eps || 'ε';
    const pre = o.pre || '';
    const trName = (tv === 'p2' ? 'v' : 'h') + '_{' + ne + '}';
    const res = { P, insideTri, onSeg, tv, rv, eps, pts12 };
    if (!P || pts12.length < 2) return res;

    /* krok a: płaszczyzna pomocnicza */
    B.step({
      title: o.detail ? 'Płaszczyzna pomocnicza ' + ne + ' przez prostą ' + L.name : 'Krawędź ' + L.name + ' – płaszczyzna ' + ne + ' i krawędź k',
      co:
        'Przez ' +
        (L.what || 'prostą ' + L.name) +
        ' prowadzimy płaszczyznę pomocniczą <b>' +
        ne +
        ' ⟂ π<sub>' +
        kt +
        '</sub></b> (' +
        (tv === 'p2' ? 'pionowo-rzutującą' : 'poziomo-rzutującą') +
        ').' +
        (o.detail ? '' : ' Wyznaczamy też krawędź k = ' + ne + ' ∩ trójkąt ' + T.names.join('') + '.'),
      jak:
        'Ślad ' +
        h(trName) +
        ' pokrywa się z rzutem ' +
        h(lab(L.name, kt)) +
        ' – nic nie trzeba konstruować: płaszczyzna rzutująca „widziana z boku” jest prostą.' +
        (o.detail ? '' : ' Punkty ' + h(lab(n1, kt)) + ', ' + h(lab(n2, kt)) + ' = przecięcia ' + h(lab(L.name, kt)) + ' z bokami trójkąta; odnoszącymi przenosimy je do π<sub>' + kr + '</sub> → ' + h(lab('k', kr)) + '.'),
      why:
        'Płaszczyzna prostopadła do rzutni rzutuje się na nią w prostą (wszystkie promienie rzutujące leżą w niej). Dlatego każdy punkt leżący w ' +
        ne +
        ' ma rzut na π<sub>' +
        kt +
        '</sub> na śladzie ' +
        h(trName) +
        ' – to „gotowe miejsce” do szukania wspólnych punktów.',
      cam: tv === 'p2' ? { dir: [0.35, 1, 0.45] } : { dir: [0.4, 0.5, 1] },
    });
    const ed = extend3(L.A, L.B, 0.25);
    // czworokąt płaszczyzny ε
    const w = tv === 'p2' ? [0, 1, 0] : [0, 0, 1];
    const span = 75;
    const base = (q) => (tv === 'p2' ? [q[0], 0, q[2]] : [q[0], q[1], 0]);
    const quad = [base(ed[0]), base(ed[1]), V.add(base(ed[1]), V.mul(w, span)), V.add(base(ed[0]), V.mul(w, span))];
    B.planeQuad(pre + 'eps', quad, { col: '#3a7be0', op: 0.14 });
    B.info(pre + 'eps', 'Płaszczyzna pomocnicza ' + ne + ' – zawiera ' + (L.what || 'prostą ' + L.name) + ' i jest prostopadła do π<sub>' + kt + '</sub>');
    const tr2 = extend2(sys.toSheet(tv, L.A), sys.toSheet(tv, L.B), 0.25);
    B.a2({ t: 'seg', id: pre + 'eps', a: tr2[0], b: tr2[1], s: 'auxd', label: trName, labelAt: 0.97 });
    B.a3({ t: 'seg', id: pre + 'eps', a: base(ed[0]), b: base(ed[1]), pl: tv, s: 'aux' });
    B.src(L.id + '|' + kt);
    B.link(pre + 'eps', [L.id + '|' + kt]);

    /* krok b: krawędź k */
    if (o.detail)
      B.step({
        title: 'Krawędź k = ' + ne + ' ∩ (' + T.names.join('') + ') – punkty ' + n1 + ', ' + n2,
        co: 'Wyznaczamy krawędź <b>k</b> przecięcia płaszczyzny ' + ne + ' z płaszczyzną trójkąta – przez jej dwa punkty ' + n1 + ' i ' + n2 + ' leżące na bokach ' + pts12[0].edge + ' i ' + pts12[1].edge + '.',
        jak:
          '<ol><li>W rzucie π<sub>' +
          kt +
          '</sub>: ' +
          h(lab(n1, kt)) +
          ' = ' +
          h(trName) +
          ' ∩ ' +
          h(lab(pts12[0].edge, kt)) +
          ', ' +
          h(lab(n2, kt)) +
          ' = ' +
          h(trName) +
          ' ∩ ' +
          h(lab(pts12[1].edge, kt)) +
          '.</li><li>Liniami odnoszącymi (⟂ x<sub>12</sub>) przenosimy je na rzuty boków w π<sub>' +
          kr +
          '</sub>: ' +
          h(lab(n1, kr)) +
          ' ∈ ' +
          h(lab(pts12[0].edge, kr)) +
          ', ' +
          h(lab(n2, kr)) +
          ' ∈ ' +
          h(lab(pts12[1].edge, kr)) +
          '.</li><li>' +
          h(lab('k', kr)) +
          ' = ' +
          h(lab(n1, kr)) +
          h(lab(n2, kr)) +
          '.</li></ol>',
        why:
          'Punkty ' +
          n1 +
          ', ' +
          n2 +
          ' leżą jednocześnie w ' +
          ne +
          ' (ich rzuty są na śladzie) i na bokach trójkąta – więc należą do obu płaszczyzn. Dwie płaszczyzny przecinają się wzdłuż prostej, a prostą wyznaczają dwa punkty.' +
          (pts12.some((q) => !q.ins) ? ' <i>Uwaga: jeden z punktów leży na przedłużeniu boku – to w pełni poprawne, płaszczyzna trójkąta jest nieograniczona.</i>' : ''),
        cam: 'iso',
      });
    [
      [n1, pts12[0]],
      [n2, pts12[1]],
    ].forEach(([nm, c]) => {
      B.mPoint(nm, c.p, { s: 'aux', pre, ray: true });
      if (!c.ins) {
        // przedłużenie boku
        const a = T.pts[c.i],
          b = T.pts[c.j];
        const end = c.t > 1 ? b : a;
        ['p1', 'p2'].forEach((pid) => B.a2({ t: 'seg', id: pre + 'ext' + nm, a: sys.toSheet(pid, end), b: sys.toSheet(pid, c.p), s: 'thin' }));
        B.a3({ t: 'seg', id: pre + 'ext' + nm, a: end, b: c.p, s: 'thin' });
      }
      B.src(c.edge + '|' + kt, c.edge + '|' + kr);
    });
    const kk = extend3(pts12[0].p, pts12[1].p, 0.15);
    B.a3({ t: 'seg', id: pre + 'k', a: kk[0], b: kk[1], s: 'aux' });
    B.a2({ t: 'seg', id: pre + 'k|' + kr, a: sys.toSheet(rv, kk[0]), b: sys.toSheet(rv, kk[1]), s: 'aux', label: lab('k', kr), labelAt: 0.95 });
    B.info(pre + 'k', 'Krawędź k – część wspólna płaszczyzny ' + ne + ' i płaszczyzny trójkąta ' + T.names.join(''), [pre + 'k|' + kr]);
    B.info(pre + 'k|' + kr, h(lab('k', kr)) + ' – rzut krawędzi k; w π<sub>' + kt + '</sub> krawędź k pokrywa się ze śladem ' + h(trName), [pre + 'k', pre + 'eps']);

    /* krok c: punkt przebicia */
    B.step({
      title: 'Punkt przebicia ' + nP + ' = k ∩ ' + L.name,
      co: 'Punkt przebicia <b>' + nP + '</b> leży na przecięciu krawędzi k z ' + (L.what || 'prostą ' + L.name) + '.',
      jak:
        '<ol><li>W π<sub>' +
        kr +
        '</sub>: ' +
        h(lab(nP, kr)) +
        ' = ' +
        h(lab('k', kr)) +
        ' ∩ ' +
        h(lab(L.name, kr)) +
        '.</li><li>Odnoszącą przenosimy go na ' +
        h(lab(L.name, kt)) +
        ' → ' +
        h(lab(nP, kt)) +
        '.</li></ol>' +
        (insideTri && onSeg ? '' : '<b>' + nP + ' leży poza ' + (insideTri ? 'odcinkiem ' + L.name : 'trójkątem') + '</b> → ' + (L.what || 'prosta') + ' nie przebija trójkąta (przebija tylko jego płaszczyznę).'),
      why:
        'Prosta ' +
        L.name +
        ' i krawędź k leżą w tej samej płaszczyźnie ' +
        ne +
        ', więc się przecinają. Ich punkt wspólny należy do ' +
        L.name +
        ' i do k ⊂ płaszczyzna trójkąta – czyli jest szukanym punktem przebicia. W π<sub>' +
        kt +
        '</sub> obie proste się pokrywają, dlatego punkt odczytujemy w π<sub>' +
        kr +
        '</sub>.',
      cam: 'iso',
    });
    B.mPoint(nP, P, { s: 'res', pre, ray: true });
    B.src(pre + 'k|' + kr, L.id + '|' + kr);
    res.idP = pre + nP;
    return res;
  }
  GW.pierce = pierce;

  /* sprawdzenie widoczności punktami zbieżnymi */
  function coverPoints(B, sys, pid, segs1, segs2, names, o = {}) {
    // segs: [{A,B,name}] ; szukamy przecięcia rzutów segs1 × segs2 w pid
    const other = pid === 'p1' ? 'p2' : 'p1';
    const k = sys.get(pid).k,
      ko = sys.get(other).k;
    for (const s1 of segs1)
      for (const s2 of segs2) {
        const a = sys.toSheet(pid, s1.A),
          b = sys.toSheet(pid, s1.B),
          c = sys.toSheet(pid, s2.A),
          d = sys.toSheet(pid, s2.B);
        const r = G.line2(a, b, c, d);
        if (!r || r.t < 0.04 || r.t > 0.96 || r.u < 0.04 || r.u > 0.96) continue;
        if (o.avoid && o.avoid.some((q) => V.dist(q, r.p) < 3)) continue;
        const X1 = V.lerp(s1.A, s1.B, r.t),
          X2 = V.lerp(s2.A, s2.B, r.u);
        const d1 = sys.dist(pid, X1),
          d2 = sys.dist(pid, X2);
        const vis1 = d1 > d2;
        return { X1, X2, s1, s2, vis1, n1: names[0], n2: names[1], k, ko, other };
      }
    return null;
  }
  function addCover(B, sys, cp, pre = '') {
    B.mPoint(cp.n1, cp.X1, { s: 'aux2', pre, ray: true, odn: true });
    B.mPoint(cp.n2, cp.X2, { s: 'aux2', pre, ray: true, odn: true });
    B.src(pre + cp.n1 + '|' + cp.ko, pre + cp.n2 + '|' + cp.ko);
  }
  GW.coverPoints = coverPoints;
  GW.addCover = addCover;

  /* =================================================================
     1.1 Punkt, prosta, ślady prostej i płaszczyzny
     ================================================================= */
  GW.addLesson({
    id: 'm1-elementy',
    mod: 1,
    title: '1.1 Punkt, prosta, ślady, płaszczyzna',
    v2title: 'Rzuty Monge’a – rzutnie π₁ i π₂ po rozłożeniu',
    params: [].concat(xyzParams('A', 65, 18, 20), xyzParams('B', 41, 47, 9), xyzParams('C', 44, 10, 49)),
    algo:
      '<ol><li><b>Rzut punktu</b>: z punktu prowadzimy promienie ⟂ π<sub>1</sub> i ⟂ π<sub>2</sub>. A′ (rzut poziomy) niesie współrzędne (x, y), A″ (rzut pionowy) – (x, z).</li>' +
      '<li><b>Rozłożenie rzutni</b>: π<sub>1</sub> obracamy wokół x<sub>12</sub> do płaszczyzny π<sub>2</sub>. A′ i A″ lądują na jednej prostej ⟂ x<sub>12</sub> – <i>linii odnoszącej</i>.</li>' +
      '<li><b>Odczyt odległości</b>: |A″x<sub>12</sub>| = z (odl. od π<sub>1</sub>), |A′x<sub>12</sub>| = y (odl. od π<sub>2</sub>).</li>' +
      '<li><b>Ślad poziomy H prostej</b> (punkt na π<sub>1</sub>, z = 0): H″ = l″ ∩ x<sub>12</sub>, potem odnosząca do l′ → H′.</li>' +
      '<li><b>Ślad pionowy V</b> (y = 0): V′ = l′ ∩ x<sub>12</sub>, odnosząca do l″ → V″.</li>' +
      '<li><b>Ślady płaszczyzny</b>: h<sub>α</sub> przechodzi przez ślady poziome wszystkich prostych płaszczyzny, v<sub>α</sub> – przez ślady pionowe. Oba ślady spotykają się na osi x<sub>12</sub> (punkt zbiegu śladów X<sub>α</sub>) – to kontrola poprawności.</li></ol>' +
      '<p class="note">Zasada ogólna: <b>punkt leży na prostej ⇔ jego rzuty leżą na odpowiednich rzutach prostej</b> (i na wspólnej odnoszącej). Każda konstrukcja w Monge’u sprowadza się do tej zasady.</p>',
    build(p, B) {
      const A = P3(p, 'A'),
        Bp = P3(p, 'B'),
        C = P3(p, 'C');
      B.step({
        title: 'Układ rzutni π₁, π₂ i oś x₁₂',
        co: 'Dwie wzajemnie prostopadłe rzutnie: poziomą <b>π<sub>1</sub></b> i pionową <b>π<sub>2</sub></b>. Ich krawędź to oś rzutów <b>x<sub>12</sub></b>.',
        jak: 'W 3D widać rzutnie w położeniu przestrzennym. Obserwator stoi przed π<sub>2</sub> i nad π<sub>1</sub> (I ćwiartka: y &gt; 0, z &gt; 0).',
        why: 'Jeden rzut równoległy gubi jedną współrzędną (głębokość). Dwa rzuty na prostopadłe rzutnie dają razem komplet (x, y, z) – stąd jednoznaczność odwzorowania Monge’a.',
        cam: 'iso',
      });
      const sys = monge(B);
      B.step({
        title: 'Punkt A w przestrzeni',
        co: 'Punkt <b>A</b> o współrzędnych (' + A.map(G.f0).join(', ') + ').',
        jak: 'Obróć widok 3D myszą – zobacz, że położenie A względem rzutni opisują dwie odległości: od π<sub>1</sub> (z) i od π<sub>2</sub> (y).',
        why: 'Dopóki nie zrzutujemy punktu, nie mamy go na płaskim rysunku. Rzutowanie prostokątne zamienia odległości od rzutni na odległości rzutów od osi.',
      });
      B.a3({ t: 'pt', id: 'A', p: A, s: 'given', label: 'A' });
      B.info('A', 'Punkt A w przestrzeni');
      B.step({
        title: 'Rzut poziomy A′',
        co: 'Rzut prostokątny punktu A na rzutnię poziomą π<sub>1</sub>: <b>A′</b>.',
        jak: 'Z A prowadzimy promień rzutujący ⟂ π<sub>1</sub> (pionowo w dół). Punkt jego przebicia z π<sub>1</sub> to A′.',
        why: 'Promień ⟂ π<sub>1</sub> nie zmienia x ani y – zmienia tylko z. Dlatego A′ = (x, y, 0): rzut poziomy „pamięta” x i y, a gubi wysokość. Długość promienia AA′ = z<sub>A</sub>.',
        cam: { dir: [0.45, 0.6, 1] },
      });
      const pa = sys.proj3('p1', A);
      B.a3({ t: 'pt', id: 'A|1', p: pa, pl: 'p1', s: 'proj', label: "A'", small: true });
      B.a3({ t: 'seg', id: 'ray:A|1', a: A, b: pa, s: 'ray' });
      B.info('A|1', "A′ – rzut poziomy punktu A (na π<sub>1</sub>)", ['A', 'ray:A|1']);
      B.info('ray:A|1', 'Promień rzutujący AA′ ⟂ π<sub>1</sub>; jego długość = z<sub>A</sub> = ' + G.f1(A[2]), ['A', 'A|1']);
      B.src('A');
      B.step({
        title: 'Rzut pionowy A″',
        co: 'Rzut prostokątny A na rzutnię pionową π<sub>2</sub>: <b>A″</b>.',
        jak: 'Z A prowadzimy promień ⟂ π<sub>2</sub> (poziomo, „do tyłu”). Jego ślad na π<sub>2</sub> to A″.',
        why: 'Promień ⟂ π<sub>2</sub> zmienia tylko y. A″ = (x, 0, z): rzut pionowy niesie x i wysokość z. Razem A′ i A″ odtwarzają wszystkie trzy współrzędne.',
        cam: { dir: [0.35, 1, 0.35] },
      });
      const pv = sys.proj3('p2', A);
      B.a3({ t: 'pt', id: 'A|2', p: pv, pl: 'p2', s: 'proj', label: "A''", small: true });
      B.a3({ t: 'seg', id: 'ray:A|2', a: A, b: pv, s: 'ray' });
      B.info('A|2', 'A″ – rzut pionowy punktu A (na π<sub>2</sub>)', ['A', 'ray:A|2']);
      B.info('ray:A|2', 'Promień rzutujący AA″ ⟂ π<sub>2</sub>; jego długość = y<sub>A</sub> = ' + G.f1(A[1]), ['A', 'A|2']);
      B.link('A', ['A|1', 'A|2', 'ray:A|1', 'ray:A|2']);
      B.src('A');
      B.step({
        title: 'Rozłożenie rzutni → linia odnosząca',
        co: 'Obracamy π<sub>1</sub> wokół osi x<sub>12</sub> o 90° do płaszczyzny π<sub>2</sub>. Powstaje płaski rysunek: <b>A′ i A″ na jednej prostej ⟂ x<sub>12</sub></b>.',
        jak: 'Obserwuj animację w 3D. Odcinki A′A<sub>x</sub> (na π<sub>1</sub>) i A″A<sub>x</sub> (na π<sub>2</sub>) są oba ⟂ x<sub>12</sub> – po obrocie układają się w jedną prostą: linię odnoszącą. Zielone odcinki to odczytywane współrzędne.',
        why: 'Płaszczyzna AA′A″ jest prostopadła do osi x<sub>12</sub> (zawiera dwa promienie prostopadłe do rzutni). Obrót wokół x<sub>12</sub> nie wyprowadza A′ z tej płaszczyzny, więc po rozłożeniu A′, A<sub>x</sub>, A″ są współliniowe. |A″A<sub>x</sub>| = z<sub>A</sub>, |A′A<sub>x</sub>| = y<sub>A</sub>.',
        unfold: { p1: 1 },
        cam: { dir: [0.25, 1, 0.12] },
      });
      B.a2({ t: 'pt', id: 'A|1', p: sys.toSheet('p1', A), s: 'given', label: "A'" });
      B.a2({ t: 'pt', id: 'A|2', p: sys.toSheet('p2', A), s: 'given', label: "A''" });
      B.odn('A', A, 'p2', 'p1');
      B.a2({ t: 'seg', id: 'zA', a: [A[0] + 2.5, 0], b: [A[0] + 2.5, -A[2]], s: 'dist', label: 'z_A' });
      B.a2({ t: 'seg', id: 'yA', a: [A[0] + 2.5, 0], b: [A[0] + 2.5, A[1]], s: 'dist', label: 'y_A' });
      B.info('zA', 'z<sub>A</sub> = ' + G.f1(A[2]) + ' – odległość A″ od x<sub>12</sub> = odległość punktu A od π<sub>1</sub> (długość promienia AA′)', ['ray:A|1']);
      B.info('yA', 'y<sub>A</sub> = ' + G.f1(A[1]) + ' – odległość A′ od x<sub>12</sub> = odległość punktu A od π<sub>2</sub> (długość promienia AA″)', ['ray:A|2']);
      B.link('ray:A|1', ['zA']);
      B.link('ray:A|2', ['yA']);
      B.src('A|1', 'A|2');

      B.step({
        title: 'Punkt B – oba rzuty',
        co: 'Drugi punkt <b>B</b> (' + Bp.map(G.f0).join(', ') + ') i jego rzuty B′, B″.',
        jak: 'Ta sama procedura: promienie ⟂ π<sub>1</sub> i ⟂ π<sub>2</sub>, potem odnosząca ⟂ x<sub>12</sub>.',
        why: 'Każdy punkt przestrzeni ma dokładnie jedną parę rzutów leżących na wspólnej odnoszącej – i odwrotnie: taka para wyznacza punkt.',
      });
      B.mPoint('B', Bp);
      B.step({
        title: 'Prosta l = AB i jej rzuty',
        co: 'Prosta <b>l</b> przez A i B. Jej rzuty: l′ = A′B′, l″ = A″B″.',
        jak: 'Łączymy rzuty jednoimienne: A′ z B′ oraz A″ z B″.',
        why: 'Rzut równoległy prostej jest prostą (promienie rzutujące punktów prostej tworzą płaszczyznę rzutującą, której ślad na rzutni to rzut prostej).',
      });
      const ext = extend3(A, Bp, 1.2);
      const traceH = (P, Q) => {
        if (Math.abs(P[2] - Q[2]) < 0.3) return null;
        const t = P[2] / (P[2] - Q[2]);
        const X = V.lerp(P, Q, t);
        return Math.abs(X[0]) < 400 && Math.abs(X[1]) < 400 ? X : null;
      };
      const traceV = (P, Q) => {
        if (Math.abs(P[1] - Q[1]) < 0.3) return null;
        const t = P[1] / (P[1] - Q[1]);
        const X = V.lerp(P, Q, t);
        return Math.abs(X[0]) < 400 && Math.abs(X[2]) < 400 ? X : null;
      };
      B.mSeg('l', A, Bp, { s: 'given', name: 'l', what: 'prostej l', label: 'l' });
      const Hl = traceH(A, Bp),
        Vl = traceV(A, Bp);
      // przedłużenia prostej do śladów
      const lineThrough = (id, P, Q, list) => {
        const all = [P, Q].concat(list.filter(Boolean));
        const d = V.norm(V.sub(Q, P));
        const ts = all.map((X) => V.dot(V.sub(X, P), d));
        const a = V.add(P, V.mul(d, Math.min(...ts) - 8)),
          b = V.add(P, V.mul(d, Math.max(...ts) + 8));
        B.mSeg(id, a, b, { s: 'thin', proj3: true });
      };
      B.step({
        title: 'Ślad poziomy H prostej l',
        co: Hl ? 'Punkt <b>H</b>, w którym prosta l przebija rzutnię π<sub>1</sub> (z = 0).' : 'Prosta l jest równoległa do π<sub>1</sub> (pozioma) – nie ma śladu poziomego (leży on w nieskończoności).',
        jak: Hl ? '<ol><li>H leży na π<sub>1</sub>, więc jego wysokość z = 0 ⇒ <b>H″ leży na osi x<sub>12</sub></b>: H″ = l″ ∩ x<sub>12</sub>.</li><li>Odnosząca z H″ do przecięcia z l′ daje H′.</li></ol>' : 'l″ ∥ x<sub>12</sub> – rzut pionowy nie przecina osi.',
        why: 'Punkt leżący na rzutni π<sub>1</sub> pokrywa się ze swoim rzutem poziomym (H = H′), a jego rzut pionowy ma zerową wysokość – leży na osi. To uniwersalna reguła: <i>punkt na rzutni ma drugi rzut na osi</i>.',
        cam: { dir: [0.6, 0.9, 0.8] },
      });
      if (Hl) {
        lineThrough('lext', A, Bp, [Hl, Vl]);
        B.mPoint('H', Hl, { s: 'res' });
        B.src('l|2', 'axis:p1');
      }
      B.step({
        title: 'Ślad pionowy V prostej l',
        co: Vl ? 'Punkt <b>V</b>, w którym prosta l przebija rzutnię π<sub>2</sub> (y = 0).' : 'Prosta l jest równoległa do π<sub>2</sub> (czołowa) – brak śladu pionowego.',
        jak: Vl ? '<ol><li>V leży na π<sub>2</sub> ⇒ y = 0 ⇒ <b>V′ leży na osi</b>: V′ = l′ ∩ x<sub>12</sub>.</li><li>Odnosząca do l″ daje V″.</li></ol>' : 'l′ ∥ x<sub>12</sub>.',
        why: 'Analogicznie: punkt rzutni π<sub>2</sub> pokrywa się ze swoim rzutem pionowym, a jego rzut poziomy (odległość od π<sub>2</sub> = 0) leży na osi x<sub>12</sub>.',
        cam: { dir: [0.4, 1, 0.5] },
      });
      if (Vl) {
        if (!Hl) lineThrough('lext', A, Bp, [Vl]);
        B.mPoint('V', Vl, { s: 'res' });
        B.src('l|1', 'axis:p1');
      }
      // płaszczyzna
      B.step({
        title: 'Płaszczyzna α = (A, B, C)',
        co: 'Trzeci punkt <b>C</b> wyznacza z prostą l płaszczyznę <b>α</b>. Wybieramy drugą prostą płaszczyzny: m = AC.',
        jak: 'Rysujemy rzuty C′, C″ i trójkąt ABC. Prosta m = AC leży w α (dwa jej punkty leżą w α).',
        why: 'Ślad płaszczyzny to zbiór śladów wszystkich jej prostych. Do narysowania prostej śladu wystarczą dwa punkty – więc potrzebujemy dwóch prostych płaszczyzny.',
      });
      B.mPoint('C', C);
      B.mPoly('abc', [A, Bp, C], { name: 'trójkąta ABC (płaszczyzna α)', col: '#e8c060' });
      B.mSeg('m', A, C, { s: 'given', name: 'm', what: 'prostej m', label: 'm' });
      let Hm = traceH(A, C),
        Vm = traceV(A, C);
      let mName = 'm',
        Pm = A,
        Qm = C;
      if (!Hm || !Vm) {
        const H2 = traceH(Bp, C),
          V2 = traceV(Bp, C);
        if (H2 && V2) {
          Hm = H2;
          Vm = V2;
          mName = 'n';
          Pm = Bp;
          Qm = C;
          B.mSeg('n', Bp, C, { s: 'given', name: 'n', label: 'n' });
        }
      }
      B.step({
        title: 'Ślady drugiej prostej ' + mName,
        co: 'Ślady <b>' + h('H_' + mName) + '</b> i <b>' + h('V_' + mName) + '</b> prostej ' + mName + ' – identyczną konstrukcją jak dla l.',
        jak: h('H_' + mName + "''") + ' = ' + mName + '″ ∩ x<sub>12</sub> → odnosząca → ' + h('H_' + mName + "'") + ' na ' + mName + '′. ' + h('V_' + mName + "'") + ' = ' + mName + '′ ∩ x<sub>12</sub> → odnosząca → ' + h('V_' + mName + "''") + '.',
        why: 'Ślad poziomy każdej prostej leżącej w α należy jednocześnie do α i do π<sub>1</sub> – czyli do krawędzi przecięcia α z π<sub>1</sub>, a to jest właśnie ślad h<sub>α</sub>.',
      });
      if (Hm) B.mPoint('H_' + mName, Hm, { s: 'res' });
      if (Vm) B.mPoint('V_' + mName, Vm, { s: 'res' });
      lineThrough(mName + 'ext', Pm, Qm, [Hm, Vm]);
      // ślady płaszczyzny analitycznie
      const al = G.plane3(A, Bp, C);
      B.step({
        title: 'Ślady płaszczyzny h_α i v_α',
        co: '<b>h<sub>α</sub></b> = prosta przez H i ' + h('H_' + mName) + ' (na π<sub>1</sub>); <b>v<sub>α</sub></b> = prosta przez V i ' + h('V_' + mName) + ' (na π<sub>2</sub>).',
        jak: 'Łączymy ślady poziome prostych → h<sub>α</sub> (rysujemy przez rzuty poziome H′, ' + h('H_' + mName + "'") + '). Łączymy ślady pionowe → v<sub>α</sub> (przez V″, ' + h('V_' + mName + "''") + '). <b>Kontrola:</b> h<sub>α</sub> i v<sub>α</sub> muszą przeciąć się na osi x<sub>12</sub> w punkcie X<sub>α</sub>.',
        why: 'h<sub>α</sub> = α ∩ π<sub>1</sub>, v<sub>α</sub> = α ∩ π<sub>2</sub>. Trzy płaszczyzny α, π<sub>1</sub>, π<sub>2</sub> mają jeden punkt wspólny – leży on na x<sub>12</sub> = π<sub>1</sub> ∩ π<sub>2</sub>. Dlatego oba ślady zbiegają się na osi.',
        cam: 'iso',
      });
      const n = al.n;
      if (Math.abs(n[0]) > 1e-6) {
        const X = [al.d / n[0], 0, 0];
        const ptsH = [X].concat([Hl, Hm].filter(Boolean));
        const ptsV = [X].concat([Vl, Vm].filter(Boolean));
        const dirH = V.norm([-n[1], n[0], 0]),
          dirV = V.norm([-n[2], 0, n[0]]);
        const span = (pts, d) => {
          const ts = pts.map((q) => V.dot(V.sub(q, X), d));
          return [Math.min(0, ...ts) - 10, Math.max(...ts) + 15];
        };
        const [h0, h1] = span(ptsH, dirH);
        const [v0, v1] = span(ptsV, dirV);
        const hA = V.add(X, V.mul(dirH, h0)),
          hB = V.add(X, V.mul(dirH, h1));
        const vA = V.add(X, V.mul(dirV, v0)),
          vB = V.add(X, V.mul(dirV, v1));
        B.a3({ t: 'seg', id: 'ha', a: hA, b: hB, pl: 'p1', s: 'res2', label: 'h_α', labelAt: 0.95 });
        B.a3({ t: 'seg', id: 'va', a: vA, b: vB, pl: 'p2', s: 'res2', label: 'v_α', labelAt: 0.95 });
        B.a2({ t: 'seg', id: 'ha', a: sys.toSheet('p1', hA), b: sys.toSheet('p1', hB), s: 'res2', label: 'h_α', labelAt: 0.96 });
        B.a2({ t: 'seg', id: 'va', a: sys.toSheet('p2', vA), b: sys.toSheet('p2', vB), s: 'res2', label: 'v_α', labelAt: 0.96 });
        B.a3({ t: 'pt', id: 'Xa', p: X, s: 'res2', label: 'X_α' });
        B.a2({ t: 'pt', id: 'Xa', p: [X[0], 0], s: 'res2', label: 'X_α' });
        B.info('ha', 'h<sub>α</sub> – ślad poziomy płaszczyzny α (α ∩ π<sub>1</sub>)', ['H|1', 'H_' + mName + '|1']);
        B.info('va', 'v<sub>α</sub> – ślad pionowy płaszczyzny α (α ∩ π<sub>2</sub>)', ['V|2', 'V_' + mName + '|2']);
        B.info('Xa', 'X<sub>α</sub> – punkt zbiegu śladów na osi x<sub>12</sub> (kontrola konstrukcji)');
        B.src('H|1', 'H_' + mName + '|1', 'V|2', 'V_' + mName + '|2');
      }
    },
  });

  /* =================================================================
     1.2 Przebicie prostej z płaszczyzną trójkąta
     ================================================================= */
  GW.addLesson({
    id: 'm1-przebicie',
    mod: 1,
    title: '1.2 Przebicie prostej z trójkątem',
    v2title: 'Rzuty Monge’a – przebicie i widoczność',
    params: [].concat(xyzParams('D', 12, 10, 58), xyzParams('E', 100, 62, 12), [
      { k: 'Cz', l: 'C: z (wierzch. trójkąta)', min: 20, max: 80, v: 70 },
      { k: 'By', l: 'B: y', min: 0, max: 70, v: 12 },
    ]),
    algo:
      '<ol><li><b>Płaszczyzna pomocnicza</b>: przez prostą l prowadzimy płaszczyznę rzutującą ε (np. ⟂ π<sub>2</sub>). Jej ślad v<sub>ε</sub> pokrywa się z l″ – zero konstrukcji.</li>' +
      '<li><b>Krawędź pomocnicza</b> k = ε ∩ (ABC): w rzucie, gdzie ε jest prostą, odczytujemy punkty 1″, 2″ przecięcia v<sub>ε</sub> z bokami trójkąta. Odnoszącymi przenosimy na rzuty boków w drugim rzucie → k′ = 1′2′.</li>' +
      '<li><b>Punkt przebicia</b>: P′ = k′ ∩ l′, odnosząca → P″ na l″.</li>' +
      '<li><b>Widoczność</b> – punkty zbieżne (pokrywające się): w miejscu, gdzie rzuty l i boku trójkąta się krzyżują, mamy dwa punkty (jeden na l, drugi na boku) o wspólnym rzucie. Ich drugie rzuty mówią, który jest bliżej obserwatora: w π<sub>1</sub> widoczny jest <i>wyższy</i> (większe z), w π<sub>2</sub> – <i>bliższy</i> (większe y).</li>' +
      '<li>W punkcie przebicia widoczność prostej zmienia się na przeciwną (prosta „przechodzi na drugą stronę” płaszczyzny).</li></ol>' +
      '<p class="note">Dlaczego płaszczyzna rzutująca? Bo jedna z jej projekcji jest prostą – znamy tam od razu rzuty wszystkich jej punktów. Zadanie przestrzenne (prosta ∩ płaszczyzna) zamieniamy na płaskie (prosta ∩ prosta w jednej płaszczyźnie ε).</p>',
    build(p, B) {
      const A = [10, 40, 12],
        Bp = [90, p.By, 25],
        C = [58, 62, p.Cz];
      const D = P3(p, 'D'),
        E = P3(p, 'E');
      B.step({
        title: 'Dane: trójkąt ABC i prosta l = DE',
        co: 'Trójkąt <b>ABC</b> (wycinek płaszczyzny) i odcinek prostej <b>l = DE</b>. Szukamy punktu przebicia P oraz widoczności l względem trójkąta.',
        jak: 'Najedź na elementy rysunku, aby zobaczyć ich odpowiedniki w 3D. Zauważ, że z samych rzutów nie widać od razu, gdzie l przechodzi przez trójkąt – rzuty przecięć l′ z trójkątem i l″ z trójkątem to <i>różne</i> punkty przestrzeni.',
        why: 'W rzucie płaszczyzna ogólnego położenia „przykrywa” obszar, a nie linię – nie możemy bezpośrednio wskazać przebicia. Potrzebujemy pomocniczej płaszczyzny, która zamieni problem przestrzenny na płaski.',
        cam: 'iso',
      });
      const sys = monge(B);
      tri(B, ['A', 'B', 'C'], [A, Bp, C]);
      B.mPoint('D', D);
      B.mPoint('E', E);
      B.mSeg('l', D, E, { s: 'given', name: 'l', what: 'prostej l', label: 'l' });
      const T = { pts: [A, Bp, C], names: ['A', 'B', 'C'] };
      const L = { A: D, B: E, name: 'l', id: 'l' };
      const r = pierce(B, sys, L, T, { detail: true });
      if (!r.P) return;
      // widoczność
      const edges = [
        { A, B: Bp, name: 'AB' },
        { A: Bp, B: C, name: 'BC' },
        { A: C, B: A, name: 'CA' },
      ];
      const Ls = [{ A: D, B: E, name: 'l' }];
      ['p1', 'p2'].forEach((pid, idx) => {
        const k = idx === 0 ? 1 : 2;
        const nm = idx === 0 ? ['3', '4'] : ['5', '6'];
        const cp = coverPoints(B, sys, pid, Ls, edges, nm, { avoid: [sys.toSheet(pid, r.P)] });
        const ko = k === 1 ? 2 : 1;
        B.step({
          title: 'Widoczność w rzucie ' + (k === 1 ? 'poziomym π₁' : 'pionowym π₂') + ' – punkty zbieżne',
          co: cp
            ? 'Punkty zbieżne <b>' + cp.n1 + '</b> (na l) i <b>' + cp.n2 + '</b> (na boku ' + cp.s2.name + ') mają wspólny rzut ' + h(lab(cp.n1, k)) + ' ≡ ' + h(lab(cp.n2, k)) + '. Rozstrzygamy, który przesłania drugi.'
            : 'Rzuty l i boków trójkąta nie krzyżują się w π<sub>' + k + '</sub> poza punktem przebicia – widoczność wynika bezpośrednio z położenia l.',
          jak: cp
            ? 'Odnoszącymi przenosimy oba punkty do π<sub>' +
              ko +
              '</sub>: ' +
              h(lab(cp.n1, ko)) +
              ' na l' +
              (ko === 1 ? '′' : '″') +
              ', ' +
              h(lab(cp.n2, ko)) +
              ' na ' +
              h(lab(cp.s2.name, ko)) +
              '. ' +
              (k === 1 ? 'Wyższy (większa wysokość z, dalej od x<sub>12</sub> w π<sub>2</sub>)' : 'Bliższy obserwatora (większe y, dalej od x<sub>12</sub> w π<sub>1</sub>)') +
              ' jest punkt <b>' +
              (cp.vis1 ? cp.n1 + ' – więc w tym miejscu widoczna jest prosta l' : cp.n2 + ' – więc w tym miejscu trójkąt zasłania prostą l') +
              '</b>. Po drugiej stronie punktu ' +
              h(lab('P', k)) +
              ' widoczność się odwraca.'
            : '',
          why: 'Obserwator rzutu ' + (k === 1 ? 'poziomego patrzy z góry (wzdłuż osi z) – zasłania to, co wyżej' : 'pionowego patrzy od przodu (wzdłuż osi y) – zasłania to, co bliżej') + '. Dwa punkty na jednym promieniu rzutującym różnią się tylko tą „głębokością”, którą widać w drugim rzucie.',
          cam: k === 1 ? { dir: [0.15, 0.25, 1], up: [0, -1, 0] } : { dir: [0.1, 1, 0.15] },
        });
        if (cp) addCover(B, sys, cp);
        // wynik widoczności w danym rzucie
        const pcs = GW.visPieces(sys, pid, [{ a: D, b: E }], [{ pts: [A, Bp, C], pl: G.plane3(A, Bp, C) }]);
        B.p2.forEach((q) => {
          if (q.id === 'l|' + k && q.to === undefined) q.to = B.cur;
        });
        pcs.forEach((pc) => B.a2({ t: 'seg', id: 'l|' + k, a: pc.a, b: pc.b, s: pc.vis ? 'vis' : 'hid' }));
      });
      B.step({
        title: 'Wynik',
        co: 'Punkt przebicia <b>P</b> (' + r.P.map(G.f1).join('; ') + ') i widoczność prostej l w obu rzutach.' + (r.insideTri && r.onSeg ? '' : ' <b>Uwaga:</b> P leży poza trójkątem/odcinkiem – l nie przebija trójkąta.'),
        jak: 'Linia ciągła gruba – widoczna, przerywana – niewidoczna. Zmiana widoczności zawsze w P′ i P″ (oraz na konturze trójkąta).',
        why: 'Zmień w trybie eksperymentu położenie D, E lub wierzchołków – cała konstrukcja (ε, 1, 2, k, P, punkty zbieżne) przeliczy się. Spróbuj ustawić l prawie ⟂ π<sub>2</sub> – algorytm automatycznie wybierze płaszczyznę ⟂ π<sub>1</sub>.',
        cam: 'iso',
      });
      B.src('P', 'P|1', 'P|2');
    },
  });

  /* =================================================================
     1.3 Transformacja – rzeczywista wielkość trójkąta (π4, π5) – KABINA
     ================================================================= */
  function kabinaSequence(ctx, seq) {
    // seq: [{U:{...}, cam:..., wait}]
    let i = 0;
    const next = () => {
      if (i >= seq.length) return;
      const s = seq[i++];
      if (s.U) ctx.v3.setUnfold(s.U, true);
      if (s.cam) ctx.app.applyCam(s.cam);
      setTimeout(next, s.wait || 1600);
    };
    next();
  }
  GW.addLesson({
    id: 'm1-transformacja',
    mod: 1,
    title: '1.3 Transformacja: rzeczywista wielkość (π₄, π₅)',
    v2title: 'Transformacja układu rzutni: π₁π₂ → π₁π₄ → π₄π₅',
    params: [].concat(xyzParams('A', 10, 35, 10), xyzParams('B', 75, 15, 50), xyzParams('C', 55, 55, 25), [{ k: 'off', l: 'odsunięcie osi', min: 6, max: 40, v: 14 }]),
    cams: [
      { l: 'Obserwator π₄', cam: { obs: 'p4' }, title: 'Spójrz w kierunku rzutowania na π₄' },
      { l: 'Obserwator π₅', cam: { obs: 'p5' } },
    ],
    special: {
      note: '<b>Wirtualna kabina / nowy obserwator.</b> Każda nowa rzutnia to nowy obserwator patrzący prostopadle do niej. Przyciski poniżej ustawiają kamerę w miejscu tego obserwatora i animują dołączanie/rozkładanie rzutni. Zielone odcinki to odległości przenoszone cyrklem (najedź – podświetli się para równych odcinków w 3D i 2D).',
      ui: [
        { type: 'btn', l: '① Kabina π₄: patrz wzdłuż h', fn: (c) => kabinaSequence(c, [{ U: {}, cam: { obs: 'p4' }, wait: 1500 }]) },
        { type: 'btn', l: '② Rozłóż π₄ → π₁', fn: (c) => kabinaSequence(c, [{ U: {}, cam: { dir: [0.9, 0.6, 0.9] }, wait: 1000 }, { U: { p4: 1 }, wait: 1500 }, { cam: { obs: 'p1' } }]) },
        { type: 'btn', l: '③ Kabina π₅: patrz ⟂ ABC', fn: (c) => kabinaSequence(c, [{ U: {}, cam: { obs: 'p5' } }]) },
        { type: 'btn', l: '④ Rozłóż wszystko: π₅→π₄→π₁→π₂', fn: (c) => kabinaSequence(c, [{ U: {}, cam: { dir: [0.8, 0.8, 0.9] }, wait: 900 }, { U: { p5: 1 }, wait: 1500 }, { U: { p5: 1, p4: 1 }, wait: 1500 }, { U: { p5: 1, p4: 1, p1: 1 }, cam: 'front' }]) },
        { type: 'btn', l: 'Złóż (3D)', fn: (c) => c.v3.setUnfold({}, true) },
      ],
    },
    algo:
      '<ol><li><b>Cel</b>: ustawić nową rzutnię równolegle do płaszczyzny figury – wtedy rzut jest przystający do figury (rzeczywista wielkość). Z π<sub>1</sub>π<sub>2</sub> nie da się tego zrobić jednym krokiem, bo płaszczyzna ogólna nie jest ⟂ ani π<sub>1</sub>, ani π<sub>2</sub>.</li>' +
      '<li><b>Transformacja I</b> (płaszczyzna → rzutująca): prowadzimy poziomą h płaszczyzny (h″ ∥ x<sub>12</sub>). Nowa rzutnia π<sub>4</sub> ⟂ π<sub>1</sub> i ⟂ h ⇒ oś <b>x<sub>14</sub> ⟂ h′</b>. W π<sub>4</sub> cała płaszczyzna rzutuje się w odcinek.</li>' +
      '<li><b>Reguła przenoszenia</b>: rzut na π<sub>4</sub> leży na odnoszącej ⟂ x<sub>14</sub>, w odległości od x<sub>14</sub> równej odległości rzutu „porzucanego” (π<sub>2</sub>) od starej osi x<sub>12</sub>. (Obie mierzą odległość punktu od wspólnej rzutni π<sub>1</sub>.)</li>' +
      '<li><b>Transformacja II</b> (rzutująca → równoległa): π<sub>5</sub> ⟂ π<sub>4</sub>, π<sub>5</sub> ∥ figura ⇒ <b>x<sub>45</sub> ∥ odcinkowi</b> A<sup>IV</sup>B<sup>IV</sup>C<sup>IV</sup>. Przenosimy odległości rzutów π<sub>1</sub> od x<sub>14</sub>.</li>' +
      '<li>Trójkąt A<sup>V</sup>B<sup>V</sup>C<sup>V</sup> = rzeczywista wielkość. Kąt odcinka w π<sub>4</sub> z x<sub>14</sub> = kąt nachylenia płaszczyzny do π<sub>1</sub>.</li></ol>' +
      '<p class="note">Pamiętaj: zawsze zachowujemy jedną starą rzutnię (wspólną) i porzucamy drugą. Odległość przenosimy <i>z porzucanej</i> – bo mierzy ona odległość punktu od rzutni wspólnej.</p>',
    build(p, B) {
      const A = P3(p, 'A'),
        Bq = P3(p, 'B'),
        C = P3(p, 'C');
      const pts = [A, Bq, C],
        nm = ['A', 'B', 'C'];
      B.step({
        title: 'Dane: trójkąt ABC w π₁, π₂',
        co: 'Trójkąt <b>ABC</b> w położeniu ogólnym. Zadanie: wyznaczyć jego <b>rzeczywistą wielkość</b>.',
        jak: 'Porównaj rzuty z widokiem 3D – oba rzuty są zniekształcone (skrócone), bo płaszczyzna trójkąta nie jest równoległa do żadnej rzutni.',
        why: 'Rzut prostokątny zachowuje kształt tylko figur równoległych do rzutni. Musimy więc „dobudować” rzutnię równoległą do ABC – transformacją układu.',
        cam: 'iso',
      });
      const sys = monge(B);
      tri(B, nm, pts);
      // pozioma
      const ord = [0, 1, 2].sort((i, j) => pts[i][2] - pts[j][2]);
      const iM = ord[1],
        iLo = ord[0],
        iHi = ord[2];
      const M = pts[iM];
      const tH = (M[2] - pts[iLo][2]) / (pts[iHi][2] - pts[iLo][2] || 1);
      const P1 = V.lerp(pts[iLo], pts[iHi], tH);
      const eName = nm[iLo] + nm[iHi];
      B.step({
        title: 'Pozioma h płaszczyzny ABC',
        co: 'Prosta pozioma <b>h</b> leżąca w płaszczyźnie trójkąta, przez wierzchołek ' + nm[iM] + '.',
        jak: '<ol><li>h″ ∥ x<sub>12</sub> przez ' + h(nm[iM] + "''") + '; przecina ' + h(eName + "''") + ' w 1″.</li><li>Odnosząca → 1′ na ' + h(eName + "'") + '.</li><li>h′ = ' + h(nm[iM] + "'") + '1′.</li></ol>',
        why: 'Pozioma ma stałą wysokość (h″ ∥ x<sub>12</sub>), więc jest równoległa do π<sub>1</sub> i jej rzut h′ pokazuje jej prawdziwy kierunek. Rzutnia ⟂ h będzie prostopadła do całej płaszczyzny (bo płaszczyzna zawiera h).',
      });
      B.mPoint('1', P1, { s: 'aux' });
      const he = extend3(M, P1, 0.25);
      B.mSeg('h', he[0], he[1], { s: 'aux', name: 'h', what: 'poziomej h', label: 'h', s3: 'aux' });
      B.src(nm[iM] + '|2', eName + '|2');
      // π4
      const s1 = pts.map((q) => sys.toSheet('p1', q));
      let hd = V.norm(V.sub(sys.toSheet('p1', P1), sys.toSheet('p1', M)));
      if (V.dot(hd, [1, 0.6]) < 0) hd = V.mul(hd, -1);
      const c0 = G.centroid(s1);
      const ext1 = Math.max(...s1.map((q) => V.dot(V.sub(q, c0), hd)));
      const a14 = V.add(c0, V.mul(hd, ext1 + p.off));
      B.step({
        title: 'Nowa rzutnia π₄ ⟂ h  →  oś x₁₄ ⟂ h′',
        co: 'Dołączamy rzutnię <b>π<sub>4</sub></b> prostopadłą do π<sub>1</sub> i do poziomej h. Zostawiamy π<sub>1</sub>, porzucamy π<sub>2</sub>. Oś <b>x<sub>14</sub> ⟂ h′</b>.',
        jak: 'Oś x<sub>14</sub> rysujemy w dowolnym miejscu (tu w odległości ' + p.off + ' od rzutu), byle prostopadle do h′. W 3D zobacz, jak π<sub>4</sub> „wyrasta” pionowo z π<sub>1</sub> wzdłuż x<sub>14</sub>.',
        why: 'π<sub>4</sub> ⟂ π<sub>1</sub>, więc nowa para π<sub>1</sub>π<sub>4</sub> jest znów układem Monge’a. Kierunek rzutowania na π<sub>4</sub> to kierunek h – patrzymy wzdłuż poziomej, więc cała płaszczyzna ABC zobaczy się „na ostrzu” jako odcinek.',
        cam: { dir: [0.95, 0.5, 0.75] },
      });
      B.addPlane('p4', 4, 'p1', a14, V.perp2(hd), hd, 'p2');
      B.src('h|1');
      B.step({
        title: 'Rzuty na π₄: przeniesienie odległości z',
        co: 'Rzuty <b>A<sup>IV</sup>, B<sup>IV</sup>, C<sup>IV</sup></b>.',
        jak: '<ol><li>Z A′, B′, C′ odnoszące ⟂ x<sub>14</sub>.</li><li>Na każdej odkładamy (cyrklem) odległość rzutu pionowego od x<sub>12</sub>: |A<sup>IV</sup>x<sub>14</sub>| = |A″x<sub>12</sub>| = z<sub>A</sub> – zielone odcinki.</li></ol>Kamera stoi teraz w <b>kabinie obserwatora π<sub>4</sub></b>: patrzysz wzdłuż h.',
        why: 'Obie odległości mierzą to samo: wysokość punktu nad wspólną rzutnią π<sub>1</sub>. π<sub>2</sub> i π<sub>4</sub> są obie ⟂ π<sub>1</sub>, więc „widzą” wysokość w prawdziwej wielkości. Wynik: trzy rzuty na jednej prostej – płaszczyzna stała się rzutująca.',
        cam: { obs: 'p4' },
      });
      pts.forEach((q, i) => {
        B.mPoint(nm[i], q, { on: ['p4'], space: false, s: 'given' });
        B.odn(nm[i], q, 'p1', 'p4');
        B.transfer(nm[i], q, 'p4');
      });
      B.src(...nm.map((n) => n + '|2'));
      const s4 = pts.map((q) => sys.toSheet('p4', q));
      B.step({
        title: 'Rozłożenie π₄ do π₁ – płaszczyzna jako odcinek',
        co: 'Rzutnia π<sub>4</sub> obraca się wokół x<sub>14</sub> do π<sub>1</sub>. Rzut trójkąta na π<sub>4</sub> to <b>odcinek</b>.',
        jak: 'Obserwuj animację: odnoszące A′–A<sup>IV</sup> stają się prostymi ⟂ x<sub>14</sub>. Kąt odcinka z osią x<sub>14</sub> = <b>kąt nachylenia α płaszczyzny do π<sub>1</sub></b>.',
        why: 'Rozkładanie wokół osi zachowuje odległości od osi – dlatego odmierzone wysokości są prawdziwe także na płaskim rysunku.',
        unfold: { p4: 1 },
        cam: { obs: 'p1' },
      });
      B.a2({ t: 'pl', id: 'tri4', pts: s4, s: 'res2' });
      B.info('tri4', 'Rzut trójkąta na π<sub>4</sub> – odcinek (płaszczyzna ABC jest ⟂ π<sub>4</sub>)');
      // kąt nachylenia
      let iFar = 0,
        jFar = 1,
        best = -1;
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++) {
          const d = V.dist(s4[i], s4[j]);
          if (d > best) {
            best = d;
            iFar = i;
            jFar = j;
          }
        }
      let e45 = V.norm(V.sub(s4[jFar], s4[iFar]));
      const pl4 = sys.get('p4');
      const ang = Math.acos(Math.min(1, Math.abs(V.dot(e45, pl4.su))));
      B.a2({ t: 'text', id: 'alpha', p: V.add(V.lerp(s4[iFar], s4[jFar], 0.5), V.mul(pl4.sv, -5)), txt: 'α = ' + G.f1(G.deg(ang)) + '°', s: 'note' });
      B.info('alpha', 'Kąt nachylenia płaszczyzny ABC do π<sub>1</sub>: ' + G.f1(G.deg(ang)) + '°');
      // π5
      let n45 = V.perp2(e45);
      if (V.dot(n45, pl4.sv) < 0) n45 = V.mul(n45, -1);
      const a45 = V.add(s4[iFar], V.mul(n45, p.off * 0.8));
      B.step({
        title: 'Rzutnia π₅ ∥ ABC  →  oś x₄₅ ∥ odcinkowi',
        co: 'Dołączamy <b>π<sub>5</sub> ⟂ π<sub>4</sub></b>, równoległą do płaszczyzny trójkąta. Zostawiamy π<sub>4</sub>, porzucamy π<sub>1</sub>. Oś <b>x<sub>45</sub> ∥ A<sup>IV</sup>B<sup>IV</sup>C<sup>IV</sup></b>.',
        jak: 'Oś x<sub>45</sub> rysujemy równolegle do odcinka-rzutu, w dowolnej odległości.',
        why: 'Płaszczyzna ABC jest ⟂ π<sub>4</sub>. Rzutnia π<sub>5</sub> też ma być ⟂ π<sub>4</sub> (układ Monge’a) i równoległa do ABC – w rzucie na π<sub>4</sub> obie widać jako proste, więc wystarczy, by te proste były równoległe.',
        unfold: { p4: 0 },
        cam: { dir: [0.4, 0.9, 1.0] },
      });
      B.addPlane('p5', 5, 'p4', a45, e45, n45, 'p1');
      B.step({
        title: 'Rzuty na π₅: przeniesienie odległości od x₁₄',
        co: 'Rzuty <b>A<sup>V</sup>, B<sup>V</sup>, C<sup>V</sup></b>.',
        jak: '<ol><li>Z A<sup>IV</sup>, B<sup>IV</sup>, C<sup>IV</sup> odnoszące ⟂ x<sub>45</sub>.</li><li>Odkładamy |A<sup>V</sup>x<sub>45</sub>| = |A′x<sub>14</sub>| (zielone).</li></ol>Kamera: <b>kabina obserwatora π<sub>5</sub></b> – patrzysz prostopadle na trójkąt.',
        why: 'Teraz wspólna rzutnia to π<sub>4</sub>; porzucamy π<sub>1</sub>. Odległość A′ od x<sub>14</sub> = odległość A od π<sub>4</sub> – to ta sama wielkość, którą π<sub>5</sub> widzi jako odległość od x<sub>45</sub>.',
        cam: { obs: 'p5' },
      });
      pts.forEach((q, i) => {
        B.mPoint(nm[i], q, { on: ['p5'], space: false, s: 'given' });
        B.odn(nm[i], q, 'p4', 'p5');
        B.transfer(nm[i], q, 'p5');
      });
      B.src(...nm.map((n) => n + '|1'));
      B.step({
        title: 'Rozłożenie π₅ → π₄ → π₁ i rzeczywista wielkość',
        co: 'Trójkąt <b>A<sup>V</sup>B<sup>V</sup>C<sup>V</sup></b> jest przystający do ABC – rzeczywista wielkość.',
        jak: 'Rzutnie rozkładają się kolejno (od najmłodszej). Boki: |AB| = ' + G.f1(V.dist(A, Bq)) + ', |BC| = ' + G.f1(V.dist(Bq, C)) + ', |CA| = ' + G.f1(V.dist(C, A)) + ' – zmierz na rysunku: zgadzają się z A<sup>V</sup>B<sup>V</sup>, B<sup>V</sup>C<sup>V</sup>, C<sup>V</sup>A<sup>V</sup>.',
        why: 'Figura równoległa do rzutni rzutuje się prostokątnie bez zniekształceń (wszystkie promienie mają tę samą długość). Użyj przycisków „Widok specjalny”, by powtórzyć cały proces z punktu widzenia kolejnych obserwatorów.',
        unfold: { p5: 1, p4: 1 },
        cam: { obs: 'p1' },
      });
      const s5 = pts.map((q) => sys.toSheet('p5', q));
      B.a2({ t: 'poly', id: 'tri5', pts: s5, fill: '#d01818', op: 0.15 });
      B.a2({ t: 'pl', id: 'tri5', pts: s5, closed: true, s: 'res' });
      B.a3({ t: 'poly', id: 'tri5', pts: pts.map((q) => sys.proj3('p5', q)), pl: 'p5', col: '#d01818', op: 0.35, noFit: true });
      B.info('tri5', 'Rzeczywista wielkość trójkąta ABC (rzut na π<sub>5</sub> ∥ ABC)');
    },
  });

  /* =================================================================
     1.4 Przenikanie dwóch trójkątów
     ================================================================= */
  GW.addLesson({
    id: 'm1-trojkaty',
    mod: 1,
    title: '1.4 Przenikanie trójkątów',
    v2title: 'Przenikanie trójkątów ABC i DEF',
    params: [].concat(xyzParams('D', 18, 58, 48), xyzParams('E', 100, 40, 62), xyzParams('F', 62, 6, 4)),
    algo:
      '<ol><li>Odcinek przenikania dwóch trójkątów ma końce w <b>punktach przebicia krawędzi</b> jednego trójkąta z drugim.</li>' +
      '<li>Dla kolejnych krawędzi (obu trójkątów) wyznaczamy przebicie z płaszczyzną drugiego trójkąta metodą płaszczyzny rzutującej (jak w 1.2). Interesują nas tylko przebicia leżące <b>wewnątrz</b> trójkąta i na odcinku krawędzi.</li>' +
      '<li>Typowo znajdujemy dokładnie dwa takie punkty P, Q – łączymy je (oba leżą w obu płaszczyznach).</li>' +
      '<li><b>Widoczność</b> każdego rzutu ustalamy punktami zbieżnymi. Na odcinku PQ widoczność krawędzi zmienia się (trójkąty „przechodzą przez siebie”).</li></ol>' +
      '<p class="note">Wskazówka praktyczna: wybieraj krawędzie, których rzuty w obu rzutach nakładają się na drugi trójkąt – tylko one mogą dać przebicie wewnętrzne.</p>',
    build(p, B) {
      const A = [8, 12, 14],
        Bq = [92, 28, 8],
        C = [48, 62, 72];
      const D = P3(p, 'D'),
        E = P3(p, 'E'),
        F = P3(p, 'F');
      B.step({
        title: 'Dane: trójkąty ABC i DEF',
        co: 'Dwa trójkąty, które się przenikają. Szukamy odcinka przenikania i widoczności.',
        jak: 'Obejrzyj model 3D – zauważ, które krawędzie przechodzą przez drugi trójkąt.',
        why: 'Odcinek przenikania jest częścią krawędzi przecięcia płaszczyzn obu trójkątów, ograniczoną do części wspólnej obu figur.',
        cam: 'iso',
      });
      const sys = monge(B);
      tri(B, ['A', 'B', 'C'], [A, Bq, C], { col: '#e8c060' });
      tri(B, ['D', 'E', 'F'], [D, E, F], { col: '#7fb3e0' });
      const T1 = { pts: [A, Bq, C], names: ['A', 'B', 'C'] },
        T2 = { pts: [D, E, F], names: ['D', 'E', 'F'] };
      const S1 = new G.Polyhedron([T1.pts]),
        S2 = new G.Polyhedron([T2.pts]);
      const found = [];
      const tested = [];
      [
        [T1, T2],
        [T2, T1],
      ].forEach(([Ta, Tb]) => {
        const pl = G.plane3(...Tb.pts);
        for (let i = 0; i < 3; i++) {
          const j = (i + 1) % 3;
          const r = G.segPlane(Ta.pts[i], Ta.pts[j], pl);
          const ok = r && r.t >= 0 && r.t <= 1 && G.pointInPoly3(r.p, Tb.pts, pl.n);
          tested.push(Ta.names[i] + Ta.names[j] + (ok ? ' ✔' : ' ✘'));
          if (ok) found.push({ Ta, Tb, i, j, p: r.p });
        }
      });
      const names = ['P', 'Q', 'R', 'S'];
      found.slice(0, 2).forEach((f, idx) => {
        const en = f.Ta.names[f.i] + f.Ta.names[f.j];
        pierce(B, sys, { A: f.Ta.pts[f.i], B: f.Ta.pts[f.j], name: en, id: en, what: 'krawędź ' + en }, f.Tb, { n1: String(1 + 2 * idx), n2: String(2 + 2 * idx), P: names[idx], eps: idx ? 'φ' : 'ε', pre: 'x' + idx });
        B.S.jak += '<br><i>Sprawdzone krawędzie: ' + tested.join(', ') + '</i>';
      });
      if (found.length < 2) {
        B.step({ title: 'Brak przenikania', co: 'Trójkąty się nie przenikają (znaleziono ' + found.length + ' przebić wewnętrznych).', jak: 'Sprawdzone krawędzie: ' + tested.join(', '), why: 'Zmień położenie DEF w trybie eksperymentu.' });
        return;
      }
      const Pp = found[0].p,
        Qp = found[1].p;
      B.step({
        title: 'Odcinek przenikania PQ',
        co: 'Łączymy punkty <b>P</b> i <b>Q</b> – odcinek przenikania.',
        jak: 'P′Q′ oraz P″Q″ – rzuty odcinka.',
        why: 'P i Q należą do obu trójkątów, a część wspólna dwóch płaskich wypukłych figur leżących w różnych płaszczyznach to odcinek leżący na prostej przecięcia płaszczyzn.',
      });
      B.mSeg('PQ', Pp, Qp, { s: 'res', s3: 'res', name: 'PQ', what: 'odcinka przenikania' });
      B.src('x0P', 'x1Q');
      // widoczność
      const faces = [
        { pts: T1.pts, pl: G.plane3(...T1.pts) },
        { pts: T2.pts, pl: G.plane3(...T2.pts) },
      ];
      const edgesAll = [];
      [T1, T2].forEach((Tq) => {
        for (let i = 0; i < 3; i++) {
          const j = (i + 1) % 3;
          edgesAll.push({ a: Tq.pts[i], b: Tq.pts[j], name: Tq.names[i] + Tq.names[j], A: Tq.pts[i], B: Tq.pts[j] });
        }
      });
      ['p1', 'p2'].forEach((pid, idx) => {
        const k = idx + 1,
          ko = 2 - idx;
        const e1 = edgesAll.slice(0, 3),
          e2 = edgesAll.slice(3);
        const cp = coverPoints(B, sys, pid, e2, e1, idx ? ['7', '8'] : ['5', '6'], {});
        B.step({
          title: 'Widoczność w π' + (k === 1 ? '₁' : '₂'),
          co: 'Ustalamy widoczność krawędzi obu trójkątów w rzucie ' + (k === 1 ? 'poziomym' : 'pionowym') + '.',
          jak: cp
            ? 'Punkty zbieżne ' + cp.n1 + ' (na ' + cp.s1.name + ') i ' + cp.n2 + ' (na ' + cp.s2.name + '): w π<sub>' + ko + '</sub> widać, że ' + (cp.vis1 ? cp.n1 : cp.n2) + ' jest ' + (k === 1 ? 'wyżej' : 'bliżej') + ' → krawędź ' + (cp.vis1 ? cp.s1.name : cp.s2.name) + ' jest tam widoczna. Widoczność zmienia się na odcinku PQ i w miejscach przejścia przez kontur.'
            : 'Brak skrzyżowań rzutów – widoczność wynika wprost z położenia.',
          why: 'Wystarczy jedno rozstrzygnięcie na każdą „wyspę” rysunku; dalej widoczność zmienia się tylko na liniach przenikania i konturach (zasada ciągłości).',
          cam: k === 1 ? { dir: [0.15, 0.25, 1], up: [0, -1, 0] } : { dir: [0.1, 1, 0.15] },
        });
        if (cp) addCover(B, sys, cp, 'v' + k);
        const pcs = GW.visPieces(sys, pid, edgesAll, faces);
        edgesAll.forEach((e) => B.p2.forEach((q) => q.id === e.name + '|' + k && q.to === undefined && (q.to = B.cur)));
        pcs.forEach((pc) => B.a2({ t: 'seg', id: pc.e.name + '|' + k, a: pc.a, b: pc.b, s: pc.vis ? 'vis' : 'hid' }));
      });
      B.step({
        title: 'Wynik',
        co: 'Odcinek przenikania PQ i pełna widoczność.',
        jak: 'Porównaj z 3D (obróć model tak, by patrzeć z góry – kliknij rzut dowolnego punktu w π<sub>1</sub>).',
        why: 'W trybie eksperymentu przesuń wierzchołki DEF – liczba i położenie przebić, wybór krawędzi oraz widoczność przeliczą się automatycznie.',
        cam: 'iso',
      });
    },
  });
})();
