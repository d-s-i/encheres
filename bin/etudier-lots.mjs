#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { studyLots } from '../src/lots.mjs';

function watchTitle(watch) {
  return [watch.brand, watch.model].filter(Boolean).join(' ') || 'Montre non identifiée';
}

function auctionText(watch) {
  return watch.hammerPrice === null ? 'non renseignée' : `${watch.hammerPrice.toLocaleString('fr-FR')} € hors frais`;
}

function estimateText(watch) {
  return watch.estimation ? `${watch.estimation[0].toLocaleString('fr-FR')} à ${watch.estimation[1].toLocaleString('fr-FR')} €` : 'non renseignée';
}

function formatWatch(watch) {
  return [
    `## Lot ${watch.number} — ${watchTitle(watch)}`,
    `- Référence du modèle : ${watch.reference ?? 'non renseignée'}`,
    `- Bracelet : ${watch.bracelet ?? 'non renseigné'}`,
    `- Boîte / écrin : ${watch.box}`,
    `- Adjudication : ${auctionText(watch)}`,
    `- Estimation : ${estimateText(watch)}`,
    `- Source : ${watch.source}`,
    `- Description d'origine : ${watch.description}\n`,
  ];
}

export function formatResult(result) {
  const lines = result.watches.flatMap(formatWatch);
  for (const number of result.missing) lines.push(`Lot ${number} : aucun lot ${number} trouvé dans cette vente ou ce PDF.`);
  return lines.join('\n');
}

function validateCli(mode, source, raw) {
  if (!['--url', '--pdf'].includes(mode) || !source || !raw.length || raw.some(s => !/^\d+$/.test(s))) {
    throw new Error('Usage : etudier-lots --url <lien-de-vente> <lot> [autres lots] ou etudier-lots --pdf <fichier.pdf> <lot> [autres lots]');
  }
}

export async function run(argv, { readFileImpl = readFile, study = studyLots } = {}) {
  const [mode, source, ...raw] = argv;
  validateCli(mode, source, raw);
  const numbers = raw.map(Number);
  const input = mode === '--url' ? { saleUrl: source, numbers } : { pdfBytes: new Uint8Array(await readFileImpl(source)), pdfName: source, numbers };
  return formatResult(await study(input));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run(process.argv.slice(2)).then(output => { console.log(output); }, error => { console.error(error.message); process.exitCode = 1; });
}
