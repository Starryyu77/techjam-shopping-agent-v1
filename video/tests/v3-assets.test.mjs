import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {v3Segments, v3SubtitlePages} from '../src/v3/storyboard-v3.mjs';

const readJson = async (relativePath) =>
  JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));

test('V3 exported voice and bilingual caption assets match the storyboard contract', async () => {
  const voicePlan = await readJson('../public/v3/voice-plan.json');
  const english = await readJson('../public/v3/captions.en.json');
  const chinese = await readJson('../public/v3/captions.zh-CN.json');

  assert.equal(voicePlan.length, 18);
  assert.equal(english.length, 36);
  assert.equal(chinese.length, 36);

  voicePlan.forEach((segment, index) => {
    assert.equal(segment.start, index * 10);
    assert.equal(segment.end, (index + 1) * 10);
    assert.equal(segment.narration, v3Segments[index].narration);
  });

  english.forEach((caption, index) => {
    assert.equal(caption.startMs, index * 5000 + 180);
    assert.equal(caption.endMs, (index + 1) * 5000 - 180);
    assert.equal(chinese[index].startMs, caption.startMs);
    assert.equal(chinese[index].endMs, caption.endMs);
    assert.equal(caption.text.trim(), v3SubtitlePages[index].en);
    assert.equal(chinese[index].text.trim(), v3SubtitlePages[index].zh);
    assert.match(chinese[index].text, /[\u3400-\u9fff]/);
  });
});

test('V3 exports standards-compliant WebVTT sidecars for browser tracks', async () => {
  for (const relativePath of ['../public/v3/captions.en.vtt', '../public/v3/captions.zh-CN.vtt']) {
    const text = await readFile(new URL(relativePath, import.meta.url), 'utf8');
    assert.match(text, /^WEBVTT\n\n/);
    assert.match(text, /00:00:00\.180 --> 00:00:04\.820/);
  }
});
