import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));

test('caption and voice assets preserve all 36 beats', async () => {
  const captions = await readJson('../public/captions.json');
  const chineseCaptions = await readJson('../public/captions.zh-CN.json');
  const voicePlan = await readJson('../public/voice-plan.json');
  assert.equal(captions.length, 36);
  assert.equal(chineseCaptions.length, 36);
  assert.equal(voicePlan.length, 36);

  captions.forEach((caption, index) => {
    assert.equal(caption.startMs, index * 5000 + 220);
    assert.equal(caption.endMs, (index + 1) * 5000 - 280);
    assert.equal(caption.pageBreakAfter, true);

    const chineseCaption = chineseCaptions[index];
    assert.equal(chineseCaption.startMs, caption.startMs);
    assert.equal(chineseCaption.endMs, caption.endMs);
    assert.equal(chineseCaption.pageBreakAfter, true);
    assert.match(chineseCaption.text, /[\u3400-\u9fff]/);
  });
});

test('the video evidence projection comes from frozen repository artifacts', async () => {
  const evidence = await readJson('../public/evidence/video-evidence.json');
  assert.equal(evidence.evidenceScope, 'official_public_200');
  assert.equal(evidence.sampleCount, 200);
  assert.equal(evidence.overrideTrace.sampleId, 'public_0004');
  assert.equal(evidence.overrideTrace.targetRank, 1);
  assert.equal(evidence.starter.technical_score, 0.10671);
  assert.equal(evidence.submitted.technical_score, 0.866507);
});
