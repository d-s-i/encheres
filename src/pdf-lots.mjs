import { extractWatch, money, text } from './watch.mjs';

const noPdf = () => new Error('PDF invalide ou illisible : fournir un PDF lisible de la vente.');

function validatePdf(bytes) {
  if (!(bytes instanceof Uint8Array) || bytes.length > 20_000_000 || !new TextDecoder('ascii').decode(bytes.slice(0, 5)).startsWith('%PDF-')) throw noPdf();
}

async function pdfPages(document) {
  const pages = [];
  for (let i = 1; i <= document.numPages; i++) {
    const page = await document.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map(item => item.str + (item.hasEOL ? '\n' : ' ')).join(''));
  }
  return pages.join('\n');
}

export async function readPdf(bytes) {
  validatePdf(bytes);
  let loadingTask;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true, disableFontFace: true });
    return await pdfPages(await loadingTask.promise);
  } catch { throw noPdf(); } finally { await loadingTask?.destroy(); }
}

function sectionForLot(pdfText, sections, number) {
  const index = sections.findIndex(m => Number(m[1]) === number);
  if (index < 0) return null;
  return text(pdfText.slice(sections[index].index, sections[index + 1]?.index ?? pdfText.length));
}

function pdfTitle(section) {
  return section.match(/^Lot\s*n\s*[°o.]?\s*\d+\s+(.+?\.)(?:\s|$)/iu)?.[1] ?? '';
}

function pdfDescription(section) {
  return section.match(/\bDescription\s+(.+?)(?=\b(?:Comment retirer|How to collect|Lots de la même vente|lot précédent|Gérer le consentement aux cookies)\b|$)/iu)?.[1] ?? section;
}

function pdfPrices(section) {
  const hammer = section.match(/(?:Adjugé à|Sold for)\s*([\d\s.,]+)\s*(?:€|EUR)/iu);
  const range = section.match(/Estimation\s*:\s*([\d\s.,]+)\s*[\/à-]\s*([\d\s.,]+)\s*(?:€|EUR)/iu);
  return { hammerPrice: hammer ? money(hammer[1]) : null, estimation: range ? [money(range[1]), money(range[2])] : null };
}

function pdfWatch(pdfText, sections, number, source) {
  const section = sectionForLot(pdfText, sections, number);
  if (section === null) return null;
  const title = pdfTitle(section);
  const description = pdfDescription(section);
  if (!/montre/iu.test(description) || !title) return null;
  return extractWatch({ number, title, description, source, ...pdfPrices(section) });
}

export function fromPdf(pdfText, source, numbers) {
  // A printed lot page, or a catalog with successive numbered lots.
  const sections = [...pdfText.matchAll(/\bLot\s*n\s*[°o.]?\s*(\d+)\b/giu)];
  const watches = numbers.map(number => pdfWatch(pdfText, sections, number, source)).filter(Boolean);
  return { watches, missing: numbers.filter(n => !watches.some(w => w.number === n)) };
}
