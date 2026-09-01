import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('purposeful preview contains three narration-aligned ten-second excerpts', async () => {
  const root = await readFile(new URL('../src/Root.tsx', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/v4/PurposefulMotionPreview.tsx', import.meta.url), 'utf8');
  assert.match(root, /id="PurposefulMotionPreview"[\s\S]*durationInFrames=\{900\}/);
  assert.match(source, /globalStarts = \[20, 60, 110\]/);
  assert.match(source, /QwenIntentPreview/);
  assert.match(source, /OverridePreview/);
  assert.match(source, /PromptEvolutionPreview/);
});

test('preview motion is semantic and reuses the first-version shared-state grammar', async () => {
  const source = await readFile(new URL('../src/v4/PurposefulMotionPreview.tsx', import.meta.url), 'utf8');
  assert.match(source, /SharedStateToken/);
  assert.match(source, /RULE CONFIDENCE/);
  assert.match(source, /REMOVE/);
  assert.match(source, /OPAQUE ACCEPT/);
  assert.doesNotMatch(source, /MotionPath/);
  assert.doesNotMatch(source, /const Dust/);
});

test('full purposeful film covers all eighteen V3.5 narration segments', async () => {
  const root = await readFile(new URL('../src/Root.tsx', import.meta.url), 'utf8');
  const source = await readFile(new URL('../src/v4/PurposefulMotionPreview.tsx', import.meta.url), 'utf8');
  assert.match(root, /id="ShoppingCopilotPurposefulV4"[\s\S]*durationInFrames=\{5400\}/);
  assert.match(source, /export const PurposefulFilm/);
  assert.match(source, /fullScenes/);
  assert.match(source, /CaptionTrackV3/);
  assert.match(source, /ORGANIC ORDER · BEFORE = AFTER/);
});
