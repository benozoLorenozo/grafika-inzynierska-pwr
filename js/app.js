/* ===================================================================
   GW – aplikacja: moduły, lekcje, silnik kroków, synchronizacja 3D↔2D,
   filtry widoku, π3, tryb „Rozwiąż sam”, losowanie wariantów, miarka,
   tryb kartki, ściągawka, układ kolumn, skróty klawiszowe.
   =================================================================== */
(function () {
  'use strict';
  const GW = window.GW;
  const V = GW.V;
  const $ = (s) => document.querySelector(s);
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem('gw.' + k);
        return v == null ? d : JSON.parse(v);
      } catch (e) {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem('gw.' + k, JSON.stringify(v));
      } catch (e) {}
    },
  };

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
    filt: Object.assign({}, store.get('filters', {})),
    quiz: { on: false, revealed: new Set(), targets: [], i: 0, miss: 0, ok: 0, bad: 0, skip: 0 },
    measure: { on: false, a: null, b: null },
    zsMode: 'auto',
    zs: 1,
  };
  GW.App = App;
  GW.view.p3 = !!store.get('p3', false);
  GW.view.mitre = store.get('mitre', '45');

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
    return (App.B && App.B.infoMap[id]) || (App.ovInfo && App.ovInfo[id]) || '';
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
    if (App.quiz.on && quizActive()) return;
    if (App.measure.on) return;
    const pid = planeOfId(id);
    if (pid && App.B.sys) observer(pid);
    if (App.lesson.special && App.lesson.special.click) App.lesson.special.click(ctx(), id);
  };
  v2.onSheetClick = (P) => {
    if (App.quiz.on && quizActive()) return quizClick(P);
    if (App.measure.on) return measureClick(P);
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
  let onlyLists = !!store.get('onlyLists', false);
  function buildMods() {
    const nav = $('#mods');
    nav.innerHTML = '';
    GW.modules.forEach((m) => {
      const b = document.createElement('button');
      b.textContent = m.n + '. ' + m.t;
      b.title = m.t;
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
    const all = GW.lessons.filter((l) => l.mod === n);
    const ls = onlyLists ? all.filter((l) => l.lista) : all;
    ls.forEach((l) => {
      const b = document.createElement('button');
      b.innerHTML = (l.lista ? '<span class="badge" title="Zawiera zadania z list ćwiczeniowych">📋 ' + l.lista + '</span> ' : '') + l.title;
      b.dataset.id = l.id;
      b.onclick = () => selectLesson(l);
      bar.appendChild(b);
    });
    const lab = document.createElement('label');
    lab.className = 'onlylists';
    lab.innerHTML = '<input type="checkbox"' + (onlyLists ? ' checked' : '') + '> tylko zadania z list';
    lab.querySelector('input').onchange = (e) => {
      onlyLists = e.target.checked;
      store.set('onlyLists', onlyLists);
      selectModule(n, App.lesson && App.lesson.id);
    };
    bar.appendChild(lab);
    const L = ls.find((l) => l.id === lessonId) || ls[0] || all[0];
    if (L && L !== App.lesson) selectLesson(L);
    else if (L) document.querySelectorAll('#lessonbar button').forEach((b) => b.classList.toggle('on', b.dataset.id === L.id));
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
    buildMistakes();
    buildParams();
    v3.frameHooks = [];
    v2.onBgMove = null;
    App.quiz.revealed = new Set();
    App.measure.a = App.measure.b = null;
    if (L.special && L.special.frame) v3.frameHooks.push((now) => L.special.frame(ctx(), now));
    App.zsMode = 'auto';
    rebuild({ first: true });
    buildSpecial();
    buildViewBox();
    if (L.special && L.special.bind) L.special.bind(ctx());
    show(0, { anim: true, cam: true, firstCam: true });
  }
  const defaultLegend =
    '<b>Legenda:</b><br><i></i>dane / krawędź widoczna &nbsp; <i style="border-top:1.3px dashed #555"></i>niewidoczna<br>' +
    '<i style="border-color:#888;border-width:1px"></i>konstrukcyjna / odnosząca &nbsp; <i style="border-color:#2a6fdb"></i>pomocnicza<br>' +
    '<i style="border-color:#d01818;border-width:3px"></i>wynik &nbsp; <i style="border-color:#0f9d58;border-width:3px"></i>przenoszona odległość<br>' +
    '<i style="border-color:#ff8c00;border-width:3px"></i>elementy źródłowe kroku („skąd to się wzięło?”) &nbsp; <i style="border-color:#ff00aa;border-width:3px"></i>podświetlenie (hover)';

  function buildMistakes() {
    const L = App.lesson;
    const arr = (L.mistakes || []).concat((GW.MISTAKES && GW.MISTAKES[L.mod]) || []);
    const box = $('#mistakes');
    box.innerHTML = arr.length ? '<ul>' + arr.map((m) => '<li>' + m + '</li>').join('') + '</ul>' : '<div class="spnote">—</div>';
  }

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
      if (p.when && !p.when(App.P)) return;
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
        if (p.onSet) p.onSet(App.P);
        if (p.rebuildParams) {
          buildParams();
        }
        App.quiz.revealed = new Set();
        rebuild({ first: !!p.rebuildFrame });
        if (p.rebuildFrame) show(0, { anim: true, cam: true, firstCam: true });
        else show(Math.min(App.k, App.B.steps.length - 1), { anim: false, cam: false });
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
      const row = document.createElement('div');
      row.className = 'spbtns';
      const b = document.createElement('button');
      b.textContent = 'Przywróć dane zadania';
      b.onclick = () => {
        (L.params || []).forEach((p) => (App.P[p.k] = p.v));
        (L.opts || []).forEach((p) => {
          if (p.keep) return;
          App.P[p.k] = p.v;
        });
        syncParamUI();
        rebuild({ first: true });
        show(App.k, { anim: false, cam: false });
      };
      row.appendChild(b);
      if ((L.params || []).length) {
        const r = document.createElement('button');
        r.innerHTML = '🎲 Losuj wariant';
        r.title = 'Losuje poprawne dane zadania (skrót L)';
        r.onclick = () => randomVariant();
        row.appendChild(r);
      }
      box.appendChild(row);
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

  /* ---------- losowanie poprawnego wariantu ---------- */
  function randomVariant() {
    const L = App.lesson;
    const keep = Object.assign({}, App.P);
    let ok = false;
    for (let tr = 0; tr < 40 && !ok; tr++) {
      (L.params || []).forEach((p) => {
        const st = p.step || 1;
        const lo = p.rmin ?? p.min,
          hi = p.rmax ?? p.max;
        App.P[p.k] = Math.round((lo + Math.random() * (hi - lo)) / st) * st;
        App.P[p.k] = +App.P[p.k].toFixed(4);
      });
      if (L.randomize) L.randomize(App.P);
      const B = buildOnce(null);
      ok = !B._err && B.steps.length >= 3 && B.data.ok !== false && !B.steps.some((s) => /^Brak/.test(s.title || ''));
    }
    if (!ok) Object.assign(App.P, keep);
    syncParamUI();
    App.quiz.revealed = new Set();
    rebuild({ first: true });
    show(0, { anim: true, cam: true, firstCam: true });
  }
  App.randomVariant = randomVariant;

  /* ---------- widok specjalny ---------- */
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

  /* ---------- filtry widoku, π3, przewyższenie ---------- */
  function buildViewBox() {
    const box = $('#viewopts');
    box.innerHTML = '';
    const L = App.lesson;
    const hasMonge = App.B && App.B.sys && App.B.sys.P.p1 && App.B.sys.P.p2 && !App.B.sys.P.p2.parent;
    if (hasMonge) {
      const forced = L.needP3 && L.needP3(App.P);
      const d = document.createElement('div');
      d.className = 'prmsel';
      d.innerHTML =
        '<label><input type="checkbox" id="cbP3"' + (GW.view.p3 || forced ? ' checked' : '') + (forced ? ' disabled' : '') + '> <b>rzutnia boczna π₃</b> (widok z lewej)</label>' +
        (forced ? ' <span class="spnote">– wymagana w tym zadaniu</span>' : '') +
        '<br>odnoszące π₁→π₃: <select id="selMitre"><option value="45">prosta pod 45°</option><option value="arc">łuki wokół O</option></select>';
      box.appendChild(d);
      d.querySelector('#cbP3').onchange = (e) => setP3(e.target.checked);
      const sm = d.querySelector('#selMitre');
      sm.value = GW.view.mitre;
      sm.onchange = () => {
        GW.view.mitre = sm.value;
        store.set('mitre', sm.value);
        rebuild({});
        show(App.k, { anim: false, cam: false, keepUnfold: true });
      };
    }
    const grid = document.createElement('div');
    grid.className = 'filtgrid';
    GW.FILTERS.forEach(([k, l]) => {
      const lab = document.createElement('label');
      lab.innerHTML = '<input type="checkbox" data-f="' + k + '"' + (App.filt[k] !== false ? ' checked' : '') + '> ' + l;
      lab.querySelector('input').onchange = (e) => {
        App.filt[k] = e.target.checked;
        store.set('filters', App.filt);
        applyFilters();
      };
      grid.appendChild(lab);
    });
    box.appendChild(grid);
    const row = document.createElement('div');
    row.className = 'spbtns';
    [
      ['Wszystko', () => GW.FILTERS.forEach(([k]) => (App.filt[k] = true))],
      ['Tylko wynik', () => GW.FILTERS.forEach(([k]) => (App.filt[k] = ['given', 'res', 'hid', 'pts', 'labels', 'axes', 'solids', 'hatch', 'cont'].indexOf(k) >= 0))],
      ['Bez konstrukcji', () => ['aux', 'auxplanes', 'odn', 'rays'].forEach((k) => (App.filt[k] = false))],
    ].forEach(([t, fn]) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.onclick = () => {
        fn();
        store.set('filters', App.filt);
        box.querySelectorAll('input[data-f]').forEach((c) => (c.checked = App.filt[c.dataset.f] !== false));
        applyFilters();
      };
      row.appendChild(b);
    });
    box.appendChild(row);
    const op = document.createElement('div');
    op.className = 'prm';
    op.innerHTML = '<span>krycie brył 3D</span><input type="range" min="0.1" max="2.5" step="0.05" value="' + (App.solidOp || 1) + '"><output>' + fmt(App.solidOp || 1) + '×</output>';
    op.querySelector('input').oninput = (e) => {
      App.solidOp = +e.target.value;
      op.querySelector('output').textContent = fmt(App.solidOp) + '×';
      v3.solidOp = App.solidOp;
      show(App.k, { anim: false, cam: false, keepUnfold: true });
    };
    box.appendChild(op);
    // przewyższenie
    const zb = $('#zsBox');
    zb.style.display = L.zExag ? 'inline-flex' : 'none';
  }
  function setP3(on) {
    GW.view.p3 = on;
    store.set('p3', on);
    rebuild({ first: true });
    buildViewBox();
    show(App.k, { anim: false, cam: false });
  }
  App.setP3 = setP3;
  function applyFilters() {
    v2.noLabels = App.filt.labels === false;
    v3.labels.style.display = App.filt.labels === false ? 'none' : '';
    show(App.k, { anim: false, cam: false, keepUnfold: true });
  }
  const zsIn = $('#zs');
  zsIn.oninput = () => {
    App.zsMode = +zsIn.value;
    applyZs();
  };
  $('#zsAuto').onclick = () => {
    App.zsMode = 'auto';
    applyZs();
  };
  function autoZs(B) {
    const P = B.pts3;
    if (!P.length) return 1;
    const r = [0, 1, 2].map((i) => Math.max(...P.map((q) => q[i])) - Math.min(...P.map((q) => q[i])));
    const hz = Math.max(r[0], r[1]);
    if (r[2] < 1e-6) return 1;
    return Math.max(1, Math.min(15, Math.round(((0.32 * hz) / r[2]) * 2) / 2));
  }
  function applyZs(noCam) {
    const L = App.lesson;
    const s = !L.zExag ? 1 : App.zsMode === 'auto' ? autoZs(App.B) : App.zsMode;
    App.zs = s;
    zsIn.value = s;
    $('#zsTxt').textContent = '×' + fmt(s);
    if (Math.abs(v3.zs - s) > 1e-9) {
      v3.setZScale(s);
      const pts = App.B.pts3.slice();
      v3.setFrame(App.B.frame3 || pts);
      if (!noCam) v3.camPreset('iso');
    }
  }

  function refreshOverlay() {
    const L = App.lesson;
    App.ovInfo = {};
    App.ovLinks = {};
    let p3 = [],
      p2 = [];
    if (L.special && L.special.overlay) {
      const r = L.special.overlay(ctx()) || {};
      p3 = r.p3 || [];
      p2 = r.p2 || [];
      App.ovInfo = r.info || {};
      App.ovLinks = r.links || {};
    }
    p2 = p2.concat(measurePrims());
    if (App.measure.info) Object.assign(App.ovInfo, App.measure.info);
    const F = (p) => GW.passFilter(p, App.filt) || p.id === 'measure';
    v3.setOverlay(p3.filter(F));
    v2.setOverlay(p2.filter(F));
  }
  App.refreshOverlay = refreshOverlay;

  function buildOnce(p3x) {
    const L = App.lesson;
    const B = new GW.Builder();
    if (p3x != null) B.p3x = p3x;
    try {
      L.build(App.P, B);
    } catch (e) {
      console.error(e);
      B._err = e;
      document.body.dataset.err = (document.body.dataset.err || '') + 'build: ' + e.message + ' | ';
    }
    return B;
  }
  function rebuild(o) {
    const L = App.lesson;
    let B = buildOnce(null);
    const wantP3 = GW.view.p3 || (L.needP3 && L.needP3(App.P));
    if (wantP3 && B.sys && B.sys.P.p1 && B.sys.P.p2 && !B.sys.P.p2.parent && !B.sys.P.p3 && B.pts3.length) {
      const xs = B.pts3.map((q) => q[0]);
      const x1 = Math.max(...xs),
        x0 = Math.min(...xs);
      B = buildOnce(x1 + Math.max(16, 0.22 * (x1 - x0)));
    }
    B.finish();
    App.B = B;
    v3.setSys(B.sys);
    $('#unfoldBox').style.display = B.sys ? 'inline-flex' : 'none';
    if (L.zExag) applyZs(true);
    else if (v3.zs !== 1) v3.setZScale(1);
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
    App.fitBox = App.B.frame2 || [bb[0] - pad, bb[1] - pad, bb[2] + pad, bb[3] + pad];
    v2.fit(App.fitBox);
  }
  function buildTimeline() {
    const tl = $('#timeline');
    tl.innerHTML = '';
    App.B.steps.forEach((s, i) => {
      const e = document.createElement('span');
      e.textContent = i + 1;
      e.title = (s.title || '').replace(/<[^>]+>/g, '');
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

  /* ---------- tryb „Rozwiąż sam” ---------- */
  function quizActive() {
    return App.quiz.on && App.quiz.targets.length && App.quiz.i < App.quiz.targets.length && !App.quiz.revealed.has(App.k);
  }
  function quizTargets(k) {
    const seen = new Set();
    return App.B.p2.filter((p) => {
      if (p.from !== k || p.t !== 'pt' || !p.label || p.noPick) return false;
      const key = p.id + '@' + p.p.map((v) => v.toFixed(2)).join(',');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function quizTol() {
    const b = App.fitBox || [0, 0, 100, 100];
    return Math.max(2.2, 0.018 * Math.hypot(b[2] - b[0], b[3] - b[1]));
  }
  function quizUI() {
    const q = App.quiz;
    const box = $('#quizBox');
    box.style.display = q.on ? 'block' : 'none';
    $('#bQuiz').classList.toggle('on', q.on);
    if (!q.on) return;
    const k = App.k;
    let html = '<div class="qscore">Trafione: <b>' + q.ok + '</b> · pudła: <b>' + q.bad + '</b> · pominięte: <b>' + q.skip + '</b></div>';
    if (q.revealed.has(k) || !q.targets.length) {
      html += '<div class="qmsg ok">' + (q.targets.length ? '✔ Krok rozwiązany – przejdź dalej (→).' : 'W tym kroku nie ma punktów do wskazania – przeczytaj opis i przejdź dalej (→).') + '</div>';
    } else {
      const t = q.targets[q.i];
      html += '<div class="qmsg">Kliknij na rysunku 2D, gdzie leży punkt <b class="qlab">' + GW.labHTML(t.label) + '</b> (' + (q.i + 1) + ' z ' + q.targets.length + ').</div>';
      if (q.last) html += '<div class="qmsg ' + (q.last.ok ? 'ok' : 'bad') + '">' + q.last.txt + '</div>';
      html += '<div class="spbtns"><button id="qHint">Podpowiedź (JAK)</button><button id="qShow">Pokaż ten punkt</button><button id="qReveal">Pokaż cały krok</button></div>';
    }
    box.innerHTML = html;
    const hb = $('#qHint');
    if (hb)
      hb.onclick = () => {
        $('#stepBox').classList.remove('quizhide');
      };
    const sb = $('#qShow');
    if (sb)
      sb.onclick = () => {
        q.skip++;
        q.last = { ok: false, txt: 'Pokazano ' + GW.labHTML(q.targets[q.i].label) + '.' };
        q.shown.push(q.targets[q.i]);
        q.i++;
        quizAdvance();
      };
    const rb = $('#qReveal');
    if (rb)
      rb.onclick = () => {
        q.skip += q.targets.length - q.i;
        q.i = q.targets.length;
        quizAdvance();
      };
  }
  function quizAdvance() {
    const q = App.quiz;
    if (q.i >= q.targets.length) {
      q.revealed.add(App.k);
      q.last = null;
      show(App.k, { anim: true, cam: false, keepUnfold: true });
    } else {
      q.miss = 0;
      show(App.k, { anim: false, cam: false, keepUnfold: true, keepQuiz: true });
    }
  }
  function quizClick(P) {
    const q = App.quiz;
    const t = q.targets[q.i];
    const d = V.dist(P, t.p);
    const tol = quizTol();
    if (d <= tol) {
      q.ok++;
      q.last = { ok: true, txt: '✔ Dobrze! ' + GW.labHTML(t.label) + ' (odchyłka ' + GW.G.f1(d) + ' mm).' };
      q.shown.push(t);
      q.i++;
      quizAdvance();
    } else {
      q.bad++;
      q.miss++;
      q.last = { ok: false, txt: '✘ Pudło – ' + GW.G.f1(d) + ' mm od właściwego miejsca' + (q.miss >= 2 ? '. Wskazówka: przeczytaj „JAK to wyznaczamy?” i sprawdź linie odnoszące.' : '. Spróbuj jeszcze raz.') };
      if (q.miss >= 2) $('#stepBox').classList.remove('quizhide');
      q.flash = { p: P, ok: false };
      quizUI();
      v2.setFlash(P);
    }
  }
  function toggleQuiz(on) {
    const q = App.quiz;
    q.on = on === undefined ? !q.on : on;
    q.revealed = new Set();
    q.ok = q.bad = q.skip = 0;
    if (q.on) {
      App.measure.on = false;
      $('#bMeasure').classList.remove('on');
    }
    show(App.k, { anim: false, cam: false, keepUnfold: true });
  }
  $('#bQuiz').onclick = () => toggleQuiz();

  /* ---------- miarka ---------- */
  function snap(P) {
    let best = null,
      bd = 9 / v2.k;
    App.B.p2.forEach((p) => {
      if (p.t !== 'pt') return;
      const d = V.dist(p.p, P);
      if (d < bd) {
        bd = d;
        best = p.p;
      }
    });
    return best ? best.slice() : P;
  }
  function measureClick(P) {
    const m = App.measure;
    const S = snap(P);
    if (!m.a || m.b) {
      m.a = S;
      m.b = null;
    } else m.b = S;
    refreshOverlay();
  }
  function measurePrims() {
    const m = App.measure;
    App.measure.info = null;
    if (!m.on || !m.a) return [];
    const out = [{ t: 'pt', id: 'measure', p: m.a, s: 'dist', r: 3.2 }];
    if (m.b) {
      const d = V.dist(m.a, m.b);
      out.push({ t: 'seg', id: 'measure', a: m.a, b: m.b, s: 'dist' }, { t: 'pt', id: 'measure', p: m.b, s: 'dist', r: 3.2 });
      let extra = '';
      if (App.lesson.measureInfo) extra = App.lesson.measureInfo(ctx(), m.a, m.b) || '';
      out.push({ t: 'text', id: 'measure', p: V.add(V.mid(m.a, m.b), [0, -4 / Math.max(0.2, v2.k / 3)]), txt: GW.G.f1(d) + ' mm' + (extra ? ' | ' + extra.replace(/<[^>]+>/g, '') : ''), s: 'resT' });
      App.measure.info = { measure: 'Miarka: |AB| = ' + GW.G.f1(d) + ' mm (jednostki arkusza)' + (extra ? '<br>' + extra : '') };
    }
    return out;
  }
  $('#bMeasure').onclick = () => {
    const m = App.measure;
    m.on = !m.on;
    m.a = m.b = null;
    $('#bMeasure').classList.toggle('on', m.on);
    if (m.on && App.quiz.on) toggleQuiz(false);
    v2.svg.style.cursor = m.on ? 'crosshair' : '';
    refreshOverlay();
  };

  /* ---------- pokaz kroku ---------- */
  function show(k, o = {}) {
    const B = App.B;
    k = Math.max(0, Math.min(B.steps.length - 1, k));
    const changed = k !== App.k;
    App.k = k;
    const st = B.steps[k];
    const q = App.quiz;
    if (q.on && (!o.keepQuiz || changed)) {
      if (changed || !o.keepQuiz) {
        q.targets = k > 0 && !q.revealed.has(k) ? quizTargets(k) : [];
        q.i = 0;
        q.miss = 0;
        q.shown = [];
        if (!o.keepQuiz) q.last = null;
        if (!q.targets.length) q.revealed.add(k);
      }
    }
    const hideNew = q.on && !q.revealed.has(k) && q.targets.length;
    const F = (p) => GW.passFilter(p, App.filt);
    const vis = (p) => p.from <= k && (p.to === undefined || p.to > k) && F(p);
    let p2 = B.p2.filter(vis),
      p3 = B.p3.filter(vis);
    if (hideNew) {
      p2 = p2.filter((p) => p.from !== k || (q.shown || []).indexOf(p) >= 0);
      p3 = p3.filter((p) => p.from !== k);
    }
    v3.setPrims(p3, { animate: o.anim, step: k });
    v2.setPrims(p2, { animate: o.anim && !hideNew, step: k });
    const src = new Set(st.src || []);
    v3.setSrc(src);
    v2.setSrc(src);
    $('#stepNo').textContent = k + 1 + ' / ' + B.steps.length;
    $('#stepTitle').innerHTML = st.title || '';
    $('#sCo').innerHTML = st.co || '';
    $('#sJak').innerHTML = st.jak || '';
    $('#sWhy').innerHTML = st.why || '';
    $('#stepBox').classList.toggle('quizhide', !!hideNew);
    document.querySelectorAll('#timeline span').forEach((e, i) => {
      e.classList.toggle('cur', i === k);
      e.classList.toggle('done', i < k);
    });
    if (o.cam) {
      if (st.cam) applyCam(st.cam);
      else if (o.firstCam) applyCam(App.lesson.cam0 || 'iso');
    }
    if (!o.keepUnfold) {
      const U = Object.assign({}, st.unfold || {});
      if (U.p1 && B.sys && B.sys.P.p3) U.p3 = U.p1;
      v3.setUnfold(U, !!o.anim);
      unf.value = 0;
      $('#unfoldTxt').textContent = '';
    }
    if (App.lesson.special && App.lesson.special.onStep && changed) App.lesson.special.onStep(ctx(), k);
    else if (App.lesson.special && App.lesson.special.onStep && o.cam) App.lesson.special.onStep(ctx(), k);
    refreshOverlay();
    quizUI();
  }
  App.show = show;
  App.rebuild = rebuild;

  $('#bPrev').onclick = () => show(App.k - 1, { anim: false, cam: true });
  $('#bNext').onclick = () => {
    const q = App.quiz;
    if (q.on && !q.revealed.has(App.k) && q.targets.length) {
      q.skip += q.targets.length - q.i;
      q.i = q.targets.length;
      return quizAdvance();
    }
    show(App.k + 1, { anim: true, cam: true });
  };
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

  /* ---------- tryb kartki ---------- */
  function setPaper(on) {
    document.body.classList.toggle('paper', on);
    $('#bPaper').classList.toggle('on', on);
    store.set('paper', on);
    v2.render(false);
  }
  $('#bPaper').onclick = () => setPaper(!document.body.classList.contains('paper'));

  /* ---------- ściągawka ---------- */
  function openCheat(mod) {
    const box = $('#cheat');
    const m = mod || App.modSel;
    const tabs = GW.modules.map((x) => '<button data-cm="' + x.n + '"' + (x.n === m ? ' class="on"' : '') + '>' + x.n + '. ' + x.s + '</button>').join('');
    box.innerHTML = '<div class="cheatin"><div class="cheathead"><b>Ściągawka – teoria w pigułce</b><span class="cheattabs">' + tabs + '</span><button id="cheatX">✕ Zamknij (Esc)</button></div><div class="cheatbody">' + ((GW.CHEAT && GW.CHEAT[m]) || '') + '</div></div>';
    box.style.display = 'flex';
    box.querySelectorAll('[data-cm]').forEach((b) => (b.onclick = () => openCheat(+b.dataset.cm)));
    $('#cheatX').onclick = closeCheat;
  }
  function closeCheat() {
    $('#cheat').style.display = 'none';
  }
  $('#bCheat').onclick = () => ($('#cheat').style.display === 'flex' ? closeCheat() : openCheat());
  $('#cheat').onclick = (e) => {
    if (e.target.id === 'cheat') closeCheat();
  };
  $('#bKeys').onclick = () => {
    const box = $('#cheat');
    box.innerHTML =
      '<div class="cheatin small"><div class="cheathead"><b>Skróty klawiszowe</b><button id="cheatX">✕</button></div><div class="cheatbody"><table class="keys">' +
      [
        ['← / →', 'poprzedni / następny krok'],
        ['Home / End', 'pierwszy / ostatni krok'],
        ['Spacja', 'autoodtwarzanie'],
        ['1 / 2 / 3', 'układ: tylko 3D / tylko 2D / oba widoki'],
        ['F', 'pokaż / ukryj panel filtrów widoku'],
        ['P', 'rzutnia boczna π₃ (lekcje Monge’a)'],
        ['R', 'tryb „Rozwiąż sam”'],
        ['L', 'losuj wariant zadania'],
        ['K', 'tryb kartki (czarno-biały rysunek)'],
        ['M', 'miarka'],
        ['T', 'ściągawka teorii'],
        ['D', 'dopasuj rysunek 2D'],
        ['Esc', 'zamknij okno'],
      ]
        .map((r) => '<tr><td><kbd>' + r[0] + '</kbd></td><td>' + r[1] + '</td></tr>')
        .join('') +
      '</table></div></div>';
    box.style.display = 'flex';
    $('#cheatX').onclick = closeCheat;
  };

  /* ---------- układ kolumn (przeciąganie) ---------- */
  const main = $('#main');
  let cols = store.get('cols', null);
  let layout = store.get('layout', 3);
  function applyCols() {
    const W = main.clientWidth || window.innerWidth;
    let c = cols || [360, (W - 360) / 2, (W - 360) / 2];
    const side = Math.max(220, Math.min(W * 0.6, c[0]));
    const rest = Math.max(200, W - side - 12);
    let f3 = c[1] / (c[1] + c[2] || 1);
    if (layout === 1) f3 = 1;
    if (layout === 2) f3 = 0;
    main.style.gridTemplateColumns = side + 'px 6px ' + (layout === 2 ? '0px' : f3 * 100 + 'fr') + ' 6px ' + (layout === 1 ? '0px' : (1 - f3) * 100 + 'fr');
    main.dataset.layout = layout;
    void rest;
  }
  function startDrag(which, e) {
    e.preventDefault();
    const W = main.clientWidth;
    const r = main.getBoundingClientRect();
    const side0 = $('#side').getBoundingClientRect().width;
    const move = (ev) => {
      const x = ev.clientX - r.left;
      if (which === 0) {
        const side = Math.max(220, Math.min(W * 0.6, x));
        const a = $('#v3wrap').getBoundingClientRect().width,
          b = $('#v2wrap').getBoundingClientRect().width;
        cols = [side, a, b];
      } else {
        const side = $('#side').getBoundingClientRect().width;
        const a = Math.max(120, x - side - 6),
          b = Math.max(120, W - side - 12 - a);
        cols = [side, a, b];
      }
      applyCols();
    };
    const up = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      store.set('cols', cols);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    void side0;
  }
  document.querySelectorAll('.gutter').forEach((g, i) => {
    g.addEventListener('mousedown', (e) => startDrag(i, e));
    g.addEventListener('dblclick', () => {
      cols = null;
      store.set('cols', null);
      applyCols();
    });
  });
  function setLayout(n) {
    layout = n;
    store.set('layout', n);
    applyCols();
    document.querySelectorAll('[data-lay]').forEach((b) => b.classList.toggle('on', +b.dataset.lay === n));
  }
  document.querySelectorAll('[data-lay]').forEach((b) => (b.onclick = () => setLayout(+b.dataset.lay)));
  window.addEventListener('resize', applyCols);
  /* zakładki na telefonie */
  document.querySelectorAll('#tabs button').forEach(
    (b) =>
      (b.onclick = () => {
        document.body.dataset.tab = b.dataset.tab;
        document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
        window.dispatchEvent(new Event('resize'));
      })
  );
  document.body.dataset.tab = 'side';

  /* ---------- klawiatura ---------- */
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    if (k === 'Escape') return closeCheat();
    if (k === 'ArrowRight') $('#bNext').click();
    else if (k === 'ArrowLeft') $('#bPrev').click();
    else if (k === 'Home') show(0, { anim: false, cam: true });
    else if (k === 'End') show(App.B.steps.length - 1, { anim: false, cam: true });
    else if (k === ' ') {
      e.preventDefault();
      $('#bPlay').click();
    } else if (k === '1' || k === '2' || k === '3') setLayout(+k);
    else if (k === 'f' || k === 'F') {
      const d = $('#viewBox');
      d.open = !d.open;
      if (d.open) d.scrollIntoView({ block: 'nearest' });
    } else if (k === 'p' || k === 'P') {
      const c = $('#cbP3');
      if (c && !c.disabled) setP3(!GW.view.p3);
    } else if (k === 'r' || k === 'R') toggleQuiz();
    else if (k === 'l' || k === 'L') {
      if ((App.lesson.params || []).length) randomVariant();
    } else if (k === 'k' || k === 'K') $('#bPaper').click();
    else if (k === 'm' || k === 'M') $('#bMeasure').click();
    else if (k === 't' || k === 'T') $('#bCheat').click();
    else if (k === 'd' || k === 'D') fit2();
  });

  buildMods();
  applyCols();
  setLayout(layout);
  if (store.get('paper', false)) setPaper(true);
  const [hash, hstep] = location.hash.slice(1).split('/');
  const L0 = GW.lessons.find((l) => l.id === hash);
  selectModule(L0 ? L0.mod : 1, L0 ? L0.id : null);
  if (hstep) show(+hstep - 1, { anim: false, cam: true });
})();
