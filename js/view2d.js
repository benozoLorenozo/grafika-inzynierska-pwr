/* ===================================================================
   GW.View2D – arkusz rysunkowy (SVG), współrzędne arkusza: x→, y↓
   Prymitywy: pt, seg, pl, poly, circle, arc, text, tick, hatch
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G;
  const NS = 'http://www.w3.org/2000/svg';

  class View2D {
    constructor(el) {
      this.el = el;
      this.svg = document.createElementNS(NS, 'svg');
      this.svg.setAttribute('class', 'sheet');
      el.appendChild(this.svg);
      this.k = 3;
      this.tx = 0;
      this.ty = 0;
      this.prims = [];
      this.ov = [];
      this.hl = new Set();
      this.src = new Set();
      this.animStep = -1;
      this.onHover = null;
      this.onMove = null;
      this.onClick = null;
      this.onBgMove = null;
      let drag = null;
      this.svg.addEventListener('mousedown', (e) => {
        drag = { x: e.clientX, y: e.clientY, tx: this.tx, ty: this.ty, moved: false };
      });
      window.addEventListener('mousemove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.x,
          dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        this.tx = drag.tx + dx;
        this.ty = drag.ty + dy;
        this.render(false);
      });
      window.addEventListener('mouseup', () => {
        this.dragMoved = drag ? drag.moved : false;
        drag = null;
      });
      this.svg.addEventListener(
        'wheel',
        (e) => {
          e.preventDefault();
          const r = this.svg.getBoundingClientRect();
          const mx = e.clientX - r.left,
            my = e.clientY - r.top;
          const f = Math.exp(-e.deltaY * 0.0015);
          const wx = (mx - this.tx) / this.k,
            wy = (my - this.ty) / this.k;
          this.k *= f;
          this.tx = mx - wx * this.k;
          this.ty = my - wy * this.k;
          this.render(false);
        },
        { passive: false }
      );
      this.cur = null;
      this.svg.addEventListener('mousemove', (e) => {
        const t = e.target.closest && e.target.closest('[data-id]');
        const id = t ? t.getAttribute('data-id') : null;
        if (id !== this.cur) {
          this.cur = id;
          this.onHover && this.onHover(id, e);
        } else if (id && this.onMove) this.onMove(e);
        const r = this.svg.getBoundingClientRect();
        const SP = [(e.clientX - r.left - this.tx) / this.k, (e.clientY - r.top - this.ty) / this.k];
        if (this.onBgMove) this.onBgMove(SP, e);
        if (this.onCursor) this.onCursor(SP, e, id, [e.clientX - r.left, e.clientY - r.top]);
      });
      this.svg.addEventListener('mouseleave', () => {
        this.cur = null;
        this.onHover && this.onHover(null, null);
        this.onBgMove && this.onBgMove(null);
        this.onCursor && this.onCursor(null);
      });
      this.svg.addEventListener('click', (e) => {
        if (this.dragMoved) return;
        const t = e.target.closest && e.target.closest('[data-id]');
        this.onClick && this.onClick(t ? t.getAttribute('data-id') : null);
        if (this.onSheetClick) {
          const r = this.svg.getBoundingClientRect();
          this.onSheetClick([(e.clientX - r.left - this.tx) / this.k, (e.clientY - r.top - this.ty) / this.k], e);
        }
      });
      new ResizeObserver(() => {
        if (this.autoFit && this.box) this.fit(this.box);
        else this.render(false);
      }).observe(el);
    }
    S(p) {
      return [p[0] * this.k + this.tx, p[1] * this.k + this.ty];
    }
    fit(box) {
      this.box = box;
      this.autoFit = true;
      const w = this.el.clientWidth || 400,
        h = this.el.clientHeight || 400;
      const bw = box[2] - box[0],
        bh = box[3] - box[1];
      this.k = Math.min((w - 40) / bw, (h - 40) / bh);
      this.tx = w / 2 - ((box[0] + box[2]) / 2) * this.k;
      this.ty = h / 2 - ((box[1] + box[3]) / 2) * this.k;
      this.render(false);
    }
    setPrims(prims, o = {}) {
      this.prims = prims;
      this.animStep = o.animate ? o.step : -1;
      this.isNewFn = o.animate ? o.isNew || ((p) => p.from === o.step) : null;
      this.render(true);
      this.animStep = -1;
      this.isNewFn = null;
    }
    setOverlay(prims) {
      this.ov = prims || [];
      this.render(false);
    }
    setHighlight(set) {
      this.hl = set || new Set();
      this.svg.querySelectorAll('[data-id]').forEach((el) => el.classList.toggle('hl', this.hl.has(el.getAttribute('data-id'))));
    }
    setSrc(set) {
      this.src = set || new Set();
      this.render(false);
    }
    /* chwilowy znacznik (np. pudło w trybie „Rozwiąż sam”) */
    setFlash(P) {
      this.flash = { p: P, t: performance.now() };
      this.render(false);
      clearTimeout(this._ft);
      this._ft = setTimeout(() => {
        this.flash = null;
        this.render(false);
      }, 1400);
    }
    /* ---------- renderowanie ---------- */
    render(fresh) {
      this.svg.style.setProperty('--k', this.k.toFixed(4));
      const out = [];
      const labels = [];
      const placed = [];
      const draw = (p, isOv) => {
        const cls = ['s-' + (p.s || 'given')];
        if (this.hl.has(p.id)) cls.push('hl');
        if (this.src.has(p.id)) cls.push('src');
        const isNew = fresh && !!this.isNewFn && this.isNewFn(p);
        const idA = p.id ? ' data-id="' + p.id + '"' : '';
        const style = (p.col ? 'stroke:' + p.col + ';' : '') + (p.w ? 'stroke-width:' + p.w + 'px;' : '');
        if (p.t === 'seg') {
          if (p.dash) cls.push('dash');
          const a = this.S(p.a),
            b = this.S(p.b);
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          let st = style;
          if (isNew) {
            cls.push(p.s === 'hid' || p.s === 'odn' || p.s === 'hidv' || p.dash ? 'newfade' : 'newdraw');
            if (cls.indexOf('newdraw') >= 0) st += 'stroke-dasharray:' + L.toFixed(1) + ';stroke-dashoffset:' + L.toFixed(1) + ';--L:' + L.toFixed(1) + ';';
          }
          out.push('<line class="' + cls.join(' ') + '"' + idA + ' x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" style="' + st + '"/>');
          if (p.id && !p.noPick) out.push('<line class="hit"' + idA + ' x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '"/>');
          if (p.label) {
            const at = p.labelEnd ? V.add(b, V.mul(V.norm(V.sub(b, a)), -14)) : V.lerp(a, b, p.labelAt ?? 0.5);
            const off = p.labelEnd ? [0, -6] : [5, -5];
            labels.push({ p: at, txt: p.label, id: p.id, cls: 'lab ' + (p.labCls || ''), fixed: p.labelEnd ? off : null, line: [a, b] });
          }
        } else if (p.t === 'pl' || p.t === 'poly') {
          const pts = p.pts.map((q) => this.S(q));
          const d = pts.map((q, i) => (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('') + (p.closed || p.t === 'poly' ? 'Z' : '');
          let st = style;
          if (p.t === 'poly') {
            st += 'fill:' + (p.fill || '#e8c060') + ';fill-opacity:' + (p.op ?? 0.2) + ';' + (p.stroke ? 'stroke:' + p.stroke + ';' : 'stroke:none;');
            cls.push('fillpoly');
            if (isNew) cls.push('newfade');
          } else if (isNew) {
            let L = 0;
            for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
            if (p.closed) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
            if (p.s === 'hid' || p.s === 'odn') cls.push('newfade');
            else {
              cls.push('newdraw');
              st += 'stroke-dasharray:' + L.toFixed(1) + ';stroke-dashoffset:' + L.toFixed(1) + ';--L:' + L.toFixed(1) + ';';
            }
          }
          out.push('<path class="' + cls.join(' ') + '"' + idA + ' d="' + d + '" style="' + st + '"/>');
          if (p.id && p.t === 'pl' && !p.noPick) out.push('<path class="hit"' + idA + ' d="' + d + '"/>');
          if (p.label) {
            const q = p.labelP ? this.S(p.labelP) : pts[Math.floor(pts.length * (p.labelAt ?? 0.5))];
            labels.push({ p: q, txt: p.label, id: p.id, cls: 'lab ' + (p.labCls || '') });
          }
        } else if (p.t === 'circle' || p.t === 'arc') {
          const c = this.S(p.c),
            r = p.r * this.k;
          let d;
          if (p.t === 'circle') d = 'M' + (c[0] + r).toFixed(1) + ' ' + c[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 1 1 ' + (c[0] - r).toFixed(1) + ' ' + c[1].toFixed(1) + 'A' + r + ' ' + r + ' 0 1 1 ' + (c[0] + r).toFixed(1) + ' ' + c[1].toFixed(1);
          else {
            let a0 = p.a0,
              a1 = p.a1;
            const P0 = [c[0] + r * Math.cos(a0), c[1] + r * Math.sin(a0)],
              P1 = [c[0] + r * Math.cos(a1), c[1] + r * Math.sin(a1)];
            const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0,
              sweep = a1 > a0 ? 1 : 0;
            d = 'M' + P0[0].toFixed(1) + ' ' + P0[1].toFixed(1) + 'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 ' + large + ' ' + sweep + ' ' + P1[0].toFixed(1) + ' ' + P1[1].toFixed(1);
          }
          let st = style + (p.fill ? 'fill:' + p.fill + ';fill-opacity:' + (p.op ?? 0.15) + ';' : '');
          if (isNew) {
            const L = p.t === 'circle' ? 2 * Math.PI * r : Math.abs(p.a1 - p.a0) * r;
            if (p.s === 'hid') cls.push('newfade');
            else {
              cls.push('newdraw');
              st += 'stroke-dasharray:' + L.toFixed(1) + ';stroke-dashoffset:' + L.toFixed(1) + ';--L:' + L.toFixed(1) + ';';
            }
          }
          out.push('<path class="' + cls.join(' ') + (p.fill ? ' filled' : '') + '"' + idA + ' d="' + d + '" style="' + st + '"/>');
          if (p.id && !p.noPick) out.push('<path class="hit"' + idA + ' d="' + d + '"/>');
          if (p.label) {
            const a = p.labelA ?? -0.8;
            labels.push({ p: [c[0] + r * Math.cos(a), c[1] + r * Math.sin(a)], txt: p.label, id: p.id, cls: 'lab ' + (p.labCls || '') });
          }
        } else if (p.t === 'pt') {
          const q = this.S(p.p);
          if (isNew) cls.push('newpop');
          const r = p.r || (p.s === 'given' || p.s === 'res' ? 3.2 : 2.6);
          if (p.cross) out.push('<path class="' + cls.join(' ') + ' cross"' + idA + ' d="M' + (q[0] - 4) + ' ' + (q[1] - 4) + 'L' + (q[0] + 4) + ' ' + (q[1] + 4) + 'M' + (q[0] - 4) + ' ' + (q[1] + 4) + 'L' + (q[0] + 4) + ' ' + (q[1] - 4) + '"/>');
          else out.push('<circle class="' + cls.join(' ') + ' pt"' + idA + ' cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="' + r + '" style="' + (p.col ? 'fill:' + p.col + ';' : '') + '"/>');
          out.push('<circle class="hit"' + idA + ' cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="7"/>');
          placed.push([q[0] - 3.5, q[1] - 3.5, q[0] + 3.5, q[1] + 3.5]);
          if (p.label) labels.push({ p: q, txt: p.label, id: p.id, cls: 'lab ' + (p.labCls || '') + (p.s === 'res' ? ' res' : ''), pt: true, lo: p.lo });
        } else if (p.t === 'text') {
          const q = this.S(p.p);
          const fsz = p.mm ? 'font-size:' + Math.max(6, p.mm * this.k).toFixed(1) + 'px;' + (p.bold ? 'font-weight:700;' : '') : '';
          const rot = p.rot ? ' transform="rotate(' + p.rot + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')"' : '';
          out.push('<text class="' + cls.join(' ') + ' txt"' + idA + rot + ' style="' + fsz + '" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '" text-anchor="' + (p.anchor || 'middle') + '" dominant-baseline="' + (p.base || 'middle') + '">' + GW.labSVG(p.txt) + '</text>');
        } else if (p.t === 'dim') {
          // wymiar wg PN-EN ISO 129: linie pomocnicze, linia wymiarowa z grotami, liczba nad linią
          const A = p.a,
            Bq = p.b;
          const L = V.dist(A, Bq);
          if (L < 1e-6) return;
          const u = V.mul(V.sub(Bq, A), 1 / L);
          const n = V.perp2(u);
          const off = p.off || 0;
          const sg = off >= 0 ? 1 : -1;
          const a1 = V.add(A, V.mul(n, off)),
            b1 = V.add(Bq, V.mul(n, off));
          const segs = [];
          if (Math.abs(off) > 1.2) {
            segs.push([V.add(A, V.mul(n, sg * 1)), V.add(A, V.mul(n, off + sg * 2))]);
            segs.push([V.add(Bq, V.mul(n, sg * 1)), V.add(Bq, V.mul(n, off + sg * 2))]);
          }
          const al = 2.5,
            aw = 0.55;
          const outside = L < 2.4 * al;
          segs.push(outside ? [V.add(a1, V.mul(u, -al * 2.2)), V.add(b1, V.mul(u, al * 2.2))] : [a1, b1]);
          const arrow = (tip, dir) => {
            const base = V.add(tip, V.mul(dir, al));
            const P1 = this.S(V.add(base, V.mul(n, aw))),
              P2 = this.S(V.sub(base, V.mul(n, aw))),
              T0 = this.S(tip);
            return 'M' + T0[0].toFixed(1) + ' ' + T0[1].toFixed(1) + 'L' + P1[0].toFixed(1) + ' ' + P1[1].toFixed(1) + 'L' + P2[0].toFixed(1) + ' ' + P2[1].toFixed(1) + 'Z';
          };
          const d = segs.map((s) => {
            const a = this.S(s[0]),
              b = this.S(s[1]);
            return 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
          }).join('');
          out.push('<path class="s-dim' + (this.hl.has(p.id) ? ' hl' : '') + '"' + idA + ' d="' + d + '"/>');
          out.push('<path class="dimarr"' + idA + ' d="' + arrow(a1, outside ? V.mul(u, -1) : u) + arrow(b1, outside ? u : V.mul(u, -1)) + '"/>');
          if (p.id && !p.noPick) out.push('<path class="hit"' + idA + ' d="' + d + '"/>');
          const txt = p.txt != null ? String(p.txt) : GW.fmtLen(L);
          const fs = Math.max(9, (p.mm || 3.5) * this.k);
          const mid = V.add(V.mid(a1, b1), V.mul(n, sg * (0.9 + (p.mm || 3.5) * 0.5)));
          const q = this.S(mid);
          let ang = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
          if (ang > 90.01) ang -= 180;
          if (ang < -89.99) ang += 180;
          out.push('<text class="dimtxt' + (this.hl.has(p.id) ? ' hl' : '') + '"' + idA + ' style="font-size:' + fs.toFixed(1) + 'px" text-anchor="middle" dominant-baseline="middle" transform="rotate(' + ang.toFixed(2) + ' ' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ')" x="' + q[0].toFixed(1) + '" y="' + q[1].toFixed(1) + '">' + GW.labSVG(txt) + '</text>');
        } else if (p.t === 'tick') {
          // znacznik "przeniesienia cyrklem": łuk przy końcu odcinka
          const a = this.S(p.a),
            b = this.S(p.b);
          const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
          if (L < 2) return;
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const r = L,
            da = Math.min(0.35, 9 / L);
          const P0 = [a[0] + r * Math.cos(ang - da), a[1] + r * Math.sin(ang - da)],
            P1 = [a[0] + r * Math.cos(ang + da), a[1] + r * Math.sin(ang + da)];
          out.push('<path class="' + cls.join(' ') + ' tick"' + idA + ' d="M' + P0[0].toFixed(1) + ' ' + P0[1].toFixed(1) + 'A' + r.toFixed(1) + ' ' + r.toFixed(1) + ' 0 0 1 ' + P1[0].toFixed(1) + ' ' + P1[1].toFixed(1) + '"/>');
        } else if (p.t === 'hatch') {
          const segs = G.hatch2(
            p.pts.map((q) => this.S(q)),
            p.ang ?? Math.PI / 4,
            p.step || 6
          );
          const d = segs.map((s) => 'M' + s[0][0].toFixed(1) + ' ' + s[0][1].toFixed(1) + 'L' + s[1][0].toFixed(1) + ' ' + s[1][1].toFixed(1)).join('');
          out.push('<path class="' + cls.join(' ') + ' hatch' + (isNew ? ' newfade' : '') + '"' + idA + ' d="' + d + '"/>');
        } else if (p.t === 'arrow') {
          const a = this.S(p.a),
            b = this.S(p.b);
          const d = V.norm(V.sub(b, a)),
            n = V.perp2(d);
          const h1 = V.add(V.sub(b, V.mul(d, 9)), V.mul(n, 4)),
            h2 = V.sub(V.sub(b, V.mul(d, 9)), V.mul(n, 4));
          out.push('<path class="' + cls.join(' ') + ' arrow' + (isNew ? ' newfade' : '') + '"' + idA + ' d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'M' + h1[0].toFixed(1) + ' ' + h1[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + 'L' + h2[0].toFixed(1) + ' ' + h2[1].toFixed(1) + '"/>');
        }
      };
      // kolejność: wypełnienia, linie cienkie, linie grube, punkty
      const order = (p) => (p.t === 'poly' || p.t === 'hatch' ? 0 : p.t === 'pt' ? 3 : p.t === 'text' ? 2.8 : p.s === 'thin' || p.s === 'odn' || p.s === 'axis' || p.s === 'cont' ? 1 : p.s === 'hid' || p.s === 'hidv' || p.s === 'resd' ? 1.5 : 2);
      const all = this.prims.map((p) => [p, false]).concat(this.ov.map((p) => [p, true]));
      all.sort((a, b) => order(a[0]) - order(b[0]) + (a[0].z || 0) - (b[0].z || 0));
      all.forEach(([p, ov]) => draw(p, ov));
      if (this.flash) {
        const q = this.S(this.flash.p);
        out.push('<path class="flash" d="M' + (q[0] - 7) + ' ' + (q[1] - 7) + 'L' + (q[0] + 7) + ' ' + (q[1] + 7) + 'M' + (q[0] - 7) + ' ' + (q[1] + 7) + 'L' + (q[0] + 7) + ' ' + (q[1] - 7) + '"/>');
      }
      if (this.noLabels) labels.length = 0;
      // etykiety – zachłanne unikanie kolizji
      const W = this.el.clientWidth,
        H = this.el.clientHeight;
      const cand = [
        [7, -7],
        [7, 13],
        [-9, -7],
        [-9, 13],
        [0, -12],
        [0, 18],
        [12, 3],
        [-14, 3],
        [16, -14],
        [-16, -14],
        [16, 20],
        [-16, 20],
      ];
      const lsc = this.eng ? Math.max(9, 3.5 * this.k) / 13 : this.ls || 1;
      labels.forEach((L) => {
        const w = GW.labLen(L.txt) * 7.2 * lsc + 4,
          h = 13 * lsc;
        let best = null;
        const list = L.lo ? [L.lo].concat(cand) : L.fixed ? [L.fixed] : cand;
        for (const c of list) {
          const anchorRight = c[0] < 0;
          const x = anchorRight ? L.p[0] + c[0] - w : L.p[0] + c[0];
          const y = L.p[1] + c[1] - h + 3;
          const box = [x, y, x + w, y + h];
          const hit = placed.some((b) => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3]));
          if (!hit || L.fixed) {
            best = { x, y: L.p[1] + c[1], box };
            break;
          }
        }
        if (!best) {
          const c = list[0];
          best = { x: L.p[0] + c[0], y: L.p[1] + c[1], box: [0, 0, 0, 0] };
        }
        placed.push(best.box);
        const hl = this.hl.has(L.id) ? ' hl' : '';
        out.push('<text class="' + L.cls + hl + '" data-id="' + (L.id || '') + '" x="' + best.x.toFixed(1) + '" y="' + best.y.toFixed(1) + '">' + GW.labSVG(L.txt) + '</text>');
      });
      // dodaj punkty jako przeszkody dla etykiet – uproszczenie: pomijamy
      this.svg.innerHTML = out.join('');
    }
    /* do overlayów: pozycja ekranowa */
    toScreen(p) {
      return this.S(p);
    }
  }
  GW.View2D = View2D;
})();
