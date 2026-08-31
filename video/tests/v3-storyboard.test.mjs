import test from 'node:test';
import assert from 'node:assert/strict';
import {access, readFile} from 'node:fs/promises';

import {
  V3_DURATION_SECONDS,
  v3Segments,
  v3SubtitlePages,
} from '../src/v3/storyboard-v3.mjs';

const countWords = (text) => text.match(/[A-Za-z0-9]+(?:[’'-][A-Za-z0-9]+)*/g)?.length ?? 0;

test('V3 is exactly eighteen contiguous ten-second narration segments', () => {
  assert.equal(V3_DURATION_SECONDS, 180);
  assert.equal(v3Segments.length, 18);
  v3Segments.forEach((segment, index) => {
    assert.equal(segment.start, index * 10);
    assert.equal(segment.end, (index + 1) * 10);
    assert.ok(countWords(segment.narration) >= 25);
    assert.ok(countWords(segment.narration) <= 30);
    assert.match(segment.zh, /[\u3400-\u9fff]/);
  });
  assert.equal(v3Segments.reduce((sum, segment) => sum + countWords(segment.narration), 0), 497);
});

test('V3 keeps five-second subtitle pages aligned in English and Chinese', () => {
  assert.equal(v3SubtitlePages.length, 36);
  v3SubtitlePages.forEach((page, index) => {
    assert.equal(page.start, index * 5);
    assert.equal(page.end, (index + 1) * 5);
    assert.ok(page.en.length > 8);
    assert.match(page.zh, /[\u3400-\u9fff]/);
  });
});

test('V3 introduces the product before Qwen and uses contract-scoped evaluation language', () => {
  assert.match(v3Segments[1].narration, /Shopping Copilot/);
  assert.match(v3Segments[2].narration, /Qwen/);
  assert.match(v3Segments[15].narration, /outside this evaluation contract/);
  assert.doesNotMatch(v3Segments[15].narration, /never the model|never.*ads/i);
});

test('V3 production scene assets exist and the cover asset names ecommerce explicitly', async () => {
  const assets = [
    '../public/style-previews/editorial-social-commerce-ecommerce.png',
    '../public/v3-scenes/catalog-retrieval.png',
    '../public/v3-scenes/override-polyester.png',
    '../public/v3-scenes/ads-commerce.png',
  ];
  await Promise.all(assets.map((relative) => access(new URL(relative, import.meta.url))));
  const source = await readFile(new URL('../src/v3/StylePreview.tsx', import.meta.url), 'utf8');
  assert.match(source, /editorial-social-commerce-ecommerce\.png/);
});
