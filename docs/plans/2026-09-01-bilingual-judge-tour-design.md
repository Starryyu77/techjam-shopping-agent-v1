# Bilingual Judge Tour — Design Contract

## Goal

Provide a complete Chinese presentation mode for the existing Judge Tour while
keeping English available from a compact top-right language switcher.

## Architecture

The English DOM remains the single source of truth. `demo/static/i18n.js`
applies a reversible presentation translation over static and dynamically
rendered text. A `MutationObserver` localizes Replay, Prompt Evolution, auction,
and evaluation content created after initial page load. This avoids duplicating
the Tour or mixing localization logic into the evidence renderer.

Language resolution order:

1. explicit `?lang=zh` or `?lang=en`;
2. saved `shopping-copilot-language` preference;
3. browser language (`zh*` selects Chinese, otherwise English).

Changing language updates `<html lang>`, the page title, local storage, and the
shareable URL without reloading or resetting the current Tour step.

## Evidence boundary

Chinese mode translates navigation, explanation, state labels, metric context,
controls, limitations, accessibility labels, and dynamic UI feedback. It keeps
the following source evidence unchanged:

- official public-session user messages and Agent responses;
- product titles and catalog metadata;
- ASINs, code identifiers, metrics, hashes, and reproduction commands.

This gives Chinese readers a complete interface without silently rewriting the
competition evidence.

## Visual contract

The switcher is part of the existing Editorial Social Commerce top bar: square
hairline border, mono labels, oxblood active underline, and no new layout row.
Chinese headings use Songti/PingFang fallbacks while English display typography
continues to use Didot/Bodoni/Avenir.

## Acceptance criteria

- All seven steps expose Chinese UI copy.
- Dynamic case changes, autoplay, Prompt walkthrough, and auction feedback stay
  localized.
- Switching back restores the original English copy exactly.
- Language persists across reloads and can be shared through the URL.
- Desktop and narrow layouts have no page-level horizontal overflow.
- Static deployment includes the localization asset.
