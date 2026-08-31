from __future__ import annotations

import asyncio
import hashlib
import importlib.metadata
import json
import shutil
import subprocess
import wave
from pathlib import Path

import edge_tts

VIDEO_ROOT = Path(__file__).resolve().parents[1]
V3_ROOT = VIDEO_ROOT / "public" / "v3"
AUDIO_ROOT = V3_ROOT / "audio"
BEATS_ROOT = AUDIO_ROOT / "voice-beats"
VOICE_PLAN = V3_ROOT / "voice-plan.json"
NARRATION = AUDIO_ROOT / "narration.wav"

VOICE = "en-GB-SoniaNeural"
RATE = "+30%"
PITCH = "-2Hz"
SEGMENT_SECONDS = 10.0
MAX_SPEECH_SECONDS = 9.50
MAX_ATEMPO = 1.15
EXPECTED_IDS = [f"v3-{index:02d}" for index in range(1, 19)]
EXPECTED_FRAMES = 8_640_000


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


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_wave(path: Path) -> None:
    with wave.open(str(path), "rb") as handle:
        if handle.getframerate() != 48_000:
            raise RuntimeError(f"Unexpected sample rate: {handle.getframerate()}")
        if handle.getnchannels() != 2:
            raise RuntimeError(f"Unexpected channel count: {handle.getnchannels()}")
        if handle.getsampwidth() != 2:
            raise RuntimeError(f"Unexpected sample width: {handle.getsampwidth()}")
        if handle.getnframes() != EXPECTED_FRAMES:
            raise RuntimeError(f"Unexpected frame count: {handle.getnframes()}")


async def synthesize(text: str, output: Path) -> None:
    communicator = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH)
    await communicator.save(str(output))


async def generate() -> None:
    AUDIO_ROOT.mkdir(parents=True, exist_ok=True)
    if BEATS_ROOT.exists():
        shutil.rmtree(BEATS_ROOT)
    BEATS_ROOT.mkdir(parents=True)

    plan = json.loads(VOICE_PLAN.read_text(encoding="utf-8"))
    ids = [segment.get("id") for segment in plan]
    if ids != EXPECTED_IDS:
        raise RuntimeError(
            f"Voice plan IDs must be exactly {EXPECTED_IDS}; received {ids}"
        )
    for index, segment in enumerate(plan):
        if segment.get("start") != index * 10 or segment.get("end") != (index + 1) * 10:
            raise RuntimeError(f"Invalid timing for {segment.get('id')}: {segment}")
        if not str(segment.get("narration", "")).strip():
            raise RuntimeError(f"Missing narration for {segment.get('id')}")
    padded_files: list[Path] = []
    report: list[dict[str, float | str]] = []

    for index, segment in enumerate(plan, start=1):
        raw_path = BEATS_ROOT / f"{index:02d}-raw.mp3"
        padded_path = BEATS_ROOT / f"{index:02d}.wav"
        await synthesize(segment["narration"], raw_path)
        raw_duration = duration_seconds(raw_path)
        speed = max(1.0, raw_duration / MAX_SPEECH_SECONDS)
        if speed > MAX_ATEMPO:
            raise RuntimeError(
                f"Narration segment {index} needs excessive time compression: "
                f"{raw_duration:.2f}s / {speed:.3f}x (maximum {MAX_ATEMPO:.2f}x)"
            )

        audio_filter = (
            f"atempo={speed:.6f},"
            "aresample=48000,"
            "aformat=sample_fmts=fltp:channel_layouts=stereo,"
            f"apad=whole_dur={SEGMENT_SECONDS}"
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
            str(SEGMENT_SECONDS),
            "-c:a",
            "pcm_s16le",
            str(padded_path),
        )
        padded_files.append(padded_path)
        report.append(
            {
                "id": segment["id"],
                "rawDuration": round(raw_duration, 3),
                "speed": round(speed, 4),
                "speechWindow": MAX_SPEECH_SECONDS,
            }
        )

    concat_file = BEATS_ROOT / "concat.txt"
    concat_file.write_text(
        "".join(f"file '{path.name}'\n" for path in padded_files),
        encoding="utf-8",
    )
    temporary_narration = AUDIO_ROOT / ".narration.tmp.wav"
    temporary_narration.unlink(missing_ok=True)
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
        str(temporary_narration),
    )
    validate_wave(temporary_narration)
    voice_plan_sha256 = sha256(VOICE_PLAN)
    output_sha256 = sha256(temporary_narration)
    temporary_narration.replace(NARRATION)

    report_path = AUDIO_ROOT / "voice-report.json"
    temporary_report = AUDIO_ROOT / ".voice-report.tmp.json"
    temporary_report.write_text(
        json.dumps(
            {
                "voice": VOICE,
                "rate": RATE,
                "pitch": PITCH,
                "edgeTtsVersion": importlib.metadata.version("edge-tts"),
                "voicePlanSha256": voice_plan_sha256,
                "outputSha256": output_sha256,
                "providerBoundary": "Remote Microsoft Edge Read Aloud service accessed via edge-tts; output may drift, so the final WAV is frozen as the release artifact.",
                "usageBoundary": "Generated for the Shopping Copilot competition demo; verify upstream service terms before unrelated reuse.",
                "segments": report,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    temporary_report.replace(report_path)
    print(f"Voice: {VOICE} · narration={duration_seconds(NARRATION):.3f}s")
    print(f"Max speed correction: {max(item['speed'] for item in report):.4f}x")
    print(f"SHA-256: {output_sha256}")


if __name__ == "__main__":
    asyncio.run(generate())
