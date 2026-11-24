#!/usr/bin/env node
/* ===================================================================
   Generator statycznych stron kursu (SEO) – kurs/*.html, sitemap.xml
   Uruchom z katalogu głównego repozytorium:   node tools/build-seo.js
   Treść (tytuły, opisy kroków CO / JAK / DLACZEGO, ściągawki, typowe
   błędy) jest pobierana z tych samych plików JS co aplikacja, więc po
   zmianie lekcji wystarczy ponownie uruchomić skrypt.
   =================================================================== */
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://benozolorenozo.github.io/grafika-inzynierska-pwr/';
const SITE = 'GrafInż PWr';
const OUT = path.join(ROOT, 'kurs');
const TODAY = new Date().toISOString().slice(0, 10);
const ver = (fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').match(/\?v=(\w+)/) || [])[1] || '1';

/* ---------- wczytanie aplikacji w piaskownicy ---------- */
const win = { console, Math, Date, JSON };
win.window = win;
vm.createContext(win);
['math', 'core', 'teoria', 'tools', 'lessons/m1', 'lessons/m2', 'lessons/m3', 'lessons/m4', 'lessons/m5', 'lessons/m6', 'generators'].forEach((f) =>
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), win, { filename: f + '.js' })
);
const GW = win.GW;

/* ---------- narzędzia tekstowe ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ENT = { '&gt;': '>', '&lt;': '<', '&amp;': '&', '&nbsp;': ' ', '&quot;': '"', '&#39;': "'" };
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉' };
const plain = (h) =>
  String(h || '')
    .replace(/<sub>(\d+)<\/sub>/g, (m, d) => d.replace(/\d/g, (c) => SUB[c]))
    .replace(/<\/(li|p|h\d|tr|div)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z#0-9]+;/g, (e) => ENT[e] || ' ')
    .replace(/\s+/g, ' ')
    .trim();
const cut = (s, n) => (s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1) > n * 0.6 ? s.lastIndexOf(' ', n - 1) : n - 1).replace(/[\s,;:–-]+$/, '') + '…');
// HTML z opisów aplikacji: bez atrybutów zdarzeń i stylów interaktywnych, bez pustych akapitów
const clean = (h) =>
  String(h || '')
    .replace(/\s(on\w+|data-[\w-]+|tabindex|role)="[^"]*"/g, '')
    .replace(/<button[^>]*>[\s\S]*?<\/button>/g, '')
    .trim();
const slugTitle = (t) => t.replace(/^\d+\.\d+\s*/, '');
const listaTxt = (l) =>
  l
    ? l
        .split(/[,;]\s*/)
        .map((x) => x.replace(/^L(\d+)\s*Z(\w+)/, 'Lista $1, zadanie $2').replace(/^L(\d+)$/, 'Lista $1'))
        .join('; ')
    : '';

const MODDESC = {
  1: 'Rzuty Monge’a od podstaw: rzut punktu i prostej, ślady prostej i płaszczyzny, przebicie prostej z płaszczyzną (płaszczyzna rzutująca, transformacja), rzeczywista wielkość figury na rzutniach dodatkowych π₄ i π₅, przenikanie trójkątów i rzutnia boczna π₃.',
  2: 'Przenikanie wielościanów (graniastosłupów i ostrosłupów): metoda krawędzi i płaszczyzn pomocniczych, kolejność łączenia punktów linii przenikania i widoczność – zadania typowe dla kolokwium.',
  3: 'Przenikanie brył obrotowych – walca, stożka i kuli – metodą płaszczyzn pomocniczych (plasterkową): punkty charakterystyczne, przebieg krzywej przenikania i widoczność; bryły obrotowe z wielościanami.',
  4: 'Aksonometria: izometria, dimetria, perspektywa kawalerska i wojskowa; przekrój bryły płaszczyzną metodą śladów oraz kład przekroju w rzeczywistej wielkości.',
  5: 'Rzut cechowany: stopniowanie prostej, warstwice i skala nachylenia płaszczyzny, przebicia i krawędzie płaszczyzn, roboty ziemne – nasypy i wykopy przy platformach i drogach, skarpy wyznaczane stożkami.',
  6: 'Perspektywa: aparat rzutowy, metoda punktów zbiegu, perspektywa czołowa z rzutów prostokątnych (punkt główny, punkt odległości) oraz konstrukcja cieni.',
};

/* ---------- budowa danych lekcji ---------- */
const mods = GW.modules.map((m) => ({ ...m, lessons: [] }));
const lessons = GW.lessons.map((L) => {
  const P = {};
  (L.params || []).forEach((p) => (P[p.k] = p.v));
  (L.opts || []).forEach((p) => (P[p.k] = p.v));
  const B = new GW.Builder();
  try {
    L.build(P, B);
  } catch (e) {
    console.warn('! ' + L.id + ': ' + e.message);
  }
  const rec = { L, steps: B.steps, file: L.id + '.html', title: slugTitle(L.title), num: (L.title.match(/^\d+\.\d+/) || [''])[0] };
  rec.desc = cut(rec.title + ' – rozwiązanie krok po kroku (' + B.steps.length + ' kroków, rysunek 2D i model 3D). ' + (plain(L.algo) || plain(B.steps[0] && B.steps[0].co)), 158);
  mods[L.mod - 1].lessons.push(rec);
  return rec;
});
mods.forEach((m) => (m.file = 'modul-' + m.n + '.html'));

/* ---------- szablon strony ---------- */
function page({ file, title, desc, h1, crumbs, body, ld, ogType }) {
  const url = BASE + 'kurs/' + (file === 'index.html' ? '' : file);
  const bc = {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: c[1] ? BASE + c[1] : url })),
  };
  const graph = [bc].concat(ld || []);
  return `<!doctype html>
<html lang="pl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${ogType || 'article'}">
<meta property="og:site_name" content="${SITE}">
<meta property="og:locale" content="pl_PL">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${BASE}og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="../favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="../apple-touch-icon.png">
<meta name="theme-color" content="#1d4f9c">
<link rel="stylesheet" href="kurs.css?v=${ver}">
<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })}</script>
</head>
<body>
<a class="skip" href="#tresc">Przejdź do treści</a>
<header class="top">
  <a class="brand" href="../index.html"><img src="../favicon.svg" alt="" width="28" height="28"> ${SITE}</a>
  <nav aria-label="Nawigacja główna">
    <a href="index.html">Kurs</a>
    <a href="../index.html" class="cta">▶ Aplikacja 3D</a>
  </nav>
</header>
<nav class="crumbs" aria-label="Okruszki"><ol>${crumbs
    .map((c, i) => (i < crumbs.length - 1 ? `<li><a href="${c[1] === '' ? '../index.html' : c[1].replace(/^kurs\//, '') || 'index.html'}">${esc(c[0])}</a></li>` : `<li aria-current="page">${esc(c[0])}</li>`))
    .join('')}</ol></nav>
<main id="tresc">
<h1>${h1}</h1>
${body}
</main>
<footer class="foot">
  <p><b>${SITE}</b> – nieoficjalny, studencki portal do nauki geometrii wykreślnej i grafiki inżynierskiej. Nie jest oficjalnym materiałem Politechniki Wrocławskiej.</p>
  <p><a href="index.html">Spis lekcji</a> · <a href="../index.html">Aplikacja interaktywna</a> · <a href="../informacje.html">Informacje i prywatność</a></p>
</footer>
</body>
</html>
`;
}

const ORG = { '@type': 'Organization', name: SITE, url: BASE };
const COURSE_ID = BASE + 'kurs/#kurs';
const courseRef = { '@type': 'Course', '@id': COURSE_ID, name: 'Geometria wykreślna i grafika inżynierska – kurs krok po kroku' };
const openApp = (id, step, txt) => `<a class="cta" href="../index.html#${id}${step ? '/' + step : ''}">${txt}</a>`;
const lessonList = (m) =>
  '<ul class="lessons">' +
  m.lessons
    .map(
      (r) =>
        `<li><a href="${r.file}"><b>${esc(r.num)}</b> ${esc(r.title)}</a>${r.L.lista ? ' <span class="badge" title="Zadanie z listy ćwiczeniowej">📋 ' + esc(listaTxt(r.L.lista)) + '</span>' : ''}<p>${esc(r.desc)}</p></li>`
    )
    .join('') +
  '</ul>';

fs.mkdirSync(OUT, { recursive: true });
const written = [];
const write = (f, html) => {
  fs.writeFileSync(path.join(OUT, f), html.replace(/\n/g, '\r\n'));
  written.push(f);
};

/* ---------- strona spisu kursu ---------- */
write(
  'index.html',
  page({
    file: 'index.html',
    title: 'Geometria wykreślna – kurs krok po kroku: spis lekcji | ' + SITE,
    desc: 'Darmowy kurs geometrii wykreślnej i grafiki inżynierskiej: rzuty Monge’a, przenikanie wielościanów i brył obrotowych, aksonometria, rzut cechowany, perspektywa. ' + lessons.length + ' lekcji krok po kroku.',
    h1: 'Geometria wykreślna i grafika inżynierska – kurs krok po kroku',
    ogType: 'website',
    crumbs: [[SITE, ''], ['Kurs', 'kurs/']],
    ld: [
      {
        ...courseRef,
        description: 'Interaktywny kurs geometrii wykreślnej (1. semestr studiów technicznych): ' + mods.map((m) => m.t).join(', ') + '. Każda konstrukcja rozpisana na kroki z opisem co, jak i dlaczego.',
        inLanguage: 'pl',
        isAccessibleForFree: true,
        educationalLevel: 'Studia I stopnia',
        provider: ORG,
        hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: 'PT20H' },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'PLN', category: 'Free' },
        hasPart: lessons.map((r) => ({ '@type': 'LearningResource', name: r.L.title, url: BASE + 'kurs/' + r.file })),
      },
    ],
    body:
      `<p class="lead">Nieoficjalny, studencki kurs <b>geometrii wykreślnej</b> i <b>grafiki inżynierskiej</b> (1. semestr studiów technicznych, z myślą o studentach PWr). Każda konstrukcja jest rozpisana <b>krok po kroku</b>: co kreślimy, jak to wyznaczyć na rysunku i dlaczego to działa w przestrzeni. W aplikacji każdy krok ma model 3D powiązany z rysunkiem 2D, a w trybie „Rozwiąż sam” możesz sprawdzić się przed kolokwium.</p>
<p>${openApp('', 0, '▶ Otwórz aplikację interaktywną (3D + 2D)')}</p>
` +
      mods
        .map(
          (m) =>
            `<section class="mod"><h2><a href="${m.file}">Moduł ${m.n}. ${esc(m.t)}</a></h2><p>${esc(MODDESC[m.n])}</p>${lessonList(m)}</section>`
        )
        .join('\n'),
  })
);

/* ---------- strony modułów ---------- */
mods.forEach((m, mi) => {
  const cheat = GW.CHEAT && GW.CHEAT[m.n];
  const mist = (GW.MISTAKES && GW.MISTAKES[m.n]) || [];
  const prev = mods[mi - 1],
    next = mods[mi + 1];
  write(
    m.file,
    page({
      file: m.file,
      title: m.t + ' – geometria wykreślna, teoria i zadania krok po kroku | ' + SITE,
      desc: cut(MODDESC[m.n], 158),
      h1: 'Moduł ' + m.n + '. ' + esc(m.t),
      crumbs: [[SITE, ''], ['Kurs', 'kurs/'], ['Moduł ' + m.n + '. ' + m.t, 'kurs/' + m.file]],
      ld: [
        {
          '@type': 'LearningResource',
          name: m.t,
          description: MODDESC[m.n],
          inLanguage: 'pl',
          isAccessibleForFree: true,
          learningResourceType: 'Lesson',
          isPartOf: courseRef,
          hasPart: m.lessons.map((r) => ({ '@type': 'LearningResource', name: r.L.title, url: BASE + 'kurs/' + r.file })),
        },
      ],
      body:
        `<p class="lead">${esc(MODDESC[m.n])}</p>
<h2>Lekcje</h2>
${lessonList(m)}
` +
        (cheat ? `<h2>Teoria w pigułce</h2>\n<div class="cheat">${clean(cheat)}</div>\n` : '') +
        (mist.length ? `<h2>Typowe błędy na kolokwium</h2>\n<ul class="mist">${mist.map((x) => '<li>' + clean(x) + '</li>').join('')}</ul>\n` : '') +
        `<nav class="pn" aria-label="Moduły">${prev ? `<a rel="prev" href="${prev.file}">← Moduł ${prev.n}. ${esc(prev.t)}</a>` : '<span></span>'}${next ? `<a rel="next" href="${next.file}">Moduł ${next.n}. ${esc(next.t)} →</a>` : ''}</nav>`,
    })
  );
});

/* ---------- strony lekcji ---------- */
lessons.forEach((r, i) => {
  const { L } = r;
  const m = mods[L.mod - 1];
  const prev = lessons[i - 1],
    next = lessons[i + 1];
  const steps = r.steps
    .map(
      (s, k) =>
        `<li id="krok-${k + 1}"><h3>${esc(s.title || 'Krok ' + (k + 1))}</h3>` +
        (s.co ? `<div class="co"><span class="tag">Co</span>${clean(s.co)}</div>` : '') +
        (s.jak ? `<div class="jak"><span class="tag">Jak</span>${clean(s.jak)}</div>` : '') +
        (s.why ? `<div class="why"><span class="tag">Dlaczego</span>${clean(s.why)}</div>` : '') +
        `<p class="open"><a href="../index.html#${L.id}/${k + 1}">Pokaż krok ${k + 1} w 3D i 2D →</a></p></li>`
    )
    .join('\n');
  const mist = L.mistakes || [];
  const lista = listaTxt(L.lista);
  write(
    r.file,
    page({
      file: r.file,
      title: r.title + ' – geometria wykreślna krok po kroku | ' + SITE,
      desc: r.desc,
      h1: esc(L.title),
      crumbs: [[SITE, ''], ['Kurs', 'kurs/'], ['Moduł ' + m.n + '. ' + m.t, 'kurs/' + m.file], [r.title, 'kurs/' + r.file]],
      ld: [
        {
          '@type': 'LearningResource',
          name: L.title,
          description: r.desc,
          inLanguage: 'pl',
          isAccessibleForFree: true,
          learningResourceType: lista ? 'Exercise' : 'Lesson',
          educationalLevel: 'Studia I stopnia',
          teaches: m.t,
          isPartOf: courseRef,
          url: BASE + 'kurs/' + r.file,
        },
        {
          '@type': 'HowTo',
          name: r.title,
          description: r.desc,
          inLanguage: 'pl',
          step: r.steps.map((s, k) => ({ '@type': 'HowToStep', position: k + 1, name: plain(s.title) || 'Krok ' + (k + 1), text: cut(plain([s.co, s.jak].filter(Boolean).join(' ')) || plain(s.title), 500), url: BASE + 'kurs/' + r.file + '#krok-' + (k + 1) })),
        },
      ],
      body:
        `<p class="meta">Moduł ${m.n}: <a href="${m.file}">${esc(m.t)}</a>${lista ? ' · <span class="badge">📋 ' + esc(lista) + '</span>' : ''} · ${r.steps.length} kroków</p>
<p>${openApp(L.id, 0, '▶ Otwórz interaktywną konstrukcję (3D + 2D)')}</p>
` +
        (L.algo ? `<h2>Algorytm</h2>\n<div class="algo">${clean(L.algo)}</div>\n` : '') +
        `<h2>Konstrukcja krok po kroku</h2>
<p class="muted">Opis dla przykładowych danych z aplikacji. W aplikacji możesz zmienić dane, wylosować nowy wariant zadania albo rozwiązać je samodzielnie w trybie „Rozwiąż sam”.</p>
<ol class="steps">
${steps}
</ol>
` +
        (mist.length ? `<h2>Typowe błędy</h2>\n<ul class="mist">${mist.map((x) => '<li>' + clean(x) + '</li>').join('')}</ul>\n` : '') +
        `<p>${openApp(L.id, 0, '▶ Rozwiąż to zadanie w aplikacji')}</p>
<nav class="pn" aria-label="Lekcje">${prev ? `<a rel="prev" href="${prev.file}">← ${esc(prev.L.title)}</a>` : '<span></span>'}${next ? `<a rel="next" href="${next.file}">${esc(next.L.title)} →</a>` : ''}</nav>`,
    })
  );
});

/* ---------- sitemap.xml ---------- */
const urls = [
  [BASE, '1.0', 'weekly'],
  [BASE + 'kurs/', '0.9', 'weekly'],
  ...mods.map((m) => [BASE + 'kurs/' + m.file, '0.8', 'monthly']),
  ...lessons.map((r) => [BASE + 'kurs/' + r.file, '0.7', 'monthly']),
  [BASE + 'informacje.html', '0.3', 'yearly'],
];
fs.writeFileSync(
  path.join(ROOT, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\r\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\r\n' +
    urls.map(([u, p, c]) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod><changefreq>${c}</changefreq><priority>${p}</priority></url>`).join('\r\n') +
    '\r\n</urlset>\r\n'
);

console.log('kurs/: ' + written.length + ' stron, sitemap.xml: ' + urls.length + ' adresów');
