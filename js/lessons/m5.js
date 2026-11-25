/* ===================================================================
   MODUŁ 5 – Rzut cechowany
   Arkusz: (x, y) – widok z góry; wysokości (cechy) w metrach.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h;
  const f1 = G.f1;
  const P2 = (P) => [P[0], P[1]];

  /* ---------- narzędzia wspólne ---------- */
  function contourLabel(B, id, line, val, every) {
    if (!line || line.length < 2) return;
    const q = line[Math.floor(line.length * (every || 0.5))];
    B.a2({ t: 'text', id, p: q, txt: String(val), s: 'hval' });
  }
  /* droga spływu wody (największy spadek) po powierzchni F */
  function flowPath(F, P0, box, step = 0.35, maxN = 600) {
    const pts = [];
    let P = P0.slice();
    const e = 0.05;
    for (let i = 0; i < maxN; i++) {
      const z = F(P[0], P[1]);
      if (!isFinite(z)) break;
      pts.push([P[0], P[1], z]);
      const gx = (F(P[0] + e, P[1]) - F(P[0] - e, P[1])) / (2 * e),
        gy = (F(P[0], P[1] + e) - F(P[0], P[1] - e)) / (2 * e);
      const g = Math.hypot(gx, gy);
      if (g < 1e-4) break;
      P = [P[0] - (gx / g) * step, P[1] - (gy / g) * step];
      if (P[0] < box[0] || P[0] > box[2] || P[1] < box[1] || P[1] > box[3]) break;
    }
    return pts;
  }
  GW.flowPath = flowPath;
  function flowOverlay(c, F, box, P) {
    if (!P || P[0] < box[0] || P[0] > box[2] || P[1] < box[1] || P[1] > box[3]) return null;
    const pts = flowPath(F, P, box);
    if (pts.length < 2) return null;
    const p2 = [{ t: 'pl', id: 'flow', pts: pts.map(P2), s: 'water' }];
    const n = pts.length;
    if (n > 3) p2.push({ t: 'arrow', id: 'flow', a: P2(pts[Math.max(0, n - 4)]), b: P2(pts[n - 1]), s: 'water' });
    p2.push({ t: 'pt', id: 'flow', p: P2(pts[0]), s: 'water', r: 3 });
    const p3 = [{ t: 'pl', id: 'flow', pts: pts.map((q) => [q[0], q[1], q[2] + 0.12]), s: 'water' }, { t: 'pt', id: 'flow', p: [pts[0][0], pts[0][1], pts[0][2] + 0.12], s: 'water' }];
    return { p2, p3 };
  }
  /* overlay spływu wody wg wybranego trybu: off / 2d / 3d / both */
  function waterOverlay(c, F, box, cursor, dropsOn, n) {
    const d = c.data;
    const w = c.S.water || '3d';
    const s2 = w === '2d' || w === 'both',
      s3 = w === '3d' || w === 'both';
    const r = s2 || s3 ? flowOverlay(c, F, box, cursor) || { p2: [], p3: [] } : { p2: [], p3: [] };
    const p3 = s3 ? r.p3.slice() : [];
    if (s3 && dropsOn) p3.push(d._drops || (d._drops = dropsPrim(d.F, d.box, n)));
    return { p2: s2 ? r.p2 : [], p3 };
  }
  /* animowane krople wody (THREE.Points) */
  function dropsPrim(F, box, n, getState) {
    let cache = null;
    return {
      t: 'mesh',
      id: 'drops',
      noPick: true,
      build(THREE, T, unit) {
        if (cache) return cache;
        const g = new THREE.BufferGeometry();
        const pos = new Float32Array(n * 3);
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: 0x1e88e5, size: unit * 1.4 }));
        const st = [];
        const seed = () => [box[0] + Math.random() * (box[2] - box[0]), box[1] + Math.random() * (box[3] - box[1]), Math.random() * 200];
        for (let i = 0; i < n; i++) st.push(seed());
        pts.onBeforeRender = () => {
          const e = 0.05;
          for (let i = 0; i < n; i++) {
            const s = st[i];
            const gx = (F(s[0] + e, s[1]) - F(s[0] - e, s[1])) / (2 * e),
              gy = (F(s[0], s[1] + e) - F(s[0], s[1] - e)) / (2 * e);
            const gl = Math.hypot(gx, gy);
            s[2]--;
            if (gl < 1e-3 || s[2] < 0 || s[0] < box[0] || s[0] > box[2] || s[1] < box[1] || s[1] > box[3]) st[i] = seed();
            else {
              const sp = 0.12 + 0.5 * Math.min(1, gl);
              s[0] -= (gx / gl) * sp;
              s[1] -= (gy / gl) * sp;
            }
            const z = F(st[i][0], st[i][1]);
            pos[i * 3] = st[i][0];
            pos[i * 3 + 1] = z + 0.25;
            pos[i * 3 + 2] = st[i][1];
          }
          g.attributes.position.needsUpdate = true;
        };
        cache = pts;
        return pts;
      },
    };
  }
  /* siatka powierzchni F(x,y) w 3D, kolor wg wysokości lub funkcji koloru */
  function surfPrim(id, F, box, nx, ny, colorFn, op) {
    return {
      t: 'mesh',
      id,
      build(THREE) {
        const pos = [],
          col = [],
          idx = [];
        const c = new THREE.Color();
        for (let j = 0; j <= ny; j++)
          for (let i = 0; i <= nx; i++) {
            const x = box[0] + ((box[2] - box[0]) * i) / nx,
              y = box[1] + ((box[3] - box[1]) * j) / ny;
            const z = F(x, y);
            pos.push(x, z, y);
            c.set(colorFn(x, y, z));
            col.push(c.r, c.g, c.b);
          }
        for (let j = 0; j < ny; j++)
          for (let i = 0; i < nx; i++) {
            const a = j * (nx + 1) + i,
              b = a + 1,
              d = a + nx + 1,
              e = d + 1;
            idx.push(a, d, b, b, d, e);
          }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        const m = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: (op ?? 1) < 1, opacity: op ?? 1 });
        const mesh = new THREE.Mesh(g, m);
        mesh.renderOrder = -1;
        return mesh;
      },
    };
  }
  const lerpCol = (a, b, t) => {
    const pa = [parseInt(a.slice(1, 3), 16), parseInt(a.slice(3, 5), 16), parseInt(a.slice(5, 7), 16)];
    const pb = [parseInt(b.slice(1, 3), 16), parseInt(b.slice(3, 5), 16), parseInt(b.slice(5, 7), 16)];
    t = Math.max(0, Math.min(1, t));
    return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
  };
  /* płaszczyzna jako funkcja h(x,y) */
  function planeFn(A, B, C) {
    const pl = G.plane3(A, B, C);
    return { f: (x, y) => (pl.d - pl.n[0] * x - pl.n[1] * y) / pl.n[2], pl, grad: [-pl.n[0] / pl.n[2], -pl.n[1] / pl.n[2]] };
  }
  /* warstwice płaszczyzny (proste) przycięte do wielokąta */
  function planeContours(pf, poly, levels) {
    const out = [];
    const g = pf.grad;
    const gl = Math.hypot(g[0], g[1]);
    if (gl < 1e-9) return out;
    const dir = [-g[1] / gl, g[0] / gl];
    levels.forEach((lv) => {
      // punkt na płaszczyźnie o wysokości lv: P0 + t*grad/|grad|^2
      const c = G.centroid(poly);
      const hc = pf.f(c[0], c[1]);
      const P = V.add(c, V.mul(g, (lv - hc) / (gl * gl)));
      // przytnij prostą do wielokąta wypukłego
      const ts = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
          b = poly[(i + 1) % poly.length];
        const r = G.line2(P, V.add(P, dir), a, b);
        if (r && r.u >= -1e-9 && r.u <= 1 + 1e-9) ts.push(r.t);
      }
      if (ts.length >= 2) out.push({ lv, a: V.add(P, V.mul(dir, Math.min(...ts))), b: V.add(P, V.mul(dir, Math.max(...ts))) });
    });
    return out;
  }
  const rangeInt = (a, b) => {
    const r = [];
    for (let k = Math.ceil(Math.min(a, b) - 1e-9); k <= Math.floor(Math.max(a, b) + 1e-9); k++) r.push(k);
    return r;
  };
  const cecha = (n, v) => n + '(' + f1(v) + ')';

  /* =================================================================
     5.1 Płaszczyzna w rzucie cechowanym
     ================================================================= */
  GW.addLesson({
    id: 'm5-plaszczyzna',
    mod: 5,
    zExag: 'auto',
    title: '5.1 Płaszczyzna: stopniowanie, warstwice, nachylenie',
    v2title: 'Rzut cechowany (widok z góry, cechy w m)',
    params: [
      { k: 'hA', l: 'cecha A [m]', min: 0, max: 10, step: 0.1, v: 1.6 },
      { k: 'hB', l: 'cecha B [m]', min: 0, max: 12, step: 0.1, v: 7.4 },
      { k: 'hC', l: 'cecha C [m]', min: 0, max: 12, step: 0.1, v: 4.3 },
      { k: 'Cx', l: 'C: położenie x', min: 10, max: 45, step: 0.5, v: 30 },
    ],
    special: {
      note: '<b>Spływ wody.</b> Najedź kursorem na rysunek 2D – z tego miejsca popłynie kropla po płaszczyźnie (linia największego spadku): zawsze prostopadle do warstwic. Tryb wyświetlania kropli wybierzesz poniżej (wybór jest zapamiętywany).',
      ui: [{ type: 'select', k: 'water', l: 'Spływ wody (kropla pod kursorem i krople animowane)', choices: [['off', 'brak'], ['2d', 'tylko w 2D'], ['3d', 'tylko w 3D'], ['both', '2D + 3D']], v: '3d', persist: 'water' }],
      bind(c) {
        c.v2.onBgMove = (P) => {
          c.S.cursor = P;
          c.app.refreshOverlay();
        };
      },
      overlay(c) {
        const d = c.data;
        if (!d.F) return {};
        const r = waterOverlay(c, d.F, d.box, c.S.cursor, c.k >= d.dropStep, 60);
        return { p2: r.p2, p3: r.p3, info: { flow: 'Droga spływu wody – linia największego spadku płaszczyzny (⟂ warstwic)' } };
      },
    },
    algo:
      '<ol><li><b>Rzut cechowany</b>: tylko rzut poziomy; wysokość punktu zapisujemy liczbą (cechą) w nawiasie, np. A(1,6).</li>' +
      '<li><b>Stopniowanie odcinka</b>: na odcinku o znanych cechach wyznaczamy punkty o cechach całkowitych – dzielimy go proporcjonalnie (twierdzenie Talesa): pomocnicza półprosta z podziałką, łączymy ostatnią kreskę z końcem odcinka i prowadzimy równoległe.</li>' +
      '<li><b>Warstwica</b> = prosta pozioma płaszczyzny. Na stopniowanym boku znajdujemy punkt o cesze trzeciego wierzchołka → łączymy: mamy kierunek warstwic. Pozostałe warstwice są do niej równoległe i przechodzą przez punkty całkowite.</li>' +
      '<li><b>Skala nachylenia</b> (podziałka spadku): prostopadła do warstwic, rysowana podwójną linią z kreskami cech. <b>Interwał</b> i = odstęp warstwic co 1 m.</li>' +
      '<li><b>Kąt nachylenia</b>: tg α = 1 / i (kład trójkąta spadku: przyprostokątne i oraz 1 m).</li></ol>',
    build(p, B) {
      const A = [6, 34, p.hA],
        Bq = [46, 10, p.hB],
        C = [p.Cx, 42, p.hC];
      const pts = [A, Bq, C],
        nm = ['A', 'B', 'C'];
      const pf = planeFn(A, Bq, C);
      const box = [-2, 2, 54, 50];
      B.data.F = (x, y) => (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] ? pf.f(x, y) : NaN);
      B.data.box = box;
      const patch = [
        [box[0], box[1]],
        [box[2], box[1]],
        [box[2], box[3]],
        [box[0], box[3]],
      ];
      B.step({
        title: 'Dane: punkty z cechami',
        co: 'Punkty ' + pts.map((q, i) => cecha(nm[i], q[2])).join(', ') + ' wyznaczają płaszczyznę α.',
        jak: 'W 3D: pionowe „tyczki” pokazują wysokości nad poziomem odniesienia 0. Na rysunku widzimy tylko rzuty poziome i cechy.',
        why: 'Rzut cechowany to rzut prostokątny na jedną rzutnię poziomą (poziom odniesienia) + liczba = odległość od niej. To wystarcza do pełnego opisu przestrzeni.',
        cam: { dir: [0.4, 0.9, 0.9] },
      });
      B.a3({ t: 'poly', id: 'ref', pts: patch.map((q) => [q[0], q[1], 0]), col: '#7fa8d8', op: 0.12, edge: true });
      B.info('ref', 'Poziom odniesienia (cecha 0)');
      pts.forEach((q, i) => {
        B.a3({ t: 'pt', id: nm[i], p: q, s: 'given', label: cecha(nm[i], q[2]) });
        B.a3({ t: 'seg', id: nm[i] + 'pole', a: [q[0], q[1], 0], b: q, s: 'thin' });
        B.a2({ t: 'pt', id: nm[i], p: P2(q), s: 'given', label: cecha(nm[i], q[2]) });
        B.info(nm[i], 'Punkt ' + nm[i] + ' – cecha ' + f1(q[2]) + ' m', [nm[i] + 'pole']);
        B.info(nm[i] + 'pole', 'Wysokość punktu ' + nm[i] + ' = ' + f1(q[2]) + ' m (cecha)', [nm[i]]);
      });
      B.a3({ t: 'poly', id: 'tri', pts, col: '#e8c060', op: 0.4 });
      B.a2({ t: 'pl', id: 'tri', pts: pts.map(P2), closed: true, s: 'thin' });
      B.info('tri', 'Trójkąt ABC – wycinek płaszczyzny α');
      // stopniowanie boku o największej różnicy cech
      const pairs = [
        [0, 1],
        [1, 2],
        [0, 2],
      ];
      pairs.sort((a, b) => Math.abs(pts[b[1]][2] - pts[b[0]][2]) - Math.abs(pts[a[1]][2] - pts[a[0]][2]));
      let [iL, iH] = pairs[0];
      if (pts[iL][2] > pts[iH][2]) [iL, iH] = [iH, iL];
      const iM = 3 - iL - iH;
      const Lo = pts[iL],
        Hi = pts[iH],
        Mi = pts[iM];
      const ints = rangeInt(Lo[2], Hi[2]).filter((k) => k > Lo[2] + 1e-6 && k < Hi[2] - 1e-6);
      B.step({
        title: 'Stopniowanie odcinka ' + nm[iL] + nm[iH] + ' (twierdzenie Talesa)',
        co: 'Na boku <b>' + nm[iL] + nm[iH] + '</b> (największa różnica cech) wyznaczamy punkty o cechach całkowitych: ' + ints.join(', ') + '.',
        jak: '<ol><li>Z ' + nm[iL] + ' prowadzimy dowolną półprostą pomocniczą i odkładamy na niej podziałkę: odcinki odpowiadające różnicom cech (' + f1(Math.ceil(Lo[2]) - Lo[2]) + ', potem po 1, na końcu ' + f1(Hi[2] - Math.floor(Hi[2])) + ').</li><li>Ostatnią kreskę (cecha ' + f1(Hi[2]) + ') łączymy z ' + nm[iH] + '.</li><li>Przez pozostałe kreski prowadzimy równoległe → punkty całkowite na ' + nm[iL] + nm[iH] + '.</li></ol>',
        why: 'Wysokość zmienia się wzdłuż prostej liniowo, a rzut równoległy zachowuje stosunek podziału odcinka. Równoległe cięcie dwóch ramion kąta dzieli je proporcjonalnie (Tales) – więc podział podziałki przenosi się na rzut odcinka.',
      });
      const dAB = V.norm(V.sub(P2(Hi), P2(Lo)));
      const rot = [dAB[0] * Math.cos(0.6) - dAB[1] * Math.sin(0.6), dAB[0] * Math.sin(0.6) + dAB[1] * Math.cos(0.6)];
      const u = (V.dist(P2(Lo), P2(Hi)) / (Hi[2] - Lo[2])) * 0.75;
      const mark = (hv) => V.add(P2(Lo), V.mul(rot, (hv - Lo[2]) * u));
      const mEnd = mark(Hi[2]);
      B.a2({ t: 'seg', id: 'thal', a: P2(Lo), b: V.add(mEnd, V.mul(rot, u * 0.4)), s: 'aux' });
      B.a2({ t: 'seg', id: 'thal', a: mEnd, b: P2(Hi), s: 'aux' });
      B.a2({ t: 'pt', id: 'thal', p: mEnd, s: 'aux', r: 2 });
      B.info('thal', 'Półprosta pomocnicza z podziałką (Tales)');
      const gradPts = {};
      ints.forEach((k) => {
        const m = mark(k);
        const t = (k - Lo[2]) / (Hi[2] - Lo[2]);
        const Q = V.lerp(Lo, Hi, t);
        gradPts[k] = Q;
        B.a2({ t: 'pt', id: 'thal', p: m, s: 'aux', r: 1.8 });
        B.a2({ t: 'seg', id: 'thal', a: m, b: P2(Q), s: 'thin' });
        B.a2({ t: 'pt', id: 'g' + k, p: P2(Q), s: 'res', r: 2.6, label: String(k), labCls: 'small' });
        B.a3({ t: 'pt', id: 'g' + k, p: Q, s: 'res', small: true, label: String(k) });
        B.info('g' + k, 'Punkt boku ' + nm[iL] + nm[iH] + ' o cesze ' + k);
      });
      B.src(nm[iL], nm[iH]);
      // punkt o cesze M na boku
      const tM = (Mi[2] - Lo[2]) / (Hi[2] - Lo[2]);
      const X = V.lerp(Lo, Hi, tM);
      B.step({
        title: 'Warstwica o cesze ' + f1(Mi[2]) + ' (przez ' + nm[iM] + ')',
        co: 'Na ' + nm[iL] + nm[iH] + ' szukamy punktu X o cesze wierzchołka ' + nm[iM] + ' (' + f1(Mi[2]) + '). Prosta <b>' + nm[iM] + 'X</b> to warstwica płaszczyzny.',
        jak: 'X dzieli ' + nm[iL] + nm[iH] + ' proporcjonalnie (ta sama podziałka Talesa – kreska ' + f1(Mi[2]) + '). Łączymy X z ' + nm[iM] + '.',
        why: 'Dwa punkty płaszczyzny o tej samej wysokości wyznaczają prostą poziomą tej płaszczyzny – warstwicę. Wszystkie warstwice płaszczyzny są równoległe.',
      });
      B.a2({ t: 'pt', id: 'X', p: P2(X), s: 'aux2', label: cecha('X', Mi[2]) });
      B.a3({ t: 'pt', id: 'X', p: X, s: 'aux2', label: 'X' });
      const wM = planeContours(pf, patch, [Mi[2]])[0];
      if (wM) {
        B.a2({ t: 'seg', id: 'wM', a: wM.a, b: wM.b, s: 'aux2' });
        B.a3({ t: 'seg', id: 'wM', a: [wM.a[0], wM.a[1], Mi[2]], b: [wM.b[0], wM.b[1], Mi[2]], s: 'aux2' });
        B.info('wM', 'Warstwica o cesze ' + f1(Mi[2]) + ' (przez ' + nm[iM] + ' i X)');
      }
      B.a2({ t: 'pt', id: 'thal', p: mark(Mi[2]), s: 'aux2', r: 2 });
      B.a2({ t: 'seg', id: 'thal', a: mark(Mi[2]), b: P2(X), s: 'aux2' });
      B.src(nm[iM]);
      // warstwice całkowite
      const lv = rangeInt(Math.min(...pts.map((q) => q[2])) - 6, Math.max(...pts.map((q) => q[2])) + 6);
      const cs = planeContours(pf, patch, lv);
      B.step({
        title: 'Warstwice całkowite',
        co: 'Przez punkty całkowite boku ' + nm[iL] + nm[iH] + ' prowadzimy proste równoległe do warstwicy ' + nm[iM] + 'X: <b>warstwice co 1 m</b>.',
        jak: 'Rysujemy je na całym fragmencie płaszczyzny; cechy opisujemy przy warstwicach.',
        why: 'Warstwice to przekroje płaszczyzny płaszczyznami poziomymi co 1 m – w 3D widać je jako „plasterki” płaszczyzny na kolejnych wysokościach.',
      });
      cs.forEach((c) => {
        const id = 'w' + c.lv;
        B.a2({ t: 'seg', id, a: c.a, b: c.b, s: 'cont' });
        B.a2({ t: 'text', id, p: V.lerp(c.a, c.b, 0.06), txt: String(c.lv), s: 'hval' });
        B.a3({ t: 'seg', id, a: [c.a[0], c.a[1], c.lv], b: [c.b[0], c.b[1], c.lv], s: 'cont' });
        B.info(id, 'Warstwica płaszczyzny α o cesze ' + c.lv + ' m', ['g' + c.lv]);
      });
      B.a3({ t: 'poly', id: 'alpha', pts: patch.map((q) => [q[0], q[1], pf.f(q[0], q[1])]), col: '#e8c060', op: 0.25 });
      B.info('alpha', 'Płaszczyzna α');
      // skala nachylenia
      const g = pf.grad,
        gl = Math.hypot(g[0], g[1]);
      const ival = 1 / gl;
      const sd = [g[0] / gl, g[1] / gl];
      const c0 = [box[0] + 6, box[3] - 6];
      // dobierz położenie skali: przez narożnik w dół spadku
      const sc0 = V.add(G.centroid([P2(A), P2(Bq), P2(C)]), V.mul(V.perp2(sd), -14));
      B.step({
        title: 'Skala nachylenia i interwał',
        co: 'Skala nachylenia <b>s<sub>α</sub></b> – podwójna linia ⟂ warstwic z kreskami cech. Interwał <b>i = ' + f1(ival) + ' m</b>.',
        jak: 'Prowadzimy dowolną prostą ⟂ warstwic; jej punkty przecięcia z warstwicami to kreski skali (cienka linia po stronie wyższych cech – wg konwencji rysujemy grubszą i cieńszą kreskę równolegle).',
        why: 'Skala nachylenia jest rzutem linii największego spadku. Płaszczyznę wyznacza w rzucie cechowanym jednoznacznie jej skala nachylenia (kierunek warstwic + interwał + cechy).',
      });
      const along = (k) => {
        const hc = pf.f(sc0[0], sc0[1]);
        return V.add(sc0, V.mul(sd, (k - hc) * ival));
      };
      const ks = cs.map((c) => c.lv).filter((k) => {
        const q = along(k);
        return q[0] > box[0] && q[0] < box[2] && q[1] > box[1] && q[1] < box[3];
      });
      if (ks.length >= 2) {
        const a = along(ks[0]),
          b = along(ks[ks.length - 1]);
        const off = V.mul(V.perp2(sd), 0.6);
        B.a2({ t: 'seg', id: 'skala', a, b, s: 'given' });
        B.a2({ t: 'seg', id: 'skala', a: V.add(a, off), b: V.add(b, off), s: 'vis', w: 3.2 });
        ks.forEach((k) => {
          const q = along(k);
          B.a2({ t: 'seg', id: 'skala', a: V.sub(q, V.mul(off, 2)), b: V.add(q, V.mul(off, 3)), s: 'given' });
        });
        B.a2({ t: 'text', id: 'skala', p: V.add(b, V.mul(sd, 2.5)), txt: 's_α', s: 'note' });
        B.info('skala', 'Skala nachylenia płaszczyzny α; interwał i = ' + f1(ival) + ' m');
        const a3 = [a[0], a[1], pf.f(a[0], a[1])],
          b3 = [b[0], b[1], pf.f(b[0], b[1])];
        B.a3({ t: 'seg', id: 'skala', a: a3, b: b3, s: 'water', label: 'linia największego spadku', labelAt: 0.5 });
        // interwał
        const q1 = along(ks[0]),
          q2 = along(ks[0] + 1);
        B.a2({ t: 'seg', id: 'ival', a: V.add(q1, V.mul(off, -6)), b: V.add(q2, V.mul(off, -6)), s: 'dist' });
        B.a2({ t: 'text', id: 'ival', p: V.add(V.mid(q1, q2), V.mul(off, -10)), txt: 'i', s: 'note' });
        B.info('ival', 'Interwał i = ' + f1(ival) + ' m: odległość pozioma między warstwicami różniącymi się o 1 m');
        B.data.scale = { along, sd, ks, off };
      }
      // kąt
      const ang = G.deg(Math.atan(gl));
      B.step({
        title: 'Kąt nachylenia α (kład trójkąta spadku)',
        co: 'Kąt nachylenia płaszczyzny: <b>α = ' + f1(ang) + '°</b>, tg α = 1 / i = ' + G.f2(gl) + ' (spadek ' + f1(gl * 100) + '%).',
        jak: 'Na skali nachylenia bierzemy odcinek długości i (różnica cech 1 m). W jego końcu prostopadle odkładamy 1 m (w skali rysunku) – przeciwprostokątna to kład linii spadku; kąt przy skali = α.',
        why: 'Linia największego spadku jest prostopadła do warstwic, więc jej nachylenie jest nachyleniem płaszczyzny. Kład obraca pionowy trójkąt spadku do poziomu – widać go w rzeczywistej wielkości. <b>Woda spływa po linii największego spadku</b> – najedź na rysunek.',
        cam: { dir: [0.9, 0.5, 0.5] },
      });
      B.data.dropStep = B.cur;
      if (B.data.scale) {
        const { along: al, sd: s2, ks: k2, off } = B.data.scale;
        const q1 = al(k2[0]),
          q2 = al(k2[0] + 1);
        const nrm = V.norm(V.perp2(s2));
        const q3 = V.add(q2, V.mul(nrm, -1 * 3));
        // 1 m w skali rysunku: rysujemy 1 m prostopadle (skala 1:1)
        const q3b = V.add(q2, V.mul(nrm, -1));
        B.a2({ t: 'seg', id: 'klad', a: q2, b: q3b, s: 'res' });
        B.a2({ t: 'seg', id: 'klad', a: q1, b: q3b, s: 'res' });
        B.a2({ t: 'text', id: 'klad', p: V.add(q1, V.mul(V.norm(V.sub(q3b, q1)), -3)), txt: 'α = ' + f1(ang) + '°', s: 'resT' });
        B.info('klad', 'Kład trójkąta spadku: przyprostokątne i = ' + f1(ival) + ' m oraz 1 m → α = ' + f1(ang) + '°');
        // 3D: trójkąt spadku
        const Q1 = [q1[0], q1[1], k2[0]],
          Q2 = [q2[0], q2[1], k2[0] + 1];
        B.a3({ t: 'poly', id: 'klad', pts: [Q1, [q2[0], q2[1], k2[0]], Q2], col: '#d01818', op: 0.45, edge: true, edgeCol: 0xd01818 });
      }
    },
  });


  /* =================================================================
     wspólne: płaszczyzna przez 3 punkty z cechami, stopniowanie
     ================================================================= */
  const measureInfo = (c, a, b) => {
    const F = c.data && (c.data.F || c.data.T);
    if (!F) return '';
    const ha = F(a[0], a[1]),
      hb = F(b[0], b[1]);
    if (!isFinite(ha) || !isFinite(hb)) return '';
    const d = V.dist(a, b);
    const dh = hb - ha;
    const sp = Math.abs(dh) / Math.max(1e-9, d);
    return 'cechy: ' + f1(ha) + ' → ' + f1(hb) + ' (Δh = ' + f1(dh) + ' m); spadek ' + f1(sp * 100) + '%, nachylenie 1 : ' + (sp > 1e-6 ? G.f2(1 / sp) : '∞') + ', α = ' + f1(G.deg(Math.atan(sp))) + '°';
  };
  /* punkty o cechach całkowitych na odcinku (P, Q z cechami w [2]) */
  const gradeSeg = (P, Q) =>
    rangeInt(P[2], Q[2])
      .filter((k) => Math.abs(Q[2] - P[2]) > 1e-9)
      .map((k) => ({ k, p: V.lerp(P, Q, (k - P[2]) / (Q[2] - P[2])) }));
  const contourClip = (pf, poly, lv) => planeContours(pf, poly, lv);
  const drawPtC = (B, id, P, nm, s, info) => {
    B.a2({ t: 'pt', id, p: P2(P), s: s || 'given', label: nm + '′(' + f1(P[2]).replace(/,0$/, '') + ')' });
    B.a3({ t: 'pt', id, p: P, s: s || 'given', label: nm });
    B.a3({ t: 'seg', id: id + 'pole', a: [P[0], P[1], Math.min(0, P[2]) - 0.5], b: P, s: 'thin' });
    if (info) B.info(id, info, [id + 'pole']);
  };
  const refPlane = (B, box, z0) => {
    B.a3({ t: 'poly', id: 'ref', pts: [[box[0], box[1], z0], [box[2], box[1], z0], [box[2], box[3], z0], [box[0], box[3], z0]], col: '#7fa8d8', op: 0.1, edge: true, noFit: true });
    B.info('ref', 'Poziom odniesienia');
  };

  /* =================================================================
     5.2 Plan warstwicowy płaszczyzny o danym nachyleniu (Lista 5, zad. 3)
     ================================================================= */
  GW.addLesson({
    id: 'm5-nachylenie',
    mod: 5,
    zExag: 'auto',
    lista: 'L5 Z3',
    title: '5.2 Płaszczyzna o nachyleniu 1:n przez punkt; proste o spadku p%',
    v2title: 'Rzut cechowany (jednostki rysunku = m, skala 1:100)',
    params: [
      { k: 'n', l: 'nachylenie płaszczyzny 1 : n, n =', min: 0.6, max: 3, step: 0.1, v: 1.3 },
      { k: 'pp', l: 'spadek prostych p [%]', min: 10, max: 70, v: 40 },
      { k: 'az', l: 'kierunek spadku S′β [°]', min: -180, max: 180, v: 78 },
      { k: 'hA', l: 'cecha A', min: 0, max: 6, step: 0.5, v: 3 },
    ],
    measureInfo,
    mistakes: ['Spadek 40% to <b>moduł 2,5</b> (1/0,4), nachylenie 1:1,3 to moduł 1,3 – nie odwrotnie.', 'Jeśli okrąg o promieniu modułu prostej nie przecina warstwicy płaszczyzny, prosta o takim spadku nie istnieje (płaszczyzna jest łagodniejsza niż prosta).'],
    algo:
      '<ol><li><b>Moduł płaszczyzny</b> i = n (dla nachylenia 1 : n) – odstęp warstwic co 1 m.</li>' +
      '<li><b>Skala nachylenia</b> przez A równolegle do S′<sub>β</sub>: odkładamy co i kreski cech (w kierunku strzałki cechy maleją).</li>' +
      '<li><b>Warstwice</b>: proste ⟂ skali nachylenia przez kreski – plan warstwicowy płaszczyzny β.</li>' +
      '<li><b>Prosta o spadku p%</b> przez A: moduł prostej i<sub>p</sub> = 100/p. Okrąg o środku A′ i promieniu i<sub>p</sub> przecina warstwicę o cesze (h<sub>A</sub> − 1) w punktach B′, C′.</li>' +
      '<li>Proste AB i AC leżą w β (oba punkty w β) i mają spadek p% (różnica 1 m na długości i<sub>p</sub>). Zadanie ma 2, 1 lub 0 rozwiązań.</li></ol>',
    build(p, B) {
      const A = [2, 4.76, p.hA];
      const az = G.rad(p.az);
      const d = [Math.cos(az), Math.sin(az)];
      const ival = p.n;
      const pf = planeFromScale(P2(A), p.hA, p.az, ival);
      const box = [-3.5, -1.5, 10.5, 10];
      const patch = [
        [box[0], box[1]],
        [box[2], box[1]],
        [box[2], box[3]],
        [box[0], box[3]],
      ];
      B.data.F = (x, y) => (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] ? pf.f(x, y) : NaN);
      B.data.box = box;
      B.step({
        title: 'Dane: punkt A, kierunek spadku S′β, nachylenie 1:' + G.f1(p.n).replace(',0', ''),
        co: 'Płaszczyzna <b>β</b> przechodzi przez ' + cecha('A', A[2]) + ', jej linia spadku ma kierunek strzałki S′<sub>β</sub>, nachylenie <b>1 : ' + G.f1(ival) + '</b>. Przez A poprowadzić w β proste o spadku <b>' + p.pp + '%</b>.',
        jak: 'Strzałka S′<sub>β</sub> pokazuje kierunek, w którym płaszczyzna opada (cechy maleją).',
        why: 'Płaszczyznę w rzucie cechowanym wyznacza punkt + skala nachylenia (kierunek i moduł).',
        cam: { dir: [0.4, 0.9, 0.9] },
      });
      refPlane(B, box, 0);
      drawPtC(B, 'A', A, 'A', 'given', 'Punkt A leżący na płaszczyźnie β');
      const s0 = V.add(P2(A), V.add(V.mul(d, -3), V.mul(V.perp2(d), 5.5)));
      B.a2({ t: 'arrow', id: 'Sb', a: s0, b: V.add(s0, V.mul(d, 7)), s: 'given' });
      B.a2({ t: 'seg', id: 'Sb', a: V.add(s0, V.mul(V.perp2(d), 0.12)), b: V.add(V.add(s0, V.mul(d, 6.4)), V.mul(V.perp2(d), 0.12)), s: 'given' });
      B.a2({ t: 'text', id: 'Sb', p: V.add(s0, V.add(V.mul(d, 7.5), V.mul(V.perp2(d), 0.6))), txt: "S_β'", s: 'note' });
      B.info('Sb', 'S′<sub>β</sub> – kierunek linii spadku płaszczyzny β (strzałka w stronę malejących cech)');
      // skala nachylenia przez A
      const lv = rangeInt(p.hA - 6, p.hA + 6);
      const at = (k) => V.add(P2(A), V.mul(d, (p.hA - k) * ival));
      B.step({
        title: 'Skala nachylenia przez A (moduł i = ' + f1(ival) + ')',
        co: 'Przez A′ prowadzimy prostą ∥ S′<sub>β</sub> i odkładamy co <b>i = ' + f1(ival) + '</b> kreski cech: w stronę strzałki ' + (p.hA - 1) + ', ' + (p.hA - 2) + ', … w przeciwną ' + (p.hA + 1) + ', …',
        jak: 'Nachylenie 1 : ' + f1(ival) + ' oznacza: 1 m różnicy wysokości na ' + f1(ival) + ' m w poziomie (na rysunku 1:100 – ' + f1(ival) + ' cm).',
        why: 'Linia spadku jest prostopadła do warstwic i ma największe nachylenie – jej moduł jest modułem płaszczyzny.',
      });
      const ksIn = lv.filter((k) => {
        const q = at(k);
        return q[0] > box[0] && q[0] < box[2] && q[1] > box[1] && q[1] < box[3];
      });
      const off = V.mul(V.perp2(d), 0.08);
      if (ksIn.length >= 2) {
        const a = at(ksIn[0]),
          b = at(ksIn[ksIn.length - 1]);
        B.a2({ t: 'seg', id: 'skala', a, b, s: 'given' });
        B.a2({ t: 'seg', id: 'skala', a: V.add(a, off), b: V.add(b, off), s: 'vis', w: 3 });
        ksIn.forEach((k) => {
          const q = at(k);
          B.a2({ t: 'seg', id: 'skala', a: V.sub(q, V.mul(off, 2)), b: V.add(q, V.mul(off, 3)), s: 'given' });
          B.a2({ t: 'text', id: 'skala', p: V.add(q, V.mul(off, -4)), txt: String(k), s: 'hval' });
        });
        B.a3({ t: 'seg', id: 'skala', a: [a[0], a[1], ksIn[0]], b: [b[0], b[1], ksIn[ksIn.length - 1]], s: 'water' });
        B.info('skala', 'Skala nachylenia płaszczyzny β – kreski co moduł i = ' + f1(ival));
      }
      B.src('A', 'Sb');
      const cs = contourClip(pf, patch, lv);
      B.step({
        title: 'Plan warstwicowy płaszczyzny β',
        co: 'Przez kreski skali prowadzimy proste ⟂ S′<sub>β</sub> – <b>warstwice</b> co 1 m.',
        jak: 'Warstwica przez A ma cechę ' + p.hA + '; kolejne są równoległe w odstępach ' + f1(ival) + '.',
        why: 'Warstwica to pozioma prosta płaszczyzny – prostopadła do linii spadku.',
      });
      cs.forEach((c) => {
        const id = 'w' + c.lv;
        B.a2({ t: 'seg', id, a: c.a, b: c.b, s: 'cont' });
        B.a2({ t: 'text', id, p: V.lerp(c.a, c.b, 0.04), txt: String(c.lv), s: 'hval' });
        B.a3({ t: 'seg', id, a: [c.a[0], c.a[1], c.lv], b: [c.b[0], c.b[1], c.lv], s: 'cont' });
        B.info(id, 'Warstwica płaszczyzny β o cesze ' + c.lv);
      });
      B.a3({ t: 'poly', id: 'beta', pts: patch.map((q) => [q[0], q[1], pf.f(q[0], q[1])]), col: '#e8c060', op: 0.3 });
      B.info('beta', 'Płaszczyzna β');
      // proste o spadku p%
      const ip = 100 / p.pp;
      const k1 = p.hA - 1;
      const w1 = cs.find((c) => c.lv === k1);
      B.step({
        title: 'Okrąg o promieniu modułu prostej i_p = ' + f1(ip),
        co: 'Moduł prostej o spadku ' + p.pp + '%: <b>i<sub>p</sub> = 100/' + p.pp + ' = ' + G.f2(ip) + '</b>. Okrąg o środku A′ i promieniu i<sub>p</sub> przecina warstwicę ' + k1 + ' w punktach B′, C′.',
        jak: 'Punkt odległy w poziomie o i<sub>p</sub> od A i leżący o 1 m niżej wyznacza z A prostą o spadku p%. Takie punkty płaszczyzny β leżą na warstwicy ' + k1 + ' – stąd przecięcie okręgu z tą warstwicą.',
        why: 'Wszystkie proste przez A o spadku p% tworzą <b>stożek obrotowy</b> o wierzchołku A (pokazany w 3D). Szukane proste to tworzące stożka leżące w płaszczyźnie β – przecięcie stożka z płaszczyzną przez wierzchołek.',
        cam: { dir: [0.5, 0.75, 0.75] },
      });
      B.a2({ t: 'circle', id: 'okr', c: P2(A), r: ip, s: 'aux' });
      B.info('okr', 'Okrąg o środku A′ i promieniu i<sub>p</sub> = ' + G.f2(ip) + ' (podstawa stożka spadku p% na poziomie ' + k1 + ')');
      B.a3({
        t: 'mesh',
        id: 'okr',
        build(THREE, T) {
          const pos = [],
            idx = [];
          const N = 48;
          const apex = A;
          pos.push(apex[0], apex[2], apex[1]);
          for (let i = 0; i <= N; i++) {
            const a = (i / N) * Math.PI * 2;
            pos.push(A[0] + 1.6 * ip * Math.cos(a), A[2] - 1.6, A[1] + 1.6 * ip * Math.sin(a));
            if (i) idx.push(0, i, i + 1);
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.setIndex(idx);
          g.computeVertexNormals();
          return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x2a6fdb, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
        },
      });
      const sols = [];
      if (w1) {
        const dd = V.norm(V.sub(w1.b, w1.a));
        const f0 = V.sub(w1.a, P2(A));
        const bq = V.dot(f0, dd),
          cq = V.dot(f0, f0) - ip * ip;
        const disc = bq * bq - cq;
        if (disc >= 0) [-1, 1].forEach((sg) => sols.push(V.add(w1.a, V.mul(dd, -bq + sg * Math.sqrt(disc)))));
      }
      B.data.ok = sols.length > 0;
      ['B', 'C'].forEach((n, i) => {
        if (!sols[i]) return;
        const Q = [sols[i][0], sols[i][1], k1];
        drawPtC(B, n, Q, n, 'res', 'Punkt ' + n + ' – na warstwicy ' + k1 + ' i na okręgu o promieniu i<sub>p</sub>');
      });
      B.src('w' + k1, 'A');
      B.step({
        title: sols.length ? 'Proste o spadku ' + p.pp + '%: ' + (sols.length === 2 ? 'AB i AC' : 'AB') : 'Brak rozwiązania',
        co: sols.length ? 'Łączymy A z B i z C – to szukane proste (' + sols.length + ' rozwiązania). Przedłużamy je i stopniujemy (co ' + G.f2(ip) + ').' : 'Okrąg nie przecina warstwicy – płaszczyzna jest łagodniejsza (moduł ' + f1(ival) + ') niż żądana prosta (moduł ' + G.f2(ip) + '): w β nie ma prostej o spadku ' + p.pp + '%.',
        jak: 'Kontrola: prosta o spadku ' + p.pp + '% nie może być bardziej stroma niż linia spadku płaszczyzny (' + f1(100 / ival) + '%).',
        why: 'Liczba rozwiązań zależy od tego, czy stożek przecina płaszczyznę (2), jest do niej styczny (1 – wtedy prosta to linia spadku) czy jej nie przecina (0).',
        cam: { dir: [0.45, 0.8, 0.8] },
      });
      sols.forEach((q, i) => {
        const Q = [q[0], q[1], k1];
        const dir = V.sub(Q, A);
        const a = V.add(A, V.mul(dir, -1.6)),
          b = V.add(A, V.mul(dir, 2.6));
        const id = 'l' + i;
        B.a2({ t: 'seg', id, a: P2(a), b: P2(b), s: 'res', label: i ? 'AC' : 'AB' });
        B.a3({ t: 'seg', id, a, b, s: 'res' });
        B.info(id, 'Prosta o spadku ' + p.pp + '% leżąca w β (moduł ' + G.f2(ip) + ')');
        gradeSeg(a, b).forEach((g) => B.a2({ t: 'pt', id, p: P2(g.p), s: 'res', r: 1.8, label: String(g.k), labCls: 'small' }));
      });
      B.step({
        title: 'Wynik i kąty nachylenia',
        co: 'Płaszczyzna β: α = ' + f1(G.deg(Math.atan(1 / ival))) + '° (spadek ' + f1(100 / ival) + '%); proste: ' + f1(G.deg(Math.atan(p.pp / 100))) + '°.',
        jak: 'Najedź miarką (📏) między dwa punkty – zobaczysz spadek i nachylenie odcinka.',
        why: 'Zmień spadek prostych suwakiem – przy p ≥ ' + f1(100 / ival) + '% rozwiązań brak.',
      });
    },
  });

  /* =================================================================
     5.3 Przebicie płaszczyzny (A,B,C) prostą + widoczność (Lista 5, zad. 2)
     ================================================================= */
  const L5Z2 = {
    // A, B, C leżą na bokach wieloboku (współrzędne dosunięte do boków po digitalizacji)
    A: [3.09, 16.35, 3],
    B: [14.09, 10.25, -1],
    C: [15.4, 18.08, 2],
    poly: [
      [0.5, 12.0],
      [18.17, 9.73],
      [22.4, 17.17],
      [4.93, 19.43],
    ],
    l3: [9.33, 5.17, 3],
    l2: [10.23, 11.67, 2],
  };
  GW.addLesson({
    id: 'm5-przebicie',
    mod: 5,
    zExag: 'auto',
    lista: 'L5 Z2',
    title: '5.3 Przebicie płaszczyzny prostą (wielobok δ)',
    v2title: 'Rzut cechowany – przebicie i widoczność',
    params: [
      { k: 'h3', l: 'cecha punktu 3 prostej a', min: 1, max: 6, step: 0.5, v: 3 },
      { k: 'h2', l: 'cecha punktu 2 prostej a', min: -2, max: 4, step: 0.5, v: 2 },
      { k: 'gam', l: 'kierunek warstwic pomocniczej γ [°]', min: -80, max: 80, v: 35 },
    ],
    measureInfo,
    mistakes: ['Warstwice płaszczyzny pomocniczej γ prowadzimy przez <b>punkty całkowite prostej</b> – kierunek dowolny, ale wspólny.', 'Widoczność z góry: widoczna jest część prostej <b>nad</b> płaszczyzną – sprawdź cechę prostej i płaszczyzny w jednym punkcie.'],
    algo:
      '<ol><li><b>Stopniowanie</b>: na bokach wieloboku i na prostej a wyznaczamy punkty o cechach całkowitych (Tales).</li>' +
      '<li><b>Warstwice δ</b>: łączymy punkty o równych cechach na bokach.</li>' +
      '<li><b>Płaszczyzna pomocnicza γ ⊃ a</b>: przez punkty całkowite a prowadzimy równoległe proste (dowolny kierunek) – warstwice γ.</li>' +
      '<li><b>m = δ ∩ γ</b>: przecięcia warstwic δ i γ o równych cechach. <b>P = m ∩ a</b>.</li>' +
      '<li><b>Widoczność</b>: część a nad δ widoczna (cecha a &gt; cecha δ w tym miejscu); zmiana w P. Poza wielobokiem prosta zawsze widoczna.</li></ol>',
    build(p, B) {
      const D5 = p.set === 'gen' && p.gen ? p.gen : L5Z2;
      const { A, B: Bq, C, poly } = D5;
      const pf = planeFn(A, Bq, C);
      const P3a = [D5.l3[0], D5.l3[1], D5 === L5Z2 ? p.h3 : D5.l3[2]],
        P2a = [D5.l2[0], D5.l2[1], D5 === L5Z2 ? p.h2 : D5.l2[2]];
      const box = [-1, 0, 24, 24];
      B.data.F = (x, y) => (G.pointInPoly2([x, y], poly) ? pf.f(x, y) : NaN);
      B.data.box = box;
      const poly3 = poly.map((q) => [q[0], q[1], pf.f(q[0], q[1])]);
      const dirL = V.sub(P2a, P3a);
      const a0 = V.add(P3a, V.mul(dirL, -0.85)),
        a1 = V.add(P3a, V.mul(dirL, 2.6));
      B.step({
        title: 'Dane: płaszczyzna δ = (A, B, C) i prosta a',
        co: 'Płaszczyzna <b>δ</b> dana punktami ' + cecha('A', A[2]) + ', ' + cecha('B', Bq[2]) + ', ' + cecha('C', C[2]) + ' (wielobok). Prosta <b>a</b> przez punkty o cechach ' + f1(P3a[2]) + ' i ' + f1(P2a[2]) + '. Wyznaczyć przebicie P i widoczność a.',
        jak: 'Strzałka na prostej wskazuje kierunek spadku (malejących cech).',
        why: 'W rzucie cechowanym przebicie szukamy tak jak w Monge’u: przez prostą prowadzimy płaszczyznę pomocniczą.',
        cam: { dir: [0.4, 0.9, 0.9] },
      });
      refPlane(B, box, -2);
      B.a2({ t: 'pl', id: 'delta', pts: poly, closed: true, s: 'given' });
      B.a3({ t: 'poly', id: 'delta', pts: poly3, col: '#e8c060', op: 0.4 });
      B.a3({ t: 'pl', id: 'delta', pts: poly3, closed: true, s: 'given' });
      B.info('delta', 'Wielobok – fragment płaszczyzny δ');
      [
        ['A', A],
        ['B', Bq],
        ['C', C],
      ].forEach(([n, P]) => drawPtC(B, 'p' + n, P, n, 'given', 'Punkt ' + n + ' płaszczyzny δ (cecha ' + f1(P[2]) + ')'));
      B.a2({ t: 'arrow', id: 'a', a: P2(a0), b: P2(a1), s: 'given' });
      B.a3({ t: 'seg', id: 'a', a: a0, b: a1, s: 'given', label: 'a' });
      B.a2({ t: 'text', id: 'a', p: V.add(P2(a1), [0.6, 0.6]), txt: "a'", s: 'note' });
      B.info('a', 'Prosta a');
      drawPtC(B, 'a3', P3a, String(P3a[2]).replace('.', ','), 'given', 'Punkt prostej a o cesze ' + f1(P3a[2]));
      drawPtC(B, 'a2', P2a, String(P2a[2]).replace('.', ','), 'given', 'Punkt prostej a o cesze ' + f1(P2a[2]));
      // stopniowanie
      const sAB = gradeSeg(A, Bq),
        sBC = gradeSeg(Bq, C),
        sAC = gradeSeg(A, C);
      const gl = gradeSeg(a0, a1);
      B.step({
        title: 'Stopniowanie boków AB, BC, AC i prostej a',
        co: 'Punkty o cechach całkowitych: na AB: ' + sAB.map((q) => q.k).join(', ') + '; na BC: ' + sBC.map((q) => q.k).join(', ') + '; na a: ' + gl.map((q) => q.k).join(', ') + '.',
        jak: 'Twierdzenie Talesa (jak w 5.1). Dla prostej a mamy już dwa punkty – dalsze punkty całkowite odkładamy w tych samych odstępach (moduł prostej = ' + G.f2(V.dist(P2(P3a), P2(P2a)) / Math.max(1e-9, Math.abs(P3a[2] - P2a[2]))) + ').',
        why: 'Cecha zmienia się liniowo wzdłuż prostej – równe różnice cech to równe odcinki w rzucie.',
      });
      [sAB, sBC, sAC].forEach((arr, j) =>
        arr.forEach((q) => {
          B.a2({ t: 'pt', id: 'g' + q.k, p: P2(q.p), s: 'aux', r: 1.8, label: String(q.k), labCls: 'small' });
        })
      );
      gl.forEach((q) => B.a2({ t: 'pt', id: 'gl' + q.k, p: P2(q.p), s: 'given', r: 1.8, label: String(q.k), labCls: 'small' }));
      // warstwice δ
      const lv = rangeInt(-2, 5);
      const cs = contourClip(pf, poly, lv);
      B.step({
        title: 'Warstwice płaszczyzny δ',
        co: 'Łączymy punkty o równych cechach na bokach – warstwice δ (' + cs.map((c) => c.lv).join(', ') + ').',
        jak: 'Warstwice są równoległe – wystarczy jedna, pozostałe ∥ przez punkty całkowite.',
        why: 'Dwa punkty płaszczyzny o tej samej cesze wyznaczają jej poziomą prostą.',
      });
      cs.forEach((c) => {
        const id = 'wd' + c.lv;
        B.a2({ t: 'seg', id, a: c.a, b: c.b, s: 'cont' });
        B.a2({ t: 'text', id, p: V.lerp(c.a, c.b, 0.06), txt: String(c.lv), s: 'hval' });
        B.a3({ t: 'seg', id, a: [c.a[0], c.a[1], c.lv], b: [c.b[0], c.b[1], c.lv], s: 'cont' });
        B.info(id, 'Warstwica δ o cesze ' + c.lv);
      });
      // γ
      const gd = [Math.cos(G.rad(p.gam)), Math.sin(G.rad(p.gam))];
      B.step({
        title: 'Płaszczyzna pomocnicza γ ⊃ a',
        co: 'Przez punkty całkowite a prowadzimy równoległe proste – <b>warstwice γ</b>.',
        jak: 'Kierunek dowolny (byle nie ∥ warstwicom δ); tu ' + p.gam + '°.',
        why: 'Przez prostą przechodzi nieskończenie wiele płaszczyzn – każda zawiera a; jej warstwice przechodzą przez punkty całkowite a.',
      });
      gl.forEach((q) => {
        const a = V.add(P2(q.p), V.mul(gd, -6)),
          b = V.add(P2(q.p), V.mul(gd, 6));
        B.a2({ t: 'seg', id: 'wg' + q.k, a, b, s: 'aux2', w: 0.9 });
        B.a3({ t: 'seg', id: 'wg' + q.k, a: [a[0], a[1], q.k], b: [b[0], b[1], q.k], s: 'aux2', w: 0.6 });
        B.info('wg' + q.k, 'Warstwica płaszczyzny pomocniczej γ o cesze ' + q.k);
      });
      // m i P
      const mp = [];
      gl.forEach((q) => {
        const w = planeContours(pf, [[-40, -40], [60, -40], [60, 60], [-40, 60]], [q.k])[0];
        if (!w) return;
        const r = G.line2(P2(q.p), V.add(P2(q.p), gd), w.a, w.b);
        if (r) mp.push({ k: q.k, p: r.p });
      });
      const fD = a0[2] - pf.f(a0[0], a0[1]),
        fE = a1[2] - pf.f(a1[0], a1[1]);
      const t = fD / (fD - fE);
      const P = V.lerp(a0, a1, t);
      const inPoly = G.pointInPoly2(P2(P), poly);
      B.data.ok = inPoly;
      B.step({
        title: 'Prosta m = δ ∩ γ i punkt przebicia P',
        co: 'Przecięcia warstwic δ i γ o równych cechach wyznaczają <b>m</b>; <b>P = m ∩ a</b> (cecha ' + f1(P[2]) + ').' + (inPoly ? '' : ' <b>P leży poza wielobokiem</b> – prosta przebija płaszczyznę δ poza narysowanym fragmentem.'),
        jak: 'Wystarczą dwa punkty m; trzeci służy do kontroli.',
        why: 'm i a leżą w γ, więc się przecinają; punkt wspólny leży na a i na m ⊂ δ.',
      });
      if (mp.length >= 2) {
        const a = mp[0].p,
          b = mp[mp.length - 1].p;
        const ext = [V.add(a, V.mul(V.sub(a, b), 0.3)), V.add(b, V.mul(V.sub(b, a), 0.3))];
        B.a2({ t: 'seg', id: 'm', a: ext[0], b: ext[1], s: 'aux', label: "m'" });
        mp.forEach((q) => {
          B.a2({ t: 'pt', id: 'm' + q.k, p: q.p, s: 'aux', r: 2.2 });
          B.info('m' + q.k, 'Punkt prostej m o cesze ' + q.k + ': warstwica δ ∩ warstwica γ', ['wd' + q.k, 'wg' + q.k]);
        });
        B.info('m', 'm = δ ∩ γ');
      }
      B.a2({ t: 'pt', id: 'P', p: P2(P), s: 'res', label: cecha('P', P[2]) });
      B.a3({ t: 'pt', id: 'P', p: P, s: 'res', label: 'P' });
      B.info('P', 'Punkt przebicia prostej a z płaszczyzną δ');
      // widoczność
      B.step({
        title: 'Widoczność prostej a',
        co: 'Z góry widoczna jest część a leżąca <b>nad</b> δ; w P widoczność się zmienia. Poza wielobokiem prosta jest widoczna.',
        jak: 'Porównanie cech: w punkcie ' + gl[0].k + ' prostej płaszczyzna ma cechę ' + f1(pf.f(gl[0].p[0], gl[0].p[1])) + ' → prosta jest tam ' + (gl[0].k > pf.f(gl[0].p[0], gl[0].p[1]) ? 'nad' : 'pod') + ' δ.',
        why: 'W rzucie z góry zasłania to, co wyżej.',
        cam: { dir: [0.3, 0.8, 1] },
      });
      B.end('a');
      const pcs = G.hlr([{ a: a0, b: a1 }], [{ pts: poly3, pl: G.plane3(poly3[0], poly3[1], poly3[2]) }], { dir: [0, 0, 1] });
      pcs.forEach((pc) => B.a2({ t: 'seg', id: 'a', a: P2(pc.a), b: P2(pc.b), s: pc.st === 'vis' ? 'vis' : 'hid' }));
      B.a2({ t: 'arrow', id: 'a', a: V.lerp(P2(a0), P2(a1), 0.92), b: P2(a1), s: 'given' });
      B.a3({ t: 'seg', id: 'a', a: a0, b: a1, s: 'given', label: 'a' });
    },
  });

  /* =================================================================
     5.2 Przecięcie płaszczyzn i przebicie prostej
     ================================================================= */
  function planeFromScale(P0, h0, az, ival) {
    // spadek w kierunku az (wektor w dół)
    const d = [Math.cos(G.rad(az)), Math.sin(G.rad(az))];
    const g = V.mul(d, -1 / ival); // gradient (w górę przeciwnie do spadku)
    return { f: (x, y) => h0 + V.dot(g, [x - P0[0], y - P0[1]]), grad: g, P0, h0, ival, d };
  }
  GW.addLesson({
    id: 'm5-przeciecie',
    mod: 5,
    zExag: 'auto',
    title: '5.4 Krawędź dwóch płaszczyzn (skale nachylenia), przebicie prostej',
    v2title: 'Rzut cechowany – przecięcie i przebicie',
    params: [
      { k: 'aA', l: 'α: kierunek spadku [°]', min: -180, max: 180, v: 20 },
      { k: 'iA', l: 'α: interwał [m]', min: 1.5, max: 6, step: 0.1, v: 3 },
      { k: 'aB', l: 'β: kierunek spadku [°]', min: -180, max: 180, v: 150 },
      { k: 'iB', l: 'β: interwał [m]', min: 1.5, max: 6, step: 0.1, v: 2.4 },
      { k: 'hD', l: 'cecha D [m]', min: 0, max: 14, step: 0.1, v: 11.2 },
      { k: 'hE', l: 'cecha E [m]', min: 0, max: 14, step: 0.1, v: 2.3 },
    ],
    special: {
      note: 'Najedź na rysunek – kropla wody popłynie po płaszczyźnie α (linia największego spadku). Tryb wyświetlania wybierzesz poniżej.',
      ui: [{ type: 'select', k: 'water', l: 'Spływ wody (kropla pod kursorem i krople animowane)', choices: [['off', 'brak'], ['2d', 'tylko w 2D'], ['3d', 'tylko w 3D'], ['both', '2D + 3D']], v: '3d', persist: 'water' }],
      bind(c) {
        c.v2.onBgMove = (P) => {
          c.S.cursor = P;
          c.app.refreshOverlay();
        };
      },
      overlay(c) {
        const d = c.data;
        if (!d.F) return {};
        const r = waterOverlay(c, d.F, d.box, c.S.cursor, false, 0);
        return { p2: r.p2, p3: r.p3, info: { flow: 'Spływ wody po płaszczyźnie α' } };
      },
    },
    algo:
      '<ol><li><b>Warstwice</b> obu płaszczyzn z ich skal nachylenia (⟂ skali, co interwał).</li>' +
      '<li><b>Krawędź przecięcia</b> k = α ∩ β: punkty przecięcia warstwic <u>o tych samych cechach</u> leżą na obu płaszczyznach. Dwa takie punkty wyznaczają k. (Kontrola: trzeci punkt też musi leżeć na k.)</li>' +
      '<li><b>Przebicie prostej l z płaszczyzną α</b>: stopniujemy l; przez l prowadzimy dowolną płaszczyznę pomocniczą γ – jej warstwice to dowolne równoległe proste przez punkty całkowite l.</li>' +
      '<li>m = α ∩ γ (z punktów przecięcia równocechowych warstwic α i γ). Punkt przebicia P = m ∩ l.</li>' +
      '<li><b>Widoczność</b> (z góry): część l leżąca nad α jest widoczna; zmiana w P. Porównujemy cechę l i cechę α w dowolnym punkcie.</li></ol>',
    build(p, B) {
      const box = [0, 0, 60, 46];
      const al = planeFromScale([30, 23], 6, p.aA, p.iA);
      const be = planeFromScale([30, 23], 6.5, p.aB, p.iB);
      const D = [6, 8, p.hD],
        E = [54, 40, p.hE];
      B.data.F = (x, y) => (x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3] ? al.f(x, y) : NaN);
      B.data.box = box;
      const patch = [
        [box[0], box[1]],
        [box[2], box[1]],
        [box[2], box[3]],
        [box[0], box[3]],
      ];
      const lv = rangeInt(-2, 16);
      const csA = planeContours(al, patch, lv),
        csB = planeContours(be, patch, lv);
      B.step({
        title: 'Dane: płaszczyzny α, β (skale nachylenia) i prosta l = DE',
        co: 'Płaszczyzna α: interwał ' + f1(p.iA) + ' m; β: interwał ' + f1(p.iB) + ' m. Prosta l przez ' + cecha('D', D[2]) + ' i ' + cecha('E', E[2]) + '.',
        jak: 'Skala nachylenia (podwójna linia) w pełni określa płaszczyznę: kierunek warstwic jest do niej prostopadły, a kreski dają cechy.',
        why: 'W rzucie cechowanym nie mamy drugiego rzutu – płaszczyznę opisują warstwice (lub skala nachylenia), a prostą – rzut z cechami dwóch punktów.',
        cam: { dir: [0.4, 0.9, 0.9] },
      });
      const drawScale = (pl, id, nmS, sh) => {
        const c = V.add([30, 23], V.mul(V.perp2(pl.d), sh));
        const ks = lv.filter((k) => {
          const q = V.add(c, V.mul(pl.d, -(k - pl.f(c[0], c[1])) * pl.ival));
          return q[0] > 2 && q[0] < 58 && q[1] > 2 && q[1] < 44;
        });
        if (ks.length < 2) return;
        const at = (k) => V.add(c, V.mul(pl.d, -(k - pl.f(c[0], c[1])) * pl.ival));
        const off = V.mul(V.perp2(pl.d), 0.6);
        const a = at(ks[0]),
          b = at(ks[ks.length - 1]);
        B.a2({ t: 'seg', id, a, b, s: 'given' });
        B.a2({ t: 'seg', id, a: V.add(a, off), b: V.add(b, off), s: 'vis', w: 3 });
        ks.forEach((k) => {
          B.a2({ t: 'seg', id, a: V.sub(at(k), V.mul(off, 2)), b: V.add(at(k), V.mul(off, 3)), s: 'given' });
          B.a2({ t: 'text', id, p: V.add(at(k), V.mul(off, 6)), txt: String(k), s: 'hval' });
        });
        B.a2({ t: 'text', id, p: V.add(b, V.mul(V.sub(b, a), 0.08)), txt: nmS, s: 'note' });
        B.info(id, 'Skala nachylenia płaszczyzny ' + nmS.replace('s_', ''));
      };
      drawScale(al, 'sA', 's_α', -16);
      drawScale(be, 'sB', 's_β', 16);
      const surf = (pl, col, id) => B.a3({ t: 'poly', id, pts: patch.map((q) => [q[0], q[1], pl.f(q[0], q[1])]), col, op: 0.3 });
      surf(al, '#e8c060', 'alpha');
      surf(be, '#7fb3e0', 'beta');
      B.info('alpha', 'Płaszczyzna α');
      B.info('beta', 'Płaszczyzna β');
      B.a2({ t: 'seg', id: 'l', a: P2(D), b: P2(E), s: 'given', label: 'l' });
      B.a2({ t: 'pt', id: 'D', p: P2(D), s: 'given', label: cecha('D', D[2]) });
      B.a2({ t: 'pt', id: 'E', p: P2(E), s: 'given', label: cecha('E', E[2]) });
      B.a3({ t: 'seg', id: 'l', a: D, b: E, s: 'given', label: 'l' });
      B.a3({ t: 'pt', id: 'D', p: D, s: 'given', label: 'D' });
      B.a3({ t: 'pt', id: 'E', p: E, s: 'given', label: 'E' });
      B.info('l', 'Prosta l = DE');
      B.step({
        title: 'Warstwice płaszczyzn α i β',
        co: 'Warstwice obu płaszczyzn co 1 m.',
        jak: 'Przez kreski skali nachylenia prowadzimy proste do niej prostopadłe.',
        why: 'Warstwica jest pozioma, a linia spadku jest prostopadła do poziomych prostych płaszczyzny – stąd ⟂.',
      });
      [
        [csA, 'wa', '#a07040', 'α'],
        [csB, 'wb', '#2a6fdb', 'β'],
      ].forEach(([cs, pre, col, nmP]) =>
        cs.forEach((c) => {
          const id = pre + c.lv;
          B.a2({ t: 'seg', id, a: c.a, b: c.b, s: pre === 'wa' ? 'cont' : 'aux', w: 0.8 });
          B.a2({ t: 'text', id, p: V.lerp(c.a, c.b, pre === 'wa' ? 0.04 : 0.96), txt: String(c.lv), s: 'hval' });
          B.a3({ t: 'seg', id, a: [c.a[0], c.a[1], c.lv], b: [c.b[0], c.b[1], c.lv], s: pre === 'wa' ? 'cont' : 'aux', w: 0.6 });
          B.info(id, 'Warstwica płaszczyzny ' + nmP + ' o cesze ' + c.lv);
        })
      );
      // krawędź k
      const inter = [];
      csA.forEach((a) => {
        const b = csB.find((q) => q.lv === a.lv);
        if (!b) return;
        const r = G.line2(a.a, a.b, b.a, b.b);
        if (r && r.t > -0.05 && r.t < 1.05 && r.u > -0.05 && r.u < 1.05) inter.push({ lv: a.lv, p: r.p });
      });
      B.step({
        title: 'Krawędź przecięcia k = α ∩ β',
        co: inter.length >= 2 ? 'Punkty przecięcia warstwic o równych cechach: ' + inter.map((q) => q.lv).join(', ') + ' → prosta <b>k</b>.' : 'Za mało przecięć warstwic w obszarze rysunku.',
        jak: 'Wybieramy dwie pary warstwic o tej samej cesze (najlepiej odległe), ich punkty przecięcia łączymy. Pozostałe przecięcia służą do kontroli – muszą leżeć na k.',
        why: 'Punkt przecięcia warstwic o cesze n leży na wysokości n w obu płaszczyznach – należy do obu, więc do ich krawędzi. Krawędź jest prostą, wystarczą dwa punkty.',
      });
      if (inter.length >= 2) {
        const a = inter[0].p,
          b = inter[inter.length - 1].p;
        const c = G.clipLine2(a, V.sub(b, a), [box[0], box[1], box[2], box[3]]);
        if (c) {
          B.a2({ t: 'seg', id: 'k', a: c[0], b: c[1], s: 'res2', label: 'k', labelAt: 0.95 });
          B.a3({ t: 'seg', id: 'k', a: [c[0][0], c[0][1], al.f(c[0][0], c[0][1])], b: [c[1][0], c[1][1], al.f(c[1][0], c[1][1])], s: 'res2', label: 'k' });
          B.info('k', 'Krawędź przecięcia płaszczyzn α i β');
        }
        inter.forEach((q) => {
          B.a2({ t: 'pt', id: 'k' + q.lv, p: q.p, s: 'res2', r: 2.6 });
          B.a3({ t: 'pt', id: 'k' + q.lv, p: [q.p[0], q.p[1], q.lv], s: 'res2', small: true });
          B.info('k' + q.lv, 'Punkt krawędzi k o cesze ' + q.lv + ': przecięcie warstwic ' + q.lv + ' płaszczyzn α i β', ['wa' + q.lv, 'wb' + q.lv]);
          B.src('wa' + q.lv, 'wb' + q.lv);
        });
      }
      // przebicie
      const ints = rangeInt(D[2], E[2]);
      const lp = ints.map((k) => ({ k, p: V.lerp(D, E, (k - D[2]) / (E[2] - D[2])) }));
      const gdir = V.norm(V.perp2(V.sub(P2(E), P2(D))));
      const gdir2 = V.norm(V.add(gdir, V.mul(V.norm(V.sub(P2(E), P2(D))), 0.6)));
      B.step({
        title: 'Stopniowanie l i płaszczyzna pomocnicza γ ⊃ l',
        co: 'Punkty całkowite prostej l: ' + ints.join(', ') + '. Przez l prowadzimy płaszczyznę <b>γ</b>: jej warstwice to równoległe proste (dowolny kierunek) przez punkty całkowite l.',
        jak: 'Stopniujemy DE (Tales, jak w 5.1). Przez każdy punkt całkowity prowadzimy prostą w jednym, dowolnie wybranym kierunku – to warstwice γ.',
        why: 'Prosta pozioma przechodząca przez punkt l o cesze n i każda inna pozioma o cesze n leżąca na „pasie” wyznaczają płaszczyznę zawierającą l – wybór kierunku jest dowolny, bo przez prostą przechodzi nieskończenie wiele płaszczyzn.',
      });
      lp.forEach((q) => {
        B.a2({ t: 'pt', id: 'l' + q.k, p: P2(q.p), s: 'given', r: 2, label: String(q.k), labCls: 'small' });
        B.a3({ t: 'pt', id: 'l' + q.k, p: q.p, s: 'given', small: true });
        const a = V.add(P2(q.p), V.mul(gdir2, -9)),
          b = V.add(P2(q.p), V.mul(gdir2, 9));
        B.a2({ t: 'seg', id: 'wg' + q.k, a, b, s: 'aux2', w: 0.9 });
        B.a3({ t: 'seg', id: 'wg' + q.k, a: [a[0], a[1], q.k], b: [b[0], b[1], q.k], s: 'aux2', w: 0.6 });
        B.info('wg' + q.k, 'Warstwica płaszczyzny pomocniczej γ o cesze ' + q.k);
      });
      // m = α ∩ γ
      const mpts = [];
      lp.forEach((q) => {
        const wa = csA.find((c) => c.lv === q.k);
        if (!wa) return;
        const a = V.add(P2(q.p), V.mul(gdir2, -9)),
          b = V.add(P2(q.p), V.mul(gdir2, 9));
        const r = G.line2(a, b, wa.a, wa.b);
        if (r) mpts.push({ k: q.k, p: r.p });
      });
      const rP = (() => {
        // analitycznie: l ∩ α
        const fD = D[2] - al.f(D[0], D[1]),
          fE = E[2] - al.f(E[0], E[1]);
        const t = fD / (fD - fE);
        return { t, P: V.lerp(D, E, t) };
      })();
      B.step({
        title: 'Prosta m = α ∩ γ i punkt przebicia P',
        co: 'Przecięcia równocechowych warstwic α i γ wyznaczają prostą <b>m</b>; <b>P = m ∩ l</b> – punkt przebicia (cecha ' + f1(rP.P[2]) + ').',
        jak: 'Wystarczą dwa punkty m (warstwice o tych samych cechach). Gdzie m przetnie l – tam P.',
        why: 'l i m leżą w jednej płaszczyźnie γ, więc się przecinają. Punkt wspólny leży na l i na m ⊂ α – to przebicie. Ta sama idea co w Monge’u (płaszczyzna pomocnicza), tylko zamiast rzutu pionowego pracujemy cechami.',
      });
      if (mpts.length >= 2) {
        const a = mpts[0].p,
          b = mpts[mpts.length - 1].p;
        const ext = (u, v) => [V.add(u, V.mul(V.sub(u, v), 0.25)), V.add(v, V.mul(V.sub(v, u), 0.25))];
        let [ma, mb] = ext(a, b);
        const cm = G.clipLine2(a, V.sub(b, a), [box[0], box[1], box[2], box[3]]);
        if (cm) [ma, mb] = cm;
        B.a2({ t: 'seg', id: 'm', a: ma, b: mb, s: 'aux', label: 'm' });
        mpts.forEach((q) => {
          B.a2({ t: 'pt', id: 'm' + q.k, p: q.p, s: 'aux', r: 2.4 });
          B.info('m' + q.k, 'Punkt prostej m (cecha ' + q.k + '): warstwica α ∩ warstwica γ', ['wa' + q.k, 'wg' + q.k]);
        });
        B.info('m', 'm = α ∩ γ');
      }
      B.a2({ t: 'pt', id: 'P', p: P2(rP.P), s: 'res', label: cecha('P', rP.P[2]) });
      B.a3({ t: 'pt', id: 'P', p: rP.P, s: 'res', label: 'P' });
      B.info('P', 'Punkt przebicia prostej l z płaszczyzną α');
      // widoczność
      B.step({
        title: 'Widoczność prostej l względem α',
        co: 'Patrzymy z góry: widoczna jest część l leżąca <b>nad</b> płaszczyzną α.',
        jak: 'Porównujemy cechę punktu l (np. D: ' + f1(D[2]) + ') z cechą α w tym samym miejscu (' + f1(al.f(D[0], D[1])) + ') → ' + (D[2] > al.f(D[0], D[1]) ? 'D jest nad α – odcinek DP widoczny.' : 'D jest pod α – odcinek DP niewidoczny.') + ' Za P widoczność się odwraca.',
        why: 'W rzucie z góry zasłania to, co wyżej. Zmiana „nad/pod” następuje dokładnie w punkcie przebicia.',
        cam: { dir: [0.3, 0.8, 1] },
      });
      B.end('l');
      const visD = D[2] > al.f(D[0], D[1]);
      B.a2({ t: 'seg', id: 'l', a: P2(D), b: P2(rP.P), s: visD ? 'vis' : 'hid' });
      B.a2({ t: 'seg', id: 'l', a: P2(rP.P), b: P2(E), s: visD ? 'hid' : 'vis' });
      B.a3({ t: 'seg', id: 'l', a: D, b: E, s: 'given' });
    },
  });

  /* =================================================================
     5.5 Krawędź przenikania dwóch wieloboków (Lista 5, zad. 4)
     ================================================================= */
  const L5Z4 = {
    ABCD: [
      [3.37, 8.93, 3],
      [10.73, 4.23, 1],
      [12.87, 15.0, -1],
      [5.13, 20.37, 1],
    ],
    EFG: [
      [5.17, 2.2, 0],
      [15.2, 11.17, 3],
      [7.27, 16.57, 2],
    ],
  };
  GW.addLesson({
    id: 'm5-wieloboki',
    mod: 5,
    zExag: 'auto',
    lista: 'L5 Z4',
    title: '5.5 Krawędź przenikania dwóch wieloboków',
    v2title: 'Rzut cechowany – przenikanie wieloboków ABCD i EFG',
    params: [
      { k: 'dE', l: 'zmiana cechy E', min: -3, max: 3, step: 0.5, v: 0 },
      { k: 'dF', l: 'zmiana cechy F', min: -3, max: 3, step: 0.5, v: 0 },
      { k: 'dG', l: 'zmiana cechy G', min: -3, max: 3, step: 0.5, v: 0 },
    ],
    measureInfo,
    mistakes: ['Krawędź przenikania ograniczamy do części <b>wspólnej obu wieloboków</b> – nie rysujemy jej na całej długości prostej k.', 'Widoczność boków ustalamy w każdym „oknie” rzutu: wyżej leżący wielobok zasłania niżej leżący.'],
    algo:
      '<ol><li>Stopniujemy boki obu wieloboków i rysujemy warstwice obu płaszczyzn.</li>' +
      '<li><b>Prosta k</b> = przez punkty przecięcia warstwic o równych cechach.</li>' +
      '<li>Część k leżąca jednocześnie w obu wielobokach = <b>krawędź przenikania</b> MN (jej końce to przebicia boków jednego wieloboku z drugim).</li>' +
      '<li><b>Widoczność</b> z góry: po jednej stronie MN wyżej jest jeden wielobok, po drugiej – drugi.</li></ol>',
    build(p, B) {
      const D5 = p.set === 'gen' && p.gen ? p.gen : L5Z4;
      const Q = D5.ABCD.map((q) => q.slice());
      const pfQ = planeFn(Q[0], Q[1], Q[2]);
      Q[3][2] = pfQ.f(Q[3][0], Q[3][1]);
      const T = D5.EFG.map((q, i) => [q[0], q[1], q[2] + [p.dE || 0, p.dF || 0, p.dG || 0][i]]);
      const pfT = planeFn(T[0], T[1], T[2]);
      const box = [0, 0, 18, 24];
      B.data.F = (x, y) => (G.pointInPoly2([x, y], Q.map(P2)) ? pfQ.f(x, y) : G.pointInPoly2([x, y], T.map(P2)) ? pfT.f(x, y) : NaN);
      B.data.box = box;
      const nQ = ['A', 'B', 'C', 'D'],
        nT = ['E', 'F', 'G'];
      B.step({
        title: 'Dane: wieloboki ABCD i EFG',
        co: 'Wielobok ' + nQ.map((n, i) => cecha(n, Q[i][2])).join(', ') + ' oraz trójkąt ' + nT.map((n, i) => cecha(n, T[i][2])).join(', ') + '. Wyznaczyć krawędź przenikania i widoczność.',
        jak: 'Najedź na wierzchołki – w 3D zobaczysz ich wysokości.',
        why: 'Dwa wieloboki płaskie przenikają się wzdłuż odcinka leżącego na krawędzi przecięcia ich płaszczyzn.',
        cam: { dir: [0.4, 0.9, 0.9] },
      });
      refPlane(B, box, -2);
      [
        [Q, nQ, '#e8c060', 'Q'],
        [T, nT, '#7fb3e0', 'T'],
      ].forEach(([pts, nm, col, tag]) => {
        B.a2({ t: 'pl', id: tag, pts: pts.map(P2), closed: true, s: 'given' });
        B.a3({ t: 'poly', id: tag, pts, col, op: 0.45 });
        B.a3({ t: 'pl', id: tag, pts, closed: true, s: 'given' });
        pts.forEach((P, i) => drawPtC(B, tag + nm[i], P, nm[i], 'given', 'Wierzchołek ' + nm[i] + ' (cecha ' + f1(P[2]) + ')'));
      });
      B.info('Q', 'Wielobok ABCD');
      B.info('T', 'Wielobok EFG');
      const lv = rangeInt(-2, 6);
      const cQ = contourClip(pfQ, Q.map(P2), lv),
        cT = contourClip(pfT, T.map(P2), lv);
      B.step({
        title: 'Stopniowanie boków i warstwice obu płaszczyzn',
        co: 'Warstwice ABCD (brązowe) i EFG (niebieskie) co 1 m.',
        jak: 'Na bokach o różnych cechach wyznaczamy punkty całkowite (Tales) i łączymy równe cechy.',
        why: 'Warstwice to proste poziome – przecięcie dwóch płaszczyzn znajdziemy, porównując warstwice o tej samej cesze.',
      });
      [
        [cQ, 'wq', 'cont'],
        [cT, 'wt', 'aux'],
      ].forEach(([cs, pre, st]) =>
        cs.forEach((c) => {
          B.a2({ t: 'seg', id: pre + c.lv, a: c.a, b: c.b, s: st, w: 0.9 });
          B.a2({ t: 'text', id: pre + c.lv, p: V.lerp(c.a, c.b, pre === 'wq' ? 0.08 : 0.92), txt: String(c.lv), s: 'hval' });
          B.a3({ t: 'seg', id: pre + c.lv, a: [c.a[0], c.a[1], c.lv], b: [c.b[0], c.b[1], c.lv], s: st, w: 0.6 });
          B.info(pre + c.lv, 'Warstwica ' + (pre === 'wq' ? 'ABCD' : 'EFG') + ' o cesze ' + c.lv);
        })
      );
      // prosta k
      const big = [[-60, -60], [80, -60], [80, 80], [-60, 80]];
      const ip = [];
      lv.forEach((k) => {
        const a = planeContours(pfQ, big, [k])[0],
          b = planeContours(pfT, big, [k])[0];
        if (!a || !b) return;
        const r = G.line2(a.a, a.b, b.a, b.b);
        if (r) ip.push({ k, p: r.p, wq: cQ.find((c) => c.lv === k), wt: cT.find((c) => c.lv === k) });
      });
      // do konstrukcji bierzemy dwie pary warstwic (narysowanych w obu wielobokach), których przecięcia leżą najbliżej rysunku
      const ctr = G.centroid(Q.map(P2).concat(T.map(P2)));
      const cand = ip.filter((q) => q.wq && q.wt);
      const used = (cand.length >= 2 ? cand : ip)
        .slice()
        .sort((a, b) => V.dist(a.p, ctr) - V.dist(b.p, ctr))
        .slice(0, 2)
        .sort((a, b) => a.k - b.k);
      // czy punkt prostej warstwicy leży na jej narysowanym (przyciętym do wieloboku) odcinku
      const onSeg = (q, c) => {
        if (!c) return false;
        const d = V.sub(c.b, c.a);
        const t = V.dot(V.sub(q, c.a), d) / V.dot(d, d);
        return t >= -1e-6 && t <= 1 + 1e-6;
      };
      const inBox = (q) => q[0] >= box[0] && q[0] <= box[2] && q[1] >= box[1] && q[1] <= box[3];
      const outside = used.filter((q) => !inBox(q.p) || !onSeg(q.p, q.wq) || !onSeg(q.p, q.wt));
      B.step({
        title: 'Prosta k = krawędź przecięcia płaszczyzn',
        co:
          used.length === 2
            ? 'Bierzemy warstwice o cechach <b>' + used[0].k + '</b> i <b>' + used[1].k + '</b> obu płaszczyzn. Punkty przecięcia warstwic o równych cechach (' + used.map((q) => q.k + '–' + q.k).join(', ') + ') łączymy → prosta <b>k</b>.'
            : 'Za mało przecięć warstwic o równych cechach.',
        jak:
          (outside.length ? 'Warstwice o ' + (outside.length === 2 ? 'obu cechach' : 'cesze ' + outside[0].k) + ' przecinają się poza wielobokami – <b>przedłużamy je</b> (kreskowo) aż do punktu przecięcia. ' : '') +
          'Wybieramy pary, które przecinają się najbliżej rysunku; pozostałe przecięcia leżą na tej samej prostej (kontrola).',
        why: 'Punkt przecięcia warstwic o cesze n leży na wysokości n w obu płaszczyznach – należy do ich krawędzi. Krawędź jest prostą, wystarczą dwa punkty. Płaszczyzny nie kończą się na brzegach wieloboków, dlatego warstwice wolno przedłużać.',
      });
      if (used.length === 2) {
        const [u1, u2] = used;
        const kd = V.norm(V.sub(u2.p, u1.p));
        // zakres k: oba punkty i oba wieloboki, z zapasem
        const ts = [u1.p, u2.p].concat(Q.map(P2), T.map(P2)).map((q) => V.dot(V.sub(q, u1.p), kd));
        const t0 = Math.min(...ts) - 3,
          t1 = Math.max(...ts) + 3;
        const ka = V.add(u1.p, V.mul(kd, t0)),
          kb = V.add(u1.p, V.mul(kd, t1));
        const z3 = (q) => [q[0], q[1], pfQ.f(q[0], q[1])];
        B.a2({ t: 'seg', id: 'k', a: ka, b: kb, s: 'res2', label: "k'", labelAt: 0.97 });
        B.a3({ t: 'seg', id: 'k', a: z3(ka), b: z3(kb), s: 'res2', label: 'k' });
        B.info('k', 'Prosta k – krawędź przecięcia płaszczyzn obu wieloboków (przez punkty ' + u1.k + ' i ' + u2.k + ')');
        used.forEach((q) => {
          const id = 'k' + q.k;
          // przedłużenia warstwic od bliższego końca do punktu przecięcia
          [
            [q.wq, 'wq', 'cont'],
            [q.wt, 'wt', 'aux'],
          ].forEach(([c, pre, st]) => {
            if (!c || onSeg(q.p, c)) return;
            const e = V.dist(c.a, q.p) < V.dist(c.b, q.p) ? c.a : c.b;
            B.a2({ t: 'seg', id: pre + q.k, a: e, b: q.p, s: st, w: 0.9, dash: true });
            B.a3({ t: 'seg', id: pre + q.k, a: [e[0], e[1], q.k], b: [q.p[0], q.p[1], q.k], s: st, dash: true });
          });
          B.a2({ t: 'pt', id, p: q.p, s: 'res2', r: 2.6, label: String(q.k), labCls: 'small' });
          B.a3({ t: 'pt', id, p: [q.p[0], q.p[1], q.k], s: 'res2', small: true, label: String(q.k) });
          B.info(id, 'Punkt prostej k o cesze ' + q.k + ': przecięcie warstwic ' + q.k + ' obu płaszczyzn', ['wq' + q.k, 'wt' + q.k]);
          B.src('wq' + q.k, 'wt' + q.k);
        });
      }
      // MN
      const S1 = new G.Polyhedron([Q]),
        S2 = new G.Polyhedron([T]);
      const segs = G.solidIntersection(S1, S2);
      B.step({
        title: 'Krawędź przenikania MN',
        co: segs.length ? 'Z prostej k bierzemy część leżącą w obu wielobokach: odcinek <b>MN</b>.' : 'Wieloboki się nie przenikają (k omija część wspólną).',
        jak: 'Końce M, N to punkty, w których k wychodzi z jednego z wieloboków – czyli przebicia boków jednego wieloboku płaszczyzną drugiego.',
        why: 'Punkt krawędzi przenikania musi należeć do obu figur, nie tylko do obu płaszczyzn.',
      });
      B.data.ok = segs.length > 0;
      segs.forEach((s, i) => {
        B.a2({ t: 'seg', id: 'MN', a: P2(s.a), b: P2(s.b), s: 'res' });
        B.a3({ t: 'seg', id: 'MN', a: s.a, b: s.b, s: 'res' });
        B.a2({ t: 'pt', id: 'M', p: P2(s.a), s: 'res', label: cecha('M', s.a[2]) });
        B.a2({ t: 'pt', id: 'N', p: P2(s.b), s: 'res', label: cecha('N', s.b[2]) });
        B.a3({ t: 'pt', id: 'M', p: s.a, s: 'res', label: 'M' });
        B.a3({ t: 'pt', id: 'N', p: s.b, s: 'res', label: 'N' });
      });
      B.info('MN', 'Krawędź przenikania wieloboków');
      // widoczność
      B.step({
        title: 'Widoczność wieloboków',
        co: 'Boki widoczne z góry – grubo, zasłonięte – kreskowo cienko.',
        jak: 'W miejscu, gdzie rzuty boków się krzyżują, porównujemy cechy obu punktów zbieżnych: wyżej leżący jest widoczny. Widoczność zmienia się na MN.',
        why: 'Z góry zasłania to, co wyżej – po każdej stronie krawędzi przenikania wyżej leży inny wielobok.',
        cam: { dir: [0.2, 0.4, 1] },
      });
      B.end('Q', 'T');
      const edges = [];
      [Q, T].forEach((pts) => pts.forEach((a, i) => edges.push({ a, b: pts[(i + 1) % pts.length] })));
      const faces = [
        { pts: Q, pl: G.plane3(Q[0], Q[1], Q[2]) },
        { pts: T, pl: G.plane3(T[0], T[1], T[2]) },
      ];
      G.hlr(edges, faces, { dir: [0, 0, 1] }).forEach((pc) => B.a2({ t: 'seg', id: 'vis', a: P2(pc.a), b: P2(pc.b), s: pc.st === 'vis' ? 'vis' : 'hid' }));
      B.info('vis', 'Bok wieloboku z widocznością');
      B.a3({ t: 'pl', id: 'Q', pts: Q, closed: true, s: 'given' });
      B.a3({ t: 'pl', id: 'T', pts: T, closed: true, s: 'given' });
    },
  });

  /* =================================================================
     5.6 Roboty ziemne: platforma / droga na terenie
     ================================================================= */
  /* teren z warstwic (interpolacja odległościowa między sąsiednimi warstwicami) */
  function contourTerrain(contours, box, nx = 220, ny = 220) {
    const cs = contours
      .map((c) => {
        const pts = c.pts;
        const n = pts.length;
        const d0 = V.norm(V.sub(pts[0], pts[1])),
          d1 = V.norm(V.sub(pts[n - 1], pts[n - 2]));
        return { h: c.h, pts: [V.add(pts[0], V.mul(d0, 400))].concat(pts, [V.add(pts[n - 1], V.mul(d1, 400))]) };
      })
      .sort((a, b) => a.h - b.h);
    const near = (q, P) => {
      let bd = 1e18,
        side = 1;
      for (let i = 0; i + 1 < P.length; i++) {
        const a = P[i],
          b = P[i + 1];
        const e = V.sub(b, a);
        const L2 = V.dot(e, e);
        let t = V.dot(V.sub(q, a), e) / L2;
        t = Math.max(0, Math.min(1, t));
        const X = V.add(a, V.mul(e, t));
        const d = V.dist(q, X);
        if (d < bd - 1e-12) {
          bd = d;
          let dir = e;
          if (t <= 0 && i > 0) dir = V.sub(b, P[i - 1]);
          if (t >= 1 && i + 2 < P.length) dir = V.sub(P[i + 2], a);
          side = V.cross2(dir, V.sub(q, X)) >= 0 ? 1 : -1;
        }
      }
      return { d: bd, side };
    };
    // orientacja: strona wyższa
    cs.forEach((c, i) => {
      const m = c.pts[Math.floor(c.pts.length / 2)];
      const other = cs[i + 1] || cs[i - 1];
      const r = near(m, other.pts);
      const sOther = (() => {
        // strona, po której leży sąsiednia warstwica
        const q = other.pts[Math.floor(other.pts.length / 2)];
        return near(q, c.pts).side;
      })();
      void r;
      c.up = cs[i + 1] ? sOther : -sOther;
    });
    const raw = (x, y) => {
      const q = [x, y];
      const info = cs.map((c) => {
        const r = near(q, c.pts);
        return { d: r.d, up: r.side === c.up, h: c.h };
      });
      let i = -1;
      for (let k = 0; k < info.length; k++) if (info[k].up) i = k;
      if (i >= 0 && i < info.length - 1) {
        const a = info[i],
          b = info[i + 1];
        return a.h + ((b.h - a.h) * a.d) / (a.d + b.d + 1e-12);
      }
      if (i === info.length - 1) {
        const a = info[i],
          b = info[i - 1];
        const sp = Math.max(1, b.d - a.d);
        return a.h + 0.95 * Math.tanh((((a.h - b.h) * a.d) / sp) / 0.95);
      }
      const a = info[0],
        b = info[1];
      const sp = Math.max(1, b.d - a.d);
      return a.h - 0.95 * Math.tanh((((b.h - a.h) * a.d) / sp) / 0.95);
    };
    // siatka + interpolacja dwuliniowa (szybko)
    const gx0 = box[0],
      gy0 = box[1],
      sx = (box[2] - box[0]) / nx,
      sy = (box[3] - box[1]) / ny;
    const Gd = new Float64Array((nx + 1) * (ny + 1));
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) Gd[j * (nx + 1) + i] = raw(gx0 + i * sx, gy0 + j * sy);
    return (x, y) => {
      let fx = (x - gx0) / sx,
        fy = (y - gy0) / sy;
      fx = Math.max(0, Math.min(nx - 1e-9, fx));
      fy = Math.max(0, Math.min(ny - 1e-9, fy));
      const i = Math.floor(fx),
        j = Math.floor(fy);
      const u = fx - i,
        v = fy - j;
      const w = nx + 1;
      return Gd[j * w + i] * (1 - u) * (1 - v) + Gd[j * w + i + 1] * u * (1 - v) + Gd[(j + 1) * w + i] * (1 - u) * v + Gd[(j + 1) * w + i + 1] * u * v;
    };
  }
  const pxC = (arr, f) => arr.map((q) => f(q));
  const EW = {
    L5Z1: (() => {
      const k = 4.6;
      const tr = (q) => [q[0] / k, q[1] / k];
      const C = [
        [73, [[70, 437], [200, 432], [300, 420], [400, 400], [470, 375], [530, 345], [580, 300], [630, 245], [680, 185], [718, 130]]],
        [72, [[70, 551], [200, 545], [300, 532], [400, 512], [480, 485], [545, 455], [600, 410], [650, 365], [700, 320], [750, 250], [800, 190], [848, 130]]],
        [71, [[205, 722], [300, 690], [400, 650], [500, 605], [560, 570], [650, 500], [720, 445], [777, 395], [850, 320], [920, 250], [990, 180], [1043, 137]]],
        [70, [[523, 732], [600, 680], [700, 620], [777, 570], [850, 500], [920, 430], [1000, 360], [1100, 290], [1200, 230], [1280, 177]]],
      ];
      return {
        name: '📋 Lista 5 · zad. 1: platforma +72 i droga dojazdowa (do +70)',
        contours: C.map(([h, pts]) => ({ h, pts: pxC(pts, tr) })),
        box: [0, 0, 1321 / k, 831 / k],
        outline: [
          [545, 307, 72],
          [777, 307, 72],
          [777, 507, 72],
          [777, 665, 70],
          [693, 665, 70],
          [693, 507, 72],
          [545, 507, 72],
        ].map((q) => tr(q).concat([q[2]])),
        hD: (x, y) => {
          const py = y * k;
          return py <= 507 ? 72 : 72 - (2 * (py - 507)) / (665 - 507);
        },
        mw: 10,
        mn: 10,
        unit: 'mm',
        spots: [
          [215, 255, 73],
          [1060, 515, 70],
        ].map((q) => tr(q).concat([q[2]])),
        note: 'Moduły skarp m<sub>w</sub> = m<sub>n</sub> (z podziałki na rysunku); droga opada od platformy +72 do +70 (jak w wersji aksonometrycznej z wykładu).',
      };
    })(),
    L5Z5: (() => {
      const k = 6.5;
      const tr = (q) => [q[0] / k, q[1] / k];
      const C = [
        [44, [[50, 345], [100, 330], [150, 315], [200, 300], [250, 282], [300, 262], [350, 240], [400, 215], [450, 185], [500, 150], [550, 112], [600, 72], [645, 37]]],
        [43, [[50, 457], [100, 440], [150, 425], [200, 408], [250, 390], [300, 370], [350, 345], [400, 315], [450, 285], [500, 255], [550, 220], [600, 188], [650, 155]]],
        [42, [[45, 580], [100, 557], [150, 537], [218, 510], [300, 470], [350, 442], [400, 415], [440, 397], [500, 360], [550, 320], [600, 285], [650, 257]]],
        [41, [[45, 795], [100, 768], [150, 742], [200, 715], [250, 688], [300, 660], [350, 632], [400, 600], [450, 568], [500, 532], [530, 505], [560, 478], [600, 450], [650, 412]]],
        [40, [[318, 832], [400, 790], [500, 735], [600, 665], [652, 610]]],
      ];
      return {
        name: '📋 Lista 5 · zad. 5: platforma +42 i droga wznosząca się do (44)',
        contours: C.map(([h, pts]) => ({ h, pts: pxC(pts, tr) })),
        box: [0, 0, 697 / k, 866 / k],
        outline: [
          [218, 185, 44],
          [318, 185, 44],
          [318, 397, 42],
          [530, 397, 42],
          [530, 605, 42],
          [218, 605, 42],
          [218, 397, 42],
        ].map((q) => tr(q).concat([q[2]])),
        hD: (x, y) => {
          const py = y * k;
          return py >= 397 ? 42 : 42 + (2 * (397 - py)) / (397 - 185);
        },
        mw: 8,
        mn: 11,
        unit: 'mm',
        spots: [
          [360, 70, 44],
          [580, 770, 40],
        ].map((q) => tr(q).concat([q[2]])),
        note: 'Moduły: m<sub>w</sub> = 8 mm, m<sub>n</sub> = 11 mm (w treści „1.1” – na rysunku pasek m<sub>n</sub> jest ok. 1,4× dłuższy od m<sub>w</sub>, więc przyjęto 11 mm).',
      };
    })(),
    droga: (() => {
      const T = (x, y) => 24.2 + 0.035 * x + 2.6 * Math.exp(-((x - 46) ** 2 + (y - 40) ** 2) / 260) - 1.4 * Math.exp(-((x - 20) ** 2 + (y - 12) ** 2) / 200) + 0.012 * y;
      const a = [4, 14],
        b = [76, 38];
      const d = V.norm(V.sub(b, a)),
        n = V.perp2(d);
      const w = 4;
      const P = (q, s, h) => V.add(q, V.mul(n, s)).concat([h]);
      return {
        name: 'Przykład z książki: droga pochyła I(25) → II(27) w terenie (stożki skarp)',
        T,
        box: [0, 0, 80, 56],
        outline: [P(a, -w, 25), P(b, -w, 27), P(b, w, 27), P(a, w, 25)],
        open: [false, true, false, true],
        hD: (x, y) => 25 + (2 * V.dot(V.sub([x, y], a), d)) / V.dist(a, b),
        mw: 1,
        mn: 1.5,
        unit: 'm',
        note: 'Droga o szerokości 8 m wznosi się od I(25) do II(27). Krawędzie drogi są pochyłe, więc skarpy wyznaczamy <b>stożkami</b>: z punktu krawędzi o cesze k zakreślamy okrąg o promieniu m (dla cechy k ∓ 1), a warstwica skarpy jest styczna do okręgów.',
      };
    })(),
    plac: (() => {
      const T = (x, y) => 3 + 0.085 * x + 0.04 * y + 3 * Math.exp(-((x - 60) ** 2 + (y - 15) ** 2) / 300) - 2 * Math.exp(-((x - 20) ** 2 + (y - 45) ** 2) / 250);
      const c = [40, 30],
        th = G.rad(15);
      const R = (q) => [c[0] + q[0] * Math.cos(th) - q[1] * Math.sin(th), c[1] + q[0] * Math.sin(th) + q[1] * Math.cos(th)];
      const pts = [
        [-12, -7],
        [12, -7],
        [12, 7],
        [-12, 7],
      ].map((q) => R(q).concat([7.5]));
      return { name: 'Przykład: plac poziomy +7,5 na stoku ze wzgórzem', T, box: [0, 0, 80, 60], outline: pts, hD: () => 7.5, mw: 1, mn: 1.5, unit: 'm', note: 'Skarpy: wykop 1:1, nasyp 1:1,5.' };
    })(),
  };
  /* obwiednia stożków wzdłuż krawędzi o liniowo zmiennej cesze (zamknięta postać) */
  function edgeEnv(e, q, m, fill) {
    const d = e.d,
      L = e.L;
    const w = V.sub(q, e.a);
    const sq = V.dot(w, d);
    const r = Math.abs(V.cross2(d, w));
    const g = (e.hb - e.ha) / L;
    const u = g * m;
    let s;
    if (Math.abs(u) < 0.999999) s = fill ? sq + (r * u) / Math.sqrt(1 - u * u) : sq - (r * u) / Math.sqrt(1 - u * u);
    else s = fill ? (u > 0 ? L : 0) : u > 0 ? 0 : L;
    s = Math.max(0, Math.min(L, s));
    const dist = Math.hypot(s - sq, r);
    return fill ? e.ha + g * s - dist / m : e.ha + g * s + dist / m;
  }
  /* płaszczyzna skarpy przy krawędzi (bez zaokrąglania na końcach krawędzi):
     krawędź pozioma – warstwice ∥ krawędzi; pochyła – płaszczyzna styczna do stożków */
  const edgeSteep = (e, m) => Math.abs(((e.hb - e.ha) / e.L) * m) >= 0.999;
  function edgeGrad(e, m, fill) {
    const g = (e.hb - e.ha) / e.L;
    const c = Math.sqrt(Math.max(0, 1 - g * g * m * m));
    return V.add(V.mul(e.d, g), V.mul(e.nout, ((fill ? -1 : 1) * c) / m));
  }
  function edgePlane(e, q, m, fill) {
    if (edgeSteep(e, m)) return edgeEnv(e, q, m, fill);
    return e.ha + V.dot(V.sub(q, e.a), edgeGrad(e, m, fill));
  }

  GW.EW = EW;
  GW.addLesson({
    id: 'm5-skarpy',
    mod: 5,
    zExag: 'auto',
    lista: 'L5 Z1, Z5',
    title: '5.6 Roboty ziemne: skarpy nasypów i wykopów (platforma, droga)',
    v2title: 'Plan warstwicowy – granice robót ziemnych',
    opts: [
      {
        k: 'set',
        l: 'Zadanie',
        choices: Object.keys(EW).map((k) => [k, EW[k].name]),
        v: 'L5Z1',
        rebuildFrame: true,
      },
    ],
    params: [
      { k: 'dH', l: 'zmiana cech projektu [m]', min: -1.5, max: 1.5, step: 0.25, v: 0 },
      { k: 'kw', l: 'mnożnik modułu wykopu', min: 0.5, max: 2, step: 0.1, v: 1 },
      { k: 'kn', l: 'mnożnik modułu nasypu', min: 0.5, max: 2, step: 0.1, v: 1 },
    ],
    measureInfo,
    mistakes: [],
    special: {
      note: '<b>Model terenu 3D + mapa.</b> Najedź na mapę: kropla popłynie po terenie i skarpach (tryb wyświetlania poniżej). Suwak „przewyższenie” nad widokiem 3D podnosi rzeźbę terenu (rysunek 2D się nie zmienia).',
      ui: [
        { type: 'select', k: 'water', l: 'Spływ wody (kropla pod kursorem i krople animowane)', choices: [['off', 'brak'], ['2d', 'tylko w 2D'], ['3d', 'tylko w 3D'], ['both', '2D + 3D']], v: '3d', persist: 'water' },
        { type: 'check', k: 'orig', l: 'pokaż pierwotny teren (półprzezroczysty)', v: false },
      ],
      bind(c) {
        c.v2.onBgMove = (P) => {
          c.S.cursor = P;
          c.app.refreshOverlay();
        };
      },
      overlay(c) {
        const d = c.data;
        if (!d.F) return {};
        const F = c.k >= d.finalStep ? d.F : d.T;
        const r = waterOverlay(c, F, d.box, c.S.cursor, c.k >= d.finalStep, 120);
        if (c.S.orig && c.k >= d.finalStep) r.p3.push(surfPrim('orig', (x, y) => d.T(x, y) + 0.02, d.box, 80, 60, () => '#6aa84f', 0.35));
        return { p2: r.p2, p3: r.p3, info: { flow: 'Droga spływu wody – linia największego spadku (⟂ warstwic)' } };
      },
    },
    algo:
      '<ol><li><b>Linia zerowa</b>: na brzegach obiektu szukamy punktów, gdzie teren ma cechę projektu (interpolacja między warstwicami). Dzieli ona obiekt na część w <b>nasypie</b> (teren niżej) i w <b>wykopie</b> (teren wyżej).</li>' +
      '<li><b>Skarpy przy krawędzi poziomej</b>: warstwice skarpy ∥ krawędzi w odstępach m<sub>n</sub> (nasyp, w dół) lub m<sub>w</sub> (wykop, w górę).</li>' +
      '<li><b>Skarpy przy krawędzi pochyłej</b> (droga): z punktów krawędzi o cechach całkowitych zakreślamy okręgi (podstawy stożków o tworzących nachylonych jak skarpa): promień = m·Δh. Warstwica skarpy jest wspólną styczną okręgów o tej samej cesze.</li>' +
      '<li><b>Granica robót</b>: punkty przecięcia warstwic skarpy i terenu o tej samej cesze, połączone płynną linią.</li>' +
      '<li><b>Naroża</b>: krawędź dwóch sąsiednich skarp – przez przecięcia ich równocechowych warstwic.</li></ol>',
    build(p, B) {
      const cfg = p.set === 'gen' && p.gen ? GW.genEW(p.gen) : EW[p.set] || EW.L5Z1;
      const box = cfg.box;
      const T = cfg.T || cfg._T || (cfg._T = contourTerrain(cfg.contours, box, 160, 160));
      const dH = p.dH || 0;
      const mw = cfg.mw * (p.kw || 1),
        mn = cfg.mn * (p.kn || 1);
      const out = cfg.outline.map((q) => [q[0], q[1], q[2] + dH]);
      const poly = out.map(P2);
      const area = G.polyArea2(poly);
      const ne = out.length;
      const edges = out.map((a, i) => {
        const b = out[(i + 1) % ne];
        const d = V.norm(V.sub(P2(b), P2(a)));
        let nout = V.perp2(d);
        if (area > 0) nout = V.mul(nout, -1);
        return { a: P2(a), b: P2(b), ha: a[2], hb: b[2], d, L: V.dist(P2(a), P2(b)), nout, open: cfg.open ? cfg.open[i] : false, i };
      });
      const slopeE = edges.filter((e) => !e.open);
      const inside = (P) => G.pointInPoly2(P, poly);
      const hD = (x, y) => cfg.hD(x, y) + dH;
      /* krawędź skarp w wierzchołku i: rzut prostej przecięcia płaszczyzn skarp
         sąsiednich krawędzi (przechodzi przez wierzchołek, idzie na zewnątrz obiektu) */
      const cornerRay = (i, m, fill) => {
        const e1 = edges[(i - 1 + ne) % ne],
          e2 = edges[i];
        if (e1.open || e2.open || edgeSteep(e1, m) || edgeSteep(e2, m)) return null;
        const g1 = edgeGrad(e1, m, fill),
          dg = V.sub(g1, edgeGrad(e2, m, fill));
        if (V.len(dg) < 1e-9) return null;
        let w = V.norm(V.perp2(dg));
        if (V.dot(w, V.add(e1.nout, e2.nout)) < 0) w = V.mul(w, -1);
        return { v: e2.a, w, s: V.dot(g1, w) };
      };
      const rays = { n: out.map((q, i) => cornerRay(i, mn, true)), w: out.map((q, i) => cornerRay(i, mw, false)) };
      // obszar skarpy krawędzi: na zewnątrz krawędzi, między krawędziami skarp w jej końcach
      const sideOK = (r, P, ref) => {
        if (!r) return true;
        const c = V.cross2(r.w, ref);
        return Math.abs(c) < 1e-12 || V.cross2(r.w, V.sub(P, r.v)) * Math.sign(c) > -1e-7;
      };
      const inWedge = (e, P, mode) => V.dot(V.sub(P, e.a), e.nout) > -1e-7 && sideOK(rays[mode][e.i], P, e.d) && sideOK(rays[mode][(e.i + 1) % ne], P, V.mul(e.d, -1));
      const Sn = (x, y) => {
        const P = [x, y];
        let best = -Infinity;
        slopeE.forEach((e) => {
          if (inWedge(e, P, 'n')) best = Math.max(best, edgePlane(e, P, mn, true));
        });
        return best > -Infinity ? best : Math.max(...slopeE.map((e) => edgeEnv(e, P, mn, true)));
      };
      const Sw = (x, y) => {
        const P = [x, y];
        let best = Infinity;
        slopeE.forEach((e) => {
          if (inWedge(e, P, 'w')) best = Math.min(best, edgePlane(e, P, mw, false));
        });
        return best < Infinity ? best : Math.min(...slopeE.map((e) => edgeEnv(e, P, mw, false)));
      };
      const inBox = (x, y) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
      const F = (x, y) => {
        if (!inBox(x, y)) return NaN;
        if (inside([x, y])) return hD(x, y);
        const t = T(x, y);
        const sn = Sn(x, y);
        if (sn > t) return sn;
        const sw = Sw(x, y);
        if (sw < t) return sw;
        return t;
      };
      const fN = (x, y) => (inside([x, y]) ? hD(x, y) - T(x, y) : Sn(x, y) - T(x, y));
      const fW = (x, y) => (inside([x, y]) ? hD(x, y) - T(x, y) : Sw(x, y) - T(x, y));
      B.data.F = F;
      B.data.T = T;
      B.data.box = box;
      B.data.unit = cfg.unit;
      const aspect = (box[3] - box[1]) / (box[2] - box[0]);
      const NX = 150,
        NY = Math.round(150 * aspect);
      const gT = G.grid(T, box[0], box[2], box[1], box[3], NX, NY);
      const tmin = Math.min(...gT.v.flat()),
        tmax = Math.max(...gT.v.flat());
      const lv = rangeInt(tmin, tmax);
      const hmin = Math.min(...out.map((q) => q[2])),
        hmax = Math.max(...out.map((q) => q[2]));
      const tc = (x, y, z) => lerpCol('#7fb069', '#b08850', (z - tmin) / (tmax - tmin + 1e-9));
      const fmtH = (v) => f1(v).replace(',0', '');
      B.step({
        title: 'Dane: teren, obiekt z cechami, moduły skarp',
        co: cfg.name.replace('📋 ', '') + '. Moduł wykopu <b>m<sub>w</sub> = ' + f1(mw) + ' ' + cfg.unit + '</b>, nasypu <b>m<sub>n</sub> = ' + f1(mn) + ' ' + cfg.unit + '</b> (odległość pozioma na 1 m różnicy wysokości).' + (cfg.note ? '<br><i>' + cfg.note + '</i>' : ''),
        jak: 'Obejrzyj model terenu w 3D (przewyższenie dobrane automatycznie). Najedź na warstwicę – podświetli się jej odpowiednik na modelu.',
        why: 'Obiekt (platforma, droga) to płaszczyzny o zadanych cechach. Tam, gdzie teren jest niżej – trzeba nasypać; gdzie wyżej – wykopać. Skarpy łagodzą przejście.',
        cam: { dir: [0.5, 0.9, 0.8] },
      });
      B.a3(surfPrim('terrain0', T, box, 90, Math.round(90 * aspect), tc, 1));
      B.info('terrain0', 'Model terenu (powierzchnia topograficzna)');
      lv.forEach((k) => {
        G.isoline(gT, k).forEach((ln, j) => {
          const id = 'tw' + k;
          B.a2({ t: 'pl', id, pts: ln, s: k % 5 === 0 ? 'contb' : 'cont' });
          B.a3({ t: 'pl', id, pts: ln.map((q) => [q[0], q[1], k + 0.02]), s: 'cont', w: 0.6 });
          if (j === 0) contourLabel(B, id, ln, k, 0.08);
        });
        B.info('tw' + k, 'Warstwica terenu o cesze ' + k + ' m');
      });
      (cfg.spots || []).forEach((q, i) => {
        B.a2({ t: 'text', id: 'spot' + i, p: P2(q), txt: '+' + q[2], s: 'hval' });
        B.info('spot' + i, 'Punkt wysokościowy terenu +' + q[2]);
      });
      [
        ['m_w', mw, 0],
        ['m_n', mn, 1],
      ].forEach(([n, m, j]) => {
        const y = box[3] - 3 - j * 4.5;
        B.a2({ t: 'seg', id: 'mod', a: [box[0] + 3, y], b: [box[0] + 3 + m, y], s: 'vis' });
        B.a2({ t: 'seg', id: 'mod', a: [box[0] + 3, y - 0.8], b: [box[0] + 3, y + 0.8], s: 'given' });
        B.a2({ t: 'seg', id: 'mod', a: [box[0] + 3 + m, y - 0.8], b: [box[0] + 3 + m, y + 0.8], s: 'given' });
        B.a2({ t: 'text', id: 'mod', p: [box[0] + 3 + m + 3, y], txt: n, s: 'note', anchor: 'start' });
      });
      B.info('mod', 'Moduły skarp: m<sub>w</sub> = ' + f1(mw) + ', m<sub>n</sub> = ' + f1(mn) + ' (' + cfg.unit + ' na 1 m)');
      B.a2({ t: 'pl', id: 'obj', pts: poly, closed: true, s: 'vis' });
      B.a3({ t: 'pl', id: 'obj', pts: out.map((q) => [q[0], q[1], q[2] + 0.03]), closed: true, s: 'given' });
      out.forEach((q, i) => {
        const prev = out[(i - 1 + ne) % ne],
          nxt = out[(i + 1) % ne];
        if (Math.abs(prev[2] - q[2]) < 1e-9 && Math.abs(nxt[2] - q[2]) < 1e-9 && i % 2) return;
        B.a2({ t: 'text', id: 'objc', p: V.add(P2(q), V.mul(V.norm(V.add(edges[i].nout, edges[(i - 1 + ne) % ne].nout)), -2.4)), txt: '(' + fmtH(q[2]) + ')', s: 'hval' });
      });
      B.info('obj', 'Obrys obiektu (platforma / droga) – krawędzie z cechami');
      B.info('objc', 'Cecha wierzchołka obiektu');
      // model 3D obiektu
      const designPrim = {
        t: 'mesh',
        id: 'obj3',
        build(THREE) {
          const tris = THREE.ShapeUtils.triangulateShape(
            poly.map((q) => new THREE.Vector2(q[0], q[1])),
            []
          );
          const pos = [];
          tris.forEach((t) => t.forEach((i) => pos.push(out[i][0], hD(out[i][0], out[i][1]) + 0.02, out[i][1])));
          const g = new THREE.BufferGeometry();
          g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
          g.computeVertexNormals();
          return new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0x9e9e9e, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
        },
      };
      B.a3(designPrim);
      B.info('obj3', 'Obiekt projektowany (szary)');
      // linia zerowa
      const zeroPts = [];
      edges.forEach((e) => {
        const N = 200;
        for (let k = 0; k < N; k++) {
          const P = V.lerp(e.a, e.b, k / N),
            Q = V.lerp(e.a, e.b, (k + 1) / N);
          const a = T(P[0], P[1]) - (e.ha + ((e.hb - e.ha) * k) / N),
            b = T(Q[0], Q[1]) - (e.ha + ((e.hb - e.ha) * (k + 1)) / N);
          if (a < 0 !== b < 0) zeroPts.push(V.lerp(P, Q, a / (a - b)));
        }
      });
      const gN = G.grid(fN, box[0], box[2], box[1], box[3], NX, NY);
      B.step({
        title: 'Linia zerowa – podział na nasyp i wykop',
        co: zeroPts.length ? 'Na brzegach obiektu punkty <b>Z</b>, w których teren ma cechę projektu (' + zeroPts.length + ' pkt). Linia zerowa dzieli obiekt na część w nasypie i w wykopie.' : 'Teren ma wszędzie na brzegach ' + (T(poly[0][0], poly[0][1]) > out[0][2] ? 'cechę większą – cały obiekt w wykopie.' : 'cechę mniejszą – cały obiekt w nasypie.'),
        jak: 'Wzdłuż krawędzi porównujemy cechę terenu (interpolacja między warstwicami) z cechą krawędzi (na drodze – zmienną!). Wewnątrz obiektu linia zerowa to miejsca, gdzie teren = projekt.',
        why: 'Tam, gdzie teren = projekt, nie trzeba ani nasypywać, ani kopać – to granica dwóch rodzajów robót.',
      });
      zeroPts.forEach((q, i) => {
        B.a2({ t: 'pt', id: 'Z' + i, p: q, s: 'res2', label: 'Z_' + (i + 1) });
        B.a3({ t: 'pt', id: 'Z' + i, p: [q[0], q[1], T(q[0], q[1])], s: 'res2', label: 'Z_' + (i + 1) });
        B.info('Z' + i, 'Punkt zerowy: teren ma tu cechę projektu');
      });
      G.isoline(gN, 0).forEach((ln) => {
        const inPart = ln.filter((q) => inside(q));
        if (inPart.length > 1) B.a2({ t: 'pl', id: 'zero', pts: inPart, s: 'res2', w: 1.2 });
      });
      B.info('zero', 'Linia zerowa (teren = projekt)');
      // strefy i warstwice skarp
      const nearestOutline = (P) => {
        let best = null,
          bd = 1e9;
        edges.forEach((e) => {
          const t = Math.max(0, Math.min(e.L, V.dot(V.sub(P, e.a), e.d)));
          const Q = V.add(e.a, V.mul(e.d, t));
          const dd = V.dist(P, Q);
          if (dd < bd) {
            bd = dd;
            best = { Q, h: e.ha + ((e.hb - e.ha) * t) / e.L, open: e.open };
          }
        });
        return best;
      };
      const zoneN = (x, y) => {
        const r = nearestOutline([x, y]);
        return T(r.Q[0], r.Q[1]) < r.h;
      };
      const SnMask = (x, y) => (inside([x, y]) || !zoneN(x, y) ? NaN : Sn(x, y));
      const SwMask = (x, y) => (inside([x, y]) || zoneN(x, y) ? NaN : Sw(x, y));
      const gSn = G.grid(SnMask, box[0], box[2], box[1], box[3], NX, NY);
      const gSw = G.grid(SwMask, box[0], box[2], box[1], box[3], NX, NY);
      const hasSloped = slopeE.some((e) => Math.abs(e.hb - e.ha) > 1e-6);
      const slopeLines = (g, levels, pre, st) =>
        levels.forEach((k) => {
          G.isoline(g, k).forEach((ln) => {
            B.a2({ t: 'pl', id: pre + k, pts: ln, s: st, w: 1 });
            B.a3({ t: 'pl', id: pre + k, pts: ln.map((q) => [q[0], q[1], k + 0.04]), s: st, w: 0.7 });
          });
          B.info(pre + k, (pre.indexOf('sn') === 0 ? 'Warstwica skarpy nasypu' : 'Warstwica skarpy wykopu') + ' o cesze ' + k + ' m', ['tw' + k]);
        });
      const lvN = rangeInt(tmin, hmax).filter((k) => k < hmax - 1e-6);
      const lvW = rangeInt(hmin, tmax).filter((k) => k > hmin + 1e-6);
      // stożki na krawędziach pochyłych
      if (hasSloped) {
        B.step({
          title: 'Krawędzie pochyłe: stożki skarp',
          co: 'Na krawędziach pochyłych (droga) zaznaczamy punkty o cechach całkowitych i z każdego zakreślamy okręgi o promieniach 1·m, 2·m, … – podstawy stożków o nachyleniu skarpy.',
          jak: 'Punkt krawędzi o cesze c: okrąg o promieniu |c − k|·m to poziom k stożka. Nasyp – m<sub>n</sub> (w dół), wykop – m<sub>w</sub> (w górę).',
          why: 'Płaszczyzna skarpy przy krawędzi pochyłej jest styczna do wszystkich takich stożków – jej warstwice to wspólne styczne okręgów o tej samej cesze.',
        });
        slopeE.forEach((e) => {
          if (Math.abs(e.hb - e.ha) < 1e-6) return;
          rangeInt(Math.min(e.ha, e.hb), Math.max(e.ha, e.hb)).forEach((c) => {
            const t = (c - e.ha) / (e.hb - e.ha);
            if (t < 0 || t > 1) return;
            const Pc = V.lerp(e.a, e.b, t);
            const fill = zoneN(...V.add(Pc, V.mul(e.nout, 0.5)));
            const m = fill ? mn : mw;
            [1, 2].forEach((dk) => {
              const id = 'cone' + e.i + '_' + c + '_' + dk;
              B.a2({ t: 'arc', id, c: Pc, r: dk * m, a0: Math.atan2(e.nout[1], e.nout[0]) - 1.4, a1: Math.atan2(e.nout[1], e.nout[0]) + 1.4, s: fill ? 'aux' : 'aux2', w: 0.6 });
              B.info(id, 'Stożek skarpy: wierzchołek w punkcie krawędzi o cesze ' + c + ', okrąg o promieniu ' + dk + '·m = ' + f1(dk * m) + ' → poziom ' + (fill ? c - dk : c + dk));
            });
            B.a2({ t: 'pt', id: 'conep' + e.i + '_' + c, p: Pc, s: 'aux', r: 1.8, label: '(' + c + ')', labCls: 'small' });
          });
        });
      }
      // naroża: prosta krawędź skarp od wierzchołka do terenu + punkty równocechowych warstwic
      const corners = [];
      out.forEach((q, i) => {
        const v = P2(q);
        const fill = T(v[0], v[1]) < q[2];
        const r = rays[fill ? 'n' : 'w'][i];
        if (!r || (fill ? r.s >= 0 : r.s <= 0)) return;
        const S = fill ? Sn : Sw;
        const zoneOK = (P) => zoneN(P[0], P[1]) === fill;
        const at = (t) => V.add(v, V.mul(r.w, t));
        const dt = Math.min(mn, mw) / 25;
        const pts = [v];
        let prev = v,
          dPrev = fill ? q[2] - T(v[0], v[1]) : T(v[0], v[1]) - q[2];
        for (let t = dt; t < 4000 * dt; t += dt) {
          const P = at(t);
          const hs = q[2] + t * r.s;
          if (!inBox(P[0], P[1]) || inside(P) || Math.abs(S(P[0], P[1]) - hs) > 1e-4 * (1 + Math.abs(hs))) break;
          const d = fill ? hs - T(P[0], P[1]) : T(P[0], P[1]) - hs;
          if (d <= 0) {
            pts.push(V.lerp(prev, P, dPrev / (dPrev - d + 1e-12)));
            break;
          }
          pts.push(P);
          prev = P;
          dPrev = d;
        }
        const kp = [];
        (fill ? lvN : lvW).forEach((k) => {
          const t = (k - q[2]) / r.s;
          if (t <= 1e-6) return;
          const P = at(t);
          if (!inBox(P[0], P[1]) || inside(P) || !zoneOK(P) || Math.abs(S(P[0], P[1]) - k) > 1e-4 * (1 + Math.abs(k))) return;
          kp.push({ k, p: P });
        });
        if (pts.length > 2 || kp.length) corners.push({ i, fill, pts, kp });
      });
      // warstwice skarp – krok po kroku (od obiektu na zewnątrz)
      const chunk = (arr) => {
        const n = Math.max(1, Math.ceil(arr.length / 6));
        const r = [];
        for (let i = 0; i < arr.length; i += n) r.push(arr.slice(i, i + n));
        return r;
      };
      const ordN = lvN.slice().sort((a, b) => b - a),
        ordW = lvW.slice().sort((a, b) => a - b);
      let firstLv = true;
      const levelSteps = (ord, fill) =>
        chunk(ord).forEach((ks) => {
          const m = fill ? mn : mw;
          const what = fill ? 'nasypu' : 'wykopu';
          const kTxt = ks.length > 1 ? ks[0] + ' … ' + ks[ks.length - 1] : String(ks[0]);
          const kps = [];
          corners.filter((c) => c.fill === fill).forEach((c) => c.kp.forEach((q) => ks.indexOf(q.k) >= 0 && kps.push(Object.assign({ i: c.i }, q))));
          B.step({
            title: 'Skarpa ' + what + ': warstwic' + (ks.length > 1 ? 'e ' : 'a ') + kTxt,
            co:
              'Warstwic' + (ks.length > 1 ? 'e skarp o cechach <b>' + kTxt + '</b>' : 'a skarp o cesze <b>' + kTxt + '</b>') + ' (' + what + ', moduł ' + f1(m) + ' ' + cfg.unit + ' na 1 m). ' +
              (kps.length ? 'Warstwice sąsiednich skarp o tej samej cesze przecinają się – zaznaczamy te punkty (' + kps.length + ' pkt) – leżą na krawędzi skarp.' : 'Na narożach w tym obszarze nie ma przecięć warstwic sąsiednich skarp.'),
            jak:
              'Krawędź pozioma o cesze H: warstwica k skarpy jest ∥ krawędzi w odległości |H − k|·m.' +
              (hasSloped ? ' Krawędź pochyła: warstwica k to wspólna styczna okręgów stożków o tej samej cesze.' : '') +
              ' Warstwice prowadzimy prosto aż do przecięcia z warstwicą sąsiedniej skarpy o tej samej cesze – narożników <b>nie zaokrąglamy</b>.',
            why: firstLv
              ? 'Skarpa ma stałe nachylenie 1 : m – odległość pozioma na 1 m różnicy wysokości to moduł. Skarpy sąsiednich krawędzi to dwie płaszczyzny – przecinają się wzdłuż prostej (krawędzi skarp).'
              : 'Kolejna warstwica jest o m dalej od obiektu. Punkty przecięć z sąsiednią skarpą układają się na jednej prostej przechodzącej przez narożnik obiektu.',
          });
          firstLv = false;
          slopeLines(fill ? gSn : gSw, ks, fill ? 'sn' : 'sw', fill ? 'aux' : 'aux2');
          kps.forEach((q, j) => {
            const id = 'kp' + q.i + '_' + q.k;
            B.a2({ t: 'pt', id, p: q.p, s: fill ? 'aux' : 'aux2', r: 2.4, label: String(q.k), labCls: 'small' });
            B.a3({ t: 'pt', id, p: [q.p[0], q.p[1], q.k], s: fill ? 'aux' : 'aux2', small: true });
            B.info(id, 'Przecięcie warstwic o cesze ' + q.k + ' dwóch sąsiednich skarp ' + what + ' – punkt krawędzi skarp', [(fill ? 'sn' : 'sw') + q.k]);
            void j;
          });
        });
      levelSteps(ordN, true);
      levelSteps(ordW, false);
      if (corners.length) {
        B.step({
          title: 'Krawędzie skarp na narożach',
          co: 'Przez narożnik obiektu i zaznaczone punkty przecięć równocechowych warstwic prowadzimy <b>krawędź skarp</b> – prostą, aż do terenu.',
          jak: 'Przy krawędziach poziomych i równych modułach krawędź skarp to dwusieczna kąta naroża; przy różnych cechach / drodze – po prostu prosta przez wyznaczone punkty.',
          why: 'Dwie sąsiednie skarpy to płaszczyzny – ich przecięcie jest prostą. Na narożu wypukłym to grzbiet (nasyp) lub krawędź wklęsła (wykop), na wklęsłym – kosz.',
        });
        corners.forEach((c) => {
          if (c.pts.length < 2) return;
          B.a2({ t: 'pl', id: 'cor' + c.i, pts: c.pts, s: c.fill ? 'aux' : 'aux2', w: 1.6 });
          B.a3({ t: 'pl', id: 'cor' + c.i, pts: c.pts.map((P) => [P[0], P[1], F(P[0], P[1]) + 0.05]), s: c.fill ? 'aux' : 'aux2' });
          B.info('cor' + c.i, 'Krawędź skarp ' + (c.fill ? 'nasypu' : 'wykopu') + ' na narożu obiektu – przez punkty przecięć warstwic o tych samych cechach', c.kp.map((q) => 'kp' + c.i + '_' + q.k));
        });
      }
      // punkty granicy
      const gW = G.grid(fW, box[0], box[2], box[1], box[3], NX, NY);
      const bN = G.isoline(gN, 0).map((ln) => ln.filter((q) => !inside(q))).filter((l) => l.length > 1);
      const bW = G.isoline(gW, 0).map((ln) => ln.filter((q) => !inside(q))).filter((l) => l.length > 1);
      const crossPts = (lines, levels) => {
        const r = [];
        lines.forEach((ln) => {
          for (let i = 0; i + 1 < ln.length; i++) {
            const a = T(ln[i][0], ln[i][1]),
              b = T(ln[i + 1][0], ln[i + 1][1]);
            levels.forEach((k) => {
              if (a < k !== b < k) r.push({ k, p: V.lerp(ln[i], ln[i + 1], (k - a) / (b - a)) });
            });
          }
        });
        return r;
      };
      const cN = crossPts(bN, lvN),
        cW = crossPts(bW, lvW);
      B.step({
        title: 'Punkty granicy: warstwica skarpy ∩ warstwica terenu o tej samej cesze',
        co: 'Punkty, w których warstwica skarpy przecina warstwicę terenu <b>o tej samej cesze</b>: ' + cN.length + ' dla nasypu, ' + cW.length + ' dla wykopu.' + (corners.some((c) => c.pts.length > 1) ? ' Krawędzie skarp też kończą się na terenie.' : ''),
        jak: 'Dla każdej cechy k: warstwica skarpy k ∩ warstwica terenu k. Najedź na punkt – podświetlą się obie warstwice.',
        why: 'W takim punkcie skarpa i teren mają tę samą wysokość – skarpa „wychodzi” na teren.',
      });
      cN.concat(cW).forEach((q, i) => {
        const isN = i < cN.length;
        const id = 'cp' + i;
        B.a2({ t: 'pt', id, p: q.p, s: isN ? 'aux' : 'aux2', r: 2.6 });
        B.a3({ t: 'pt', id, p: [q.p[0], q.p[1], q.k], s: isN ? 'aux' : 'aux2', small: true });
        B.info(id, 'Punkt granicy robót o cesze ' + q.k, [(isN ? 'sn' : 'sw') + q.k, 'tw' + q.k]);
      });
      B.step({
        title: 'Granice robót',
        co: 'Łączymy punkty: <b>granica nasypu</b> (stopa skarpy, czerwona) i <b>granica wykopu</b> (korona skarpy, fioletowa). Na krawędziach skarp granica się załamuje.',
        jak: 'Między punktami granicy prowadzimy linię płynnie (teren jest krzywy), ale z załamaniem w miejscu, gdzie krawędź skarp dochodzi do terenu.',
        why: 'Granica robót = krzywa przecięcia skarp z terenem.',
      });
      bN.forEach((ln) => {
        B.a2({ t: 'pl', id: 'bN', pts: ln, s: 'res', w: 2.4 });
        B.a3({ t: 'pl', id: 'bN', pts: ln.map((q) => [q[0], q[1], T(q[0], q[1]) + 0.05]), s: 'res' });
      });
      bW.forEach((ln) => {
        B.a2({ t: 'pl', id: 'bW', pts: ln, s: 'res2', w: 2.4 });
        B.a3({ t: 'pl', id: 'bW', pts: ln.map((q) => [q[0], q[1], T(q[0], q[1]) + 0.05]), s: 'res2' });
      });
      B.info('bN', 'Granica nasypu (stopa skarpy nasypu)');
      B.info('bW', 'Granica wykopu (korona skarpy wykopu)');
      // wynik
      B.step({
        title: 'Wynik: plan robót ziemnych i model 3D',
        co: 'Teren po wykonaniu robót: obiekt, skarpy nasypu (niebieskie warstwice) i wykopu (zielone), ograniczone do obszaru robót.',
        jak: 'Włącz „pierwotny teren” w Widoku specjalnym, aby porównać. Miarką (📏) zmierzysz spadek skarpy.',
        why: 'Zmień cechy projektu lub moduły – zobacz, jak przesuwa się linia zerowa i jak zmienia się szerokość pasa robót.',
        cam: { dir: [0.55, 0.85, 0.75] },
      });
      B.data.finalStep = B.cur;
      B.end('terrain0');
      B.endWhere((q) => /^s[nw]\d/.test(q.id) || /^cp\d/.test(q.id) || /^kp\d/.test(q.id) || /^cone/.test(q.id));
      const fc = (x, y, z) => {
        if (inside([x, y])) return '#9e9e9e';
        const t = T(x, y);
        if (z > t + 0.01) return '#d9a066';
        if (z < t - 0.01) return '#e6d27a';
        return tc(x, y, z);
      };
      B.a3(surfPrim('terrain', F, box, 180, Math.round(180 * aspect), fc, 1));
      B.info('terrain', 'Teren po robotach: brązowy – nasyp, żółty – wykop, szary – obiekt');
      const gSnF = G.grid((x, y) => (!inside([x, y]) && fN(x, y) > 0 ? Sn(x, y) : NaN), box[0], box[2], box[1], box[3], NX, NY);
      const gSwF = G.grid((x, y) => (!inside([x, y]) && fW(x, y) < 0 ? Sw(x, y) : NaN), box[0], box[2], box[1], box[3], NX, NY);
      slopeLines(gSnF, lvN, 'snF', 'aux');
      slopeLines(gSwF, lvW, 'swF', 'aux2');
      B.data.ok = true;
    },
  });
})();
