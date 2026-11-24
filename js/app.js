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
    quiz: null,
    measure: { on: false, a: null, b: null },
    zsMode: 'auto',
    zs: 1,
    sub: 0,
    subs: null,
    eng: !!store.get('eng', false),
    dims: !!store.get('dims', false),
    ui: Object.assign({}, GW.UIDEF, store.get('ui', {})),
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
  App.quiz = GW.makeQuiz(App, { $, store, v2, show: (k, o) => show(k, o) });

  function infoOf(id) {
    if (!id) return '';
    return (App.B && App.B.infoMap[id]) || (App.ovInfo && App.ovInfo[id]) || '';
  }
  function hover(id, from3d) {
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
    const g = App.ui.geo ? GW.geoInfo(App, id, from3d) : '';
    if (t || g) {
      tip.innerHTML = (t || '') + (g ? '<div class="geo">' + g + '</div>' : '') + (App.ui.cursor ? '<div class="geo tipc"></div>' : '');
      tip.style.display = 'block';
      placeTip();
    } else tip.style.display = 'none';
  }
  v3.onHover = (id) => hover(id, true);
  v2.onHover = (id) => hover(id, false);
  /* współrzędne przy kursorze */
  const mkLab = (el) => {
    const d = document.createElement('div');
    d.className = 'cursorlab';
    el.appendChild(d);
    return d;
  };
  const cl2 = mkLab($('#v2')),
    cl3 = mkLab($('#v3'));
  const cursorMove = (lab, txt, id, scr) => {
    const tc = tip.querySelector('.tipc');
    if (id && tc) tc.textContent = txt ? '📍 ' + txt : '';
    if (!txt || !App.ui.cursor || id) {
      lab.style.display = 'none';
      return;
    }
    lab.textContent = txt;
    lab.style.display = 'block';
    const W = lab.parentNode.clientWidth;
    const x = scr[0] + 16 + lab.offsetWidth > W ? scr[0] - lab.offsetWidth - 10 : scr[0] + 16;
    lab.style.left = x + 'px';
    lab.style.top = scr[1] + 18 + 'px';
  };
  v2.onCursor = (P, e, id, scr) => cursorMove(cl2, P && App.B ? GW.coords2(App, P) : '', id, scr);
  v3.onCursor = (P, e, id, scr) => cursorMove(cl3, P && App.B ? GW.coords3(App, P) : '', id, scr);

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
    if (App.quiz.active()) return;
    if (App.measure.on) return;
    const pid = planeOfId(id);
    if (pid && App.B.sys) observer(pid);
    if (App.lesson.special && App.lesson.special.click) App.lesson.special.click(ctx(), id);
  };
  v2.onSheetClick = (P) => {
    if (App.quiz.click(P)) return;
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
    document.querySelectorAll('#mods button').forEach((b) => (b.classList.toggle('on', +b.dataset.m === n), b.setAttribute('aria-pressed', String(+b.dataset.m === n))));
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
    else if (L) document.querySelectorAll('#lessonbar button').forEach((b) => (b.classList.toggle('on', b.dataset.id === L.id), b.setAttribute('aria-pressed', String(b.dataset.id === L.id))));
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
    document.querySelectorAll('#lessonbar button').forEach((b) => (b.classList.toggle('on', b.dataset.id === L.id), b.setAttribute('aria-pressed', String(b.dataset.id === L.id))));
    App.P = {};
    (L.params || []).forEach((p) => (App.P[p.k] = p.v));
    (L.opts || []).forEach((p) => (App.P[p.k] = p.v));
    App.S = {};
    ((L.special && L.special.ui) || []).forEach((u) => {
      if (u.k) App.S[u.k] = u.persist ? store.get(u.persist, u.v) : u.v;
    });
    $('#algo').innerHTML = L.algo || '';
    $('#v2title').innerHTML = L.v2title || 'Rysunek 2D';
    $('#legend').innerHTML = L.legend || defaultLegend;
    buildMistakes();
    buildParams();
    buildGen();
    v3.frameHooks = [];
    v2.onBgMove = null;
    App.quiz.reset();
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
      s.setAttribute('aria-label', p.l);
      p.choices.forEach(([v, t]) => {
        const o = document.createElement('option');
        o.value = v;
        o.textContent = t;
        s.appendChild(o);
      });
      if (p.k === 'set' && App.P.set === 'gen' && !p.choices.some((c) => c[0] === 'gen')) {
        const o = document.createElement('option');
        o.value = 'gen';
        o.textContent = '🎲 wygenerowane zadanie';
        s.appendChild(o);
      }
      s.value = App.P[p.k];
      s.dataset.k = p.k;
      s.onchange = () => {
        App.P[p.k] = isNaN(+s.value) ? s.value : +s.value;
        if (p.onSet) p.onSet(App.P);
        if (p.rebuildParams) {
          buildParams();
        }
        App.quiz.reset();
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
      r.setAttribute('aria-label', p.l);
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
    App.quiz.reset();
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
        r.setAttribute('aria-label', u.l.replace(/<[^>]+>/g, ''));
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
      } else if (u.type === 'select') {
        btnRow = null;
        const d = document.createElement('label');
        d.className = 'prmsel';
        d.style.display = 'block';
        d.appendChild(document.createTextNode(u.l + ': '));
        const s = document.createElement('select');
        u.choices.forEach(([v, t]) => {
          const o = document.createElement('option');
          o.value = v;
          o.textContent = t;
          s.appendChild(o);
        });
        s.value = App.S[u.k];
        u._el = s;
        s.onchange = () => {
          App.S[u.k] = s.value;
          if (u.persist) store.set(u.persist, s.value);
          u.onchange && u.onchange(ctx());
          refreshOverlay();
        };
        d.appendChild(s);
        box.appendChild(d);
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
      else if (u.type === 'select') u._el.value = v;
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
    if (App.dims && App.B) p2 = p2.concat(GW.autoDims(App));
    if (App.eng && App.fitBox) p2 = p2.concat(GW.engSheet(App, engBox()));
    const F = (p) => GW.passFilter(p, App.filt) || p.id === 'measure' || /^(dim|frame)/.test(p.id || '');
    v3.setOverlay(p3.filter(F));
    const o2 = p2.filter(F);
    // nie przerysowuj arkusza bez potrzeby (zachowuje podświetlenie pod kursorem)
    if (o2.length || v2.ov.length) v2.setOverlay(o2);
  }
  App.refreshOverlay = refreshOverlay;

  function buildOnce(p3x, P) {
    const L = App.lesson;
    const B = new GW.Builder();
    if (p3x != null) B.p3x = p3x;
    try {
      L.build(P || App.P, B);
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
    App.quiz.reset();
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
      const e = document.createElement('button');
      e.type = 'button';
      e.textContent = i + 1;
      e.title = (s.title || '').replace(/<[^>]+>/g, '');
      e.setAttribute('aria-label', 'Krok ' + (i + 1) + ': ' + e.title);
      e.onclick = () => show(i, { anim: true, cam: true, subEnd: true });
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

  /* ---------- tryb „Rozwiąż sam” (logika w quiz.js) ---------- */
  function toggleQuiz(on) {
    App.quiz.toggle(on);
    if (App.quiz.on && App.measure.on) {
      App.measure.on = false;
      App.measure.a = App.measure.b = null;
      $('#bMeasure').classList.remove('on');
      v2.svg.style.cursor = '';
      refreshOverlay();
    }
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
    if (m.on && App.quiz.on) App.quiz.toggle(false);
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
    const QZ = App.quiz;
    QZ.enter(k);
    App.subs = App.ui.subs && !QZ.on ? GW.subSteps(B, k) : null;
    if (App.subs) App.sub = o.subEnd ? App.subs.length - 1 : Math.max(0, Math.min(App.subs.length - 1, o.sub != null ? o.sub : changed ? 0 : App.sub));
    else App.sub = 0;
    const lim = App.subs ? App.subs[App.sub].maxSeq : Infinity;
    const minNew = App.subs && App.sub > 0 ? App.subs[App.sub - 1].maxSeq : -Infinity;
    const ENG_HIDE = { aux: 1, auxplanes: 1, rays: 1, text: 1 };
    const F = (p) => GW.passFilter(p, App.filt) && !(App.eng && ENG_HIDE[GW.catOf(p)]);
    const vis = (p) => p.from <= k && (p.to === undefined || p.to > k) && F(p) && !(p.from === k && p.seq != null && p.seq > lim);
    const isNew = (p) => p.from === k && (p.seq == null || p.seq > minNew);
    // w trybie „Rozwiąż sam” nierozwiązany krok rysuje quiz (ukryte nowe elementy, zadania)
    const qv = QZ.view(k, F);
    let p2, p3, isNew2 = isNew, isNew3 = isNew;
    if (qv) {
      p2 = qv.p2;
      p3 = qv.p3;
      const fid = new Set([...qv.fresh].map((p) => p.id));
      isNew2 = (p) => qv.fresh.has(p);
      isNew3 = (p) => fid.has(p.id);
    } else {
      p2 = B.p2.filter(vis);
      p3 = B.p3.filter(vis);
    }
    v3.setPrims(p3, { animate: o.anim, step: k, isNew: isNew3 });
    v2.setPrims(p2, { animate: o.anim, step: k, isNew: isNew2 });
    const src = new Set(st.src || []);
    v3.setSrc(src);
    v2.setSrc(src);
    $('#stepNo').textContent = k + 1 + ' / ' + B.steps.length + (App.subs ? ' · ' + (App.sub + 1) + '/' + App.subs.length : '');
    subUI();
    $('#stepTitle').innerHTML = st.title || '';
    $('#sCo').innerHTML = st.co || '';
    $('#sJak').innerHTML = st.jak || '';
    $('#sWhy').innerHTML = st.why || '';
    $('#stepBox').classList.toggle('quizhide', !!qv && !qv.jak);
    $('#stepBox').classList.toggle('quizorder', !!qv && qv.mode === 'order');
    document.querySelectorAll('#timeline button').forEach((e, i) => {
      e.classList.toggle('cur', i === k);
      e.classList.toggle('done', i < k);
      const g = QZ.on ? QZ.grade(i) : null;
      ['perfect', 'ok', 'shown'].forEach((c) => e.classList.toggle('q' + c, g === c));
      const t = (B.steps[i].title || '').replace(/<[^>]+>/g, '');
      e.title = QZ.isDone(i) ? t : 'Krok ' + (i + 1);
      e.setAttribute('aria-label', 'Krok ' + (i + 1) + (QZ.isDone(i) ? ': ' + t : ''));
      if (i === k) e.setAttribute('aria-current', 'step');
      else e.removeAttribute('aria-current');
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
    QZ.ui();
  }
  App.show = show;
  App.rebuild = rebuild;

  function subUI() {
    const sb = $('#subBox');
    if (!App.subs) {
      sb.style.display = 'none';
      return;
    }
    const n = App.subs.length,
      j = App.sub;
    sb.style.display = 'block';
    sb.innerHTML =
      '<h4>✍ Rysujemy: podkrok ' + (j + 1) + ' z ' + n + ' <span class="subdots">' + App.subs.map((_, i) => '<i class="' + (i <= j ? 'on' : '') + '"></i>').join('') + '</span><span class="subnav"><button type="button" id="subPrev" aria-label="Poprzedni podkrok">◀</button><button type="button" id="subNext" aria-label="Następny podkrok">▶</button><button type="button" id="subAll">cały krok</button></span></h4>' +
      GW.draftText(App.subs[j], App.B, App);
    $('#subPrev').onclick = () => $('#bPrev').click();
    $('#subNext').onclick = () => $('#bNext').click();
    $('#subAll').onclick = () => show(App.k, { subEnd: true, anim: false, keepUnfold: true });
  }
  $('#bPrev').onclick = () => {
    if (App.subs && App.sub > 0) return show(App.k, { sub: App.sub - 1, anim: false, keepUnfold: true });
    show(App.k - 1, { anim: false, cam: true, subEnd: true });
  };
  $('#bNext').onclick = () => {
    if (App.quiz.next()) return;
    if (App.subs && App.sub < App.subs.length - 1) return show(App.k, { sub: App.sub + 1, anim: true, keepUnfold: true });
    show(App.k + 1, { anim: true, cam: true, sub: 0 });
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
      if (App.k >= App.B.steps.length - 1 && !(App.subs && App.sub < App.subs.length - 1)) return stopPlay();
      $('#bNext').click();
    }, 3000);
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
  let cheatReturn = null;
  function openCheat(mod) {
    const box = $('#cheat');
    if (box.style.display !== 'flex') cheatReturn = document.activeElement;
    const m = mod || App.modSel;
    const tabs = GW.modules.map((x) => '<button data-cm="' + x.n + '"' + (x.n === m ? ' class="on"' : '') + '>' + x.n + '. ' + x.s + '</button>').join('');
    box.innerHTML = '<div class="cheatin"><div class="cheathead"><b>Ściągawka – teoria w pigułce</b><span class="cheattabs">' + tabs + '</span><button id="cheatX">✕ Zamknij (Esc)</button></div><div class="cheatbody">' + ((GW.CHEAT && GW.CHEAT[m]) || '') + '</div></div>';
    box.style.display = 'flex';
    box.querySelectorAll('[data-cm]').forEach((b) => (b.onclick = () => openCheat(+b.dataset.cm)));
    $('#cheatX').onclick = closeCheat;
    $('#cheatX').focus();
  }
  function closeCheat() {
    if ($('#cheat').style.display === 'none') return;
    $('#cheat').style.display = 'none';
    if (cheatReturn && cheatReturn.focus) cheatReturn.focus();
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
        ['H', '„Rozwiąż sam”: kolejna podpowiedź'],
        ['L', 'losuj wariant zadania'],
        ['K', 'tryb kartki (czarno-biały rysunek)'],
        ['M', 'miarka (dwa kliknięcia)'],
        ['E', 'rysunek techniczny (ramka, tabliczka, linie wg norm)'],
        ['W', 'wymiary na rysunku 2D'],
        ['G', 'wygeneruj nowe zadanie'],
        ['T', 'ściągawka teorii'],
        ['D', 'dopasuj rysunek 2D'],
        ['Esc', 'zamknij okno'],
        ['Tab', 'przechodzenie między przyciskami i suwakami'],
      ]
        .map((r) => '<tr><td><kbd>' + r[0] + '</kbd></td><td>' + r[1] + '</td></tr>')
        .join('') +
      '</table></div></div>';
    cheatReturn = document.activeElement;
    box.style.display = 'flex';
    $('#cheatX').onclick = closeCheat;
    $('#cheatX').focus();
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
    if (e.key === 'Escape') return closeCheat();
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if ((e.key === ' ' || e.key === 'Enter') && e.target.tagName === 'BUTTON') return;
    const k = e.key;
    if (k === 'ArrowRight') $('#bNext').click();
    else if (k === 'ArrowLeft') $('#bPrev').click();
    else if (k === 'Home') show(0, { anim: false, cam: true, subEnd: true });
    else if (k === 'End') show(App.B.steps.length - 1, { anim: false, cam: true, subEnd: true });
    else if (k === 'e' || k === 'E') $('#bEng').click();
    else if (k === 'w' || k === 'W') $('#bDims').click();
    else if (k === 'g' || k === 'G') $('#genGo') && $('#genGo').click();
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
    else if ((k === 'h' || k === 'H') && App.quiz.on) App.quiz.hint();
    else if (k === 'l' || k === 'L') {
      if ((App.lesson.params || []).length) randomVariant();
    } else if (k === 'k' || k === 'K') $('#bPaper').click();
    else if (k === 'm' || k === 'M') $('#bMeasure').click();
    else if (k === 't' || k === 'T') $('#bCheat').click();
    else if (k === 'd' || k === 'D') fit2();
  });


  /* ---------- rysunek techniczny, wymiary, ustawienia ---------- */
  function engBox() {
    const b = App.fitBox || [0, 0, 100, 100];
    const m = App.dims ? 16 : 4;
    return [b[0] - m, b[1] - m, b[2] + m, b[3] + m];
  }
  function setEng(on) {
    App.eng = on;
    store.set('eng', on);
    document.body.classList.toggle('eng', on);
    v2.eng = on;
    $('#bEng').classList.toggle('on', on);
    $('#bEng').setAttribute('aria-pressed', String(on));
    show(App.k, { anim: false, cam: false, keepUnfold: true });
    if (on) {
      const fr = GW.engSheet(App, engBox()).find((p) => p.id === 'frameOuter');
      if (fr) {
        const bb = GW.G.bbox2(fr.pts);
        v2.fit([bb[0] - 4, bb[1] - 4, bb[2] + 4, bb[3] + 4]);
      }
    } else fit2();
  }
  function setDims(on) {
    App.dims = on;
    store.set('dims', on);
    $('#bDims').classList.toggle('on', on);
    $('#bDims').setAttribute('aria-pressed', String(on));
    refreshOverlay();
  }
  $('#bEng').onclick = () => setEng(!App.eng);
  $('#bDims').onclick = () => setDims(!App.dims);
  $('#bUI').onclick = () =>
    GW.openSettings(App, store, () => {
      show(App.k, { anim: false, cam: false, keepUnfold: true });
    });
  App.syncParamUI = () => syncParamUI();
  App.buildOnce = buildOnce;

  /* ---------- generator zadań ---------- */
  function buildGen() {
    const L = App.lesson;
    const box = $('#genbox');
    const g = L.gen || GW.defaultGen(L);
    if (!App.genCfg || App.genCfg.lid !== L.id) {
      App.genCfg = { lid: L.id, level: '2', type: g.types ? g.types[0][0] : null };
      (g.opts || []).forEach((o) => (App.genCfg[o.k] = o.v));
    }
    const c = App.genCfg;
    let html = '<div class="prmsel">Poziom trudności: <select id="genLevel" aria-label="Poziom trudności">' + GW.LEVELS.map(([v, t]) => '<option value="' + v + '"' + (v === c.level ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
    if (g.types) html += '<div class="prmsel">Typ zadania: <select id="genType" aria-label="Typ zadania">' + g.types.map(([v, t]) => '<option value="' + v + '"' + (v === c.type ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
    (g.opts || []).forEach((o) => {
      if (o.type === 'check') html += '<label class="prmsel" style="display:block"><input type="checkbox" data-go="' + o.k + '"' + (c[o.k] ? ' checked' : '') + '> ' + o.l + '</label>';
      else if (o.type === 'select') html += '<div class="prmsel">' + o.l + ': <select data-go="' + o.k + '" aria-label="' + o.l + '">' + o.choices.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(c[o.k]) ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></div>';
      else if (o.type === 'range') html += '<div class="prm"><span>' + o.l + '</span><input type="range" data-go="' + o.k + '" aria-label="' + o.l + '" min="' + o.min + '" max="' + o.max + '" step="' + (o.step || 1) + '" value="' + c[o.k] + '"><output>' + c[o.k] + '</output></div>';
    });
    html += '<div class="spbtns"><button type="button" id="genGo">🎲 Generuj zadanie (G)</button><button type="button" id="genBack">Wróć do zadania z listy</button></div><div id="genres" class="spnote">' + (c.msg || (g.note || 'Wybierz poziom' + (g.types ? ' i typ' : '') + ', a następnie kliknij „Generuj” – wszystkie dane (punkty, bryły, wymiary, teren…) zostaną wylosowane z zachowaniem poprawności zadania.')) + '</div>';
    box.innerHTML = html;
    $('#genLevel').onchange = (e) => (c.level = e.target.value);
    if ($('#genType')) $('#genType').onchange = (e) => (c.type = e.target.value);
    box.querySelectorAll('[data-go]').forEach((el) => {
      el.oninput = el.onchange = () => {
        c[el.dataset.go] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
        if (el.type === 'range') el.nextElementSibling.textContent = el.value;
      };
    });
    $('#genGo').onclick = () => generate();
    $('#genBack').onclick = () => {
      App.P = {};
      (L.params || []).forEach((p) => (App.P[p.k] = p.v));
      (L.opts || []).forEach((p) => (App.P[p.k] = p.v));
      c.msg = '';
      buildParams();
      buildGen();
      rebuild({ first: true });
      show(0, { anim: true, cam: true, firstCam: true });
    };
  }
  function generate() {
    const L = App.lesson;
    const g = L.gen || GW.defaultGen(L);
    const c = App.genCfg;
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    let found = null;
    for (let t = 0; t < 60 && !found; t++) {
      const R = GW.rng(seed + t * 7919);
      let patch;
      try {
        patch = g.make(c, R, App.P);
      } catch (e) {
        continue;
      }
      if (!patch) continue;
      const P = Object.assign({}, App.P, patch);
      const B = buildOnce(null, P);
      const ok = !B._err && B.steps.length >= 3 && B.data.ok !== false && !B.steps.some((s) => /^Brak/.test(s.title || '')) && (!g.valid || g.valid(B, c, P));
      if (ok) found = patch;
    }
    if (!found) {
      c.msg = '⚠ Nie udało się wylosować poprawnego zadania przy tych ustawieniach – spróbuj ponownie albo zmień poziom/typ.';
      buildGen();
      return;
    }
    delete document.body.dataset.err;
    Object.assign(App.P, found);
    c.msg = '✔ ' + (found._desc || 'Wygenerowano nowe zadanie.') + ' Przejdź kroki od początku (→) albo włącz „Rozwiąż sam”.';
    App.quiz.reset();
    buildParams();
    buildGen();
    rebuild({ first: true });
    show(0, { anim: true, cam: true, firstCam: true });
  }
  App.generate = generate;

  GW.applyUI(App, App.ui);
  if (App.eng) {
    document.body.classList.add('eng');
    v2.eng = true;
    $('#bEng').classList.add('on');
  }
  if (App.dims) $('#bDims').classList.add('on');
  buildMods();
  applyCols();
  setLayout(layout);
  if (store.get('paper', false)) setPaper(true);
  const [hash, hstep] = location.hash.slice(1).split('/');
  const L0 = GW.lessons.find((l) => l.id === hash);
  selectModule(L0 ? L0.mod : 1, L0 ? L0.id : null);
  if (hstep) show(+hstep - 1, { anim: false, cam: true, subEnd: true });
})();
