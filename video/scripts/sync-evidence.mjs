import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const videoRoot = path.resolve(scriptDir, '..');

const readJson = async (relativePath) =>
  JSON.parse(await readFile(path.join(repoRoot, relativePath), 'utf8'));

const manifest = await readJson('demo/evidence/manifest.json');
const metrics = await readJson('demo/evidence/metrics.json');
const versions = await readJson('demo/evidence/version_comparison.json');
const overrideTrace = await readJson('demo/evidence/scenarios/public_0004.json');

const starter = versions.find((entry) => entry.version === 'Official Weak BM25 Baseline');
const submitted = versions.find((entry) => entry.version.includes('V1.3'));
const overrideCase = manifest.canonical_cases.find(
  (entry) => entry.sample_id === 'public_0004' && entry.role === 'primary_video',
);
const overrideTurn = overrideTrace.turns.find((turn) => turn.intent.dialogue_act === 'OVERRIDE');

if (!starter || !submitted || !overrideCase || !overrideTurn) {
  throw new Error('Required frozen video evidence is missing');
}

const projection = {
  generatedFrom: [
    'demo/evidence/manifest.json',
    'demo/evidence/metrics.json',
    'demo/evidence/version_comparison.json',
    'demo/evidence/scenarios/public_0004.json',
  ],
  evidenceScope: manifest.evidence_scope,
  sampleCount: manifest.sample_count,
  claimBoundary: manifest.claim_boundary,
  metrics,
  starter,
  submitted,
  overrideCase,
  overrideTrace: {
    sampleId: overrideTrace.sample_id,
    scenarioType: overrideTrace.scenario_type,
    category: overrideTurn.state_after.category,
    added: overrideTurn.state_diff.added,
    removed: overrideTurn.state_diff.removed,
    targetRank: overrideTurn.target_rank,
  },
};

const targetDir = path.join(videoRoot, 'public', 'evidence');
await mkdir(targetDir, {recursive: true});
await writeFile(
  path.join(targetDir, 'video-evidence.json'),
  `${JSON.stringify(projection, null, 2)}\n`,
  'utf8',
);

process.stdout.write(`Wrote ${path.join(targetDir, 'video-evidence.json')}\n`);
