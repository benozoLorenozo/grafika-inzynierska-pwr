/* ===================================================================
   GW – generatory zadań (poziom, typ, opcje → losowe, poprawne dane)
   Każdy generator zwraca „łatkę” parametrów lekcji; aplikacja sprawdza
   poprawność (budowa konstrukcji, warunki zadania) i w razie potrzeby losuje ponownie.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G;
  const Ls = (id) => GW.lessons.find((l) => l.id === id);
  const r05 = (v) => Math.round(v * 2) / 2;
  const rp = (P) => P.map(r05);
  const NAMES3 = ['ABC', 'KLM', 'RST', 'PQR', 'DEF', 'MNO', 'XYZ'];

  /* specyfikacja bryły → wielościan (używana też przez lekcje) */
  GW.specPoly = (s, d = [0, 0, 0]) => {
    const sh = (q) => [q[0] + d[0], q[1] + d[1], q[2] + d[2]];
    if (s.t === 'box') {
      const a = s.a;
      return G.box(a[0] + d[0], a[1] + d[0], a[2] + d[1], a[3] + d[1], a[4] + d[2], a[5] + d[2]);
    }
    if (s.t === 'prismX') return G.prismX(s.prof.map((q) => [q[0] + d[1], q[1] + d[2]]), s.x0 + d[0], s.x1 + d[0]);
    if (s.t === 'prismY') return G.prismY(s.prof.map((q) => [q[0] + d[0], q[1] + d[2]]), s.y0 + d[1], s.y1 + d[1]);
    if (s.t === 'prismZ') return G.prismZ(s.base.map((q) => [q[0] + d[0], q[1] + d[1]]), s.z0 + d[2], s.z1 + d[2]);
    if (s.t === 'pyr') return G.pyramid(s.base.map(sh), sh(s.apex));
    if (s.t === 'prism') return G.prism(s.base.map(sh), s.shift);
    return null;
  };
  const regular = (c, R, n, rot, z = 0) => Array.from({ length: n }, (_, i) => [c[0] + R * Math.cos(rot + (2 * Math.PI * i) / n), c[1] + R * Math.sin(rot + (2 * Math.PI * i) / n), z]);
  const randDir = (R) => {
    const t = R.u(0, 2 * Math.PI),
      z = R.u(-1, 1);
    const s = Math.sqrt(1 - z * z);
    return [s * Math.cos(t), s * Math.sin(t), z];
  };

  /* ---------- trójkąt w położeniu ogólnym ---------- */
  function randTri(R, lv, box) {
    for (let t = 0; t < 300; t++) {
      const P = [0, 1, 2].map(() => [R.u(box[0], box[1]), R.u(box[2], box[3]), R.u(box[4], box[5])].map(r05));
      const n = V.cross(V.sub(P[1], P[0]), V.sub(P[2], P[0]));
      if (V.len(n) / 2 < (lv === 1 ? 1700 : lv === 2 ? 1100 : 650)) continue;
      const nn = V.norm(n);
      if (lv < 3 && (Math.abs(nn[0]) < 0.12 || Math.abs(nn[1]) < 0.22 || Math.abs(nn[2]) < 0.22)) continue;
      if (Math.min(V.dist(P[0], P[1]), V.dist(P[1], P[2]), V.dist(P[2], P[0])) < (lv === 3 ? 18 : 26)) continue;
      return P;
    }
    return null;
  }
  function pierceTask(o, R) {
    const lv = +o.level;
    const T = randTri(R, lv, [10, 110, 6, 75, 6, 82]);
    if (!T) return null;
    const n = V.norm(V.cross(V.sub(T[1], T[0]), V.sub(T[2], T[0])));
    let w = lv === 1 ? [R.u(0.25, 0.45), R.u(0.25, 0.45), R.u(0.25, 0.45)] : lv === 2 ? [R.u(0.12, 1), R.u(0.12, 1), R.u(0.12, 1)] : [R.u(0.04, 0.1), R.u(0.3, 1), R.u(0.3, 1)];
    if (lv === 3 && R.chance(0.5)) w = [w[1], w[2], w[0]];
    const sw = w[0] + w[1] + w[2];
    const P = V.add(V.add(V.mul(T[0], w[0] / sw), V.mul(T[1], w[1] / sw)), V.mul(T[2], w[2] / sw));
    for (let t = 0; t < 80; t++) {
      const d = randDir(R);
      if (Math.abs(V.dot(d, n)) < (lv === 1 ? 0.55 : lv === 2 ? 0.35 : 0.2)) continue;
      if (Math.max(Math.abs(d[0]), Math.abs(d[1]), Math.abs(d[2])) > 0.93) continue;
      const D = rp(V.sub(P, V.mul(d, R.u(28, 48)))),
        E = rp(V.add(P, V.mul(d, R.u(28, 48))));
      const okP = (q) => q[0] >= 0 && q[0] <= 125 && q[1] >= 2 && q[1] <= 85 && q[2] >= 2 && q[2] <= 90;
      if (!okP(D) || !okP(E)) continue;
      const names = R.pick(NAMES3);
      return { set: 'gen', gen: { tri: T, a: [D, E], names }, ldx: 0, ldy: 0, ldz: 0, lrot: 0, _desc: 'Trójkąt ' + names + ' i prosta a (poziom ' + ['', 'łatwy', 'średni', 'trudny'][lv] + ').' };
    }
    return null;
  }

  /* ---------- MODUŁ 1 ---------- */
  Ls('m1-elementy').gen = {
    note: 'Losuje punkty A, B, C. Na poziomie trudnym punkty mogą leżeć blisko rzutni, a ślady – daleko poza rysunkiem.',
    make(o, R) {
      const lv = +o.level;
      for (let t = 0; t < 100; t++) {
        const pt = () => [R.i(12, 100), R.i(lv === 3 ? 3 : 10, lv === 1 ? 55 : 72), R.i(lv === 3 ? 3 : 10, lv === 1 ? 55 : 72)];
        const A = pt(),
          B = pt(),
          C = pt();
        const ar = V.len(V.cross(V.sub(B, A), V.sub(C, A))) / 2;
        if (ar < 500 || Math.abs(A[2] - B[2]) < 5 || Math.abs(A[1] - B[1]) < 5 || V.dist(A, B) < 20) continue;
        const o2 = {};
        [
          ['A', A],
          ['B', B],
          ['C', C],
        ].forEach(([k, P]) => ['x', 'y', 'z'].forEach((c, i) => (o2[k + c] = P[i])));
        o2._desc = 'A(' + A + '), B(' + B + '), C(' + C + ').';
        return o2;
      }
      return null;
    },
    valid: (B) => B.steps.length >= 11,
  };
  Ls('m1-przebicie').gen = {
    types: [
      ['p1', 'płaszczyzna pomocnicza poziomo-rzutująca (⟂ π₁)'],
      ['p2', 'płaszczyzna pomocnicza pionowo-rzutująca (⟂ π₂)'],
      ['auto', 'dowolna (dobór automatyczny)'],
    ],
    note: 'Losuje trójkąt i prostą, która na pewno przebija trójkąt. Poziom trudny: przebicie blisko boku, prosta prawie równoległa do płaszczyzny.',
    make(o, R) {
      const p = pierceTask(o, R);
      if (p) p.meth = o.type || 'p1';
      return p;
    },
  };
  Ls('m1-przebicie-tr').gen = { note: 'Losuje trójkąt i prostą przebijającą go – rozwiąż transformacją (π₄ ⟂ poziomej).', make: (o, R) => pierceTask(o, R) };
  Ls('m1-transformacja').gen = {
    note: 'Losuje trójkąt w położeniu ogólnym – wyznacz jego rzeczywistą wielkość.',
    make(o, R) {
      const T = randTri(R, +o.level, [8, 100, 8, 65, 8, 70]);
      if (!T) return null;
      const P = GW.vVals(['A', 'B', 'C'], T);
      P.names = R.pick(NAMES3);
      P._desc = 'Trójkąt ' + P.names + ': ' + T.map((q) => '(' + q.join('; ') + ')').join(', ') + '.';
      return P;
    },
  };
  Ls('m1-trojkaty').gen = {
    note: 'Losuje dwa przenikające się trójkąty (zawsze z odcinkiem przenikania).',
    make(o, R) {
      const lv = +o.level;
      const T1 = randTri(R, lv, [10, 105, 8, 72, 8, 80]);
      if (!T1) return null;
      const c = G.centroid(T1);
      const sp = lv === 1 ? 32 : 45;
      const T2 = [0, 1, 2].map(() => rp([c[0] + R.u(-sp - 10, sp + 10), Math.max(3, c[1] + R.u(-sp, sp)), Math.max(3, c[2] + R.u(-sp, sp))]));
      const pair = R.pick([
        ['ABC', 'DEF'],
        ['RST', 'ABC'],
        ['KLM', 'PQR'],
      ]);
      return Object.assign(GW.vVals(['D', 'E', 'F'], T2), { t1: T1, n1: pair[0], n2: pair[1], rn: R.pick(['PQ', 'MN']), _desc: 'Trójkąty ' + pair[0] + ' i ' + pair[1] + '.' });
    },
  };

  /* ---------- MODUŁ 2 ---------- */
  const LET = 'ABCDEFGH'.split('');
  Ls('m2-wieloscany').gen = {
    types: [
      ['pp', 'graniastosłup pionowy + graniastosłup poziomy'],
      ['op', 'ostrosłup + graniastosłup poziomy'],
      ['po', 'graniastosłup pionowy + ostrosłup ukośny'],
      ['oo', 'ostrosłup + ostrosłup ukośny'],
    ],
    opts: [
      { k: 'n', type: 'select', l: 'Podstawa bryły I', choices: [[0, 'losowa'], [3, 'trójkąt'], [4, 'czworokąt'], [5, 'pięciokąt'], [6, 'sześciokąt']], v: 0 },
      { k: 'pen', type: 'select', l: 'Rodzaj przenikania', choices: [['any', 'dowolne'], ['2', 'całkowite (2 wieloboki)'], ['1', 'częściowe (1 wielobok)']], v: 'any' },
      { k: 'p3', type: 'check', l: 'z rzutem bocznym π₃', v: false },
    ],
    make(o, R) {
      const lv = +o.level;
      const n = +o.n || R.i(3, lv === 1 ? 4 : 6);
      const c = [60, 45];
      const R1 = R.u(22, 32);
      const rot = lv === 1 ? (n === 4 ? Math.PI / 4 : Math.PI / 2) : R.u(0, 2 * Math.PI);
      const base1 = regular(c, R1, n, rot).map(rp);
      const H1 = r05(R.u(60, 85));
      const t = o.type || 'pp';
      const s1 =
        t[0] === 'o'
          ? { kind: 'pyr', base: base1, apex: rp([c[0] + (lv === 3 ? R.u(-8, 8) : 0), c[1] + (lv === 3 ? R.u(-8, 8) : 0), H1]), names: LET.slice(0, n).concat(['S']), title: 'ostrosłup (podstawa ' + n + '-kątna)' }
          : { kind: 'prism', base: base1, shift: [0, 0, H1], names: LET.slice(0, n), names2: LET.slice(0, n).map((l) => l + '_1'), title: 'graniastosłup pionowy (podstawa ' + n + '-kątna)' };
      let s2;
      const pen = o.pen === 'any' ? R.pick(['1', '2']) : o.pen;
      if (t[1] === 'p') {
        const ax = lv === 1 ? 'y' : R.pick(['x', 'y']);
        const m = lv === 1 ? 3 : R.pick([3, 4]);
        const r2 = R.u(9, 16);
        const zc = R.u(r2 + 6, H1 * (t[0] === 'o' ? 0.5 : 0.75));
        const off = R.u(-R1 * (lv === 1 ? 0.25 : 0.55), R1 * (lv === 1 ? 0.25 : 0.55));
        const pr = R.u(0, 2 * Math.PI);
        const prof = Array.from({ length: m }, (_, i) => [off + r2 * Math.cos(pr + (2 * Math.PI * i) / m), zc + r2 * Math.sin(pr + (2 * Math.PI * i) / m)]).map((q) => [r05(q[0]), r05(q[1])]);
        const cA = ax === 'y' ? c[1] : c[0],
          cB = ax === 'y' ? c[0] : c[1];
        const t0 = pen === '2' ? cA - R1 - R.u(10, 22) : cA + R.u(-R1 * 0.25, R1 * 0.25),
          t1 = cA + R1 + R.u(10, 22);
        const base = prof.map((q) => (ax === 'y' ? [cB + q[0], r05(t0), q[1]] : [r05(t0), cB + q[0], q[1]]));
        const L = r05(t1 - t0);
        s2 = { kind: 'prism', base, shift: ax === 'y' ? [0, L, 0] : [L, 0, 0], names: 'KLMN'.split('').slice(0, m), names2: 'KLMN'.split('').slice(0, m).map((l) => l + '_1'), title: 'graniastosłup poziomy (krawędzie ' + (ax === 'y' ? '⟂ π₂' : '∥ x') + ')' };
      } else {
        const m = R.pick([3, 4]);
        const dir = R.u(0, 2 * Math.PI);
        const du = [Math.cos(dir), Math.sin(dir)];
        const bc = [c[0] + du[0] * (R1 + R.u(8, 20)), c[1] + du[1] * (R1 + R.u(8, 20))];
        const base = regular(bc, R.u(13, 20), m, R.u(0, 6.28)).map(rp);
        const reach = pen === '2' ? R1 + R.u(8, 18) : R.u(-R1 * 0.2, R1 * 0.4);
        const apex = rp([c[0] - du[0] * reach, c[1] - du[1] * reach, R.u(30, Math.max(35, H1 - 8))]);
        s2 = { kind: 'pyr', base, apex, names: 'KLMN'.split('').slice(0, m).concat(['W']), title: 'ostrosłup ukośny (podstawa na π₁)' };
      }
      return { set: 'gen', gen: { s1, s2, pen }, dx: 0, dy: 0, dz: 0, rot: 15, _desc: s1.title + ' + ' + s2.title + '; przenikanie ' + (pen === '2' ? 'całkowite' : 'częściowe') + '.', _p3: o.p3 };
    },
    valid(B, o, P) {
      const L = B.data.loops || [];
      if (!L.length || L.some((l) => !l.closed)) return false;
      if (P.gen.pen === '2' && L.length !== 2) return false;
      if (P.gen.pen === '1' && L.length !== 1) return false;
      return true;
    },
  };

  /* ---------- MODUŁ 3 ---------- */
  function revPair(t, lv, R) {
    const cx = 60,
      cy = 45;
    const Rc = r05(R.u(32, 42)),
      Hc = r05(R.u(70, 90));
    const off = (k) => (lv === 1 ? 0 : R.u(-k, k));
    const coneS = (rt) => ({ k: 'cone', cx, cy, z0: 0, H: Hc, R: Rc, rt: rt || 0 });
    const cylHS = (Rref) => {
      const ax = lv === 1 ? 'y' : R.pick(['x', 'y']);
      const r = r05(R.u(9, 15));
      const zc = r05(R.u(r + 5, Hc * 0.5));
      const a = (ax === 'y' ? cx : cy) + off(Rref * 0.4);
      const cA = ax === 'y' ? cy : cx;
      const full = lv < 3 || R.chance(0.5);
      return { k: 'cylH', ax, a: r05(a), zc, r, t0: r05(full ? cA - Rref - 22 : cA + R.u(-5, 5)), t1: r05(cA + Rref + 22) };
    };
    if (t === 'cc' || t === 'fc') {
      const C = coneS(t === 'fc' ? r05(Rc * R.u(0.3, 0.5)) : 0);
      return { A: cylHS(Rc), B: C, title: (t === 'fc' ? 'Stożek ścięty' : 'Stożek') + ' + walec poziomy' };
    }
    if (t === 'cs' || t === 'vs') {
      const C = t === 'cs' ? coneS(0) : { k: 'cylV', cx, cy, z0: 0, H: Hc, R: r05(Rc * 0.65) };
      const r = r05(R.u(13, 22));
      const z0 = R.u(r * 0.6, Hc * 0.6);
      const rc = t === 'cs' ? Rc * (1 - z0 / Hc) : C.R;
      const dd = rc + R.u(-r * (lv === 1 ? 0.3 : 0.65), r * (lv === 1 ? 0.3 : 0.65));
      const ang = lv === 1 ? 0 : R.u(-1.2, 1.2);
      return { A: C, B: { k: 'sphere', cx: r05(cx + dd * Math.cos(ang)), cy: r05(cy + dd * Math.sin(ang)), cz: r05(z0), r }, title: (t === 'cs' ? 'Stożek' : 'Walec pionowy') + ' + kula' };
    }
    if (t === 'vv') {
      const Rv = r05(R.u(22, 30));
      const C = { k: 'cylV', cx, cy, z0: 0, H: Hc, R: Rv };
      return { A: cylHS(Rv), B: C, title: 'Walec pionowy + walec poziomy' };
    }
    // cv: stożek + walec pionowy przesunięty
    const C = coneS(0);
    const rv = r05(Rc * R.u(0.3, 0.5));
    const dd = R.u(Rc * 0.35, Rc * 0.8);
    const ang = R.u(0, 2 * Math.PI);
    return { A: { k: 'cylV', cx: r05(cx + dd * Math.cos(ang)), cy: r05(cy + dd * Math.sin(ang)), z0: 0, H: r05(Hc * R.u(0.75, 1)), R: rv }, B: C, title: 'Stożek + walec pionowy' };
  }
  Ls('m3-obrotowe').gen = {
    types: [
      ['cc', 'stożek + walec poziomy'],
      ['fc', 'stożek ścięty + walec poziomy'],
      ['cs', 'stożek + kula'],
      ['vs', 'walec pionowy + kula'],
      ['vv', 'walec pionowy + walec poziomy'],
      ['cv', 'stożek + walec pionowy'],
    ],
    note: 'Poziom łatwy: osie się przecinają (symetria). Trudniejsze: przesunięcia, walec o osi ∥ x, przenikanie częściowe.',
    make(o, R) {
      const g = revPair(o.type || 'cc', +o.level, R);
      return { set: 'gen', gen: g, dx: 0, dy: 0, dz: 0, sc1: 100, sc2: 100, _desc: g.title + '.' };
    },
  };
  Ls('m3-mieszane').gen = {
    types: [
      ['wedge', 'stożek / stożek ścięty + klin'],
      ['vprism', 'czasza kulista + graniastosłup pionowy'],
      ['hprism', 'walec pionowy + graniastosłup poziomy'],
    ],
    make(o, R) {
      const lv = +o.level;
      const t = o.type || 'wedge';
      const cx = 60,
        cy = 45;
      if (t === 'wedge') {
        const Rc = r05(R.u(32, 42)),
          Hc = r05(R.u(38, 60));
        const rt = R.chance(0.6) ? r05(Rc * R.u(0.2, 0.4)) : 0;
        const x0 = r05(cx + (lv === 1 ? 0 : R.u(-8, 6))),
          x1 = r05(cx + Rc + R.u(0, 6));
        const zt = r05(Hc * (lv === 1 ? 1 : R.u(0.6, 1)));
        return {
          set: 'gen',
          gen: { A: { k: 'cone', cx, cy, z0: 0, H: Hc, R: Rc, rt }, B: { k: 'poly', spec: { t: 'prismY', prof: [[x0, 0], [x1, 0], [x1, zt]], y0: cy - Rc - 10, y1: cy + Rc + 10 }, title: 'klin (graniastosłup trójkątny ⟂ π₂)' }, title: (rt ? 'Stożek ścięty' : 'Stożek') + ' + klin', mixed: true },
          dx: 0,
          dy: 0,
          dz: 0,
          sc1: 100,
          sc2: 100,
          _desc: (rt ? 'Stożek ścięty' : 'Stożek') + ' + klin.',
        };
      }
      if (t === 'vprism') {
        const Rb = r05(R.u(36, 48)),
          Hc = r05(Rb * R.u(0.8, 1.2));
        const Rs = (Rb * Rb + Hc * Hc) / (2 * Hc);
        const k = R.u(0.55, lv === 1 ? 0.8 : 0.95);
        const a0 = R.u(0, 2 * Math.PI);
        const base = [0, 1, 2].map((i) => [r05(cx + Rb * k * Math.cos(a0 + i * 2.1 + R.u(-0.2, 0.2))), r05(cy + Rb * k * Math.sin(a0 + i * 2.1 + R.u(-0.2, 0.2)))]);
        return {
          set: 'gen',
          gen: { A: { k: 'sphere', cx, cy, cz: Hc - Rs, r: Rs, zc: 0 }, B: { k: 'poly', spec: { t: 'prismZ', base, z0: 0, z1: r05(Hc + R.u(10, 22)) }, names: ['A', 'B', 'C', 'A_1', 'B_1', 'C_1'], title: 'graniastosłup trójkątny pionowy' }, title: 'Czasza kulista + graniastosłup', mixed: true },
          dx: 0,
          dy: 0,
          dz: 0,
          sc1: 100,
          sc2: 100,
          _desc: 'Czasza kulista (D = ' + 2 * Rb + ', h = ' + Hc + ') + graniastosłup trójkątny.',
        };
      }
      const Rv = r05(R.u(24, 32)),
        Hv = r05(R.u(65, 80));
      const c = [r05(cx + (lv === 1 ? 0 : R.u(-10, 10))), r05(R.u(25, 45))],
        r = r05(R.u(14, 20));
      const m = R.pick([3, 4]);
      const pr = lv === 1 ? Math.PI / 2 : R.u(0, 6.28);
      const prof = Array.from({ length: m }, (_, i) => [r05(c[0] + r * Math.cos(pr + (2 * Math.PI * i) / m)), r05(c[1] + r * Math.sin(pr + (2 * Math.PI * i) / m))]);
      return {
        set: 'gen',
        gen: { A: { k: 'cylV', cx, cy, z0: 0, H: Hv, R: Rv }, B: { k: 'poly', spec: { t: 'prismY', prof, y0: cy - Rv - 14, y1: cy + Rv + 14 }, title: 'graniastosłup ' + (m === 3 ? 'trójkątny' : 'czworokątny') + ' ⟂ π₂' }, title: 'Walec pionowy + graniastosłup poziomy', mixed: true },
        dx: 0,
        dy: 0,
        dz: 0,
        sc1: 100,
        sc2: 100,
        _desc: 'Walec pionowy + graniastosłup ' + (m === 3 ? 'trójkątny' : 'czworokątny') + ' poziomy.',
      };
    },
  };

  /* ---------- MODUŁ 4 ---------- */
  Ls('m4-uklady').gen = {
    types: [
      ['iso', 'izometria'],
      ['dimp', 'dimetria prostokątna'],
      ['dimu', 'perspektywa kawalerska'],
      ['woj', 'perspektywa wojskowa'],
    ],
    make(o, R) {
      const a = R.i(35, 75),
        c = R.i(30, 65);
      return { ax: o.type, a, b: R.i(22, 60), c, a2: R.i(10, a - 10), c2: R.i(8, c - 8), _desc: 'Bryła schodkowa ' + a + ' × … w układzie: ' + o.type + '.' };
    },
  };
  Ls('m4-przekroj').gen = {
    types: [
      ['prism', 'graniastosłup'],
      ['pyr', 'ostrosłup'],
    ],
    make(o, R) {
      const H = R.i(50, 85);
      return { solid: o.type, n: R.pick([4, 5, 6]), R: R.i(22, 36), H, phi: R.i(-50, 50), off: R.i(40, 70), hP: R.i(Math.round(H * 0.3), Math.round(H * 0.7)), rot0: R.i(0, 60), ax: R.pick(['iso', 'dimp', 'dimu']), _desc: (o.type === 'pyr' ? 'Ostrosłup' : 'Graniastosłup') + ' przecięty płaszczyzną (ślad t + punkt P).' };
    },
  };
  const CUBE_E = (() => {
    const c = (i, j, k) => [i * 60, j * 60, k * 60];
    const E = [];
    for (let a = 0; a < 2; a++)
      for (let b = 0; b < 2; b++) E.push([c(0, a, b), c(1, a, b)], [c(a, 0, b), c(a, 1, b)], [c(a, b, 0), c(a, b, 1)]);
    return E;
  })();
  const shareFace = (e1, e2) => [0, 1, 2].some((ax) => [0, 60].some((v) => [e1[0], e1[1], e2[0], e2[1]].every((q) => Math.abs(q[ax] - v) < 1e-9)));
  function lista4Parts(t, R) {
    if (t === 'cube') return { parts: [{ t: 'box', a: [0, 60, 0, 60, 0, 60] }], d: 'sześcian' };
    if (t === 'stairs') {
      const k = R.i(2, 3);
      const along = R.pick(['y', 'x']);
      const parts = [];
      for (let i = 0; i < k; i++) {
        const z0 = (60 * i) / k,
          z1 = (60 * (i + 1)) / k,
          w = 60 - (60 * i) / k;
        parts.push({ t: 'box', a: along === 'y' ? [0, 60, 0, w, z0, z1] : [0, w, 0, 60, z0, z1] });
      }
      return { parts, d: 'schodki (' + k + ' stopnie)' };
    }
    if (t === 'notch') {
      const a = R.pick([15, 20, 25]),
        b = a + R.pick([15, 20, 25]),
        dpt = R.pick([20, 30, 40]),
        full = R.chance(0.6);
      const parts = [
        { t: 'box', a: [0, a, 0, 60, 0, 60] },
        { t: 'box', a: [b, 60, 0, 60, 0, 60] },
        { t: 'box', a: [a, b, 0, 60 - dpt, 0, 60] },
      ];
      if (!full) parts.push({ t: 'box', a: [a, b, 60 - dpt, 60, 0, 30] });
      return { parts, d: 'sześcian z wycięciem ' + (full ? 'na całą wysokość' : 'w górnej części') };
    }
    if (t === 'wedge') {
      const s = R.pick([0, 20, 30, 40]);
      const x0 = R.pick([0, 20, 30]);
      const parts = [{ t: 'prismX', prof: [[60, 0], [0, 0], [0, 60], [s, 60]], x0, x1: 60 }];
      if (x0 > 0) parts.push({ t: 'box', a: [0, x0, 0, 60, 0, 60] });
      return { parts, d: 'bryła ze skośną ścianą' };
    }
    if (t === 'pyr') return { parts: [{ t: 'pyr', base: [[0, 0, 0], [60, 0, 0], [60, 60, 0], [0, 60, 0]], apex: [R.pick([15, 30, 45]), R.pick([15, 30, 45]), 60] }], d: 'ostrosłup wpisany w sześcian' };
    return lista4Parts(R.pick(['cube', 'stairs', 'notch', 'wedge', 'pyr']), R);
  }
  Ls('m4-lista').gen = {
    types: [
      ['mix', 'dowolna bryła'],
      ['cube', 'sześcian'],
      ['stairs', 'schodki'],
      ['notch', 'sześcian z wycięciem'],
      ['wedge', 'bryła ze skosem'],
      ['pyr', 'ostrosłup wpisany w sześcian'],
    ],
    note: 'Poziom łatwy: dwa z punktów leżą na wspólnej ścianie (od razu jest pierwszy bok przekroju). Trudny: żadne dwa punkty nie leżą na wspólnej ścianie – potrzebny punkt śladowy.',
    make(o, R) {
      const lv = +o.level;
      const P = lista4Parts(o.type || 'mix', R);
      for (let t = 0; t < 200; t++) {
        const idx = [];
        while (idx.length < 3) {
          const i = R.i(0, 11);
          if (idx.indexOf(i) < 0) idx.push(i);
        }
        const E = idx.map((i) => CUBE_E[i]);
        const sh = [shareFace(E[0], E[1]), shareFace(E[1], E[2]), shareFace(E[0], E[2])].filter(Boolean).length;
        if (lv === 1 && sh < 2) continue;
        if (lv === 3 && sh > 0) continue;
        const pts = E.map((e) => {
          const f = R.round(R.u(0.2, 0.8), 0.05);
          const q = V.lerp(e[0], e[1], f).map(r05);
          return [q[0], q[1], q[2], e[0], e[1]];
        });
        const pl = G.plane3(pts[0].slice(0, 3), pts[1].slice(0, 3), pts[2].slice(0, 3));
        if (!isFinite(pl.n[0]) || Math.max(...pl.n.map(Math.abs)) > 0.985) continue;
        return { set: 'gen', gen: { parts: P.parts, A: pts[0], B: pts[1], C: pts[2], d: P.d }, dA: 0, dB: 0, dC: 0, _desc: P.d + ', punkty A, B, C na krawędziach sześcianu.' };
      }
      return null;
    },
    valid: (B) => B.steps.length >= 6,
  };

  /* ---------- MODUŁ 5 ---------- */
  const intH = (R, a, b) => R.i(a, b);
  Ls('m5-przebicie').gen = {
    note: 'Losuje płaszczyznę (3 punkty z cechami, wielobok) i prostą przebijającą ją wewnątrz wieloboku.',
    make(o, R) {
      for (let t = 0; t < 100; t++) {
        const A = [R.u(2, 8), R.u(4, 20), intH(R, -1, 5)],
          Bq = [R.u(12, 22), R.u(2, 10), intH(R, -1, 5)],
          C = [R.u(12, 22), R.u(14, 22), intH(R, -1, 5)];
        if (new Set([A[2], Bq[2], C[2]]).size < 2) continue;
        if (Math.abs(G.polyArea2([A, Bq, C].map((q) => [q[0], q[1]]))) < 40) continue;
        const pl = G.plane3(A, Bq, C);
        const f = (x, y) => (pl.d - pl.n[0] * x - pl.n[1] * y) / pl.n[2];
        const cen = G.centroid([A, Bq, C]);
        const Dq = V.sub(V.add(A, C), Bq);
        const poly = [A, Bq, C, Dq].map((q) => [q[0], q[1]]);
        const hull = G.hull2(poly);
        if (hull.length < 4) continue;
        // wielobok = równoległobok ABCD: punkty wyznaczające płaszczyznę są jego wierzchołkami
        const ex = hull;
        if (ex.some((q) => q[0] < 0 || q[0] > 26 || q[1] < 0 || q[1] > 26)) continue;
        const w = [R.u(0.2, 0.8), R.u(0.2, 0.8)];
        const P = [cen[0] + (ex[0][0] - cen[0]) * (w[0] - 0.5) * 0.8, cen[1] + (ex[1][1] - cen[1]) * (w[1] - 0.5) * 0.8];
        if (!G.pointInPoly2(P, ex)) continue;
        const Pz = f(P[0], P[1]);
        const ang = R.u(0, 6.28),
          dir = [Math.cos(ang), Math.sin(ang)];
        const iv = R.u(3, 6.5);
        const h3 = Math.round(Pz) + R.pick([1, 2]),
          h2 = h3 - 1;
        const at = (hh) => [P[0] + dir[0] * (Pz - hh) * iv, P[1] + dir[1] * (Pz - hh) * iv, hh];
        const l3 = at(h3),
          l2 = at(h2);
        if ([l3, l2].some((q) => q[0] < -2 || q[0] > 26 || q[1] < -2 || q[1] > 26)) continue;
        return { set: 'gen', gen: { A, B: Bq, C, poly: ex, l3, l2 }, gam: R.i(-70, 70), _desc: 'Płaszczyzna A(' + A[2] + '), B(' + Bq[2] + '), C(' + C[2] + '), prosta przez punkty o cechach ' + h3 + ' i ' + h2 + '.' };
      }
      return null;
    },
  };
  Ls('m5-wieloboki').gen = {
    make(o, R) {
      for (let t = 0; t < 100; t++) {
        const c = [9, 12];
        const angs = [0, 1, 2, 3].map((i) => i * 1.5708 + R.u(-0.5, 0.5));
        const quad = angs.map((a) => [c[0] + R.u(5, 9) * Math.cos(a), c[1] + R.u(6, 10) * Math.sin(a)]);
        const h = [intH(R, -1, 4), intH(R, -1, 4), intH(R, -1, 4)];
        if (new Set(h).size < 2) continue;
        const Q = quad.map((q, i) => [q[0], q[1], i < 3 ? h[i] : 0]);
        const tc = [c[0] + R.u(-3, 3), c[1] + R.u(-4, 4)];
        const T = [0, 1, 2].map((i) => {
          const a = R.u(0, 6.28);
          return [tc[0] + R.u(6, 11) * Math.cos(a + i * 2.1), tc[1] + R.u(6, 11) * Math.sin(a + i * 2.1), intH(R, -1, 4)];
        });
        if (T.some((q) => q[0] < -2 || q[1] < -2 || q[0] > 22 || q[1] > 26)) continue;
        return { set: 'gen', gen: { ABCD: Q, EFG: T }, dE: 0, dF: 0, dG: 0, _desc: 'Wielobok ABCD (cechy ' + h.join(', ') + ', …) i trójkąt EFG (' + T.map((q) => q[2]).join(', ') + ').' };
      }
      return null;
    },
  };
  /* teren + obiekt dla robót ziemnych */
  GW.genEW = (g) => {
    const T = (x, y) => g.t0 + g.gx * x + g.gy * y + g.bumps.reduce((s, b) => s + b.A * Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.s * b.s)), 0);
    const hd = g.hd;
    let hD;
    if (hd.kind === 'flat') hD = () => hd.H;
    else if (hd.kind === 'road') hD = (x, y) => hd.h0 + ((hd.h1 - hd.h0) * Math.max(0, Math.min(1, V.dot(V.sub([x, y], hd.a), hd.d) / hd.len)));
    else hD = (x, y) => (G.pointInPoly2([x, y], hd.plat) ? hd.H : hd.H + ((hd.h1 - hd.H) * Math.max(0, Math.min(1, V.dot(V.sub([x, y], hd.a), hd.d) / hd.len))));
    return { name: g.name, T, box: g.box, outline: g.outline, open: g.open, hD, mw: g.mw, mn: g.mn, unit: 'm', note: g.note };
  };
  Ls('m5-skarpy').gen = {
    types: [
      ['plat', 'platforma pozioma'],
      ['platroad', 'platforma z drogą dojazdową'],
      ['road', 'droga pochyła przez teren'],
    ],
    opts: [
      { k: 'ter', type: 'select', l: 'Ukształtowanie terenu', choices: [['random', 'losowe'], ['slope', 'stok'], ['hill', 'wzgórze'], ['valley', 'dolina']], v: 'random' },
      { k: 'mods', type: 'select', l: 'Skarpy (wykop / nasyp)', choices: [['1-1.5', '1:1 / 1:1,5'], ['1-1', '1:1 / 1:1'], ['1.5-2', '1:1,5 / 1:2'], ['rand', 'losowe']], v: '1-1.5' },
    ],
    note: 'Losuje teren (warstwice), obiekt (platformę, drogę) z cechami i moduły skarp. Poziom trudny: większe różnice wysokości, obrócony obiekt, droga o większym spadku.',
    make(o, R) {
      const lv = +o.level;
      const box = [0, 0, 80, 60];
      const ter = o.ter === 'random' ? R.pick(['slope', 'hill', 'valley']) : o.ter;
      const t0 = R.i(20, 60);
      const gx = R.u(0.02, 0.07) * R.pick([1, -1]),
        gy = R.u(0.01, 0.05) * R.pick([1, -1]);
      const bumps = [];
      if (ter === 'hill') bumps.push({ x: R.u(25, 60), y: R.u(15, 45), A: R.u(2.5, 4.5), s: R.u(14, 22) });
      if (ter === 'valley') bumps.push({ x: R.u(20, 60), y: R.u(15, 45), A: -R.u(2.5, 4), s: R.u(14, 22) });
      if (lv >= 2) bumps.push({ x: R.u(5, 75), y: R.u(5, 55), A: R.u(-1.5, 1.5), s: R.u(10, 16) });
      const g = { t0, gx, gy, bumps, box };
      const T = (x, y) => t0 + gx * x + gy * y + bumps.reduce((s, b) => s + b.A * Math.exp(-((x - b.x) ** 2 + (y - b.y) ** 2) / (b.s * b.s)), 0);
      const md = o.mods === 'rand' ? R.pick(['1-1.5', '1-1', '1.5-2']) : o.mods;
      g.mw = +md.split('-')[0];
      g.mn = +md.split('-')[1];
      const t = o.type || 'plat';
      if (t === 'road') {
        const a = [0, r05(R.u(14, 46))],
          b = [80, r05(R.u(14, 46))];
        const d = V.norm(V.sub(b, a)),
          n = V.perp2(d);
        const w = r05(R.u(3.5, 5));
        const h0 = Math.round(T(...a) + R.u(-1, 1)),
          h1 = h0 + R.pick(lv === 1 ? [1, 2] : [-3, -2, 2, 3]);
        const P = (q, s, hh) => V.add(q, V.mul(n, s)).concat([hh]);
        g.outline = [P(a, -w, h0), P(b, -w, h1), P(b, w, h1), P(a, w, h0)];
        g.open = [false, true, false, true];
        g.hd = { kind: 'road', a, d, len: V.dist(a, b), h0, h1 };
        g.name = '🎲 Droga ' + h0 + ' → ' + h1 + ' (szer. ' + 2 * w + ' m)';
        g.note = 'Krawędzie drogi są pochyłe – skarpy wyznaczamy stożkami.';
      } else {
        const c = [r05(40 + R.u(-6, 6)), r05(30 + R.u(-5, 5))];
        const W = r05(R.u(16, 26)),
          Hh = r05(R.u(10, 15));
        const th = lv === 1 ? 0 : (R.u(-35, 35) * Math.PI) / 180;
        const rot = (q) => [c[0] + q[0] * Math.cos(th) - q[1] * Math.sin(th), c[1] + q[0] * Math.sin(th) + q[1] * Math.cos(th)];
        const corners = [
          [-W / 2, -Hh / 2],
          [W / 2, -Hh / 2],
          [W / 2, Hh / 2],
          [-W / 2, Hh / 2],
        ].map(rot);
        const H = r05(T(...c) + (lv === 1 ? R.u(-0.4, 0.4) : R.u(-1.6, 1.6)));
        if (t === 'plat') {
          g.outline = corners.map((q) => q.concat([H]));
          g.hd = { kind: 'flat', H };
          g.name = '🎲 Platforma +' + H;
        } else {
          const ei = R.i(0, 3);
          const P0 = corners[ei],
            P1 = corners[(ei + 1) % 4];
          const u = V.norm(V.sub(P1, P0));
          let nout = V.perp2(u);
          if (V.dot(nout, V.sub(V.mid(P0, P1), c)) < 0) nout = V.mul(nout, -1);
          const Le = V.dist(P0, P1);
          const rw = Math.min(Le * 0.6, r05(R.u(5, 8)));
          const s0 = Le * (lv === 1 ? 0.5 : R.u(0.35, 0.65)) - rw / 2;
          const len = r05(R.u(12, 20));
          const h1 = H + R.pick(lv === 1 ? [1, -1] : [-2, -1.5, 1.5, 2]);
          const R0 = V.add(P0, V.mul(u, s0)),
            R1 = V.add(P0, V.mul(u, s0 + rw));
          const R0o = V.add(R0, V.mul(nout, len)),
            R1o = V.add(R1, V.mul(nout, len));
          const out = [];
          for (let i = 0; i < 4; i++) {
            const Q = corners[(ei + 1 + i) % 4];
            out.push(Q.concat([H]));
          }
          // kolejność: P1, P2, P3, P0 → wstaw drogę między P0 a P1
          out.push(R0.concat([H]), R0o.concat([h1]), R1o.concat([h1]), R1.concat([H]));
          g.outline = out;
          g.hd = { kind: 'platroad', H, h1, a: R0, d: nout, len, plat: corners };
          g.name = '🎲 Platforma +' + H + ' z drogą do (' + h1 + ')';
        }
        g.note = 'Wylosowany teren i obiekt.';
      }
      if (g.outline.some((q) => q[0] < 6 || q[0] > 74 || q[1] < 6 || q[1] > 54)) {
        if (t !== 'road') return null;
      }
      return { set: 'gen', gen: g, dH: 0, kw: 1, kn: 1, _desc: g.name.replace('🎲 ', '') + '; skarpy wykop 1:' + g.mw + ', nasyp 1:' + g.mn + ' (teren: ' + ter + ').' };
    },
  };

  /* ---------- MODUŁ 6 ---------- */
  const bxT = (x0, x1, t0, t1, z0, z1) => ({ t: 'box', a: [x0, x1, -t1, -t0, z0, z1] });
  Ls('m6-rzuty').gen = {
    types: [
      ['poly', 'wielokąt na podstawie'],
      ['box', 'prostopadłościan'],
      ['two', 'dwa prostopadłościany'],
      ['hole', 'bryła z otworem'],
      ['pyr', 'ostrosłup / klin'],
      ['stairs', 'bryła schodkowa'],
    ],
    note: 'Losuje bryłę w rzutach prostokątnych, położenie względem tła i stanowiska oraz h i δ.',
    make(o, R) {
      const lv = +o.level;
      const t = o.type || 'box';
      const x0 = R.pick([-60, -40, -30, -20, 10, 20, 30]),
        t0 = R.pick([0, 10, 15, 20]);
      const w = R.pick([40, 50, 60, 70, 80]),
        dpt = R.pick([30, 40, 50]),
        H = R.pick([40, 50, 60, 70, 80]);
      const gen = { h: R.pick(lv === 1 ? [30, 40] : [25, 30, 35, 40, 45, 50]), d: R.pick(lv === 1 ? [90] : [70, 80, 90, 100, 120]), gs: R.pick([1, -1]) };
      if (t === 'poly') {
        const a = R.pick([20, 30, 40]),
          b = R.pick([20, 30, 40]);
        gen.poly = [[x0, t0], [x0 + w, t0], [x0 + w, t0 + b], [x0 + w + a, t0 + b], [x0 + w + a, t0 + b + dpt], [x0, t0 + b + dpt]];
        if (lv === 1) gen.poly = [[x0, t0], [x0 + w, t0], [x0 + w, t0 + dpt], [x0, t0 + dpt]];
      } else if (t === 'box') gen.parts = [bxT(x0, x0 + w, t0, t0 + dpt, 0, H)];
      else if (t === 'two') {
        const g2 = R.pick([20, 30]);
        gen.parts = [bxT(x0, x0 + w * 0.6, t0, t0 + 20, 0, H), bxT(x0 + (lv === 1 ? 0 : R.pick([0, 20])), x0 + (lv === 1 ? 0 : 20) + w * 0.6, t0 + 20 + g2, t0 + 40 + g2, 0, R.pick([H, H * 0.6]))];
      } else if (t === 'hole') {
        const hw = R.pick([20, 30]),
          hz0 = R.pick([10, 20]),
          hz1 = H - R.pick([10, 20]);
        const a0 = x0 + R.pick([15, 20]);
        gen.parts = [bxT(x0, a0, t0, t0 + dpt, 0, H), bxT(a0 + hw, x0 + w + 10, t0, t0 + dpt, 0, H), bxT(a0, a0 + hw, t0, t0 + dpt, 0, hz0), bxT(a0, a0 + hw, t0, t0 + dpt, hz1, H)];
      } else if (t === 'pyr') {
        const ap = R.pick([
          [x0 + w, -t0, H],
          [x0, -t0, H],
          [x0 + w / 2, -(t0 + dpt / 2), H],
        ]);
        gen.parts = [{ t: 'pyr', base: [[x0, -t0, 0], [x0 + w, -t0, 0], [x0 + w, -(t0 + dpt), 0], [x0, -(t0 + dpt), 0]], apex: ap }];
      } else {
        const k = R.pick([2, 3]);
        gen.parts = Array.from({ length: k }, (_, i) => bxT(x0, x0 + w, t0 + (i * dpt) / k, t0 + dpt, (i * H) / k, ((i + 1) * H) / k));
      }
      gen.n = '🎲 ' + { poly: 'wielokąt na podstawie', box: 'prostopadłościan', two: 'dwa prostopadłościany', hole: 'bryła z otworem', pyr: 'ostrosłup/klin', stairs: 'bryła schodkowa' }[t] + ', h = ' + gen.h + ', δ = ' + gen.d;
      return { set: 'gen', gen, gs: 'auto', dh: 0, dd: 0, gx: 0, _desc: gen.n.replace('🎲 ', '') + '.' };
    },
  };
})();
