#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { studyLots } from '../src/lots.mjs';
import { compareWatch } from '../src/prices.mjs';

const euro = n => `${n.toLocaleString('fr-FR',{minimumFractionDigits:Number.isInteger(n)?0:2,maximumFractionDigits:2})} €`;
const differences = data => Object.entries(data ?? {}).map(([field,value])=>`${field} : ${value}`).join(' ; ') || 'aucune différence relevée';

function creditRow(sale) {
  return `- ${sale.date} · lot ${sale.number} · ${sale.reference ?? 'référence non indiquée'} · adjudication ${euro(sale.hammerPrice)} hors frais · coût en ligne ${sale.onlineCost === null ? 'non vérifié' : euro(sale.onlineCost)} · ${sale.url}${sale.feeSource ? ` · frais : ${sale.buyerPercent}% + ${sale.livePercent}% live (${sale.feeSource})` : ''} · différences : ${differences(sale.differences)}`;
}
function creditLines(credit) {
  const lines = ['### Crédit Municipal — adjudications comparables des cinq dernières années'];
  if (credit.status === 'inaccessible') return [...lines,`Source non vérifiable : ${credit.reason}`];
  lines.push(...credit.sales.map(creditRow));
  lines.push(`Moyenne des coûts d'achat en ligne vérifiés : ${credit.average === null ? 'indisponible' : euro(credit.average)} (${credit.count} vente${credit.count > 1 ? 's' : ''} avec frais vérifiés${credit.status === 'partial' ? ', échantillon partiel' : ''}).`);
  return lines;
}
function offerRow(offer) {
  return `- ${euro(offer.price)} hors port · vendeur ${offer.sellerCountry} · ${offer.reference ?? 'référence non indiquée'} · état : ${offer.condition ?? 'non renseigné'} · ${offer.url} · différences : ${differences(offer.differences)}`;
}
function sampleScope(sample) {
  return sample.inspectedPages < sample.totalPages ? ' ; seules les trois premières pages ont été analysées : ce ne sont pas nécessairement les offres les moins chères de tout Chrono24.' : ' ; tous les résultats de cette recherche ont été parcourus.';
}
function sampleLine(sample) {
  return `Recherche Chrono24 : ${sample.inspectedPages} page${sample.inspectedPages > 1 ? 's' : ''}, ${sample.inspectedListings} annonce${sample.inspectedListings > 1 ? 's' : ''} analysées sur ${sample.totalListings} résultats, triés par pertinence${sampleScope(sample)}`;
}
function chronoSummary(chrono) {
  return `Moyenne ${chrono.status === 'partial' ? 'partielle ' : ''}des prix affichés : ${chrono.average === null ? 'indisponible' : euro(chrono.average)} (${chrono.count} annonce${chrono.count > 1 ? 's' : ''}${chrono.status === 'sample_empty' ? ' dans l’échantillon' : ''}).`;
}
function chronoLines(chrono) {
  const lines = ['### Chrono24 — prix demandés, vendeurs en France, hors frais de port'];
  if (chrono.status === 'inaccessible') return [...lines,`Source non vérifiable (accès empêché) : ${chrono.reason}`];
  lines.push(...chrono.offers.map(offerRow),chronoSummary(chrono));
  if (chrono.sample) lines.push(sampleLine(chrono.sample));
  return lines;
}
const unavailableReasons = {
  target_fees_unverified:'indisponible : frais de la vente ciblée non vérifiés.',
  chrono_unavailable:'indisponible : moyenne Chrono24 indisponible.',
  chrono_unavailable_sample:'indisponible : aucune annonce admissible dans l’échantillon des trois premières pages ; marché entier non vérifié.',
  chrono_inaccessible:'non vérifiable : accès à Chrono24 impossible.',
  sale_not_upcoming:'non applicable : vente ciblée déjà passée.',
};
function ceilingBase(ceiling) {
  const sample = ceiling.sample?.inspectedPages < ceiling.sample?.totalPages ? ', échantillon des trois premières pages seulement' : '';
  const plural = ceiling.sourceCount > 1 ? 's' : '';
  return `Base : moyenne ${ceiling.status === 'partial' ? 'partielle ' : ''}Chrono24 des prix demandés hors port ${euro(ceiling.sourceAverage)} (${ceiling.sourceCount} annonce${plural} française${plural}${sample}).`;
}
function pricedCeilingLines(ceiling) {
  return [
    `Prix à ne pas dépasser : ${euro(ceiling.amount)} hors frais Crédit Municipal.`,
    ceilingBase(ceiling),
    `Frais de la vente ciblée : ${ceiling.buyerPercent}% TTC acheteur + ${ceiling.livePercent}% TTC live, sur l'adjudication · ${ceiling.feeSource}.`,
    "Seuil théorique : respecter également le pas d'enchère de la vente.",
  ];
}
function ceilingLines(ceiling) {
  if (!ceiling) return [];
  const heading = "### Plafond d'enchère théorique — hors frais Crédit Municipal";
  return ceiling.amount === null ? [heading,`Prix à ne pas dépasser : ${unavailableReasons[ceiling.reason] ?? 'indisponible : sources insuffisantes.'}`] : [heading,...pricedCeilingLines(ceiling)];
}
export function formatComparison(result) {
  return [
    `## Lot ${result.lot} — ${result.brand} ${result.model} (${result.reference ?? 'référence non indiquée'})`,
    `Date d'analyse : ${result.asOf}`,
    ...creditLines(result.credit),
    ...chronoLines(result.chrono),
    ...ceilingLines(result.ceiling),
  ].join('\n');
}

function requiredArgs(mode, source) {
  return ['--url','--pdf'].includes(mode) && Boolean(source);
}
function validLotNumbers(raw) {
  return raw.length > 0 && raw.every(value=>/^\d+$/.test(value));
}
function dateArgs(rest) {
  const asOf = rest[0] === '--as-of' ? rest[1] : undefined;
  return {asOf,raw:asOf ? rest.slice(2) : rest};
}
function args(argv) {
  const [mode, source, ...rest] = argv;
  if (!requiredArgs(mode,source)) throw new Error('Usage : comparer-prix --url <vente> [--as-of AAAA-MM-JJ] <lot> [autres lots] ; ou --pdf <fichier> ...');
  const {asOf,raw} = dateArgs(rest);
  if (!validLotNumbers(raw) || (asOf && !/^\d{4}-\d{2}-\d{2}$/.test(asOf))) throw new Error('Numéros de lot et date AAAA-MM-JJ requis.');
  return {mode,source,asOf,numbers:raw.map(Number)};
}

export async function run(argv,{study=studyLots,compare=compareWatch,readFileImpl=readFile}={}) {
  const {mode,source,asOf,numbers}=args(argv);
  const input=mode==='--url'?{saleUrl:source,numbers}:{pdfBytes:new Uint8Array(await readFileImpl(source)),pdfName:source,numbers};
  const result=await study(input);
  const analyses=[];
  for(const watch of result.watches) analyses.push(formatComparison(await compare(watch,asOf?{asOf}:{})));
  for(const n of result.missing) analyses.push(`Lot ${n} : aucun lot trouvé dans cette vente ou ce PDF.`);
  return analyses.join('\n\n');
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  run(process.argv.slice(2)).then(console.log,error=>{console.error(error.message);process.exitCode=1;});
}
