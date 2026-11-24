/* ===================================================================
   GW – tryb „Rozwiąż sam”.
   Każdy krok konstrukcji zamieniany jest na zadania:
     1. pytanie „co robimy teraz?” (kolejność konstrukcji),
     2. wskazanie punktów kroku – w DOWOLNEJ kolejności,
     3. (gdy krok nie ma punktów) wskazanie przebiegu linii – 2 punkty na linii,
     4. widoczność – oznaczenie krawędzi niewidocznych.
   Podpowiedzi stopniowane: „Jak?”, linie pomocnicze, obszar, pokaż punkt.
   Postęp każdego kroku jest pamiętany; na końcu – podsumowanie.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V;

  const strip = (s) =>
    String(s || '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  const normT = (s) => strip(s).toLowerCase().replace(/[-+]?[0-9₀-₉]+([,.][0-9]+)?/g, '#');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const plural = (n, a, b, c) => (n === 1 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? b : c);

  const HIDS = { hid: 1, hidv: 1, resd: 1 };
  const VISS = { vis: 1, res: 1 };
  const AUXS = { odn: 1, thin: 1, aux: 1, aux2: 1, auxd: 1, ray: 1, sec: 1, center: 1, light: 1, lightl: 1, cont: 1, eye: 1, dist: 1 };
  const LINE_RANK = { res: 0, res2: 1, resd: 1, vis: 2, given: 2, sec: 3, contb: 3, aux: 4, aux2: 4, cont: 5 };
  const LINE_T = { seg: 1, pl: 1, circle: 1, arc: 1 };
  const ACC = { easy: 1.6, norm: 1, strict: 0.6 };

  /* ---------- geometria: odległość punktu od prymitywu ---------- */
  function dSeg(P, a, b) {
    const e = V.sub(b, a);
    const L2 = V.dot(e, e);
    const t = L2 < 1e-12 ? 0 : Math.max(0, Math.min(1, V.dot(V.sub(P, a), e) / L2));
    return V.dist(P, V.add(a, V.mul(e, t)));
  }
  function dPrim(P, p) {
    if (p.t === 'seg') return dSeg(P, p.a, p.b);
    if (p.t === 'pl') {
      let d = Infinity;
      for (let i = 0; i + 1 < p.pts.length; i++) d = Math.min(d, dSeg(P, p.pts[i], p.pts[i + 1]));
      if (p.closed && p.pts.length > 2) d = Math.min(d, dSeg(P, p.pts[p.pts.length - 1], p.pts[0]));
      return d;
    }
    if (p.t === 'circle') return Math.abs(V.dist(P, p.c) - p.r);
    if (p.t === 'arc') {
      const a0 = Math.min(p.a0, p.a1),
        a1 = Math.max(p.a0, p.a1);
      let a = Math.atan2(P[1] - p.c[1], P[0] - p.c[0]);
      while (a < a0) a += 2 * Math.PI;
      if (a <= a1) return Math.abs(V.dist(P, p.c) - p.r);
      const E = (t) => [p.c[0] + p.r * Math.cos(t), p.c[1] + p.r * Math.sin(t)];
      return Math.min(V.dist(P, E(a0)), V.dist(P, E(a1)));
    }
    return Infinity;
  }
  function primPts(p) {
    if (p.t === 'seg') return [p.a, p.b];
    if (p.t === 'pl') return p.pts;
    if (p.t === 'circle') return [V.sub(p.c, [p.r, p.r]), V.add(p.c, [p.r, p.r])];
    if (p.t === 'arc') {
      const r = [];
      for (let i = 0; i <= 16; i++) {
        const a = p.a0 + ((p.a1 - p.a0) * i) / 16;
        r.push([p.c[0] + p.r * Math.cos(a), p.c[1] + p.r * Math.sin(a)]);
      }
      return r;
    }
    return [];
  }
  /* punkty wewnętrzne odcinka / łamanej (do porównań pokrycia) */
  function interior(p) {
    const P = p.t === 'seg' ? [p.a, p.b] : p.pts;
    const L = [0];
    for (let i = 1; i < P.length; i++) L.push(L[i - 1] + V.dist(P[i - 1], P[i]));
    const tot = L[L.length - 1];
    const r = [];
    [0.15, 0.35, 0.5, 0.65, 0.85].forEach((f) => {
      const d = f * tot;
      let i = 1;
      while (i < P.length - 1 && L[i] < d) i++;
      const seg = L[i] - L[i - 1] || 1;
      r.push(V.lerp(P[i - 1], P[i], Math.max(0, Math.min(1, (d - L[i - 1]) / seg))));
    });
    return r;
  }
  function extent(prims) {
    const pts = prims.flatMap(primPts);
    if (!pts.length) return 0;
    const xs = pts.map((q) => q[0]),
      ys = pts.map((q) => q[1]);
    return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  }

  GW.makeQuiz = function (App, h) {
    const $ = h.$;
    const cfg = Object.assign({ order: true, lines: true, vis: true, acc: 'norm' }, h.store.get('quizCfg', {}));
    const Q = { on: false, states: [], panel: null, settings: false };

    const B = () => App.B;
    const unit = () => (App.B && App.B.data && App.B.data.unit) || 'mm';
    const f1 = (v) => GW.G.f1(v);
    function tol() {
      const b = App.fitBox || [0, 0, 100, 100];
      return Math.max(1.6, 0.016 * Math.hypot(b[2] - b[0], b[3] - b[1])) * (ACC[cfg.acc] || 1);
    }
    const info = (id) => strip((App.B.infoMap || {})[id]);

    /* ---------- budowa zadań kroku ---------- */
    function mkState(k) {
      const b = B();
      const st = b.steps[k];
      const s = { k, phase: 'done', shown: new Set(), ids3: new Set(), fresh: new Set(), hint: {}, msg: null, aim: null, misses: 0, targets: [], lines: [], visC: [], marks: new Set(), wrong: new Set(), clicks: [], order: null, empty: false };
      if (k === 0) {
        s.empty = true;
        return s;
      }
      const nw = b.p2.filter((p) => p.from === k);
      // punkty
      const pts = nw.filter((p) => p.t === 'pt' && p.p && !p.noPick);
      let tg = pts.filter((p) => p.label);
      if (!tg.length) tg = pts.filter((p) => info(p.id));
      const seen = new Set();
      tg = tg.filter((p) => {
        const key = p.id + '@' + p.p.map((v) => v.toFixed(2)).join(',');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      s.targets = tg.map((p) => ({ p, pos: p.p, label: p.label || null, info: info(p.id), miss: 0, res: null }));
      const cnt = {};
      s.targets.forEach((t) => {
        const key = t.label || t.info;
        cnt[key] = (cnt[key] || 0) + 1;
        t.n = cnt[key];
      });
      s.targets.forEach((t) => (t.dup = cnt[t.label || t.info] > 1));
      // widoczność
      const T0 = tol();
      const all = nw.filter((p) => (p.t === 'seg' || p.t === 'pl') && (HIDS[p.s] || VISS[p.s]));
      // pomijamy krawędzie, których nie da się jednoznacznie kliknąć: bardzo krótkie,
      // niewidoczne przykryte widocznymi i duplikaty
      const visC = [];
      all.forEach((p) => {
        if (extent([p]) < 0.4 * T0) return;
        const sm = interior(p);
        const on = (o) => o !== p && sm.every((q) => dPrim(q, o) < 0.15 * T0);
        if (HIDS[p.s] && all.some((o) => VISS[o.s] && on(o))) return;
        if (visC.some((o) => !!HIDS[o.s] === !!HIDS[p.s] && on(o))) return;
        visC.push(p);
      });
      const hasHid = visC.some((p) => HIDS[p.s]);
      if (cfg.vis && visC.length >= 2 && (hasHid || /widoczn/i.test(strip(st.title)))) {
        s.visC = visC;
        s.visAll = new Set(all);
      }
      // przebieg linii (gdy krok nie ma punktów)
      if (!s.targets.length && cfg.lines) {
        const T = tol();
        const vs = s.visAll || new Set();
        const groups = new Map();
        nw.forEach((p) => {
          if (!LINE_T[p.t] || LINE_RANK[p.s] === undefined || !p.id || vs.has(p)) return;
          if (!groups.has(p.id)) groups.set(p.id, []);
          groups.get(p.id).push(p);
        });
        s.lines = [...groups.entries()]
          .map(([id, prims]) => ({ id, prims, rank: Math.min(...prims.map((p) => LINE_RANK[p.s])), ext: extent(prims), info: info(id) }))
          .filter((g) => g.ext >= 4 * T && g.info)
          .sort((a, c) => a.rank - c.rank || c.ext - a.ext)
          .slice(0, 3)
          .map((g) => Object.assign(g, { clicks: [], miss: 0, res: null }));
      }
      // pomocnicze (podpowiedź)
      const excl = new Set(s.visC.concat(s.lines.flatMap((g) => g.prims)));
      s.aux = new Set(nw.filter((p) => p.t !== 'pt' && p.t !== 'text' && (AUXS[p.s] || p.t === 'tick') && !excl.has(p)));
      // pytanie o kolejność
      if (cfg.order) {
        const titles = b.steps.map((x) => strip(x.title));
        const used = new Set([normT(titles[k])]);
        const cand = [];
        const push = (i) => {
          if (i < 1 || i >= titles.length || i === k || !titles[i]) return;
          const n = normT(titles[i]);
          if (used.has(n)) return;
          used.add(n);
          cand.push(i);
        };
        [k + 1, k + 2].forEach(push);
        shuffle(titles.map((_, i) => i)).forEach((i) => cand.length < 3 && push(i));
        if (cand.length) s.order = { opts: shuffle([k].concat(cand.slice(0, 3))), pick: null, ok: null };
      }
      s.phase = s.order ? 'order' : firstTask(s);
      if (s.phase === 'done') s.empty = true;
      return s;
    }
    function firstTask(s) {
      if (s.targets.length) return 'pts';
      if (s.lines.length) return 'lines';
      if (s.visC.length) return 'vis';
      return 'done';
    }
    function afterPhase(s) {
      if (s.phase === 'order') return firstTask(s);
      if (s.phase === 'pts' || s.phase === 'lines') return s.visC.length ? 'vis' : 'done';
      if (s.phase === 'vis') return 'visres';
      return 'done';
    }
    function advance(s) {
      s.phase = afterPhase(s);
      s.aim = null;
      s.area = null;
      s.clicks = [];
      if (s.phase === 'done') return finish(s);
      redraw();
    }
    function finish(s) {
      s.phase = 'done';
      s.area = null;
      h.show(App.k, { anim: true, cam: false, keepUnfold: true });
    }
    const cur = () => (Q.on && App.B ? Q.states[App.k] : null);
    const redraw = () => h.show(App.k, { anim: true, cam: false, keepUnfold: true, keepQuiz: true });

    /* ---------- API dla app.js ---------- */
    Q.reset = () => {
      Q.states = [];
    };
    Q.enter = (k) => {
      if (!Q.on) return;
      if (!Q.states[k]) Q.states[k] = mkState(k);
    };
    Q.active = () => {
      const s = cur();
      return !!s && s.phase !== 'done';
    };
    Q.isDone = (i) => !Q.on || (Q.states[i] && Q.states[i].phase === 'done');
    /* prymitywy do narysowania w kroku k (null = normalny widok) */
    Q.view = (k, F) => {
      const s = Q.on ? Q.states[k] : null;
      if (!s || s.phase === 'done') return null;
      const b = B();
      const vis = s.phase === 'vis' || s.phase === 'visres';
      const cand = new Set(s.visC);
      const p2 = [],
        p3 = [];
      b.p2.forEach((p) => {
        if (p.from > k) return;
        if (p.from < k) {
          if (p.to !== undefined && p.to < k) return;
          if (p.to === k && vis) return;
          if (F(p)) p2.push(p);
          return;
        }
        if (vis) {
          if (!cand.has(p) && !(s.phase === 'vis' && s.visAll.has(p)) && F(p)) p2.push(p);
          return;
        }
        if ((s.shown.has(p) || (s.hint.aux && s.aux.has(p))) && F(p)) p2.push(p);
      });
      if (s.phase === 'vis') s.visC.forEach((p, i) => p2.push(Object.assign({}, p, { s: s.marks.has(i) ? 'qneuh' : 'qneu', label: undefined, noPick: true, w: undefined, col: undefined })));
      if (s.phase === 'visres')
        s.visC.forEach((p, i) => {
          if (s.wrong.has(i)) p2.push(Object.assign({}, p, { s: 'qwrong', label: undefined, noPick: true, w: undefined, col: undefined, z: -1 }));
          p2.push(p);
        });
      s.clicks.forEach((c) => p2.push({ t: 'pt', id: 'qclick', p: c, s: 'qclick', r: 3.4, noPick: true }));
      if (s.area) p2.push({ t: 'circle', id: 'qarea', c: s.area.c, r: s.area.r, s: 'qarea', noPick: true });
      b.p3.forEach((p) => {
        if (p.from > k) return;
        if (p.from < k) {
          if (p.to !== undefined && p.to < k) return;
          if (p.to === k && vis) return;
          if (F(p)) p3.push(p);
          return;
        }
        if ((vis || s.ids3.has(p.id)) && F(p)) p3.push(p);
      });
      const fresh = s.fresh;
      s.fresh = new Set();
      return { p2, p3, mode: s.phase === 'order' ? 'order' : 'task', jak: !!s.hint.jak, fresh };
    };
    /* kliknięcie w arkusz 2D */
    Q.click = (P) => {
      const s = cur();
      if (!s || s.phase === 'done') return false;
      if (s.phase === 'pts') clickPts(s, P);
      else if (s.phase === 'lines') clickLines(s, P);
      else if (s.phase === 'vis') clickVis(s, P);
      return true;
    };
    /* „Następny” przy nierozwiązanym kroku = pokaż rozwiązanie kroku */
    Q.next = () => {
      const s = cur();
      if (!s || s.phase === 'done') return false;
      revealAll(s);
      return true;
    };
    Q.hint = () => {
      const s = cur();
      if (!s || s.phase === 'done' || s.phase === 'order' || s.phase === 'visres') return;
      if (!s.hint.jak) return useHint(s, 'jak');
      if (!s.hint.aux && s.aux.size) return useHint(s, 'aux');
      if (s.phase === 'pts' && !s.area) return useHint(s, 'area');
    };
    Q.toggle = (on) => {
      Q.on = on === undefined ? !Q.on : on;
      Q.reset();
      Q.settings = false;
      Q.summary = false;
      h.show(App.k, { anim: false, cam: false, keepUnfold: true });
    };
    Q.grade = (i) => grade(Q.states[i]);

    /* ---------- obsługa zadań ---------- */
    function clickPts(s, P) {
      const T = tol();
      const pend = s.targets.filter((t) => !t.res);
      const pool = s.aim != null && !s.targets[s.aim].res ? [s.targets[s.aim]] : pend;
      let best = null,
        bd = Infinity;
      pool.forEach((t) => {
        const d = V.dist(P, t.pos);
        if (d < bd) {
          bd = d;
          best = t;
        }
      });
      if (best && bd <= T) {
        best.res = best.miss ? 'ok' : 'ok1';
        s.shown.add(best.p);
        s.ids3.add(best.p.id);
        s.fresh = new Set([best.p]);
        s.area = null;
        s.msg = { ok: true, txt: '✔ ' + tName(best) + ' – dobrze! (odchyłka ' + f1(bd) + ' ' + unit() + ')' };
        if (s.aim != null) {
          const nx = s.targets.findIndex((t) => !t.res);
          s.aim = nx >= 0 ? nx : null;
        }
        if (s.targets.every((t) => t.res)) {
          s.msg.txt += ' Wszystkie punkty kroku wskazane.';
          return advance(s);
        }
        return redraw();
      }
      const done = s.targets.find((t) => t.res && V.dist(P, t.pos) <= T);
      if (done && s.aim == null) {
        s.msg = { ok: false, txt: tName(done) + ' jest już wskazany – szukaj pozostałych.' };
        return ui();
      }
      s.misses++;
      if (best) {
        best.miss++;
        s.msg = { ok: false, txt: '✘ Pudło – ' + f1(bd) + ' ' + unit() + ' od ' + (s.aim != null ? 'punktu ' + tName(best) : 'najbliższego brakującego punktu') + '.' + (best.miss === 2 ? ' Przeczytaj „Jak?” albo włącz linie pomocnicze.' : '') };
        if (best.miss >= 3 && !s.area) setArea(s, best, true);
      }
      h.v2.setFlash(P);
      ui();
      if (s.area) redraw();
    }
    function clickLines(s, P) {
      const T = tol();
      let best = null,
        bd = Infinity;
      s.lines.forEach((g) => {
        if (g.res) return;
        const d = Math.min(...g.prims.map((p) => dPrim(P, p)));
        if (d < bd) {
          bd = d;
          best = g;
        }
      });
      if (best && bd <= T) {
        const sep = Math.max(2 * T, 0.25 * best.ext);
        if (best.clicks.length && V.dist(best.clicks[0], P) < sep) {
          s.msg = { ok: false, txt: 'Leży na linii, ale za blisko pierwszego punktu – wskaż drugi punkt dalej (≥ ' + f1(sep) + ' ' + unit() + ').' };
          return ui();
        }
        best.clicks.push(P);
        s.clicks.push(P);
        if (best.clicks.length >= 2) {
          best.res = best.miss ? 'ok' : 'ok1';
          best.prims.forEach((p) => s.shown.add(p));
          s.ids3.add(best.id);
          s.fresh = new Set(best.prims);
          s.clicks = [];
          s.msg = { ok: true, txt: '✔ ' + esc(best.info) + ' – dobrze!' };
          if (s.lines.every((g) => g.res)) return advance(s);
        } else s.msg = { ok: true, txt: '✔ Punkt leży na linii „' + esc(best.info) + '”. Wskaż drugi punkt tej linii.' };
        return redraw();
      }
      s.misses++;
      if (best) best.miss++;
      s.msg = { ok: false, txt: '✘ Tu nie przechodzi żadna z szukanych linii' + (best ? ' (najbliższa: ' + f1(bd) + ' ' + unit() + ')' : '') + '.' };
      h.v2.setFlash(P);
      ui();
    }
    function clickVis(s, P) {
      const T = Math.max(tol() * 0.8, 7 / (h.v2.k || 1));
      let bi = -1,
        bd = Infinity;
      s.visC.forEach((p, i) => {
        const d = dPrim(P, p);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      if (bi < 0 || bd > T) {
        s.msg = { ok: false, txt: 'Kliknij bliżej którejś z szarych krawędzi.' };
        return ui();
      }
      if (s.marks.has(bi)) s.marks.delete(bi);
      else s.marks.add(bi);
      s.msg = null;
      redraw();
    }
    function checkVis(s) {
      s.wrong = new Set();
      s.visC.forEach((p, i) => {
        if (!!HIDS[p.s] !== s.marks.has(i)) s.wrong.add(i);
      });
      s.visScore = { ok: s.visC.length - s.wrong.size, n: s.visC.length };
      s.msg = s.wrong.size
        ? { ok: false, txt: '✘ ' + s.wrong.size + ' ' + plural(s.wrong.size, 'krawędź źle oznaczona', 'krawędzie źle oznaczone', 'krawędzi źle oznaczonych') + ' (podświetlone na czerwono). Teraz widać poprawną widoczność.' }
        : { ok: true, txt: '✔ Widoczność bezbłędnie (' + s.visC.length + ' ' + plural(s.visC.length, 'krawędź', 'krawędzie', 'krawędzi') + ').' };
      advance(s);
    }
    function setArea(s, t, auto) {
      const r = 4 * tol();
      const a = Math.random() * 2 * Math.PI,
        o = Math.random() * 0.45 * r;
      s.area = { c: [t.pos[0] + o * Math.cos(a), t.pos[1] + o * Math.sin(a)], r };
      s.hint.area = true;
      if (auto) s.msg = { ok: false, txt: (s.msg ? s.msg.txt + ' ' : '') + 'Zaznaczyłem obszar, w którym leży punkt ' + tName(t) + '.' };
    }
    function useHint(s, kind) {
      s.hint[kind] = true;
      if (kind === 'area') {
        const t = s.aim != null && !s.targets[s.aim].res ? s.targets[s.aim] : s.targets.find((x) => !x.res);
        if (t) setArea(s, t);
      }
      redraw();
    }
    function showOne(s) {
      const t = s.aim != null && !s.targets[s.aim].res ? s.targets[s.aim] : s.targets.find((x) => !x.res);
      if (!t) return;
      t.res = 'shown';
      s.shown.add(t.p);
      s.ids3.add(t.p.id);
      s.fresh = new Set([t.p]);
      s.area = null;
      s.msg = { ok: false, txt: 'Pokazano ' + tName(t) + '.' };
      if (s.aim != null) {
        const nx = s.targets.findIndex((x) => !x.res);
        s.aim = nx >= 0 ? nx : null;
      }
      if (s.targets.every((x) => x.res)) return advance(s);
      redraw();
    }
    function revealAll(s) {
      if (s.order && s.order.pick == null) s.order.ok = false;
      s.targets.forEach((t) => t.res || (t.res = 'shown'));
      s.lines.forEach((g) => g.res || (g.res = 'shown'));
      if (s.visC.length && !s.visScore) s.visScore = { ok: 0, n: s.visC.length, shown: true };
      s.revealed = true;
      s.msg = null;
      finish(s);
    }
    function pickOrder(s, i) {
      if (s.order.pick != null) return;
      s.order.pick = i;
      s.order.ok = i === s.k;
      if (s.order.ok) {
        s.msg = { ok: true, txt: '✔ Tak – teraz: „' + esc(strip(B().steps[s.k].title)) + '”.' };
        advance(s);
      } else {
        s.msg = { ok: false, txt: '✘ Nie – w tym kroku robimy co innego (zielona odpowiedź).' };
        ui();
      }
    }
    const tName = (t) => (t.label ? '<b class="qlab">' + GW.labHTML(t.label) + '</b>' + (t.dup ? '<sub class="qn">#' + t.n + '</sub>' : '') : '„' + esc(t.info) + '”' + (t.dup ? ' #' + t.n : ''));

    /* ---------- ocena ---------- */
    function grade(s) {
      if (!s) return null;
      if (s.phase !== 'done') return 'cur';
      if (s.empty && !s.order) return 'none';
      if (s.revealed) return 'shown';
      const anyShown = s.targets.some((t) => t.res === 'shown') || s.lines.some((g) => g.res === 'shown');
      if (anyShown) return 'shown';
      const perfect = !s.misses && !Object.keys(s.hint).length && (!s.order || s.order.ok) && (!s.visScore || s.visScore.ok === s.visScore.n);
      return perfect ? 'perfect' : 'ok';
    }
    function totals() {
      const r = { p: 0, p1: 0, pS: 0, o: 0, oOk: 0, v: 0, vOk: 0, l: 0, l1: 0, hints: 0, steps: 0, perfect: 0 };
      Q.states.forEach((s) => {
        if (!s) return;
        s.targets.forEach((t) => {
          if (!t.res) return;
          r.p++;
          if (t.res === 'ok1') r.p1++;
          if (t.res === 'shown') r.pS++;
        });
        s.lines.forEach((g) => {
          if (!g.res) return;
          r.l++;
          if (g.res === 'ok1') r.l1++;
        });
        if (s.order && s.order.ok != null) {
          r.o++;
          if (s.order.ok) r.oOk++;
        }
        if (s.visScore) {
          r.v += s.visScore.n;
          r.vOk += s.visScore.ok;
        }
        r.hints += Object.keys(s.hint).length;
        if (s.phase === 'done' && !(s.empty && !s.order)) {
          r.steps++;
          if (grade(s) === 'perfect') r.perfect++;
        }
      });
      return r;
    }
    const pct = (a, b) => (b ? Math.round((100 * a) / b) + '%' : '–');

    /* ---------- panel ---------- */
    function ui() {
      const box = $('#quizBox');
      box.style.display = Q.on ? 'block' : 'none';
      $('#bQuiz').classList.toggle('on', Q.on);
      $('#bQuiz').setAttribute('aria-pressed', String(Q.on));
      if (!Q.on || !App.B) return;
      const s = Q.states[App.k];
      const r = totals();
      const nSteps = App.B.steps.length;
      let html =
        '<div class="qhead"><b>🎯 Rozwiąż sam</b><span class="qbtns">' +
        '<button type="button" data-q="sum" title="Podsumowanie">📊</button>' +
        '<button type="button" data-q="cfg" title="Ustawienia trybu">⚙</button>' +
        '<button type="button" data-q="restart" title="Zacznij od początku">⟲</button>' +
        '<button type="button" data-q="off" title="Wyłącz tryb (R)">✕</button></span></div>' +
        '<div class="qscore">Punkty za 1. razem: <b>' + r.p1 + '/' + r.p + '</b>' + (r.o ? ' · kolejność: <b>' + r.oOk + '/' + r.o + '</b>' : '') + (r.v ? ' · widoczność: <b>' + r.vOk + '/' + r.v + '</b>' : '') + (r.l ? ' · linie: <b>' + r.l1 + '/' + r.l + '</b>' : '') + ' · podpowiedzi: <b>' + r.hints + '</b></div>';
      if (Q.settings) html += cfgHTML();
      else if (Q.summary || (s && s.phase === 'done' && App.k === nSteps - 1 && r.steps)) html += summaryHTML(r);
      else if (!s) html += '';
      else html += phaseHTML(s);
      box.innerHTML = html;
      box.querySelectorAll('[data-q]').forEach((el) => (el.onclick = (e) => act(el.dataset.q, el, e)));
      box.querySelectorAll('[data-cfg]').forEach((el) => (el.onchange = () => setCfg(el)));
    }
    Q.ui = ui;
    function hintsHTML(s) {
      let b = '<div class="qhints">';
      b += '<button type="button" data-q="h-jak"' + (s.hint.jak ? ' disabled' : '') + ' title="Pokaż opis „JAK to wyznaczamy?” (H)">💡 Jak?</button>';
      if (s.aux.size) b += '<button type="button" data-q="h-aux"' + (s.hint.aux ? ' disabled' : '') + ' title="Pokaż linie pomocnicze kroku">📐 Linie pomocnicze</button>';
      if (s.phase === 'pts') b += '<button type="button" data-q="h-area"' + (s.area ? ' disabled' : '') + ' title="Zaznacz obszar, w którym leży punkt">◎ Obszar</button>';
      if (s.phase === 'pts') b += '<button type="button" data-q="show1" title="Pokaż jeden punkt (liczy się jako pominięty)">👁 Pokaż punkt</button>';
      b += '<button type="button" data-q="reveal" title="Pokaż rozwiązanie całego kroku (→)">⏭ Rozwiązanie kroku</button></div>';
      return b;
    }
    const msgHTML = (s) => (s.msg ? '<div class="qmsg ' + (s.msg.ok ? 'ok' : 'bad') + '">' + s.msg.txt + '</div>' : '');
    function phaseHTML(s) {
      const b = B();
      if (s.phase === 'order') {
        let o = '<div class="qtask">❓ <b>Co robimy w tym kroku?</b> <span class="qmuted">(krok ' + (s.k + 1) + ' z ' + b.steps.length + ')</span></div><div class="qopts">';
        s.order.opts.forEach((i) => {
          let cls = '';
          if (s.order.pick != null) cls = i === s.k ? ' good' : i === s.order.pick ? ' badc' : '';
          o += '<button type="button" class="qopt' + cls + '" data-q="opt" data-i="' + i + '"' + (s.order.pick != null ? ' disabled' : '') + '>' + esc(strip(b.steps[i].title)) + '</button>';
        });
        o += '</div>' + msgHTML(s);
        if (s.order.pick != null) o += '<div class="spbtns"><button type="button" class="qgo" data-q="go">Dalej – rozwiąż krok ▶</button></div>';
        else o += '<div class="spbtns"><button type="button" data-q="skipq" class="qsmall">Pomiń pytanie</button></div>';
        return o;
      }
      if (s.phase === 'pts') {
        const left = s.targets.filter((t) => !t.res).length;
        let o = '<div class="qtask">📍 Wskaż na rysunku 2D ' + (s.targets.length === 1 ? 'punkt' : s.targets.length + ' ' + plural(s.targets.length, 'punkt', 'punkty', 'punktów') + ' – <b>w dowolnej kolejności</b>') + ':</div><div class="qchips">';
        s.targets.forEach((t, i) => {
          const st = t.res === 'ok1' ? 'ok1' : t.res === 'ok' ? 'ok' : t.res === 'shown' ? 'sh' : s.aim === i ? 'aim' : '';
          const title = (t.info || '') + (t.res ? '' : ' – kliknij, aby szukać właśnie tego punktu');
          o += '<button type="button" class="qchip ' + st + '" data-q="aim" data-i="' + i + '"' + (t.res ? ' disabled' : '') + ' title="' + esc(title) + '">' + (t.res === 'ok1' || t.res === 'ok' ? '✔ ' : t.res === 'shown' ? '👁 ' : '') + (t.label ? GW.labHTML(t.label) + (t.dup ? '<sub class="qn">#' + t.n + '</sub>' : '') : esc(t.info.length > 46 ? t.info.slice(0, 44) + '…' : t.info) + (t.dup ? ' #' + t.n : '')) + '</button>';
        });
        o += '</div><div class="qmuted">' + (s.aim != null ? 'Szukasz: ' + tName(s.targets[s.aim]) + ' (kliknij go ponownie, aby wrócić do dowolnej kolejności).' : 'Zostało: ' + left + '. Kliknięcie zalicza najbliższy brakujący punkt; możesz też wybrać konkretny z listy.') + ' Tolerancja: ' + f1(tol()) + ' ' + unit() + '.</div>';
        return o + msgHTML(s) + hintsHTML(s);
      }
      if (s.phase === 'lines') {
        let o = '<div class="qtask">✏️ Wskaż przebieg ' + (s.lines.length > 1 ? 'linii' : 'linii') + ' tego kroku – kliknij <b>2 punkty</b> leżące na każdej:</div><ul class="qlines">';
        s.lines.forEach((g) => {
          o += '<li class="' + (g.res ? 'done' : '') + '">' + (g.res === 'shown' ? '👁 ' : g.res ? '✔ ' : '<span class="qcnt">' + g.clicks.length + '/2</span> ') + esc(g.info) + '</li>';
        });
        o += '</ul>';
        return o + msgHTML(s) + hintsHTML(s);
      }
      if (s.phase === 'vis') {
        return (
          '<div class="qtask">👁 <b>Widoczność:</b> kliknij krawędzie, które są <b>niewidoczne</b> – zmienią się na przerywane. Ponowne kliknięcie odznacza.</div>' +
          '<div class="qmuted">Oznaczone jako niewidoczne: ' + s.marks.size + ' z ' + s.visC.length + '. Pomóc może model 3D (pokazuje bryłę w tym kroku).</div>' +
          msgHTML(s) +
          '<div class="spbtns"><button type="button" class="qgo" data-q="check">✔ Sprawdź widoczność</button></div>' +
          hintsHTML(s)
        );
      }
      if (s.phase === 'visres') return msgHTML(s) + '<div class="spbtns"><button type="button" class="qgo" data-q="go">Dalej ▶</button></div>';
      // done
      let o = '';
      if (s.empty && !s.order) o += '<div class="qmsg">' + (s.k === 0 ? 'To dane zadania – obejrzyj je i przejdź dalej (→).' : 'W tym kroku nie ma nic do wskazania – przeczytaj opis i przejdź dalej (→).') + '</div>';
      else {
        const g = grade(s);
        o += msgHTML(s);
        o += '<div class="qmsg ' + (g === 'shown' ? 'bad' : 'ok') + '">' + (g === 'perfect' ? '★ Krok rozwiązany bezbłędnie!' : g === 'ok' ? '✔ Krok rozwiązany.' : '◐ Krok pokazany – spróbuj go potem samodzielnie (⟲).') + '</div>';
      }
      if (s.k < b.steps.length - 1) o += '<div class="spbtns"><button type="button" class="qgo" data-q="next">Następny krok ▶</button>' + (s.empty && !s.order ? '' : '<button type="button" data-q="redo" class="qsmall">⟲ Ten krok jeszcze raz</button>') + '</div>';
      return o;
    }
    function summaryHTML(r) {
      const b = B();
      const ic = { perfect: '★', ok: '✔', shown: '◐', cur: '…', none: '·' };
      let o = '<div class="qtask">📊 <b>Podsumowanie</b> – ' + esc(strip(App.lesson.title)) + '</div>';
      o += '<table class="qsum"><tr><td>Kroki bezbłędnie</td><td><b>' + r.perfect + '/' + r.steps + '</b></td></tr>';
      o += '<tr><td>Punkty za 1. razem</td><td><b>' + r.p1 + '/' + r.p + '</b> (' + pct(r.p1, r.p) + ')' + (r.pS ? ', pokazane: ' + r.pS : '') + '</td></tr>';
      if (r.o) o += '<tr><td>Kolejność kroków</td><td><b>' + r.oOk + '/' + r.o + '</b> (' + pct(r.oOk, r.o) + ')</td></tr>';
      if (r.v) o += '<tr><td>Widoczność krawędzi</td><td><b>' + r.vOk + '/' + r.v + '</b> (' + pct(r.vOk, r.v) + ')</td></tr>';
      if (r.l) o += '<tr><td>Przebieg linii</td><td><b>' + r.l1 + '/' + r.l + '</b></td></tr>';
      o += '<tr><td>Podpowiedzi</td><td><b>' + r.hints + '</b></td></tr></table>';
      o += '<div class="qsteps">';
      b.steps.forEach((st, i) => {
        if (!i) return;
        const g = grade(Q.states[i]) || 'todo';
        o += '<button type="button" class="qst ' + g + '" data-q="goto" data-i="' + i + '" title="' + esc(strip(st.title)) + '">' + (i + 1) + ' ' + (ic[g] || '○') + '</button>';
      });
      o += '</div><div class="qmuted">★ bezbłędnie · ✔ z błędami/podpowiedzią · ◐ pokazany · ○ nierozwiązany. Kliknij krok, aby do niego wrócić.</div>';
      o += '<div class="spbtns"><button type="button" data-q="restart">⟲ Jeszcze raz</button>';
      if ((App.lesson.params || []).length) o += '<button type="button" data-q="newdata">🎲 Nowe dane i od nowa</button>';
      else if (App.lesson.gen) o += '<button type="button" data-q="gen">🎲 Wygeneruj nowe zadanie</button>';
      if (Q.summary) o += '<button type="button" data-q="sum">◀ Wróć do kroku</button>';
      return o + '</div>';
    }
    function cfgHTML() {
      const ck = (k, l) => '<label><input type="checkbox" data-cfg="' + k + '"' + (cfg[k] ? ' checked' : '') + '> ' + l + '</label>';
      return (
        '<div class="qcfg">' +
        ck('order', 'pytaj „co robimy w tym kroku?” (kolejność konstrukcji)') +
        ck('lines', 'wskazywanie przebiegu linii (kroki bez punktów)') +
        ck('vis', 'zadania z widoczności krawędzi') +
        '<label>Dokładność: <select data-cfg="acc"><option value="easy"' + (cfg.acc === 'easy' ? ' selected' : '') + '>łagodna</option><option value="norm"' + (cfg.acc === 'norm' ? ' selected' : '') + '>normalna</option><option value="strict"' + (cfg.acc === 'strict' ? ' selected' : '') + '>ścisła (jak cyrklem)</option></select></label>' +
        '<div class="qmuted">Zmiany dotyczą kroków jeszcze nierozwiązanych. Skróty: → rozwiązanie kroku, H – kolejna podpowiedź, R – wyłącz.</div>' +
        '<div class="spbtns"><button type="button" data-q="cfg">◀ Wróć</button></div></div>'
      );
    }
    function setCfg(el) {
      const k = el.dataset.cfg;
      cfg[k] = el.type === 'checkbox' ? el.checked : el.value;
      h.store.set('quizCfg', cfg);
      Q.states.forEach((s, i) => {
        if (s && s.phase !== 'done') Q.states[i] = null;
      });
      Q.enter(App.k);
      h.show(App.k, { anim: false, cam: false, keepUnfold: true, keepQuiz: true });
    }
    function act(a, el) {
      const s = cur();
      const i = el.dataset.i != null ? +el.dataset.i : null;
      if (a === 'off') return Q.toggle(false);
      if (a === 'cfg') {
        Q.settings = !Q.settings;
        return ui();
      }
      if (a === 'sum') {
        Q.summary = !Q.summary;
        Q.settings = false;
        return ui();
      }
      if (a === 'restart') {
        Q.reset();
        Q.summary = false;
        return h.show(App.B.steps.length > 1 ? 1 : 0, { anim: true, cam: true, subEnd: true });
      }
      if (a === 'newdata') {
        Q.summary = false;
        App.randomVariant();
        return h.show(1, { anim: true, cam: true });
      }
      if (a === 'gen') {
        Q.summary = false;
        const g = $('#genGo');
        if (g) {
          $('#genBox').open = true;
          g.click();
        }
        return;
      }
      if (a === 'goto') {
        Q.summary = false;
        return h.show(i, { anim: false, cam: true, subEnd: true });
      }
      if (a === 'next') return h.show(App.k + 1, { anim: true, cam: true, sub: 0 });
      if (a === 'redo') {
        Q.states[App.k] = null;
        Q.enter(App.k);
        return h.show(App.k, { anim: false, cam: false, keepUnfold: true, keepQuiz: true });
      }
      if (!s) return;
      if (a === 'opt') return pickOrder(s, i);
      if (a === 'skipq') {
        s.order.pick = -1;
        s.order.ok = null;
        s.msg = null;
        return advance(s);
      }
      if (a === 'go') {
        if (s.phase === 'order') s.msg = null;
        return advance(s);
      }
      if (a === 'aim') {
        s.aim = s.aim === i ? null : i;
        return ui();
      }
      if (a === 'h-jak') return useHint(s, 'jak');
      if (a === 'h-aux') return useHint(s, 'aux');
      if (a === 'h-area') return useHint(s, 'area');
      if (a === 'show1') return showOne(s);
      if (a === 'reveal') return revealAll(s);
      if (a === 'check') return checkVis(s);
    }
    return Q;
  };
})();
