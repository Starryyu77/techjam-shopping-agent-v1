import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

import {
  v3CaptionSafeArea,
  v3Chapters,
  v3SceneAssets,
  v3Style,
} from '../src/v3/design-v3.mjs';

test('V3 uses the selected bright serif editorial commerce system', () => {
  assert.equal(v3Style.primaryTypography, 'serif');
  assert.equal(v3Style.background, '#f4edde');
  assert.equal(v3Style.oxblood, '#8d1831');
  assert.equal(v3Style.socialCyan, '#25f4ee');
  assert.equal(v3Style.socialCoral, '#fe2c55');
  assert.equal(v3Style.avoidSlideDeck, true);
});

test('V3 scene library covers ecommerce, retrieval, override, and advertising', () => {
  assert.deepEqual(Object.keys(v3SceneAssets), ['ecommerce', 'catalog', 'override', 'ads']);
  assert.match(v3SceneAssets.ecommerce, /ecommerce/);
  assert.match(v3SceneAssets.ads, /ads-commerce/);
});

test('V3 chapters fill all 180 seconds without gaps', () => {
  assert.equal(v3Chapters[0].start, 0);
  assert.equal(v3Chapters.at(-1).end, 180);
  v3Chapters.forEach((chapter, index) => {
    if (index > 0) assert.equal(chapter.start, v3Chapters[index - 1].end);
    assert.ok(chapter.end > chapter.start);
  });
});

test('V3 bilingual caption rail remains inside the 1080p safe area', () => {
  assert.ok(v3CaptionSafeArea.left >= 80);
  assert.ok(v3CaptionSafeArea.right >= 80);
  assert.ok(v3CaptionSafeArea.bottom >= 38);
  assert.ok(v3CaptionSafeArea.maxWidth <= 1540);
});

test('V3 composition binds its own duration and FPS contract', async () => {
  const rootSource = await readFile(new URL('../src/Root.tsx', import.meta.url), 'utf8');
  assert.match(rootSource, /V3_DURATION_FRAMES/);
  assert.match(rootSource, /V3_FPS/);
  assert.match(rootSource, /id="ShoppingCopilotFilmV3"[\s\S]*durationInFrames=\{V3_DURATION_FRAMES\}[\s\S]*fps=\{V3_FPS\}/);
});

test('V3 tells the verified prompt-evolution story without overstating validation', async () => {
  const storyboard = await readFile(new URL('../src/v3/storyboard-v3.mjs', import.meta.url), 'utf8');
  assert.match(storyboard, /prompt-evolution/);
  assert.match(storyboard, /ninety-turn dev set/i);
  assert.match(storyboard, /opaque validation gate/i);
  assert.doesNotMatch(storyboard, /held[- ]out (?:score|improved|gain)/i);
});

test('V3 motion language is mechanism-first rather than a fixed slide rail', async () => {
  const film = await readFile(new URL('../src/v3/ShoppingCopilotFilmV3.tsx', import.meta.url), 'utf8');
  assert.match(film, /MechanismWorld/);
  assert.match(film, /PromptEvolutionScene/);
  assert.match(film, /SharedProductCard/);
  assert.match(film, /MotionPath/);
  assert.doesNotMatch(film, /const EditorialRail/);
  assert.doesNotMatch(film, /const SegmentScene/);
});
