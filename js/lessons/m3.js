/* ===================================================================
   MODUŁ 3 – Przenikanie brył obrotowych (metoda płaszczyzn poziomych – "plasterkowa")
   oraz brył obrotowych z wielościanami.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G,
    h = GW.h;
  const TAU = Math.PI * 2;

  /* ---------- pomocnicze łuki ---------- */
  const arc = (c, r, a0, a1, f, n = 72) => {
    const p = [];
    for (let i = 0; i <= n; i++) p.push(f(c, r, a0 + ((a1 - a0) * i) / n));
    return p;
  };
  const XY = (c, r, a) => [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]];
  const XZ = (c, r, a) => [c[0] + r * Math.cos(a), c[1], c[2] + r * Math.sin(a)];
  const YZ = (c, r, a) => [c[0], c[1] + r * Math.cos(a), c[2] + r * Math.sin(a)];
  const seg = (a, b, n = 24) => {
    const p = [];
    for (let i = 0; i <= n; i++) p.push(V.lerp(a, b, i / n));
    return p;
  };

  /* ---------- bryły obrotowe ---------- */
  /* stożek (rt = 0) lub stożek ścięty o osi pionowej */
  function cone(cx, cy, z0, H, R, rt = 0) {
    const z1 = z0 + H;
    const r = (z) => R + ((rt - R) * (z - z0)) / H;
    const S = {
      kind: 'cone',
      name: rt > 0 ? 'stożek ścięty' : 'stożek',
      F: (P) => Math.max(Math.hypot(P[0] - cx, P[1] - cy) - r(P[2]), z0 - P[2], P[2] - z1),
      param: (u, s) => {
        const rr = rt + s * (R - rt);
        return [cx + rr * Math.cos(u), cy + rr * Math.sin(u), z1 - s * H];
      },
      normal: (P) => {
        if (P[2] > z1 - 1e-6 && rt > 0 && Math.hypot(P[0] - cx, P[1] - cy) < rt - 1e-6) return [0, 0, 1];
        if (P[2] < z0 + 1e-6 && Math.hypot(P[0] - cx, P[1] - cy) < R - 1e-6) return [0, 0, -1];
        const d = V.norm([P[0] - cx, P[1] - cy, 0]);
        return V.norm([d[0], d[1], (R - rt) / H]);
      },
      sec: (c) => (c < z0 - 1e-9 || c > z1 + 1e-9 ? [] : [{ k: 'circle', c: [cx, cy], r: Math.max(0, r(c)) }]),
      zr: [z0, z1],
      outline: {
        p1: [arc([cx, cy, z0], R, 0, TAU, XY)].concat(rt > 0 ? [arc([cx, cy, z1], rt, 0, TAU, XY)] : []),
        p2: [seg([cx - R, cy, z0], [cx - rt, cy, z1]), seg([cx + R, cy, z0], [cx + rt, cy, z1]), arc([cx, cy, z0], R, 0, Math.PI, XY)].concat(rt > 0 ? [arc([cx, cy, z1], rt, 0, Math.PI, XY)] : []),
        p3: [seg([cx, cy - R, z0], [cx, cy - rt, z1]), seg([cx, cy + R, z0], [cx, cy + rt, z1]), arc([cx, cy, z0], R, Math.PI / 2, 1.5 * Math.PI, XY)].concat(rt > 0 ? [arc([cx, cy, z1], rt, Math.PI / 2, 1.5 * Math.PI, XY)] : []),
      },
      mesh: (u, v) => {
        const rr = rt + v * (R - rt);
        return [cx + rr * Math.cos(u), cy + rr * Math.sin(u), z1 - v * H];
      },
      caps: [{ c: [cx, cy, z0], r: R, n: [0, 0, -1] }].concat(rt > 0 ? [{ c: [cx, cy, z1], r: rt, n: [0, 0, 1] }] : []),
      desc: (rt > 0 ? 'stożek ścięty (D = ' + G.f0(2 * R) + ', d = ' + G.f0(2 * rt) : 'stożek obrotowy (D = ' + G.f0(2 * R)) + ', h = ' + G.f0(H) + ')',
      axis: [cx, cy],
    };
    if (!(rt > 0)) S.apex = [cx, cy, z1];
    return S;
  }
  function cylV(cx, cy, z0, H, R) {
    const z1 = z0 + H;
    return {
      kind: 'cylV',
      name: 'walec',
      F: (P) => Math.max(Math.hypot(P[0] - cx, P[1] - cy) - R, z0 - P[2], P[2] - z1),
      param: (u, s) => [cx + R * Math.cos(u), cy + R * Math.sin(u), z0 + s * H],
      normal: (P) => {
        const rr = Math.hypot(P[0] - cx, P[1] - cy);
        if (rr < R - 1e-6) return P[2] > (z0 + z1) / 2 ? [0, 0, 1] : [0, 0, -1];
        return V.norm([P[0] - cx, P[1] - cy, 0]);
      },
      sec: (c) => (c < z0 - 1e-9 || c > z1 + 1e-9 ? [] : [{ k: 'circle', c: [cx, cy], r: R }]),
      zr: [z0, z1],
      outline: {
        p1: [arc([cx, cy, z1], R, 0, TAU, XY)],
        p2: [seg([cx - R, cy, z0], [cx - R, cy, z1]), seg([cx + R, cy, z0], [cx + R, cy, z1]), arc([cx, cy, z1], R, 0, Math.PI, XY), arc([cx, cy, z0], R, 0, Math.PI, XY)],
        p3: [seg([cx, cy - R, z0], [cx, cy - R, z1]), seg([cx, cy + R, z0], [cx, cy + R, z1]), arc([cx, cy, z1], R, Math.PI / 2, 1.5 * Math.PI, XY), arc([cx, cy, z0], R, Math.PI / 2, 1.5 * Math.PI, XY)],
      },
      mesh: (u, v) => [cx + R * Math.cos(u), cy + R * Math.sin(u), z0 + v * H],
      caps: [
        { c: [cx, cy, z0], r: R, n: [0, 0, -1] },
        { c: [cx, cy, z1], r: R, n: [0, 0, 1] },
      ],
      desc: 'walec obrotowy pionowy (D = ' + G.f0(2 * R) + ', h = ' + G.f0(H) + ')',
      axis: [cx, cy],
    };
  }
  /* kula lub czasza kulista (część kuli nad płaszczyzną z = zc) */
  function sphere(cx, cy, cz, r, zc = -Infinity) {
    const C = [cx, cy, cz];
    const zb = Math.max(zc, cz - r);
    const rb = Math.sqrt(Math.max(0, r * r - (zb - cz) * (zb - cz)));
    const thMax = zc > cz - r ? Math.acos(Math.max(-1, Math.min(1, (zc - cz) / r))) : Math.PI;
    const isCap = zc > cz - r;
    const eqIn = zc < cz;
    const silXZ = isCap ? arc(C, r, eqIn ? -Math.asin((cz - zc) / r) : Math.asin((zc - cz) / r), eqIn ? Math.PI + Math.asin((cz - zc) / r) : Math.PI - Math.asin((zc - cz) / r), XZ, 96) : arc(C, r, 0, TAU, XZ, 96);
    const silYZ = isCap ? arc(C, r, eqIn ? -Math.asin((cz - zc) / r) : Math.asin((zc - cz) / r), eqIn ? Math.PI + Math.asin((cz - zc) / r) : Math.PI - Math.asin((zc - cz) / r), YZ, 96) : arc(C, r, 0, TAU, YZ, 96);
    return {
      kind: 'sphere',
      name: isCap ? 'czasza kulista' : 'kula',
      F: (P) => Math.max(V.dist(P, C) - r, zc - P[2]),
      param: (u, s) => {
        const th = s * thMax;
        return [cx + r * Math.sin(th) * Math.cos(u), cy + r * Math.sin(th) * Math.sin(u), cz + r * Math.cos(th)];
      },
      normal: (P) => (isCap && P[2] < zc + 1e-6 && Math.hypot(P[0] - cx, P[1] - cy) < rb - 1e-6 ? [0, 0, -1] : V.norm(V.sub(P, C))),
      sec: (c) => (c < zb - 1e-9 || c > cz + r ? [] : [{ k: 'circle', c: [cx, cy], r: Math.sqrt(Math.max(0, r * r - (c - cz) * (c - cz))) }]),
      zr: [zb, cz + r],
      outline: {
        p1: [arc([cx, cy, eqIn ? cz : zb], eqIn ? r : rb, 0, TAU, XY)],
        p2: [silXZ].concat(isCap ? [arc([cx, cy, zb], rb, 0, Math.PI, XY)] : []),
        p3: [silYZ].concat(isCap ? [arc([cx, cy, zb], rb, Math.PI / 2, 1.5 * Math.PI, XY)] : []),
      },
      mesh: (u, v) => {
        const th = v * thMax;
        return [cx + r * Math.sin(th) * Math.cos(u), cy + r * Math.sin(th) * Math.sin(u), cz + r * Math.cos(th)];
      },
      caps: isCap ? [{ c: [cx, cy, zb], r: rb, n: [0, 0, -1] }] : [],
      desc: isCap ? 'czasza kulista (D = ' + G.f0(2 * rb) + ', h = ' + G.f0(cz + r - zb) + ', R kuli = ' + G.f1(r) + ')' : 'kula (r = ' + G.f1(r) + ')',
      center: C,
      r,
    };
  }
  /* walec o osi poziomej: ax = 'y' (oś ⟂ π2, w punkcie (a, zc)) lub 'x' (oś ∥ x, w punkcie (a = y, zc)) */
  function cylH(ax, a, zc, r, t0, t1) {
    const isY = ax === 'y';
    const perp = (P) => (isY ? Math.hypot(P[0] - a, P[2] - zc) : Math.hypot(P[1] - a, P[2] - zc));
    const along = (P) => (isY ? P[1] : P[0]);
    const pt = (u, t) => (isY ? [a + r * Math.cos(u), t, zc + r * Math.sin(u)] : [t, a + r * Math.cos(u), zc + r * Math.sin(u)]);
    const end = (t) => (isY ? [a, t, zc] : [t, a, zc]);
    const endArc = (t, a0, a1) => arc(end(t), r, a0, a1, isY ? XZ : YZ);
    const gen = (u) => seg(pt(u, t0), pt(u, t1));
    const S = {
      kind: 'cylH',
      name: 'walec poziomy',
      F: (P) => Math.max(perp(P) - r, t0 - along(P), along(P) - t1),
      param: (u, s) => pt(u, t0 + s * (t1 - t0)),
      normal: (P) => {
        if (perp(P) < r - 1e-6) return along(P) > (t0 + t1) / 2 ? (isY ? [0, 1, 0] : [1, 0, 0]) : isY ? [0, -1, 0] : [-1, 0, 0];
        return isY ? V.norm([P[0] - a, 0, P[2] - zc]) : V.norm([0, P[1] - a, P[2] - zc]);
      },
      sec: (c) => {
        const d = c - zc;
        if (Math.abs(d) > r) return [];
        const w = Math.sqrt(r * r - d * d);
        const vals = w < 1e-9 ? [a] : [a - w, a + w];
        return isY ? [{ k: 'lines', xs: vals, y0: t0, y1: t1 }] : [{ k: 'linesY', ys: vals, x0: t0, x1: t1 }];
      },
      zr: [zc - r, zc + r],
      outline: isY
        ? {
            p1: [gen(Math.PI), gen(0), endArc(t1, 0, Math.PI), endArc(t0, 0, Math.PI)],
            p2: [endArc(t1, 0, TAU)],
            p3: [gen(Math.PI / 2), gen(-Math.PI / 2), endArc(t0, Math.PI / 2, 1.5 * Math.PI), endArc(t1, Math.PI / 2, 1.5 * Math.PI)],
          }
        : {
            p1: [gen(Math.PI), gen(0), endArc(t0, 0, Math.PI), endArc(t1, 0, Math.PI)],
            p2: [gen(Math.PI / 2), gen(-Math.PI / 2), endArc(t0, -Math.PI / 2, Math.PI / 2), endArc(t1, -Math.PI / 2, Math.PI / 2)],
            p3: [endArc(t0, 0, TAU)],
          },
      mesh: (u, v) => pt(u, t0 + v * (t1 - t0)),
      caps: [
        { c: end(t0), r, n: isY ? [0, -1, 0] : [-1, 0, 0] },
        { c: end(t1), r, n: isY ? [0, 1, 0] : [1, 0, 0] },
      ],
      desc: 'walec poziomy, oś ' + (isY ? '⟂ π₂' : '∥ x (⟂ π₃)') + ' (D = ' + G.f0(2 * r) + ', l = ' + G.f0(t1 - t0) + ')',
    };
    return S;
  }
  /* wielościan wypukły jako bryła w module 3 */
  function polySolid(poly, names, title) {
    const nameOf = (P) => {
      const i = poly.verts.findIndex((q) => V.dist(q, P) < 1e-6);
      return i >= 0 && names ? names[i] : '';
    };
    const S = {
      kind: 'poly',
      name: 'graniastosłup',
      poly,
      F: (P) => Math.max(...poly.planes.map((pl) => G.sd(pl, P))),
      normal: (P) => {
        let best = 0,
          bv = -1e9;
        poly.planes.forEach((pl, i) => {
          const v = G.sd(pl, P);
          if (v > bv) {
            bv = v;
            best = i;
          }
        });
        return poly.planes[best].n;
      },
      sec: (c) => {
        const s = poly.section({ n: [0, 0, 1], d: c });
        return s.length >= 3 ? [{ k: 'poly', pts: s.map((q) => [q[0], q[1]]) }] : [];
      },
      zr: [Math.min(...poly.verts.map((q) => q[2])), Math.max(...poly.verts.map((q) => q[2]))],
      caps: [],
      desc: title,
      names,
      nameOf,
    };
    const ol = poly.edges.map((e) => seg(e.a, e.b, 40));
    S.outline = { p1: ol, p2: ol, p3: ol };
    S.vertsNamed = names ? poly.verts.map((v) => ({ p: v })) : [];
    return S;
  }

  /* ---------- zestawy zadań ---------- */
  function fromSpec(s, d, sc) {
    const m = (v) => v * sc;
    if (s.k === 'cone') return cone(s.cx + d[0], s.cy + d[1], s.z0 + d[2], m(s.H), m(s.R), m(s.rt || 0));
    if (s.k === 'cylV') return cylV(s.cx + d[0], s.cy + d[1], s.z0 + d[2], m(s.H), m(s.R));
    if (s.k === 'sphere') return sphere(s.cx + d[0], s.cy + d[1], s.cz + d[2], m(s.r), s.zc == null ? -Infinity : s.zc + d[2]);
    if (s.k === 'cylH') return cylH(s.ax, s.a + (s.ax === 'y' ? d[0] : d[1]), s.zc + d[2], m(s.r), s.t0 + (s.ax === 'y' ? d[1] : d[0]), s.t1 + (s.ax === 'y' ? d[1] : d[0]));
    if (s.k === 'poly') {
      const sp = JSON.parse(JSON.stringify(s.spec));
      const P = GW.specPoly(sp, d);
      return polySolid(P, s.names || null, s.title);
    }
    return null;
  }
  function presets(p) {
    const s1 = (p.sc1 || 100) / 100,
      s2 = (p.sc2 || 100) / 100;
    const d = [p.dx || 0, p.dy || 0, p.dz || 0];
    if (p.set === 'gen' && p.gen) return { A: fromSpec(p.gen.A, [0, 0, 0], s1), B: fromSpec(p.gen.B, d, s2), title: p.gen.title, mixed: !!p.gen.mixed };
    if (p.set === 'L3z1') {
      const A = cylH('x', 45 + d[1], 24 + d[2], 18 * s2, 10 + d[0], 70 + d[0]);
      const Bc = cone(70, 45, 0, 70 * s1, 40 * s1, 15 * s1);
      return { A, B: Bc, title: 'Stożek ścięty + walec poziomy (oś ∥ x) – 3 rzuty' };
    }
    if (p.set === 'L3z2') {
      const R = 45 * s1;
      const A = cylV(70 - R / 2 + d[0], 45 + d[1], 0 + d[2], 60 * s1, (R / 2) * s2);
      const Bc = cone(70, 45, 0, 60 * s1, R);
      return { A, B: Bc, title: 'Stożek + walec pionowy styczny wewnętrznie (walec przez oś stożka)' };
    }
    if (p.set === 'L3z3') {
      const Bc = cone(55, 45, 0, 42 * s1, 40 * s1, 10 * s1);
      const prof = [
        [55 + d[0], 0 + d[2]],
        [95 + d[0], 0 + d[2]],
        [95 + d[0], 42 * s2 + d[2]],
      ];
      const W = polySolid(G.prismY(prof, 0 + d[1], 90 + d[1]), null, 'graniastosłup trójkątny (klin) o krawędziach ⟂ π₂');
      return { A: Bc, B: W, title: 'Stożek ścięty + klin (graniastosłup trójkątny)', mixed: true };
    }
    if (p.set === 'L3z4') {
      const H0 = 60 * s1,
        Rb = 50 * s1;
      const Rs = (Rb * Rb + H0 * H0) / (2 * H0);
      const S = sphere(60, 55, H0 - Rs, Rs, 0);
      const k = 70 * s2,
        n = 24 * s2,
        m = 74 * s2;
      const base = [
        [60 - k / 2 + d[0], 55 - n + d[1]],
        [60 + k / 2 + d[0], 55 - n + d[1]],
        [60 + d[0], 55 - n + m + d[1]],
      ];
      const W = polySolid(G.prismZ(base, 0 + d[2], 80 + d[2]), ['A', 'B', 'C', 'A_1', 'B_1', 'C_1'], 'graniastosłup trójkątny pionowy (k = ' + G.f0(k) + ', n = ' + G.f0(n) + ', m = ' + G.f0(m) + ')');
      return { A: S, B: W, title: 'Czasza kulista (D = 100, h = 60) + graniastosłup trójkątny', mixed: true };
    }
    if (p.set === 'cylprism') {
      const Bc = cylV(50, 45, 0, 72 * s1, 30 * s1);
      const c = [50 + d[0], 36 + d[2]],
        r = 19 * s2;
      const prof = [
        [c[0] - r, c[1]],
        [c[0], c[1] + r],
        [c[0] + r, c[1]],
        [c[0], c[1] - r],
      ];
      const W = polySolid(G.prismY(prof, -6 + d[1], 96 + d[1]), null, 'graniastosłup czworokątny o krawędziach ⟂ π₂');
      return { A: Bc, B: W, title: 'Walec pionowy + graniastosłup czworokątny ⟂ π₂ (przebicie)', mixed: true };
    }
    if (p.set === 'a') {
      const A = cylH('y', 50 + d[0], 30 + d[2], 14 * s2, -2 + d[1], 84 + d[1]);
      const Bc = cone(50, 40, 0, 90 * s1, 40 * s1);
      return { A, B: Bc, title: 'Stożek pionowy + walec poziomy (⟂ π₂)' };
    }
    if (p.set === 'b') {
      const Bc = cylV(45, 40, 0, 78 * s1, 24 * s1);
      const A = sphere(68 + d[0], 40 + d[1], 38 + d[2], 28 * s2);
      return { A: Bc, B: A, title: 'Walec pionowy + kula' };
    }
    const Bc = cone(45, 40, 0, 88 * s1, 40 * s1);
    const A = sphere(66 + d[0], 40 + d[1], 30 + d[2], 22.4 * s2);
    return { A: Bc, B: A, title: 'Stożek pionowy + kula' };
  }

  /* przecięcia przekrojów w płaszczyźnie z = c */
  function circleSeg(c, r, a, b) {
    const d = V.sub(b, a),
      f = V.sub(a, c);
    const A = V.dot(d, d),
      Bq = 2 * V.dot(f, d),
      C = V.dot(f, f) - r * r;
    const disc = Bq * Bq - 4 * A * C;
    if (disc < 0 || A < 1e-12) return [];
    const sq = Math.sqrt(disc);
    return [(-Bq - sq) / (2 * A), (-Bq + sq) / (2 * A)].filter((t) => t >= -1e-9 && t <= 1 + 1e-9).map((t) => V.lerp(a, b, t));
  }
  function sliceIntersect(SA, SB, c) {
    const a = SA.sec(c),
      b = SB.sec(c);
    const pts = [];
    a.forEach((ca) =>
      b.forEach((cb) => {
        let r = [];
        const C1 = ca.k === 'circle' ? ca : cb.k === 'circle' ? cb : null;
        const O = C1 === ca ? cb : ca;
        if (ca.k === 'circle' && cb.k === 'circle') r = G.circleCircle(ca.c, ca.r, cb.c, cb.r);
        else if (C1 && O.k === 'lines') O.xs.forEach((x) => G.circleLineX(C1.c, C1.r, x).forEach((q) => q[1] >= O.y0 - 1e-9 && q[1] <= O.y1 + 1e-9 && r.push(q)));
        else if (C1 && O.k === 'linesY')
          O.ys.forEach((y) => {
            const dy = y - C1.c[1];
            if (Math.abs(dy) > C1.r) return;
            const w = Math.sqrt(C1.r * C1.r - dy * dy);
            [C1.c[0] - w, C1.c[0] + w].forEach((x) => x >= O.x0 - 1e-9 && x <= O.x1 + 1e-9 && r.push([x, y]));
          });
        else if (C1 && O.k === 'poly') O.pts.forEach((q, i) => circleSeg(C1.c, C1.r, q, O.pts[(i + 1) % O.pts.length]).forEach((x) => r.push(x)));
        r.forEach((q) => pts.push([q[0], q[1], c]));
      })
    );
    return G.dedupe(
      pts.filter((P) => Math.abs(SA.F(P)) < 1e-3 && Math.abs(SB.F(P)) < 1e-3),
      1e-4
    );
  }

  /* ---------- krzywa przenikania: bryła obrotowa × wielościan ---------- */
  function mixedCurve(S, W) {
    const segsAll = [];
    const size = Math.max(...[0, 1, 2].map((i) => Math.max(...W.poly.verts.map((q) => q[i])) - Math.min(...W.poly.verts.map((q) => q[i]))));
    const copl = [];
    W.poly.planes.forEach((pl, fi) => {
      S.caps.forEach((cp) => {
        if (Math.abs(Math.abs(V.dot(pl.n, cp.n)) - 1) < 1e-9 && Math.abs(G.sd(pl, cp.c)) < 1e-6) copl.push({ fi, pl });
      });
    });
    const onCopl = (P) => copl.some((q) => Math.abs(G.sd(q.pl, P)) < 1e-4 * size);
    W.poly.faces.forEach((f, fi) => {
      if (copl.some((q) => q.fi === fi)) return;
      const pl = W.poly.planes[fi];
      const n = pl.n;
      const ax = Math.abs(n[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
      const e1 = V.norm(V.cross(n, ax)),
        e2 = V.cross(n, e1);
      const o = f[0];
      const loc = f.map((q) => [V.dot(V.sub(q, o), e1), V.dot(V.sub(q, o), e2)]);
      const bb = G.bbox2(loc);
      const pad = 0.5;
      const N = 120;
      const to3 = (u, v) => V.add(o, V.add(V.mul(e1, u), V.mul(e2, v)));
      const g = G.grid((u, v) => S.F(to3(u, v)), bb[0] - pad, bb[2] + pad, bb[1] - pad, bb[3] + pad, N, N);
      const lines = G.isoline(g, 0);
      // przytnij do wielokąta ściany (wypukłego)
      const area = G.polyArea2(loc);
      const half = loc.map((a, i) => {
        const b = loc[(i + 1) % loc.length];
        let nn = V.perp2(V.norm(V.sub(b, a)));
        if (area < 0) nn = V.mul(nn, -1);
        return { a, nn };
      });
      const inside = (q) => half.every((hp) => V.dot(V.sub(q, hp.a), hp.nn) >= -1e-9);
      const clipSeg = (p0, p1) => {
        let t0 = 0,
          t1 = 1;
        const d = V.sub(p1, p0);
        for (const hp of half) {
          const a = V.dot(V.sub(p0, hp.a), hp.nn),
            b = V.dot(d, hp.nn);
          if (Math.abs(b) < 1e-14) {
            if (a < 0) return null;
            continue;
          }
          const t = -a / b;
          if (b > 0) t0 = Math.max(t0, t);
          else t1 = Math.min(t1, t);
        }
        return t1 > t0 + 1e-12 ? [V.lerp(p0, p1, t0), V.lerp(p0, p1, t1)] : null;
      };
      void inside;
      lines.forEach((ln) => {
        for (let i = 0; i + 1 < ln.length; i++) {
          const c = clipSeg(ln[i], ln[i + 1]);
          if (!c) continue;
          const a3 = to3(...c[0]),
            b3 = to3(...c[1]);
          if (onCopl(a3) && onCopl(b3)) continue;
          segsAll.push({ a: a3, b: b3, fi });
        }
      });
    });
    const loops = G.chain(segsAll, 1e-6).map((L) => {
      const pts = L.pts.filter((q, i) => i === 0 || V.dist(q, L.pts[i - 1]) > 1e-6);
      pts.closed = L.closed;
      return pts;
    });
    return loops.filter((L) => L.length > 2);
  }
  function edgePierce(S, W) {
    const res = [];
    W.poly.edges.forEach((e) => {
      G.roots((t) => S.F(V.lerp(e.a, e.b, t)), 0, 1, 200).forEach((t) => res.push({ p: V.lerp(e.a, e.b, t), e }));
    });
    return res;
  }

  function meshPrim(id, S, col, op) {
    if (S.kind === 'poly') return null;
    return {
      t: 'mesh',
      id,
      build(THREE, T) {
        const nu = 72,
          nv = 36;
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
        (S.caps || []).forEach((q) => {
          const dm = new THREE.Mesh(new THREE.CircleGeometry(q.r, 48), m);
          dm.position.copy(T(q.c));
          dm.lookAt(T(V.add(q.c, q.n)));
          grp.add(dm);
        });
        return grp;
      },
    };
  }

  /* klasyfikacja widoczności punktów polilinii (kontury, krzywa) w sumie brył */
  function rayHits(S, P, dir) {
    let t = 0.4;
    for (let i = 0; i < 400 && t < 300; i++) {
      const f = S.F(V.add(P, V.mul(dir, t)));
      if (f < -1e-6) return true;
      t += Math.max(0.35, f * 0.45);
    }
    return false;
  }
  function pieces(pts, st) {
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
  function outlinePieces(S, other, pts, dir) {
    const self = S.kind === 'poly';
    const st = pts.map((P) => (other.F(P) < -1e-6 ? 'omit' : rayHits(other, P, dir) || (self && rayHits(S, P, dir)) ? 'hid' : 'vis'));
    return pieces(pts, st);
  }
  function sliceStr(SA, SB, c) {
    const d = (S) =>
      S.sec(c)
        .map((q) => (q.k === 'circle' ? 'okrąg r = ' + G.f1(q.r) : q.k === 'poly' ? 'wielokąt (' + q.pts.length + ' wierzch.)' : (q.xs || q.ys).length === 1 ? 'tworzącą (styczna)' : 'dwie tworzące'))
        .join(', ') || '—';
    return { a: d(SA), b: d(SB) };
  }
  const viewN = { p1: [0, 0, 1], p2: [0, 1, 0], p3: [-1, 0, 0] };
  const pIdx = (pid) => (pid === 'p1' ? '₁' : pid === 'p2' ? '₂' : '₃');

  /* ---------- wspólny przebieg lekcji (metoda plasterkowa) ---------- */
  function buildLesson(p, B) {
    const pr = presets(p);
    const SA = pr.A,
      SB = pr.B;
    const mixed = !!pr.mixed;
    B.step({
      title: 'Dane: ' + pr.title,
      co: 'Bryły: <b>' + SA.desc + '</b> oraz <b>' + SB.desc + '</b>. Szukamy linii przenikania, jej punktów charakterystycznych i widoczności.',
      jak: mixed
        ? 'Linia przenikania bryły obrotowej z wielościanem składa się z łuków krzywych płaskich: każda ściana wielościanu przecina powierzchnię obrotową wzdłuż krzywej stożkowej (okrąg, elipsa, parabola, hiperbola) lub odcinka. Łuki stykają się w punktach przebicia krawędzi wielościanu.'
        : 'Obróć model. Krzywa przenikania brył obrotowych jest w ogólności krzywą przestrzenną (4. stopnia) – wyznaczamy ją punkt po punkcie.',
      why: 'Każdy punkt linii przenikania należy do obu powierzchni. Jeśli przetniemy obie bryły tą samą płaszczyzną, punkty wspólne obu przekrojów są właśnie punktami linii – to istota metody plasterkowej.',
      cam: 'iso',
    });
    const sys = GW.monge(B);
    const planes3 = GW.mplanes(sys);
    const mA = meshPrim('SA', SA, '#7fb3e0', 0.33),
      mB = meshPrim('SB', SB, '#e8c060', 0.33);
    if (mA) B.a3(mA);
    if (mB) B.a3(mB);
    [SA, SB].forEach((S, k) => {
      if (S.kind !== 'poly') return;
      S.poly.faces.forEach((f, i) => B.a3({ t: 'poly', id: 'S' + 'AB'[k], pts: f, col: k ? '#e8c060' : '#7fb3e0', op: 0.3 }));
      S.poly.edges.forEach((e) => B.a3({ t: 'seg', id: 'S' + 'AB'[k], a: e.a, b: e.b, s: 'proj' }));
      if (S.names)
        S.poly.verts.forEach((v, i) => {
          if (S.names[i]) B.mPoint(S.names[i], v, { s: 'given', ray: false, odn: false, pre: 'W:', info: 'Wierzchołek ' + h(S.names[i]) });
        });
    });
    B.info('SA', SA.desc);
    B.info('SB', SB.desc);
    // krzywa
    let loops;
    if (mixed) loops = mixedCurve(SA, SB);
    else {
      const P = SA.param ? SA : SB,
        Q = P === SA ? SB : SA;
      loops = G.curveLoops((u) => G.roots((s) => Q.F(P.param(u, s)), -0.001, 1.001, 240), (u, s) => P.param(u, s), 360);
    }
    // kontury 2D (dane)
    [SA, SB].forEach((S, k) => {
      planes3.forEach((pid) => {
        S.outline[pid].forEach((pl, j) => B.a2({ t: 'pl', id: 'out' + k + pid + j, pts: pl.map((q) => sys.toSheet(pid, q)), s: 'given' }));
      });
    });
    B.info('out0p10', SA.desc);
    // osie symetrii brył o osi pionowej
    [SA, SB].forEach((S, k) => {
      if (!S.axis) return;
      const [cx, cy] = S.axis;
      const ids = 'axis2' + k;
      B.a2({ t: 'seg', id: ids, a: sys.toSheet('p2', [cx, 0, S.zr[0] - 5]), b: sys.toSheet('p2', [cx, 0, S.zr[1] + 5]), s: 'thin', noPick: true });
      B.a2({ t: 'seg', id: ids, a: sys.toSheet('p1', [cx - 6, cy, 0]), b: sys.toSheet('p1', [cx + 6, cy, 0]), s: 'thin', noPick: true });
      B.a2({ t: 'seg', id: ids, a: sys.toSheet('p1', [cx, cy - 6, 0]), b: sys.toSheet('p1', [cx, cy + 6, 0]), s: 'thin', noPick: true });
      if (sys.P.p3) B.a2({ t: 'seg', id: ids, a: sys.toSheet('p3', [0, cy, S.zr[0] - 5]), b: sys.toSheet('p3', [0, cy, S.zr[1] + 5]), s: 'thin', noPick: true });
    });
    if (!loops.length) {
      B.step({ title: 'Brak przenikania', co: 'Bryły się nie przenikają przy tych parametrach.', jak: 'Zmień położenie bryły 2.', why: '' });
      B.data.ok = false;
      return;
    }
    const allPts = [].concat(...loops);
    const zmin = Math.min(...allPts.map((q) => q[2])),
      zmax = Math.max(...allPts.map((q) => q[2]));
    B.data.SA = SA;
    B.data.SB = SB;
    B.data.z0 = Math.max(Math.min(SA.zr[0], SB.zr[0]), zmin - 12);
    B.data.z1 = Math.min(Math.max(SA.zr[1], SB.zr[1]), zmax + 12);
    const ol1 = (S) => [].concat(...S.outline.p1).map((q) => [q[0], q[1]]);
    const bb = G.bbox2(allPts.map((q) => [q[0], q[1]]).concat(ol1(SA), ol1(SB)));
    B.data.ext = [bb[0] - 12, bb[1] - 12, bb[2] + 12, bb[3] + 12];
    // punkty charakterystyczne
    const chars = [];
    loops.forEach((L) => {
      const n = L.length;
      let iMax = 0,
        iMin = 0;
      L.forEach((q, i) => {
        if (q[2] > L[iMax][2]) iMax = i;
        if (q[2] < L[iMin][2]) iMin = i;
      });
      chars.push({ z: L[iMax][2], why: 'najwyższy', cat: 'ext' }, { z: L[iMin][2], why: 'najniższy', cat: 'ext' });
      planes3.forEach((pid) =>
        [SA, SB].forEach((S) => {
          if (S.kind === 'poly') return;
          const N = viewN[pid];
          for (let i = 0; i + 1 < n + (L.open ? 0 : 1); i++) {
            const a = L[i],
              b = L[(i + 1) % n];
            const fa = V.dot(S.normal(a), N),
              fb = V.dot(S.normal(b), N);
            if (fa < 0 !== fb < 0) {
              const t = fa / (fa - fb);
              const P = V.lerp(a, b, t);
              chars.push({ z: P[2], why: 'na konturze (' + S.name + ') w π' + pIdx(pid), cat: pid, P });
            }
          }
        })
      );
    });
    let pierce = [];
    if (mixed) {
      pierce = edgePierce(SA, SB);
      pierce.forEach((q) => chars.push({ z: q.p[2], why: 'przebicie krawędzi wielościanu', cat: 'edge', P: q.p }));
    }
    // grupowanie po z
    const planes = [];
    const zTol = Math.max(0.6, (zmax - zmin) * 0.012);
    chars.forEach((c) => {
      if (c.z < Math.max(SA.zr[0], SB.zr[0]) - 1e-6 || c.z > Math.min(SA.zr[1], SB.zr[1]) + 1e-6) return;
      const f = planes.find((q) => Math.abs(q.z - c.z) < zTol);
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
    const ext = B.data.ext;
    const doPlane = (pl, tag) => {
      const z = pl.z;
      const id = 'eps' + tag;
      B.planeQuad(id, [[ext[0], ext[1], z], [ext[2], ext[1], z], [ext[2], ext[3], z], [ext[0], ext[3], z]], { col: '#ff8c00', op: 0.1 });
      B.a2({ t: 'seg', id, a: sys.toSheet('p2', [ext[0] - 4, 0, z]), b: sys.toSheet('p2', [ext[2] + 4, 0, z]), s: 'auxd', label: 'v_{ε' + tag + '}', labelAt: 0.99 });
      if (sys.P.p3) B.a2({ t: 'seg', id, a: sys.toSheet('p3', [0, ext[1] - 4, z]), b: sys.toSheet('p3', [0, ext[3] + 4, z]), s: 'auxd' });
      B.info(id, 'Płaszczyzna pozioma ε<sub>' + tag + '</sub>: z = ' + G.f1(z) + ' (' + pl.whys.join(', ') + ')');
      const ids = [id];
      [SA, SB].forEach((S, k) =>
        S.sec(z).forEach((q, j) => {
          const sid = id + 's' + k + j;
          ids.push(sid);
          B.info(sid, 'Przekrój: ' + S.name + ' ∩ ε<sub>' + tag + '</sub> → ' + (q.k === 'circle' ? 'okrąg r = ' + G.f1(q.r) + ' (w π<sub>1</sub> w rzeczywistej wielkości)' : q.k === 'poly' ? 'wielokąt (przekrój wielościanu)' : 'tworzące walca'), [id]);
          if (q.k === 'circle') {
            B.a3({ t: 'circle3', id: sid, c: [q.c[0], q.c[1], z], n: [0, 0, 1], r: q.r, s: 'sec' });
            B.a2({ t: 'circle', id: sid, c: sys.toSheet('p1', [q.c[0], q.c[1], 0]), r: q.r, s: 'sec' });
          } else if (q.k === 'poly') {
            B.a3({ t: 'pl', id: sid, pts: q.pts.map((u) => [u[0], u[1], z]), closed: true, s: 'sec' });
            B.a2({ t: 'pl', id: sid, pts: q.pts.map((u) => sys.toSheet('p1', [u[0], u[1], 0])), closed: true, s: 'sec' });
          } else if (q.k === 'lines')
            q.xs.forEach((x) => {
              B.a3({ t: 'seg', id: sid, a: [x, q.y0, z], b: [x, q.y1, z], s: 'sec' });
              B.a2({ t: 'seg', id: sid, a: sys.toSheet('p1', [x, q.y0, 0]), b: sys.toSheet('p1', [x, q.y1, 0]), s: 'sec' });
            });
          else
            q.ys.forEach((y) => {
              B.a3({ t: 'seg', id: sid, a: [q.x0, y, z], b: [q.x1, y, z], s: 'sec' });
              B.a2({ t: 'seg', id: sid, a: sys.toSheet('p1', [q.x0, y, 0]), b: sys.toSheet('p1', [q.x1, y, 0]), s: 'sec' });
            });
        })
      );
      const pts = sliceIntersect(SA, SB, z);
      pts.forEach((P) => {
        const nm = String(ptNo++);
        B.mPoint(nm, P, { s: 'res', pre: 'c', ray: false, info: 'Punkt linii przenikania nr ' + nm + ' (ε<sub>' + tag + '</sub>: ' + pl.whys.join(', ') + ')' });
        B.link('c' + nm, [id]);
      });
      B.src(...ids);
      return { ids, n: pts.length };
    };
    const first = inter[Math.floor(inter.length / 2)];
    const s0 = sliceStr(SA, SB, first.z);
    B.step({
      title: 'Idea metody: płaszczyzna pozioma ε₁',
      co: 'Płaszczyzna pozioma <b>ε<sub>1</sub></b> (z = ' + G.f1(first.z) + ') przecina: ' + SA.name + ' → ' + s0.a + '; ' + SB.name + ' → ' + s0.b + '.',
      jak: '<ol><li>W π<sub>2</sub> rysujemy ślad v<sub>ε1</sub> ∥ x<sub>12</sub> na wysokości z.</li><li>W π<sub>1</sub> rysujemy oba przekroje – są w rzeczywistej wielkości, bo ε<sub>1</sub> ∥ π<sub>1</sub> (promienie okręgów odczytujemy z π<sub>2</sub>: szerokość bryły na wysokości v<sub>ε</sub>).</li><li>Punkty wspólne przekrojów w π<sub>1</sub> → punkty linii. Odnoszące → na v<sub>ε1</sub> w π<sub>2</sub>' + (sys.P.p3 ? ' i dalej (przez prostą 45°) do π<sub>3</sub>' : '') + '.</li></ol>',
      why: 'Punkt wspólny dwóch przekrojów leży na obu powierzchniach (bo leży na każdym z przekrojów) – należy więc do linii przenikania. Płaszczyzny poziome dają tu przekroje kołowe, proste lub wielokąty – rysowane cyrklem i linijką.',
      cam: { dir: [0.5, 0.85, 0.8] },
    });
    let prev = doPlane(first, '1').ids;
    let tagNo = 2;
    const groupsDef = [
      ['ext', 'Punkty najwyższe i najniższe', 'Płaszczyzny przez skrajne (najwyższe/najniższe) punkty linii – zwykle styczne do jednej z brył lub przez krawędź wielościanu.', 'Bez nich nie wiemy, gdzie linia „zawraca” – łączenie punktów pośrednich mogłoby ominąć jej wierzchołek.'],
      ['edge', 'Przebicia krawędzi wielościanu (punkty załamania)', 'Krawędź wielościanu przebija powierzchnię obrotową – szukamy jej punktu przebicia (tu: płaszczyzną poziomą przez ten punkt, okrąg przekroju ∩ rzut krawędzi).', 'W tych punktach stykają się łuki linii leżące na różnych ścianach – linia ma tu załamanie (punkt kątowy). Zmienia się też często widoczność.'],
      ['p2', 'Punkty na konturach w π₂ (zmiana widoczności)', 'Płaszczyzny przez punkty, w których linia przechodzi przez tworzące konturowe w rzucie pionowym (dla brył pionowych – tworzące skrajne lewa/prawa).', 'Na tworzącej konturowej powierzchnia przechodzi z części przedniej (widocznej) na tylną – tam linia zmienia widoczność w π<sub>2</sub>, a w rzucie jest styczna do konturu.'],
      ['p1', 'Punkty na konturach w π₁', 'Płaszczyzny przez punkty linii leżące na konturach w rzucie poziomym (np. tworzące skrajne walca poziomego, równik kuli).', 'Analogicznie: tu zmienia się widoczność w rzucie poziomym.'],
      ['p3', 'Punkty na konturach w π₃', 'Płaszczyzny przez punkty linii leżące na konturach w rzucie bocznym (tworzące przednia/tylna brył pionowych).', 'Tu zmienia się widoczność w rzucie bocznym.'],
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
        prev = prev.concat(doPlane(q, String(tagNo++)).ids);
      });
    });
    inter.forEach((q) => {
      if (q === first) return;
      B.step({
        title: 'Płaszczyzna pośrednia ε' + String(tagNo).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]),
        co: 'Kolejne punkty pośrednie: ε<sub>' + tagNo + '</sub>, z = ' + G.f1(q.z) + '.',
        jak: 'Ta sama procedura: ślad w π<sub>2</sub> → przekroje w π<sub>1</sub> → punkty wspólne → odnoszące.',
        why: 'Im więcej punktów, tym dokładniej poprowadzimy linię; w praktyce 2–4 płaszczyzny pośrednie między punktami charakterystycznymi wystarczają.',
        cam: { dir: [0.5, 0.85, 0.8] },
      });
      B.end(...prev);
      prev = doPlane(q, String(tagNo++)).ids;
    });
    // łączenie
    B.step({
      title: 'Łączenie punktów w linię przenikania',
      co: 'Punkty łączymy płynną linią (krzywikiem): ' + (loops.length >= 2 ? '<b>' + loops.length + ' gałęzie</b> (przenikanie całkowite – bryła przechodzi na wylot)' : '<b>jedna linia</b>') + (mixed ? '; łuki stykają się w punktach przebicia krawędzi.' : '.'),
      jak: 'Kolejność: idąc wzdłuż jednej z brył (po kolejnych tworzących lub płaszczyznach), łączymy punkty sąsiednie. W punktach na konturach linia jest styczna do konturu.',
      why: 'Linia przenikania jest ciągła. W rzucie na rzutnię, do której bryła jest rzutująca (np. walec ⟂ π<sub>2</sub> albo wielościan o krawędziach ⟂ π<sub>2</sub>), linia pokrywa się z konturem tej bryły – to dodatkowa kontrola.',
      cam: 'iso',
    });
    B.end(...prev);
    loops.forEach((L, i) => {
      B.a3({ t: 'pl', id: 'curve' + i, pts: L, closed: !L.open && L.closed !== false, s: 'res' });
      planes3.forEach((pid) => B.a2({ t: 'pl', id: 'curve' + i, pts: L.map((q) => sys.toSheet(pid, q)), closed: !L.open && L.closed !== false, s: 'res', w: 1.6 }));
      B.info('curve' + i, 'Linia przenikania' + (loops.length > 1 ? ' (gałąź ' + (i + 1) + ')' : ''));
    });
    if (mixed)
      pierce.forEach((q, i) => {
        B.mPoint('K' + (i + 1), q.p, { s: 'res2', pre: 'e', ray: false, odn: false, lab: false, info: 'Punkt przebicia krawędzi wielościanu z powierzchnią bryły obrotowej (punkt załamania linii)' });
      });
    // widoczność
    B.step({
      title: 'Widoczność linii i konturów',
      co: 'Linia jest widoczna ⇔ punkt leży na widocznej części obu powierzchni. Kontury brył: części wewnątrz drugiej bryły usuwamy, zasłonięte – kreskowe cienkie.',
      jak: 'W π<sub>2</sub> widoczne są przednie części, w π<sub>1</sub> – górne' + (sys.P.p3 ? ', w π<sub>3</sub> – lewe' : '') + '. Widoczność zmienia się w punktach na tworzących konturowych i w punktach przebicia krawędzi.',
      why: 'Promień od obserwatora do punktu na przedniej części obu powierzchni nie przecina już żadnej z brył – punkt jest widoczny; jeśli punkt leży na tylnej części choć jednej bryły – ta bryła go zasłania.',
    });
    B.p2.forEach((q) => {
      if (/^curve|^out/.test(q.id) && q.to === undefined) q.to = B.cur;
    });
    loops.forEach((L, i) => {
      planes3.forEach((pid) => {
        const N = viewN[pid];
        const closed = !L.open && L.closed !== false;
        const PL = closed ? L.concat([L[0]]) : L;
        let st;
        if (mixed) st = PL.map((q) => (rayHits(SA, q, N) || rayHits(SB, q, N) ? 'hid' : 'vis'));
        else st = PL.map((q) => (V.dot(SA.normal(q), N) > 0 && V.dot(SB.normal(q), N) > 0 ? 'vis' : 'hid'));
        pieces(PL, st).forEach((r) => B.a2({ t: 'pl', id: 'curve' + i, pts: r.pts.map((q) => sys.toSheet(pid, q)), s: r.st === 'vis' ? 'res' : 'resd' }));
      });
    });
    [
      [SA, SB],
      [SB, SA],
    ].forEach(([S, O]) => {
      const kk = S === SA ? 0 : 1;
      planes3.forEach((pid) => {
        S.outline[pid].forEach((pl, j) => {
          outlinePieces(S, O, pl, viewN[pid]).forEach((r) => B.a2({ t: 'pl', id: 'out' + kk + pid + j, pts: r.pts.map((q) => sys.toSheet(pid, q)), s: r.st === 'vis' ? 'vis' : 'hid' }));
        });
      });
    });
    B.step({
      title: 'Wynik',
      co: 'Linia przenikania z punktami charakterystycznymi i widocznością' + (sys.P.p3 ? ' w trzech rzutach.' : '.'),
      jak: 'Użyj <b>suwaka cięcia</b> (Widok specjalny), aby zobaczyć ciągłość metody: każda pozycja płaszczyzny daje kolejne punkty.',
      why: 'Zmień w trybie eksperymentu położenie i skalę brył – zobacz przejście od przenikania całkowitego (dwie gałęzie) przez styczność do częściowego (jedna linia).',
      cam: 'iso',
    });
    B.data.loops = loops;
    B.data.ok = true;
  }

  const special = {
    note: '<b>Suwak cięcia (Slicer).</b> Przesuwaj płaszczyznę poziomą ε w górę i w dół. W 3D widać przekroje obu brył (pomarańczowe), w 2D – ich rzuty poziome i punkty wspólne. Z włączonym śladem linia przenikania „rysuje się” punkt po punkcie.',
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
      const sys = c.sys;
      const z = d.z0 + (d.z1 - d.z0) * S.cut;
      const p3 = [],
        p2 = [],
        info = {};
      const ext = d.ext;
      p3.push({ t: 'poly', id: 'slicer', pts: [[ext[0], ext[1], z], [ext[2], ext[1], z], [ext[2], ext[3], z], [ext[0], ext[3], z]], col: '#ff8c00', op: 0.13, edge: true, edgeCol: 0xe07b00 });
      info.slicer = 'Płaszczyzna tnąca ε: z = ' + G.f1(z) + '.';
      p2.push({ t: 'seg', id: 'slicer', a: sys.toSheet('p2', [ext[0] - 5, 0, z]), b: sys.toSheet('p2', [ext[2] + 5, 0, z]), s: 'auxd', label: 'v_ε', labelAt: 0.98 });
      if (sys.P.p3) p2.push({ t: 'seg', id: 'slicer', a: sys.toSheet('p3', [0, ext[1] - 5, z]), b: sys.toSheet('p3', [0, ext[3] + 5, z]), s: 'auxd' });
      [d.SA, d.SB].forEach((Sx, k) => {
        Sx.sec(z).forEach((q, j) => {
          const id = 'sl' + k + j;
          info[id] = 'Przekrój bryły (' + Sx.name + ') płaszczyzną ε';
          if (q.k === 'circle') {
            p3.push({ t: 'circle3', id, c: [q.c[0], q.c[1], z], n: [0, 0, 1], r: q.r, s: 'sec' });
            p2.push({ t: 'circle', id, c: sys.toSheet('p1', [q.c[0], q.c[1], 0]), r: q.r, s: 'sec' });
          } else if (q.k === 'poly') {
            p3.push({ t: 'pl', id, pts: q.pts.map((u) => [u[0], u[1], z]), closed: true, s: 'sec' });
            p2.push({ t: 'pl', id, pts: q.pts.map((u) => sys.toSheet('p1', [u[0], u[1], 0])), closed: true, s: 'sec' });
          } else if (q.k === 'lines')
            q.xs.forEach((x) => {
              p3.push({ t: 'seg', id, a: [x, q.y0, z], b: [x, q.y1, z], s: 'sec' });
              p2.push({ t: 'seg', id, a: sys.toSheet('p1', [x, q.y0, 0]), b: sys.toSheet('p1', [x, q.y1, 0]), s: 'sec' });
            });
          else
            q.ys.forEach((y) => {
              p3.push({ t: 'seg', id, a: [q.x0, y, z], b: [q.x1, y, z], s: 'sec' });
              p2.push({ t: 'seg', id, a: sys.toSheet('p1', [q.x0, y, 0]), b: sys.toSheet('p1', [q.x1, y, 0]), s: 'sec' });
            });
        });
      });
      const pts = sliceIntersect(d.SA, d.SB, z);
      S.hist = S.hist || [];
      if (S.trail) pts.forEach((P) => S.hist.push(P));
      if (S.hist.length > 3000) S.hist.splice(0, S.hist.length - 3000);
      const planes3 = GW.mplanes(sys);
      pts.forEach((P, i) => {
        const id = 'slp' + i;
        p3.push({ t: 'pt', id, p: P, s: 'res2', r: 1.3 });
        planes3.forEach((pid) => p2.push({ t: 'pt', id, p: sys.toSheet(pid, P), s: 'res2', r: 4 }));
        p2.push({ t: 'seg', id, a: sys.toSheet('p1', P), b: sys.toSheet('p2', P), s: 'odn' });
        info[id] = 'Punkt linii przenikania: przecięcie przekrojów obu brył w płaszczyźnie ε (z = ' + G.f1(z) + ')';
      });
      if (S.trail)
        S.hist.forEach((P) => {
          planes3.forEach((pid) => p2.push({ t: 'pt', id: 'hist', p: sys.toSheet(pid, P), s: 'res2', r: 1.4, noPick: true }));
        });
      if (S.trail && S.hist.length)
        p3.push({
          t: 'mesh',
          id: 'hist',
          noPick: true,
          build: (THREE, T) => {
            const g = new THREE.BufferGeometry().setFromPoints(S.hist.map(T));
            return new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8e24aa, size: 1.6 * c.v3.unit }));
          },
        });
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
  };
  const commonParams = [
    { k: 'dx', l: 'bryła 2: przesunięcie x', min: -20, max: 20, step: 0.5, v: 0 },
    { k: 'dy', l: 'bryła 2: przesunięcie y', min: -15, max: 15, step: 0.5, v: 0 },
    { k: 'dz', l: 'bryła 2: przesunięcie z', min: -15, max: 20, step: 0.5, v: 0 },
    { k: 'sc1', l: 'skala bryły 1 [%]', min: 75, max: 125, v: 100 },
    { k: 'sc2', l: 'skala bryły 2 [%]', min: 70, max: 130, v: 100 },
    { k: 'nInt', l: 'liczba płaszczyzn pośrednich', min: 2, max: 6, v: 3, rmin: 3, rmax: 3 },
  ];
  const algo =
    '<ol><li><b>Wybór płaszczyzn pomocniczych</b>: takie, które tną <u>obie</u> bryły wzdłuż linii łatwych do narysowania (okręgów, prostych, wielokątów). Dla brył o osiach pionowych, walców o osi poziomej i graniastosłupów – <b>płaszczyzny poziome</b> ε (z = const).</li>' +
    '<li><b>Punkty charakterystyczne</b> (wyznaczamy zawsze!): najwyższy i najniższy punkt linii; punkty na <i>tworzących konturowych</i> obu brył w każdym rzucie (zmiana widoczności); przebicia krawędzi wielościanu; wierzchołek (gdy linia przechodzi przez wierzchołek stożka).</li>' +
    '<li><b>Punkty pośrednie</b>: kilka dodatkowych płaszczyzn ε<sub>i</sub> między skrajnymi.</li>' +
    '<li>W każdej ε: ślad v<sub>ε</sub> ∥ x<sub>12</sub> w π<sub>2</sub>; w π<sub>1</sub> rysujemy przekroje obu brył (w rzeczywistej wielkości) i bierzemy ich punkty wspólne; odnoszącymi przenosimy je na v<sub>ε</sub> (i do π<sub>3</sub>).</li>' +
    '<li><b>Łączenie</b>: punkty łączymy krzywikiem w kolejności, w jakiej leżą na tworzących jednej z brył; na ścianach wielościanu – łuki stożkowych łączone w punktach przebicia krawędzi.</li>' +
    '<li><b>Widoczność</b>: punkt linii jest widoczny ⇔ leży na widocznej części <u>obu</u> powierzchni.</li></ol>';

  GW.addLesson({
    id: 'm3-obrotowe',
    mod: 3,
    lista: 'L3 Z1–2',
    title: '3.1 Przenikanie brył obrotowych – metoda plasterkowa',
    v2title: 'Rzuty Monge’a – linia przenikania',
    needP3: (P) => P.set === 'L3z1',
    opts: [
      {
        k: 'set',
        l: 'Zestaw',
        choices: [
          ['L3z1', '📋 Lista 3 · zad. 1: stożek ścięty + walec poziomy (3 rzuty)'],
          ['L3z2', '📋 Lista 3 · zad. 2: stożek + walec pionowy (styczne podstawy)'],
          ['a', 'Przykład A: stożek + walec poziomy ⟂ π₂'],
          ['b', 'Przykład B: walec pionowy + kula'],
          ['c', 'Przykład C: stożek + kula'],
        ],
        v: 'L3z1',
        rebuildFrame: true,
      },
    ],
    params: commonParams,
    mistakes: ['W zad. 2 walec przechodzi przez oś stożka – linia przenikania przechodzi przez <b>wierzchołek</b> stożka i przez punkt styczności podstaw. Oba to punkty charakterystyczne.'],
    special,
    algo,
    build: buildLesson,
  });
  GW.addLesson({
    id: 'm3-mieszane',
    mod: 3,
    lista: 'L3 Z3–4',
    title: '3.2 Bryła obrotowa + wielościan',
    v2title: 'Rzuty Monge’a – linia przenikania bryły obrotowej z wielościanem',
    needP3: (P) => P.set === 'L3z4',
    opts: [
      {
        k: 'set',
        l: 'Zestaw',
        choices: [
          ['L3z3', '📋 Lista 3 · zad. 3: stożek ścięty + klin (graniastosłup trójkątny)'],
          ['L3z4', '📋 Lista 3 · zad. 4: czasza kulista D=100, h=60 + graniastosłup (k=70, n=24, m=74), 3 rzuty'],
          ['cylprism', 'Przykład: walec pionowy + graniastosłup czworokątny ⟂ π₂'],
        ],
        v: 'L3z3',
        rebuildFrame: true,
      },
    ],
    params: commonParams,
    mistakes: ['Ściana płaska przecina bryłę obrotową wzdłuż krzywej płaskiej – w rzucie, w którym ściana jest krawędziowa (rzutująca), ta krzywa leży na krawędzi ściany. Wykorzystaj to jako kontrolę!', 'Nie zapomnij o punktach przebicia krawędzi wielościanu – to punkty załamania linii (np. B, C w zad. 4).'],
    special,
    algo,
    build: buildLesson,
  });
})();
