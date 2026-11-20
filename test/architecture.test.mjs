import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const names = ['prices','price-ceiling','price-selection','price-matching','price-credit','price-packet','price-fees'];
const sources = new Set(names.map(name => `src/${name}.mjs`));
const adapters = new Set(['src/price-credit.mjs','src/price-packet.mjs','src/price-fees.mjs']);
function localImports(source, allowed) {
  const content = readFileSync(resolve(root, source),'utf8');
  return [...content.matchAll(/^(?:import|export)\s+[^\n]*\s+from\s+['"]\.\/([^'"\n]+)['"]/gm)]
    .map(match => `src/${match[1]}`).filter(target => allowed.has(target));
}
const imports = new Map([...sources].map(source => [source,localImports(source,sources)]));

test('PRICE-001 imports have no cycles', () => {
  function visit(file,parents) {
    assert.ok(!parents.includes(file),`Import cycle: ${[...parents,file].join(' -> ')}`);
    for (const next of imports.get(file)) visit(next,[...parents,file]);
  }
  for (const file of sources) visit(file,[]);
});

test('APP-001 and PRICE-001 module graph has no import cycle', () => {
  const appFiles = ['app','app-view','app-images','offer-images','lots','pdf-lots','watch',...names];
  const all = new Set(appFiles.map(name => `src/${name}.mjs`));
  const graph = new Map([...all].map(source => [source,localImports(source,all)]));
  function visit(file,parents) {
    assert.ok(!parents.includes(file),`Import cycle: ${[...parents,file].join(' -> ')}`);
    for(const next of graph.get(file)) visit(next,[...parents,file]);
  }
  for(const file of all) visit(file,[]);
  for(const policy of ['src/price-ceiling.mjs','src/price-selection.mjs','src/price-matching.mjs','src/offer-images.mjs']) {
    for(const dependency of graph.get(policy)) assert.ok(!dependency.includes('/app'),`${policy} imports ${dependency}`);
  }
});

test('APP-001 rendering and offer-image policy do not perform IO', () => {
  for(const file of ['src/app-view.mjs','src/offer-images.mjs']) {
    const content=readFileSync(resolve(root,file),'utf8');
    assert.doesNotMatch(content,/^\s*import\s/m,`${file} imports an adapter`);
    assert.doesNotMatch(content,/\bfetch\s*\(|\bprocess\.env\b|\breadFile\b|\bwriteFile\b/,`${file} performs IO`);
  }
});

test('price ceiling is independent of IO and selection policy does not import adapters', () => {
  const ceilingSource = readFileSync(resolve(root,'src/price-ceiling.mjs'),'utf8');
  assert.deepEqual(imports.get('src/price-ceiling.mjs'),[]);
  assert.doesNotMatch(ceilingSource,/^\s*import\s/m);
  assert.doesNotMatch(ceilingSource,/\bfetch\s*\(|\bprocess\.env\b|\breadFile\b|\bwriteFile\b/);
  for(const policy of ['src/price-selection.mjs','src/price-matching.mjs']) {
    for(const dependency of imports.get(policy)) assert.ok(!adapters.has(dependency),`${policy} depends on ${dependency}`);
  }
});
