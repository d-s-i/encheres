import assert from 'node:assert/strict';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { studyLots } from '../src/lots.mjs';
import { run } from '../bin/etudier-lots.mjs';
import { fetchFixture, sale2021, detail318, detail323, detail262 } from './fixtures/catalogues.mjs';

async function validPdf() {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  ['MONTRES DE PRESTIGE 5 juin 2021', 'Lot n 318 TAG HEUER, Carrera.', 'Adjugé à 1 500 EUR Hors frais', 'Estimation : 600 / 800 EUR', 'Description TAG HEUER, Carrera. Montre chronographe.', 'Bracelet caoutchouc. Reference : CV2010-3. Sans ecrin ni papiers.'].forEach((line, index) => page.drawText(line, { x: 35, y: 785 - index * 24, font, size: 12 }));
  return new Uint8Array(await doc.save());
}

function section(ctx, number) {
  const heading = `## Lot ${number} — `;
  const start = ctx.output.indexOf(heading);
  assert.notEqual(start, -1, `Aucune fiche pour le lot ${number}`);
  return ctx.output.slice(start, ctx.output.indexOf('\n## Lot ', start + 1) === -1 ? undefined : ctx.output.indexOf('\n## Lot ', start + 1));
}
function matching(ctx, number, brand, model) { assert.match(section(ctx, number).split('\n')[0], new RegExp(`^## Lot ${number} — ${brand} ${model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)); }
function braceletAndBox(ctx, number, bracelet, box) { const s = section(ctx, number); assert.ok(s.includes(`- Bracelet : ${bracelet}`)); assert.ok(s.includes(`- Boîte / écrin : ${box}`)); }
function runInput(ctx, numbers) {
  const study = input => studyLots(input, { fetchImpl: fetchFixture });
  const args = ctx.source === 'pdf' ? ['--pdf', 'vente.pdf', ...numbers] : ['--url', ctx.source, ...numbers];
  return run(args, { study, readFileImpl: async () => ctx.pdfBytes });
}

const handlers = [
  [/^la vente .* est accessible à (https:\/\/\S+)$/, async (ctx, m) => { ctx.source = m[1]; assert.ok([sale2021, 'https://www.creditmunicipal.fr/en/ventes-aux-encheres/catalogue-des-ventes/ventes-passees/260620000/'].includes(ctx.source)); }],
  [/^l'utilisateur dispose d'un PDF lisible .* contenant le lot (\d+)$/, async (ctx, m) => { assert.equal(Number(m[1]), 318); ctx.source = 'pdf'; ctx.pdfBytes = await validPdf(); }],
  [/^l'utilisateur dispose d'un fichier PDF illisible comme document de vente$/, async ctx => { ctx.source = 'pdf'; ctx.pdfBytes = new TextEncoder().encode("Ceci n'est pas un document PDF"); }],
  [/^l'utilisateur demande (?:le lot |les lots )(\d+)(?: et (\d+))? de cette vente$/, async (ctx, m) => { ctx.output = await runInput(ctx, [m[1], ...(m[2] ? [m[2]] : [])]); }],
  [/^l'utilisateur fournit ce PDF et demande le lot (\d+)$/, async (ctx, m) => { try { ctx.output = await runInput(ctx, [m[1]]); } catch (e) { ctx.error = e.message; } }],
  [/^la fiche du lot (\d+) indique (.+), (.+) et la référence (\S+)$/, (ctx, m) => { matching(ctx, Number(m[1]), m[2], m[3]); assert.ok(section(ctx, Number(m[1])).includes(`- Référence du modèle : ${m[4]}`)); }],
  [/^la fiche du lot (\d+) indique un bracelet en (\w+) et l'absence d'écrin$/, (ctx, m) => { braceletAndBox(ctx, Number(m[1]), m[2], 'absent'); }],
  [/^la fiche du lot (\d+) indique un bracelet en (\w+) et la présence d'un écrin et d'une surboîte$/, (ctx, m) => { braceletAndBox(ctx, Number(m[1]), m[2], 'présent'); assert.match(section(ctx, Number(m[1])), /surboîte/i); }],
  [/^la fiche indique une adjudication de 1 500 € hors frais, distincte de l'estimation de 600 à 800 €$/, ctx => { const s = section(ctx, 318); assert.match(s, /- Adjudication : 1[\s\u202f]500 € hors frais/); assert.match(s, /- Estimation : 600 à 800 €/); }],
  [/^la fiche donne le lien de l'annonce du lot et permet de retrouver sa description d'origine$/, ctx => { const n = ctx.source === sale2021 ? 318 : 262, link = n === 318 ? detail318 : detail262; assert.ok(section(ctx, n).includes(`- Source : ${link}`)); assert.match(section(ctx, n), /- Description d'origine : .+Montre/); }],
  [/^deux fiches distinctes associent chacune son numéro de lot et son annonce d'origine$/, ctx => { assert.equal((ctx.output.match(/^## Lot /gm) ?? []).length, 2); assert.ok(section(ctx, 318).includes(detail318)); assert.ok(section(ctx, 323).includes(detail323)); }],
  [/^la fiche identifie le PDF fourni comme source de la description du lot$/, ctx => { assert.ok(section(ctx, 318).includes('Source : vente.pdf')); }],
  [/^le résultat indique qu'aucun lot (\d+) n'a été trouvé dans cette vente$/, (ctx, m) => { assert.ok(ctx.output.includes(`aucun lot ${m[1]} trouvé dans cette vente`)); }],
  [/^aucune fiche de montre ni caractéristique inventée n'est présentée pour le lot (\d+)$/, (ctx, m) => { assert.ok(!ctx.output?.includes(`## Lot ${m[1]} —`)); }],
  [/^le résultat indique qu'il est impossible de lire le PDF fourni$/, ctx => { assert.match(ctx.error, /PDF invalide ou illisible/); }],
  [/^la fiche du lot (\d+) indique (.+), (.+) et un bracelet en (\w+)$/, (ctx, m) => { matching(ctx, Number(m[1]), m[2], m[3]); assert.ok(section(ctx, Number(m[1])).includes(`- Bracelet : ${m[4]}`)); }],
  [/^la fiche indique la présence d'une boîte et que la référence de modèle n'est pas renseignée$/, ctx => { assert.ok(section(ctx, 262).includes('Boîte / écrin : présent')); assert.ok(section(ctx, 262).includes('Référence du modèle : non renseignée')); assert.ok(!section(ctx, 262).includes('Référence du modèle : 89415867')); }],
];

export async function runScenario(scenario) {
  const ctx = { source: null, output: null, error: null };
  for (const step of scenario.steps) {
    const matches = handlers.map(([pattern, handler]) => [step.text.match(pattern), handler]).filter(([match]) => match);
    assert.equal(matches.length, 1, `Handler unique attendu pour ${scenario.name}: ${step.text}`);
    try { await matches[0][1](ctx, matches[0][0]); } catch (e) { e.message = `${scenario.name}: ${step.text}: ${e.message}`; throw e; }
  }
}
