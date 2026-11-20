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
    } else if (type === 'woj') {
      ex = [Math.cos(d2r(45)), -Math.sin(d2r(45))];
      ey = [-Math.cos(d2r(45)), -Math.sin(d2r(45))];
      ez = [0, 1];
      sc = [1, 1, 1];
      n = 'Perspektywa wojskowa (planometria)';
      angs = [45, 45];
      orto = false;
    } else {
      ex = [1, 0];
      ey = [-Math.cos(d2r(45)), -Math.sin(d2r(45))];
      ez = [0, 1];
      sc = [1, 0.5, 1];
      n = 'Perspektywa kawalerska (dimetria ukośna)';
      angs = [0, 45];
      orto = false;
    }
    const E = [V.mul(ex, sc[0]), V.mul(ey, sc[1]), V.mul(ez, sc[2])];
    const p = [E[0][0], E[1][0], E[2][0]],
      q = [E[0][1], E[1][1], E[2][1]];
    let d = V.norm(V.cross(p, q));
    if (orto || type === 'woj' ? d[2] < 0 : d[1] < 0) d = V.mul(d, -1);
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
      ['dimu', 'Perspektywa kawalerska (dimetria ukośna)'],
      ['woj', 'Perspektywa wojskowa'],
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
    dims(c) {
      const d = c.data;
      if (!d.ax || !d.abc) return [];
      const M = d.ax.map,
        [a, b, cc] = d.abc,
        C = M([a / 2, b / 2, cc / 2]);
      return [GW.dimOut(M([0, b, 0]), M([a, b, 0]), C, 8, String(a), 'dima'), GW.dimOut(M([a, b, 0]), M([a, 0, 0]), C, 8, String(b), 'dimb'), GW.dimOut(M([0, b, 0]), M([0, b, cc]), C, 8, String(cc), 'dimc')];
    },
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
      '<li><b>Perspektywa kawalerska</b> (dimetria ukośna): x poziomo, z pionowo (rzeczywista wielkość – rzutnia ∥ ściany czołowej), y pod 45°, skrót ½.</li>' + '<li><b>Perspektywa wojskowa</b>: rzutnia pozioma – rzut z góry w prawdziwej wielkości obrócony o 45°, wysokości pionowo bez skrótu.</li>' +
      '<li><b>Procedura rysowania</b>: osie → prostopadłościan opisany (wymiary × skróty) → odcięcie części → widoczność. Długości mierzymy <u>tylko wzdłuż osi</u> (lub równolegle do nich) – odcinki ukośne nie mają stałego skrótu!</li></ol>',
    build(p, B) {
      const ax = axon(p.ax);
      const blk = lBlock(p.a, p.b, p.c, Math.min(p.a2, p.a - 5), Math.min(p.c2, p.c - 5));
      const center = [p.a / 2, p.b / 2, p.c / 2];
      const size = Math.max(p.a, p.b, p.c);
      B.data = { ax, verts: blk.verts, edges: blk.edges, center, size, abc: [p.a, p.b, p.c] };
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

  /* =================================================================
     4.3 Lista 4: bryła (sześcian lub bryła opisana na sześcianie) cięta
         płaszczyzną ABC – część pod płaszczyzną, metoda śladów
     ================================================================= */
  const AA = 60;
  const bx = G.box;
  const L4 = {
    a: { parts: () => [bx(0, AA, 0, AA, 0, AA)], A: [17, 0, 60, [0, 0, 60], [60, 0, 60]], B: [60, 33, 60, [60, 0, 60], [60, 60, 60]], C: [21, 60, 0, [0, 60, 0], [60, 60, 0]], d: 'sześcian' },
    b: { parts: () => [bx(0, AA, 0, AA, 0, AA)], A: [13, 0, 60, [0, 0, 60], [60, 0, 60]], B: [60, 60, 15.5, [60, 60, 0], [60, 60, 60]], C: [0, 29, 0, [0, 0, 0], [0, 60, 0]], d: 'sześcian' },
    c: { parts: () => [bx(0, AA, 0, AA, 0, AA)], A: [33, 60, 60, [0, 60, 60], [60, 60, 60]], B: [60, 34, 60, [60, 0, 60], [60, 60, 60]], C: [0, 29, 0, [0, 0, 0], [0, 60, 0]], d: 'sześcian' },
    d: { parts: () => [bx(0, 20, 0, 60, 0, 60), bx(40, 60, 0, 60, 0, 60), bx(20, 40, 0, 30, 0, 60)], A: [0, 32, 60, [0, 0, 60], [0, 60, 60]], B: [29, 0, 60, [0, 0, 60], [60, 0, 60]], C: [40, 60, 0, [40, 60, 0], [60, 60, 0]], d: 'sześcian z pionowym wpustem od przodu' },
    e: { parts: () => [bx(0, 60, 0, 60, 0, 20), bx(0, 60, 0, 40, 20, 40), bx(0, 60, 0, 20, 40, 60)], A: [0, 20, 60, [0, 0, 60], [0, 20, 60]], B: [60, 0, 0, [60, 0, 0], [60, 0, 60]], C: [30, 60, 0, [0, 60, 0], [60, 60, 0]], d: 'schodki (trzy stopnie)' },
    f: {
      parts: () => [bx(0, 20, 0, 60, 0, 60), G.prismX([[60, 0], [0, 0], [0, 60], [30, 60]], 20, 40), G.prismX([[60, 0], [0, 0], [0, 60]], 40, 60)],
      A: [0, 0, 60, [0, 0, 0], [0, 0, 60]],
      B: [60, 0, 30, [60, 0, 0], [60, 0, 60]],
      C: [20, 60, 30, [20, 60, 0], [20, 60, 60]],
      d: 'bryła z dwoma skośnymi ścięciami',
    },
    g: {
      parts: () => [G.prismY([[0, 0], [60, 0], [30, 30], [0, 30]], 30, 60), bx(0, 30, 0, 30, 0, 60), G.prismX([[0, 0], [30, 0], [30, 30], [0, 60]], 30, 60)],
      A: [0, 60, 60, [0, 60, 0], [0, 60, 60]],
      B: [44, 0, 60, [0, 0, 60], [60, 0, 60]],
      C: [60, 46.5, 0, [60, 0, 0], [60, 60, 0]],
      d: 'bryła ze ściętym narożem i skośnymi ścianami',
    },
    h: {
      parts: () => [G.prismY([[0, 0], [30, 0], [30, 30], [0, 60]], 0, 60), G.prismX([[0, 0], [60, 0], [0, 30]], 30, 60)],
      A: [0, 0, 60, [0, 0, 0], [0, 0, 60]],
      B: [44, 0, 30, [30, 0, 30], [60, 0, 30]],
      C: [16, 60, 0, [0, 60, 0], [60, 60, 0]],
      d: 'bryła z dachem jednospadowym i klinem',
    },
    i: { parts: () => [bx(0, 30, 0, 60, 0, 60), G.prismX([[0, 0], [0, 60], [60, 30]], 30, 60)], A: [60, 45, 60, [60, 0, 60], [60, 60, 60]], B: [60, 0, 14, [60, 0, 0], [60, 0, 60]], C: [0, 60, 29, [0, 60, 0], [0, 60, 60]], d: 'prostopadłościan + klin trójkątny' },
    j: {
      parts: () => [
        G.pyramid(
          [
            [0, 0, 0],
            [60, 0, 0],
            [60, 60, 0],
            [0, 60, 0],
          ],
          [30, 30, 60]
        ),
      ],
      A: [12.5, 0, 60, [0, 0, 60], [60, 0, 60]],
      B: [60, 35, 60, [60, 0, 60], [60, 60, 60]],
      C: [0, 60, 14, [0, 60, 0], [0, 60, 60]],
      d: 'ostrosłup wpisany w sześcian',
    },
  };
  const cubeEdges = (() => {
    const c = (i, j, k) => [i * AA, j * AA, k * AA];
    const E = [];
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++) {
        E.push([c(0, a, b), c(1, a, b)], [c(a, 0, b), c(a, 1, b)], [c(a, b, 0), c(a, b, 1)]);
      }
    return E;
  })();
  const faceName = (n, d) => {
    const ax = [Math.abs(n[0]), Math.abs(n[1]), Math.abs(n[2])];
    if (ax[0] > 0.999) return 'płaszczyzna ściany bocznej x = ' + G.f0(d / n[0]);
    if (ax[1] > 0.999) return 'płaszczyzna ściany ' + (d / n[1] > 30 ? 'przedniej' : d / n[1] < 30 ? 'tylnej / wewnętrznej' : '') + ' y = ' + G.f0(d / n[1]);
    if (ax[2] > 0.999) return 'płaszczyzna ' + (d / n[2] > 0.5 ? 'poziomej ściany z = ' + G.f0(d / n[2]) : 'podstawy z = 0');
    return 'płaszczyzna ściany skośnej';
  };

  GW.addLesson({
    id: 'm4-lista',
    mod: 4,
    lista: 'L4 Z1',
    title: '4.3 Przekrój bryły płaszczyzną ABC (Lista 4, a–j)',
    v2title: 'Aksonometria – część bryły pod płaszczyzną ABC',
    opts: [
      {
        k: 'set',
        l: 'Bryła (zad. 1)',
        choices: 'abcdefghij'.split('').map((c) => [c, '📋 Lista 4 · zad. 1' + c + ') – ' + L4[c].d]),
        v: 'a',
        rebuildFrame: true,
      },
      Object.assign({}, AXOPT, { v: 'dimu' }),
      {
        k: 'keep',
        l: 'Zostawiamy',
        choices: [
          ['below', 'część pod płaszczyzną (jak w treści)'],
          ['above', 'część nad płaszczyzną'],
        ],
        v: 'below',
      },
    ],
    params: [
      { k: 'dA', l: 'przesuń A po krawędzi', min: -0.25, max: 0.25, step: 0.01, v: 0 },
      { k: 'dB', l: 'przesuń B po krawędzi', min: -0.25, max: 0.25, step: 0.01, v: 0 },
      { k: 'dC', l: 'przesuń C po krawędzi', min: -0.25, max: 0.25, step: 0.01, v: 0 },
    ],
    dims(c) {
      const ax = c.data.ax;
      if (!ax) return [];
      const M = ax.map,
        C = M([30, 30, 30]);
      return [
        GW.dimOut(M([0, 60, 0]), M([60, 60, 0]), C, 8, '60', 'dimx'),
        GW.dimOut(M([60, 60, 0]), M([60, 0, 0]), C, 8, '60', 'dimy'),
        GW.dimOut(M([0, 60, 0]), M([0, 60, 60]), C, 8, '60', 'dimz'),
      ];
    },
    mistakes: ['Boki przekroju leżące na <b>ścianach równoległych</b> muszą być równoległe – to najszybsza kontrola.', 'Punkt śladowy (przecięcie boku przekroju z <i>przedłużeniem</i> krawędzi) może leżeć poza bryłą – to normalne, służy tylko do dalszej konstrukcji.', 'Grubo rysujemy tylko część pod płaszczyzną; część odciętą najwyżej cienko.'],
    algo:
      '<ol><li><b>Punkty dane</b> A, B, C leżą na krawędziach. Dwa punkty leżące w tej samej ścianie łączymy – to bok przekroju.</li>' +
      '<li><b>Punkty śladowe</b>: prostą boku przekroju przedłużamy do przecięcia z prostymi krawędzi tej samej ściany (także przedłużonymi). Punkt przecięcia leży też w płaszczyźnie <i>sąsiedniej</i> ściany – mamy w niej kolejny punkt.</li>' +
      '<li><b>Ściany równoległe</b> przecinamy wzdłuż prostych równoległych – wystarczy jeden punkt i kierunek.</li>' +
      '<li>Powtarzamy, aż obiegniemy wszystkie ściany przecięte płaszczyzną; wielokąt przekroju musi się zamknąć (kontrola).</li>' +
      '<li><b>Wynik</b>: część pod płaszczyzną grubo (widoczne) i kreskowo cienko (niewidoczne), przekrój zakreskowany.</li></ol>',
    build(p, B) {
      const ax = axon(p.ax);
      const M = ax.map;
      const D = p.set === 'gen' && p.gen ? { parts: () => p.gen.parts.map((s) => GW.specPoly(s)), A: p.gen.A, B: p.gen.B, C: p.gen.C, d: p.gen.d } : L4[p.set] || L4.a;
      const U = new G.Union(D.parts());
      const pt = (q, dt) => {
        const [x, y, z, e0, e1] = q;
        const L = V.dist(e0, e1);
        const t0 = V.dist(e0, [x, y, z]) / L;
        return V.lerp(e0, e1, Math.max(0, Math.min(1, t0 + dt)));
      };
      const A = pt(D.A, p.dA),
        Bq = pt(D.B, p.dB),
        C = pt(D.C, p.dC);
      let cut = G.plane3(A, Bq, C);
      if (cut.n[2] < 0) cut = { n: V.mul(cut.n, -1), d: -cut.d };
      const keepPl = p.keep === 'above' ? { n: V.mul(cut.n, -1), d: -cut.d } : cut;
      const creases = U.creaseEdges();
      B.data = { ax, center: [30, 30, 30] };
      B.step({
        title: 'Dane: ' + D.d + ', punkty A, B, C',
        co: 'Bryła (' + D.d + ') w ' + ax.n.toLowerCase() + '. Punkty <b>A, B, C</b> leżą na krawędziach i wyznaczają płaszczyznę cięcia. Szukamy części bryły ' + (p.keep === 'above' ? 'nad' : 'pod') + ' płaszczyzną.',
        jak: 'Cienkie linie to sześcian opisany (pomocniczy). Najedź na punkt – zobaczysz, na której krawędzi leży.',
        why: 'Płaszczyznę wyznaczają trzy niewspółliniowe punkty. Przekrój to wielokąt, którego boki leżą na ścianach bryły – każdy bok to przecięcie płaszczyzny cięcia z płaszczyzną jednej ściany.',
        cam: { dir: ax.dir },
      });
      cubeEdges.forEach((e, i) => {
        B.a2({ t: 'seg', id: 'cube', a: M(e[0]), b: M(e[1]), s: 'thin' });
        B.a3({ t: 'seg', id: 'cube', a: e[0], b: e[1], s: 'thin' });
      });
      B.info('cube', 'Sześcian opisany na bryle (pomocniczy, a = 60)');
      U.parts.forEach((pp) => pp.faces.forEach((f) => B.a3({ t: 'poly', id: 'solid', pts: f, col: '#e8c060', op: 0.3 })));
      B.info('solid', 'Bryła: ' + D.d);
      creases.forEach((e) => {
        B.a2({ t: 'seg', id: 'edge', a: M(e.a), b: M(e.b), s: 'given' });
        B.a3({ t: 'seg', id: 'edge', a: e.a, b: e.b, s: 'proj' });
      });
      B.info('edge', 'Krawędź bryły');
      [
        ['A', A, D.A],
        ['B', Bq, D.B],
        ['C', C, D.C],
      ].forEach(([n, P, q]) => {
        B.a2({ t: 'pt', id: 'g' + n, p: M(P), s: 'res', label: n });
        B.a3({ t: 'pt', id: 'g' + n, p: P, s: 'res', label: n });
        B.info('g' + n, 'Punkt ' + n + ' – dany, leży na krawędzi (' + q[3].join(',') + ')–(' + q[4].join(',') + ')');
      });
      /* ---------- metoda śladów: BFS po płaszczyznach ścian ---------- */
      const lines = creases.map((e) => ({ a: e.a, b: e.b, real: true })).concat(cubeEdges.map((e) => ({ a: e[0], b: e[1], real: false })));
      const planes = [];
      const addPlane = (pl, cubeOk) => {
        let n = pl.n,
          d = pl.d;
        if (n[0] + n[1] * 1e-3 + n[2] * 1e-6 < 0) {
          n = V.mul(n, -1);
          d = -d;
        }
        if (planes.some((q) => V.dist(q.n, n) < 1e-6 && Math.abs(q.d - d) < 1e-6)) return;
        const L = lines.filter((l) => Math.abs(V.dot(n, l.a) - d) < 1e-6 && Math.abs(V.dot(n, l.b) - d) < 1e-6);
        if (L.length >= 2 && (cubeOk || L.some((l) => l.real))) planes.push({ n, d, L, done: false, axis: [0, 1, 2].findIndex((i) => Math.abs(n[i]) > 0.999) });
      };
      U.parts.forEach((pp) => pp.planes.forEach((q) => addPlane(q, false)));
      [0, 1, 2].forEach((i) =>
        [0, AA].forEach((v) => {
          const n = [0, 0, 0];
          n[i] = 1;
          addPlane({ n, d: v }, true);
        })
      );
      const K = [
        { p: A, n: 'A', real: true },
        { p: Bq, n: 'B', real: true },
        { p: C, n: 'C', real: true },
      ];
      const known = (P) => K.find((q) => V.dist(q.p, P) < 1e-5);
      let num = 1,
        sl = 1;
      const tol = 1e-5;
      const segLineX = (P, d, l) => {
        const e = V.sub(l.b, l.a);
        const w = V.sub(l.a, P);
        const c1 = V.cross(d, e);
        const den = V.dot(c1, c1);
        if (den < 1e-12) return null;
        const t = V.dot(V.cross(w, e), c1) / den;
        const s = V.dot(V.cross(w, d), c1) / den;
        return { p: V.add(P, V.mul(d, t)), s, t };
      };
      let guard = 0;
      let traceNo = 0;
      const tryTrace = () => {
        // ślad prostej PQ (dwóch znanych punktów) na płaszczyźnie ściany, w której jest już inny znany punkt
        const cands = [];
        const R = K.filter((q) => q.real || /^[ABC]$/.test(q.n));
        for (let i = 0; i < R.length; i++)
          for (let j = i + 1; j < R.length; j++) {
            const P = R[i],
              Q = R[j];
            if (planes.some((g) => Math.abs(V.dot(g.n, P.p) - g.d) < tol && Math.abs(V.dot(g.n, Q.p) - g.d) < tol)) continue;
            planes.forEach((g) => {
              if (g.done || g.axis < 0) return;
              const on = K.filter((q) => Math.abs(V.dot(g.n, q.p) - g.d) < tol);
              if (!on.length) return;
              const r = G.segPlane(P.p, Q.p, g);
              if (!r || r.p.some((v) => v < -40 || v > 100) || known(r.p)) return;
              cands.push({ P, Q, g, T: r.p, score: (g.axis === 2 ? 2 : 1) + (P.real && Q.real ? 1 : 0) - V.dist(r.p, [30, 30, 30]) / 200 });
            });
          }
        if (!cands.length) return false;
        cands.sort((a, b) => b.score - a.score);
        const c = cands[0];
        const ax = c.g.axis,
          val = c.g.d / c.g.n[ax];
        const drop = (X) => {
          const Y = X.slice();
          Y[ax] = val;
          return Y;
        };
        const P1 = drop(c.P.p),
          Q1 = drop(c.Q.p);
        const T = c.T;
        const item = { p: T, real: false, n: 'T_' + ++traceNo };
        K.push(item);
        const sid = 'tt' + traceNo;
        const axN = ['x', 'y', 'z'][ax];
        B.step({
          title: 'Punkt śladowy prostej ' + c.P.n + c.Q.n + ' na ' + faceName(c.g.n, c.g.d).replace('płaszczyzna ', 'płaszczyźnie '),
          co: 'Żadna ściana nie zawiera dwóch znanych punktów – wyznaczamy <b>ślad prostej ' + h(c.P.n) + h(c.Q.n) + '</b> na ' + faceName(c.g.n, c.g.d) + ': punkt <b>' + h(item.n) + '</b>.',
          jak: '<ol><li>Rzutujemy ' + h(c.P.n) + ' i ' + h(c.Q.n) + ' na tę płaszczyznę wzdłuż osi ' + axN + ' (równolegle do krawędzi ⟂ ściany) → ' + h(c.P.n + "'") + ', ' + h(c.Q.n + "'") + '.</li><li>Prosta ' + h(c.P.n) + h(c.Q.n) + ' i jej rzut ' + h(c.P.n + "'") + h(c.Q.n + "'") + ' leżą w jednej płaszczyźnie rzutującej – przecinają się w punkcie śladowym ' + h(item.n) + '.</li><li>' + h(item.n) + ' leży w płaszczyźnie cięcia i w płaszczyźnie ściany – razem z innym punktem tej ściany wyznacza bok przekroju.</li></ol>',
          why: 'Prosta leżąca w płaszczyźnie cięcia przebija płaszczyznę ściany w punkcie, który należy do obu płaszczyzn – czyli do ich krawędzi przecięcia (śladu).',
          cam: { dir: ax === 2 ? [0.5, 0.6, 1] : ax === 1 ? [0.4, 1, 0.5] : [1, 0.5, 0.5] },
        });
        [
          [c.P.p, P1],
          [c.Q.p, Q1],
        ].forEach(([X, X1]) => {
          B.a2({ t: 'seg', id: sid + 'd', a: M(X), b: M(X1), s: 'thin' });
          B.a3({ t: 'seg', id: sid + 'd', a: X, b: X1, s: 'thin' });
          B.a2({ t: 'pt', id: sid + 'd', p: M(X1), s: 'aux2', r: 2 });
          B.a3({ t: 'pt', id: sid + 'd', p: X1, s: 'aux2', small: true });
        });
        const far = (A0, B0) => (V.dist(A0, T) > V.dist(B0, T) ? A0 : B0);
        B.a2({ t: 'seg', id: sid + 'l', a: M(far(c.P.p, c.Q.p)), b: M(T), s: 'aux2' });
        B.a3({ t: 'seg', id: sid + 'l', a: far(c.P.p, c.Q.p), b: T, s: 'aux2' });
        B.a2({ t: 'seg', id: sid + 'r', a: M(far(P1, Q1)), b: M(T), s: 'aux2', w: 0.8 });
        B.a3({ t: 'seg', id: sid + 'r', a: far(P1, Q1), b: T, s: 'aux2' });
        B.a2({ t: 'pt', id: 'k' + item.n, p: M(T), s: 'aux', label: item.n });
        B.a3({ t: 'pt', id: 'k' + item.n, p: T, s: 'aux', label: item.n });
        B.info('k' + item.n, 'Punkt śladowy ' + h(item.n) + ' prostej ' + h(c.P.n) + h(c.Q.n) + ' na ' + faceName(c.g.n, c.g.d));
        B.info(sid + 'd', 'Rzutowanie punktu na płaszczyznę ściany (wzdłuż osi ' + axN + ')');
        B.src('k' + c.P.n, 'g' + c.P.n, 'k' + c.Q.n, 'g' + c.Q.n);
        return true;
      };
      while (guard++ < 18) {
        let best = null;
        planes.forEach((g) => {
          if (g.done) return;
          const on = K.filter((q) => Math.abs(V.dot(g.n, q.p) - g.d) < tol);
          if (on.length >= 2) {
            const score = on.filter((q) => q.real).length * 2 + on.length;
            if (!best || score > best.score) best = { g, on, score, par: null };
          } else if (on.length === 1) {
            const pg = planes.find((q) => q.done && q.dir && V.dist(q.n, g.n) < 1e-6);
            if (pg && (!best || best.score < 1)) best = { g, on, score: 0.5, par: pg };
          }
        });
        if (!best) {
          if (traceNo < 3 && tryTrace()) continue;
          break;
        }
        const g = best.g;
        g.done = true;
        let P0, d;
        if (best.par) {
          P0 = best.on[0].p;
          d = best.par.dir;
        } else {
          let i0 = 0,
            j0 = 1,
            bd = -1;
          for (let i = 0; i < best.on.length; i++)
            for (let j = i + 1; j < best.on.length; j++) {
              const dd = V.dist(best.on[i].p, best.on[j].p);
              if (dd > bd) {
                bd = dd;
                i0 = i;
                j0 = j;
              }
            }
          P0 = best.on[i0].p;
          d = V.norm(V.sub(best.on[j0].p, P0));
        }
        g.dir = d;
        const newPts = [];
        g.L.forEach((l) => {
          const r = segLineX(P0, d, l);
          if (!r) return;
          if (r.p.some((v) => v < -45 || v > 105)) return;
          if (known(r.p)) return;
          const onSolidEdge = l.real && r.s >= -1e-6 && r.s <= 1 + 1e-6;
          const inPoly = U.contains(r.p, 1e-6) && Math.abs(G.sd(cut, r.p)) < 1e-6;
          const item = { p: r.p, real: onSolidEdge && inPoly, n: onSolidEdge && inPoly ? String(num++) : 'S_' + sl++, line: l };
          K.push(item);
          newPts.push(item);
        });
        const used = best.on.concat(newPts);
        const ts = used.map((q) => V.dot(V.sub(q.p, P0), d));
        const t0 = Math.min(...ts) - 6,
          t1 = Math.max(...ts) + 6;
        const la = V.add(P0, V.mul(d, t0)),
          lb = V.add(P0, V.mul(d, t1));
        const sid = 'tr' + guard;
        B.step({
          title: (best.par ? 'Równoległa w ' : 'Prosta w ') + faceName(g.n, g.d).replace('płaszczyzna ', 'płaszczyźnie '),
          co:
            (best.par ? 'Ta ściana jest równoległa do już przeciętej – bok przekroju jest <b>równoległy</b> do poprzedniego i przechodzi przez punkt ' + h(best.on[0].n) + '.' : 'Punkty ' + best.on.map((q) => '<b>' + h(q.n) + '</b>').join(', ') + ' leżą w ' + faceName(g.n, g.d) + ' → prowadzimy przez nie prostą.') +
            (newPts.length ? ' Nowe punkty: ' + newPts.map((q) => h(q.n) + (q.real ? '' : ' (śladowy)')).join(', ') + '.' : ''),
          jak: newPts.length ? 'Prostą przedłużamy do przecięcia z (przedłużonymi) krawędziami tej ściany. Punkt na krawędzi bryły = wierzchołek przekroju; punkt na przedłużeniu krawędzi = <b>punkt śladowy</b> – leży też w płaszczyźnie sąsiedniej ściany i posłuży do dalszej konstrukcji.' : 'Prosta przechodzi już przez znane punkty – to bok przekroju (kontrola).',
          why: 'Płaszczyzna cięcia i płaszczyzna ściany przecinają się wzdłuż prostej; każda prosta krawędzi tej ściany przecina tę prostą w punkcie wspólnym trzech płaszczyzn (cięcia, ściany i ściany sąsiedniej) – stąd przenoszenie punktów między ścianami.',
          cam: { dir: ax.dir },
        });
        B.a2({ t: 'seg', id: sid, a: M(la), b: M(lb), s: 'aux', noFit: true });
        B.a3({ t: 'seg', id: sid, a: la, b: lb, s: 'aux' });
        B.info(sid, 'Ślad płaszczyzny cięcia na ' + faceName(g.n, g.d));
        best.on.forEach((q) => B.src('k' + q.n, 'g' + q.n));
        newPts.forEach((q) => {
          const id = 'k' + q.n;
          if (!q.real) {
            const l = q.line;
            const far = V.dist(l.a, q.p) > V.dist(l.b, q.p) ? l.a : l.b;
            B.a2({ t: 'seg', id: id + 'e', a: M(far), b: M(q.p), s: 'thin', noFit: true });
            B.a3({ t: 'seg', id: id + 'e', a: far, b: q.p, s: 'thin' });
          }
          const far0 = q.p.some((v) => v < -12 || v > 72);
          B.a2({ t: 'pt', id, p: M(q.p), s: q.real ? 'res' : 'aux', label: q.n, r: q.real ? 3 : 2.4, noFit: far0 });
          B.a3({ t: 'pt', id, p: q.p, s: q.real ? 'res' : 'aux', label: q.n, small: !q.real });
          B.info(id, q.real ? 'Wierzchołek przekroju ' + h(q.n) + ' (na krawędzi bryły)' : 'Punkt śladowy ' + h(q.n) + ' – na przedłużeniu krawędzi (leży w dwóch płaszczyznach ścian)');
        });
      }
      /* ---------- pozostałe wierzchołki przekroju ---------- */
      const secs = U.sections(cut);
      const rest = [];
      creases.forEach((e) => {
        const r = G.segPlane(e.a, e.b, cut);
        if (!r || r.t < -1e-6 || r.t > 1 + 1e-6) return;
        if (!K.some((q) => V.dist(q.p, r.p) < 1e-4) && !rest.some((q) => V.dist(q, r.p) < 1e-4)) rest.push(r.p);
      });
      if (rest.length) {
        B.step({
          title: 'Pozostałe wierzchołki przekroju',
          co: 'Na krawędziach, do których nie doprowadziły nas proste w ścianach, wyznaczamy brakujące wierzchołki przekroju: ' + rest.map((q, i) => h(String(num + i))).join(', ') + '.',
          jak: 'Przez krawędź prowadzimy płaszczyznę pomocniczą (np. przekątną sześcianu opisanego, zawierającą tę krawędź), wyznaczamy jej krawędź przecięcia z płaszczyzną cięcia (dwa punkty śladowe na ścianach sześcianu) i przecinamy z krawędzią. Ten sam wynik daje przedłużanie boków przekroju w kolejnych ścianach.',
          why: 'Każdy wierzchołek przekroju to przebicie krawędzi bryły płaszczyzną cięcia – można go zawsze wyznaczyć metodą płaszczyzny pomocniczej zawierającej krawędź (jak przebicie prostej z płaszczyzną w rzutach Monge’a).',
          cam: { dir: ax.dir },
        });
        rest.forEach((q) => {
          const nm = String(num++);
          K.push({ p: q, real: true, n: nm });
          B.a2({ t: 'pt', id: 'k' + nm, p: M(q), s: 'res', label: nm });
          B.a3({ t: 'pt', id: 'k' + nm, p: q, s: 'res', label: nm });
          B.info('k' + nm, 'Wierzchołek przekroju ' + h(nm) + ' (przebicie krawędzi płaszczyzną cięcia)');
        });
      }
      /* ---------- wynik ---------- */
      B.step({
        title: 'Wielokąt przekroju',
        co: 'Łączymy wierzchołki przekroju leżące na tych samych ścianach – powstaje wielokąt przekroju (zakreskowany).',
        jak: 'Kontrola: wielokąt jest zamknięty; boki na ścianach równoległych są równoległe.',
        why: 'Przekrój bryły niewypukłej może mieć kilka „wysp” albo wcięcia – każda część bryły przecięta płaszczyzną daje fragment przekroju.',
        cam: { dir: ax.dir },
      });
      B.endWhere((q) => /^tr\d/.test(q.id) || /^tt\d/.test(q.id) || /^k.*e$/.test(q.id) || /^k[ST]_/.test(q.id));
      secs.forEach((sp, i) => {
        B.a2({ t: 'hatch', id: 'sec', pts: sp.map(M), s: 'hatch', step: 5 });
        B.a3({ t: 'poly', id: 'sec', pts: sp, col: '#d01818', op: 0.5 });
      });
      B.info('sec', 'Przekrój bryły płaszczyzną ABC');
      const lower = U.clip(keepPl);
      const lc = lower.creaseEdges();
      B.step({
        title: 'Część ' + (p.keep === 'above' ? 'nad' : 'pod') + ' płaszczyzną – widoczność',
        co: 'Rysujemy pozostałą część bryły: krawędzie widoczne <b>grubo</b>, niewidoczne <b>kreskowo cienko</b>; część odciętą pomijamy (tu – cienko dla porównania).',
        jak: 'Widoczność ustalamy względem kierunku rzutowania aksonometrii (patrzymy ' + (ax.type === 'woj' ? 'z góry, ukośnie' : 'od przodu, z prawej, z góry') + ').',
        why: 'Przekrój staje się nową ścianą bryły – zasłania to, co za nim, i sam może być zasłonięty.',
        cam: { dir: ax.dir },
      });
      B.endWhere((q) => q.id === 'edge' || q.id === 'solid');
      creases.forEach((e) => B.a2({ t: 'seg', id: 'cutaway', a: M(e.a), b: M(e.b), s: 'thin' }));
      B.info('cutaway', 'Krawędź części odciętej');
      const pcs = G.hlr(lc, lower.faces(), { dir: ax.dir });
      pcs.forEach((pc) => {
        B.a2({ t: 'seg', id: 'low', a: M(pc.a), b: M(pc.b), s: pc.st === 'vis' ? 'vis' : 'hid' });
        B.a3({ t: 'seg', id: 'low', a: pc.a, b: pc.b, s: 'given' });
      });
      lower.parts.forEach((pp) => pp.faces.forEach((f) => B.a3({ t: 'poly', id: 'lowf', pts: f, col: '#e8c060', op: 0.55 })));
      B.info('low', 'Krawędź części ' + (p.keep === 'above' ? 'nad' : 'pod') + ' płaszczyzną');
      B.step({
        title: 'Wynik',
        co: 'Część bryły ' + (p.keep === 'above' ? 'nad' : 'pod') + ' płaszczyzną ABC z przekrojem i widocznością.',
        jak: 'Przesuń punkty A, B, C po krawędziach suwakami albo zmień układ aksonometryczny – konstrukcja przeliczy się.',
        why: 'Ta sama metoda działa w każdym rzucie równoległym (aksonometria, Monge) – korzysta tylko z przynależności i równoległości, które rzut równoległy zachowuje.',
        cam: { dir: ax.dir },
      });
      B.endWhere((q) => q.id === 'cube' && B.p2.indexOf(q) >= 0);
      B.data.ok = secs.length > 0;
    },
  });
})();
