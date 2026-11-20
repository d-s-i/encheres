// Pure auction ceiling policy: all amounts are converted to integer cents
// before removing fees, so the displayed bid never exceeds the asking-price base.
const validRate = rate => Number.isFinite(rate) && rate >= 0;
function validCeilingInputs(average, fees) {
  return Number.isFinite(average) && average > 0 && Boolean(fees?.source) && validRate(fees.buyerPercent) && validRate(fees.livePercent);
}

export function calculateBidCeiling(askingAverage, fees) {
  if (!validCeilingInputs(askingAverage,fees)) throw new Error('Valeur Chrono24 ou frais de la vente ciblée non vérifiés.');
  const askingCents = Math.round(askingAverage * 100);
  const feeBasisPoints = Math.round((fees.buyerPercent + fees.livePercent) * 100);
  if (!Number.isSafeInteger(askingCents) || !Number.isSafeInteger(feeBasisPoints)) throw new Error('Montants hors limite de précision.');
  const bidCents = BigInt(askingCents) * 10000n / (10000n + BigInt(feeBasisPoints));
  return { amount: Number(bidCents) / 100, buyerPercent:fees.buyerPercent, livePercent:fees.livePercent, feeSource:fees.source };
}
