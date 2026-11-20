import { readPdf } from './pdf-lots.mjs';

const catalogue2024 = 'https://serret-portier-expertises.com/wp-content/uploads/2021/05/Catalogue-Bijoux-Montres-juin2024_bdef_web.pdf';
const months = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
let cached2024;

async function read2024(fetchImpl) {
  const response = await fetchImpl(catalogue2024);
  if (!response.ok || (response.url && new URL(response.url).origin !== new URL(catalogue2024).origin)) throw new Error('Catalogue de frais 2024 inaccessible.');
  return readPdf(new Uint8Array(await response.arrayBuffer()));
}
function matches2024Sale(contents) {
  return /15 juin 2024/i.test(contents.slice(0,5000)) && /288\s+TAG HEUER[\s\S]{0,160}CV2010-4/i.test(contents);
}
function buyerTerms2024(contents) {
  const fees = contents.match(/2\.\s*FRAIS DE VENTE([\s\S]*?)(?:3\.\s*MODE DE PAIEMENT)/i)?.[1] ?? '';
  return /18[,.]00\s*%\s*TTC/i.test(fees);
}
function liveTerms2024(contents) {
  const live = contents.match(/6\.\s*ENCHÈRES EN DIRECT([\s\S]*?)(?:7\.\s*ORDRES D.ACHAT)/i)?.[1] ?? '';
  return /Pas de majoration des frais habituels pour les lots judiciaires\s*:\s*18[,.]00\s*%\s*TTC/i.test(live.replace(/\s+/g, ' '));
}
function documented2024(contents) {
  return matches2024Sale(contents) && buyerTerms2024(contents) && liveTerms2024(contents);
}

// The archived sale page's ?print=1 displays the current CGV even for 2020.
export async function verifiedFees(sale, { fetchImpl = fetch } = {}) {
  if (!/\/ventes-passees\/240615000\//.test(sale.url) || sale.date !== '2024-06-15') return null;
  const pdf = fetchImpl === fetch ? (cached2024 ??= read2024(fetchImpl).catch(e => { cached2024 = null; throw e; })) : await read2024(fetchImpl);
  return documented2024(await pdf) ? {buyerPercent:18,livePercent:0,source:catalogue2024} : null;
}

function saleUrl(raw) {
  try { return new URL(raw); } catch { return null; }
}
function creditMunicipalUrl(raw) {
  const sale = saleUrl(raw);
  return sale && sale.protocol === 'https:' && sale.hostname === 'www.creditmunicipal.fr' ? sale : null;
}
const validMonth = month => month >= 1 && month <= 12;
const validDay = day => day >= 1 && day <= 31;
function datedSale(sale) {
  const date = sale.pathname.match(/\/catalogue-des-ventes\/(?:ventes-passees\/)?(\d{2})(\d{2})(\d{2})\d{3}\/$/);
  if (!date) return null;
  const day = Number(date[3]), month = Number(date[2]);
  return validMonth(month) && validDay(day) ? {sale, id:date[0].match(/(\d{9})/)[1], day, month, year:`20${date[1]}`} : null;
}
function targetSale(watch) {
  const sale = creditMunicipalUrl(watch.saleUrl);
  return sale ? datedSale(sale) : null;
}

async function saleHtml({sale}, fetchImpl) {
  const response = await fetchImpl(sale);
  if (!response.ok || (response.url && new URL(response.url).hostname !== sale.hostname)) return null;
  return response.text();
}
function officialCatalogue(link, {sale,id}) {
  return link.protocol === 'https:' && link.hostname === sale.hostname &&
    link.pathname.startsWith(`/app/uploads/sales/${id}/`) && link.pathname.endsWith('.pdf');
}
function catalogueLink(html, target) {
  const hrefs = html.match(/href=["']([^"']+\.pdf(?:\?[^"']*)?)["']/gi) ?? [];
  return hrefs.map(href=>new URL(href.slice(6,-1).replace(/&amp;/g,'&'),target.sale)).find(url=>officialCatalogue(url,target)) ?? null;
}
async function catalogueText(url, target, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok || (response.url && !officialCatalogue(new URL(response.url),target))) return null;
  try { return await readPdf(new Uint8Array(await response.arrayBuffer())); }
  catch { return null; }
}
function matchingDate(contents, {day,month,year}) {
  return new RegExp(`\\b0?${day} ${months[month-1]} ${year}\\b`, 'i').test(contents.slice(0,5000));
}

function buyerRate(contents) {
  const section = contents.match(/2\.\s*FRAIS ACHETEURS([\s\S]*?)(?:3\.\s*MODE DE PAIEMENT)/i)?.[1] ?? '';
  return parsedRate(section,/(?:fixés? à|frais acheteurs?)\s*(\d{1,2}(?:[,.]\d+)?)\s*%\s*TTC/i);
}
function parsedRate(section, pattern) {
  const rate = section.match(pattern)?.[1];
  return rate ? Number(rate.replace(',','.')) : null;
}
function liveRate(contents) {
  const section = contents.match(/6\.\s*ENCHÈRES EN DIRECT([\s\S]*?)(?:7\.\s*ORDRES D.ACHAT)/i)?.[1] ?? '';
  if (/Pas de majoration des frais habituels pour les lots judiciaires/i.test(section)) return 0;
  if (!/en plus des frais acheteurs/i.test(section)) return null;
  return parsedRate(section,/(\d{1,2}(?:[,.]\d+)?)\s*%\s*TTC/i);
}
function catalogueFees(contents) {
  const buyerPercent=buyerRate(contents), livePercent=liveRate(contents);
  if (!Number.isFinite(buyerPercent) || !Number.isFinite(livePercent) || buyerPercent < 0 || livePercent < 0) return null;
  return {buyerPercent,livePercent};
}

// The catalogue linked from the specific sale is evidence, not a generic CGV.
async function targetCatalogue(target, fetchImpl) {
  const html = await saleHtml(target,fetchImpl);
  if (html === null) return null;
  const url = catalogueLink(html,target);
  if (!url) return null;
  const contents = await catalogueText(url,target,fetchImpl);
  return contents ? {url,contents} : null;
}
export async function verifiedTargetFees(watch, { fetchImpl = fetch } = {}) {
  const target = targetSale(watch);
  if (!target) return null;
  const catalogue = await targetCatalogue(target,fetchImpl);
  if (!catalogue || !matchingDate(catalogue.contents,target)) return null;
  const rates = catalogueFees(catalogue.contents);
  return rates ? {...rates,source:catalogue.url.toString()} : null;
}
