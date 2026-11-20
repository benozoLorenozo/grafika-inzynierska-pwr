/* ===================================================================
   GW – rdzeń matematyczny (geometria analityczna 2D/3D)
   Wszystkie konstrukcje wykreślne liczone są analitycznie.
   Układ współrzędnych GW: x – w prawo (wzdłuż osi x12), y – do obserwatora
   (przed rzutnią π2), z – do góry (nad rzutnią π1).
   =================================================================== */
(function () {
  'use strict';
  const GW = (window.GW = window.GW || {});
  const EPS = 1e-9;

  const V = {
    add: (a, b) => a.map((v, i) => v + b[i]),
    sub: (a, b) => a.map((v, i) => v - b[i]),
    mul: (a, s) => a.map((v) => v * s),
    dot: (a, b) => a.reduce((s, v, i) => s + v * b[i], 0),
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len: (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0)),
    norm: (a) => {
      const l = Math.sqrt(a.reduce((s, v) => s + v * v, 0)) || 1;
      return a.map((v) => v / l);
    },
    lerp: (a, b, t) => a.map((v, i) => v + (b[i] - v) * t),
    dist: (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) * (v - b[i]), 0)),
    perp2: (a) => [-a[1], a[0]],
    cross2: (a, b) => a[0] * b[1] - a[1] * b[0],
    mid: (a, b) => a.map((v, i) => (v + b[i]) / 2),
    eq: (a, b, tol = 1e-7) => V.dist(a, b) < tol,
  };
  GW.V = V;

  const G = (GW.G = {});
  G.EPS = EPS;
  G.deg = (r) => (r * 180) / Math.PI;
  G.rad = (d) => (d * Math.PI) / 180;
  G.clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  /* ---------- płaszczyzny ---------- */
  G.plane3 = (A, B, C) => {
    const n = V.norm(V.cross(V.sub(B, A), V.sub(C, A)));
    return { n, d: V.dot(n, A) };
  };
  G.planePN = (P, n) => {
    n = V.norm(n);
    return { n, d: V.dot(n, P) };
  };
  G.sd = (pl, X) => V.dot(pl.n, X) - pl.d;
  G.projOnPlane = (pl, X) => V.sub(X, V.mul(pl.n, G.sd(pl, X)));
  /* przecięcie odcinka/prostej AB z płaszczyzną: t (parametr na AB) */
  G.segPlane = (A, B, pl) => {
    const a = G.sd(pl, A),
      b = G.sd(pl, B);
    if (Math.abs(a - b) < EPS) return null;
    const t = a / (a - b);
    return { t, p: V.lerp(A, B, t) };
  };
  G.planesLine = (p1, p2) => {
    const d = V.cross(p1.n, p2.n);
    const l = V.len(d);
    if (l < 1e-9) return null;
    const p = V.mul(V.add(V.mul(V.cross(p2.n, d), p1.d), V.mul(V.cross(d, p1.n), p2.d)), 1 / (l * l));
    return { p, d: V.mul(d, 1 / l) };
  };
  G.pointLineDist = (P, A, d) => {
    const u = V.norm(d);
    const w = V.sub(P, A);
    return V.len(V.sub(w, V.mul(u, V.dot(w, u))));
  };
  G.footOnLine = (P, A, d) => {
    const u = V.norm(d);
    return V.add(A, V.mul(u, V.dot(V.sub(P, A), u)));
  };

  /* ---------- wielokąty ---------- */
  G.newell = (pts) => {
    const n = [0, 0, 0];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      n[0] += (a[1] - b[1]) * (a[2] + b[2]);
      n[1] += (a[2] - b[2]) * (a[0] + b[0]);
      n[2] += (a[0] - b[0]) * (a[1] + b[1]);
    }
    return V.norm(n);
  };
  G.centroid = (pts) => {
    const c = pts[0].map(() => 0);
    pts.forEach((p) => p.forEach((v, i) => (c[i] += v)));
    return c.map((v) => v / pts.length);
  };
  G.pointInPoly2 = (p, poly) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i][0],
        yi = poly[i][1],
        xj = poly[j][0],
        yj = poly[j][1];
      if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
  G.pointInPoly3 = (P, poly, n) => {
    const ax = Math.abs(n[0]),
      ay = Math.abs(n[1]),
      az = Math.abs(n[2]);
    let i0 = 0,
      i1 = 1;
    if (ax >= ay && ax >= az) {
      i0 = 1;
      i1 = 2;
    } else if (ay >= az) {
      i0 = 0;
      i1 = 2;
    }
    return G.pointInPoly2(
      [P[i0], P[i1]],
      poly.map((q) => [q[i0], q[i1]])
    );
  };
  /* Sutherland–Hodgman: zostawia część po stronie sd<=0 */
  G.clipPoly = (poly, pl) => {
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i],
        B = poly[(i + 1) % poly.length];
      const a = G.sd(pl, A),
        b = G.sd(pl, B);
      if (a <= 1e-9) out.push(A);
      if ((a < -1e-9 && b > 1e-9) || (a > 1e-9 && b < -1e-9)) out.push(V.lerp(A, B, a / (a - b)));
    }
    return out;
  };
  G.dedupe = (pts, tol = 1e-6) => {
    const r = [];
    pts.forEach((p) => {
      if (!r.some((q) => V.dist(p, q) < tol)) r.push(p);
    });
    return r;
  };
  G.sortAround = (pts, n) => {
    if (pts.length < 3) return pts.slice();
    const c = G.centroid(pts);
    let far = pts[0],
      fd = -1;
    pts.forEach((p) => {
      const d = V.dist(p, c);
      if (d > fd) {
        fd = d;
        far = p;
      }
    });
    const u = V.norm(V.sub(far, c));
    const w = V.cross(n, u);
    return pts
      .map((p) => ({ p, a: Math.atan2(V.dot(V.sub(p, c), w), V.dot(V.sub(p, c), u)) }))
      .sort((a, b) => a.a - b.a)
      .map((o) => o.p);
  };
  G.polyArea2 = (poly) => {
    let s = 0;
    for (let i = 0; i < poly.length; i++) s += V.cross2(poly[i], poly[(i + 1) % poly.length]);
    return s / 2;
  };
  G.hull2 = (pts) => {
    const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (p.length < 3) return p;
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [],
      up = [];
    for (const q of p) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 1e-12) lo.pop();
      lo.push(q);
    }
    for (let i = p.length - 1; i >= 0; i--) {
      const q = p[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 1e-12) up.pop();
      up.push(q);
    }
    up.pop();
    lo.pop();
    return lo.concat(up);
  };

  /* ---------- 2D ---------- */
  G.line2 = (p1, p2, p3, p4) => {
    const d1 = V.sub(p2, p1),
      d2 = V.sub(p4, p3);
    const den = V.cross2(d1, d2);
    if (Math.abs(den) < 1e-12) return null;
    const w = V.sub(p3, p1);
    const t = V.cross2(w, d2) / den;
    const u = V.cross2(w, d1) / den;
    return { t, u, p: V.add(p1, V.mul(d1, t)) };
  };
  /* prosta (p, kierunek d) przycięta do prostokąta box = [x0,y0,x1,y1] */
  G.clipLine2 = (p, d, box) => {
    let t0 = -1e9,
      t1 = 1e9;
    for (let i = 0; i < 2; i++) {
      const lo = box[i],
        hi = box[i + 2];
      if (Math.abs(d[i]) < 1e-12) {
        if (p[i] < lo || p[i] > hi) return null;
      } else {
        let a = (lo - p[i]) / d[i],
          b = (hi - p[i]) / d[i];
        if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a);
        t1 = Math.min(t1, b);
      }
    }
    if (t1 < t0) return null;
    return [V.add(p, V.mul(d, t0)), V.add(p, V.mul(d, t1))];
  };
  /* kreskowanie wielokąta (przekroje) */
  G.hatch2 = (poly, ang, step) => {
    const d = [Math.cos(ang), Math.sin(ang)],
      nrm = [-d[1], d[0]];
    const ps = poly.map((p) => V.dot(p, nrm));
    const lo = Math.min(...ps),
      hi = Math.max(...ps);
    const segs = [];
    for (let s = lo + step / 2; s < hi; s += step) {
      const xs = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i],
          b = poly[(i + 1) % poly.length];
        const sa = V.dot(a, nrm) - s,
          sb = V.dot(b, nrm) - s;
        if ((sa < 0) !== (sb < 0)) {
          const P = V.lerp(a, b, sa / (sa - sb));
          xs.push(V.dot(P, d));
        }
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2)
        segs.push([V.add(V.mul(nrm, s), V.mul(d, xs[i])), V.add(V.mul(nrm, s), V.mul(d, xs[i + 1]))]);
    }
    return segs;
  };
  G.bbox2 = (pts) => {
    const b = [1e9, 1e9, -1e9, -1e9];
    pts.forEach((p) => {
      b[0] = Math.min(b[0], p[0]);
      b[1] = Math.min(b[1], p[1]);
      b[2] = Math.max(b[2], p[0]);
      b[3] = Math.max(b[3], p[1]);
    });
    return b;
  };
  G.circleCircle = (c1, r1, c2, r2) => {
    const d = V.dist(c1, c2);
    if (d < 1e-12 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const u = V.mul(V.sub(c2, c1), 1 / d);
    const m = V.add(c1, V.mul(u, a));
    const pp = V.perp2(u);
    return h < 1e-9 ? [m] : [V.add(m, V.mul(pp, h)), V.sub(m, V.mul(pp, h))];
  };
  /* prosta x = x0 (pionowa w arkuszu) z okręgiem */
  G.circleLineX = (c, r, x0) => {
    const dx = x0 - c[0];
    if (Math.abs(dx) > r) return [];
    const h = Math.sqrt(r * r - dx * dx);
    return [
      [x0, c[1] - h],
      [x0, c[1] + h],
    ];
  };

  /* ---------- wielościany wypukłe ---------- */
  function edgeKey(a, b) {
    const k = (p) => p.map((v) => Math.round(v * 1e5)).join(',');
    const ka = k(a),
      kb = k(b);
    return ka < kb ? ka + '|' + kb : kb + '|' + ka;
  }
  G.Polyhedron = function (faces, names) {
    this.faces = faces.map((f) => f.map((p) => p.slice()));
    const all = G.dedupe([].concat(...this.faces), 1e-7);
    this.verts = all;
    this.c = G.centroid(all);
    this.planes = this.faces.map((f, i) => {
      let n = G.newell(f);
      const fc = G.centroid(f);
      if (V.dot(n, V.sub(fc, this.c)) < 0) {
        n = V.mul(n, -1);
        this.faces[i] = f.slice().reverse();
      }
      return { n, d: V.dot(n, fc) };
    });
    const map = {};
    this.edges = [];
    this.faces.forEach((f, fi) => {
      for (let i = 0; i < f.length; i++) {
        const a = f[i],
          b = f[(i + 1) % f.length];
        if (V.dist(a, b) < 1e-9) continue;
        const key = edgeKey(a, b);
        if (!map[key]) {
          map[key] = { a, b, faces: [] };
          this.edges.push(map[key]);
        }
        map[key].faces.push(fi);
      }
    });
    this.names = names || null;
  };
  G.Polyhedron.prototype.contains = function (P, eps = 1e-6) {
    return this.planes.every((pl) => G.sd(pl, P) < -eps);
  };
  G.Polyhedron.prototype.section = function (pl) {
    let pts = [];
    this.edges.forEach((e) => {
      const a = G.sd(pl, e.a),
        b = G.sd(pl, e.b);
      if (Math.abs(a) < 1e-9) pts.push(e.a);
      if (Math.abs(b) < 1e-9) pts.push(e.b);
      if ((a < -1e-9 && b > 1e-9) || (a > 1e-9 && b < -1e-9)) pts.push(V.lerp(e.a, e.b, a / (a - b)));
    });
    pts = G.dedupe(pts, 1e-6);
    return G.sortAround(pts, pl.n);
  };
  /* krawędzie przecięte przez płaszczyznę – z informacją o krawędzi */
  G.Polyhedron.prototype.sectionDetailed = function (pl) {
    const res = [];
    this.edges.forEach((e, ei) => {
      const a = G.sd(pl, e.a),
        b = G.sd(pl, e.b);
      if ((a < -1e-9 && b > 1e-9) || (a > 1e-9 && b < -1e-9)) res.push({ ei, p: V.lerp(e.a, e.b, a / (a - b)) });
    });
    return res;
  };
  G.Polyhedron.prototype.clip = function (pl) {
    const nf = this.faces.map((f) => G.clipPoly(f, pl)).filter((f) => f.length >= 3);
    const cap = this.section(pl);
    if (cap.length >= 3) nf.push(cap);
    return new G.Polyhedron(nf);
  };
  G.prism = (base, shift) => {
    const top = base.map((p) => V.add(p, shift));
    const f = [base.slice(), top.slice()];
    for (let i = 0; i < base.length; i++) {
      const j = (i + 1) % base.length;
      f.push([base[i], base[j], top[j], top[i]]);
    }
    return new G.Polyhedron(f);
  };
  G.pyramid = (base, apex) => {
    const f = [base.slice()];
    for (let i = 0; i < base.length; i++) f.push([base[i], base[(i + 1) % base.length], apex]);
    return new G.Polyhedron(f);
  };
  /* przedział parametru prostej p+t*d wewnątrz wypukłego wielokąta (współpłaszczyznowa) */
  G.lineConvexInterval = (p, d, poly, n) => {
    const ts = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i],
        b = poly[(i + 1) % poly.length];
      const e = V.sub(b, a);
      const den = V.dot(V.cross(d, e), n);
      if (Math.abs(den) < 1e-12) continue;
      const ap = V.sub(a, p);
      const t = V.dot(V.cross(ap, e), n) / den;
      const s = V.dot(V.cross(ap, d), n) / den;
      if (s >= -1e-9 && s <= 1 + 1e-9) ts.push(t);
    }
    if (ts.length < 2) return null;
    return [Math.min(...ts), Math.max(...ts)];
  };
  /* odcinki przenikania dwóch wielościanów wypukłych (ściana × ściana) */
  G.solidIntersection = (S1, S2) => {
    const segs = [];
    S1.faces.forEach((f1, i) => {
      S2.faces.forEach((f2, j) => {
        const L = G.planesLine(S1.planes[i], S2.planes[j]);
        if (!L) return;
        const I1 = G.lineConvexInterval(L.p, L.d, f1, S1.planes[i].n);
        const I2 = G.lineConvexInterval(L.p, L.d, f2, S2.planes[j].n);
        if (!I1 || !I2) return;
        const lo = Math.max(I1[0], I2[0]),
          hi = Math.min(I1[1], I2[1]);
        if (hi - lo > 1e-6) segs.push({ a: V.add(L.p, V.mul(L.d, lo)), b: V.add(L.p, V.mul(L.d, hi)), f1: i, f2: j });
      });
    });
    return segs;
  };
  /* przebicia krawędzi bryły S ze ścianami bryły T */
  G.edgePiercings = (S, T) => {
    const res = [];
    S.edges.forEach((e, ei) => {
      T.faces.forEach((f, fj) => {
        const r = G.segPlane(e.a, e.b, T.planes[fj]);
        if (!r || r.t < -1e-9 || r.t > 1 + 1e-9) return;
        if (G.pointInPoly3(r.p, f, T.planes[fj].n)) res.push({ ei, fj, t: r.t, p: r.p });
      });
    });
    return res;
  };
  /* łączenie odcinków w łamane (pętle) */
  G.chain = (segs, tol = 1e-5) => {
    const used = new Array(segs.length).fill(false);
    const loops = [];
    for (let s = 0; s < segs.length; s++) {
      if (used[s]) continue;
      used[s] = true;
      const pts = [segs[s].a, segs[s].b];
      const ids = [s];
      let grown = true;
      while (grown) {
        grown = false;
        const end = pts[pts.length - 1];
        for (let k = 0; k < segs.length; k++) {
          if (used[k]) continue;
          if (V.dist(segs[k].a, end) < tol) {
            pts.push(segs[k].b);
          } else if (V.dist(segs[k].b, end) < tol) {
            pts.push(segs[k].a);
          } else continue;
          used[k] = true;
          ids.push(k);
          grown = true;
          break;
        }
      }
      const closed = V.dist(pts[0], pts[pts.length - 1]) < tol;
      if (closed) pts.pop();
      loops.push({ pts, closed, segIds: ids });
    }
    return loops;
  };

  /* ---------- usuwanie linii niewidocznych (dokładne, dla wielokątów płaskich) ----------
     edges: [{a,b,...}]   faces: [{pts, pl}]
     view: {dir:[..]} (rzut równoległy, wektor KU obserwatorowi) lub {eye:[..]} (rzut środkowy)
     opts.omit(M) – true => fragment pomijany (np. wewnątrz drugiej bryły)              */
  G.occluded = (M, faces, view) => {
    for (const f of faces) {
      const s0 = G.sd(f.pl, M);
      if (Math.abs(s0) < 1e-5) continue;
      const r = view.eye ? V.sub(view.eye, M) : view.dir;
      const den = V.dot(f.pl.n, r);
      if (Math.abs(den) < 1e-12) continue;
      const s = -s0 / den;
      if (s <= 1e-7) continue;
      if (view.eye && s >= 1) continue;
      const X = V.add(M, V.mul(r, s));
      if (G.pointInPoly3(X, f.pts, f.pl.n)) return true;
    }
    return false;
  };
  G.hlr = (edges, faces, view, opts = {}) => {
    const out = [];
    edges.forEach((e, ei) => {
      const ts = [0, 1];
      faces.forEach((f) => {
        for (let i = 0; i < f.pts.length; i++) {
          const C = f.pts[i],
            D = f.pts[(i + 1) % f.pts.length];
          const w = view.eye ? V.sub(view.eye, C) : view.dir;
          const n = V.cross(V.sub(D, C), w);
          if (V.len(n) < 1e-12) continue;
          const r = G.segPlane(e.a, e.b, G.planePN(C, n));
          if (r && r.t > 1e-7 && r.t < 1 - 1e-7) ts.push(r.t);
        }
        const r = G.segPlane(e.a, e.b, f.pl);
        if (r && r.t > 1e-7 && r.t < 1 - 1e-7) ts.push(r.t);
      });
      (opts.extraT ? opts.extraT(e) : []).forEach((t) => ts.push(t));
      ts.sort((a, b) => a - b);
      let cur = null;
      for (let i = 0; i + 1 < ts.length; i++) {
        if (ts[i + 1] - ts[i] < 1e-7) continue;
        const M = V.lerp(e.a, e.b, (ts[i] + ts[i + 1]) / 2);
        let st;
        if (opts.omit && opts.omit(M, e)) st = 'omit';
        else st = G.occluded(M, faces, view) ? 'hid' : 'vis';
        if (cur && cur.st === st) cur.t1 = ts[i + 1];
        else {
          cur = { st, t0: ts[i], t1: ts[i + 1], ei, e };
          out.push(cur);
        }
      }
    });
    out.forEach((p) => {
      p.a = V.lerp(p.e.a, p.e.b, p.t0);
      p.b = V.lerp(p.e.a, p.e.b, p.t1);
    });
    return out.filter((p) => p.st !== 'omit');
  };

  /* ---------- poziomice (marching squares) ---------- */
  G.grid = (f, x0, x1, y0, y1, nx, ny) => {
    const v = [];
    for (let j = 0; j <= ny; j++) {
      const row = [];
      for (let i = 0; i <= nx; i++) row.push(f(x0 + ((x1 - x0) * i) / nx, y0 + ((y1 - y0) * j) / ny));
      v.push(row);
    }
    return { v, x0, x1, y0, y1, nx, ny, f };
  };
  G.isoline = (g, level) => {
    const segs = [];
    const X = (i) => g.x0 + ((g.x1 - g.x0) * i) / g.nx,
      Y = (j) => g.y0 + ((g.y1 - g.y0) * j) / g.ny;
    for (let j = 0; j < g.ny; j++)
      for (let i = 0; i < g.nx; i++) {
        const c = [
          [X(i), Y(j), g.v[j][i]],
          [X(i + 1), Y(j), g.v[j][i + 1]],
          [X(i + 1), Y(j + 1), g.v[j + 1][i + 1]],
          [X(i), Y(j + 1), g.v[j + 1][i]],
        ];
        if (c.some((q) => !isFinite(q[2]))) continue;
        const pts = [];
        for (let k = 0; k < 4; k++) {
          const a = c[k],
            b = c[(k + 1) % 4];
          const da = a[2] - level,
            db = b[2] - level;
          if ((da < 0) !== (db < 0)) {
            const t = da / (da - db);
            pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
          }
        }
        if (pts.length === 2) segs.push({ a: pts[0], b: pts[1] });
        else if (pts.length === 4) {
          const cv = g.f((X(i) + X(i + 1)) / 2, (Y(j) + Y(j + 1)) / 2) - level;
          const s0 = c[0][2] - level;
          if ((cv < 0) === (s0 < 0)) {
            segs.push({ a: pts[0], b: pts[3] });
            segs.push({ a: pts[1], b: pts[2] });
          } else {
            segs.push({ a: pts[0], b: pts[1] });
            segs.push({ a: pts[2], b: pts[3] });
          }
        }
      }
    return G.chain2(segs);
  };
  G.chain2 = (segs) => {
    const key = (p) => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4);
    const adj = {};
    segs.forEach((s, i) => {
      [key(s.a), key(s.b)].forEach((k) => (adj[k] = adj[k] || []).push(i));
    });
    const used = new Array(segs.length).fill(false);
    const lines = [];
    const walk = (start) => {
      const pts = [segs[start].a, segs[start].b];
      used[start] = true;
      for (let dir = 0; dir < 2; dir++) {
        let go = true;
        while (go) {
          go = false;
          const end = pts[pts.length - 1];
          for (const k of adj[key(end)] || []) {
            if (used[k]) continue;
            used[k] = true;
            pts.push(key(segs[k].a) === key(end) ? segs[k].b : segs[k].a);
            go = true;
            break;
          }
        }
        pts.reverse();
      }
      return pts;
    };
    for (let i = 0; i < segs.length; i++) if (!used[i]) lines.push(walk(i));
    return lines;
  };

  /* ---------- pierwiastki i krzywe przenikania ---------- */
  G.roots = (g, a, b, n = 160) => {
    const r = [];
    let x0 = a,
      g0 = g(a);
    for (let i = 1; i <= n; i++) {
      const x1 = a + ((b - a) * i) / n,
        g1 = g(x1);
      if (isFinite(g0) && isFinite(g1) && g0 * g1 < 0) {
        let lo = x0,
          hi = x1,
          glo = g0;
        for (let k = 0; k < 50; k++) {
          const m = (lo + hi) / 2,
            gm = g(m);
          if (gm * glo <= 0) hi = m;
          else {
            lo = m;
            glo = gm;
          }
        }
        r.push((lo + hi) / 2);
      }
      x0 = x1;
      g0 = g1;
    }
    return r;
  };
  /* Krzywa przenikania: powierzchnia A sparametryzowana (u – kąt, s – wzdłuż tworzącej),
     B dana równaniem F(P)=0. rootsAt(u) => tablica s (wejście/wyjście tworzącej z bryły B).
     Zwraca listę zamkniętych pętli (tablice punktów 3D).                                  */
  G.pairedLoops = (rootsAt, toPoint, N = 360) => {
    const U = (k) => (2 * Math.PI * k) / N;
    const pair = (u) => {
      const r = rootsAt(u);
      return r.length >= 2 ? [r[0], r[r.length - 1]] : null;
    };
    const arr = [];
    for (let k = 0; k < N; k++) arr.push(pair(U(k)));
    const loops = [];
    if (arr.every((a) => a)) {
      loops.push(arr.map((a, k) => toPoint(U(k), a[0])));
      loops.push(arr.map((a, k) => toPoint(U(k), a[1])));
      return loops;
    }
    if (arr.every((a) => !a)) return loops;
    const refine = (uBad, uGood) => {
      let lo = uBad,
        hi = uGood;
      for (let i = 0; i < 40; i++) {
        const m = (lo + hi) / 2;
        if (pair(m)) hi = m;
        else lo = m;
      }
      const p = pair(hi);
      return toPoint(hi, (p[0] + p[1]) / 2);
    };
    let start = arr.findIndex((a, k) => a && !arr[(k - 1 + N) % N]);
    let k = start;
    const visited = new Array(N).fill(false);
    while (!visited[k]) {
      if (arr[k] && !arr[(k - 1 + N) % N]) {
        const run = [];
        let j = k;
        while (arr[j] && !visited[j]) {
          visited[j] = true;
          run.push(j);
          j = (j + 1) % N;
        }
        const ka = run[0],
          kb = run[run.length - 1];
        const ua = U(ka),
          ub = U(kb);
        const uPrev = U(ka) - (2 * Math.PI) / N,
          uNext = U(kb) + (2 * Math.PI) / N;
        const loop = [refine(uPrev, ua)];
        run.forEach((q) => loop.push(toPoint(U(q), arr[q][0])));
        loop.push(refine(uNext, ub));
        for (let i = run.length - 1; i >= 0; i--) loop.push(toPoint(U(run[i]), arr[run[i]][1]));
        loops.push(loop);
      } else {
        visited[k] = true;
      }
      k = (k + 1) % N;
    }
    return loops;
  };

  /* Krzywe, gdy na każdej tworzącej jest dokładnie jedno przecięcie (np. walec wchodzący
     w stożek i kończący się w jego wnętrzu). rootsAt(u) => tablica s.  Zwraca pętle/łamane. */
  G.curveLoops = (rootsAt, toPoint, N = 360) => {
    const U = (k) => (2 * Math.PI * (k + 0.5)) / N;
    const arr = [];
    for (let k = 0; k < N; k++) arr.push(rootsAt(U(k)));
    const cnt = arr.map((r) => r.length);
    if (cnt.every((c) => c >= 2) || cnt.some((c) => c >= 2)) return G.pairedLoops((u) => rootsAt(u), toPoint, N);
    if (cnt.every((c) => c === 1)) return [arr.map((r, k) => toPoint(U(k), r[0]))];
    // łamane otwarte: przebiegi z jednym pierwiastkiem
    const out = [];
    let cur = null;
    for (let k = 0; k < N; k++) {
      if (cnt[k] === 1) {
        if (!cur) out.push((cur = []));
        cur.push(toPoint(U(k), arr[k][0]));
      } else cur = null;
    }
    if (out.length > 1 && cnt[0] === 1 && cnt[N - 1] === 1) {
      const last = out.pop();
      out[0] = last.concat(out[0]);
    }
    return out.filter((l) => l.length > 2).map((l) => Object.assign(l, { open: true }));
  };

  /* ---------- prymitywy brył wypukłych ---------- */
  G.box = (x0, x1, y0, y1, z0, z1) => {
    const b = [
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y1, z0],
      [x0, y1, z0],
    ];
    return G.prism(b, [0, 0, z1 - z0]);
  };
  /* graniastosłup o profilu w płaszczyźnie (y,z) wyciągnięty wzdłuż x */
  G.prismX = (prof, x0, x1) =>
    G.prism(
      prof.map((q) => [x0, q[0], q[1]]),
      [x1 - x0, 0, 0]
    );
  /* profil w (x,z) wyciągnięty wzdłuż y */
  G.prismY = (prof, y0, y1) =>
    G.prism(
      prof.map((q) => [q[0], y0, q[1]]),
      [0, y1 - y0, 0]
    );
  /* podstawa w (x,y) wyciągnięta wzdłuż z */
  G.prismZ = (base, z0, z1) =>
    G.prism(
      base.map((q) => [q[0], q[1], z0]),
      [0, 0, z1 - z0]
    );

  /* =====================================================================
     Bryła niewypukła jako suma brył wypukłych (np. schodki, wycięcia, otwory).
     Krawędzie rzeczywiste wyznaczamy badając zajętość przestrzeni wokół
     każdego kawałka krawędzi (krawędź = załamanie powierzchni sumy).
     ===================================================================== */
  G.Union = function (parts) {
    this.parts = parts.filter((p) => p && p.faces.length >= 4 && p.verts.length >= 4);
    const all = [].concat(...this.parts.map((p) => p.verts));
    const bb = [0, 1, 2].map((i) => [Math.min(...all.map((q) => q[i])), Math.max(...all.map((q) => q[i]))]);
    this.bb = bb;
    this.size = Math.max(...bb.map((r) => r[1] - r[0])) || 1;
  };
  G.Union.prototype.contains = function (P, eps = 1e-9) {
    return this.parts.some((p) => p.planes.every((pl) => G.sd(pl, P) <= eps));
  };
  G.Union.prototype.faces = function () {
    const f = [];
    this.parts.forEach((p) => p.faces.forEach((q, i) => f.push({ pts: q, pl: p.planes[i] })));
    return f;
  };
  G.Union.prototype.clip = function (pl) {
    return new G.Union(this.parts.map((p) => (p.verts.every((v) => G.sd(pl, v) <= 1e-9) ? p : p.verts.every((v) => G.sd(pl, v) >= -1e-9) ? null : p.clip(pl))));
  };
  G.Union.prototype.sections = function (pl) {
    return this.parts.map((p) => p.section(pl)).filter((s) => s.length >= 3);
  };
  /* kawałki krawędzi będące załamaniami powierzchni sumy */
  G.Union.prototype.creaseEdges = function () {
    const r = this.size * 0.004;
    const NS = 48;
    const planes = [].concat(...this.parts.map((p) => p.planes));
    const out = [];
    const seen = new Set();
    const key = (M) => M.map((v) => Math.round(v * 1e3)).join(',');
    this.parts.forEach((part) =>
      part.edges.forEach((e) => {
        const d = V.sub(e.b, e.a);
        const L = V.len(d);
        if (L < 1e-9) return;
        const u0 = V.mul(d, 1 / L);
        const ts = [0, 1];
        planes.forEach((pl) => {
          const s = G.segPlane(e.a, e.b, pl);
          if (s && s.t > 1e-7 && s.t < 1 - 1e-7) ts.push(s.t);
        });
        ts.sort((a, b) => a - b);
        const ax = Math.abs(u0[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = V.norm(V.cross(u0, ax)),
          w = V.cross(u0, u);
        for (let i = 0; i + 1 < ts.length; i++) {
          if (ts[i + 1] - ts[i] < 1e-7) continue;
          const M = V.lerp(e.a, e.b, (ts[i] + ts[i + 1]) / 2);
          const k = key(M) + '|' + key(u0.map((v) => Math.abs(v)));
          if (seen.has(k)) continue;
          seen.add(k);
          const occ = [];
          for (let j = 0; j < NS; j++) {
            const a = (2 * Math.PI * (j + 0.37)) / NS;
            occ.push(this.contains(V.add(M, V.add(V.mul(u, r * Math.cos(a)), V.mul(w, r * Math.sin(a))))));
          }
          const n = occ.filter(Boolean).length;
          if (n === 0 || n === NS) continue;
          const tr = [];
          for (let j = 0; j < NS; j++) if (occ[j] !== occ[(j + 1) % NS]) tr.push(j);
          if (tr.length === 2 && Math.abs(Math.abs(tr[1] - tr[0]) - NS / 2) <= 0 && n === NS / 2) continue; // płaska ściana
          out.push({ a: V.lerp(e.a, e.b, ts[i]), b: V.lerp(e.a, e.b, ts[i + 1]) });
        }
      })
    );
    return G.mergeCollinear(out);
  };
  /* scalanie współliniowych, stykających się odcinków */
  G.mergeCollinear = (segs, tol = 1e-6) => {
    const used = new Array(segs.length).fill(false);
    const res = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      let a = segs[i].a,
        b = segs[i].b;
      const d = V.norm(V.sub(b, a));
      let grown = true;
      while (grown) {
        grown = false;
        for (let j = 0; j < segs.length; j++) {
          if (used[j]) continue;
          const s = segs[j];
          const ds = V.norm(V.sub(s.b, s.a));
          if (Math.abs(Math.abs(V.dot(ds, d)) - 1) > 1e-9) continue;
          if (G.pointLineDist(s.a, a, d) > tol) continue;
          const ends = [
            [s.a, s.b],
            [s.b, s.a],
          ];
          for (const [p, q] of ends) {
            if (V.dist(p, b) < tol) {
              b = q;
              used[j] = grown = true;
              break;
            }
            if (V.dist(p, a) < tol) {
              a = q;
              used[j] = grown = true;
              break;
            }
          }
        }
      }
      res.push({ a, b });
    }
    return res;
  };

  /* ---------- obroty ---------- */
  G.rotMat = (axis, ang) => {
    const [x, y, z] = V.norm(axis);
    const c = Math.cos(ang),
      s = Math.sin(ang),
      C = 1 - c;
    return [
      [c + x * x * C, x * y * C - z * s, x * z * C + y * s],
      [y * x * C + z * s, c + y * y * C, y * z * C - x * s],
      [z * x * C - y * s, z * y * C + x * s, c + z * z * C],
    ];
  };
  G.matVec = (M, v) => [V.dot(M[0], v), V.dot(M[1], v), V.dot(M[2], v)];
  G.matMul = (A, B) => A.map((row) => [0, 1, 2].map((j) => row[0] * B[0][j] + row[1] * B[1][j] + row[2] * B[2][j]));
  G.rotAbout = (P, O, axis, ang) => V.add(O, G.matVec(G.rotMat(axis, ang), V.sub(P, O)));
  /* przekształcenie afiniczne {R,t}: X -> R X + t */
  G.affId = () => ({
    R: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    t: [0, 0, 0],
  });
  G.affRot = (O, axis, ang) => {
    const R = G.rotMat(axis, ang);
    return { R, t: V.sub(O, G.matVec(R, O)) };
  };
  G.affMul = (A, B) => ({ R: G.matMul(A.R, B.R), t: V.add(G.matVec(A.R, B.t), A.t) });
  G.affApply = (A, X) => V.add(G.matVec(A.R, X), A.t);

  /* ---------- formatowanie liczb ---------- */
  G.f1 = (x) => (Math.round(x * 10) / 10).toFixed(1).replace('.', ',');
  G.f2 = (x) => (Math.round(x * 100) / 100).toFixed(2).replace('.', ',');
  G.f0 = (x) => String(Math.round(x));
})();
