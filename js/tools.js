/* ===================================================================
   GW – narzędzia interfejsu: wbudowana miarka (współrzędne, długości),
   podkroki z instrukcją rysowania, wymiarowanie, arkusz techniczny
   (ramka + tabliczka), motywy/ustawienia, generator zadań.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V,
    G = GW.G;
  const f1 = (v) => (Math.round(v * 10) / 10).toFixed(1).replace('.', ',');
  const fl = (v) => GW.fmtLen(v);
  const baseOf = (id) =>
    String(id || '')
      .replace(/^(ray:|odn:|dist:)/, '')
      .replace(/(\|p?\d+)+$/, '');
  GW.baseOf = baseOf;
  const plLen = (pts, closed) => {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += V.dist(pts[i - 1], pts[i]);
    if (closed && pts.length > 2) L += V.dist(pts[pts.length - 1], pts[0]);
    return L;
  };
  const area3 = (pts) => {
    let c = [0, 0, 0];
    for (let i = 0; i < pts.length; i++) c = V.add(c, V.cross(pts[i], pts[(i + 1) % pts.length]));
    return V.len(c) / 2;
  };
  const isMonge = (sys) => sys && sys.P.p1 && sys.P.p2 && !sys.P.p2.parent;

  /* ---------- współrzędne kursora ---------- */
  GW.coords2 = (App, P) => {
    const L = App.lesson,
      B = App.B;
    if (!B || !P) return '';
    if (L.coords2) {
      const t = L.coords2(App.ctx(), P);
      if (t) return t;
    }
    const sys = B.sys;
    if (isMonge(sys)) {
      const p3 = sys.P.p3;
      if (p3 && P[0] >= p3.s0[0]) return 'π₃:  y = ' + f1(P[0] - p3.s0[0]) + '   z = ' + f1(-P[1]);
      if (P[1] <= 0) return 'π₂:  x = ' + f1(P[0]) + '   z = ' + f1(-P[1]);
      return 'π₁:  x = ' + f1(P[0]) + '   y = ' + f1(P[1]);
    }
    const F = B.data && B.data.F;
    if (L.mod === 5 && typeof F === 'function') {
      const hh = F(P[0], P[1]);
      return 'x = ' + f1(P[0]) + '   y = ' + f1(P[1]) + (isFinite(hh) ? '   cecha = ' + G.f2(hh) : '');
    }
    return 'x = ' + f1(P[0]) + '   y = ' + f1(P[1]) + '  (arkusz)';
  };
  GW.coords3 = (App, P) => {
    if (!P) return '';
    if (App.lesson.mod === 5) return 'x = ' + f1(P[0]) + '   y = ' + f1(P[1]) + '   cecha z = ' + G.f2(P[2]);
    return 'x = ' + f1(P[0]) + '   y = ' + f1(P[1]) + '   z = ' + f1(P[2]);
  };

  /* ---------- wbudowana miarka: informacje geometryczne o elemencie ---------- */
  GW.geoInfo = (App, id, from3d) => {
    const B = App.B;
    if (!B || !id) return '';
    const u = App.lesson.unit || (B.data && B.data.unit) || 'mm';
    const out = [];
    const base = baseOf(id);
    const kM = /\|(\d+)$/.exec(id);
    const P3 = B.p3.find((p) => p.t === 'pt' && !p.pl && (p.id === id || p.id === base));
    if (P3 && P3.p) {
      out.push('<b>' + GW.labHTML(P3.label || base) + '</b> = (' + P3.p.map(f1).join('; ') + ') ' + u);
      if (kM && isMonge(B.sys)) {
        const k = +kM[1];
        const pl = B.sys.list.find((q) => q.k === k);
        if (pl) {
          let d, ax, what;
          if (pl.parent) {
            const par = B.sys.get(pl.parent);
            d = Math.abs(B.sys.dist(par.id, P3.p));
            ax = B.sys.axisName(pl.id);
            what = 'odległość punktu od π<sub>' + par.k + '</sub>';
          } else {
            d = Math.abs(B.sys.dist('p1', P3.p));
            ax = 'x_{12}';
            what = 'z – odległość punktu od π<sub>1</sub>';
          }
          out.push('rzut ' + GW.labHTML(GW.lab(P3.label || base, k)) + ': od osi ' + GW.labHTML(ax) + ' = <b>' + fl(d) + '</b> ' + u + ' (' + what + ')');
        }
      }
    }
    const prims2 = (App.v2.prims || []).concat(App.v2.ov || []).filter((p) => p.id === id);
    let L2 = 0,
      n2 = 0;
    prims2.forEach((p) => {
      if (p.t === 'seg') {
        L2 += V.dist(p.a, p.b);
        n2++;
      } else if (p.t === 'pl') {
        L2 += plLen(p.pts, p.closed);
        n2++;
      } else if (p.t === 'circle') out.push('okrąg: r = <b>' + fl(p.r) + '</b>, d = ' + fl(2 * p.r) + ' ' + u);
      else if (p.t === 'arc') out.push('łuk: promień r = <b>' + fl(p.r) + '</b> ' + u);
      else if (p.t === 'poly') out.push('pole na rysunku: ' + fl(Math.abs(G.polyArea2(p.pts))) + ' ' + u + '²');
      else if (p.t === 'dim') out.push('wymiar: <b>' + (p.txt != null ? p.txt : fl(V.dist(p.a, p.b))) + '</b>');
    });
    const s3 = B.p3.find((p) => (p.t === 'seg' || p.t === 'circle3') && !p.pl && (p.id === id || p.id === base));
    if (s3 && s3.t === 'seg') out.push('rzeczywista długość: <b>' + fl(V.dist(s3.a, s3.b)) + '</b> ' + u);
    if (s3 && s3.t === 'circle3') out.push('okrąg w przestrzeni: r = <b>' + fl(s3.r) + '</b> ' + u);
    if (n2 && !(from3d && s3)) out.push('długość na rysunku: ' + fl(L2) + ' ' + u + (n2 > 1 ? ' (suma ' + n2 + ' odcinków)' : ''));
    if (from3d) {
      const pl3 = B.p3.find((p) => p.t === 'poly' && p.id === id && !p.isPlane && p.pts && p.pts.length >= 3);
      if (pl3) out.push('pole wielokąta: ' + fl(area3(pl3.pts)) + ' ' + u + '²');
    }
    return out.join('<br>');
  };

  /* ---------- podkroki ---------- */
  GW.subSteps = (B, k) => {
    if (k === 0) return null; // dane zadania pokazujemy od razu w całości
    const prims = B.p2.concat(B.p3).filter((p) => p.from === k && p.seq != null);
    prims.sort((a, b) => a.seq - b.seq);
    if (prims.length < 4) return null;
    const seen = new Set();
    const starts = [];
    prims.forEach((p, i) => {
      if (p.t !== 'pt' || !p.id || !p.label) return;
      const b = baseOf(p.id);
      if (seen.has(b)) return;
      seen.add(b);
      starts.push(i);
    });
    if (starts.length < 2 || starts.length > 48) return null;
    const chunks = [];
    if (starts[0] > 0) chunks.push(prims.slice(0, starts[0]));
    for (let j = 0; j < starts.length; j++) chunks.push(prims.slice(starts[j], j + 1 < starts.length ? starts[j + 1] : prims.length));
    return chunks.map((c) => ({ maxSeq: c[c.length - 1].seq, prims: c }));
  };
  const KIND = (s) =>
    s === 'res' || s === 'vis' || s === 'given' || s === 'res2'
      ? 'linią <b>ciągłą grubą</b>'
      : s === 'hid' || s === 'resd' || s === 'hidv'
        ? 'linią <b>kreskową cienką</b>'
        : s === 'auxd'
          ? 'linią <b>cienką punktową (kreska-kropka)</b>'
          : 'linią <b>ciągłą cienką</b> (pomocniczą)';
  GW.draftText = (chunk, B, App) => {
    const set2 = new Set(B.p2);
    const P2 = chunk.prims.filter((p) => set2.has(p));
    const u = App.lesson.unit || (B.data && B.data.unit) || 'mm';
    const sys = B.sys;
    const mon = isMonge(sys);
    const lines = [];
    // znane etykietowane punkty (do nazw końców odcinków)
    const named = B.p2.filter((p) => p.t === 'pt' && p.label && p.from <= chunk.prims[0].from);
    const nameAt = (q) => {
      const m = named.find((p) => V.dist(p.p, q) < 0.35);
      return m ? GW.labHTML(m.label) : null;
    };
    // sens geometryczny (opis z bazy)
    const bases = [...new Set(chunk.prims.map((p) => baseOf(p.id)))].filter(Boolean);
    const sem = [];
    bases.forEach((b) => {
      const t = B.infoMap[b];
      if (t && sem.length < 1 && sem.indexOf(t) < 0) sem.push(t);
    });
    if (sem.length) lines.push('<i>' + sem[0] + '</i>');
    // punkty
    const pts = P2.filter((p) => p.t === 'pt' && p.label);
    pts.slice(0, 4).forEach((p) => {
      let where = '';
      const km = /\|(\d+)$/.exec(p.id || '');
      if (mon && km) {
        const k = +km[1];
        if (k === 1) where = 'na linii odnoszącej odmierz od osi x<sub>12</sub> <b>w dół y = ' + fl(p.p[1]) + ' ' + u + '</b>';
        else if (k === 2) where = 'na linii odnoszącej odmierz od osi x<sub>12</sub> <b>w górę z = ' + fl(-p.p[1]) + ' ' + u + '</b>';
        else if (k === 3 && sys.P.p3) where = 'od osi x<sub>23</sub> odmierz <b>w prawo y = ' + fl(p.p[0] - sys.P.p3.s0[0]) + '</b>, na wysokości <b>z = ' + fl(-p.p[1]) + ' ' + u + '</b>';
        else if (k >= 4) where = 'na odnoszącej ⟂ do nowej osi – odległość przeniesiona cyrklem (patrz niżej)';
      }
      lines.push('<span class="tool">✏️</span> Zaznacz punkt <b>' + GW.labHTML(p.label) + '</b>' + (where ? ': ' + where : '') + '.');
    });
    if (pts.length > 4) lines.push('… oraz ' + (pts.length - 4) + ' kolejne punkty tą samą metodą.');
    if (P2.some((p) => p.s === 'odn')) lines.push('<span class="tool">📏</span> Ekierką poprowadź cienką <b>linię odnoszącą</b> prostopadłą do osi rzutów.');
    const dists = P2.filter((p) => p.s === 'dist' && p.t === 'seg');
    const seenD = new Set();
    dists.forEach((p) => {
      const key = p.id;
      if (seenD.has(key)) return;
      seenD.add(key);
      const info = (B.infoMap[p.id] || '').split('<br>')[0];
      lines.push('<span class="tool">📐</span> Cyrkiel: rozstaw ramiona na <b>' + fl(V.dist(p.a, p.b)) + ' ' + u + '</b> i odłóż' + (info ? ' – ' + info.replace(/^Przenoszona odległość [\d,]+ = /, '') : '') + '.');
    });
    P2.filter((p) => p.t === 'circle').forEach((p) => lines.push('<span class="tool">📐</span> Cyrkiel: okrąg o środku ' + (nameAt(p.c) || 'w zaznaczonym punkcie') + ' i promieniu <b>r = ' + fl(p.r) + ' ' + u + '</b> (rozstaw cyrkla odczytaj z rzutu, w którym długość jest prawdziwa).'));
    P2.filter((p) => p.t === 'arc').forEach((p) => lines.push('<span class="tool">📐</span> Cyrkiel: łuk o środku ' + (nameAt(p.c) || 'w zaznaczonym punkcie') + ', promień <b>' + fl(p.r) + ' ' + u + '</b>.'));
    const segs = P2.filter((p) => (p.t === 'seg' || p.t === 'pl') && p.s !== 'odn' && p.s !== 'dist' && p.s !== 'axis');
    segs.slice(0, 3).forEach((p) => {
      const a = p.t === 'seg' ? p.a : p.pts[0],
        b = p.t === 'seg' ? p.b : p.pts[p.pts.length - 1];
      const na = nameAt(a),
        nb = nameAt(b);
      const L = p.t === 'seg' ? V.dist(a, b) : plLen(p.pts, p.closed);
      const what = p.t === 'pl' && p.pts.length > 6 ? 'Krzywikiem poprowadź linię przez wyznaczone punkty' : na && nb ? 'Linijką połącz ' + na + ' z ' + nb : 'Linijką poprowadź odcinek' + (p.label ? ' ' + GW.labHTML(p.label) : '');
      lines.push('<span class="tool">📏</span> ' + what + ' ' + KIND(p.s || 'given') + ' (długość na rysunku ' + fl(L) + ' ' + u + ').');
    });
    if (segs.length > 3) lines.push('… oraz ' + (segs.length - 3) + ' kolejne odcinki tak samo.');
    if (P2.some((p) => p.t === 'hatch')) lines.push('<span class="tool">✏️</span> Zakreskuj przekrój cienkimi liniami pod kątem 45° (odstęp 2–3 mm).');
    if (!P2.length) {
      const t = chunk.prims.map((p) => B.infoMap[p.id]).find(Boolean);
      lines.push('W przestrzeni (3D): ' + (t || 'element pomocniczy konstrukcji') + '.');
    }
    return '<ol>' + lines.map((l) => '<li>' + l + '</li>').join('') + '</ol>';
  };

  /* wymiar po stronie odległej od środka figury */
  GW.dimOut = (a, b, center, gap, txt, id) => {
    const u = V.norm(V.sub(b, a)),
      n = V.perp2(u);
    const s = V.dot(n, V.sub(V.mid(a, b), center)) >= 0 ? 1 : -1;
    return { t: 'dim', id: id || 'dim', a, b, off: s * gap, txt };
  };
  /* łańcuch wymiarów wzdłuż osi (wartości posortowane) */
  GW.dimChain = (vals, mk, off, idp) => {
    const v = [...new Set(vals.map((x) => Math.round(x * 100) / 100))].sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i + 1 < v.length; i++) if (v[i + 1] - v[i] > 0.5) out.push(Object.assign({ t: 'dim', id: (idp || 'dimc') + i, off }, mk(v[i], v[i + 1])));
    return out;
  };
  /* ---------- wymiarowanie automatyczne ---------- */
  GW.autoDims = (App) => {
    const L = App.lesson,
      B = App.B;
    if (!B) return [];
    if (L.dims) return (L.dims(App.ctx()) || []).map((d) => Object.assign({ t: 'dim', id: 'dim' }, d));
    const sys = B.sys;
    if (!isMonge(sys)) return [];
    const dims = [];
    const named = B.p3.filter((p) => p.t === 'pt' && !p.pl && p.s === 'given' && p.label && p.from <= App.k);
    const ax3 = sys.P.p3 ? sys.P.p3.s0[0] : Infinity;
    const hasSolid = B.p3.some((p) => p.t === 'mesh' && !p.noPick) || B.p3.filter((p) => p.t === 'poly' && !p.edge && !p.isPlane && !p.pl).length > 3;
    if (named.length && named.length <= 8 && !hasSolid) {
      named.forEach((p, i) => {
        const P = p.p;
        if (!B.p2.some((q) => q.id === p.id + '|2' && q.from <= App.k)) return;
        const x = P[0];
        dims.push({ t: 'dim', id: 'dimz' + i, a: [x, 0], b: [x, -P[2]], off: 3.5, txt: fl(P[2]) });
        dims.push({ t: 'dim', id: 'dimy' + i, a: [x, 0], b: [x, P[1]], off: -3.5, txt: fl(P[1]) });
        if (sys.P.p3) dims.push({ t: 'dim', id: 'dimy3' + i, a: [ax3, -P[2]], b: [ax3 + P[1], -P[2]], off: -2.5, txt: fl(P[1]) });
      });
      // współrzędne x od wspólnego początku (najmniejszego x)
      const xs = [...new Set(named.map((p) => Math.round(p.p[0] * 10) / 10))].sort((a, b) => a - b);
      const x0 = Math.min(0, xs[0]);
      xs.forEach((x, i) => {
        if (Math.abs(x - x0) < 0.5) return;
        dims.push({ t: 'dim', id: 'dimx' + i, a: [x0, 0], b: [x, 0], off: -(6 + 5 * i) - Math.max(...named.map((p) => p.p[2])), txt: fl(x - x0) });
      });
      return dims;
    }
    const regions = { p2: [], p1: [], p3: [] };
    const edgeSt = new Set(['given', 'vis', 'hid']);
    (App.v2.prims || []).forEach((p) => {
      if (!(p.t === 'seg' || p.t === 'pl') || !edgeSt.has(p.s || 'given')) return;
      (p.t === 'seg' ? [p.a, p.b] : p.pts).forEach((q) => regions[q[0] >= ax3 - 1e-6 ? 'p3' : q[1] <= 1e-6 ? 'p2' : 'p1'].push(q));
    });
    const bb = (a) => (a.length ? G.bbox2(a) : null);
    const b2 = bb(regions.p2),
      b1 = bb(regions.p1),
      b3 = bb(regions.p3);
    const g = 9;
    if (b2) {
      dims.push({ t: 'dim', id: 'dimW2', a: [b2[0], b2[1]], b: [b2[2], b2[1]], off: -g });
      dims.push({ t: 'dim', id: 'dimH2', a: [b2[0], b2[3]], b: [b2[0], b2[1]], off: -g });
    }
    if (b1) {
      dims.push({ t: 'dim', id: 'dimD1', a: [b1[0], b1[1]], b: [b1[0], b1[3]], off: g });
      if (!b2 || Math.abs(b1[2] - b1[0] - (b2[2] - b2[0])) > 0.5) dims.push({ t: 'dim', id: 'dimW1', a: [b1[0], b1[3]], b: [b1[2], b1[3]], off: g });
    }
    if (b3) {
      dims.push({ t: 'dim', id: 'dimD3', a: [b3[0], b3[1]], b: [b3[2], b3[1]], off: -g });
      dims.push({ t: 'dim', id: 'dimH3', a: [b3[2], b3[3]], b: [b3[2], b3[1]], off: g });
    }
    return dims;
  };

  /* ---------- arkusz techniczny: ramka (ISO 5457) i tabliczka (ISO 7200) ---------- */
  GW.engSheet = (App, box) => {
    const w = box[2] - box[0],
      hh = box[3] - box[1];
    const FM = [
      ['A4', 210, 297],
      ['A4', 297, 210],
      ['A3', 420, 297],
      ['A2', 594, 420],
      ['A1', 841, 594],
      ['A0', 1189, 841],
    ];
    const TBh = 36,
      TBw = 180;
    let F = FM[FM.length - 1];
    for (const f of FM)
      if (f[1] - 30 >= w + 10 && f[2] - 20 - TBh >= hh + 6) {
        F = f;
        break;
      }
    const [fname, W, H] = F;
    const cx = (20 + W - 10) / 2,
      cy = (10 + H - 10 - TBh) / 2;
    const ox = (box[0] + box[2]) / 2 - cx,
      oy = (box[1] + box[3]) / 2 - cy;
    const T = (x, y) => [x + ox, y + oy];
    const R = (x0, y0, x1, y1, s, id) => ({ t: 'pl', id: id || 'frame', pts: [T(x0, y0), T(x1, y0), T(x1, y1), T(x0, y1)], closed: true, s, noPick: true });
    const Ln = (x0, y0, x1, y1, s) => ({ t: 'seg', id: 'frame', a: T(x0, y0), b: T(x1, y1), s: s || 'frame2', noPick: true });
    const Tx = (x, y, txt, mm, o = {}) => Object.assign({ t: 'text', id: 'frame', p: T(x, y), txt, mm, anchor: 'start', s: 'note', noPick: true }, o);
    const x1 = W - 10,
      y1 = H - 10;
    const tx = x1 - TBw,
      ty = y1 - TBh;
    const L = App.lesson;
    const so = (L.opts || []).find((o) => o.k === 'set');
    const setName = so ? ((so.choices.find((c) => String(c[0]) === String(App.P.set)) || [])[1] || '').replace(/^📋\s*/, '').replace(/^🎲\s*/, '') : '';
    const title = (setName || L.title.replace(/^\d+\.\d+\s*/, '')).slice(0, 70);
    const d = new Date();
    const date = String(d.getDate()).padStart(2, '0') + '.' + String(d.getMonth() + 1).padStart(2, '0') + '.' + d.getFullYear();
    const prims = [
      R(0, 0, W, H, 'frame2', 'frameOuter'),
      R(20, 10, x1, y1, 'frame'),
      R(tx, ty, x1, y1, 'frame'),
      Ln(tx, ty + 14, x1, ty + 14),
      Ln(tx, ty + 21.3, x1, ty + 21.3),
      Ln(tx, ty + 28.6, x1, ty + 28.6),
      Ln(tx + 75, ty + 14, tx + 75, y1),
      Ln(tx + 125, ty + 14, tx + 125, y1),
      Tx(tx + 2, ty + 3.6, 'Nazwa rysunku', 2),
      Tx(tx + 2, ty + 9.5, title, title.length > 48 ? 3.5 : 5),
      Tx(tx + 2, ty + 17.7, 'Geometria wykreślna', 2.5),
      Tx(tx + 77, ty + 17.7, 'Skala 1:1', 2.5),
      Tx(tx + 127, ty + 17.7, 'Format ' + fname, 2.5),
      Tx(tx + 2, ty + 25, 'Rysował(a): ………………', 2.5),
      Tx(tx + 77, ty + 25, 'Data: ' + date, 2.5),
      Tx(tx + 127, ty + 25, 'Nr: GW-' + L.id.replace(/^m/, '') + '-' + (App.k + 1), 2.5),
      Tx(tx + 2, ty + 32.3, 'Sprawdził(a): ………………', 2.5),
      Tx(tx + 77, ty + 32.3, 'Rzutowanie: metoda E', 2.5),
      Tx(tx + 127, ty + 32.3, 'Arkusz 1/1', 2.5),
    ];
    // symbol metody E (pierwszego kąta): stożek ścięty – widok z przodu i z lewej
    const sx = tx + 112,
      sy = ty + 30.5;
    prims.push({ t: 'pl', id: 'frame', pts: [T(sx, sy - 2), T(sx + 6, sy - 3), T(sx + 6, sy + 3), T(sx, sy + 2)], closed: true, s: 'frame2', noPick: true });
    prims.push({ t: 'circle', id: 'frame', c: T(sx + 10.5, sy), r: 3, s: 'frame2', noPick: true });
    prims.push({ t: 'circle', id: 'frame', c: T(sx + 10.5, sy), r: 2, s: 'frame2', noPick: true });
    return prims;
  };

  /* ---------- motywy i ustawienia ---------- */
  GW.THEMES = {
    light: { n: 'jasny', ink: '#111111', bg3: '#f7f7f4', res: '#d01818', res2: '#8e24aa', aux: '#2a6fdb', aux2: '#00897b', hl: '#ff00aa', src: '#ff8c00', dist: '#0f9d58', acc: '#1d4f9c' },
    dark: { n: 'ciemny', ink: '#ececec', bg3: '#1b1c1f', res: '#ff5c5c', res2: '#d27cf0', aux: '#6ea8ff', aux2: '#3cc9a8', hl: '#ff4fd0', src: '#ffa040', dist: '#3ddc84', acc: '#6ea8ff' },
    contrast: { n: 'wysoki kontrast', ink: '#000000', bg3: '#ffffff', res: '#c00000', res2: '#6a00a0', aux: '#0000c8', aux2: '#005a40', hl: '#ff00d0', src: '#ff7a00', dist: '#007a33', acc: '#0000c8' },
    sepia: { n: 'sepia', ink: '#2b2118', bg3: '#f3ead6', res: '#b3261e', res2: '#7b3f99', aux: '#2f5f9e', aux2: '#2f7d66', hl: '#d6249f', src: '#e07b00', dist: '#2e7d32', acc: '#7a4a1e' },
  };
  GW.UIDEF = { theme: 'light', res: '', res2: '', aux: '', aux2: '', hl: '', src: '', dist: '', acc: '', fs: 1, lw: 1, ls: 1, bg3: '', sheet: '', cursor: true, geo: true, subs: true };
  GW.applyUI = (App, s) => {
    const r = document.documentElement.style;
    document.body.dataset.theme = s.theme === 'light' ? '' : s.theme;
    r.setProperty('--fs', s.fs);
    r.setProperty('--lw', s.lw);
    r.setProperty('--ls', s.ls);
    const th = GW.THEMES[s.theme] || GW.THEMES.light;
    ['res', 'res2', 'aux', 'aux2', 'hl', 'src', 'dist', 'acc'].forEach((k) => {
      const v = s[k];
      if (v) document.body.style.setProperty('--' + k, v);
      else document.body.style.removeProperty('--' + k);
    });
    if (s.sheet) document.body.style.setProperty('--sheet', s.sheet);
    else document.body.style.removeProperty('--sheet');
    const m = {};
    Object.keys(th).forEach((k) => (m[k] = s[k] || th[k]));
    m.bg3 = s.bg3 || th.bg3;
    App.v3.setTheme(m);
    App.v2.ls = s.ls;
  };
  GW.openSettings = (App, store, onChange) => {
    const box = document.querySelector('#cheat');
    const s = Object.assign({}, GW.UIDEF, store.get('ui', {}));
    const th = GW.THEMES[s.theme] || GW.THEMES.light;
    const col = (k, l) => '<label for="ui_' + k + '">' + l + '</label><span><input type="color" id="ui_' + k + '" data-k="' + k + '" value="' + (s[k] || th[k] || '#888888') + '"> <button type="button" data-reset="' + k + '" title="przywróć kolor motywu">↺</button></span>';
    const rng = (k, l, a, b, st) => '<label for="ui_' + k + '">' + l + '</label><span><input type="range" id="ui_' + k + '" data-k="' + k + '" min="' + a + '" max="' + b + '" step="' + st + '" value="' + s[k] + '"> <output>' + Math.round(s[k] * 100) + '%</output></span>';
    const chk = (k, l) => '<label for="ui_' + k + '">' + l + '</label><span><input type="checkbox" id="ui_' + k + '" data-k="' + k + '"' + (s[k] ? ' checked' : '') + '></span>';
    box.innerHTML =
      '<div class="cheatin small"><div class="cheathead"><b>⚙ Wygląd i ułatwienia</b><button id="cheatX">✕ Zamknij (Esc)</button></div><div class="cheatbody"><div class="setgrid">' +
      '<label for="ui_theme">Motyw</label><span><select id="ui_theme" data-k="theme">' +
      Object.keys(GW.THEMES)
        .map((k) => '<option value="' + k + '"' + (k === s.theme ? ' selected' : '') + '>' + GW.THEMES[k].n + '</option>')
        .join('') +
      '</select></span>' +
      rng('fs', 'Wielkość tekstu', 0.8, 1.5, 0.05) +
      rng('ls', 'Wielkość oznaczeń na rysunkach', 0.8, 1.8, 0.05) +
      rng('lw', 'Grubość linii rysunku 2D', 0.6, 2.2, 0.05) +
      col('res', 'Kolor wyniku') +
      col('res2', 'Kolor wyniku 2 (fiolet)') +
      col('aux', 'Kolor konstrukcji pomocniczej') +
      col('aux2', 'Kolor konstrukcji 2 (zieleń)') +
      col('dist', 'Kolor odległości przenoszonych') +
      col('hl', 'Kolor podświetlenia (najechanie)') +
      col('src', 'Kolor elementów źródłowych kroku') +
      col('acc', 'Kolor akcentu interfejsu') +
      col('bg3', 'Tło widoku 3D') +
      '<label for="ui_sheet">Tło arkusza 2D</label><span><input type="color" id="ui_sheet" data-k="sheet" value="' + (s.sheet || (s.theme === 'dark' ? '#24262b' : '#ffffff')) + '"> <button type="button" data-reset="sheet">↺</button></span>' +
      chk('cursor', 'Współrzędne przy kursorze') +
      chk('geo', 'Wbudowana miarka w podpowiedziach (długości, odległości)') +
      chk('subs', 'Podkroki – nowe punkty pojedynczo z instrukcją rysowania') +
      '</div><div class="spbtns" style="margin-top:10px"><button id="uiReset">Przywróć ustawienia domyślne</button></div><div class="spnote">Ustawienia zapisują się tylko w tej przeglądarce.</div></div></div>';
    box.style.display = 'flex';
    const save = () => {
      store.set('ui', s);
      GW.applyUI(App, s);
      onChange && onChange();
    };
    box.querySelectorAll('[data-k]').forEach((el) => {
      const k = el.dataset.k;
      el.oninput = el.onchange = () => {
        if (el.type === 'checkbox') s[k] = el.checked;
        else if (el.type === 'range') {
          s[k] = +el.value;
          el.nextElementSibling.textContent = Math.round(s[k] * 100) + '%';
        } else s[k] = el.value;
        if (k === 'theme') {
          ['res', 'res2', 'aux', 'aux2', 'hl', 'src', 'dist', 'acc', 'bg3', 'sheet'].forEach((c) => (s[c] = ''));
          save();
          GW.openSettings(App, store, onChange);
          return;
        }
        save();
      };
    });
    box.querySelectorAll('[data-reset]').forEach((b) => {
      b.onclick = () => {
        s[b.dataset.reset] = '';
        save();
        GW.openSettings(App, store, onChange);
      };
    });
    document.querySelector('#uiReset').onclick = () => {
      Object.assign(s, GW.UIDEF);
      save();
      GW.openSettings(App, store, onChange);
    };
    document.querySelector('#cheatX').onclick = () => (box.style.display = 'none');
    document.querySelector('#cheatX').focus();
  };

  /* ---------- generator zadań ---------- */
  GW.rng = (seed) => {
    let s = seed >>> 0 || 1;
    const r = () => {
      s ^= s << 13;
      s >>>= 0;
      s ^= s >> 17;
      s ^= s << 5;
      s >>>= 0;
      return s / 4294967296;
    };
    return {
      r,
      u: (a, b) => a + (b - a) * r(),
      i: (a, b) => Math.floor(a + (b - a + 1) * r()),
      pick: (arr) => arr[Math.floor(r() * arr.length)],
      chance: (p) => r() < p,
      round: (v, st) => Math.round(v / st) * st,
    };
  };
  GW.LEVELS = [
    ['1', 'łatwy'],
    ['2', 'średni'],
    ['3', 'trudny'],
  ];
  /* domyślny generator: losowanie parametrów z zakresem zależnym od poziomu */
  GW.defaultGen = (L) => ({
    make(o, R) {
      const P = {};
      const f = o.level === '1' ? 0.35 : o.level === '2' ? 0.7 : 1;
      (L.params || []).forEach((p) => {
        const lo = p.rmin ?? p.min,
          hi = p.rmax ?? p.max;
        const c = p.v,
          a = Math.max(lo, c - (c - lo) * f),
          b = Math.min(hi, c + (hi - c) * f);
        P[p.k] = +R.round(R.u(a, b), p.step || 1).toFixed(4);
      });
      return P;
    },
  });
})();
