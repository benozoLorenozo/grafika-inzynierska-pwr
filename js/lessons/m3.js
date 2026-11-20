/* ===================================================================
   MODUŁ 3 – Przenikanie brył obrotowych (metoda płaszczyzn poziomych – "plasterkowa")
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h,
    lab = GW.lab;
  const TAU = Math.PI * 2;

  /* ---------- bryły ---------- */
  function cone(cx, cy, z0, H, R) {
    const zt = z0 + H;
    return {
      kind: 'cone',
      name: 'stożek',
      F: (P) => Math.max(Math.hypot(P[0] - cx, P[1] - cy) - (R * (zt - P[2])) / H, z0 - P[2], P[2] - zt),
      param: (u, s) => [cx + s * R * Math.cos(u), cy + s * R * Math.sin(u), zt - s * H],
      normal: (P) => {
        const r = V.norm([P[0] - cx, P[1] - cy, 0]);
        return V.norm([r[0], r[1], R / H]);
      },
      sec: (c) => (c < z0 - 1e-9 || c > zt + 1e-9 ? [] : [{ k: 'circle', c: [cx, cy], r: (R * (zt - c)) / H }]),
      zr: [z0, zt],
      outline: {
        p1: [circ3([cx, cy, z0], R, 0, TAU)],
        p2: [
          [
            [cx - R, cy, z0],
            [cx, cy, zt],
          ],
          [
            [cx + R, cy, z0],
            [cx, cy, zt],
          ],
          circ3([cx, cy, z0], R, 0, Math.PI),
        ],
      },
      mesh: (u, v) => [cx + v * R * Math.cos(u), cy + v * R * Math.sin(u), zt - v * H],
      cap: { c: [cx, cy, z0], r: R },
      desc: 'stożek obrotowy pionowy (r = ' + R + ', h = ' + H + ')',
      apex: [cx, cy, zt],
    };
  }
  function cylV(cx, cy, z0, H, R) {
    const z1 = z0 + H;
    return {
      kind: 'cylV',
      name: 'walec',
      F: (P) => Math.max(Math.hypot(P[0] - cx, P[1] - cy) - R, z0 - P[2], P[2] - z1),
      param: (u, s) => [cx + R * Math.cos(u), cy + R * Math.sin(u), z0 + s * H],
      normal: (P) => V.norm([P[0] - cx, P[1] - cy, 0]),
      sec: (c) => (c < z0 - 1e-9 || c > z1 + 1e-9 ? [] : [{ k: 'circle', c: [cx, cy], r: R }]),
      zr: [z0, z1],
      outline: {
        p1: [circ3([cx, cy, z1], R, 0, TAU)],
        p2: [
          [
            [cx - R, cy, z0],
            [cx - R, cy, z1],
          ],
          [
            [cx + R, cy, z0],
            [cx + R, cy, z1],
          ],
          circ3([cx, cy, z1], R, 0, Math.PI),
          circ3([cx, cy, z0], R, 0, Math.PI),
        ],
      },
      mesh: (u, v) => [cx + R * Math.cos(u), cy + R * Math.sin(u), z0 + v * H],
      caps: [
        { c: [cx, cy, z0], r: R },
        { c: [cx, cy, z1], r: R },
      ],
      desc: 'walec obrotowy pionowy (r = ' + R + ', h = ' + H + ')',
    };
  }
  function sphere(cx, cy, cz, r) {
    return {
      kind: 'sphere',
      name: 'kula',
      F: (P) => V.dist(P, [cx, cy, cz]) - r,
      normal: (P) => V.norm(V.sub(P, [cx, cy, cz])),
      sec: (c) => (Math.abs(c - cz) > r ? [] : [{ k: 'circle', c: [cx, cy], r: Math.sqrt(Math.max(0, r * r - (c - cz) * (c - cz))) }]),
      zr: [cz - r, cz + r],
      outline: { p1: [circ3([cx, cy, cz], r, 0, TAU)], p2: [circ3v([cx, cy, cz], r)] },
      mesh: (u, v) => [cx + r * Math.sin(v * Math.PI) * Math.cos(u), cy + r * Math.sin(v * Math.PI) * Math.sin(u), cz + r * Math.cos(v * Math.PI)],
      desc: 'kula (r = ' + r + ')',
      center: [cx, cy, cz],
      r,
    };
  }
  /* walec poziomy, oś ∥ y (⟂ π2) */
  function cylH(x0, z0, r, y0, y1) {
    return {
      kind: 'cylH',
      name: 'walec poziomy',
      F: (P) => Math.max(Math.hypot(P[0] - x0, P[2] - z0) - r, y0 - P[1], P[1] - y1),
      param: (u, s) => [x0 + r * Math.cos(u), y0 + s * (y1 - y0), z0 + r * Math.sin(u)],
      normal: (P) => V.norm([P[0] - x0, 0, P[2] - z0]),
      sec: (c) => {
        const d = c - z0;
        if (Math.abs(d) > r) return [];
        const w = Math.sqrt(r * r - d * d);
        return [{ k: 'lines', xs: w < 1e-9 ? [x0] : [x0 - w, x0 + w], y0, y1 }];
      },
      zr: [z0 - r, z0 + r],
      outline: {
        p1: [
          [
            [x0 - r, y0, z0],
            [x0 - r, y1, z0],
          ],
          [
            [x0 + r, y0, z0],
            [x0 + r, y1, z0],
          ],
          circXZ([x0, y1, z0], r, 0, Math.PI),
          circXZ([x0, y0, z0], r, 0, Math.PI),
        ],
        p2: [circXZ([x0, y1, z0], r, 0, TAU)],
      },
      mesh: (u, v) => [x0 + r * Math.cos(u), y0 + v * (y1 - y0), z0 + r * Math.sin(u)],
      capsXZ: [
        { c: [x0, y0, z0], r },
        { c: [x0, y1, z0], r },
      ],
      desc: 'walec poziomy, oś ⟂ π₂ (r = ' + r + ')',
      x0,
      z0,
      r,
    };
  }
  function circ3(c, r, a0, a1, n = 72) {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      p.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]]);
    }
    return p;
  }
  function circ3v(c, r, n = 96) {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = (TAU * i) / n;
      p.push([c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)]);
    }
    return p;
  }
  function circXZ(c, r, a0, a1, n = 72) {
    const p = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      p.push([c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)]);
    }
    return p;
  }

  function presets(p) {
    if (p.set === 'a') {
      const A = cylH(50 + p.dx, 30 + p.dz, p.r2, -2, 84);
      const Bc = cone(50, 40, 0, 90, p.r1);
      return { A, B: Bc, title: 'Stożek pionowy + walec poziomy (⟂ π₂)', paramA: true };
    }
    if (p.set === 'b') {
      const Bc = cylV(45, 40, 0, 78, p.r1 * 0.6);
      const A = sphere(68 + p.dx, 40 + p.dy, 38 + p.dz, p.r2 * 2);
      return { A: Bc, B: A, title: 'Walec pionowy + kula' };
    }
    const Bc = cone(45, 40, 0, 88, p.r1);
    const A = sphere(66 + p.dx, 40 + p.dy, 30 + p.dz, p.r2 * 1.6);
    return { A: Bc, B: A, title: 'Stożek pionowy + kula' };
  }

  /* przecięcia przekrojów w płaszczyźnie z = c (w układzie arkusza π1: (x,y)) */
  function sliceIntersect(SA, SB, c) {
    const a = SA.sec(c),
      b = SB.sec(c);
    const pts = [];
    a.forEach((ca) =>
      b.forEach((cb) => {
        let r = [];
        const C1 = ca.k === 'circle' ? ca : cb.k === 'circle' ? cb : null;
        const Lq = ca.k === 'lines' ? ca : cb.k === 'lines' ? cb : null;
        if (ca.k === 'circle' && cb.k === 'circle') r = G.circleCircle(ca.c, ca.r, cb.c, cb.r);
        else if (C1 && Lq) Lq.xs.forEach((x) => G.circleLineX(C1.c, C1.r, x).forEach((q) => q[1] >= Lq.y0 - 1e-9 && q[1] <= Lq.y1 + 1e-9 && r.push(q)));
        r.forEach((q) => pts.push([q[0], q[1], c]));
      })
    );
    // filtr: punkt musi leżeć w zakresach obu brył
    return G.dedupe(
      pts.filter((P) => Math.abs(SA.F(P)) < 1e-3 && Math.abs(SB.F(P)) < 1e-3),
      1e-4
    );
  }

  function meshPrim(id, S, col, op) {
    return {
      t: 'mesh',
      id,
      build(THREE, T) {
        const nu = 64,
          nv = 32;
        const pos = [],
          idx = [];
        for (let j = 0; j <= nv; j++)
          for (let i = 0; i <= nu; i++) {
            const P = S.mesh((i / nu) * TAU, j / nv);
            pos.push(P[0], P[2], P[1]);
          }
        for (let j = 0; j < nv; j++)
          for (let i = 0; i < nu; i++) {
            const a = j * (nu + 1) + i,
              b = a + 1,
              c = a + nu + 1,
              d = c + 1;
            idx.push(a, c, b, b, c, d);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        const m = new THREE.MeshLambertMaterial({ color: col, transparent: true, opacity: op, side: THREE.DoubleSide, depthWrite: false });
        const grp = new THREE.Group();
        const mesh = new THREE.Mesh(g, m);
        mesh.renderOrder = -1;
        grp.add(mesh);
        // dna / denka
        const disc = (c, r, nrm) => {
          const dg = new THREE.CircleGeometry(r, 48);
          const dm = new THREE.Mesh(dg, m);
          dm.position.copy(T(c));
          dm.lookAt(T(V.add(c, nrm)));
          grp.add(dm);
        };
        if (S.cap) disc(S.cap.c, S.cap.r, [0, 0, 1]);
        if (S.caps) S.caps.forEach((q) => disc(q.c, q.r, [0, 0, 1]));
        if (S.capsXZ) S.capsXZ.forEach((q) => disc(q.c, q.r, [0, 1, 0]));
        return grp;
      },
    };
  }

  /* klasyfikacja widoczności punktu konturu w sumie brył */
  function rayHits(S, P, dir) {
    for (let t = 0.6; t < 260; t += 0.6) if (S.F(V.add(P, V.mul(dir, t))) < -1e-6) return true;
    return false;
  }
  function outlinePieces(S, other, pts, dir) {
    // => [{pts, st}]
    const st = pts.map((P) => (other.F(P) < -1e-6 ? 'omit' : rayHits(other, P, dir) ? 'hid' : 'vis'));
    const out = [];
    let cur = null;
    for (let i = 0; i < pts.length; i++) {
      if (!cur || cur.st !== st[i]) {
        const m = i > 0 ? V.mid(pts[i - 1], pts[i]) : pts[i];
        if (cur) cur.pts.push(m);
        cur = { st: st[i], pts: [m] };
        if (i > 0) cur.pts.push(pts[i]);
        out.push(cur);
      } else cur.pts.push(pts[i]);
    }
    return out.filter((q) => q.st !== 'omit' && q.pts.length > 1);
  }
  function sliceStr(SA, SB, c) {
    const d = (S) =>
      S.sec(c)
        .map((q) => (q.k === 'circle' ? 'okrąg r = ' + G.f1(q.r) : q.xs.length === 1 ? 'tworzącą (styczna)' : 'dwie tworzące'))
        .join(', ') || '—';
    return { a: d(SA), b: d(SB) };
  }

  GW.addLesson({
    id: 'm3-obrotowe',
    mod: 3,
    title: '3.1 Przenikanie brył obrotowych – metoda plasterkowa',
    v2title: 'Rzuty Monge’a – krzywa przenikania',
    opts: [
      {
        k: 'set',
        l: 'Zestaw',
        choices: [
          ['a', 'A: stożek + walec poziomy ⟂ π₂'],
          ['b', 'B: walec pionowy + kula'],
          ['c', 'C: stożek + kula'],
        ],
        v: 'a',
        rebuildFrame: true,
      },
    ],
    params: [
      { k: 'dx', l: 'bryła 2: przesunięcie x', min: -20, max: 20, step: 0.5, v: 0 },
      { k: 'dy', l: 'bryła 2: przesunięcie y', min: -15, max: 15, step: 0.5, v: 0 },
      { k: 'dz', l: 'bryła 2: przesunięcie z', min: -15, max: 20, step: 0.5, v: 0 },
      { k: 'r1', l: 'promień podstawy bryły 1', min: 28, max: 48, step: 0.5, v: 40 },
      { k: 'r2', l: 'promień bryły 2', min: 8, max: 20, step: 0.5, v: 14 },
      { k: 'nInt', l: 'liczba płaszczyzn pośrednich', min: 2, max: 6, v: 3 },
    ],
    special: {
      note: '<b>Suwak cięcia (Slicer).</b> Przesuwaj płaszczyznę poziomą ε w górę i w dół. W 3D widać przekroje obu brył (pomarańczowe), w 2D – ich rzuty poziome i punkty wspólne. Z włączonym śladem krzywa przenikania „rysuje się” punkt po punkcie.',
      ui: [
        { type: 'range', k: 'cut', l: 'wysokość ε', min: 0, max: 1, step: 0.002, v: 0.5, onchange: (c) => c.app.setSpecial('on', true) },
        { type: 'check', k: 'on', l: 'pokaż płaszczyznę ε (slicer)', v: false },
        { type: 'check', k: 'trail', l: 'zostawiaj ślad punktów', v: true },
        {
          type: 'btn',
          l: '▶ Animuj cięcie',
          fn: (c) => {
            c.S.anim = performance.now();
            c.app.setSpecial('on', true);
          },
        },
        { type: 'btn', l: 'Wyczyść ślad', fn: (c) => (c.S.hist = []) },
      ],
      overlay(c) {
        const d = c.data;
        if (!d.SA || !c.S.on) return {};
        const S = c.S;
        const z = d.z0 + (d.z1 - d.z0) * S.cut;
        const p3 = [],
          p2 = [],
          info = {};
        const ext = d.ext;
        p3.push({ t: 'poly', id: 'slicer', pts: [[ext[0], ext[1], z], [ext[2], ext[1], z], [ext[2], ext[3], z], [ext[0], ext[3], z]], col: '#ff8c00', op: 0.13, edge: true, edgeCol: 0xe07b00, noPick: false });
        info.slicer = 'Płaszczyzna tnąca ε: z = ' + G.f1(z) + '. Przecina obie bryły wzdłuż prostych krzywych (okręgi / tworzące).';
        p2.push({ t: 'seg', id: 'slicer', a: [ext[0] - 5, -z], b: [ext[2] + 5, -z], s: 'auxd', label: 'v_ε', labelAt: 0.98 });
        [d.SA, d.SB].forEach((Sx, k) => {
          Sx.sec(z).forEach((q, j) => {
            const id = 'sl' + k + j;
            info[id] = 'Przekrój bryły (' + Sx.name + ') płaszczyzną ε: ' + (q.k === 'circle' ? 'okrąg o promieniu ' + G.f1(q.r) : 'tworząca/e');
            if (q.k === 'circle') {
              p3.push({ t: 'circle3', id, c: [q.c[0], q.c[1], z], n: [0, 0, 1], r: q.r, s: 'sec' });
              p2.push({ t: 'circle', id, c: q.c, r: q.r, s: 'sec' });
            } else
              q.xs.forEach((x) => {
                p3.push({ t: 'seg', id, a: [x, q.y0, z], b: [x, q.y1, z], s: 'sec' });
                p2.push({ t: 'seg', id, a: [x, q.y0], b: [x, q.y1], s: 'sec' });
              });
          });
        });
        const pts = sliceIntersect(d.SA, d.SB, z);
        S.hist = S.hist || [];
        if (S.trail) pts.forEach((P) => S.hist.push(P));
        if (S.hist.length > 3000) S.hist.splice(0, S.hist.length - 3000);
        pts.forEach((P, i) => {
          const id = 'slp' + i;
          p3.push({ t: 'pt', id, p: P, s: 'res2', r: 1.3 });
          p2.push({ t: 'pt', id, p: [P[0], P[1]], s: 'res2', r: 4 });
          p2.push({ t: 'pt', id, p: [P[0], -P[2]], s: 'res2', r: 4 });
          p2.push({ t: 'seg', id, a: [P[0], P[1]], b: [P[0], -P[2]], s: 'odn' });
          info[id] = 'Punkt krzywej przenikania: przecięcie przekrojów obu brył w płaszczyźnie ε (z = ' + G.f1(z) + ')';
        });
        if (S.trail)
          S.hist.forEach((P, i) => {
            if (i % 1) return;
            p2.push({ t: 'pt', id: 'hist', p: [P[0], P[1]], s: 'res2', r: 1.4, noPick: true });
            p2.push({ t: 'pt', id: 'hist', p: [P[0], -P[2]], s: 'res2', r: 1.4, noPick: true });
          });
        if (S.trail && S.hist.length) p3.push({ t: 'mesh', id: 'hist', noPick: true, build: (THREE, T) => {
          const g = new THREE.BufferGeometry().setFromPoints(S.hist.map(T));
          return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8e24aa, size: 1.6 * c.v3.unit }));
        } });
        return { p3, p2, info };
      },
      frame(c, now) {
        const S = c.S;
        if (!S.anim) return;
        const f = (now - S.anim) / 6000;
        if (f >= 1) {
          S.anim = 0;
          return;
        }
        c.app.setSpecial('cut', 0.5 - 0.5 * Math.cos(f * TAU));
      },
    },
    algo:
      '<ol><li><b>Wybór płaszczyzn pomocniczych</b>: takie, które tną <u>obie</u> bryły wzdłuż linii łatwych do narysowania (okręgów lub prostych). Dla brył o osiach pionowych i walca o osi poziomej – <b>płaszczyzny poziome</b> ε (z = const): stożek i walec pionowy → okręgi, kula → okrąg, walec poziomy → dwie tworzące.</li>' +
      '<li><b>Punkty charakterystyczne</b> (wyznaczamy zawsze!): najwyższy i najniższy punkt krzywej; punkty na <i>tworzących konturowych</i> obu brył w każdym rzucie (tam zmienia się widoczność krzywej); punkty styczności.</li>' +
      '<li><b>Punkty pośrednie</b>: kilka dodatkowych płaszczyzn ε<sub>i</sub> między skrajnymi.</li>' +
      '<li>W każdej ε: ślad v<sub>ε</sub> ∥ x<sub>12</sub> w π<sub>2</sub>; w π<sub>1</sub> rysujemy przekroje obu brył (w rzeczywistej wielkości!) i bierzemy ich punkty wspólne; odnoszącymi przenosimy je na v<sub>ε</sub>.</li>' +
      '<li><b>Łączenie</b>: punkty łączymy krzywą w kolejności, w jakiej leżą na tworzących/równoleżnikach jednej z brył.</li>' +
      '<li><b>Widoczność</b>: punkt krzywej jest widoczny ⇔ leży na widocznej części <u>obu</u> powierzchni. Krzywa zmienia widoczność tylko w punktach na konturach.</li></ol>',
    build(p, B) {
      const pr = presets(p);
      const SA = pr.A,
        SB = pr.B; // SA – parametryzowana, SB – uwikłana
      B.step({
        title: 'Dane: ' + pr.title,
        co: 'Bryły: <b>' + SA.desc + '</b> oraz <b>' + SB.desc + '</b>. Szukamy krzywej przenikania i jej widoczności.',
        jak: 'Obróć model. Krzywa przenikania brył obrotowych jest w ogólności krzywą przestrzenną (4. stopnia) – nie da się jej narysować „jednym ruchem”; wyznaczamy ją punkt po punkcie.',
        why: 'Każdy punkt krzywej należy do obu powierzchni. Jeśli przetniemy obie bryły tą samą płaszczyzną, punkty wspólne obu przekrojów są właśnie punktami krzywej – to istota metody plasterkowej.',
        cam: 'iso',
      });
      const sys = GW.monge(B);
      B.a3(meshPrim('SA', SA, '#7fb3e0', 0.33));
      B.a3(meshPrim('SB', SB, '#e8c060', 0.33));
      B.info('SA', SA.desc);
      B.info('SB', SB.desc);
      // krzywa
      let loops;
      if (SA.param) {
        loops = G.pairedLoops((u) => G.roots((s) => SB.F(SA.param(u, s)), -0.001, 1.001, 200), (u, s) => SA.param(u, s), 360);
      } else {
        loops = G.pairedLoops((u) => G.roots((s) => SA.F(SB.param(u, s)), -0.001, 1.001, 200), (u, s) => SB.param(u, s), 360);
      }
      // kontury 2D (dane)
      const viewN = { p1: [0, 0, 1], p2: [0, 1, 0] };
      [SA, SB].forEach((S, k) => {
        ['p1', 'p2'].forEach((pid) => {
          S.outline[pid].forEach((pl, j) => B.a2({ t: 'pl', id: 'out' + k + pid + j, pts: pl.map((q) => sys.toSheet(pid, q)), s: 'given' }));
        });
      });
      // osie symetrii
      const axes2 = [];
      [SA, SB].forEach((S) => {
        if (S.kind === 'cone' || S.kind === 'cylV') {
          const c = S.outline.p1[0][0];
          const cx = (S.outline.p2[0][0][0] + S.outline.p2[1][0][0]) / 2;
          const cy = S.outline.p2[0][0][1];
          axes2.push([[cx, -S.zr[0] + 5], [cx, -S.zr[1] - 5]]);
          axes2.push([[cx - 6, cy], [cx + 6, cy]]);
          axes2.push([[cx, cy - 6], [cx, cy + 6]]);
        }
      });
      axes2.forEach((a, i) => B.a2({ t: 'seg', id: 'axis2' + i, a: a[0], b: a[1], s: 'thin', noPick: true }));
      if (!loops.length) {
        B.step({ title: 'Brak przenikania', co: 'Bryły się nie przenikają przy tych parametrach.', jak: 'Zmień położenie bryły 2.', why: '' });
        return;
      }
      const allPts = [].concat(...loops);
      const zmin = Math.min(...allPts.map((q) => q[2])),
        zmax = Math.max(...allPts.map((q) => q[2]));
      B.data.SA = SA;
      B.data.SB = SB;
      B.data.z0 = Math.max(Math.min(SA.zr[0], SB.zr[0]), zmin - 12);
      B.data.z1 = Math.min(Math.max(SA.zr[1], SB.zr[1]), zmax + 12);
      const bb = G.bbox2(allPts.map((q) => [q[0], q[1]]).concat(SA.outline.p1[0].map((q) => [q[0], q[1]]), SB.outline.p1[0].map((q) => [q[0], q[1]])));
      B.data.ext = [bb[0] - 12, bb[1] - 12, bb[2] + 12, bb[3] + 12];
      // punkty charakterystyczne
      const chars = [];
      loops.forEach((L, li) => {
        const n = L.length;
        let iMax = 0,
          iMin = 0;
        L.forEach((q, i) => {
          if (q[2] > L[iMax][2]) iMax = i;
          if (q[2] < L[iMin][2]) iMin = i;
        });
        chars.push({ z: L[iMax][2], why: 'najwyższy', cat: 'ext' }, { z: L[iMin][2], why: 'najniższy', cat: 'ext' });
        [
          ['p2', [0, 1, 0]],
          ['p1', [0, 0, 1]],
        ].forEach(([pid, N]) =>
          [SA, SB].forEach((S) => {
            for (let i = 0; i < n; i++) {
              const a = L[i],
                b = L[(i + 1) % n];
              const fa = V.dot(S.normal(a), N),
                fb = V.dot(S.normal(b), N);
              if (fa < 0 !== fb < 0) {
                const t = fa / (fa - fb);
                const P = V.lerp(a, b, t);
                chars.push({ z: P[2], why: 'na konturze (' + S.name + ') w π' + (pid === 'p1' ? '₁' : '₂'), cat: pid, P });
              }
            }
          })
        );
      });
      // grupowanie po z
      const planes = [];
      chars.forEach((c) => {
        const f = planes.find((q) => Math.abs(q.z - c.z) < 0.6);
        if (f) {
          if (f.whys.indexOf(c.why) < 0) f.whys.push(c.why);
          f.cats.add(c.cat);
        } else planes.push({ z: c.z, whys: [c.why], cats: new Set([c.cat]) });
      });
      // pośrednie
      const nInt = p.nInt;
      const used = planes.map((q) => q.z);
      const inter = [];
      for (let i = 1; i <= nInt; i++) {
        let z = zmin + ((zmax - zmin) * i) / (nInt + 1);
        if (used.some((u) => Math.abs(u - z) < (zmax - zmin) * 0.06)) z += (zmax - zmin) * 0.07;
        inter.push({ z, whys: ['pośredni'], cats: new Set(['int']) });
      }
      let ptNo = 1;
      const allSlicePts = [];
      const ext = B.data.ext;
      const doPlane = (pl, tag, keep) => {
        const z = pl.z;
        const id = 'eps' + tag;
        B.planeQuad(id, [[ext[0], ext[1], z], [ext[2], ext[1], z], [ext[2], ext[3], z], [ext[0], ext[3], z]], { col: '#ff8c00', op: 0.1 });
        B.a2({ t: 'seg', id, a: [ext[0] - 4, -z], b: [ext[2] + 4, -z], s: 'auxd', label: 'v_{ε' + tag + '}', labelAt: 0.99 });
        B.info(id, 'Płaszczyzna pozioma ε<sub>' + tag + '</sub>: z = ' + G.f1(z) + ' (' + pl.whys.join(', ') + ')');
        const ids = [id];
        [SA, SB].forEach((S, k) =>
          S.sec(z).forEach((q, j) => {
            const sid = id + 's' + k + j;
            ids.push(sid);
            B.info(sid, 'Przekrój: ' + S.name + ' ∩ ε<sub>' + tag + '</sub> → ' + (q.k === 'circle' ? 'okrąg r = ' + G.f1(q.r) + ' (w π<sub>1</sub> w rzeczywistej wielkości)' : 'tworzące walca'), [id]);
            if (q.k === 'circle') {
              B.a3({ t: 'circle3', id: sid, c: [q.c[0], q.c[1], z], n: [0, 0, 1], r: q.r, s: 'sec' });
              B.a2({ t: 'circle', id: sid, c: q.c, r: q.r, s: 'sec' });
            } else
              q.xs.forEach((x) => {
                B.a3({ t: 'seg', id: sid, a: [x, q.y0, z], b: [x, q.y1, z], s: 'sec' });
                B.a2({ t: 'seg', id: sid, a: [x, q.y0], b: [x, q.y1], s: 'sec' });
              });
          })
        );
        const pts = sliceIntersect(SA, SB, z);
        pts.forEach((P) => {
          const nm = String(ptNo++);
          B.mPoint(nm, P, { s: 'res', pre: 'c', ray: false, info: 'Punkt krzywej przenikania nr ' + nm + ' (ε<sub>' + tag + '</sub>: ' + pl.whys.join(', ') + ')' });
          B.link('c' + nm, [id]);
          allSlicePts.push(P);
        });
        B.src(...ids);
        return { ids, n: pts.length };
      };
      // krok: idea na płaszczyźnie pośredniej
      const first = inter[Math.floor(inter.length / 2)];
      const s0 = sliceStr(SA, SB, first.z);
      B.step({
        title: 'Idea metody: płaszczyzna pozioma ε₁',
        co: 'Płaszczyzna pozioma <b>ε<sub>1</sub></b> (z = ' + G.f1(first.z) + ') przecina: ' + SA.name + ' → ' + s0.a + '; ' + SB.name + ' → ' + s0.b + '.',
        jak: '<ol><li>W π<sub>2</sub> rysujemy ślad v<sub>ε1</sub> ∥ x<sub>12</sub> na wysokości z.</li><li>W π<sub>1</sub> rysujemy oba przekroje – są w rzeczywistej wielkości, bo ε<sub>1</sub> ∥ π<sub>1</sub> (promienie okręgów odczytujemy z π<sub>2</sub>: szerokość bryły na wysokości v<sub>ε</sub>).</li><li>Punkty wspólne przekrojów w π<sub>1</sub> → punkty krzywej. Odnoszące → na v<sub>ε1</sub> w π<sub>2</sub>.</li></ol>',
        why: 'Punkt wspólny dwóch przekrojów leży na obu powierzchniach (bo leży na każdym z przekrojów) – należy więc do krzywej przenikania. Płaszczyzny poziome są tu idealne, bo dają przekroje kołowe/proste, rysowane cyrklem i linijką.',
        cam: { dir: [0.5, 0.85, 0.8] },
      });
      let prev = doPlane(first, '1', false).ids;
      let tagNo = 2;
      const groupsDef = [
        ['ext', 'Punkty najwyższe i najniższe', 'Płaszczyzny przez skrajne (najwyższe/najniższe) punkty krzywej – zwykle styczne do jednej z brył (np. przez górną i dolną tworzącą walca poziomego).', 'Bez nich nie wiemy, gdzie krzywa „zawraca” – łączenie punktów pośrednich mogłoby ominąć wierzchołek krzywej.'],
        ['p2', 'Punkty na konturach w π₂ (zmiana widoczności)', 'Płaszczyzny przez punkty, w których krzywa przechodzi przez tworzące konturowe w rzucie pionowym (dla brył pionowych – tworzące skrajne lewa/prawa; dla walca ⟂ π₂ – cały kontur to okrąg).', 'Na tworzącej konturowej powierzchnia przechodzi z części przedniej (widocznej) na tylną – tam krzywa zmienia widoczność w π<sub>2</sub>, a w rzucie jest styczna do konturu.'],
        ['p1', 'Punkty na konturach w π₁', 'Płaszczyzny przez punkty krzywej leżące na konturach w rzucie poziomym (np. tworzące skrajne walca poziomego, równik kuli).', 'Analogicznie: tu zmienia się widoczność w rzucie poziomym.'],
      ];
      groupsDef.forEach(([cat, title, jak, why]) => {
        const pls = planes.filter((q) => q.cats.has(cat) && !q.done);
        if (!pls.length) return;
        B.step({
          title,
          co: 'Płaszczyzny ' + pls.map((q, i) => 'ε<sub>' + (tagNo + i) + '</sub> (z = ' + G.f1(q.z) + ')').join(', ') + ' – ' + [...new Set([].concat(...pls.map((q) => q.whys)))].join('; ') + '.',
          jak,
          why,
          cam: { dir: [0.5, 0.85, 0.8] },
        });
        B.end(...prev);
        prev = [];
        pls.forEach((q) => {
          q.done = true;
          prev = prev.concat(doPlane(q, String(tagNo++), false).ids);
        });
      });
      inter.forEach((q, i) => {
        if (q === first) return;
        B.step({
          title: 'Płaszczyzna pośrednia ε' + String(tagNo).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]),
          co: 'Kolejne punkty pośrednie: ε<sub>' + tagNo + '</sub>, z = ' + G.f1(q.z) + '.',
          jak: 'Ta sama procedura: ślad w π<sub>2</sub> → przekroje w π<sub>1</sub> → punkty wspólne → odnoszące.',
          why: 'Im więcej punktów, tym dokładniej poprowadzimy krzywą; w praktyce 2–4 płaszczyzny pośrednie między punktami charakterystycznymi wystarczają.',
          cam: { dir: [0.5, 0.85, 0.8] },
        });
        B.end(...prev);
        prev = doPlane(q, String(tagNo++), false).ids;
      });
      // łączenie
      B.step({
        title: 'Łączenie punktów w krzywą przenikania',
        co: 'Punkty łączymy płynną krzywą: ' + (loops.length === 2 ? '<b>dwie zamknięte krzywe</b> (przenikanie całkowite – bryła przechodzi na wylot)' : '<b>jedna zamknięta krzywa</b> (przenikanie częściowe)') + '.',
        jak: 'Kolejność: idąc wzdłuż jednej z brył (np. po okręgu walca ⟂ π<sub>2</sub> w π<sub>2</sub> albo po kolejnych płaszczyznach), łączymy punkty sąsiednie. W punktach na konturach krzywa jest styczna do konturu.',
        why: 'Krzywa przenikania jest ciągła. W rzucie na rzutnię, do której bryła jest rzutująca (np. walec ⟂ π<sub>2</sub>), krzywa pokrywa się z konturem tej bryły – to dodatkowa kontrola.',
        cam: 'iso',
      });
      B.end(...prev);
      loops.forEach((L, i) => {
        B.a3({ t: 'pl', id: 'curve' + i, pts: L, closed: true, s: 'res' });
        ['p1', 'p2'].forEach((pid) => B.a2({ t: 'pl', id: 'curve' + i, pts: L.map((q) => sys.toSheet(pid, q)), closed: true, s: 'res', w: 1.6 }));
        B.info('curve' + i, 'Krzywa przenikania' + (loops.length > 1 ? ' (gałąź ' + (i + 1) + ')' : ''));
      });
      // widoczność
      B.step({
        title: 'Widoczność krzywej i konturów',
        co: 'Krzywa jest widoczna ⇔ punkt leży na widocznej części obu powierzchni. Kontury brył: części wewnątrz drugiej bryły usuwamy, zasłonięte – przerywane.',
        jak: 'W π<sub>2</sub> widoczne są przednie połówki (y większe od osi), w π<sub>1</sub> – górne. Widoczność zmienia się w punktach na tworzących konturowych (wyznaczyliśmy je jako charakterystyczne).',
        why: 'Dla brył wypukłych promień od obserwatora do punktu na przedniej części obu powierzchni nie przecina już żadnej z nich – punkt jest widoczny; jeśli punkt leży na tylnej części choć jednej bryły – ta bryła go zasłania.',
      });
      B.p2.forEach((q) => {
        if (/^curve|^out/.test(q.id) && q.to === undefined) q.to = B.cur;
      });
      loops.forEach((L, i) => {
        ['p1', 'p2'].forEach((pid) => {
          const N = viewN[pid];
          const vis = L.map((q) => V.dot(SA.normal(q), N) > 0 && V.dot(SB.normal(q), N) > 0);
          let cur = null;
          const runs = [];
          for (let j = 0; j <= L.length; j++) {
            const jj = j % L.length;
            if (!cur || cur.v !== vis[jj]) {
              cur = { v: vis[jj], pts: cur ? [L[(j - 1 + L.length) % L.length]] : [] };
              runs.push(cur);
            }
            cur.pts.push(L[jj]);
          }
          runs.forEach((r) => r.pts.length > 1 && B.a2({ t: 'pl', id: 'curve' + i, pts: r.pts.map((q) => sys.toSheet(pid, q)), s: r.v ? 'res' : 'resd' }));
        });
      });
      [
        [SA, SB],
        [SB, SA],
      ].forEach(([S, O], k) => {
        const kk = S === SA ? 0 : 1;
        ['p1', 'p2'].forEach((pid) => {
          S.outline[pid].forEach((pl, j) => {
            outlinePieces(S, O, pl, viewN[pid]).forEach((r) => B.a2({ t: 'pl', id: 'out' + kk + pid + j, pts: r.pts.map((q) => sys.toSheet(pid, q)), s: r.st === 'vis' ? 'vis' : 'hid' }));
          });
        });
      });
      B.step({
        title: 'Wynik',
        co: 'Krzywa przenikania z widocznością.',
        jak: 'Użyj <b>suwaka cięcia</b> (Widok specjalny), aby zobaczyć ciągłość metody: każda pozycja płaszczyzny daje kolejne punkty.',
        why: 'Zmień w trybie eksperymentu promienie i położenie – zobacz przejście od przenikania całkowitego (dwie krzywe) przez styczność (krzywa z punktem podwójnym) do częściowego (jedna krzywa).',
        cam: 'iso',
      });
      B.data.loops = loops;
    },
  });
})();
