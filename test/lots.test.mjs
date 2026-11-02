import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { studyLots, readPdf, extractWatch } from '../src/lots.mjs';
import { run, formatResult } from '../bin/etudier-lots.mjs';

const base = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/';
const detail318 = base + 'tag-heuer-carrera/';
const detail323 = base + 'chopard-alfa-romeo/';
const sale = `<main><h1>MONTRES DE PRESTIGE</h1><div>samedi 05 juin 2021 - 14h00</div>
<div class="card--lot"><span class="card__number">Lot n°318</span><h2 class="card__title"><a href="${detail318}">TAG HEUER</a></h2></div>
<div class="card--lot"><span class="card__number">Lot n°323</span><h2 class="card__title"><a href="${detail323}">CHOPARD</a></h2></div></main>`;
const detail = (n, title, description, price, estimate) => `<main><div class="lot"><span class="lot__number">Lot n°${n}</span><h1 class="lot__title">${title}</h1><div class="lot__prices">Adjugé à ${price} €* le 5 juin 2021</div><div class="lot__estimation">* Hors frais<br>Estimation : ${estimate} €</div><div class="lot__description"><span>Description</span><p>${description}</p></div></div></main>`;
const pages = new Map([
  [base, sale],
  [detail318, detail(318, 'TAG HEUER, Carrera.', 'TAG HEUER, Carrera. Montre chronographe. Bracelet caoutchouc. Référence : CV2010-3. N° de série : EWL8719. Sans écrin ni papiers.', '1 500', '600 / 800')],
  [detail323, detail(323, 'CHOPARD, Alfa Romeo.', 'CHOPARD, Alfa Romeo. Montre chronographe. Bracelet en caoutchouc. Référence : 8954. N° de série : 1102847. Écrin, surboîte et certificat.', '3 600', '1 500 / 2 500')],
]);
function fakeFetch(url) {
  const body = pages.get(String(url));
  if (!body) throw new Error(`Unexpected URL: ${url}`);
  return Promise.resolve({ ok: true, status: 200, text: async () => body });
}

test('two lots stay distinct and expose provenance and hammer price', async () => {
  const result = await studyLots({ saleUrl: base, numbers: [318, 323] }, { fetchImpl: fakeFetch });
  assert.equal(result.watches.length, 2);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.watches.map(w => [w.number, w.brand, w.model, w.reference, w.bracelet, w.box, w.hammerPrice, w.estimation, w.source]), [
    [318, 'TAG HEUER', 'Carrera', 'CV2010-3', 'caoutchouc', 'absent', 1500, [600, 800], detail318],
    [323, 'CHOPARD', 'Alfa Romeo', '8954', 'caoutchouc', 'présent', 3600, [1500, 2500], detail323],
  ]);
  assert.match(result.watches[0].description, /Sans écrin ni papiers/);
});

test('missing lot is not resolved in another sale or invented', async () => {
  const result = await studyLots({ saleUrl: base, numbers: [99999] }, { fetchImpl: fakeFetch });
  assert.deepEqual(result.watches, []);
  assert.deepEqual(result.missing, [99999]);
});

test('English euro-before-number estimates do not become zero', async () => {
  const english = detail(262, 'OMEGA, Seamaster Professionnal.', 'OMEGA, Seamaster Professionnal. Montre bracelet. Bracelet en acier. Boîte.', '3 600', '1 500 / 2 000').replace('Estimation : 1 500 / 2 000 €', 'Estimate: €1,500 / €2,000');
  const result = await studyLots({ saleUrl: base, numbers: [262] }, { fetchImpl: async url => ({ ok: true, text: async () => url === base ? `<div class="card--lot"><span class="card__number">Lot n°262</span><h2 class="card__title"><a href="${base}omega/">OMEGA</a></h2></div>` : english }) });
  assert.deepEqual(result.watches[0].estimation, [1500, 2000]);
});

test('a serial number is not a missing model reference', () => {
  const watch = extractWatch({ number: 262, title: 'OMEGA, Seamaster Professionnal.', description: 'OMEGA, Seamaster Professionnal. Boîtier en acier numéroté 89415867. Bracelet en acier. Boîte, sans papiers.', source: 'catalogue.pdf' });
  assert.equal(watch.reference, null);
  assert.equal(watch.bracelet, 'acier');
  assert.equal(watch.box, 'présent');
});

async function makePdf(lines) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  lines.forEach((line, i) => page.drawText(line, { x: 35, y: 785 - i * 24, font, size: 12 }));
  return new Uint8Array(await doc.save());
}

test('a PDF provides a lot and is cited as the source', async () => {
  const pdf = await makePdf(['MONTRES DE PRESTIGE 5 juin 2021', 'Lot n 318 TAG HEUER, Carrera.', 'Adjugé à 1 500 EUR Hors frais', 'Estimation : 600 / 800 EUR', 'Description TAG HEUER, Carrera. Montre chronographe.', 'Bracelet caoutchouc. Reference : CV2010-3. Sans ecrin ni papiers.']);
  const result = await studyLots({ pdfBytes: pdf, pdfName: 'vente.pdf', numbers: [318] });
  assert.equal(result.watches[0].brand, 'TAG HEUER');
  assert.equal(result.watches[0].reference, 'CV2010-3');
  assert.equal(result.watches[0].bracelet, 'caoutchouc');
  assert.equal(result.watches[0].box, 'absent');
  assert.equal(result.watches[0].source, 'vente.pdf');
  assert.equal(result.watches[0].description, 'TAG HEUER, Carrera. Montre chronographe. Bracelet caoutchouc. Reference : CV2010-3. Sans ecrin ni papiers.');
  assert.equal(result.watches[0].hammerPrice, 1500);
  assert.deepEqual(result.watches[0].estimation, [600, 800]);
});

test('multiple lots in one PDF remain separate', async () => {
  const pdf = await makePdf(['MONTRES DE PRESTIGE 5 juin 2021', 'Lot n 318 TAG HEUER, Carrera.', 'Description TAG HEUER, Carrera. Montre chronographe.', 'Bracelet caoutchouc. Reference : CV2010-3. Sans ecrin ni papiers.', 'Lot n 323 CHOPARD, Alfa Romeo.', 'Description CHOPARD, Alfa Romeo. Montre chronographe.', 'Bracelet en caoutchouc. Reference : 8954. Ecrin et surboite.']);
  const result = await studyLots({ pdfBytes: pdf, pdfName: 'vente.pdf', numbers: [318, 323] });
  assert.deepEqual(result.watches.map(w => [w.number, w.brand, w.reference, w.box]), [[318, 'TAG HEUER', 'CV2010-3', 'absent'], [323, 'CHOPARD', '8954', 'présent']]);
});

test('a corrupt PDF is rejected with no watch', async () => {
  await assert.rejects(() => readPdf(new TextEncoder().encode("Ceci n'est pas un document PDF")), /PDF invalide ou illisible/);
});

test('different sale identity prevents reuse of lot numbers', async () => {
  await assert.rejects(() => studyLots({ saleUrl: 'http://localhost/other', numbers: [318] }, { fetchImpl: fakeFetch }), /lien de vente HTTPS Crédit Municipal/);
});

test('catalogue pagination continues until the requested lot is found', async () => {
  const first = `<div class="card--lot"><span class="card__number">Lot n°317</span></div><a class="page-item last-page" href="?_paged=2">2</a>`;
  const next = `<div class="card--lot"><span class="card__number">Lot n°318</span><h2 class="card__title"><a href="${detail318}">TAG HEUER</a></h2></div>`;
  const seen = [];
  const fetchImpl = async url => { seen.push(url); return { ok: true, text: async () => url === base ? first : url === `${base}?_paged=2` ? next : pages.get(url) }; };
  const result = await studyLots({ saleUrl: base, numbers: [318] }, { fetchImpl });
  assert.deepEqual(seen, [base, `${base}?_paged=2`, detail318]);
  assert.equal(result.watches[0].reference, 'CV2010-3');
});

test('catalogue pagination refuses a partial search beyond its limit', async () => {
  const fetchImpl = async () => ({ ok: true, text: async () => '<div class="card--lot"></div><a class="page-item last-page" href="?_paged=31">31</a>' });
  await assert.rejects(() => studyLots({ saleUrl: base, numbers: [318] }, { fetchImpl }), /Catalogue trop paginé/);
});

test('source HTTP errors, foreign redirects and unreadable HTML remain errors', async () => {
  const input = { saleUrl: base, numbers: [318] };
  await assert.rejects(() => studyLots(input, { fetchImpl: async () => ({ ok: false, status: 503 }) }), /Catalogue inaccessible \(503\)/);
  await assert.rejects(() => studyLots(input, { fetchImpl: async () => ({ ok: true, url: 'https://example.org/', text: async () => sale }) }), /redirigé vers une autre source/);
  await assert.rejects(() => studyLots(input, { fetchImpl: async () => ({ ok: true, text: async () => '<h1>Connexion requise</h1>' }) }), /Catalogue inaccessible ou illisible/);
});

test('a mismatched or non-watch detail cannot be attributed to the requested lot', async () => {
  const changed = (html) => async url => ({ ok: true, text: async () => url === base ? sale : html });
  const requested = { saleUrl: base, numbers: [318] };
  await assert.rejects(() => studyLots(requested, { fetchImpl: changed(pages.get(detail318).replace('Lot n°318', 'Lot n°319')) }), /L'annonce ne correspond pas au lot 318/);
  await assert.rejects(() => studyLots(requested, { fetchImpl: changed(pages.get(detail318).replace('Lot n°318', 'Numéro de lot absent')) }), /L'annonce ne correspond pas au lot 318/);
  await assert.rejects(() => studyLots(requested, { fetchImpl: changed(pages.get(detail318).replaceAll('Montre', 'Objet').replaceAll('montre', 'objet')) }), /Description de montre indisponible/);
  await assert.rejects(() => studyLots(requested, { fetchImpl: changed(pages.get(detail318).replace('TAG HEUER, Carrera.</h1>', '</h1>')) }), /Description de montre indisponible/);
});

test('unlinked and foreign catalogue cards are never accepted as matches', async () => {
  const input = { saleUrl: base, numbers: [318] };
  const card = href => `<div class="card--lot"><span class="card__number">Lot n°318</span><h2 class="card__title">${href ? `<a href="${href}">TAG HEUER</a>` : 'TAG HEUER'}</h2></div>`;
  const fetchImpl = html => async () => ({ ok: true, text: async () => html });
  assert.deepEqual((await studyLots(input, { fetchImpl: fetchImpl(card(null)) })).missing, [318]);
  await assert.rejects(() => studyLots(input, { fetchImpl: fetchImpl(card('https://example.org/other')) }), /Annonce hors de la vente demandée/);
});

test('pagination links with non-increasing or invalid page numbers do not add pages', async () => {
  for (const last of ['1', 'invalid']) {
    const html = `<div class="card--lot"></div><a class="page-item last-page" href="?_paged=${last}">last</a>`;
    const calls = [];
    const result = await studyLots({ saleUrl: base, numbers: [99999] }, { fetchImpl: async url => { calls.push(url); return { ok: true, text: async () => html }; } });
    assert.deepEqual(calls, [base]);
    assert.deepEqual(result.missing, [99999]);
  }
});

test('lot on the last permitted catalogue page remains reachable', async () => {
  const seen = [];
  const first = '<div class="card--lot"></div><a class="page-item last-page" href="?_paged=30">30</a>';
  const last = `<div class="card--lot"><span class="card__number">Lot n°318</span><h2 class="card__title"><a href="${detail318}">TAG HEUER</a></h2></div>`;
  const fetchImpl = async url => {
    seen.push(url);
    return { ok: true, text: async () => url === detail318 ? pages.get(detail318) : url === `${base}?_paged=30` ? last : first };
  };
  const result = await studyLots({ saleUrl: base, numbers: [318] }, { fetchImpl });
  assert.equal(result.watches[0].number, 318);
  assert.ok(seen.includes(`${base}?_paged=30`));
  assert.equal(seen.filter(url => url.includes('_paged=')).length, 29);
});

test('a PDF missing the requested lot or a watch description never invents a fiche', async () => {
  const pdf = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Description TAG HEUER, Carrera. Montre chronographe. Bracelet caoutchouc.']);
  const result = await studyLots({ pdfBytes: pdf, numbers: [318, 99999] });
  assert.deepEqual(result.watches.map(w => w.number), [318]);
  assert.deepEqual(result.missing, [99999]);
  const nonWatch = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Description Bracelet caoutchouc.']);
  assert.deepEqual((await studyLots({ pdfBytes: nonWatch, numbers: [318] })).missing, [318]);
  const untitled = await makePdf(['Lot n 318', 'Description Montre bracelet en acier']);
  assert.deepEqual((await studyLots({ pdfBytes: untitled, numbers: [318] })).missing, [318]);
});

test('URL validation separates protocol, host and catalogue path', async () => {
  const path = new URL(base).pathname;
  for (const saleUrl of [`http://www.creditmunicipal.fr${path}`, `https://example.org${path}`, 'https://www.creditmunicipal.fr/autre-vente/']) {
    await assert.rejects(() => studyLots({ saleUrl, numbers: [318] }, { fetchImpl: fakeFetch }), /lien de vente HTTPS Crédit Municipal/);
  }
  assert.deepEqual((await studyLots({ saleUrl: base, numbers: [1] }, { fetchImpl: fakeFetch })).missing, [1]);
});

test('an unrequested foreign link does not invalidate the requested watch', async () => {
  const html = `<div class="card--lot"><span class="card__number">Lot n°999</span><h2 class="card__title"><a href="https://example.org/">Autre</a></h2></div>${sale}`;
  const result = await studyLots({ saleUrl: base, numbers: [318] }, { fetchImpl: async url => ({ ok: true, text: async () => url === base ? html : pages.get(url) }) });
  assert.deepEqual(result.watches.map(w => w.number), [318]);
});

test('a same-host link to another sale is rejected', async () => {
  const other = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/autre-lot/';
  const html = sale.replace(detail318, other);
  await assert.rejects(() => studyLots({ saleUrl: base, numbers: [318] }, { fetchImpl: async () => ({ ok: true, text: async () => html }) }), /Annonce hors de la vente demandée/);
});

test('having all requested lots on page one needs no later page', async () => {
  const first = `${sale}<a class="page-item last-page" href="?_paged=2">2</a>`;
  const seen = [];
  const result = await studyLots({ saleUrl: base, numbers: [318] }, { fetchImpl: async url => { seen.push(url); return { ok: true, text: async () => url === base ? first : pages.get(url) }; } });
  assert.deepEqual(seen, [base, detail318]);
  assert.equal(result.watches[0].number, 318);
});

test('PDF lot without a Description heading still preserves the available text', async () => {
  const pdf = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Montre bracelet caoutchouc. Reference : CV2010-3. Sans ecrin.']);
  const result = await studyLots({ pdfBytes: pdf, numbers: [318] });
  assert.equal(result.watches[0].reference, 'CV2010-3');
  assert.match(result.watches[0].description, /Lot n 318 TAG HEUER, Carrera/);
});

test('PDF description excludes printed catalogue navigation and cookie controls', async () => {
  const pdf = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Description TAG HEUER, Carrera. Montre bracelet caoutchouc. Sans ecrin ni papiers.', 'lot précédent / ADJUGÉ À 1 500 EUR', 'Gérer le consentement aux cookies']);
  const result = await studyLots({ pdfBytes: pdf, numbers: [318] });
  assert.equal(result.watches[0].description, 'TAG HEUER, Carrera. Montre bracelet caoutchouc. Sans ecrin ni papiers.');
});

test('PDF source and description do not invent an auction amount', async () => {
  const pdf = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Description TAG HEUER, Carrera. Montre bracelet en caoutchouc.']);
  const result = await studyLots({ pdfBytes: pdf, numbers: [318] });
  assert.equal(result.watches[0].hammerPrice, null);
  assert.equal(result.watches[0].estimation, null);
});

test('PDF prices remain distinct and do not become combined numbers', async () => {
  const pdf = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Adjuge a 1 500 EUR', 'Estimation : 600 / 800 EUR', 'Description TAG HEUER, Carrera. Montre avec bracelet caoutchouc.']);
  const result = await studyLots({ pdfBytes: pdf, numbers: [318] });
  assert.deepEqual(result.watches[0].estimation, [600, 800]);
});

test('PDF validation accepts the size limit and rejects oversized or non-byte documents', async () => {
  await assert.rejects(() => readPdf(null), /PDF invalide ou illisible/);
  const valid = await makePdf(['Lot n 318 TAG HEUER, Carrera.', 'Description Montre bracelet.']);
  const atLimit = new Uint8Array(20_000_000);
  atLimit.set(valid);
  assert.match(await readPdf(atLimit), /Lot n 318 TAG HEUER, Carrera/);
  const oversized = new Uint8Array(20_000_001);
  oversized.set(valid);
  await assert.rejects(() => readPdf(oversized), /PDF invalide ou illisible/);
});

test('CLI checks missing, malformed and unsupported arguments', async () => {
  for (const args of [[], ['--url'], ['--url', base], ['--pdf', 'x.pdf'], ['--other', base, '318'], ['--url', base, 'x']]) {
    await assert.rejects(() => run(args), /Usage : etudier-lots/);
  }
  assert.match(await run(['--url', base, '318'], { study: async () => ({ watches: [], missing: [318] }) }), /Lot 318 : aucun lot/);
});

test('a watch title without a brand and model does not invent either', () => {
  const watch = extractWatch({ number: 318, title: 'Montre sans marque', description: 'Montre bracelet en acier.', source: 'vente.pdf' });
  assert.equal(watch.brand, null);
  assert.equal(watch.model, null);
  assert.match(formatResult({ watches: [watch], missing: [] }), /## Lot 318 — Montre non identifiée/);
});

test('a watch lacking an explicit attribute remains unknown in the rendered fiche', () => {
  const watch = extractWatch({ number: 318, title: 'TAG HEUER, Carrera.', description: 'Montre sans détail de bracelet ou de boîte.', source: 'vente.pdf' });
  const rendered = formatResult({ watches: [watch], missing: [] });
  assert.match(rendered, /- Référence du modèle : non renseignée/);
  assert.match(rendered, /- Bracelet : non renseigné/);
  assert.match(rendered, /- Adjudication : non renseignée/);
  assert.match(rendered, /- Estimation : non renseignée/);
});

test('invalid lot collections and ambiguous sources are rejected', async () => {
  for (const numbers of [[], [0], [1.5], [318, 318], '318']) {
    await assert.rejects(() => studyLots({ saleUrl: base, numbers }, { fetchImpl: fakeFetch }), /numéros de lots distincts/);
  }
  await assert.rejects(() => studyLots({ saleUrl: base, pdfBytes: new Uint8Array([37, 80, 68, 70, 45]), numbers: [318] }), /lien de vente ou un PDF/);
  await assert.rejects(() => studyLots({ numbers: [318] }), /lien de vente ou un PDF/);
});
