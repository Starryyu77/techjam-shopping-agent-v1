from __future__ import annotations

import asyncio
import json
import shutil
import subprocess
from pathlib import Path

import edge_tts


VIDEO_ROOT = Path(__file__).resolve().parents[1]
PUBLIC_ROOT = VIDEO_ROOT / "public"
AUDIO_ROOT = PUBLIC_ROOT / "audio"
BEATS_ROOT = AUDIO_ROOT / "beats"
VOICE_PLAN = PUBLIC_ROOT / "voice-plan.json"
NARRATION = AUDIO_ROOT / "narration.wav"
AMBIENT = AUDIO_ROOT / "ambient.wav"

VOICE = "en-GB-SoniaNeural"
RATE = "+4%"
PITCH = "-2Hz"
BEAT_SECONDS = 5.0
MAX_SPEECH_SECONDS = 4.35


def run(*args: str) -> None:
    subprocess.run(args, check=True)


def duration_seconds(path: Path) -> float:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        check=True,
        capture_output=True,
        text=True,
    )
    return float(result.stdout.strip())


async def synthesize(text: str, output: Path) -> None:
    communicator = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicator.save(str(output))


async def generate() -> None:
    AUDIO_ROOT.mkdir(parents=True, exist_ok=True)
    if BEATS_ROOT.exists():
        shutil.rmtree(BEATS_ROOT)
    BEATS_ROOT.mkdir(parents=True)

    plan = json.loads(VOICE_PLAN.read_text(encoding="utf-8"))
    padded_files: list[Path] = []
    report: list[dict[str, float | str]] = []

    for index, beat in enumerate(plan, start=1):
        raw_path = BEATS_ROOT / f"{index:02d}-raw.mp3"
        padded_path = BEATS_ROOT / f"{index:02d}.wav"
        await synthesize(beat["narration"], raw_path)
        raw_duration = duration_seconds(raw_path)
        speed = max(1.0, raw_duration / MAX_SPEECH_SECONDS)
        if speed > 2.0:
            raise RuntimeError(f"Narration beat {index} is too long: {raw_duration:.2f}s")

        audio_filter = (
            f"atempo={speed:.6f},"
            "aresample=48000,"
            "aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"apad=whole_dur={BEAT_SECONDS}"
        )
        run(
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-loglevel",
            "error",
            "-i",
            str(raw_path),
            "-af",
            audio_filter,
            "-t",
            str(BEAT_SECONDS),
            "-c:a",
            "pcm_s16le",
            str(padded_path),
        )
        padded_files.append(padded_path)
        report.append(
            {
                "id": beat["id"],
                "rawDuration": round(raw_duration, 3),
                "speed": round(speed, 4),
            }
        )

    concat_file = BEATS_ROOT / "concat.txt"
    concat_file.write_text(
        "".join(f"file '{path.name}'\n" for path in padded_files),
        encoding="utf-8",
    )
    run(
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        str(concat_file),
        "-c:a",
        "pcm_s16le",
        str(NARRATION),
    )

    run(
        "ffmpeg",
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=82:sample_rate=48000:duration=180",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=123:sample_rate=48000:duration=180",
        "-f",
        "lavfi",
        "-i",
        "sine=frequency=196:sample_rate=48000:duration=180",
        "-filter_complex",
        "[0:a]volume=0.013[a0];[1:a]volume=0.008[a1];[2:a]volume=0.004[a2];"
        "[a0][a1][a2]amix=inputs=3:normalize=0,lowpass=f=520,"
        "afade=t=in:st=0:d=3,afade=t=out:st=176:d=4,"
        "aformat=sample_fmts=fltp:channel_layouts=stereo[out]",
        "-map",
        "[out]",
        "-c:a",
        "pcm_s16le",
        str(AMBIENT),
    )

    (AUDIO_ROOT / "voice-report.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )

    print(f"Voice: {VOICE} · narration={duration_seconds(NARRATION):.3f}s")
    print(f"Ambient: {duration_seconds(AMBIENT):.3f}s")


if __name__ == "__main__":
    asyncio.run(generate())
