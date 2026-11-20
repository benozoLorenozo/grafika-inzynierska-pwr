/* ===================================================================
   GW – system rzutni (Monge + transformacje), builder kroków konstrukcji,
   wspólny graf obiektów (id + powiązania) dla widoków 3D i 2D.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G;

  /* ---------- formatowanie oznaczeń: A'' , A^{IV}, x_{12}, h_α ---------- */
  const ROM = ['', "'", "''", "'''", '^{IV}', '^{V}', '^{VI}', '^{VII}'];
  GW.lab = (name, k) => name + (ROM[k] || '^{' + k + '}');
  GW.parseLab = (s) => {
    // => [{t:'n'|'sup'|'sub', s}]
    const out = [];
    let i = 0,
      buf = '';
    const flush = () => {
      if (buf) out.push({ t: 'n', s: buf });
      buf = '';
    };
    while (i < s.length) {
      const c = s[i];
      if (c === "'") {
        let n = 0;
        while (s[i] === "'") {
          n++;
          i++;
        }
        buf += n === 1 ? '′' : n === 2 ? '″' : n === 3 ? '‴' : '′'.repeat(n);
        continue;
      }
      if ((c === '^' || c === '_') && i + 1 < s.length) {
        flush();
        let txt;
        if (s[i + 1] === '{') {
          const e = s.indexOf('}', i);
          txt = s.slice(i + 2, e);
          i = e + 1;
        } else {
          txt = s[i + 1];
          i += 2;
        }
        out.push({ t: c === '^' ? 'sup' : 'sub', s: txt });
        continue;
      }
      buf += c;
      i++;
    }
    flush();
    return out;
  };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  GW.labHTML = (s) =>
    GW.parseLab(String(s))
      .map((p) => (p.t === 'n' ? esc(p.s) : p.t === 'sup' ? '<sup>' + esc(p.s) + '</sup>' : '<sub>' + esc(p.s) + '</sub>'))
      .join('');
  GW.labSVG = (s) =>
    GW.parseLab(String(s))
      .map((p) =>
        p.t === 'n'
          ? '<tspan>' + esc(p.s) + '</tspan>'
          : '<tspan dy="' + (p.t === 'sup' ? '-0.45em' : '0.35em') + '" font-size="72%">' + esc(p.s) + '</tspan><tspan dy="' + (p.t === 'sup' ? '0.45em' : '-0.35em') + '">​</tspan>'
      )
      .join('');
  GW.labLen = (s) => GW.parseLab(String(s)).reduce((a, p) => a + (p.t === 'n' ? p.s.length : p.s.length * 0.7), 0);
  /* skrót do HTML w opisach kroków */
  GW.h = (s) => GW.labHTML(s);

  /* ===================================================================
     System rzutni.  Każda rzutnia: O3 (punkt osi), U3 (kierunek osi),
     V3 (w płaszczyźnie, prostopadle do osi), N (normalna po stronie obiektów),
     mapa na arkusz: s0 + su*u + sv*v.
     =================================================================== */
  class ProjSys {
    constructor() {
      this.P = {};
      this.list = [];
    }
    /* rzutnia π2 – korzeń (pionowa, y=0) */
    root(id = 'p2', k = 2) {
      const pl = { id, k, parent: null, O3: [0, 0, 0], U3: [1, 0, 0], V3: [0, 0, 1], s0: [0, 0], su: [1, 0], sv: [0, -1], N: [0, 1, 0] };
      this.P[id] = pl;
      this.list.push(pl);
      return pl;
    }
    /* nowa rzutnia prostopadła do parent; oś w arkuszu: punkt a, kierunek d; n – strona rozłożenia;
       prev – rzutnia "porzucana" (z niej przenosimy odległości)                                 */
    child(id, k, parentId, a, d, n, prevId) {
      const p = this.P[parentId];
      d = V.norm(d);
      n = V.norm(n);
      if (V.dot(n, d) > 1e-9) n = V.norm(V.sub(n, V.mul(d, V.dot(n, d))));
      const al = V.dot(V.sub(a, p.s0), p.su),
        be = V.dot(V.sub(a, p.s0), p.sv);
      const A3 = V.add(p.O3, V.add(V.mul(p.U3, al), V.mul(p.V3, be)));
      const to3 = (s) => V.add(V.mul(p.U3, V.dot(s, p.su)), V.mul(p.V3, V.dot(s, p.sv)));
      const D3 = V.norm(to3(d));
      const N3 = V.norm(V.mul(to3(n), -1));
      const pl = { id, k, parent: parentId, prev: prevId || null, O3: A3, U3: D3, V3: p.N.slice(), s0: a.slice(), su: d, sv: n, N: N3 };
      // kąt rozkładania: V3 ma przejść w -N
      const t = V.cross(pl.U3, pl.V3);
      pl.ang = V.dot(t, V.mul(N3, -1)) > 0 ? Math.PI / 2 : -Math.PI / 2;
      this.P[id] = pl;
      this.list.push(pl);
      return pl;
    }
    get(id) {
      return this.P[id];
    }
    uv(id, P) {
      const pl = this.P[id];
      const w = V.sub(P, pl.O3);
      return [V.dot(w, pl.U3), V.dot(w, pl.V3)];
    }
    toSheet(id, P) {
      const pl = this.P[id];
      const [u, v] = this.uv(id, P);
      return V.add(pl.s0, V.add(V.mul(pl.su, u), V.mul(pl.sv, v)));
    }
    proj3(id, P) {
      const pl = this.P[id];
      return V.sub(P, V.mul(pl.N, V.dot(V.sub(P, pl.O3), pl.N)));
    }
    /* odległość punktu od rzutni (po stronie obiektów dodatnia) */
    dist(id, P) {
      const pl = this.P[id];
      return V.dot(V.sub(P, pl.O3), pl.N);
    }
    axisFoot3(id, P) {
      const pl = this.P[id];
      return V.add(pl.O3, V.mul(pl.U3, V.dot(V.sub(P, pl.O3), pl.U3)));
    }
    axisFootSheet(id, P) {
      const pl = this.P[id];
      return V.add(pl.s0, V.mul(pl.su, V.dot(V.sub(P, pl.O3), pl.U3)));
    }
    axisName(id) {
      const pl = this.P[id];
      if (!pl.parent) return null;
      const a = [pl.k, this.P[pl.parent].k].sort((x, y) => x - y);
      return 'x_{' + a[0] + a[1] + '}';
    }
    /* transformacja rozkładania (afiniczna) dla rzutni id przy stopniach U[id]∈[0,1] */
    matrix(id, U) {
      const pl = this.P[id];
      if (!pl.parent) return G.affId();
      const Mp = this.matrix(pl.parent, U);
      const R = G.affRot(pl.O3, pl.U3, (U[id] || 0) * pl.ang);
      return G.affMul(Mp, R);
    }
    /* kierunek "góra arkusza" w 3D (do ustawienia kamery obserwatora) */
    sheetUp3(id) {
      const pl = this.P[id];
      const s = [0, -1];
      return V.norm(V.add(V.mul(pl.U3, V.dot(s, pl.su)), V.mul(pl.V3, V.dot(s, pl.sv))));
    }
    fit(points, margin = 12) {
      this.list.forEach((pl) => {
        const uv = points.map((P) => this.uv(pl.id, P));
        const us = uv.map((q) => q[0]),
          vs = uv.map((q) => q[1]);
        pl.ext = {
          u0: Math.min(...us) - margin,
          u1: Math.max(...us) + margin,
          v0: Math.min(0, Math.min(...vs) - margin * 0.3),
          v1: Math.max(...vs) + margin,
        };
        if (!pl.parent) pl.ext.v0 = 0;
      });
      // wspólny zakres u dla π1 i π2
      const a = this.P.p1,
        b = this.P.p2;
      if (a && b) {
        const u0 = Math.min(a.ext.u0, b.ext.u0),
          u1 = Math.max(a.ext.u1, b.ext.u1);
        a.ext.u0 = b.ext.u0 = u0;
        a.ext.u1 = b.ext.u1 = u1;
      }
      const c = this.P.p3;
      if (c && b && c.parent === 'p2') {
        c.ext.u0 = 0;
        c.ext.u1 = b.ext.v1;
        c.ext.v0 = 0;
        if (a) c.ext.v1 = a.ext.v1;
      }
    }
    quad(id) {
      const pl = this.P[id],
        e = pl.ext;
      const P = (u, v) => V.add(pl.O3, V.add(V.mul(pl.U3, u), V.mul(pl.V3, v)));
      return [P(e.u0, e.v0), P(e.u1, e.v0), P(e.u1, e.v1), P(e.u0, e.v1)];
    }
  }
  GW.ProjSys = ProjSys;

  /* ===================================================================
     Builder kroków.  Prymitywy 3D (p3) i 2D (p2) z polami:
       id – identyfikator semantyczny (wspólny dla 3D i 2D), from/to – kroki,
       s – styl, label – etykieta, pl – rzutnia (dla rozkładania w 3D)
     =================================================================== */
  class Builder {
    constructor() {
      this.steps = [];
      this.p3 = [];
      this.p2 = [];
      this.infoMap = {};
      this.links = {};
      this.cur = -1;
      this.data = {};
      this.sys = null;
      this.pts3 = [];
      this.planeFrom = {};
    }
    step(o) {
      this.steps.push(Object.assign({ src: [] }, o));
      this.cur = this.steps.length - 1;
      return this;
    }
    get S() {
      return this.steps[this.cur];
    }
    src(...ids) {
      this.S.src.push(...ids.flat());
    }
    a3(p) {
      p.from = this.cur;
      this.p3.push(p);
      if (p.p) this.pts3.push(p.p);
      if (p.a) this.pts3.push(p.a, p.b);
      if (p.pts && !p.noFit) p.pts.forEach((q) => this.pts3.push(q));
      return p;
    }
    a2(p) {
      p.from = this.cur;
      this.p2.push(p);
      return p;
    }
    end(...ids) {
      const set = new Set(ids.flat());
      this.p3.concat(this.p2).forEach((p) => {
        if (set.has(p.id) && p.to === undefined && p.from < this.cur) p.to = this.cur;
      });
    }
    endWhere(fn) {
      this.p3.concat(this.p2).forEach((p) => {
        if (p.to === undefined && p.from < this.cur && fn(p)) p.to = this.cur;
      });
    }
    info(id, text, links) {
      this.infoMap[id] = text;
      if (links) this.link(id, links);
    }
    link(id, arr) {
      const L = (this.links[id] = this.links[id] || []);
      arr.forEach((x) => {
        if (L.indexOf(x) < 0) L.push(x);
      });
    }
    link2(a, b) {
      this.link(a, [b]);
      this.link(b, [a]);
    }

    /* ---------- pomocnicze dla rzutów Monge'a ---------- */
    useSys(sys) {
      this.sys = sys;
      sys.list.forEach((pl) => (this.planeFrom[pl.id] = this.planeFrom[pl.id] ?? 0));
    }
    addPlane(id, k, parent, a, d, n, prev) {
      const pl = this.sys.child(id, k, parent, a, d, n, prev);
      this.planeFrom[id] = this.cur;
      return pl;
    }
    /* rzutnie podstawowe obecne w układzie (π1, π2 i ewentualnie π3) */
    get base() {
      return GW.mplanes(this.sys);
    }
    /* punkt w przestrzeni + rzuty; opts: {on:['p1','p2'], s, ray, odn, lab, space, pre} */
    mPoint(name, P, o = {}) {
      const sys = this.sys;
      const on = o.on || this.base;
      const s = o.s || 'given';
      const id0 = (o.pre || '') + name;
      const res = { P, sh: {}, id: id0 };
      if (o.space !== false) {
        this.a3({ t: 'pt', id: id0, p: P, s, label: o.lab === false ? null : name });
        this.info(id0, o.info || 'Punkt ' + GW.labHTML(name) + ' w przestrzeni');
      }
      on.forEach((pid) => {
        const pl = sys.get(pid);
        const ln = GW.lab(name, pl.k);
        const id = id0 + '|' + pl.k;
        const p3 = sys.proj3(pid, P);
        const sh = sys.toSheet(pid, P);
        res.sh[pid] = sh;
        this.a3({ t: 'pt', id, p: p3, pl: pid, s: o.sProj || 'proj', label: o.lab === false ? null : ln, small: true });
        this.a2({ t: 'pt', id, p: sh, s, label: o.lab === false ? null : ln, lo: o.lo && o.lo[pid] });
        if (o.ray !== false) this.a3({ t: 'seg', id: 'ray:' + id, a: P, b: p3, s: 'ray' });
        this.info(id, (o.infoProj && o.infoProj(pl)) || GW.labHTML(ln) + ' – rzut punktu ' + GW.labHTML(name) + ' na rzutnię π<sub>' + pl.k + '</sub>');
        this.link(id, [id0, 'ray:' + id]);
        this.link(id0, [id, 'ray:' + id]);
        this.link('ray:' + id, [id, id0]);
        this.info('ray:' + id, 'Promień rzutujący punktu ' + GW.labHTML(name) + ' – prostopadły do π<sub>' + pl.k + '</sub>');
      });
      if (o.odn !== false) {
        // linie odnoszące między rzutnią a jej rodzicem (jeśli oba rzuty są w zbiorze)
        on.forEach((pid) => {
          const pl = sys.get(pid);
          if (!pl.parent || on.indexOf(pl.parent) < 0) return;
          this.odn(name, P, pl.parent, pid, { pre: o.pre });
        });
        if (on.indexOf('p3') >= 0 && on.indexOf('p1') >= 0 && sys.P.p3 && sys.P.p3.parent === 'p2') this.odn13(name, P, { pre: o.pre });
      }
      return res;
    }
    /* odnosząca π1 ↔ π3 (przez prostą pod 45° albo łuk wokół O) */
    odn13(name, P, o = {}) {
      const sys = this.sys;
      const p3 = sys.get('p3');
      const ax = p3.s0[0];
      const id = 'odn:' + (o.pre || '') + name + '|13';
      const foot = [ax, P[1], 0];
      this.a3({ t: 'seg', id, a: sys.proj3('p1', P), b: foot, pl: 'p1', s: 'odn' });
      this.a3({ t: 'seg', id, a: sys.proj3('p3', P), b: foot, pl: 'p3', s: 'odn' });
      const s1 = sys.toSheet('p1', P),
        s3 = sys.toSheet('p3', P);
      const y = P[1];
      if (GW.view && GW.view.mitre === 'arc' && y > 1e-6) {
        this.a2({ t: 'seg', id, a: s1, b: [ax, y], s: 'odn' });
        this.a2({ t: 'arc', id, c: [ax, 0], r: y, a0: Math.PI / 2, a1: 0, s: 'odn' });
        this.a2({ t: 'seg', id, a: [ax + y, 0], b: s3, s: 'odn' });
      } else this.a2({ t: 'pl', id, pts: [s1, [ax + y, y], s3], s: 'odn' });
      const nm = (o.pre || '') + name;
      this.info(id, 'Linia odnosząca ' + GW.labHTML(GW.lab(name, 1)) + '–' + GW.labHTML(GW.lab(name, 3)) + ': odległość od π<sub>2</sub> (y = ' + G.f1(y) + ') przenosimy z rzutu poziomego do bocznego ' + (GW.view && GW.view.mitre === 'arc' ? 'łukiem o środku w O' : 'przez prostą pod 45°'));
      this.link(id, [nm + '|1', nm + '|3']);
      return id;
    }
    /* linia odnosząca rzutów punktu na rzutniach pa – pb (pb dzieckiem pa lub odwrotnie) */
    odn(name, P, pa, pb, o = {}) {
      const sys = this.sys;
      let child = sys.get(pb),
        par = sys.get(pa);
      if (child.parent !== pa) {
        child = sys.get(pa);
        par = sys.get(pb);
      }
      const id = 'odn:' + (o.pre || '') + name + '|' + par.k + child.k;
      const foot3 = sys.axisFoot3(child.id, P);
      this.a3({ t: 'seg', id, a: sys.proj3(child.id, P), b: foot3, pl: child.id, s: 'odn' });
      this.a3({ t: 'seg', id, a: sys.proj3(par.id, P), b: foot3, pl: par.id, s: 'odn' });
      this.a2({ t: 'seg', id, a: sys.toSheet(par.id, P), b: sys.toSheet(child.id, P), s: 'odn' });
      this.info(id, 'Linia odnosząca ' + GW.labHTML(GW.lab(name, par.k)) + '–' + GW.labHTML(GW.lab(name, child.k)) + ' – prostopadła do osi ' + GW.labHTML(sys.axisName(child.id)) + ' (po rozłożeniu rzutni)');
      const nm = (o.pre || '') + name;
      this.link(id, [nm + '|' + par.k, nm + '|' + child.k]);
      return id;
    }
    /* przeniesienie odległości przy transformacji: punkt P, nowa rzutnia nid */
    transfer(name, P, nid, o = {}) {
      const sys = this.sys;
      const pl = sys.get(nid);
      const prev = sys.get(pl.prev),
        par = sys.get(pl.parent);
      // oś między prev i par
      const axisOld = prev.parent === par.id ? prev.id : par.id;
      const id = 'dist:' + (o.pre || '') + name + '|' + nid;
      const d = Math.abs(sys.dist(par.id, P));
      // 3D: odcinek od rzutu na prev do osi (prev,par) oraz od rzutu na nowej do osi nowej
      this.a3({ t: 'seg', id, a: sys.proj3(prev.id, P), b: sys.axisFoot3(axisOld, P), pl: prev.id, s: 'dist' });
      this.a3({ t: 'seg', id, a: sys.proj3(nid, P), b: sys.axisFoot3(nid, P), pl: nid, s: 'dist' });
      const s1a = sys.toSheet(prev.id, P),
        s1b = sys.axisFootSheet(axisOld, P);
      const s2a = sys.toSheet(nid, P),
        s2b = sys.axisFootSheet(nid, P);
      this.a2({ t: 'seg', id, a: s1a, b: s1b, s: 'dist' });
      this.a2({ t: 'seg', id, a: s2b, b: s2a, s: 'dist' });
      // łuk "cyrkla" – symboliczny znacznik długości
      this.a2({ t: 'tick', id, a: s1b, b: s1a, s: 'dist' });
      this.a2({ t: 'tick', id, a: s2b, b: s2a, s: 'dist' });
      const nameOld = GW.lab(name, prev.k),
        nameNew = GW.lab(name, pl.k);
      this.info(
        id,
        'Przenoszona odległość ' +
          G.f1(d) +
          ' = odległość punktu ' +
          GW.labHTML(name) +
          ' od rzutni π<sub>' +
          par.k +
          '</sub>.<br>Odcinek ' +
          GW.labHTML(nameOld) +
          '–' +
          GW.labHTML(sys.axisName(axisOld)) +
          ' = odcinek ' +
          GW.labHTML(nameNew) +
          '–' +
          GW.labHTML(sys.axisName(nid))
      );
      this.link(id, [(o.pre || '') + name + '|' + prev.k, (o.pre || '') + name + '|' + pl.k]);
      return id;
    }
    /* odcinek w przestrzeni + jego rzuty (bez widoczności) */
    mSeg(id, A, B, o = {}) {
      const sys = this.sys;
      const on = o.on || this.base;
      const s = o.s || 'given';
      if (o.space !== false) this.a3({ t: 'seg', id, a: A, b: B, s: o.s3 || s });
      on.forEach((pid) => {
        const pl = sys.get(pid);
        const pidk = id + '|' + pl.k;
        if (o.proj3 !== false) this.a3({ t: 'seg', id: pidk, a: sys.proj3(pid, A), b: sys.proj3(pid, B), pl: pid, s: o.sProj3 || 'projl' });
        if (o.in2 !== false) this.a2({ t: 'seg', id: pidk, a: sys.toSheet(pid, A), b: sys.toSheet(pid, B), s: (o.s2 && o.s2[pid]) || s, label: o.label ? GW.lab(o.label, pl.k) : null });
        this.link(pidk, [id]);
        this.link(id, [pidk]);
        if (o.name) this.info(pidk, GW.labHTML(GW.lab(o.name, pl.k)) + ' – rzut ' + (o.what || 'odcinka ' + GW.labHTML(o.name)) + ' na π<sub>' + pl.k + '</sub>');
      });
      if (o.name) this.info(id, (o.what0 || 'Odcinek ') + GW.labHTML(o.name) + ' w przestrzeni');
    }
    /* wielokąt (wypełniony) w przestrzeni + rzuty */
    mPoly(id, pts, o = {}) {
      const sys = this.sys;
      const on = o.on || this.base;
      this.a3({ t: 'poly', id, pts, col: o.col || '#e8c060', op: o.op ?? 0.45 });
      on.forEach((pid) => {
        const pl = sys.get(pid);
        if (o.proj3 !== false) this.a3({ t: 'poly', id: id + '|' + pl.k, pts: pts.map((P) => sys.proj3(pid, P)), pl: pid, col: o.col || '#e8c060', op: 0.25, noFit: true });
        if (o.fill2 !== false) this.a2({ t: 'poly', id: id + '|' + pl.k, pts: pts.map((P) => sys.toSheet(pid, P)), fill: o.col || '#e8c060', op: o.op2 ?? 0.18 });
        this.link(id + '|' + pl.k, [id]);
        this.link(id, [id + '|' + pl.k]);
        if (o.name) this.info(id + '|' + pl.k, 'Rzut ' + o.name + ' na π<sub>' + pl.k + '</sub>');
      });
      if (o.name) this.info(id, o.name + ' w przestrzeni');
    }
    /* ślad prostej / pomocnicza płaszczyzna rzutująca (3D) */
    planeQuad(id, pts, o = {}) {
      this.a3({ t: 'poly', id, pts, col: o.col || '#3a7be0', op: o.op ?? 0.16, edge: true, noFit: true });
    }
    /* zakończenie – rzutnie (3D) i osie (2D) */
    finish() {
      if (!this.sys) return this;
      const sys = this.sys;
      sys.fit(this.pts3.length ? this.pts3 : [[0, 0, 0]]);
      // bbox 2D
      const pts2 = [];
      this.p2.forEach((p) => {
        if (p.p) pts2.push(p.p);
        if (p.a) pts2.push(p.a, p.b);
        if (p.pts) p.pts.forEach((q) => pts2.push(q));
      });
      const bb = pts2.length ? G.bbox2(pts2) : [-10, -10, 10, 10];
      const pad = 14;
      const box = [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad];
      sys.list.forEach((pl) => {
        const from = this.planeFrom[pl.id] || 0;
        const nm = 'π_' + pl.k;
        this.p3.push({ t: 'poly', id: 'plane:' + pl.id, pts: sys.quad(pl.id), pl: pl.id, col: pl.k === 1 ? '#7fa8d8' : pl.k === 2 ? '#9ec29a' : '#d8a07f', op: 0.13, edge: true, from, planeLabel: nm, isPlane: true });
        this.infoMap['plane:' + pl.id] = 'Rzutnia π<sub>' + pl.k + '</sub>' + (pl.k === 1 ? ' (pozioma)' : pl.k === 2 ? ' (pionowa)' : pl.k === 3 ? ' (boczna / profilowa) – widok z lewej, rozkładana na prawo od π<sub>2</sub>' : ' – rzutnia dodatkowa (transformacja)');
        if (pl.parent) {
          const ax = sys.axisName(pl.id);
          const e = pl.ext;
          const A = V.add(pl.O3, V.mul(pl.U3, e.u0)),
            B = V.add(pl.O3, V.mul(pl.U3, e.u1));
          const idx = 'axis:' + pl.id;
          this.p3.push({ t: 'seg', id: idx, a: A, b: B, pl: pl.id, s: 'axis', from, label: ax, labelAt: 1 });
          const c = G.clipLine2(pl.s0, pl.su, box);
          if (c) {
            let [a, b] = c;
            if (V.dot(V.sub(b, a), pl.su) < 0) [a, b] = [b, a];
            this.p2.push({ t: 'seg', id: idx, a, b, s: 'axis', from, label: ax, labelEnd: true });
            // numery rzutni po obu stronach osi
            const par = sys.get(pl.parent);
            const off = 7;
            const end = V.add(b, V.mul(pl.su, -6));
            this.p2.push({ t: 'text', id: idx, p: V.add(end, V.mul(pl.sv, off)), s: 'axisnum', txt: String(pl.k), from });
            this.p2.push({ t: 'text', id: idx, p: V.add(end, V.mul(pl.sv, -off)), s: 'axisnum', txt: String(par.k), from });
          }
          this.infoMap[idx] = 'Oś rzutów ' + GW.labHTML(ax) + ' – krawędź przecięcia rzutni π<sub>' + Math.min(pl.k, sys.get(pl.parent).k) + '</sub> i π<sub>' + Math.max(pl.k, sys.get(pl.parent).k) + '</sub>';
          this.link(idx, ['plane:' + pl.id, 'plane:' + pl.parent]);
          if (pl.id === 'p3' && pl.parent === 'p2' && !(GW.view && GW.view.mitre === 'arc')) {
            const L = Math.max(20, (sys.P.p1 && sys.P.p1.ext ? sys.P.p1.ext.v1 : 60) + 6);
            const O = pl.s0;
            this.p2.push({ t: 'seg', id: 'mitre', a: O, b: [O[0] + L, O[1] + L], s: 'thin', from, noFit: true });
            this.infoMap.mitre = 'Prosta pomocnicza pod 45° – przenosi odległości od π<sub>2</sub> (współrzędne y) z rzutu poziomego do bocznego';
          }
        }
      });
      return this;
    }
  }
  GW.Builder = Builder;

  /* ---------- widoczność odcinka w rzucie (dla Monge'a): kawałki 2D ---------- */
  GW.visPieces = (sys, pid, edges, faces, opts) => {
    const pl = sys.get(pid);
    const pieces = G.hlr(edges, faces, { dir: pl.N }, opts);
    return pieces.map((p) => ({ a3: p.a, b3: p.b, a: sys.toSheet(pid, p.a), b: sys.toSheet(pid, p.b), vis: p.st === 'vis', e: p.e }));
  };

  /* rzutnie podstawowe w układzie Monge'a (π1, π2, ewentualnie π3) */
  GW.mplanes = (sys) => (sys ? ['p1', 'p2'].concat(sys.P.p3 && sys.P.p3.parent === 'p2' ? ['p3'] : []).filter((p) => sys.P[p]) : []);
  GW.view = { p3: false, mitre: '45' };

  /* ---------- kategorie prymitywów (filtry widoku) ---------- */
  GW.catOf = (p) => {
    if (p.isPlane) return 'planes';
    if (p.t === 'mesh') return p.noPick && p.id !== 'hist' ? 'aux' : 'solids';
    if (p.t === 'poly') return p.edge ? 'auxplanes' : 'solids';
    if (p.t === 'pt') return 'pts';
    if (p.t === 'text') return p.s === 'hval' ? 'cont' : p.s === 'axisnum' ? 'axes' : 'text';
    if (p.t === 'hatch') return 'hatch';
    const s = p.s || 'given';
    if (s === 'ray') return 'rays';
    if (s === 'odn') return 'odn';
    if (s === 'axis') return 'axes';
    if (s === 'res' || s === 'res2' || s === 'resT') return 'res';
    if (s === 'resd') return 'res+hid';
    if (s === 'hid' || s === 'hidv') return 'hid';
    if (s === 'cont' || s === 'contb') return 'cont';
    if (s === 'aux' || s === 'auxd' || s === 'aux2' || s === 'sec' || s === 'thin' || s === 'dist' || s === 'light' || s === 'lightl' || s === 'eye') return 'aux';
    return 'given';
  };
  GW.FILTERS = [
    ['given', 'Dane i krawędzie widoczne'],
    ['hid', 'Linie niewidoczne (kreskowe)'],
    ['res', 'Wynik (czerwony/fioletowy)'],
    ['aux', 'Konstrukcja pomocnicza'],
    ['pts', 'Punkty'],
    ['labels', 'Etykiety (oznaczenia)'],
    ['odn', 'Linie odnoszące'],
    ['rays', 'Promienie rzutujące (3D)'],
    ['axes', 'Osie rzutów'],
    ['planes', 'Rzutnie'],
    ['auxplanes', 'Płaszczyzny pomocnicze'],
    ['solids', 'Bryły / powierzchnie / wypełnienia'],
    ['cont', 'Warstwice i cechy'],
    ['hatch', 'Kreskowanie przekrojów'],
    ['text', 'Opisy tekstowe'],
  ];
  GW.passFilter = (p, F) => {
    if (!F) return true;
    const c = GW.catOf(p);
    if (c === 'res+hid') return F.res !== false && F.hid !== false;
    return F[c] !== false;
  };

  /* ---------- rejestr lekcji ---------- */
  GW.lessons = [];
  GW.addLesson = (L) => GW.lessons.push(L);
  GW.modules = [
    { n: 1, t: 'Rzuty Monge’a', s: 'Monge' },
    { n: 2, t: 'Przenikanie wielościanów', s: 'Wielościany' },
    { n: 3, t: 'Przenikanie brył obrotowych', s: 'Bryły obrotowe' },
    { n: 4, t: 'Aksonometria i przekrój', s: 'Aksonometria' },
    { n: 5, t: 'Rzut cechowany', s: 'Rzut cechowany' },
    { n: 6, t: 'Perspektywa', s: 'Perspektywa' },
  ];
})();
