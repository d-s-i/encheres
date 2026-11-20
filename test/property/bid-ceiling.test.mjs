import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBidCeiling } from '../../src/price-ceiling.mjs';

const feesSource = 'https://www.creditmunicipal.fr/vente-et-conditions.pdf';
const pricesInCents = [1, 2, 99, 100, 101, 10_000, 100_000, 434_500, 1_000_000];
for (let cents = 37; cents < 2_000_000; cents += 7919) pricesInCents.push(cents);

// Rate values are exact hundredths of a percent (basis points), as used by the
// dated sale catalogues. Each case checks maximality, not just a single example.
test('ceiling in cents is maximal without exceeding the quoted asking price after both fees', () => {
  let checked = 0;
  for (const quotedCents of pricesInCents) {
    for (const buyerBps of [0, 800, 1800, 1875, 2500, 5500]) {
      for (const liveBps of [0, 1, 120, 125, 499]) {
        const fees = {buyerPercent:buyerBps / 100, livePercent:liveBps / 100, source:feesSource};
        const ceiling = calculateBidCeiling(quotedCents / 100, fees);
        const bidCents = Math.round(ceiling.amount * 100);
        const denominator = BigInt(10_000 + buyerBps + liveBps);
        const budget = BigInt(quotedCents) * 10_000n;
        assert.ok(BigInt(bidCents) * denominator <= budget, `Over budget at ${quotedCents}/${buyerBps}/${liveBps}`);
        assert.ok(BigInt(bidCents + 1) * denominator > budget, `Not maximal at ${quotedCents}/${buyerBps}/${liveBps}`);
        assert.equal(ceiling.feeSource, feesSource);
        checked++;
      }
    }
  }
  assert.ok(checked > 7_000);
});
