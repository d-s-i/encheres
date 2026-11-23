export const text = value => (value ?? '').replace(/\s+/gu, ' ').trim();
export const money = value => Number((value ?? '').replace(/[^\d]/gu, ''));

function namePart(match, position) {
  return match?.[position]?.trim() ?? null;
}

function watchName(title) {
  const name = text(title).replace(/^Lot\s*n[°o.]?\s*\d+\s*/i, '');
  const match = name.match(/^([^,.]+),\s*([^.!?]+?)(?:\.|$)/u);
  if(match)return {brand:namePart(match,1),model:namePart(match,2)};
  // A catalogue may publish only the maker before the generic words "Montre bracelet".
  const maker=name.match(/^([\p{Lu}][\p{Lu}'&-]{1,30})(?:\s+Montre\b|$)/u)?.[1];
  return {brand:maker==='MONTRE'?null:maker??null,model:null};
}

function watchReference(description) {
  const value = text(description);
  const match = value.match(/\bR[ée]f[ée]rence\s*:?\s*((?:[A-Z]{2,5}\s+\d{3,6}|[\p{L}\d-]+)(?:\/[\d]+)?(?:\.(?:[A-Z]{1,4}\d{1,6}|\d{1,5}))*)/iu);
  if (!match) return null;
  // A reference attached to the bracelet (e.g. Oyster 78350) is not the watch reference.
  const sentence = value.slice(0, match.index).split(/[.!?]/u).at(-1);
  if (/\bbracelet\b/iu.test(sentence)) return null;
  return match[1].replace(/(?<=\p{L})\s+(?=\d)/u, '');
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
