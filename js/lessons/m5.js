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
    title: '5.1 Płaszczyzna: stopniowanie, warstwice, nachylenie',
    v2title: 'Rzut cechowany (widok z góry, cechy w m)',
    params: [
      { k: 'hA', l: 'cecha A [m]', min: 0, max: 10, step: 0.1, v: 1.6 },
      { k: 'hB', l: 'cecha B [m]', min: 0, max: 12, step: 0.1, v: 7.4 },
      { k: 'hC', l: 'cecha C [m]', min: 0, max: 12, step: 0.1, v: 4.3 },
      { k: 'Cx', l: 'C: położenie x', min: 10, max: 45, step: 0.5, v: 30 },
    ],
    special: {
      note: '<b>Spływ wody.</b> Najedź kursorem na rysunek 2D – z tego miejsca popłynie kropla po płaszczyźnie (linia największego spadku). Zauważ: zawsze prostopadle do warstwic, równolegle do skali nachylenia.',
      ui: [{ type: 'check', k: 'drops', l: 'animowane krople w 3D', v: true }],
      bind(c) {
        c.v2.onBgMove = (P) => {
          c.S.cursor = P;
          c.app.refreshOverlay();
        };
      },
      overlay(c) {
        const d = c.data;
        if (!d.F) return {};
        const r = flowOverlay(c, d.F, d.box, c.S.cursor) || { p2: [], p3: [] };
        if (c.S.drops && c.k >= d.dropStep) r.p3.push(d._drops || (d._drops = dropsPrim(d.F, d.box, 60)));
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
    title: '5.2 Krawędź dwóch płaszczyzn, przebicie prostej',
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
      note: 'Najedź na rysunek – kropla wody popłynie po płaszczyźnie α (linia największego spadku).',
      ui: [],
      bind(c) {
        c.v2.onBgMove = (P) => {
          c.S.cursor = P;
          c.app.refreshOverlay();
        };
      },
      overlay(c) {
        const d = c.data;
        if (!d.F) return {};
        const r = flowOverlay(c, d.F, d.box, c.S.cursor) || {};
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
     5.3 Dach
     ================================================================= */
  function roofOutline(p) {
    const W = p.W,
      L = p.L;
    let poly;
    if (p.shape === 'rect')
      poly = [
        [0, 0],
        [W, 0],
        [W, L],
        [0, L],
      ];
    else if (p.shape === 'trap')
      poly = [
        [0, 0],
        [W, 0],
        [W - 5, L],
        [4, L],
      ];
    else
      poly = [
        [0, 2],
        [W * 0.7, 0],
        [W, L * 0.45],
        [W * 0.75, L],
        [2, L * 0.85],
      ];
    return poly.map((q) => [q[0] + 4, q[1] + 4]);
  }
  GW.addLesson({
    id: 'm5-dach',
    mod: 5,
    title: '5.3 Dach – połacie o zadanym nachyleniu',
    v2title: 'Rzut cechowany dachu (rzut z góry)',
    opts: [
      {
        k: 'shape',
        l: 'Obrys budynku',
        choices: [
          ['rect', 'prostokąt'],
          ['trap', 'trapez'],
          ['pent', 'pięciokąt nieregularny'],
        ],
        v: 'rect',
        rebuildFrame: true,
      },
    ],
    params: [
      { k: 'W', l: 'długość [m]', min: 14, max: 34, step: 0.5, v: 26 },
      { k: 'L', l: 'szerokość [m]', min: 8, max: 22, step: 0.5, v: 14 },
      { k: 'ang', l: 'nachylenie połaci α [°]', min: 20, max: 60, v: 40 },
      { k: 'ang1', l: 'nachylenie połaci nr 1 [°]', min: 20, max: 75, v: 40 },
      { k: 'H0', l: 'cecha okapu [m]', min: 0, max: 8, step: 0.5, v: 3 },
    ],
    special: {
      note: 'Najedź na dach (2D) – kropla spłynie po połaci do okapu. Krople w 3D pokazują, że woda zawsze płynie prostopadle do okapu (po linii spadku połaci), a kosze/narożniki tylko rozdzielają strumienie.',
      ui: [{ type: 'check', k: 'drops', l: 'animowane krople w 3D', v: true }],
      bind(c) {
        c.v2.onBgMove = (P) => {
          c.S.cursor = P;
          c.app.refreshOverlay();
        };
      },
      overlay(c) {
        const d = c.data;
        if (!d.F) return {};
        const r = flowOverlay(c, d.F, d.box, c.S.cursor && G.pointInPoly2(c.S.cursor, d.poly) ? c.S.cursor : null) || { p2: [], p3: [] };
        if (c.S.drops && c.k === c.B.steps.length - 1) r.p3.push(d._drops || (d._drops = dropsPrim(d.F, d.box, 70)));
        return { p2: r.p2, p3: r.p3, info: { flow: 'Spływ wody po połaci – prostopadle do okapu' } };
      },
    },
    algo:
      '<ol><li>Każda połać przechodzi przez krawędź okapu (bok obrysu, cecha okapu) i ma zadane nachylenie α ⇒ interwał i = 1/tg α. <b>Warstwice połaci</b> to proste ∥ okapu w odstępach i.</li>' +
      '<li><b>Krawędź dwóch połaci</b> (narożnik, kosz, kalenica) przechodzi przez punkty przecięcia warstwic o tych samych cechach. Przy równych nachyleniach narożnik jest dwusieczną kąta obrysu.</li>' +
      '<li>Krawędzie prowadzimy od narożników budynku do pierwszego spotkania z inną krawędzią – w tym punkcie schodzą się trzy połacie; dalej biegnie krawędź połaci nie-sąsiednich.</li>' +
      '<li><b>Kalenica</b> – krawędź pozioma (obie połacie mają ten sam spadek w przeciwnych kierunkach i równoległe okapy).</li>' +
      '<li>Kontrola: każda połać to wielokąt oparty na jednym boku obrysu; z każdego wierzchołka obrysu wychodzi dokładnie jedna krawędź.</li></ol>',
    build(p, B) {
      const poly = roofOutline(p);
      const n = poly.length;
      const H0 = p.H0;
      const tans = poly.map((q, i) => Math.tan(G.rad(i === 0 ? p.ang1 : p.ang)));
      // normalne wewnętrzne
      const area = G.polyArea2(poly);
      const edges = poly.map((a, i) => {
        const b = poly[(i + 1) % n];
        const d = V.norm(V.sub(b, a));
        let nin = V.perp2(d);
        if (area < 0) nin = V.mul(nin, -1);
        return { a, b, d, nin, tan: tans[i] };
      });
      const hEdge = (i, P) => H0 + V.dot(V.sub([P[0], P[1]], edges[i].a), edges[i].nin) * edges[i].tan;
      const F = (x, y) => (G.pointInPoly2([x, y], poly) ? Math.min(...edges.map((e, i) => hEdge(i, [x, y]))) : NaN);
      const bb = G.bbox2(poly);
      B.data.F = F;
      B.data.box = bb;
      B.data.poly = poly;
      // ściany = obwiednia dolna
      const faces = edges.map((e, i) => {
        let f = poly.map((q) => [q[0], q[1], 0]);
        edges.forEach((e2, j) => {
          if (j === i) return;
          // h_i - h_j <= 0  :  (nin_i*tan_i - nin_j*tan_j)·P - c <= 0
          const a = V.sub(V.mul(e.nin, e.tan), V.mul(e2.nin, e2.tan));
          const c = V.dot(e.a, V.mul(e.nin, e.tan)) - V.dot(e2.a, V.mul(e2.nin, e2.tan));
          f = G.clipPoly(f, { n: [a[0], a[1], 0], d: c });
        });
        return f.map((q) => [q[0], q[1], hEdge(i, q)]);
      });
      B.step({
        title: 'Dane: obrys budynku, cecha okapu, nachylenie połaci',
        co: 'Obrys ' + n + '-boczny, okap na wysokości <b>' + f1(H0) + ' m</b>, połacie nachylone pod kątem <b>' + p.ang + '°</b>' + (p.ang1 !== p.ang ? ' (połać nr 1: ' + p.ang1 + '°)' : '') + '.',
        jak: 'Numerujemy boki obrysu – nad każdym powstanie jedna połać. Interwał połaci: i = 1/tg α = ' + f1(1 / Math.tan(G.rad(p.ang))) + ' m.',
        why: 'Połać to płaszczyzna zawierająca okap i nachylona pod kątem α – jest wyznaczona jednoznacznie (jak płaszczyzna przez prostą poziomą o zadanym spadku).',
        cam: { dir: [0.6, 0.9, 0.8] },
      });
      B.a2({ t: 'pl', id: 'obrys', pts: poly, closed: true, s: 'vis' });
      B.info('obrys', 'Obrys budynku = okapy (cecha ' + f1(H0) + ')');
      edges.forEach((e, i) => {
        const m = V.mid(e.a, e.b);
        B.a2({ t: 'text', id: 'en' + i, p: V.add(m, V.mul(e.nin, -2.4)), txt: String(i + 1), s: 'note' });
        B.info('en' + i, 'Okap nr ' + (i + 1) + ', połać nachylona ' + G.f0(G.deg(Math.atan(e.tan))) + '°');
      });
      // ściany budynku 3D
      poly.forEach((a, i) => {
        const b = poly[(i + 1) % n];
        B.a3({ t: 'poly', id: 'wall', pts: [[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], H0], [a[0], a[1], H0]], col: '#cccccc', op: 0.6 });
      });
      B.a3({ t: 'pl', id: 'obrys', pts: poly.map((q) => [q[0], q[1], H0]), closed: true, s: 'given' });
      B.info('wall', 'Ściany budynku (do wysokości okapu)');
      // warstwice połaci
      const maxH = Math.max(...faces.flat().map((q) => q[2]));
      const lv = rangeInt(H0 + 1, maxH);
      B.step({
        title: 'Warstwice połaci',
        co: 'Dla każdej połaci proste ∥ okapu co interwał i (cechy ' + lv.join(', ') + ').',
        jak: 'Warstwica o cesze n połaci nad bokiem k: prosta ∥ bokowi k, odsunięta do wnętrza o (n − ' + f1(H0) + ')·i.',
        why: 'Wysokość połaci rośnie liniowo wraz z odległością od okapu: Δh = d·tg α. Stąd równe odstępy warstwic.',
      });
      edges.forEach((e, i) => {
        lv.forEach((k) => {
          const off = (k - H0) / e.tan;
          const P = V.add(e.a, V.mul(e.nin, off));
          const c = G.clipLine2(P, e.d, [bb[0] - 1, bb[1] - 1, bb[2] + 1, bb[3] + 1]);
          if (!c) return;
          // przytnij do obrysu
          const ts = [];
          for (let j = 0; j < n; j++) {
            const r = G.line2(P, V.add(P, e.d), poly[j], poly[(j + 1) % n]);
            if (r && r.u >= -1e-9 && r.u <= 1 + 1e-9) ts.push(r.t);
          }
          if (ts.length < 2) return;
          const a = V.add(P, V.mul(e.d, Math.min(...ts))),
            b = V.add(P, V.mul(e.d, Math.max(...ts)));
          const id = 'rw' + i + '_' + k;
          B.a2({ t: 'seg', id, a, b, s: 'cont', w: 0.7 });
          B.a3({ t: 'seg', id, a: [a[0], a[1], k], b: [b[0], b[1], k], s: 'cont', w: 0.5, op: 0.7 });
          B.info(id, 'Warstwica połaci nr ' + (i + 1) + ' o cesze ' + k + ' m (rysowana na całym obrysie – nadmiar zostanie pominięty)');
        });
      });
      // krawędzie dachu
      const redges = [];
      faces.forEach((f, i) => {
        for (let k = 0; k < f.length; k++) {
          const a = f[k],
            b = f[(k + 1) % f.length];
          if (V.dist(a, b) < 1e-6) continue;
          // czy na obrysie?
          const onOutline = Math.abs(a[2] - H0) < 1e-6 && Math.abs(b[2] - H0) < 1e-6;
          if (onOutline) continue;
          const key = [a, b]
            .map((q) => q.map((v) => v.toFixed(3)).join(','))
            .sort()
            .join('|');
          let r = redges.find((q) => q.key === key);
          if (!r) redges.push((r = { key, a, b, faces: [] }));
          r.faces.push(i);
        }
      });
      redges.forEach((r) => {
        const atV = poly.some((q) => V.dist([q[0], q[1]], P2(r.a)) < 1e-4 || V.dist([q[0], q[1]], P2(r.b)) < 1e-4);
        r.kind = Math.abs(r.a[2] - r.b[2]) < 1e-4 ? 'kalenica' : atV ? 'narożnik' : 'krawędź (połacie nie-sąsiednie)';
      });
      const hips = redges.filter((r) => r.kind === 'narożnik'),
        rest = redges.filter((r) => r.kind !== 'narożnik');
      B.step({
        title: 'Narożniki – krawędzie połaci sąsiednich',
        co: 'Z każdego wierzchołka obrysu prowadzimy krawędź dwóch połaci sąsiednich (<b>narożnik</b>) do punktu, w którym spotyka trzecią połać.',
        jak: 'Krawędź przechodzi przez wierzchołek obrysu (wspólny punkt obu okapów, cecha ' + f1(H0) + ') i przez punkty przecięcia warstwic tych połaci o równych cechach. ' + (p.ang1 === p.ang ? 'Przy równych nachyleniach to <b>dwusieczna</b> kąta obrysu.' : 'Połać nr 1 jest bardziej stroma – narożniki przy niej odchylają się od dwusiecznej (ku bardziej stromej połaci).'),
        why: 'Punkt przecięcia warstwic o cesze n obu połaci leży w obu płaszczyznach – należy do ich krawędzi. Równe nachylenia ⇒ równe odległości od obu okapów ⇒ dwusieczna.',
      });
      hips.forEach((r, i) => {
        const id = 'hip' + i;
        B.a2({ t: 'seg', id, a: P2(r.a), b: P2(r.b), s: 'res' });
        B.a3({ t: 'seg', id, a: r.a, b: r.b, s: 'res' });
        B.info(id, 'Narożnik: krawędź połaci ' + r.faces.map((f) => f + 1).join(' i '));
        r.faces.forEach((f) => B.src('rw' + f + '_' + lv[Math.min(1, lv.length - 1)]));
      });
      B.step({
        title: 'Kalenice i pozostałe krawędzie',
        co: rest.length ? 'Pozostałe krawędzie: ' + rest.map((r) => r.kind + ' (połacie ' + r.faces.map((f) => f + 1).join('–') + ')').join('; ') + '.' : 'Dach kopertowy zbiega się w jednym punkcie.',
        jak: 'Od punktu spotkania trzech połaci prowadzimy krawędź dwóch połaci, które jeszcze się nie przecięły – znów przez punkty przecięcia ich równocechowych warstwic. ' + (rest.some((r) => r.kind === 'kalenica') ? 'Kalenica jest pozioma: łączy punkty o tej samej cesze.' : ''),
        why: 'W każdym węźle dachu schodzą się dokładnie trzy połacie; krawędź dwóch z nich kończy się, gdy dojdzie do niej trzecia połać (niżej położona połać „wygrywa” – dach to dolna obwiednia płaszczyzn połaci).',
      });
      rest.forEach((r, i) => {
        const id = 'rr' + i;
        B.a2({ t: 'seg', id, a: P2(r.a), b: P2(r.b), s: r.kind === 'kalenica' ? 'res2' : 'res' });
        B.a3({ t: 'seg', id, a: r.a, b: r.b, s: r.kind === 'kalenica' ? 'res2' : 'res' });
        B.info(id, (r.kind === 'kalenica' ? 'Kalenica (pozioma, cecha ' + f1(r.a[2]) + ')' : 'Krawędź połaci ' + r.faces.map((f) => f + 1).join(' i ')) + '');
      });
      // cechy węzłów
      const nodes = G.dedupe(redges.flatMap((r) => [r.a, r.b]).filter((q) => q[2] > H0 + 1e-3), 1e-3);
      nodes.forEach((q, i) => {
        B.a2({ t: 'pt', id: 'node' + i, p: P2(q), s: 'res', r: 2.6, label: '(' + f1(q[2]) + ')', labCls: 'brown' });
        B.info('node' + i, 'Węzeł dachu – cecha ' + f1(q[2]) + ' m');
      });
      B.step({
        title: 'Wynik: rzut dachu i model',
        co: 'Połacie dachu (rzut z cechami węzłów) i model 3D.',
        jak: 'Warstwice zostawiamy tylko w obrębie własnych połaci. Najedź na połać – zobaczysz jej numer i nachylenie.',
        why: 'Spróbuj zmienić nachylenie połaci nr 1 lub kształt obrysu – zobacz, jak przesuwają się narożniki i kalenica.',
        cam: { dir: [0.6, 0.8, 0.7] },
      });
      B.endWhere((q) => /^rw/.test(q.id));
      faces.forEach((f, i) => {
        if (f.length < 3) return;
        const id = 'face' + i;
        B.a3({ t: 'poly', id, pts: f, col: ['#c0563a', '#d0704a', '#b04a30', '#d88060', '#c86448'][i % 5], op: 0.95 });
        B.a2({ t: 'poly', id, pts: f.map(P2), fill: ['#c0563a', '#d0704a', '#b04a30', '#d88060', '#c86448'][i % 5], op: 0.18 });
        B.info(id, 'Połać nr ' + (i + 1) + ' (nachylenie ' + G.f0(G.deg(Math.atan(edges[i].tan))) + '°)');
        // warstwice w obrębie połaci
        const e = edges[i];
        lv.forEach((k) => {
          const P = V.add(e.a, V.mul(e.nin, (k - H0) / e.tan));
          const f2 = f.map(P2);
          const ts = [];
          for (let j = 0; j < f2.length; j++) {
            const r = G.line2(P, V.add(P, e.d), f2[j], f2[(j + 1) % f2.length]);
            if (r && r.u >= -1e-9 && r.u <= 1 + 1e-9) ts.push(r.t);
          }
          if (ts.length < 2) return;
          const a = V.add(P, V.mul(e.d, Math.min(...ts))),
            b = V.add(P, V.mul(e.d, Math.max(...ts)));
          if (V.dist(a, b) < 0.05) return;
          B.a2({ t: 'seg', id, a, b, s: 'cont', w: 0.7 });
          B.a3({ t: 'seg', id: id + 'w', a: [a[0], a[1], k + 0.03], b: [b[0], b[1], k + 0.03], s: 'cont', w: 0.5 });
        });
      });
    },
  });

  /* =================================================================
     5.4 Roboty ziemne: nasyp / wykop na terenie
     ================================================================= */
  GW.addLesson({
    id: 'm5-skarpy',
    mod: 5,
    title: '5.4 Roboty ziemne: skarpy nasypu i wykopu',
    v2title: 'Plan warstwicowy – granice robót ziemnych',
    params: [
      { k: 'H', l: 'cecha placu H [m]', min: 4, max: 11, step: 0.25, v: 7.5 },
      { k: 'nN', l: 'nasyp 1 : n,  n =', min: 1, max: 3, step: 0.1, v: 1.5 },
      { k: 'nW', l: 'wykop 1 : m,  m =', min: 0.5, max: 2.5, step: 0.1, v: 1 },
      { k: 'rot', l: 'obrót placu [°]', min: -40, max: 40, v: 15 },
      { k: 'pw', l: 'długość placu [m]', min: 12, max: 34, v: 24 },
      { k: 'pl', l: 'szerokość placu [m]', min: 8, max: 22, v: 14 },
      { k: 'hill', l: 'wysokość wzgórza [m]', min: 0, max: 6, step: 0.5, v: 3 },
    ],
    special: {
      note: '<b>Model terenu 3D + mapa.</b> Najedź na mapę: kropla popłynie po terenie i skarpach – zobacz, że linia spadku jest zawsze ⟂ warstwic. Animowane krople pokazują spływ po nasypie i do wykopu.',
      ui: [
        { type: 'check', k: 'drops', l: 'animowane krople w 3D', v: true },
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
        const r = flowOverlay(c, F, d.box, c.S.cursor) || { p2: [], p3: [] };
        if (c.S.drops && c.k >= d.finalStep) r.p3.push(d._drops || (d._drops = dropsPrim(d.F, d.box, 120)));
        if (c.S.orig && c.k >= d.finalStep) r.p3.push(surfPrim('orig', (x, y) => d.T(x, y) + 0.02, d.box, 60, 45, () => '#6aa84f', 0.35));
        return { p2: r.p2, p3: r.p3, info: { flow: 'Droga spływu wody – linia największego spadku (⟂ warstwic)' } };
      },
    },
    algo:
      '<ol><li><b>Linia zerowa</b>: na brzegach placu szukamy punktów, gdzie teren ma cechę placu H (interpolacja między warstwicami). Dzieli ona plac na część w <b>nasypie</b> (teren niżej) i w <b>wykopie</b> (teren wyżej).</li>' +
      '<li><b>Skarpy</b>: od każdego brzegu placu zakładamy płaszczyznę skarpy o pochyleniu 1:n (nasyp – w dół na zewnątrz) lub 1:m (wykop – w górę na zewnątrz). <b>Warstwice skarpy</b>: proste ∥ brzegu, w odstępach n (lub m) na każdy 1 m różnicy wysokości.</li>' +
      '<li><b>Granica robót</b> (stopa nasypu / korona wykopu): punkty przecięcia warstwic skarpy z warstwicami terenu <u>o tej samej cesze</u>. Łączymy je płynną linią.</li>' +
      '<li><b>Naroża</b>: sąsiednie skarpy przecinają się wzdłuż krawędzi przez narożnik placu – przy równych pochyleniach dwusieczna kąta zewnętrznego.</li>' +
      '<li>Wynik: obszar nasypu (skarpy w dół) i wykopu (skarpy w górę); warstwice terenu wewnątrz robót zastąpione warstwicami skarp.</li></ol>',
    build(p, B) {
      const box = [0, 0, 80, 60];
      const T = (x, y) => 3 + 0.085 * x + 0.04 * y + p.hill * Math.exp(-((x - 60) ** 2 + (y - 15) ** 2) / 300) - 2 * Math.exp(-((x - 20) ** 2 + (y - 45) ** 2) / 250);
      const H = p.H,
        nN = p.nN,
        nW = p.nW;
      const c = [40, 30];
      const th = G.rad(p.rot);
      const R = (q) => [c[0] + q[0] * Math.cos(th) - q[1] * Math.sin(th), c[1] + q[0] * Math.sin(th) + q[1] * Math.cos(th)];
      const plat = [
        [-p.pw / 2, -p.pl / 2],
        [p.pw / 2, -p.pl / 2],
        [p.pw / 2, p.pl / 2],
        [-p.pw / 2, p.pl / 2],
      ].map(R);
      const ne = plat.length;
      const area = G.polyArea2(plat);
      const edges = plat.map((a, i) => {
        const b = plat[(i + 1) % ne];
        const d = V.norm(V.sub(b, a));
        let nout = V.perp2(d);
        if (area > 0) nout = V.mul(nout, -1);
        return { a, b, d, nout };
      });
      // sprawdzenie zwrotu normalnej
      edges.forEach((e) => {
        if (G.pointInPoly2(V.add(V.mid(e.a, e.b), V.mul(e.nout, 0.5)), plat)) e.nout = V.mul(e.nout, -1);
      });
      const dOut = (i, P) => V.dot(V.sub(P, edges[i].a), edges[i].nout);
      const inside = (P) => G.pointInPoly2(P, plat);
      const Sn = (x, y) => Math.min(...edges.map((e, i) => H - dOut(i, [x, y]) / nN));
      const Sw = (x, y) => Math.max(...edges.map((e, i) => H + dOut(i, [x, y]) / nW));
      const fN = (x, y) => (inside([x, y]) ? H - T(x, y) : Sn(x, y) - T(x, y));
      const fW = (x, y) => (inside([x, y]) ? H - T(x, y) : Sw(x, y) - T(x, y));
      const F = (x, y) => {
        if (x < box[0] || x > box[2] || y < box[1] || y > box[3]) return NaN;
        if (inside([x, y])) return H;
        const t = T(x, y);
        const sn = Sn(x, y);
        if (sn > t) return sn;
        const sw = Sw(x, y);
        if (sw < t) return sw;
        return t;
      };
      B.data.F = F;
      B.data.T = T;
      B.data.box = box;
      const NX = 160,
        NY = 120;
      const gT = G.grid(T, box[0], box[2], box[1], box[3], NX, NY);
      const tmin = Math.min(...gT.v.flat()),
        tmax = Math.max(...gT.v.flat());
      const lv = rangeInt(tmin, tmax);
      const tc = (x, y, z) => (z < H ? lerpCol('#7fb069', '#c8d58a', (z - tmin) / (H - tmin + 1e-9)) : lerpCol('#c8d58a', '#b08850', (z - H) / (tmax - H + 1e-9)));
      B.step({
        title: 'Dane: teren (warstwice), plac o cesze H, pochylenia skarp',
        co: 'Plac poziomy na wysokości <b>H = ' + f1(H) + ' m</b>; skarpy nasypu <b>1:' + f1(nN) + '</b>, wykopu <b>1:' + f1(nW) + '</b>. Teren opisany warstwicami co 1 m.',
        jak: 'Obejrzyj model terenu w 3D (kolor wg wysokości). Najedź na warstwicę – podświetli się jej odpowiednik na modelu.',
        why: 'Plac to płaszczyzna pozioma. Tam, gdzie teren jest niżej – trzeba go nasypać; gdzie wyżej – wykopać. Skarpy łagodzą przejście od placu do terenu.',
        cam: { dir: [0.5, 0.9, 0.8] },
      });
      B.a3(surfPrim('terrain0', T, box, 80, 60, tc, 1));
      B.info('terrain0', 'Model terenu (powierzchnia topograficzna)');
      lv.forEach((k) => {
        const lines = G.isoline(gT, k);
        lines.forEach((ln, j) => {
          const id = 'tw' + k;
          B.a2({ t: 'pl', id, pts: ln, s: k % 5 === 0 ? 'contb' : 'cont' });
          B.a3({ t: 'pl', id, pts: ln.map((q) => [q[0], q[1], k + 0.04]), s: 'cont', w: 0.6 });
          if (j === 0) contourLabel(B, id, ln, k, 0.15);
        });
        B.info('tw' + k, 'Warstwica terenu o cesze ' + k + ' m');
      });
      B.a2({ t: 'pl', id: 'plat', pts: plat, closed: true, s: 'vis' });
      B.a3({ t: 'poly', id: 'plat', pts: plat.map((q) => [q[0], q[1], H]), col: '#9e9e9e', op: 0.85, edge: true });
      B.a2({ t: 'text', id: 'plat', p: c, txt: '(' + f1(H) + ')', s: 'resT' });
      B.info('plat', 'Plac poziomy – cecha ' + f1(H) + ' m');
      // linia zerowa
      const gN = G.grid(fN, box[0], box[2], box[1], box[3], NX, NY);
      const zeroPts = [];
      edges.forEach((e, i) => {
        const N = 200;
        for (let k = 0; k < N; k++) {
          const P = V.lerp(e.a, e.b, k / N),
            Q = V.lerp(e.a, e.b, (k + 1) / N);
          const a = T(P[0], P[1]) - H,
            b = T(Q[0], Q[1]) - H;
          if (a < 0 !== b < 0) zeroPts.push(V.lerp(P, Q, a / (a - b)));
        }
      });
      B.step({
        title: 'Linia zerowa – podział na nasyp i wykop',
        co: zeroPts.length ? 'Na brzegach placu punkty <b>Z</b>, w których teren ma cechę ' + f1(H) + ' (' + zeroPts.length + ' pkt). Linia zerowa dzieli plac na część w nasypie i w wykopie.' : 'Teren ma wszędzie na brzegach ' + (T(c[0], c[1]) > H ? 'cechę większą od H – cały plac w wykopie.' : 'cechę mniejszą od H – cały plac w nasypie.'),
        jak: 'Na brzegu placu interpolujemy cechy terenu między sąsiednimi warstwicami (jak stopniowanie odcinka) i szukamy cechy H. Wewnątrz placu linia zerowa to „warstwica H” terenu.',
        why: 'Tam, gdzie teren = H, nie trzeba ani nasypywać, ani kopać – to granica dwóch rodzajów robót. Po jednej stronie skarpy idą w dół (nasyp), po drugiej w górę (wykop).',
      });
      zeroPts.forEach((q, i) => {
        B.a2({ t: 'pt', id: 'Z' + i, p: q, s: 'res2', label: 'Z_' + (i + 1) });
        B.a3({ t: 'pt', id: 'Z' + i, p: [q[0], q[1], H], s: 'res2', label: 'Z_' + (i + 1) });
        B.info('Z' + i, 'Punkt zerowy: teren ma tu cechę placu ' + f1(H));
      });
      G.isoline(gN, 0).forEach((ln) => {
        const inPart = ln.filter((q) => inside(q));
        if (inPart.length > 1) {
          B.a2({ t: 'pl', id: 'zero', pts: inPart, s: 'res2', w: 1.2 });
        }
      });
      B.info('zero', 'Linia zerowa (teren = H) – granica nasypu i wykopu na placu');
      // skarpy – warstwice (pełne pasy)
      const nearestEdgePt = (P) => {
        let best = null,
          bd = 1e9;
        edges.forEach((e) => {
          const L = V.dist(e.a, e.b);
          const t = Math.max(0, Math.min(L, V.dot(V.sub(P, e.a), e.d)));
          const Q = V.add(e.a, V.mul(e.d, t));
          const d = V.dist(P, Q);
          if (d < bd) {
            bd = d;
            best = Q;
          }
        });
        return best;
      };
      const zoneN = (x, y) => {
        const Q = nearestEdgePt([x, y]);
        return T(Q[0], Q[1]) < H;
      };
      const SnMask = (x, y) => (inside([x, y]) || !zoneN(x, y) || Sn(x, y) < tmin - 1 ? NaN : Sn(x, y));
      const SwMask = (x, y) => (inside([x, y]) || zoneN(x, y) || Sw(x, y) > tmax + 1 ? NaN : Sw(x, y));
      const gSn = G.grid(SnMask, box[0], box[2], box[1], box[3], NX, NY);
      const gSw = G.grid(SwMask, box[0], box[2], box[1], box[3], NX, NY);
      B.step({
        title: 'Warstwice skarp nasypu i wykopu',
        co: 'Od brzegów placu rysujemy warstwice skarp: nasyp – co <b>' + f1(nN) + ' m</b> na każdy 1 m w dół; wykop – co <b>' + f1(nW) + ' m</b> na każdy 1 m w górę.',
        jak: 'Warstwica skarpy o cesze k: prosta ∥ brzegu placu, odsunięta na zewnątrz o |H − k|·n (nasyp) lub |k − H|·m (wykop). Pierwsza warstwica całkowita leży w odległości ułamkowej (H nie jest całkowite!). Na narożach warstwice sąsiednich skarp spotykają się na krawędzi skarp.',
        why: 'Pochylenie 1:n oznacza: 1 m różnicy wysokości na n m w poziomie, czyli interwał skarpy = n. Skarpa to płaszczyzna przez brzeg placu – jej warstwice są równoległe do brzegu.',
      });
      const slopeLines = (g, levels, pre, st) =>
        levels.forEach((k) => {
          G.isoline(g, k).forEach((ln) => {
            B.a2({ t: 'pl', id: pre + k, pts: ln, s: st, w: 1 });
            B.a3({ t: 'pl', id: pre + k, pts: ln.map((q) => [q[0], q[1], k + 0.05]), s: st, w: 0.7 });
          });
          B.info(pre + k, (pre === 'sn' ? 'Warstwica skarpy nasypu' : 'Warstwica skarpy wykopu') + ' o cesze ' + k + ' m', ['tw' + k]);
        });
      const lvN = rangeInt(tmin, H - 1e-6).filter((k) => k < H);
      const lvW = rangeInt(H + 1e-6, tmax).filter((k) => k > H);
      slopeLines(gSn, lvN, 'sn', 'aux');
      slopeLines(gSw, lvW, 'sw', 'aux2');
      // punkty przecięcia równocechowych
      const gFN = gN; // fN zero-contour = granica nasypu
      const gW = G.grid(fW, box[0], box[2], box[1], box[3], NX, NY);
      const bN = G.isoline(gFN, 0).map((ln) => ln.filter((q) => !inside(q))).filter((l) => l.length > 1);
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
        co: 'Zaznaczamy punkty, w których warstwica skarpy przecina warstwicę terenu <b>o tej samej cesze</b>: ' + cN.length + ' pkt dla nasypu, ' + cW.length + ' pkt dla wykopu.',
        jak: 'Dla każdej cechy k: warstwica skarpy k ∩ warstwica terenu k. Najedź na punkt – podświetlą się obie warstwice.',
        why: 'W takim punkcie skarpa i teren mają tę samą wysokość – powierzchnia skarpy „wychodzi” na teren. To dokładnie metoda przecinania dwóch powierzchni warstwicami (jak przecięcie płaszczyzn w 5.2).',
      });
      cN.concat(cW).forEach((q, i) => {
        const isN = i < cN.length;
        const id = 'cp' + i;
        B.a2({ t: 'pt', id, p: q.p, s: isN ? 'aux' : 'aux2', r: 2.6 });
        B.a3({ t: 'pt', id, p: [q.p[0], q.p[1], q.k], s: isN ? 'aux' : 'aux2', small: true });
        B.info(id, 'Punkt granicy robót o cesze ' + q.k + ': warstwica skarpy ' + (isN ? 'nasypu' : 'wykopu') + ' ∩ warstwica terenu', [(isN ? 'sn' : 'sw') + q.k, 'tw' + q.k]);
      });
      B.step({
        title: 'Granice robót: stopa nasypu i korona wykopu',
        co: 'Łączymy punkty płynną linią: <b>granica nasypu</b> (stopa skarpy) i <b>granica wykopu</b> (górna krawędź skarpy).',
        jak: 'Linia przechodzi przez punkty w kolejności; między nimi prowadzimy ją zgodnie z przebiegiem warstwic (interpolacja). Na narożach granica załamuje się na krawędzi skarp.',
        why: 'Granica robót = krzywa przecięcia powierzchni skarp z powierzchnią terenu. Poza nią teren pozostaje nienaruszony.',
      });
      bN.forEach((ln, i) => {
        B.a2({ t: 'pl', id: 'bN', pts: ln, s: 'res', w: 2.4 });
        B.a3({ t: 'pl', id: 'bN', pts: ln.map((q) => [q[0], q[1], T(q[0], q[1]) + 0.08]), s: 'res' });
      });
      bW.forEach((ln) => {
        B.a2({ t: 'pl', id: 'bW', pts: ln, s: 'res2', w: 2.4 });
        B.a3({ t: 'pl', id: 'bW', pts: ln.map((q) => [q[0], q[1], T(q[0], q[1]) + 0.08]), s: 'res2' });
      });
      B.info('bN', 'Granica nasypu (stopa skarpy nasypu)');
      B.info('bW', 'Granica wykopu (górna krawędź skarpy wykopu)');
      // naroża
      const corners = [];
      plat.forEach((q, i) => {
        const e1 = edges[(i - 1 + ne) % ne],
          e2 = edges[i];
        const isN = T(q[0], q[1]) < H;
        const dir = V.norm(V.add(e1.nout, e2.nout));
        const f = isN ? fN : fW;
        let L = 0;
        for (let s = 0.2; s < 60; s += 0.2) {
          const P = V.add(q, V.mul(dir, s));
          const v = f(P[0], P[1]);
          if ((isN && v <= 0) || (!isN && v >= 0)) break;
          L = s;
        }
        if (L > 0.3) corners.push({ a: q, b: V.add(q, V.mul(dir, L)), isN });
      });
      B.step({
        title: 'Krawędzie skarp na narożach',
        co: 'Z narożników placu prowadzimy krawędzie przecięcia sąsiednich skarp – do granicy robót.',
        jak: 'Przy równych pochyleniach sąsiednich skarp krawędź jest dwusieczną kąta zewnętrznego naroża (tu: przekątna 45° dla prostokątnego placu). Kontrola: przechodzi przez przecięcia równocechowych warstwic obu skarp.',
        why: 'Dwie płaszczyzny skarp przecinają się wzdłuż prostej przez wspólny punkt (naroże placu); punkty jednakowo odległe od obu brzegów mają jednakową wysokość na obu skarpach.',
      });
      corners.forEach((q, i) => {
        B.a2({ t: 'seg', id: 'cor' + i, a: q.a, b: q.b, s: q.isN ? 'aux' : 'aux2', w: 1.6 });
        B.a3({ t: 'seg', id: 'cor' + i, a: [q.a[0], q.a[1], H], b: [q.b[0], q.b[1], F(q.b[0], q.b[1])], s: q.isN ? 'aux' : 'aux2' });
        B.info('cor' + i, 'Krawędź skarp ' + (q.isN ? 'nasypu' : 'wykopu') + ' na narożu placu');
      });
      // wynik
      B.step({
        title: 'Wynik: plan robót ziemnych i model 3D',
        co: 'Teren po wykonaniu robót: plac, skarpy nasypu (niebieskie warstwice) i wykopu (zielone). Warstwice skarp ograniczone do obszaru robót.',
        jak: 'Włącz „pierwotny teren” w Widoku specjalnym, aby porównać. Najedź na mapę – kropla pokaże spływ po skarpach.',
        why: 'Zmień cechę placu H – zobacz, jak przesuwa się linia zerowa i jak zmienia się proporcja nasyp/wykop. Zmień pochylenia – im łagodniejsza skarpa (większe n), tym szerszy pas robót.',
        cam: { dir: [0.55, 0.85, 0.75] },
      });
      B.data.finalStep = B.cur;
      B.end('terrain0');
      B.endWhere((q) => /^s[nw]\d/.test(q.id) || /^cp\d/.test(q.id));
      const fc = (x, y, z) => {
        if (inside([x, y])) return '#9e9e9e';
        const t = T(x, y);
        if (z > t + 0.01) return '#d9a066';
        if (z < t - 0.01) return '#e6d27a';
        return tc(x, y, z);
      };
      B.a3(surfPrim('terrain', F, box, 160, 120, fc, 1));
      B.info('terrain', 'Teren po robotach: brązowy – nasyp, żółty – wykop, szary – plac');
      const gSnF = G.grid((x, y) => (!inside([x, y]) && fN(x, y) > 0 ? Sn(x, y) : NaN), box[0], box[2], box[1], box[3], NX, NY);
      const gSwF = G.grid((x, y) => (!inside([x, y]) && fW(x, y) < 0 ? Sw(x, y) : NaN), box[0], box[2], box[1], box[3], NX, NY);
      slopeLines(gSnF, lvN, 'snF', 'aux');
      slopeLines(gSwF, lvW, 'swF', 'aux2');
      // wypełnienia obszarów robót w 2D (przybliżone komórkami)
      B.a3({ t: 'pl', id: 'plat', pts: plat.map((q) => [q[0], q[1], H + 0.05]), closed: true, s: 'given' });
    },
  });
})();
