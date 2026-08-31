import {copyFile, mkdir, stat, writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const videoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(videoRoot, '..');
const outputRoot = path.join(videoRoot, 'out');
const publicRoot = path.join(videoRoot, 'public', 'v3');
const releaseRoot = path.join(repoRoot, 'docs', 'assets', 'video');
const packageOnly = process.argv.includes('--package-only');

const run = (command, args, cwd = videoRoot) => {
  const result = spawnSync(command, args, {cwd, encoding: 'utf8', stdio: 'inherit'});
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with ${result.status}`);
};

const sha256 = async (file) => {
  const hash = createHash('sha256');
  const {createReadStream} = await import('node:fs');
  await new Promise((resolve, reject) => {
    createReadStream(file).on('data', (chunk) => hash.update(chunk)).on('end', resolve).on('error', reject);
  });
  return hash.digest('hex');
};

const probe = (file) => {
  const result = spawnSync(
    'ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration,size', '-show_entries', 'stream=codec_type,codec_name,width,height,pix_fmt,sample_rate,channels', '-of', 'json', file],
    {encoding: 'utf8'},
  );
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout);
};

await mkdir(outputRoot, {recursive: true});
await mkdir(releaseRoot, {recursive: true});

if (!packageOnly) {
  run('node', ['scripts/export-v3-assets.mjs']);
  run(path.join(videoRoot, '.venv', 'bin', 'python'), ['scripts/generate-voice-v3.py']);
  run('python3', ['scripts/generate-music-v3.py']);
  run('npx', ['remotion', 'render', 'src/index.ts', 'ShoppingCopilotFilmV3', 'out/shopping-copilot-v3-master.mp4', '--codec=h264', '--crf=18', '--audio-codec=aac']);
  run('ffmpeg', [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', 'out/shopping-copilot-v3-master.mp4', '-t', '180',
    '-map', '0:v:0', '-map', '0:a:0', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
    '-profile:v', 'high', '-level', '4.2', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709',
    '-color_trc', 'bt709', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7', '-ar', '48000', '-c:a', 'aac', '-b:a', '160k',
    '-movflags', '+faststart', 'out/shopping-copilot-v3-final.mp4',
  ]);
}

run('node', ['scripts/export-v3-assets.mjs']);
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-i', 'out/shopping-copilot-v3-final.mp4',
  '-vf', 'scale=1280:720:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '23',
  '-profile:v', 'high', '-level', '4.0', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709',
  '-color_trc', 'bt709', '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart',
  path.join(releaseRoot, 'shopping-copilot-demo-v3-web.mp4'),
]);
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-ss', '00:00:12', '-t', '8', '-i', 'out/shopping-copilot-v3-final.mp4',
  '-vf', 'fps=8,scale=800:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=3',
  '-loop', '0', path.join(releaseRoot, 'shopping-copilot-demo-v3-preview.gif'),
]);
run('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-ss', '00:00:17', '-i', 'out/shopping-copilot-v3-final.mp4',
  '-frames:v', '1', '-q:v', '2', path.join(releaseRoot, 'shopping-copilot-demo-v3-poster.jpg'),
]);

const copies = [
  ['out/shopping-copilot-v3-final.mp4', 'shopping-copilot-demo-v3.mp4'],
  ['public/v3/captions.en.srt', 'shopping-copilot-demo-v3.en.srt'],
  ['public/v3/captions.zh-CN.srt', 'shopping-copilot-demo-v3.zh-CN.srt'],
  ['public/v3/captions.en.vtt', 'shopping-copilot-demo-v3.en.vtt'],
  ['public/v3/captions.zh-CN.vtt', 'shopping-copilot-demo-v3.zh-CN.vtt'],
];
for (const [source, target] of copies) {
  await copyFile(path.join(videoRoot, source), path.join(releaseRoot, target));
}

const releaseFiles = [
  'shopping-copilot-demo-v3.mp4',
  'shopping-copilot-demo-v3-web.mp4',
  'shopping-copilot-demo-v3-preview.gif',
  'shopping-copilot-demo-v3-poster.jpg',
  'shopping-copilot-demo-v3.en.srt',
  'shopping-copilot-demo-v3.zh-CN.srt',
  'shopping-copilot-demo-v3.en.vtt',
  'shopping-copilot-demo-v3.zh-CN.vtt',
];
const files = {};
for (const filename of releaseFiles) {
  const file = path.join(releaseRoot, filename);
  files[filename] = {bytes: (await stat(file)).size, sha256: await sha256(file)};
}
files['shopping-copilot-demo-v3.mp4'].probe = probe(path.join(releaseRoot, 'shopping-copilot-demo-v3.mp4'));
files['shopping-copilot-demo-v3-web.mp4'].probe = probe(path.join(releaseRoot, 'shopping-copilot-demo-v3-web.mp4'));
if (files['shopping-copilot-demo-v3-web.mp4'].bytes >= 25 * 1024 * 1024) {
  throw new Error('Cloudflare Pages encode exceeds the 25 MiB single-file limit');
}

const manifest = {
  generatedAt: new Date().toISOString(),
  packageOnly,
  sourceComposition: 'ShoppingCopilotFilmV3',
  files,
};
const manifestText = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(path.join(publicRoot, 'release-manifest.json'), manifestText);
await writeFile(path.join(releaseRoot, 'shopping-copilot-demo-v3-manifest.json'), manifestText);
process.stdout.write(`V3 release packaged in ${releaseRoot}\n`);
