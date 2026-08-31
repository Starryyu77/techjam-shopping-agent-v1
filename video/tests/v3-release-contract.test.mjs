import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile, stat} from 'node:fs/promises';

const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

test('V3 release manifest matches every published asset and Pages size limit', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../public/v3/release-manifest.json', import.meta.url), 'utf8'),
  );
  const releaseRoot = new URL('../../docs/assets/video/', import.meta.url);
  for (const [filename, record] of Object.entries(manifest.files)) {
    const buffer = await readFile(new URL(filename, releaseRoot));
    assert.equal(buffer.length, record.bytes, filename);
    assert.equal(sha256(buffer), record.sha256, filename);
  }
  const web = await stat(new URL('shopping-copilot-demo-v3-web.mp4', releaseRoot));
  assert.ok(web.size < 25 * 1024 * 1024);
  assert.equal(manifest.files['shopping-copilot-demo-v3-web.mp4'].probe.streams[0].width, 1280);
  assert.equal(manifest.files['shopping-copilot-demo-v3-web.mp4'].probe.streams[0].height, 720);
});

test('V3 has one full release command and one package-only recovery command', async () => {
  const packageJson = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(packageJson.scripts['release:v3'], 'node scripts/release-v3.mjs');
  assert.equal(packageJson.scripts['release:v3:package'], 'node scripts/release-v3.mjs --package-only');
});
