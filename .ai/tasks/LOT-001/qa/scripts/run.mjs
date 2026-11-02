#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = resolve(import.meta.dirname, '../../../../..');
const sale2021 = 'https://www.creditmunicipal.fr/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/210605000/';
const sale2026 = 'https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/';
const detail318 = sale2021 + 'tag-heuer-carrera-montre-dhomme-ronde-en-acier-3/';
const detail323 = sale2021 + 'chopard-alfa-romeo-montre-dhomme-en-acier-avec/';
const detail262 = sale2026 + 'omega-seamaster-professionnal-montre-bracelet-d/';
const hash = value => createHash('sha256').update(value).digest('hex');
const checks = [];

async function publicPage(url, expected) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `Source publique indisponible : ${url}`);
  const html = await response.text();
  for (const value of expected) assert.ok(html.includes(value), `Oracle source absent : ${JSON.stringify(value)} dans ${url}`);
  checks.push({ url, status: response.status, sha256: hash(html), verified: expected });
  return html;
}

async function pdfText(path) {
  // Oracle indépendant : dépendance PDF.js publique, jamais le parseur de l'application.
  const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task = getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: true, disableFontFace: true });
  try {
    const pdf = await task.promise;
    const pages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const content = await (await pdf.getPage(p)).getTextContent();
      pages.push(content.items.map(i => i.str).join(' '));
    }
    return pages.join(' ').replace(/\s+/g, ' ');
  } finally { await task.destroy(); }
}

async function preflight(work) {
  const listing = await publicPage(sale2021, ['MONTRES DE PRESTIGE', 'Lot n°318', 'Lot n°323']);
  await publicPage(detail318, ['Lot n°318', 'CV2010-3', 'Sans écrin ni papiers', 'Adjugé à 1 500', '600 / 800']);
  await publicPage(detail323, ['Lot n°323', 'CHOPARD', '8954', 'surboîte', 'Adjugé à 3 600']);
  await publicPage(sale2026, ['Lot n°262', 'Seamaster Professionnal']);
  await publicPage(detail262, ['Lot n°262', '89415867', 'Boîte', 'Bracelet en acier']);

  const last = listing.match(/href="([^"]*_paged=(\d+)[^"]*)"\s+class="page-item last-page"/);
  assert.ok(last, 'La dernière page publique de la vente 2021 est indéterminée.');
  const max = Number(last[2]);
  assert.ok(Number.isInteger(max) && max > 0 && max <= 20, 'Pagination de vente non vérifiable.');
  assert.ok(!listing.includes('Lot n°99999'), 'Le lot négatif existe dans la vente.');
  for (let page = 2; page <= max; page++) {
    const html = await publicPage(new URL(`?_paged=${page}`, sale2021).toString(), ['card--lot']);
    assert.ok(!html.includes('Lot n°99999'), 'Le lot négatif existe dans la vente.');
  }

  const pdf = join(work, 'vente-318.pdf');
  await exec('chromium', ['--headless', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-pdf-header-footer', `--print-to-pdf=${pdf}`, detail318], { cwd: root, timeout: 90000, maxBuffer: 1_000_000 });
  const extracted = await pdfText(pdf);
  for (const term of ['Lot n°318', 'TAG HEUER', 'Carrera', 'CV2010-3', 'Bracelet caoutchouc', 'Sans écrin ni papiers']) {
    assert.ok(extracted.toLocaleLowerCase('fr').includes(term.toLocaleLowerCase('fr')), `PDF préparé sans élément visible requis : ${term}`);
  }
  checks.push({ pdf, size: (await readFile(pdf)).length, sha256: hash(await readFile(pdf)), verified: ['lot 318', 'Carrera', 'CV2010-3', 'bracelet caoutchouc', 'sans écrin'] });
  const invalidPdf = join(work, 'vente-illisible.pdf');
  await writeFile(invalidPdf, "Ceci n'est pas un document PDF");
  assert.equal((await readFile(invalidPdf)).toString(), "Ceci n'est pas un document PDF");
  return { pdf, invalidPdf };
}

async function command(mode, source, ...lots) {
  const args = ['bin/etudier-lots.mjs', mode, source, ...lots.map(String)];
  const line = `node ${args.map(a => JSON.stringify(a)).join(' ')}`;
  try {
    const result = await exec('node', args, { cwd: root, timeout: 90000, maxBuffer: 3_000_000 });
    return { command: line, exitCode: 0, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (error.code === 'ETIMEDOUT' || error.code === 'ENOENT') throw error;
    return { command: line, exitCode: error.code ?? 1, stdout: error.stdout ?? '', stderr: error.stderr ?? '' };
  }
}

function fiche(output, number) {
  const parts = output.split(/(?=^## Lot \d+ — )/m).filter(part => /^## Lot \d+ — /m.test(part));
  const value = parts.find(part => part.startsWith(`## Lot ${number} — `));
  assert.ok(value, `Fiche du lot ${number} absente`);
  return value;
}
function has(ficheText, ...values) {
  for (const value of values) assert.ok(ficheText.includes(value), `Manque ${JSON.stringify(value)}`);
}
function sourceLink(ficheText, url) {
  has(ficheText, `- Source : ${url}`, "- Description d'origine :");
}

const scenarios = [
  {
    id: 'LOT-001-S01', title: 'Un lot depuis la vente 2021',
    run: async () => {
      const r = await command('--url', sale2021, 318);
      assert.equal(r.exitCode, 0, r.stderr);
      const f = fiche(r.stdout, 318);
      has(f, 'TAG HEUER Carrera', 'CV2010-3', 'Bracelet : caoutchouc', 'Boîte / écrin : absent', 'Adjudication : 1 500 € hors frais', 'Estimation : 600 à 800 €');
      sourceLink(f, detail318);
      assert.ok(!f.includes('1 500 € frais compris'), 'Adjudication présentée comme coût final');
      return r;
    },
  },
  {
    id: 'LOT-001-S02', title: 'Deux lots distincts',
    run: async () => {
      const r = await command('--url', sale2021, 318, 323);
      assert.equal(r.exitCode, 0, r.stderr);
      assert.deepEqual([...r.stdout.matchAll(/^## Lot (\d+) — /gm)].map(m => m[1]), ['318', '323']);
      const one = fiche(r.stdout, 318), two = fiche(r.stdout, 323);
      has(one, 'TAG HEUER Carrera', 'CV2010-3', 'Bracelet : caoutchouc', 'Boîte / écrin : absent');
      has(two, 'CHOPARD Alfa Romeo', '8954', 'Bracelet : caoutchouc', 'Boîte / écrin : présent', 'surboîte');
      sourceLink(one, detail318);
      sourceLink(two, detail323);
      assert.ok(!one.includes('8954') && !two.includes('CV2010-3'), 'Caractéristiques croisées entre lots');
      return r;
    },
  },
  {
    id: 'LOT-001-S03', title: 'PDF de vente',
    run: async ({ pdf }) => {
      const r = await command('--pdf', pdf, 318);
      assert.equal(r.exitCode, 0, r.stderr);
      const f = fiche(r.stdout, 318);
      has(f, 'TAG HEUER Carrera', 'CV2010-3', 'Bracelet : caoutchouc', 'Boîte / écrin : absent', `- Source : ${pdf}`, 'Sans écrin ni papiers');
      assert.ok(!f.includes('Gérer le consentement aux cookies'), 'Le bandeau cookies contamine la description du lot');
      assert.ok(!f.includes('lot précédent /'), 'La navigation du site contamine la description du lot');
      assert.ok(!f.includes('- Source : https://'), 'La provenance PDF est remplacée par un lien externe');
      return r;
    },
  },
  {
    id: 'LOT-001-S04', title: 'Lot absent',
    run: async () => {
      const r = await command('--url', sale2021, 99999);
      assert.equal(r.exitCode, 0, r.stderr);
      has(r.stdout, 'aucun lot 99999 trouvé dans cette vente');
      assert.ok(!r.stdout.includes('## Lot '), 'Fiche inventée pour le lot absent');
      return r;
    },
  },
  {
    id: 'LOT-001-S05', title: 'PDF illisible',
    run: async ({ invalidPdf }) => {
      const r = await command('--pdf', invalidPdf, 318);
      assert.equal(r.exitCode, 1, 'Le document invalide a été accepté');
      has(r.stderr, 'PDF invalide ou illisible');
      assert.ok(!r.stdout.includes('## Lot '), 'Fiche inventée depuis un PDF invalide');
      return r;
    },
  },
  {
    id: 'LOT-001-S06', title: 'Référence absente',
    run: async () => {
      const r = await command('--url', sale2026, 262);
      assert.equal(r.exitCode, 0, r.stderr);
      const f = fiche(r.stdout, 262);
      has(f, 'OMEGA Seamaster Professionnal', 'Bracelet : acier', 'Boîte / écrin : présent', 'Référence du modèle : non renseignée');
      assert.ok(!f.includes('Référence du modèle : 89415867'), 'Numéro de boîtier utilisé comme référence');
      sourceLink(f, detail262);
      return r;
    },
  },
];

async function main() {
  const result = { task: 'LOT-001', feature: 'LOT-001-F01', started_at: new Date().toISOString(), interface: 'node bin/etudier-lots.mjs', preflight: [], scenarios: [], status: 'BLOCKED' };
  const work = await mkdtemp(join(tmpdir(), 'lot001-qa-'));
  try {
    let fixture;
    try { fixture = await preflight(work); result.preflight = checks; }
    catch (error) { result.setup_error = String(error.stack ?? error); return { result, code: 4 }; }
    for (const s of scenarios) {
      try {
        const evidence = await s.run(fixture);
        result.scenarios.push({ id: s.id, name: s.title, status: 'PASS', evidence });
      } catch (error) {
        result.scenarios.push({ id: s.id, name: s.title, status: error.code === 'ETIMEDOUT' || error.code === 'ENOENT' ? 'ENVIRONMENT_ERROR' : 'FAIL', error: String(error.stack ?? error) });
      }
    }
    result.status = result.scenarios.every(s => s.status === 'PASS') ? 'PASS' : 'FAIL';
    return { result, code: result.status === 'PASS' ? 0 : 1 };
  } finally {
    result.completed_at = new Date().toISOString();
    await rm(work, { recursive: true, force: true });
    result.cleanup = 'Temporary PDFs deleted';
    await writeFile(resolve(root, '.ai/tasks/LOT-001/qa/result.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(`QA ${result.status}: ${result.scenarios.map(s => `${s.id}=${s.status}`).join(' ') || 'setup incomplete'}`);
  }
}

process.exitCode = (await main()).code;
