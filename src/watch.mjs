export const text = value => (value ?? '').replace(/\s+/gu, ' ').trim();
export const money = value => Number((value ?? '').replace(/[^\d]/gu, ''));

function namePart(match, position) {
  return match?.[position]?.trim() ?? null;
}

function watchName(title) {
  const name = text(title).replace(/^Lot\s*n[°o.]?\s*\d+\s*/i, '');
  const match = name.match(/^([^,.]+),\s*([^.!?]+?)(?:\.|$)/u);
  return { brand: namePart(match, 1), model: namePart(match, 2) };
}

function watchReference(description) {
  return text(description).match(/\bR[ée]f[ée]rence\s*:\s*([\p{L}\d.-]+)/iu)?.[1]?.replace(/\.+$/, '') ?? null;
}

function watchBracelet(description) {
  return text(description).match(/\bBracelet\b[^.!?]{0,100}?\b(caoutchouc|acier|cuir|nato)\b/iu)?.[1]?.toLowerCase() ?? null;
}

function watchBox(description) {
  if (/\bsans\s+(?:écrin|ecrin|bo[iî]te)\b/iu.test(description)) return 'absent';
  if (/\b(?:écrin|ecrin|bo[iî]te|surbo[iî]te)\b/iu.test(description)) return 'présent';
  return 'non renseigné';
}

export function extractWatch({ number, title, description, source, saleUrl = null, hammerPrice = null, estimation = null }) {
  return {
    number, saleUrl, ...watchName(title), reference: watchReference(description),
    bracelet: watchBracelet(description), box: watchBox(description),
    description: text(description), source, hammerPrice, estimation,
  };
}
