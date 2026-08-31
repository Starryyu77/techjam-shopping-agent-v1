from __future__ import annotations

import json
import hashlib
import wave
from pathlib import Path

import numpy as np

VIDEO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_ROOT = VIDEO_ROOT / "public" / "v3" / "audio"
OUTPUT = OUTPUT_ROOT / "music.wav"
MANIFEST = OUTPUT_ROOT / "music-manifest.json"
TEMPORARY_OUTPUT = OUTPUT_ROOT / ".music.tmp.wav"
TEMPORARY_MANIFEST = OUTPUT_ROOT / ".music-manifest.tmp.json"

SAMPLE_RATE = 48_000
DURATION_SECONDS = 180
BPM = 108
BEAT_SECONDS = 60 / BPM
CHORD_ROOTS = [110.0, 87.307, 130.813, 97.999, 110.0, 73.416]
EXPECTED_FRAMES = SAMPLE_RATE * DURATION_SECONDS


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_wave(path: Path) -> None:
    with wave.open(str(path), "rb") as handle:
        if handle.getframerate() != SAMPLE_RATE:
            raise RuntimeError(f"Unexpected sample rate: {handle.getframerate()}")
        if handle.getnchannels() != 2:
            raise RuntimeError(f"Unexpected channel count: {handle.getnchannels()}")
        if handle.getsampwidth() != 2:
            raise RuntimeError(f"Unexpected sample width: {handle.getsampwidth()}")
        if handle.getnframes() != EXPECTED_FRAMES:
            raise RuntimeError(f"Unexpected frame count: {handle.getnframes()}")


def synthesize_second(second_index: int, rng: np.random.Generator) -> np.ndarray:
    t = np.arange(SAMPLE_RATE, dtype=np.float64) / SAMPLE_RATE + second_index
    root = CHORD_ROOTS[(second_index // 10) % len(CHORD_ROOTS)]
    beat_phase = np.mod(t, BEAT_SECONDS)
    half_phase = np.mod(t + BEAT_SECONDS / 2, BEAT_SECONDS)

    pad_lfo = 0.66 + 0.34 * np.sin(2 * np.pi * 0.055 * t)
    pad = (
        0.022 * np.sin(2 * np.pi * root * t)
        + 0.014 * np.sin(2 * np.pi * root * 1.25 * t + 0.4)
        + 0.012 * np.sin(2 * np.pi * root * 1.5 * t + 0.9)
    ) * pad_lfo

    bass_envelope = np.exp(-beat_phase * 7.5)
    bass = 0.052 * np.sin(2 * np.pi * (root / 2) * t) * bass_envelope

    pluck_note = root * (2.0 if (second_index // 5) % 2 == 0 else 2.5)
    pluck_envelope = np.exp(-half_phase * 11.0)
    pluck = 0.018 * np.sin(2 * np.pi * pluck_note * t + 0.25) * pluck_envelope

    hat_phase = np.mod(t + BEAT_SECONDS / 2, BEAT_SECONDS / 2)
    hat_envelope = np.exp(-hat_phase * 42.0)
    hat = 0.0045 * rng.standard_normal(SAMPLE_RATE) * hat_envelope

    kick_window = np.minimum(beat_phase, 0.18)
    kick_frequency = 62 + 38 * np.exp(-kick_window * 22)
    kick = (
        0.042
        * np.sin(2 * np.pi * kick_frequency * kick_window)
        * np.exp(-beat_phase * 18)
    )

    energy = np.select(
        [t < 10, t < 60, t < 100, t < 120, t < 150, t < 170],
        [0.52 + t * 0.018, 0.72, 0.88, 0.67, 0.82, 0.63],
        default=np.maximum(0.0, 0.58 * (180 - t) / 10),
    )
    mono = (pad + bass + pluck + hat + kick) * energy
    boundary_phase = np.mod(t, 10.0)
    boundary_distance = np.minimum(boundary_phase, 10.0 - boundary_phase)
    boundary_fade = np.clip(boundary_distance / 0.02, 0.0, 1.0)
    mono *= boundary_fade
    master_fade = np.minimum(np.clip(t / 2.5, 0, 1), np.clip((180 - t) / 5, 0, 1))
    mono *= master_fade

    width = 0.006 * np.sin(2 * np.pi * root * 1.5 * t + 1.35) * pad_lfo
    width *= boundary_fade
    stereo = np.stack((mono + width, mono - width), axis=1)
    return np.clip(stereo, -0.92, 0.92)


def main() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(20260901)
    peak = 0.0
    TEMPORARY_OUTPUT.unlink(missing_ok=True)
    with wave.open(str(TEMPORARY_OUTPUT), "wb") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(SAMPLE_RATE)
        for second in range(DURATION_SECONDS):
            stereo = synthesize_second(second, rng)
            peak = max(peak, float(np.max(np.abs(stereo))))
            pcm = (stereo * 32767).astype("<i2")
            handle.writeframes(pcm.tobytes())

    validate_wave(TEMPORARY_OUTPUT)
    output_sha256 = sha256(TEMPORARY_OUTPUT)
    TEMPORARY_OUTPUT.replace(OUTPUT)
    TEMPORARY_MANIFEST.write_text(
        json.dumps(
            {
                "title": "Editorial Commerce Pulse",
                "origin": "Original procedural score generated for Shopping Copilot V3",
                "license": "Project-owned original; no third-party recording or sample",
                "sampleRate": SAMPLE_RATE,
                "durationSeconds": DURATION_SECONDS,
                "bpm": BPM,
                "seed": 20260901,
                "peak": round(peak, 6),
                "outputSha256": output_sha256,
                "boundaryFadeMilliseconds": 20,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    TEMPORARY_MANIFEST.replace(MANIFEST)
    print(f"Music: {OUTPUT} · {DURATION_SECONDS}s · {BPM} BPM · peak={peak:.4f}")
    print(f"SHA-256: {output_sha256}")


if __name__ == "__main__":
    main()
