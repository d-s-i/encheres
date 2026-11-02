import { execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const task = resolve(root, '.ai/tasks/LOT-001');
const source = resolve(task, 'features/identifier-montres.feature');
const ir = resolve(task, 'acceptance/identifier-montres.json');
const destination = resolve(task, 'acceptance/generated/identifier-montres.test.mjs');
execFileSync('parse-gherkin', [source, ir], { stdio: 'inherit' });
const parsed = JSON.parse(await readFile(ir, 'utf8'));
if (!Array.isArray(parsed.scenarios) || !parsed.scenarios.length || parsed.scenarios.some(s => !/^LOT-001-S\d+ /.test(s.name))) throw new Error('Scénarios LOT-001 manquants ou non identifiés.');
await mkdir(dirname(destination), { recursive: true });
const script = `// Generated from ${source.replace(root + '/', '')}; do not edit manually.\nimport test from 'node:test';\nimport { runScenario } from '../../../../../test/acceptance-steps.mjs';\nconst scenarios = ${JSON.stringify(parsed.scenarios, null, 2)};\nfor (const scenario of scenarios) {\n  test(scenario.name, async () => runScenario(scenario));\n}\n`;
await writeFile(destination, script);
console.log(`Generated ${parsed.scenarios.length} acceptance tests: ${destination}`);
