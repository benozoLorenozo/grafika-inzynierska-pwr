/* ===================================================================
   MODUŁ 2 – Przenikanie wielościanów (metoda krawędzi / płaszczyzn pomocniczych)
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h,
    lab = GW.lab;

  /* ---------- definicje brył (zestawy zadań) ---------- */
  function regular(c, R, n, rot, z) {
    const r = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i * 2 * Math.PI) / n;
      r.push([c[0] + R * Math.cos(a), c[1] + R * Math.sin(a), z]);
    }
    return r;
  }
  function mkPyramid(base, apex, names) {
    const poly = G.pyramid(base, apex);
    const verts = base.map((p, i) => ({ n: names[i], p })).concat([{ n: names[base.length], p: apex }]);
    return { poly, verts };
  }
  function mkPrism(base, shift, names, names2) {
    const poly = G.prism(base, shift);
    const verts = base.map((p, i) => ({ n: names[i], p })).concat(base.map((p, i) => ({ n: names2[i], p: V.add(p, shift) })));
    return { poly, verts };
  }
  /* ---------- Lista 2: tabele wymiarów (odczytane ze skanu książki) ---------- */
  // typ L: graniastosłup kwadratowy (przekątna a, wysokość h) obrócony o 45° + graniastosłup trójkątny ∥ x
  const TL = [
    [50, 40, 52, 18, 45, 35, 30, 5], [60, 30, 43, 10, 54, 34, 38, 10], [52, 50, 50, 10, 53, 38, 30, 30], [58, 30, 56, 18, 55, 40, 40, 16],
    [62, 40, 54, 15, 50, 40, 38, 0], [56, 28, 48, 20, 50, 34, 32, 12], [50, 40, 46, 20, 48, 35, 20, 14], [54, 25, 52, 20, 68, 38, 32, 26],
    [52, 42, 50, 15, 46, 36, 36, 8], [60, 34, 46, 0, 48, 35, 26, 15], [58, 28, 54, 15, 60, 40, 40, 14], [56, 38, 56, 12, 60, 40, 30, 13],
    [54, 34, 44, 10, 42, 36, 40, 12], [52, 48, 46, 19, 48, 38, 36, 20], [55, 35, 48, 15, 46, 36, 40, 20], [54, 24, 50, 20, 68, 38, 32, 25],
  ]; // h, h1, a, b, l, l1, e, k
  // typ R: graniastosłup sześciokątny (d – po narożach, h) + graniastosłup trójkątny ∥ x
  const TR = [
    [56, 62, 48, 34, 40, 32, 74], [60, 60, 50, 40, 40, 30, 80], [54, 62, 45, 32, 40, 38, 80], [56, 60, 50, 36, 42, 55, 76],
    [58, 62, 48, 36, 78, 28, 78], [52, 52, 60, 30, 38, 40, 74], [50, 50, 56, 38, 76, 18, 72], [60, 60, 50, 40, 42, 30, 80],
    [58, 64, 46, 32, 36, 38, 76], [54, 65, 48, 34, 80, 28, 71], [56, 60, 50, 33, 36, 42, 68], [50, 58, 63, 38, 37, 40, 70],
    [48, 54, 45, 32, 38, 38, 68], [56, 62, 43, 40, 64, 30, 64], [58, 64, 60, 36, 48, 40, 72], [56, 60, 42, 38, 62, 32, 62],
  ]; // d, h, a, c, n, m, l
  function typeL(r, sh) {
    const [hh, h1, a, b, l, l1, e, k] = r;
    const cx = 60,
      cy = 45;
    const base = [
      [cx - a / 2, cy, 0],
      [cx, cy + a / 2, 0],
      [cx + a / 2, cy, 0],
      [cx, cy - a / 2, 0],
    ];
    const s1 = mkPrism(base, [0, 0, hh], ['A', 'B', 'C', 'D'], ['A_1', 'B_1', 'C_1', 'D_1']);
    s1.title = 'graniastosłup kwadratowy (a = ' + a + ', h = ' + hh + ')';
    const gap = 2.5;
    const yf = cy + a / 2 - gap;
    const x0 = cx - l1 + sh[0];
    const prof = [
      [x0, yf + sh[1], b + sh[2]],
      [x0, yf - e + sh[1], b + sh[2]],
      [x0, yf - k + sh[1], b + h1 + sh[2]],
    ];
    const s2 = mkPrism(prof, [l, 0, 0], ['E', 'F', 'G'], ['E_1', 'F_1', 'G_1']);
    s2.title = 'graniastosłup trójkątny ∥ x (h₁ = ' + h1 + ', e = ' + e + ', l = ' + l + ')';
    return { s1, s2 };
  }
  function typeR(r, sh) {
    const [d, hh, a, c, n, m, l] = r;
    const cx = 60,
      cy = 45;
    const base = regular([cx, cy], d / 2, 6, 0, 0);
    const s1 = mkPrism(base, [0, 0, hh], ['A', 'B', 'C', 'D', 'E', 'F'], ['A_1', 'B_1', 'C_1', 'D_1', 'E_1', 'F_1']);
    s1.title = 'graniastosłup sześciokątny (d = ' + d + ', h = ' + hh + ')';
    const yr = cy - (d * Math.sqrt(3)) / 4 + m + sh[1];
    const x0 = cx - l / 2 + sh[0];
    const prof = [
      [x0, yr + n / 2, a - c + sh[2]],
      [x0, yr - n / 2, a - c + sh[2]],
      [x0, yr, a + sh[2]],
    ];
    const s2 = mkPrism(prof, [l, 0, 0], ['K', 'L', 'M'], ['K_1', 'L_1', 'M_1']);
    s2.title = 'graniastosłup trójkątny ∥ x (c = ' + c + ', n = ' + n + ', l = ' + l + ')';
    return { s1, s2 };
  }
  function defs(p) {
    const dx = p.dx || 0,
      dy = p.dy || 0,
      dz = p.dz || 0;
    if (p.set === 'gen' && p.gen) {
      const mk = (s, sh) => {
        const mv = (q) => V.add(q, sh);
        const r = s.kind === 'pyr' ? mkPyramid(s.base.map(mv), mv(s.apex), s.names) : mkPrism(s.base.map(mv), s.shift, s.names, s.names2);
        r.title = s.title;
        return r;
      };
      return { s1: mk(p.gen.s1, [0, 0, 0]), s2: mk(p.gen.s2, [dx, dy, dz]) };
    }
    if (p.set === 'L2L') return typeL(TL[(p.var || 1) - 1], [dx, dy, dz]);
    if (p.set === 'L2R') return typeR(TR[(p.var || 1) - 1], [dx, dy, dz]);
    if (p.set === 'L2z1') return typeR([60, 60, 50, 40, 40, 35, 80], [dx, dy, dz]);
    if (p.set === 'L2z3') {
      const vb = [
        [24.8, 46.8, 0],
        [66.8, 8.8, 0],
        [94.8, 64.8, 0],
      ].map((q) => G.rotAbout(q, [60, 40, 0], [0, 0, 1], G.rad(p.rot - 15)));
      const s1 = mkPrism(vb, [0, 0, 88], ['P', 'Q', 'R'], ['M', 'N', 'O']);
      s1.title = 'graniastosłup PQR–MNO (podstawa na π₁)';
      const tri = [
        [12 + dx, 77.2 + dy, 15.2 + dz],
        [12 + dx, 54.8 + dy, 69.2 + dz],
        [12 + dx, 17.2 + dy, 39.2 + dz],
      ];
      const s2 = mkPrism(tri, [104.8, 0, 0], ['A', 'B', 'C'], ['D', 'E', 'F']);
      s2.title = 'graniastosłup ABC–DEF (podstawa na płaszczyźnie podwójnie rzutującej ⟂ x)';
      return { s1, s2 };
    }
    if (p.set === 'a') {
      const s1 = mkPyramid(regular([50, 36], 30, 4, G.rad(p.rot), 0), [50, 36, 82], ['A', 'B', 'C', 'D', 'S']);
      s1.title = 'ostrosłup ABCDS';
      const tri = [
        [34 + dx, 72 + dy, 18 + dz],
        [68 + dx, 72 + dy, 22 + dz],
        [50 + dx, 72 + dy, 50 + dz],
      ];
      const s2 = mkPrism(tri, [0, -70, 0], ['E', 'F', 'G'], ['E_1', 'F_1', 'G_1']);
      s2.title = 'graniastosłup EFG (krawędzie ⟂ π₂)';
      return { s1, s2 };
    }
    if (p.set === 'b') {
      const base = [
        [15, 12, 0],
        [62, 8, 0],
        [40, 58, 0],
      ].map((q) => G.rotAbout(q, [40, 30, 0], [0, 0, 1], G.rad(p.rot)));
      const s1 = mkPrism(base, [0, 0, 66], ['A', 'B', 'C'], ['A_1', 'B_1', 'C_1']);
      s1.title = 'graniastosłup pionowy ABC';
      const s2 = mkPyramid(
        [
          [48 + dx, 42 + dy, 6 + dz],
          [94 + dx, 50 + dy, 6 + dz],
          [76 + dx, 84 + dy, 6 + dz],
        ],
        [12 + dx, 56 + dy, 56 + dz],
        ['E', 'F', 'G', 'W']
      );
      s2.title = 'ostrosłup EFGW';
      return { s1, s2 };
    }
    // c: dwa graniastosłupy
    const s1 = mkPrism(regular([50, 36], 26, 4, G.rad(p.rot), 0), [0, 0, 72], ['A', 'B', 'C', 'D'], ['A_1', 'B_1', 'C_1', 'D_1']);
    s1.title = 'graniastosłup pionowy ABCD';
    const tri = [
      [8 + dx, 74 + dy, 18 + dz],
      [92 + dx, 74 + dy, 30 + dz],
      [44 + dx, 74 + dy, 56 + dz],
    ];
    const s2 = mkPrism(tri, [0, -74, 0], ['E', 'F', 'G'], ['E_1', 'F_1', 'G_1']);
    s2.title = 'graniastosłup EFG (krawędzie ⟂ π₂)';
    return { s1, s2 };
  }
  const sys0P3 = (p) => p.set === 'L2z3' || p.set === 'L2L' || p.set === 'L2R' || p.set === 'L2z1';
  const nameOf = (S, P) => {
    const v = S.verts.find((q) => V.dist(q.p, P) < 1e-6);
    return v ? v.n : '?';
  };
  const edgeName = (S, e) => nameOf(S, e.a) + nameOf(S, e.b);
  const faceName = (S, fi) => S.poly.faces[fi].map((q) => nameOf(S, q)).join('');
  const hn = (s) => h(s);

  function drawSolid(B, sys, S, tag, col) {
    S.tag = tag;
    S.verts.forEach((v) => B.mPoint(v.n, v.p, { s: 'given', ray: false, odn: false, pre: tag + ':', info: 'Wierzchołek ' + h(v.n) + ' (' + S.title + ')' }));
    S.poly.faces.forEach((f, i) => B.a3({ t: 'poly', id: tag + ':f' + i, pts: f, col, op: 0.28 }));
    S.poly.faces.forEach((f, i) => B.info(tag + ':f' + i, 'Ściana ' + h(faceName(S, i)) + ' – ' + S.title));
    S.poly.edges.forEach((e) => {
      const id = tag + ':' + edgeName(S, e);
      e.id = id;
      e.nm = edgeName(S, e);
      B.mSeg(id, e.a, e.b, { s: 'given', s3: 'proj', name: e.nm, what: 'krawędzi ' + h(e.nm) });
    });
  }

  GW.addLesson({
    id: 'm2-wieloscany',
    mod: 2,
    lista: 'L2',
    title: '2.1 Przenikanie wielościanów',
    v2title: 'Rzuty Monge’a – wielobok przenikania',
    needP3: (P) => P.set === 'L2z3' || P.set === 'L2L' || P.set === 'L2R' || P.set === 'L2z1' || (P.set === 'gen' && !!P._p3),
    opts: [
      {
        k: 'set',
        l: 'Zestaw',
        choices: [
          ['L2z1', '📋 Lista 2 · zad. 1: graniastosłup sześciokątny + trójkątny (d=60, m=35, c=40, n=40, l=80)'],
          ['L2L', '📋 Lista 2 · tabela lewa: graniastosłup kwadratowy + trójkątny (wariant 1–16)'],
          ['L2R', '📋 Lista 2 · tabela prawa: graniastosłup sześciokątny + trójkątny (wariant 1–16)'],
          ['L2z3', '📋 Lista 2 · zad. 3: graniastosłupy trójkątne (płaszczyzna podwójnie rzutująca, π₃)'],
          ['a', 'Przykład A: ostrosłup + graniastosłup ⟂ π₂ (całkowite)'],
          ['b', 'Przykład B: graniastosłup pionowy + ostrosłup (częściowe)'],
          ['c', 'Przykład C: dwa graniastosłupy'],
        ],
        v: 'L2z1',
        rebuildFrame: true,
        rebuildParams: true,
      },
      {
        k: 'var',
        l: 'Wariant z tabeli',
        choices: Array.from({ length: 16 }, (_, i) => [i + 1, 'wariant ' + (i + 1)]),
        v: 1,
        rebuildFrame: true,
        when: (P) => P.set === 'L2L' || P.set === 'L2R',
      },
    ],
    mistakes: ['W zadaniu z tabelą wymiary bierzesz z <b>jednego wiersza</b> (swój numer ćwiczenia) – nie mieszaj kolumn obu tabel.', 'Graniastosłup trójkątny w tych zadaniach ma krawędzie ∥ x – w π<sub>3</sub> widać jego prawdziwy przekrój (trójkąt), a w π<sub>2</sub> tylko prostokąt.'],
    params: [
      { k: 'dx', l: 'przesunięcie bryły II: x', min: -25, max: 25, v: 0 },
      { k: 'dy', l: 'przesunięcie bryły II: y', min: -25, max: 25, v: 0 },
      { k: 'dz', l: 'przesunięcie bryły II: z', min: -15, max: 25, v: 0 },
      { k: 'rot', l: 'obrót bryły I [°]', min: 0, max: 90, v: 15 },
    ],
    algo:
      '<ol><li><b>Analiza</b>: w obu rzutach sprawdzamy, które krawędzie jednej bryły „wchodzą” w obrys drugiej – tylko one mogą dawać punkty przenikania.</li>' +
      '<li><b>Metoda krawędzi</b>: dla każdej takiej krawędzi wyznaczamy jej przebicia ze ścianami drugiej bryły. Przez krawędź prowadzimy <b>płaszczyznę pomocniczą rzutującą</b> ε (dla krawędzi ⟂ π<sub>1</sub> – czołową, dla krawędzi ⟂ π<sub>2</sub> – poziomą, dla ogólnej – rzutującą przez jej rzut).</li>' +
      '<li>ε przecina drugą bryłę wzdłuż <b>wielokąta przekroju</b>: jego wierzchołki to przebicia ε z krawędziami drugiej bryły – odczytujemy je w rzucie, w którym ε jest prostą, i przenosimy odnoszącymi.</li>' +
      '<li>Punkty wspólne rzutu krawędzi z wielokątem przekroju = <b>punkty przenikania</b> (krawędź wchodzi/wychodzi z bryły).</li>' +
      '<li><b>Łączenie</b>: dwa punkty łączymy odcinkiem ⇔ leżą na tej samej ścianie bryły I <u>i</u> tej samej ścianie bryły II. Powstaje jeden zamknięty wielobok (przenikanie częściowe) lub dwa (przenikanie całkowite / przebicie).</li>' +
      '<li><b>Widoczność odcinka przenikania</b>: widoczny ⇔ leży na ścianach widocznych w danym rzucie <u>w obu</u> bryłach.</li>' +
      '<li><b>Widoczność krawędzi</b>: części krawędzi wewnątrz drugiej bryły nie istnieją; pozostałe – widoczne, jeśli żadna ściana ich nie zasłania.</li></ol>',
    build(p, B) {
      const { s1, s2 } = defs(p);
      const tableNote = p.set === 'L2L' || p.set === 'L2R' ? ' <i>Wymiary z wiersza ' + p.var + ' tabeli (' + (p.set === 'L2L' ? 'h, h₁, a, b, l, l₁, e, k = ' + TL[p.var - 1].join(', ') : 'd, h, a, c, n, m, l = ' + TR[p.var - 1].join(', ')) + ').</i>' : p.set === 'L2z1' ? ' <i>Wymiary z rysunku: d = 60, m = 35, c = 40, n = 40, l = 80 (h = 60, a = 50 przyjęto jak w wierszu 2 tabeli).</i>' : '';
      B.step({
        title: 'Dane: ' + s1.title + ' i ' + s2.title,
        co: 'Bryła I: <b>' + s1.title + '</b>, bryła II: <b>' + s2.title + '</b>. Szukamy wieloboku przenikania i widoczności' + (sys0P3(p) ? ' – w trzech rzutach (π₁, π₂, π₃)' : '') + '.' + tableNote,
        jak: 'Obejrzyj bryły w 3D. Zwróć uwagę na krawędzie, które przechodzą przez drugą bryłę.',
        why: 'Linia przenikania dwóch wielościanów jest łamaną: każdy jej odcinek to część krawędzi przecięcia jednej ściany bryły I z jedną ścianą bryły II, a każdy wierzchołek – przebicie krawędzi jednej bryły ze ścianą drugiej.',
        cam: 'iso',
      });
      const sys = GW.monge(B);
      drawSolid(B, sys, s1, 'I', '#e8c060');
      drawSolid(B, sys, s2, 'II', '#7fb3e0');
      const segs = G.solidIntersection(s1.poly, s2.poly);
      const loops = G.chain(segs, 1e-4);
      const pa = G.edgePiercings(s1.poly, s2.poly).map((x) => Object.assign(x, { own: s1, oth: s2 }));
      const pb = G.edgePiercings(s2.poly, s1.poly).map((x) => Object.assign(x, { own: s2, oth: s1 }));
      const allP = pa.concat(pb);
      let num = 1;
      loops.forEach((L) =>
        L.pts.forEach((q) => {
          const m = allP.find((x) => !x.n && V.dist(x.p, q) < 1e-3);
          if (m) m.n = num++;
        })
      );
      allP.forEach((x) => {
        if (!x.n) x.n = num++;
      });
      // grupy wg krawędzi
      const groups = [];
      allP.forEach((x) => {
        let g = groups.find((q) => q.own === x.own && q.ei === x.ei);
        if (!g) groups.push((g = { own: x.own, oth: x.oth, ei: x.ei, pts: [] }));
        g.pts.push(x);
      });
      const edgeList = (S) => S.poly.edges.map((e, i) => ({ e, i, hit: groups.some((g) => g.own === S && g.ei === i) }));
      const hitNames = (S) =>
        edgeList(S)
          .filter((q) => q.hit)
          .map((q) => h(q.e.nm))
          .join(', ') || '—';
      B.step({
        title: 'Analiza: które krawędzie dają punkty przenikania?',
        co: 'Krawędzie bryły I przebijające bryłę II: <b>' + hitNames(s1) + '</b>.<br>Krawędzie bryły II przebijające bryłę I: <b>' + hitNames(s2) + '</b>.',
        jak: 'Na rysunku: krawędź może przebić drugą bryłę tylko wtedy, gdy <i>w obu rzutach</i> jej rzut zachodzi na obrys drugiej bryły. Pozostałe krawędzie odrzucamy od razu. Podświetlone (pomarańczowe) krawędzie zbadamy w kolejnych krokach.',
        why: 'Wierzchołkami wieloboku przenikania są wyłącznie przebicia krawędzi ze ścianami. Gdy znamy je wszystkie, pozostaje je właściwie połączyć.',
      });
      groups.forEach((g) => {
        const e = g.own.poly.edges[g.ei];
        B.src(e.id + '|1', e.id + '|2');
      });
      // kroki dla kolejnych krawędzi
      let prevAux = [];
      groups.forEach((g, gi) => {
        const e = g.own.poly.edges[g.ei];
        const d = V.sub(e.b, e.a);
        const L = V.len(d);
        let eps, tv, kind;
        if (Math.abs(d[0]) / L > 0.999) {
          eps = G.planePN(e.a, [0, 0, 1]);
          tv = 'p2';
          kind = 'poziomą (∥ π<sub>1</sub>, ⟂ π<sub>2</sub> i π<sub>3</sub>)';
        } else if (Math.abs(d[2]) / L > 0.999) {
          eps = G.planePN(e.a, [0, 1, 0]);
          tv = 'p1';
          kind = 'czołową (∥ π<sub>2</sub>, ⟂ π<sub>1</sub>)';
        } else if (Math.abs(d[1]) / L > 0.999) {
          eps = G.planePN(e.a, [0, 0, 1]);
          tv = 'p2';
          kind = 'poziomą (∥ π<sub>1</sub>, ⟂ π<sub>2</sub>)';
        } else {
          const lp2 = V.len([d[0], d[2]]);
          if (lp2 > 0.3 * L) {
            eps = G.planePN(e.a, V.cross(d, [0, 1, 0]));
            tv = 'p2';
            kind = 'pionowo-rzutującą (⟂ π<sub>2</sub>)';
          } else {
            eps = G.planePN(e.a, V.cross(d, [0, 0, 1]));
            tv = 'p1';
            kind = 'poziomo-rzutującą (⟂ π<sub>1</sub>)';
          }
        }
        const rv = tv === 'p1' ? 'p2' : 'p1';
        const kt = tv === 'p1' ? 1 : 2,
          kr = 3 - kt;
        const sec = g.oth.poly.section(eps);
        const secD = g.oth.poly.sectionDetailed(eps);
        const ne = 'ε_{' + (gi + 1) + '}';
        const trn = (tv === 'p2' ? 'v' : 'h') + '_{ε' + (gi + 1) + '}';
        g.pts.sort((a, b) => a.t - b.t);
        const nums = g.pts.map((x) => x.n);
        const secEdges = secD.map((q) => h(edgeName(g.oth, g.oth.poly.edges[q.ei]))).join(', ');
        B.step({
          title: 'Krawędź ' + e.nm.replace(/_(\d)/g, '$1') + ' → punkty ' + nums.join(', '),
          co: 'Przebicia krawędzi <b>' + h(e.nm) + '</b> (' + (g.own === s1 ? 'bryła I' : 'bryła II') + ') ze ścianami bryły ' + (g.own === s1 ? 'II' : 'I') + ': punkty <b>' + nums.join(', ') + '</b>.',
          jak:
            '<ol><li>Przez ' +
            h(e.nm) +
            ' prowadzimy płaszczyznę ' +
            kind +
            ' <b>' +
            h(ne) +
            '</b>; jej ślad ' +
            h(trn) +
            ' w π<sub>' +
            kt +
            '</sub> przechodzi przez ' +
            h(lab(e.nm, kt)) +
            '.</li><li>' +
            h(ne) +
            ' przecina krawędzie ' +
            secEdges +
            ' – punkty przekroju odczytujemy w π<sub>' +
            kt +
            '</sub> na śladzie i odnoszącymi przenosimy do π<sub>' +
            kr +
            '</sub>.</li><li>W π<sub>' +
            kr +
            '</sub> łączymy je w wielokąt przekroju (pomarańczowy).</li><li>' +
            h(lab(e.nm, kr)) +
            ' ∩ przekrój = ' +
            nums.map((n) => h(lab(String(n), kr))).join(', ') +
            '; odnoszące → ' +
            nums.map((n) => h(lab(String(n), kt))).join(', ') +
            ' na ' +
            h(lab(e.nm, kt)) +
            '.</li></ol>',
          why: 'Krawędź leży w ' + h(ne) + ', a przekrój jest dokładnie częścią wspólną ' + h(ne) + ' i drugiej bryły. Punkty wspólne krawędzi i przekroju są więc punktami krawędzi leżącymi na powierzchni drugiej bryły – czyli jej przebiciami. W rzucie π<sub>' + kt + '</sub> wszystko leży na jednej prostej (śladzie), dlatego czytamy w π<sub>' + kr + '</sub>.',
          cam: tv === 'p2' ? { dir: [0.45, 1, 0.5] } : { dir: [0.5, 0.55, 1] },
        });
        B.end(...prevAux);
        const auxIds = [];
        const pre = 'g' + gi + ':';
        // płaszczyzna w 3D
        const u = V.norm(d),
          w = V.norm(V.cross(eps.n, u));
        const cloud = sec.concat([e.a, e.b]);
        const c0 = e.a;
        const us = cloud.map((q) => V.dot(V.sub(q, c0), u)),
          ws = cloud.map((q) => V.dot(V.sub(q, c0), w));
        const m = 8;
        const P = (a, b) => V.add(c0, V.add(V.mul(u, a), V.mul(w, b)));
        const u0 = Math.min(...us) - m,
          u1 = Math.max(...us) + m,
          w0 = Math.min(...ws) - m,
          w1 = Math.max(...ws) + m;
        B.planeQuad(pre + 'eps', [P(u0, w0), P(u1, w0), P(u1, w1), P(u0, w1)], { op: 0.13 });
        B.info(pre + 'eps', 'Płaszczyzna pomocnicza ' + h(ne) + ' przez krawędź ' + h(e.nm), [e.id]);
        auxIds.push(pre + 'eps');
        // ślad
        const sTr = [P(u0, w0), P(u1, w0), P(u1, w1), P(u0, w1)].map((q) => sys.toSheet(tv, q));
        let ta = sTr[0],
          tb = sTr[0],
          best = -1;
        for (let i = 0; i < 4; i++)
          for (let j = i + 1; j < 4; j++) {
            const dd = V.dist(sTr[i], sTr[j]);
            if (dd > best) {
              best = dd;
              ta = sTr[i];
              tb = sTr[j];
            }
          }
        B.a2({ t: 'seg', id: pre + 'eps', a: ta, b: tb, s: 'auxd', label: trn, labelAt: 0.97 });
        // przekrój
        if (sec.length >= 3) {
          B.a3({ t: 'pl', id: pre + 'sec', pts: sec, closed: true, s: 'sec' });
          B.a2({ t: 'pl', id: pre + 'sec', pts: sec.map((q) => sys.toSheet(rv, q)), closed: true, s: 'sec' });
          B.info(pre + 'sec', 'Wielokąt przekroju bryły ' + (g.own === s1 ? 'II' : 'I') + ' płaszczyzną ' + h(ne));
          auxIds.push(pre + 'sec');
          secD.forEach((q, i) => {
            const id = pre + 's' + i;
            B.a3({ t: 'pt', id, p: q.p, s: 'sec', small: true });
            B.a2({ t: 'pt', id, p: sys.toSheet(tv, q.p), s: 'sec', r: 2.2 });
            B.a2({ t: 'pt', id, p: sys.toSheet(rv, q.p), s: 'sec', r: 2.2 });
            B.a2({ t: 'seg', id: id + 'o', a: sys.toSheet(tv, q.p), b: sys.toSheet(rv, q.p), s: 'odn' });
            B.info(id, 'Punkt przekroju: ' + h(ne) + ' ∩ krawędź ' + h(edgeName(g.oth, g.oth.poly.edges[q.ei])));
            B.link(id, [g.oth.poly.edges[q.ei].id, pre + 'sec']);
            auxIds.push(id, id + 'o');
            B.src(g.oth.poly.edges[q.ei].id + '|' + kt);
          });
        }
        g.pts.forEach((x) => {
          B.mPoint(String(x.n), x.p, { s: 'res', pre: 'pp', ray: false, info: 'Punkt przenikania ' + x.n + ': krawędź ' + h(e.nm) + ' × ściana ' + h(faceName(g.oth, x.fj)) });
          x.id = 'pp' + x.n;
        });
        B.src(e.id + '|' + kt, e.id + '|' + kr);
        prevAux = auxIds;
      });
      // łączenie
      const segInfo = segs.map((s) => {
        const na = allP.find((x) => V.dist(x.p, s.a) < 1e-3),
          nb = allP.find((x) => V.dist(x.p, s.b) < 1e-3);
        return Object.assign(s, { na: na ? na.n : '?', nb: nb ? nb.n : '?' });
      });
      B.step({
        title: 'Łączenie punktów w wielobok' + (loops.length > 1 ? 'i' : '') + ' przenikania',
        co: 'Łączymy punkty w ' + (loops.length === 1 ? '<b>jeden</b> zamknięty wielobok (przenikanie częściowe)' : '<b>' + loops.length + '</b> zamknięte wieloboki (przenikanie całkowite – bryła przechodzi na wylot)') + '.',
        jak:
          'Reguła: łączymy dwa punkty ⇔ leżą na wspólnej ścianie obu brył:<ul>' +
          segInfo
            .slice(0, 14)
            .map((s) => '<li>' + s.na + '–' + s.nb + ': ' + h(faceName(s1, s.f1)) + ' × ' + h(faceName(s2, s.f2)) + '</li>')
            .join('') +
          '</ul>',
        why: 'Odcinek przenikania jest częścią prostej przecięcia dwóch ścian (płaszczyzn). Jeśli dwa punkty nie mają wspólnej ściany w obu bryłach, łączący je odcinek przeciąłby wnętrze którejś bryły – nie leżałby na obu powierzchniach.',
        cam: 'iso',
        unfold: {},
      });
      B.end(...prevAux);
      segInfo.forEach((s, i) => B.mSeg('ls' + i, s.a, s.b, { s: 'res', s3: 'res', proj3: false }));
      segInfo.forEach((s, i) => B.info('ls' + i, 'Odcinek przenikania ' + s.na + '–' + s.nb + ' = ściana ' + h(faceName(s1, s.f1)) + ' ∩ ściana ' + h(faceName(s2, s.f2)), ['I:f' + s.f1, 'II:f' + s.f2]));
      // widoczność przenikania
      B.step({
        title: 'Widoczność wieloboku przenikania',
        co: 'Odcinek przenikania jest widoczny w danym rzucie ⇔ leży na ścianach widocznych w obu bryłach.',
        jak: 'Ściana jest widoczna w π<sub>1</sub>, jeśli jest zwrócona do góry (normalna zewnętrzna ma z &gt; 0); w π<sub>2</sub> – jeśli zwrócona do przodu (y &gt; 0); w π<sub>3</sub> – jeśli zwrócona w lewo (x &lt; 0). Dla każdego odcinka sprawdzamy obie jego ściany.',
        why: 'Na ścianie niewidocznej wszystko jest zasłonięte przez samą bryłę – więc odcinek leżący na takiej ścianie nie może być widoczny, nawet jeśli druga ściana jest widoczna.',
      });
      GW.mplanes(sys).forEach((pid) => {
        const N = sys.get(pid).N,
          kk = sys.get(pid).k;
        segInfo.forEach((s, i) => {
          const vis = V.dot(s1.poly.planes[s.f1].n, N) > 1e-9 && V.dot(s2.poly.planes[s.f2].n, N) > 1e-9;
          B.p2.forEach((q) => q.id === 'ls' + i + '|' + kk && q.to === undefined && (q.to = B.cur));
          B.a2({ t: 'seg', id: 'ls' + i + '|' + kk, a: sys.toSheet(pid, s.a), b: sys.toSheet(pid, s.b), s: vis ? 'res' : 'resd' });
        });
      });
      // widoczność krawędzi
      B.step({
        title: 'Widoczność krawędzi brył',
        co: 'Krawędzie: części wewnątrz drugiej bryły usuwamy, pozostałe – grubą ciągłą (widoczne) lub przerywaną (niewidoczne).',
        jak: 'Krawędź zmienia widoczność w punktach przenikania oraz tam, gdzie jej rzut przecina kontur zasłaniającej ściany.',
        why: 'Po przenikaniu powstaje jedna bryła (suma). Fragment krawędzi wewnątrz drugiej bryły nie należy do powierzchni sumy.',
      });
      const faces = [];
      [s1, s2].forEach((S) => S.poly.faces.forEach((f, i) => faces.push({ pts: f, pl: S.poly.planes[i] })));
      const edges = [];
      [s1, s2].forEach((S, si) => S.poly.edges.forEach((e) => edges.push({ a: e.a, b: e.b, id: e.id, other: si ? s1 : s2 })));
      GW.mplanes(sys).forEach((pid) => {
        const kk = sys.get(pid).k;
        const pcs = GW.visPieces(sys, pid, edges, faces, { omit: (M, e) => e.other.poly.contains(M, 1e-6) });
        edges.forEach((e) => B.p2.forEach((q) => q.id === e.id + '|' + kk && q.to === undefined && (q.to = B.cur)));
        pcs.forEach((pc) => B.a2({ t: 'seg', id: pc.e.id + '|' + kk, a: pc.a, b: pc.b, s: pc.vis ? 'vis' : 'hid' }));
      });
      B.step({
        title: 'Wynik',
        co: 'Wielobok przenikania z widocznością.',
        jak: 'Najedź na odcinek przenikania – podświetlą się dwie ściany, których jest częścią wspólną.',
        why: 'Przesuń bryłę II suwakami – zobacz przejście od przenikania całkowitego (2 wieloboki) do częściowego (1 wielobok) i zmianę zestawu krawędzi.',
        cam: 'iso',
      });
      B.data.loops = loops;
    },
  });
})();
