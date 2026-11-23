import { load } from 'cheerio';
import { extractWatch, money, text } from './watch.mjs';

const rootUrl = 'https://www.creditmunicipal.fr/ventes-aux-encheres/rechercher-un-lot/';

function dateFromSaleUrl(url) {
  const match = new URL(url).pathname.match(/\/ventes-passees\/(\d{2})(\d{2})(\d{2})\d{3}\//);
  if (!match) return null;
  const iso = `20${match[1]}-${match[2]}-${match[3]}`;
  return Number.isNaN(Date.parse(`${iso}T00:00:00Z`)) ? null : iso;
}

async function getHtml(url, fetchImpl) {
  const response = await fetchImpl(url);
  if (!response.ok || new URL(response.url ?? url).hostname !== 'www.creditmunicipal.fr') throw new Error(`Crédit Municipal inaccessible (${response.status ?? 'réseau'}).`);
  return response.text();
}

function searchUrl(watch, model = watch.model) {
  const url = new URL(rootUrl);
  url.search = new URLSearchParams({ search: `${watch.brand} ${model}`, 'lot-state':'lot-sold', 'sale-date':'sale-date-all' }).toString();
  return url;
}

function searchModels(model) {
  const words = model.trim().split(/\s+/u);
  // Broaden discovery by one word, but keep the brand and a model term.
  // Detail pages are still verified and filtered separately.
  return words.length > 1 ? [model, words.slice(0, -1).join(' ')] : [model];
}

function cardLinks($, pageUrl, links) {
  $('.card--lot .card__title a[href]').each((_, el) => {
    const link = new URL($(el).attr('href'), pageUrl);
    if (link.hostname === 'www.creditmunicipal.fr' && /\/ventes-passees\/\d{9}\//.test(link.pathname)) links.add(link.toString());
  });
}

function lastPage($, pageUrl, previous) {
  const href = $('.page-item.last-page').attr('href');
  return href ? Math.max(previous, Number(new URL(href,pageUrl).searchParams.get('_paged')) || 1) : previous;
}

function numberedPage(root,page) {
  const url = new URL(root);
  if (page > 1) url.searchParams.set('_paged', String(page));
  return url;
}
function checkedResults($) {
  if (!$('.card--lot').length && !/Aucun résultat|Il existe 0 résultats/i.test($('main').text())) throw new Error('Crédit Municipal : résultats non vérifiables.');
}
async function searchLinks(watch, fetchImpl, maxPages) {
  const links = new Set();
  for (const model of searchModels(watch.model)) {
    const root = searchUrl(watch, model);
    let last = 1;
    for (let page = 1; page <= last; page++) {
      if (page > maxPages) throw new Error('Crédit Municipal : pagination incomplète.');
      const url = numberedPage(root,page), $ = load(await getHtml(url,fetchImpl));
      checkedResults($);
      cardLinks($,url,links);
      last = lastPage($,url,last);
      if (last > maxPages) throw new Error('Crédit Municipal : pagination incomplète.');
    }
  }
  return links;
}

function detailNumber($) {
  return Number(text($('.lot__number').first().text()).match(/(?:lot\s*n[°o.]?|batch\s*no\.)\s*(\d+)/i)?.[1]);
}
function hammerPrice(prices) {
  const match = prices.match(/(?:Adjugé à|Sold for|Sold at)\s*(?:€\s*)?([\d\s.,\u202f]+?)\s*(?:€|\*)/i);
  return match ? money(match[1]) : null;
}
function completeDetail({date,prices,heading,description,number,hammer}) {
  return Boolean(date && prices.includes(date.slice(0,4)) && heading && description && Number.isSafeInteger(number) && hammer !== null);
}

function parseSale(url, html) {
  const $ = load(html), date = dateFromSaleUrl(url);
  const heading = text($('.lot__title').first().text()), description = text($('.lot__description p').first().text());
  const prices = text($('.lot__prices').first().text()), number = detailNumber($), hammer = hammerPrice(prices);
  if (!completeDetail({date,prices,heading,description,number,hammer})) return null;
  const watch = extractWatch({ number, title:heading, description, source:url, hammerPrice:hammer });
  return { ...watch, url, date };
}

export async function searchCreditMunicipal(watch, { fetchImpl = fetch, maxPages = 30 } = {}) {
  if(!watch.brand?.trim()||!watch.model?.trim())return [];
  const sales = [];
  for (const url of await searchLinks(watch, fetchImpl, maxPages)) {
    const sale = parseSale(url, await getHtml(url, fetchImpl));
    if (sale) sales.push(sale);
  }
  return sales;
}
