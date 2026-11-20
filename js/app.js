/* ===================================================================
   GW – aplikacja: moduły, lekcje, silnik kroków, synchronizacja 3D↔2D
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V;
  const $ = (s) => document.querySelector(s);

  window.addEventListener('error', (e) => {
    document.body.dataset.err = (document.body.dataset.err || '') + e.message + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno + ' | ';
  });
  const App = {
    lesson: null,
    P: {},
    S: {},
    B: null,
    k: 0,
    playing: null,
    modSel: 1,
  };
  GW.App = App;

  const tip = $('#tip');
  let mouse = [0, 0];
  window.addEventListener('mousemove', (e) => {
    mouse = [e.clientX, e.clientY];
    if (tip.style.display === 'block') placeTip();
  });
  function placeTip() {
    const w = tip.offsetWidth,
      h = tip.offsetHeight;
    let x = mouse[0] + 14,
      y = mouse[1] + 14;
    if (x + w > window.innerWidth - 4) x = mouse[0] - w - 10;
    if (y + h > window.innerHeight - 4) y = mouse[1] - h - 10;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }

  /* ---------- widoki ---------- */
  const v3 = new GW.View3D($('#v3'));
  const v2 = new GW.View2D($('#v2'));
  App.v3 = v3;
  App.v2 = v2;

  function infoOf(id) {
    if (!id) return '';
    const m = (App.B && App.B.infoMap[id]) || (App.ovInfo && App.ovInfo[id]);
    if (m) return m;
    return '';
  }
  function hover(id) {
    if (!id) {
      v3.setHighlight(new Set());
      v2.setHighlight(new Set());
      tip.style.display = 'none';
      return;
    }
    const L = (App.B && App.B.links[id]) || (App.ovLinks && App.ovLinks[id]) || [];
    const H = new Set([id].concat(L));
    v3.setHighlight(H);
    v2.setHighlight(H);
    const t = infoOf(id);
    if (t) {
      tip.innerHTML = t;
      tip.style.display = 'block';
      placeTip();
    } else tip.style.display = 'none';
  }
  v3.onHover = (id) => hover(id);
  v2.onHover = (id) => hover(id);

  /* kliknięcie: kamera "wzdłuż promienia rzutującego" dla rzutów */
  function planeOfId(id) {
    if (!id || !App.B || !App.B.sys) return null;
    const m = /\|(\d+)$/.exec(id.replace(/^ray:/, ''));
    if (!m) return null;
    const k = +m[1];
    const pl = App.B.sys.list.find((p) => p.k === k);
    return pl ? pl.id : null;
  }
  function observer(pid) {
    const sys = App.B.sys;
    const pl = sys.get(pid);
    v3.camTo({ dir: pl.N, up: sys.sheetUp3(pid), target: v3.center });
  }
  App.observer = observer;
  v3.onClick = (p) => {
    if (!p) return;
    const pid = p.pl || planeOfId(p.id);
    if (pid && App.B.sys) observer(pid);
    if (App.lesson.special && App.lesson.special.click) App.lesson.special.click(ctx(), p.id);
  };
  v2.onClick = (id) => {
    const pid = planeOfId(id);
    if (pid && App.B.sys) observer(pid);
    if (App.lesson.special && App.lesson.special.click) App.lesson.special.click(ctx(), id);
  };

  document.querySelectorAll('[data-cam]').forEach((b) => (b.onclick = () => v3.camPreset(b.dataset.cam)));
  $('#bFit').onclick = () => fit2();

  /* ---------- rozkładanie rzutni (suwak) ---------- */
  const unf = $('#unfold');
  function unfoldOrder() {
    const sys = App.B && App.B.sys;
    if (!sys) return [];
    return sys.list.filter((p) => p.parent && (App.B.planeFrom[p.id] || 0) <= App.k).reverse();
  }
  unf.oninput = () => {
    const ord = unfoldOrder();
    const u = +unf.value * ord.length;
    const U = {};
    let txt = '';
    ord.forEach((pl, i) => {
      U[pl.id] = Math.max(0, Math.min(1, u - i));
      if (u - i > 0 && u - i <= 1) txt = 'π' + sub(pl.k) + ' → π' + sub(App.B.sys.get(pl.parent).k);
    });
    $('#unfoldTxt').textContent = txt;
    v3.setUnfold(U, false);
  };
  const sub = (k) => String(k).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);

  /* ---------- moduły i lekcje ---------- */
  function buildMods() {
    const nav = $('#mods');
    nav.innerHTML = '';
    GW.modules.forEach((m) => {
      const b = document.createElement('button');
      b.textContent = m.n + '. ' + m.t;
      b.onclick = () => selectModule(m.n);
      b.dataset.m = m.n;
      nav.appendChild(b);
    });
  }
  function selectModule(n, lessonId) {
    App.modSel = n;
    document.querySelectorAll('#mods button').forEach((b) => b.classList.toggle('on', +b.dataset.m === n));
    const bar = $('#lessonbar');
    bar.innerHTML = '';
    const ls = GW.lessons.filter((l) => l.mod === n);
    ls.forEach((l) => {
      const b = document.createElement('button');
      b.textContent = l.title;
      b.dataset.id = l.id;
      b.onclick = () => selectLesson(l);
      bar.appendChild(b);
    });
    const L = ls.find((l) => l.id === lessonId) || ls[0];
    if (L) selectLesson(L);
  }
  function ctx() {
    return { app: App, v3, v2, B: App.B, data: App.B ? App.B.data : {}, P: App.P, S: App.S, sys: App.B && App.B.sys, k: App.k };
  }
  App.ctx = ctx;

  function selectLesson(L) {
    stopPlay();
    App.lesson = L;
    try {
      history.replaceState(null, '', '#' + L.id);
    } catch (e) {}
    document.querySelectorAll('#lessonbar button').forEach((b) => b.classList.toggle('on', b.dataset.id === L.id));
    App.P = {};
    (L.params || []).forEach((p) => (App.P[p.k] = p.v));
    (L.opts || []).forEach((p) => (App.P[p.k] = p.v));
    App.S = {};
    ((L.special && L.special.ui) || []).forEach((u) => {
      if (u.k) App.S[u.k] = u.v;
    });
    $('#algo').innerHTML = L.algo || '';
    $('#v2title').innerHTML = L.v2title || 'Rysunek 2D';
    $('#legend').innerHTML = L.legend || defaultLegend;
    buildParams();
    v3.frameHooks = [];
    v2.onBgMove = null;
    if (L.special && L.special.frame) v3.frameHooks.push((now) => L.special.frame(ctx(), now));
    rebuild({ first: true });
    buildSpecial();
    if (L.special && L.special.bind) L.special.bind(ctx());
    show(0, { anim: true, cam: true, firstCam: true });
  }
  const defaultLegend =
    '<b>Legenda:</b><br><i></i>dane / krawędź widoczna &nbsp; <i style="border-top:1.3px dashed #555"></i>niewidoczna<br>' +
    '<i style="border-color:#888;border-width:1px"></i>konstrukcyjna / odnosząca &nbsp; <i style="border-color:#2a6fdb"></i>pomocnicza<br>' +
    '<i style="border-color:#d01818;border-width:3px"></i>wynik &nbsp; <i style="border-color:#0f9d58;border-width:3px"></i>przenoszona odległość<br>' +
    '<i style="border-color:#ff8c00;border-width:3px"></i>elementy źródłowe kroku („skąd to się wzięło?”) &nbsp; <i style="border-color:#ff00aa;border-width:3px"></i>podświetlenie (hover)';

  function buildParams() {
    const L = App.lesson;
    const box = $('#params');
    box.innerHTML = '';
    if (L.presets) {
      const d = document.createElement('div');
      d.className = 'prmsel';
      d.innerHTML = 'Zestaw zadania: ';
      const s = document.createElement('select');
      L.presets.forEach((p, i) => {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = p.n;
        s.appendChild(o);
      });
      s.onchange = () => {
        Object.assign(App.P, L.presets[+s.value].v);
        syncParamUI();
        rebuild({ first: true });
        show(0, { anim: true, cam: true, firstCam: true });
      };
      d.appendChild(s);
      box.appendChild(d);
    }
    (L.opts || []).forEach((p) => {
      const d = document.createElement('div');
      d.className = 'prmsel';
      d.innerHTML = p.l + ': ';
      const s = document.createElement('select');
      p.choices.forEach(([v, t]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = t;
        s.appendChild(o);
      });
      s.value = App.P[p.k];
      s.dataset.k = p.k;
      s.onchange = () => {
        App.P[p.k] = isNaN(+s.value) ? s.value : +s.value;
        rebuild({ first: !!p.rebuildFrame });
        show(Math.min(App.k, App.B.steps.length - 1), { anim: false, cam: false });
      };
      d.appendChild(s);
      box.appendChild(d);
    });
    (L.params || []).forEach((p) => {
      const d = document.createElement('div');
      d.className = 'prm';
      d.innerHTML = '<span>' + p.l + '</span>';
      const r = document.createElement('input');
      r.type = 'range';
      r.min = p.min;
      r.max = p.max;
      r.step = p.step || 1;
      r.value = App.P[p.k];
      r.dataset.k = p.k;
      const o = document.createElement('output');
      o.textContent = fmt(App.P[p.k]);
      r.oninput = () => {
        App.P[p.k] = +r.value;
        o.textContent = fmt(+r.value);
        scheduleRebuild();
      };
      d.appendChild(r);
      d.appendChild(o);
      box.appendChild(d);
    });
    if (!(L.params || []).length && !(L.opts || []).length && !L.presets) box.innerHTML = '<div class="spnote">Brak parametrów.</div>';
    else {
      const b = document.createElement('button');
      b.textContent = 'Przywróć dane zadania';
      b.style.marginTop = '6px';
      b.onclick = () => {
        (L.params || []).forEach((p) => (App.P[p.k] = p.v));
        (L.opts || []).forEach((p) => (App.P[p.k] = p.v));
        syncParamUI();
        rebuild({ first: true });
        show(App.k, { anim: false, cam: false });
      };
      box.appendChild(b);
      const n = document.createElement('div');
      n.className = 'spnote';
      n.textContent = 'Zmiana parametru przelicza całą konstrukcję (wszystkie kroki) w czasie rzeczywistym.';
      box.appendChild(n);
    }
  }
  const fmt = (v) => (Math.abs(v - Math.round(v)) < 1e-9 ? String(Math.round(v)) : (Math.round(v * 100) / 100).toString().replace('.', ','));
  function syncParamUI() {
    document.querySelectorAll('#params input[type=range]').forEach((r) => {
      r.value = App.P[r.dataset.k];
      r.nextSibling.textContent = fmt(App.P[r.dataset.k]);
    });
    document.querySelectorAll('#params select[data-k]').forEach((s) => (s.value = App.P[s.dataset.k]));
  }
  let rbPending = false;
  function scheduleRebuild() {
    if (rbPending) return;
    rbPending = true;
    requestAnimationFrame(() => {
      rbPending = false;
      rebuild({});
      show(Math.min(App.k, App.B.steps.length - 1), { anim: false, cam: false, keepUnfold: true });
    });
  }

  function buildSpecial() {
    const L = App.lesson;
    const box = $('#special');
    box.innerHTML = '';
    $('#camExtra').innerHTML = '';
    const sp = L.special;
    if (L.cams) {
      L.cams.forEach((c) => {
        const b = document.createElement('button');
        b.innerHTML = c.l;
        b.title = c.title || '';
        b.onclick = () => applyCam(c.cam);
        $('#camExtra').appendChild(b);
      });
    }
    if (!sp || !sp.ui) {
      box.innerHTML = '<div class="spnote">' + ((sp && sp.note) || 'Najedź kursorem na dowolny element (w 3D lub 2D) – podświetli się jego odpowiednik. Kliknij rzut punktu, aby spojrzeć wzdłuż promienia rzutującego.') + '</div>';
      return;
    }
    if (sp.note) {
      const n = document.createElement('div');
      n.className = 'spnote';
      n.innerHTML = sp.note;
      box.appendChild(n);
    }
    let btnRow = null;
    sp.ui.forEach((u) => {
      if (u.type === 'range') {
        btnRow = null;
        const d = document.createElement('div');
        d.className = 'prm';
        d.innerHTML = '<span>' + u.l + '</span>';
        const r = document.createElement('input');
        r.type = 'range';
        r.min = u.min;
        r.max = u.max;
        r.step = u.step || 0.01;
        r.value = App.S[u.k];
        const o = document.createElement('output');
        o.textContent = fmt(App.S[u.k]);
        r.oninput = () => {
          App.S[u.k] = +r.value;
          o.textContent = fmt(+r.value);
          u.onchange && u.onchange(ctx());
          refreshOverlay();
        };
        u._el = r;
        u._out = o;
        d.appendChild(r);
        d.appendChild(o);
        box.appendChild(d);
      } else if (u.type === 'check') {
        btnRow = null;
        const d = document.createElement('label');
        d.className = 'prmsel';
        d.style.display = 'block';
        const c = document.createElement('input');
        c.type = 'checkbox';
        c.checked = !!App.S[u.k];
        u._el = c;
        c.onchange = () => {
          App.S[u.k] = c.checked;
          u.onchange && u.onchange(ctx());
          refreshOverlay();
        };
        d.appendChild(c);
        d.appendChild(document.createTextNode(' ' + u.l));
        box.appendChild(d);
      } else if (u.type === 'btn') {
        if (!btnRow) {
          btnRow = document.createElement('div');
          btnRow.className = 'spbtns';
          box.appendChild(btnRow);
        }
        const b = document.createElement('button');
        b.innerHTML = u.l;
        b.title = u.title || '';
        b.onclick = () => {
          u.fn(ctx());
          refreshOverlay();
        };
        btnRow.appendChild(b);
      } else if (u.type === 'html') {
        btnRow = null;
        const d = document.createElement('div');
        d.className = 'spnote';
        d.innerHTML = u.html;
        box.appendChild(d);
      }
    });
  }
  App.setSpecial = (k, v) => {
    App.S[k] = v;
    const u = (App.lesson.special.ui || []).find((x) => x.k === k);
    if (u && u._el) {
      if (u.type === 'check') u._el.checked = !!v;
      else {
        u._el.value = v;
        u._out.textContent = fmt(v);
      }
    }
    refreshOverlay();
  };
  function refreshOverlay() {
    const L = App.lesson;
    App.ovInfo = {};
    App.ovLinks = {};
    if (L.special && L.special.overlay) {
      const r = L.special.overlay(ctx()) || {};
      v3.setOverlay(r.p3 || []);
      v2.setOverlay(r.p2 || []);
      App.ovInfo = r.info || {};
      App.ovLinks = r.links || {};
    } else {
      v3.setOverlay([]);
      v2.setOverlay([]);
    }
  }
  App.refreshOverlay = refreshOverlay;

  function rebuild(o) {
    const L = App.lesson;
    const B = new GW.Builder();
    try {
      L.build(App.P, B);
    } catch (e) {
      console.error(e);
      document.body.dataset.err = (document.body.dataset.err || '') + 'build: ' + e.message + ' | ';
    }
    B.finish();
    App.B = B;
    v3.setSys(B.sys);
    $('#unfoldBox').style.display = B.sys ? 'inline-flex' : 'none';
    if (o.first) {
      const pts = B.pts3.slice();
      B.p3.forEach((p) => {
        if (p.isPlane) p.pts.forEach((q) => pts.push(q));
      });
      v3.setFrame(B.frame3 || pts);
      fit2();
    }
    buildTimeline();
  }
  function fit2() {
    const pts = [];
    App.B.p2.forEach((p) => {
      if (p.noFit) return;
      if (p.p) pts.push(p.p);
      if (p.a) pts.push(p.a, p.b);
      if (p.pts) p.pts.forEach((q) => pts.push(q));
      if (p.c && p.r) pts.push([p.c[0] - p.r, p.c[1] - p.r], [p.c[0] + p.r, p.c[1] + p.r]);
    });
    if (!pts.length) pts.push([0, 0], [100, 100]);
    const bb = GW.G.bbox2(pts);
    const pad = Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.04 + 4;
    v2.fit(App.B.frame2 || [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad]);
  }
  function buildTimeline() {
    const tl = $('#timeline');
    tl.innerHTML = '';
    App.B.steps.forEach((s, i) => {
      const e = document.createElement('span');
      e.textContent = i + 1;
      e.title = s.title;
      e.onclick = () => show(i, { anim: true, cam: true });
      tl.appendChild(e);
    });
  }

  function applyCam(c) {
    if (!c) return;
    if (typeof c === 'string') return v3.camPreset(c);
    if (typeof c === 'function') return v3.camTo(c(ctx()));
    if (c.obs) return observer(c.obs);
    v3.camTo(c);
  }
  App.applyCam = applyCam;

  function show(k, o = {}) {
    const B = App.B;
    k = Math.max(0, Math.min(B.steps.length - 1, k));
    App.k = k;
    const st = B.steps[k];
    const vis = (p) => p.from <= k && (p.to === undefined || p.to > k);
    v3.setPrims(B.p3.filter(vis), { animate: o.anim, step: k });
    v2.setPrims(B.p2.filter(vis), { animate: o.anim, step: k });
    const src = new Set(st.src || []);
    v3.setSrc(src);
    v2.setSrc(src);
    $('#stepNo').textContent = k + 1 + ' / ' + B.steps.length;
    $('#stepTitle').innerHTML = st.title || '';
    $('#sCo').innerHTML = st.co || '';
    $('#sJak').innerHTML = st.jak || '';
    $('#sWhy').innerHTML = st.why || '';
    document.querySelectorAll('#timeline span').forEach((e, i) => {
      e.classList.toggle('cur', i === k);
      e.classList.toggle('done', i < k);
    });
    if (o.cam) {
      if (st.cam) applyCam(st.cam);
      else if (o.firstCam) applyCam(App.lesson.cam0 || 'iso');
    }
    if (!o.keepUnfold) {
      const U = st.unfold || {};
      v3.setUnfold(U, !!o.anim);
      unf.value = 0;
      $('#unfoldTxt').textContent = '';
    }
    if (App.lesson.special && App.lesson.special.onStep) App.lesson.special.onStep(ctx(), k);
    refreshOverlay();
  }
  App.show = show;
  App.rebuild = rebuild;

  $('#bPrev').onclick = () => show(App.k - 1, { anim: false, cam: true });
  $('#bNext').onclick = () => show(App.k + 1, { anim: true, cam: true });
  function stopPlay() {
    if (App.playing) clearInterval(App.playing);
    App.playing = null;
    $('#bPlay').textContent = '▶';
  }
  $('#bPlay').onclick = () => {
    if (App.playing) return stopPlay();
    $('#bPlay').textContent = '❚❚';
    if (App.k >= App.B.steps.length - 1) show(0, { anim: true, cam: true });
    App.playing = setInterval(() => {
      if (App.k >= App.B.steps.length - 1) return stopPlay();
      show(App.k + 1, { anim: true, cam: true });
    }, 4200);
  };
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight') $('#bNext').click();
    else if (e.key === 'ArrowLeft') $('#bPrev').click();
    else if (e.key === ' ') {
      e.preventDefault();
      $('#bPlay').click();
    }
  });

  buildMods();
  const [hash, hstep] = location.hash.slice(1).split('/');
  const L0 = GW.lessons.find((l) => l.id === hash);
  selectModule(L0 ? L0.mod : 1, L0 ? L0.id : null);
  if (hstep) show(+hstep - 1, { anim: false, cam: true });
})();
