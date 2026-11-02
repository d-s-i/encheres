import { load } from 'cheerio';
import { extractWatch, money, text } from './watch.mjs';
import { fromPdf, readPdf } from './pdf-lots.mjs';

export { extractWatch, readPdf }; // Keep the existing public module interface.

function checkedSaleUrl(input) {
  let url;
  try { url = new URL(input); } catch { throw new Error('Fournir un lien de vente HTTPS Crédit Municipal valide.'); }
  if (url.protocol !== 'https:' || url.hostname !== 'www.creditmunicipal.fr' ||
      !url.pathname.includes('/ventes-aux-encheres/catalogue-des-ventes/')) {
    throw new Error('Fournir un lien de vente HTTPS Crédit Municipal valide.');
  }
  url.search = '';
  url.hash = '';
  return url;
}

function validateResponse(response, url) {
  if (!response.ok) throw new Error(`Catalogue inaccessible (${response.status}) : ${url}`);
  // The real network adapter does not follow redirects to unrelated hosts.
  if (response.url && new URL(response.url).hostname !== 'www.creditmunicipal.fr') throw new Error('Catalogue redirigé vers une autre source.');
}

async function pageHtml(url, fetchImpl) {
  const response = await fetchImpl(url.toString(), { redirect: 'manual' });
  validateResponse(response, url);
  const html = await response.text();
  if (!html.includes('card--lot') && !html.includes('lot__number')) throw new Error('Catalogue inaccessible ou illisible.');
  return html;
}

function auctionPrice(prices) {
  const hammer = prices.match(/(?:Adjugé à|Sold for)\s*([\d\s.,]+)\s*€/i);
  return hammer ? money(hammer[1]) : null;
}

function estimatedPrice(estimate) {
  const range = estimate.match(/(?:Estimation|Estimate)\s*:\s*(?:€\s*)?([\d][\d\s.,]*?)\s*[\/à-]\s*(?:€\s*)?([\d][\d\s.,]*?)\s*(?:€|EUR|$)/i);
  return range ? [money(range[1]), money(range[2])] : null;
}

function requireLotNumber($, expected) {
  const number = Number(text($('.lot__number').first().text()).match(/(?:Lot\s*n[°o.]?\s*)(\d+)/i)?.[1]);
  if (number !== expected) throw new Error(`L'annonce ne correspond pas au lot ${expected}.`);
  return number;
}

function requireWatchDescription($, expected) {
  const title = text($('.lot__title').first().text());
  const description = text($('.lot__description p').first().text());
  if (!title || !description || !/montre/i.test(description)) throw new Error(`Description de montre indisponible pour le lot ${expected}.`);
  return { title, description };
}

function parseDetail(html, expected, source, saleUrl) {
  const $ = load(html);
  return extractWatch({
    number: requireLotNumber($, expected), ...requireWatchDescription($, expected), source, saleUrl,
    hammerPrice: auctionPrice(text($('.lot__prices').first().text())),
    estimation: estimatedPrice(text($('.lot__estimation').first().text())),
  });
}

function pageCount($, base, current) {
  const last = $('.page-item.last-page').attr('href');
  if (!last) return current;
  const possible = Number(new URL(last, base).searchParams.get('_paged'));
  if (Number.isInteger(possible) && possible > 30) throw new Error('Catalogue trop paginé pour confirmer l’absence du lot.');
  return Number.isInteger(possible) && possible > current ? possible : current;
}

function cardNumber($, node) {
  return Number(text($(node).find('.card__number').text()).match(/(?:Lot\s*n[°o.]?|Batch no\.)\s*(\d+)/i)?.[1]);
}

function cardLink($, node, sale, base) {
  const href = $(node).find('.card__title a[href]').attr('href');
  if (!href) return null;
  const link = new URL(href, base);
  if (link.origin !== sale.origin || !link.pathname.startsWith(sale.pathname)) throw new Error('Annonce hors de la vente demandée.');
  return link.toString();
}

function collectLinks($, sale, base, numbers, found) {
  $('.card--lot').each((_, node) => {
    const number = cardNumber($, node);
    if (!numbers.includes(number) || found.has(number)) return;
    const link = cardLink($, node, sale, base);
    if (link) found.set(number, link);
  });
}

async function findLinks(sale, base, numbers, fetchImpl) {
  const found = new Map();
  let lastPage = 1;
  for (let page = 1; page <= lastPage && page <= 30 && found.size < numbers.length; page++) {
    const url = page === 1 ? sale : new URL(`?_paged=${page}`, base);
    const $ = load(await pageHtml(url, fetchImpl));
    lastPage = pageCount($, base, lastPage);
    collectLinks($, sale, base, numbers, found);
  }
  return found;
}

async function readWatches(numbers, found, base, fetchImpl) {
  const watches = [];
  for (const number of numbers) {
    const link = found.get(number);
    if (link) watches.push(parseDetail(await pageHtml(new URL(link), fetchImpl), number, link, base));
  }
  return watches;
}

async function fromWeb(input, fetchImpl) {
  const sale = checkedSaleUrl(input.saleUrl);
  const base = sale.toString().replace(/\/?$/, '/');
  const found = await findLinks(sale, base, input.numbers, fetchImpl);
  return {
    watches: await readWatches(input.numbers, found, base, fetchImpl),
    missing: input.numbers.filter(n => !found.has(n)),
  };
}

function validateNumbers(numbers) {
  const message = 'Indiquer un ou plusieurs numéros de lots distincts.';
  if (!Array.isArray(numbers) || !numbers.length) throw new Error(message);
  if (numbers.some(n => !Number.isSafeInteger(n) || n < 1) || new Set(numbers).size !== numbers.length) throw new Error(message);
}

function validateSource(input) {
  if (Boolean(input.saleUrl) === Boolean(input.pdfBytes)) throw new Error('Fournir un lien de vente ou un PDF, pas les deux.');
}

export async function studyLots(input, { fetchImpl = fetch } = {}) {
  validateNumbers(input.numbers);
  validateSource(input);
  if (input.saleUrl) return fromWeb(input, fetchImpl);
  return fromPdf(await readPdf(input.pdfBytes), input.pdfName ?? 'Document PDF fourni', input.numbers);
}
