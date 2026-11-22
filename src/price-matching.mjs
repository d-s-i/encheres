import { text } from './watch.mjs';

const normalized = value => text(value).normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
function referenceFamily(reference) {
  if (!reference) return null;
  const match = reference.match(/^(CV\d{4})/i);
  return match ? match[1].toLowerCase() : null;
}

function sameReference(watch, candidate) {
  if (!watch.reference || !candidate.reference) return false;
  const ref = watch.reference.toLowerCase();
  const other = candidate.reference.toLowerCase();
  return other === ref || other.startsWith(`${ref}.`);
}

function monacoChronograph(watch, candidate) {
  const details = `${candidate.model} ${candidate.description ?? ''}`;
  const sameCalibre = /calibre\s*12/i.test(watch.description) && /calibre\s*12/i.test(details);
  return /chronograph|sous-\s*compteur/i.test(details) || sameReference(watch,candidate) || sameCalibre;
}

function monacoCompatible(watch, candidate, model) {
  if (/\blinear system\b/.test(model)) return false;
  return !/chronograph/i.test(watch.description) || monacoChronograph(watch,candidate);
}

function sameCarreraFamily(watch, candidate) {
  const reference = referenceFamily(watch.reference);
  return Boolean(reference && reference === referenceFamily(candidate.reference));
}

function carreraCompatible(watch, candidate) {
  if (!/calibre\s*16/i.test(watch.description)) return true;
  const details = `${candidate.model} ${candidate.description ?? ''}`;
  if (/calibre\s*5|calibre\s*1887/i.test(details)) return false;
  return /calibre\s*16|caliber\s*16/i.test(details) || sameCarreraFamily(watch,candidate);
}

function matchingModel(watch,candidate) {
  const model = normalized(watch.model), other = normalized(candidate.model);
  // Ignore word boundaries for catalogue spellings such as Oysterdate / Oyster Date.
  const compact = value => value.replace(/[\s\p{P}]+/gu, '');
  if (!model || !(other.includes(model) || compact(other).includes(compact(model)))) return false;
  if (model === 'monaco') return monacoCompatible(watch,candidate,other);
  if (model.includes('carrera')) return carreraCompatible(watch,candidate);
  return true;
}

export function comparable(watch, candidate) {
  return normalized(candidate.brand) === normalized(watch.brand) && matchingModel(watch,candidate);
}

export function differences(watch, candidate) {
  return Object.fromEntries(['reference', 'bracelet', 'box'].flatMap(field => candidate[field] && watch[field] && normalized(candidate[field]) !== normalized(watch[field]) ? [[field, `${candidate[field]} (lot : ${watch[field]})`]] : []));
}
