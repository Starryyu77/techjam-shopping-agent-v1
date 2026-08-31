# Bundled prompt-lab data

This directory contains the synthetic, automatically validated Gold-candidate
dev (18 sessions / 90 turns) and validation (6 sessions / 30 turns) splits
used by prompt_lab.py. User messages are synthetic and contain no personal
identifiers.

The held-out inputs and labels are deliberately not bundled. Final evaluation
requires the full external dataset via --dataset PATH, plus the explicit
freeze token and matching system SHA-256.

These fixed dialogues are for module diagnosis and robustness checks; they do
not replace the organizer's dynamic evaluator.
