import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const features = [
  {id:'LOT-001',name:'identifier-montres',steps:'acceptance-steps.mjs'},
  {id:'PRICE-001',name:'comparer-prix-montres',steps:'price-acceptance-steps.mjs'},
  {id:'PRICE-001',name:'plafond-enchere-hors-frais',steps:'plafond-acceptance-steps.mjs'},
  {id:'APP-001',name:'analyser-lot-et-photos',steps:'app-acceptance-steps.mjs'},
  {id:'APP-001',name:'sauvegarder-et-recommencer',steps:'app-save-acceptance-steps.mjs'},
  {id:'APP-001',name:'tableau-global-excel',steps:'app-grid-acceptance-steps.mjs'},
];
for(const feature of features) {
  const task = resolve(root, '.ai/tasks', feature.id);
  const source = resolve(task, `features/${feature.name}.feature`);
  const ir = resolve(task, `acceptance/${feature.name}.json`);
  const destination = resolve(task, `acceptance/generated/${feature.name}.test.mjs`);
  await mkdir(dirname(destination), {recursive:true});
  execFileSync('parse-gherkin', [source, ir], { stdio:'inherit' });
  const parsed = JSON.parse(await readFile(ir,'utf8'));
  if(!Array.isArray(parsed.scenarios) || !parsed.scenarios.length || parsed.scenarios.some(s=>!s.name.startsWith(`${feature.id}-S`))) throw new Error(`Scénarios ${feature.id} manquants ou non identifiés.`);
  const sourceText = await readFile(source,'utf8');
  const declaredSteps = (sourceText.match(/^\s*(?:Given|When|Then|And|But)\s+.+$/gm) ?? []).length;
  const parsedSteps = (parsed.background ?? []).length + parsed.scenarios.reduce((n,s)=>n+s.steps.length,0);
  if(declaredSteps !== parsedSteps) throw new Error(`Gherkin incomplet pour ${feature.id} : ${declaredSteps} étapes déclarées, ${parsedSteps} analysées.`);
  const scenarios = parsed.scenarios.map(s => ({...s,steps:[...(parsed.background ?? []),...s.steps]}));
  const script = `// Generated from ${source.replace(root+'/', '')}; do not edit manually.\nimport test from 'node:test';\nimport { runScenario } from '../../../../../test/${feature.steps}';\nconst scenarios = ${JSON.stringify(scenarios, null, 2)};\nfor (const scenario of scenarios) {\n  test(scenario.name, async () => runScenario(scenario));\n}\n`;
  await writeFile(destination,script);
  console.log(`Generated ${parsed.scenarios.length} acceptance tests: ${destination}`);
}
