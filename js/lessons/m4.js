/* ===================================================================
   MODUŁ 4 – Aksonometria; przekrój wielościanu płaszczyzną i kład
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h;
  const d2r = G.rad;

  /* ---------- układy aksonometryczne ---------- */
  function axon(type) {
    let ex, ey, ez, sc, n, angs, orto;
    if (type === 'iso') {
      ex = [Math.cos(d2r(30)), -Math.sin(d2r(30))];
      ey = [-Math.cos(d2r(30)), -Math.sin(d2r(30))];
      ez = [0, 1];
      sc = [1, 1, 1];
      n = 'Izometria (prostokątna)';
      angs = [30, 30];
      orto = true;
    } else if (type === 'dimp') {
      const a = d2r(7 + 10 / 60),
        b = d2r(41 + 25 / 60);
      ex = [Math.cos(a), -Math.sin(a)];
      ey = [-Math.cos(b), -Math.sin(b)];
      ez = [0, 1];
      sc = [1, 0.5, 1];
      n = 'Dimetria prostokątna';
      angs = [7 + 10 / 60, 41 + 25 / 60];
      orto = true;
    } else {
      ex = [1, 0];
      ey = [-Math.cos(d2r(45)), -Math.sin(d2r(45))];
      ez = [0, 1];
      sc = [1, 0.5, 1];
      n = 'Dimetria ukośna (kawalerska)';
      angs = [0, 45];
      orto = false;
    }
    const E = [V.mul(ex, sc[0]), V.mul(ey, sc[1]), V.mul(ez, sc[2])];
    const p = [E[0][0], E[1][0], E[2][0]],
      q = [E[0][1], E[1][1], E[2][1]];
    let d = V.norm(V.cross(p, q));
    if (orto ? d[2] < 0 : d[1] < 0) d = V.mul(d, -1);
    const map = (P) => [P[0] * E[0][0] + P[1] * E[1][0] + P[2] * E[2][0], -(P[0] * E[0][1] + P[1] * E[1][1] + P[2] * E[2][1])];
    return { type, ex, ey, ez, sc, E, n, angs, orto, dir: d, map };
  }
  GW.axon = axon;
  const AXOPT = {
    k: 'ax',
    l: 'Układ aksonometryczny',
    choices: [
      ['iso', 'Izometria'],
      ['dimp', 'Dimetria prostokątna'],
      ['dimu', 'Dimetria ukośna (kawalerska)'],
    ],
    v: 'iso',
    rebuildFrame: true,
  };
  const fmtAng = (a) => {
    const d = Math.floor(a + 1e-9),
      m = Math.round((a - d) * 60);
    return d + '°' + (m ? m + '′' : '');
  };

  /* rzutnia aksonometryczna + promienie (3D) */
  function axonApparatus(ax, verts, center, size) {
    const p3 = [];
    let n, w;
    if (ax.orto) {
      n = ax.dir;
      w = ax.dir;
    } else {
      n = [0, 1, 0];
      w = ax.dir;
    }
    const back = Math.min(...verts.map((P) => V.dot(P, n))) - size * 0.6;
    const pl = { n, d: back };
    const proj = (P) => {
      const s = (V.dot(P, n) - back) / V.dot(w, n);
      return V.sub(P, V.mul(w, s));
    };
    const c = proj(center);
    const u = V.norm(V.cross(n, Math.abs(n[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1])),
      v = V.cross(n, u);
    const S = size * 1.25;
    const quad = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([a, b]) => V.add(c, V.add(V.mul(u, a * S), V.mul(v, b * S))));
    p3.push({ t: 'poly', id: 'axplane', pts: quad, col: '#9ec29a', op: 0.18, edge: true, labelP: quad[2], label: 'rzutnia aksonometryczna' });
    return { p3, proj, pl };
  }

  /* bryła schodkowa (L) – ściany */
  function lBlock(a, b, c, a2, c2) {
    const prof = [
      [0, 0],
      [a, 0],
      [a, c2],
      [a2, c2],
      [a2, c],
      [0, c],
    ];
    const F = (x, z, y) => [x, y, z];
    const front = prof.map(([x, z]) => F(x, z, b)),
      back = prof.map(([x, z]) => F(x, z, 0));
    const faces = [front, back.slice().reverse()];
    for (let i = 0; i < prof.length; i++) {
      const j = (i + 1) % prof.length;
      faces.push([back[i], back[j], front[j], front[i]]);
    }
    const edges = [];
    for (let i = 0; i < prof.length; i++) {
      const j = (i + 1) % prof.length;
      edges.push([front[i], front[j]], [back[i], back[j]], [front[i], back[i]]);
    }
    return { faces: faces.map((f) => ({ pts: f, pl: G.planePN(f[0], G.newell(f)) })), edges, verts: front.concat(back) };
  }

  /* =================================================================
     4.1 Układy aksonometryczne
     ================================================================= */
  GW.addLesson({
    id: 'm4-uklady',
    mod: 4,
    title: '4.1 Układy osi aksonometrycznych',
    v2title: 'Rysunek aksonometryczny',
    opts: [AXOPT],
    params: [
      { k: 'a', l: 'długość a (oś x)', min: 30, max: 80, v: 60 },
      { k: 'b', l: 'głębokość b (oś y)', min: 20, max: 70, v: 40 },
      { k: 'c', l: 'wysokość c (oś z)', min: 25, max: 70, v: 45 },
      { k: 'a2', l: 'szerokość części wysokiej', min: 10, max: 50, v: 25 },
      { k: 'c2', l: 'wysokość stopnia', min: 8, max: 40, v: 20 },
    ],
    cams: [
      { l: 'Kierunek rzutowania', cam: (c) => ({ dir: c.data.ax.dir, fov: 6, target: c.data.center }), title: 'Patrz dokładnie w kierunku rzutowania aksonometrycznego (prawie rzut równoległy)' },
    ],
    special: {
      note: '<b>Aksonometria jako rzut równoległy.</b> Włącz rzutnię i promienie – zobaczysz, że rysunek aksonometryczny to zwykły rzut bryły <i>razem z osiami układu</i> na jedną płaszczyznę. W izometrii i dimetrii prostokątnej promienie są ⟂ rzutni, w dimetrii ukośnej – ukośne (rzutnia ∥ xz).',
      ui: [
        { type: 'check', k: 'app', l: 'pokaż rzutnię aksonometryczną i promienie rzutujące', v: false },
        { type: 'btn', l: 'Patrz wzdłuż kierunku rzutowania', fn: (c) => c.app.applyCam({ dir: c.data.ax.dir, fov: 6, target: c.data.center }) },
        { type: 'btn', l: 'Widok swobodny', fn: (c) => c.app.applyCam('iso') },
      ],
      overlay(c) {
        if (!c.S.app || !c.data.ax) return {};
        const d = c.data;
        const A = axonApparatus(d.ax, d.verts, d.center, d.size);
        const p3 = A.p3.slice();
        d.verts.forEach((P, i) => {
          const Q = A.proj(P);
          p3.push({ t: 'seg', id: 'axray', a: P, b: Q, s: 'ray' });
          p3.push({ t: 'pt', id: 'axray', p: Q, s: 'proj', small: true });
        });
        d.edges.forEach((e) => p3.push({ t: 'seg', id: 'aximg', a: A.proj(e[0]), b: A.proj(e[1]), s: 'projl', w: 0.6 }));
        [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ].forEach((u, i) => p3.push({ t: 'seg', id: 'aximgax' + i, a: A.proj([0, 0, 0]), b: A.proj(V.mul(u, d.size * 1.3)), s: 'aux', w: 0.7 }));
        return { p3, info: { axray: 'Promień rzutujący aksonometrii – wszystkie są równoległe (kierunek rzutowania)', aximg: 'Obraz bryły na rzutni aksonometrycznej – przystaje (z dokładnością do skali) do rysunku 2D', axplane: 'Rzutnia aksonometryczna' } };
      },
    },
    algo:
      '<ol><li><b>Aksonometria</b> = rzut równoległy bryły wraz z jej układem współrzędnych (x, y, z) na jedną rzutnię. Osie rzutują się na osie aksonometryczne, a jednostki – na jednostki skrócone.</li>' +
      '<li><b>Izometria</b>: osie x i y pod kątem 30° do poziomu, z pionowo; skróty 1 : 1 : 1 (praktyczne; rzeczywiste ≈ 0,82).</li>' +
      '<li><b>Dimetria prostokątna</b>: oś x pod kątem 7°10′, oś y pod kątem 41°25′; skróty x : y : z = 1 : ½ : 1.</li>' +
      '<li><b>Dimetria ukośna</b> (kawalerska): x poziomo, z pionowo (rzeczywista wielkość – rzutnia ∥ ściany czołowej), y pod 45°, skrót ½.</li>' +
      '<li><b>Procedura rysowania</b>: osie → prostopadłościan opisany (wymiary × skróty) → odcięcie części → widoczność. Długości mierzymy <u>tylko wzdłuż osi</u> (lub równolegle do nich) – odcinki ukośne nie mają stałego skrótu!</li></ol>',
    build(p, B) {
      const ax = axon(p.ax);
      const blk = lBlock(p.a, p.b, p.c, Math.min(p.a2, p.a - 5), Math.min(p.c2, p.c - 5));
      const center = [p.a / 2, p.b / 2, p.c / 2];
      const size = Math.max(p.a, p.b, p.c);
      B.data = { ax, verts: blk.verts, edges: blk.edges, center, size };
      const M = ax.map;
      const L = size * 1.35;
      B.step({
        title: 'Bryła i jej układ współrzędnych',
        co: 'Bryła schodkowa o wymiarach a × b × c = ' + p.a + ' × ' + p.b + ' × ' + p.c + ', związana z osiami x, y, z.',
        jak: 'W 3D zobacz osie: x – w prawo, y – do obserwatora, z – w górę (jak w Monge’u). Włącz w „Widoku specjalnym” rzutnię aksonometryczną.',
        why: 'Rysunek aksonometryczny ma pokazać bryłę poglądowo, ale wymiarowo: dzięki znanym skrótom na osiach możemy odmierzać długości tak jak w rzutach Monge’a.',
        cam: 'iso',
      });
      blk.faces.forEach((f, i) => B.a3({ t: 'poly', id: 'face' + i, pts: f.pts, col: '#e8c060', op: 0.55 }));
      blk.edges.forEach((e, i) => B.a3({ t: 'seg', id: 'e' + i, a: e[0], b: e[1], s: 'proj' }));
      ['x', 'y', 'z'].forEach((n, i) => {
        const u = [0, 0, 0];
        u[i] = L;
        B.a3({ t: 'seg', id: 'ax' + n, a: [0, 0, 0], b: u, s: 'aux', label: n, labelAt: 1 });
        B.info('ax' + n, 'Oś ' + n + ' układu współrzędnych bryły');
      });
      B.step({
        title: 'Osie aksonometryczne: ' + ax.n,
        co: 'Rysujemy obrazy osi: ' + (ax.type === 'dimu' ? 'x poziomo, z pionowo, y pod kątem 45°' : 'z pionowo, x pod kątem ' + fmtAng(ax.angs[0]) + ' i y pod kątem ' + fmtAng(ax.angs[1]) + ' do poziomu') + '.',
        jak: 'Kąty odkładamy od poziomej przez początek układu O. Najedź na oś w 2D – w 3D podświetli się odpowiadająca jej oś przestrzenna.',
        why: ax.orto
          ? 'W aksonometrii prostokątnej rzutnia jest nachylona do wszystkich osi; kąty osi aksonometrycznych wynikają z nachylenia (dla izometrii – jednakowego do x, y, z). Kąty i skróty są ze sobą powiązane: suma kwadratów skrótów rzeczywistych = 2.'
          : 'W aksonometrii ukośnej rzutnia jest równoległa do płaszczyzny xz, więc ściany czołowe widać w rzeczywistej wielkości; kierunek rzutowania jest ukośny, dlatego oś y (głębokość) rysujemy pod 45° ze skrótem ½.',
      });
      ['x', 'y', 'z'].forEach((n, i) => {
        const u = [0, 0, 0];
        u[i] = L / ax.sc[i];
        B.a2({ t: 'arrow', id: 'ax' + n, a: M([0, 0, 0]), b: M(u.map((v, k) => (k === i ? L : 0) / 1)), s: 'aux' });
        const tip = M(u.map((v, k) => (k === i ? L * 1.06 : 0)));
        B.a2({ t: 'text', id: 'ax' + n, p: tip, txt: n, s: 'note' });
      });
      // kąty
      const O = M([0, 0, 0]);
      if (ax.type !== 'dimu') {
        B.a2({ t: 'seg', id: 'hor', a: V.add(O, [-L * 0.8, 0]), b: V.add(O, [L * 0.8, 0]), s: 'thin' });
        const ra = 22;
        const aX = Math.atan2(-ax.ex[1], ax.ex[0]),
          aY = Math.atan2(-ax.ey[1], ax.ey[0]);
        B.a2({ t: 'arc', id: 'angx', c: O, r: ra, a0: 0, a1: aX, s: 'aux' });
        B.a2({ t: 'arc', id: 'angy', c: O, r: ra + 4, a0: Math.PI, a1: aY, s: 'aux' });
        B.a2({ t: 'text', id: 'angx', p: V.add(O, [ra + 14, ra * Math.sin(aX) * 0.5 + 4]), txt: fmtAng(ax.angs[0]), s: 'note' });
        B.a2({ t: 'text', id: 'angy', p: V.add(O, [-(ra + 18), (ra + 4) * Math.sin(aY) * 0.5 + 4]), txt: fmtAng(ax.angs[1]), s: 'note' });
        B.info('angx', 'Kąt osi x z poziomem: ' + fmtAng(ax.angs[0]));
        B.info('angy', 'Kąt osi y z poziomem: ' + fmtAng(ax.angs[1]));
      } else {
        B.a2({ t: 'arc', id: 'angy', c: O, r: 20, a0: Math.PI, a1: Math.atan2(-ax.ey[1], ax.ey[0]), s: 'aux' });
        B.a2({ t: 'text', id: 'angy', p: V.add(O, [-30, 10]), txt: '45°', s: 'note' });
        B.info('angy', 'Oś y pod kątem 45° do poziomu (skrót ½)');
      }
      B.step({
        title: 'Skróty (jednostki aksonometryczne)',
        co: 'Na osiach odkładamy podziałkę co 10 jednostek, mnożąc przez skróty: x : y : z = ' + ax.sc.map((s) => (s === 0.5 ? '½' : s)).join(' : ') + '.',
        jak: 'Każda kreska = 10 jednostek rzeczywistych. ' + (ax.sc[1] === 0.5 ? 'Na osi y kreski są dwa razy gęstsze – głębokość rysujemy w połowie.' : 'W izometrii praktycznej wszystkie skróty = 1 (rysunek jest powiększony ok. 1,22× względem dokładnego rzutu).'),
        why: 'Rzut równoległy zachowuje stosunek długości odcinków równoległych – dlatego na każdej osi (i prostych do niej równoległych) skrót jest stały, a na odcinkach ukośnych – nie.',
      });
      ['x', 'y', 'z'].forEach((n, i) => {
        for (let k = 10; k <= L; k += 10) {
          const u = [0, 0, 0];
          u[i] = k;
          const P = M(u);
          const dir = V.norm(V.sub(M(u.map((v, j) => (j === i ? v + 1 : 0))), P));
          const nn = V.mul(V.perp2(dir), 2.2);
          B.a2({ t: 'seg', id: 'tick' + n, a: V.add(P, nn), b: V.sub(P, nn), s: 'aux' });
        }
        B.info('tick' + n, 'Podziałka na osi ' + n + ': co 10 jednostek × skrót ' + ax.sc[i]);
      });
      B.step({
        title: 'Prostopadłościan opisany',
        co: 'Prostopadłościan a × b × c obejmujący bryłę.',
        jak: 'Od O odkładamy a wzdłuż x, b wzdłuż y (× skrót), c wzdłuż z; przez końce prowadzimy równoległe do osi.',
        why: 'Rzut równoległy zachowuje równoległość – prostopadłościan przechodzi w równoległościan zbudowany z trzech rodzin odcinków równoległych do osi.',
      });
      const bx = [
        [0, 0, 0],
        [p.a, 0, 0],
        [p.a, p.b, 0],
        [0, p.b, 0],
        [0, 0, p.c],
        [p.a, 0, p.c],
        [p.a, p.b, p.c],
        [0, p.b, p.c],
      ];
      [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 0],
        [4, 5],
        [5, 6],
        [6, 7],
        [7, 4],
        [0, 4],
        [1, 5],
        [2, 6],
        [3, 7],
      ].forEach(([i, j]) => {
        B.a2({ t: 'seg', id: 'box', a: M(bx[i]), b: M(bx[j]), s: 'thin' });
        B.a3({ t: 'seg', id: 'box', a: bx[i], b: bx[j], s: 'thin' });
      });
      B.info('box', 'Prostopadłościan opisany a × b × c');
      B.step({
        title: 'Krawędzie bryły',
        co: 'Wcięcie (stopień): odmierzamy szerokość części wysokiej ' + Math.min(p.a2, p.a - 5) + ' na osi x i wysokość stopnia ' + Math.min(p.c2, p.c - 5) + ' na osi z.',
        jak: 'Wszystkie krawędzie bryły są równoległe do osi – rysujemy je równolegle do osi aksonometrycznych.',
        why: 'Punkty wyznaczamy „po współrzędnych”: P = x·e<sub>x</sub> + y·e<sub>y</sub> + z·e<sub>z</sub> – to wektorowy zapis konstrukcji po osiach.',
      });
      blk.edges.forEach((e, i) => {
        B.a2({ t: 'seg', id: 'e' + i, a: M(e[0]), b: M(e[1]), s: 'given' });
        B.info('e' + i, 'Krawędź bryły');
      });
      B.step({
        title: 'Widoczność',
        co: 'Krawędzie widoczne – grubą linią, niewidoczne – przerywaną (w rysunkach poglądowych często się je pomija).',
        jak: 'Obserwator patrzy w kierunku rzutowania (przycisk „Kierunek rzutowania” nad widokiem 3D) – krawędzie zasłonięte przez ściany są niewidoczne.',
        why: 'Widoczność wynika z kierunku rzutowania: ' + (ax.orto ? 'tu z przodu-z prawej-z góry, prostopadle do rzutni.' : 'ukośnie, od przodu-z prawej-z góry.'),
      });
      B.endWhere((q) => /^e\d+$/.test(q.id) && B.p2.indexOf(q) >= 0);
      const pcs = G.hlr(
        blk.edges.map((e) => ({ a: e[0], b: e[1] })),
        blk.faces,
        { dir: ax.dir }
      );
      pcs.forEach((pc) => B.a2({ t: 'seg', id: 'e' + pc.ei, a: M(pc.a), b: M(pc.b), s: pc.st === 'vis' ? 'vis' : 'hid' }));
      B.endWhere((q) => q.id === 'box' && B.p2.indexOf(q) >= 0);
    },
  });

  /* =================================================================
     4.2 Przekrój graniastosłupa / ostrosłupa płaszczyzną + kład
     ================================================================= */
  GW.addLesson({
    id: 'm4-przekroj',
    mod: 4,
    title: '4.2 Przekrój wielościanu płaszczyzną i kład',
    v2title: 'Aksonometria (lewa) | rzut poziomy i kład (prawa)',
    opts: [
      {
        k: 'solid',
        l: 'Bryła',
        choices: [
          ['prism', 'graniastosłup prosty'],
          ['pyr', 'ostrosłup prosty'],
        ],
        v: 'prism',
        rebuildFrame: true,
      },
      {
        k: 'n',
        l: 'Podstawa',
        choices: [
          [4, 'czworokąt'],
          [5, 'pięciokąt'],
          [6, 'sześciokąt'],
        ],
        v: 5,
        rebuildFrame: true,
      },
      AXOPT,
    ],
    params: [
      { k: 'R', l: 'promień podstawy', min: 18, max: 40, v: 30 },
      { k: 'H', l: 'wysokość bryły', min: 40, max: 90, v: 70 },
      { k: 'phi', l: 'kierunek śladu t [°]', min: -60, max: 60, v: 18 },
      { k: 'off', l: 'odległość śladu od środka', min: 35, max: 90, v: 48 },
      { k: 'hP', l: 'wysokość punktu P na krawędzi', min: 10, max: 85, v: 42 },
      { k: 'rot0', l: 'obrót podstawy [°]', min: 0, max: 72, v: 10 },
    ],
    special: {
      note: '<b>Kład w 3D.</b> Suwak obraca płaszczyznę przekroju wokół śladu t aż do położenia w płaszczyźnie podstawy – widać, że kład jest przekrojem „położonym na ziemi” w rzeczywistej wielkości.',
      ui: [{ type: 'range', k: 'rot', l: 'obrót kładu', min: 0, max: 1, step: 0.005, v: 0 }],
      onStep(c, k) {
        const s = c.B.steps[k];
        c.app.setSpecial('rot', s && s.klad ? 1 : 0);
      },
      overlay(c) {
        const d = c.data;
        if (!d.sec || c.S.rot <= 0) return {};
        const ang = c.S.rot * d.kAng;
        const pts = d.sec.map((P) => G.rotAbout(P, d.t0, d.tdir, ang));
        return {
          p3: [
            { t: 'poly', id: 'kladrot', pts, col: '#d01818', op: 0.35, edge: true, edgeCol: 0xd01818 },
            { t: 'pl', id: 'kladrot', pts, closed: true, s: 'res' },
          ],
          info: { kladrot: 'Przekrój obracany wokół śladu t (kład) – obrót o ' + G.f0(G.deg(ang)) + '°' },
        };
      },
    },
    algo:
      '<ol><li><b>Dane</b>: bryła, ślad t płaszczyzny tnącej na płaszczyźnie podstawy oraz jeden punkt P przekroju na krawędzi bocznej.</li>' +
      '<li><b>Powinowactwo osiowe</b> (graniastosłup): podstawa i przekrój są figurami powinowatymi; <i>oś powinowactwa</i> = ślad t, <i>kierunek</i> = kierunek krawędzi bocznych. Odpowiadające sobie proste (bok podstawy ↔ bok przekroju) przecinają się na osi t.</li>' +
      '<li><b>Kolineacja środkowa</b> (ostrosłup): to samo, ale zamiast kierunku – <i>środek</i> = wierzchołek ostrosłupa (punkty odpowiadające leżą na prostych przez wierzchołek).</li>' +
      '<li><b>Krok</b>: znając punkt P<sub>i</sub> na krawędzi przez wierzchołek V<sub>i</sub>: przedłuż bok podstawy V<sub>i</sub>V<sub>i+1</sub> do przecięcia z t → T. Prosta T P<sub>i</sub> leży w ścianie bocznej i w płaszczyźnie tnącej → jej przecięcie z kolejną krawędzią boczną daje P<sub>i+1</sub>.</li>' +
      '<li><b>Kontrola</b>: po obejściu wszystkich ścian wracamy do punktu P.</li>' +
      '<li><b>Kład</b>: obracamy płaszczyznę przekroju wokół t do płaszczyzny podstawy. W rzucie poziomym: punkt P<sub>i</sub>′ → prostopadła do t′ (stopa F); rzeczywista odległość |FP<sub>i</sub>| z trójkąta prostokątnego o przyprostokątnych |FP<sub>i</sub>′| i z<sub>i</sub>; łuk z F odkłada ją na prostopadłej → (P<sub>i</sub>).</li></ol>',
    build(p, B) {
      const ax = axon(p.ax);
      const M = ax.map;
      const n = +p.n,
        R = p.R,
        H = p.H;
      const C = [R + 8, R + 8, 0];
      const base = [];
      for (let i = 0; i < n; i++) {
        const a = d2r(p.rot0) + (i * 2 * Math.PI) / n;
        base.push([C[0] + R * Math.cos(a), C[1] + R * Math.sin(a), 0]);
      }
      const isPrism = p.solid === 'prism';
      const apex = [C[0], C[1], H];
      const solid = isPrism ? G.prism(base, [0, 0, H]) : G.pyramid(base, apex);
      // ślad t
      const tdir = [Math.cos(d2r(p.phi)), Math.sin(d2r(p.phi)), 0];
      const tn = [-tdir[1], tdir[0], 0];
      const t0 = V.add(C, V.mul(tn, p.off));
      // wierzchołek najdalszy od t
      let i0 = 0;
      base.forEach((q, i) => {
        if (V.dot(V.sub(q, t0), tn) < V.dot(V.sub(base[i0], t0), tn)) i0 = i;
      });
      const order = [];
      for (let k = 0; k < n; k++) order.push((i0 + k) % n);
      const latDir = (i) => (isPrism ? [0, 0, 1] : V.norm(V.sub(apex, base[i])));
      const latLen = (i) => (isPrism ? H : V.dist(apex, base[i]));
      const hP = Math.min(p.hP, H - 2);
      const P0 = isPrism ? V.add(base[i0], [0, 0, hP]) : V.lerp(base[i0], apex, hP / H);
      const cut = G.plane3(t0, V.add(t0, tdir), P0);
      const nm = (k) => 'P_' + (k + 1);
      const vn = (i) => 'V_' + (i + 1);
      // obrys / mapowanie widoku poziomego (po prawej)
      const all2 = [];
      solid.verts.forEach((P) => all2.push(M(P)));
      const ox = Math.max(...all2.map((q) => q[0])) + 40 - (C[0] - R - 15);
      const oy = -C[1] - 10;
      const TV = (P) => [ox + P[0], oy + P[1]];
      // rysunek bryły w aksonometrii
      B.step({
        title: 'Dane: bryła, ślad t i punkt P',
        co: (isPrism ? 'Graniastosłup prosty' : 'Ostrosłup prosty') + ' o podstawie ' + ['', '', '', '', 'czworokątnej', 'pięciokątnej', 'sześciokątnej'][n] + ' (' + ax.n.toLowerCase() + '). Płaszczyzna tnąca dana śladem <b>t</b> na płaszczyźnie podstawy i punktem <b>P</b> na krawędzi przez ' + h(vn(i0)) + '.',
        jak: 'Ślad t to prosta, w której płaszczyzna tnąca przecina płaszczyznę podstawy. Leży poza podstawą, więc przekrój nie przecina podstawy.',
        why: 'Płaszczyznę wyznaczają prosta i punkt poza nią – t i P jednoznacznie określają przekrój.',
        cam: { dir: ax.dir },
      });
      B.a3({ t: 'poly', id: 'ground', pts: [V.add(C, [-80, -80, 0]), V.add(C, [90, -80, 0]), V.add(C, [90, 100, 0]), V.add(C, [-80, 100, 0])], col: '#7fa8d8', op: 0.1, edge: true, noFit: true });
      B.info('ground', 'Płaszczyzna podstawy (π<sub>1</sub>)');
      solid.faces.forEach((f, i) => B.a3({ t: 'poly', id: 'sf' + i, pts: f, col: '#e8c060', op: 0.3 }));
      solid.edges.forEach((e, i) => {
        e.id = 'se' + i;
        B.a3({ t: 'seg', id: e.id, a: e.a, b: e.b, s: 'proj' });
        B.a2({ t: 'seg', id: e.id, a: M(e.a), b: M(e.b), s: 'given' });
      });
      base.forEach((q, i) => {
        B.a3({ t: 'pt', id: 'v' + i, p: q, s: 'given', small: true, label: vn(i) });
        B.a2({ t: 'pt', id: 'v' + i, p: M(q), s: 'given', label: vn(i), r: 2.2 });
        B.info('v' + i, 'Wierzchołek podstawy ' + h(vn(i)));
      });
      if (!isPrism) {
        B.a3({ t: 'pt', id: 'apex', p: apex, s: 'given', label: 'W' });
        B.a2({ t: 'pt', id: 'apex', p: M(apex), s: 'given', label: 'W' });
        B.info('apex', 'Wierzchołek ostrosłupa W – środek kolineacji');
      }
      const tA = V.add(t0, V.mul(tdir, -R * 2.2)),
        tB = V.add(t0, V.mul(tdir, R * 2.2));
      B.a3({ t: 'seg', id: 't', a: tA, b: tB, s: 'res2', label: 't', labelAt: 0.95 });
      B.a2({ t: 'seg', id: 't', a: M(tA), b: M(tB), s: 'res2', label: 't', labelAt: 0.97 });
      B.info('t', 'Ślad t płaszczyzny tnącej na płaszczyźnie podstawy – oś powinowactwa / kolineacji');
      const Ps = [P0];
      B.a3({ t: 'pt', id: 'P0', p: P0, s: 'res', label: nm(0) });
      B.a2({ t: 'pt', id: 'P0', p: M(P0), s: 'res', label: nm(0) });
      B.info('P0', 'Punkt ' + h(nm(0)) + ' przekroju (dany)');
      B.step({
        title: isPrism ? 'Idea: powinowactwo osiowe' : 'Idea: kolineacja środkowa',
        co: 'Podstawa i przekrój to figury ' + (isPrism ? '<b>powinowate</b>: oś = t, kierunek = krawędzie boczne' : '<b>kolinearne</b>: oś = t, środek = wierzchołek W') + '.',
        jak: 'Każdy bok podstawy i odpowiadający mu bok przekroju leżą w jednej ścianie bocznej; ta ściana przecina płaszczyznę podstawy wzdłuż boku podstawy, a płaszczyznę tnącą – wzdłuż boku przekroju. Oba boki muszą więc spotkać się na t.',
        why: 'Trzy płaszczyzny (ściana, podstawa, płaszczyzna tnąca) mają jeden punkt wspólny – leży on na t = podstawa ∩ płaszczyzna tnąca. Stąd reguła: <b>odpowiadające sobie proste przecinają się na osi</b>.',
        cam: 'iso',
      });
      const T = [];
      let ok = true;
      for (let k = 1; k <= n; k++) {
        const ia = order[k - 1],
          ib = order[k % n];
        const Pa = Ps[k - 1];
        const r = G.line2([base[ia][0], base[ia][1]], [base[ib][0], base[ib][1]], [t0[0], t0[1]], [t0[0] + tdir[0], t0[1] + tdir[1]]);
        const lastStep = k === n;
        let Pb;
        const rr = G.segPlane(base[ib], V.add(base[ib], V.mul(latDir(ib), latLen(ib))), cut);
        Pb = rr ? rr.p : null;
        if (!Pb) {
          ok = false;
          break;
        }
        const inEdge = rr.t >= -1e-6 && rr.t <= 1 + 1e-6;
        const Tk = r ? [r.p[0], r.p[1], 0] : null;
        B.step({
          title: lastStep ? 'Kontrola: powrót do ' + nm(0).replace('_', '') : 'Punkt ' + nm(k).replace('_', '') + ' na krawędzi przez ' + vn(ib).replace('_', ''),
          co: lastStep
            ? 'Ostatnia ściana: prosta przez ' + h(nm(k - 1)) + ' i ślad T<sub>' + k + '</sub> musi przejść przez ' + h(nm(0)) + ' – <b>kontrola dokładności</b>.'
            : 'Kolejny wierzchołek przekroju <b>' + h(nm(k)) + '</b>.',
          jak: Tk
            ? '<ol><li>Przedłużamy bok podstawy ' + h(vn(ia)) + h(vn(ib)) + ' do przecięcia ze śladem t → <b>T<sub>' + k + '</sub></b>.</li><li>Prosta T<sub>' + k + '</sub>' + h(nm(k - 1)) + ' (w ścianie bocznej) przecina krawędź przez ' + h(vn(ib)) + ' w ' + h(lastStep ? nm(0) : nm(k)) + '.</li></ol>'
            : 'Bok ' + h(vn(ia)) + h(vn(ib)) + ' jest równoległy do t (punkt T w nieskończoności) → bok przekroju ∥ t: przez ' + h(nm(k - 1)) + ' prowadzimy równoległą do t.',
          why: 'Bok podstawy i bok przekroju leżą w tej samej ścianie i spotykają się na osi t (lub są do niej równoległe razem z bokiem podstawy).' + (inEdge ? '' : ' <b>Uwaga:</b> punkt wypadł poza krawędź – przekrój przecina tu podstawę górną (zmniejsz wysokość P lub odsuń ślad).'),
          cam: 'iso',
        });
        const sid = 'st' + k;
        if (Tk) {
          const farB = V.dist(base[ia], Tk) > V.dist(base[ib], Tk) ? base[ib] : base[ia];
          B.a3({ t: 'seg', id: sid + 'e', a: farB, b: Tk, s: 'thin' });
          B.a2({ t: 'seg', id: sid + 'e', a: M(farB), b: M(Tk), s: 'thin' });
          B.a3({ t: 'pt', id: sid + 'T', p: Tk, s: 'aux', label: 'T_' + k });
          B.a2({ t: 'pt', id: sid + 'T', p: M(Tk), s: 'aux', label: 'T_' + k });
          B.info(sid + 'T', 'T<sub>' + k + '</sub> = (przedłużony bok ' + h(vn(ia)) + h(vn(ib)) + ') ∩ t');
          const far = V.dist(Tk, Pa) > V.dist(Tk, Pb) ? Pa : Pb;
          B.a3({ t: 'seg', id: sid + 'l', a: Tk, b: far, s: 'aux' });
          B.a2({ t: 'seg', id: sid + 'l', a: M(Tk), b: M(far), s: 'aux' });
        } else {
          B.a3({ t: 'seg', id: sid + 'l', a: Pa, b: Pb, s: 'aux' });
          B.a2({ t: 'seg', id: sid + 'l', a: M(Pa), b: M(Pb), s: 'aux' });
        }
        B.info(sid + 'l', 'Prosta przecięcia płaszczyzny tnącej ze ścianą ' + h(vn(ia)) + h(vn(ib)) + (isPrism ? h(vn(ib)) + "'" : 'W'));
        B.src('v' + ia, 'v' + ib, k === 1 ? 'P0' : 'P' + (k - 1), 't');
        if (!lastStep) {
          Ps.push(Pb);
          B.a3({ t: 'pt', id: 'P' + k, p: Pb, s: 'res', label: nm(k) });
          B.a2({ t: 'pt', id: 'P' + k, p: M(Pb), s: 'res', label: nm(k) });
          B.info('P' + k, 'Wierzchołek przekroju ' + h(nm(k)));
          B.a3({ t: 'seg', id: 'sec' + k, a: Pa, b: Pb, s: 'res' });
        } else {
          B.a3({ t: 'seg', id: 'sec' + k, a: Pa, b: P0, s: 'res' });
          B.src('P0');
        }
      }
      if (!ok) return;
      // widoczność i przekrój w aksonometrii
      const lower = solid.clip({ n: cut.n[2] > 0 ? cut.n : V.mul(cut.n, -1), d: cut.n[2] > 0 ? cut.d : -cut.d });
      const sec = solid.section(cut);
      B.step({
        title: 'Przekrój, część odcięta i widoczność',
        co: 'Wielokąt przekroju (kreskowany), dolna część bryły z widocznością; część odcięta – cienko.',
        jak: 'Widoczność krawędzi części dolnej ustalamy względem kierunku rzutowania aksonometrii. Bok przekroju jest widoczny, jeśli widoczna jest ściana, w której leży (i sam przekrój nie jest odwrócony tyłem).',
        why: 'Przekrój jest ścianą nowej bryły (części dolnej), więc podlega tym samym zasadom widoczności co pozostałe ściany.',
        cam: { dir: ax.dir },
      });
      B.endWhere((q) => /^se\d+$/.test(q.id) && B.p2.indexOf(q) >= 0);
      B.endWhere((q) => /^st\d+[el]$/.test(q.id));
      solid.edges.forEach((e) => B.a2({ t: 'seg', id: e.id, a: M(e.a), b: M(e.b), s: 'thin' }));
      const pcs = G.hlr(
        lower.edges.map((e) => ({ a: e.a, b: e.b })),
        lower.faces.map((f, i) => ({ pts: f, pl: lower.planes[i] })),
        { dir: ax.dir }
      );
      pcs.forEach((pc) => B.a2({ t: 'seg', id: 'low', a: M(pc.a), b: M(pc.b), s: pc.st === 'vis' ? 'vis' : 'hid' }));
      B.info('low', 'Krawędź części dolnej (po odcięciu)');
      const sec2 = sec.map(M);
      B.a2({ t: 'hatch', id: 'secA', pts: sec2, s: 'hatch', step: 5 });
      B.a2({ t: 'pl', id: 'secA', pts: sec2, closed: true, s: 'res' });
      B.a3({ t: 'poly', id: 'secA', pts: sec, col: '#d01818', op: 0.45 });
      B.info('secA', 'Przekrój bryły płaszczyzną (figura powinowata/kolinearna z podstawą)');
      // ---------- kład ----------
      B.step({
        title: 'Rzut poziomy i ślad t′ (przygotowanie kładu)',
        co: 'Obok rysujemy <b>rzut poziomy</b> bryły (rzeczywisty kształt podstawy), ślad t′ i rzuty P<sub>i</sub>′ wierzchołków przekroju.',
        jak: 'W rzucie poziomym wierzchołki przekroju leżą na rzutach krawędzi bocznych: ' + (isPrism ? 'pokrywają się z wierzchołkami podstawy (krawędzie pionowe).' : 'na odcinkach V<sub>i</sub>′W′.') + ' Ich wysokości z<sub>i</sub> odczytujemy z aksonometrii (oś z, skrót ' + ax.sc[2] + ').',
        why: 'Kład wykonujemy w rzucie, w którym płaszczyzna podstawy jest w rzeczywistej wielkości – czyli w rzucie poziomym (płaszczyzna podstawy ∥ π<sub>1</sub>).',
        cam: { dir: [0.001, 0.001, 1], up: [0, -1, 0] },
      });
      const bT = base.map(TV);
      B.a2({ t: 'pl', id: 'tbase', pts: bT, closed: true, s: 'given' });
      if (!isPrism) base.forEach((q) => B.a2({ t: 'seg', id: 'tbase', a: TV(q), b: TV(apex), s: 'given' }));
      B.info('tbase', 'Rzut poziomy bryły');
      B.a2({ t: 'seg', id: 't', a: TV(tA), b: TV(tB), s: 'res2', label: "t'", labelAt: 0.97 });
      Ps.forEach((P, k) => B.a2({ t: 'pt', id: 'P' + (k ? k : 0), p: TV(P), s: 'res', label: nm(k) + "'" }));
      B.a2({ t: 'text', id: 'tvlab', p: [ox + C[0], oy + C[1] - R - 14], txt: 'rzut poziomy (π₁) – kład', s: 'note' });
      // obrót kładu
      const sideBase = V.dot(V.sub(C, t0), tn) > 0 ? 1 : -1;
      const nOut = V.mul(tn, -sideBase);
      const kl = Ps.map((P) => {
        const F = G.footOnLine(P, t0, tdir);
        const Fh = [F[0], F[1], 0];
        const d = V.dist(P, Fh);
        return { P, F: Fh, d, K: V.add(Fh, V.mul(nOut, d)), dh: V.dist([P[0], P[1], 0], Fh) };
      });
      // kąt obrotu kładu w 3D
      let kAng = 0;
      {
        const test = (a) => G.rotAbout(Ps[0], t0, tdir, a);
        let best = 1e9;
        for (let a = -Math.PI; a <= Math.PI; a += 0.0005) {
          const Q = test(a);
          const e = Math.abs(Q[2]) + V.dist([Q[0], Q[1], 0], kl[0].K);
          if (e < best) {
            best = e;
            kAng = a;
          }
        }
      }
      B.data = { sec: Ps, t0, tdir, kAng };
      B.step({
        title: 'Kład punktów: trójkąty różnicowe',
        co: 'Dla każdego wierzchołka wyznaczamy jego położenie po obrocie wokół t: punkt <b>(P<sub>i</sub>)</b>.',
        jak: '<ol><li>Z P<sub>i</sub>′ prowadzimy prostopadłą do t′ – stopa F<sub>i</sub> (droga obrotu w rzucie).</li><li>W P<sub>i</sub>′ odkładamy prostopadle wysokość z<sub>i</sub> → trójkąt prostokątny; przeciwprostokątna = rzeczywista odległość |F<sub>i</sub>P<sub>i</sub>| (promień obrotu).</li><li>Cyrklem z F<sub>i</sub> przenosimy ją na prostopadłą po drugiej stronie t′ → (P<sub>i</sub>).</li></ol>',
        why: 'Punkt obraca się po okręgu w płaszczyźnie ⟂ t; środek obrotu F<sub>i</sub> leży na t. Rzut drogi obrotu jest prostopadły do t′, a promień obrotu to przeciwprostokątna trójkąta o przyprostokątnych: odległość rzutu od t′ i wysokość punktu.',
        klad: true,
        cam: { dir: [0.6, 0.9, 0.7] },
      });
      kl.forEach((q, k) => {
        const id = 'kl' + k;
        const Pp = TV(q.P),
          Ft = TV(q.F),
          Kt = TV(q.K);
        const along = V.norm(V.sub(Pp, Ft));
        const perp = V.perp2(along);
        const Z = V.add(Pp, V.mul(perp, q.P[2]));
        B.a2({ t: 'seg', id, a: Pp, b: Kt, s: 'thin' });
        B.a2({ t: 'seg', id, a: Pp, b: Z, s: 'dist' });
        B.a2({ t: 'seg', id, a: Ft, b: Z, s: 'aux' });
        const a0 = Math.atan2(Z[1] - Ft[1], Z[0] - Ft[0]),
          a1raw = Math.atan2(Kt[1] - Ft[1], Kt[0] - Ft[0]);
        let a1 = a1raw;
        while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
        while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
        B.a2({ t: 'arc', id, c: Ft, r: V.dist(Ft, Z), a0, a1, s: 'aux' });
        B.a2({ t: 'pt', id, p: Ft, s: 'thin', r: 1.8 });
        B.a2({ t: 'pt', id: 'K' + k, p: Kt, s: 'res', label: '(' + nm(k) + ')' });
        B.info(id, 'Kład punktu ' + h(nm(k)) + ': |F' + (k + 1) + 'P' + (k + 1) + '′| = ' + G.f1(q.dh) + ', z = ' + G.f1(q.P[2]) + ' → promień obrotu ' + G.f1(q.d));
        B.info('K' + k, '(' + h(nm(k)) + ') – kład wierzchołka przekroju');
        B.link('K' + k, ['P' + (k ? k : 0), id]);
      });
      B.step({
        title: 'Kład przekroju – rzeczywista wielkość',
        co: 'Wielokąt <b>(P<sub>1</sub>)(P<sub>2</sub>)…</b> to przekrój w rzeczywistej wielkości.',
        jak: 'Kontrola: boki kładu i odpowiadające im boki rzutu P<sub>i</sub>′P<sub>j</sub>′ przecinają się na t′ (powinowactwo kładu!). Przesuń suwak „obrót kładu”, by zobaczyć obrót w 3D.',
        why: 'Obrót jest izometrią – po położeniu płaszczyzny przekroju na płaszczyźnie podstawy (∥ π<sub>1</sub>) jej rzut poziomy pokazuje figurę bez zniekształceń.',
        klad: true,
        cam: { dir: [0.4, 0.5, 1] },
      });
      const K2 = kl.map((q) => TV(q.K));
      B.a2({ t: 'poly', id: 'klad', pts: K2, fill: '#d01818', op: 0.14 });
      B.a2({ t: 'pl', id: 'klad', pts: K2, closed: true, s: 'res' });
      B.a2({ t: 'pl', id: 'secT', pts: Ps.map(TV), closed: true, s: 'aux2' });
      B.info('klad', 'Kład przekroju – rzeczywista wielkość. Obwód: ' + G.f1(kl.reduce((s, q, i) => s + V.dist(q.K, kl[(i + 1) % kl.length].K), 0)));
      B.info('secT', 'Rzut poziomy przekroju P<sub>1</sub>′P<sub>2</sub>′… (zniekształcony)');
      B.src('t');
    },
  });
})();
